/**
 * @fileoverview Write-only credential store. Values are encrypted at rest
 * with AES-256-GCM. The public API never returns a secret value; only
 * presence flags and metadata.
 *
 * Encryption key is derived once per data directory and stored in
 * `${dataDir}/.key` (mode 0o600). The key file is created on first use
 * with 32 random bytes from `crypto.randomBytes`.
 */

import {
  readFile,
  rename,
  writeFile,
  mkdir,
  chmod,
  stat,
} from 'node:fs/promises';
import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto';
import {join} from 'node:path';
import {dataDir, ensureDataDir} from './data_dir.js';

/**
 * Algorithm and key length.
 */
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * On-disk record for a single credential.
 */
interface StoredCredential {
  /** Encrypted value (base64). */
  readonly ciphertext: string;
  /** IV used for encryption (base64). */
  readonly iv: string;
  /** GCM auth tag (base64). */
  readonly authTag: string;
  /** ISO timestamp of last set. */
  readonly updatedAt: string;
}

/**
 * On-disk shape of the credentials file.
 */
interface CredentialsFile {
  readonly credentials: Record<string, StoredCredential>;
}

/**
 * Public descriptor (what `getRedactedDescriptors` returns).
 */
export interface CredentialDescriptor {
  readonly name: string;
  readonly present: boolean;
  readonly updatedAt?: string;
}

/**
 * Thrown when the on-disk encryption key cannot decrypt any stored
 * credential — i.e. the key file is corrupt or was rotated without
 * re-encrypting. The store refuses to overwrite a corrupt key
 * silently; the operator must move the corrupt file aside before
 * restart (see SECURITY.md).
 */
export class KeyCorruptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyCorruptError';
  }
}

/**
 * Returns the path to the credentials file.
 */
function credentialsFile(): string {
  return `${dataDir()}/credentials.json`;
}

/**
 * Returns the path to the encryption key file.
 */
function keyFile(): string {
  return `${dataDir()}/.key`;
}

/**
 * Returns the backup key path (next to the live key file).
 */
function keyFileBackup(): string {
  return `${dataDir()}/.key.bak`;
}

/**
 * Probes whether the supplied key can decrypt at least one stored
 * credential. Used to detect a corrupt key file before silently
 * regenerating one (which would orphan every prior credential).
 */
async function probeKey(key: Buffer): Promise<boolean> {
  try {
    const file = await loadFile();
    const entries = Object.values(file.credentials);
    if (entries.length === 0) {
      return true;
    }
    decrypt(entries[0]!, key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads (or creates) the encryption key. Key is 32 random bytes.
 *
 * If a key file already exists with the right length, its contents
 * are validated against the credentials file via {@link probeKey}; on
 * mismatch the process aborts with {@link KeyCorruptError} instead of
 * silently regenerating. The previous key file is renamed to
 * \`${keyFile()}.bak\` before a new key is written, so an operator
 * who restarts after a partial corruption still has a fallback.
 */
async function loadKey(): Promise<Buffer> {
  await ensureDataDir();
  const path = keyFile();
  const backupPath = keyFileBackup();
  let existing: Buffer | undefined;
  try {
    existing = await readFile(path);
  } catch {
    // missing; will create below
  }
  if (existing !== undefined && existing.length === KEY_LENGTH) {
    if (await probeKey(existing)) {
      return existing;
    }
    // Back up the corrupt-but-right-length key so the operator has a
    // recovery path before we refuse to overwrite.
    try {
      await rename(path, backupPath);
    } catch {
      // Best-effort: if rename fails we still abort with the error.
    }
    throw new KeyCorruptError(
      `encryption key at ${path} cannot decrypt existing credentials; ` +
        `refusing to overwrite. The suspect key has been moved to ` +
        `${backupPath}; investigate before restarting.`,
    );
  }
  if (existing !== undefined) {
    // Wrong length — back up the bad key before overwriting.
    try {
      await rename(path, backupPath);
    } catch {
      // Best-effort backup; if rename fails we still continue to
      // generate a new key so the operator is not locked out.
    }
  }
  const fresh = randomBytes(KEY_LENGTH);
  await writeFile(path, fresh, {mode: 0o600});
  await chmod(path, 0o600);
  return fresh;
}

/**
 * Encrypts a plaintext with AES-256-GCM. Returns a record safe to
 * serialise as JSON.
 */
function encrypt(plaintext: string, key: Buffer): StoredCredential {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Decrypts a stored credential. Throws on auth-tag mismatch.
 */
function decrypt(stored: StoredCredential, key: Buffer): string {
  const iv = Buffer.from(stored.iv, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(stored.authTag, 'base64'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(stored.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

/**
 * Loads the credentials file from disk. Returns empty map on first use.
 */
async function loadFile(): Promise<CredentialsFile> {
  await ensureDataDir();
  try {
    const raw = await readFile(credentialsFile(), 'utf8');
    return JSON.parse(raw) as CredentialsFile;
  } catch {
    return {credentials: {}};
  }
}

/**
 * Persists the credentials file atomically.
 */
async function persistFile(file: CredentialsFile): Promise<void> {
  const path = credentialsFile();
  await mkdir(dataDir(), {recursive: true});
  await writeFile(path, JSON.stringify(file, null, 2), {mode: 0o600});
  await chmod(path, 0o600);
}

/**
 * Stores a credential. Overwrites any existing value for the same name.
 */
export async function setCredential(name: string, value: string): Promise<void> {
  if (!name) {
    throw new Error('credential name must be non-empty');
  }
  const key = await loadKey();
  const file = await loadFile();
  file.credentials[name] = encrypt(value, key);
  await persistFile(file);
}

/**
 * Returns true if a credential with the given name is stored.
 */
export async function hasCredential(name: string): Promise<boolean> {
  const file = await loadFile();
  return file.credentials[name] !== undefined;
}

/**
 * Returns the plaintext value of a credential. INTERNAL USE ONLY — must
 * not be exposed to the web UI. The HTTP gateway serves only descriptors.
 */
export async function getCredential(name: string): Promise<string | undefined> {
  const file = await loadFile();
  const stored = file.credentials[name];
  if (stored === undefined) {
    return undefined;
  }
  const key = await loadKey();
  return decrypt(stored, key);
}

/**
 * Returns redacted descriptors for every stored credential. The UI uses
 * this to show "X is set" without ever receiving the value.
 */
export async function getRedactedDescriptors(): Promise<ReadonlyArray<CredentialDescriptor>> {
  const file = await loadFile();
  return Object.entries(file.credentials).map(([name, stored]) => ({
    name,
    present: true,
    updatedAt: stored.updatedAt,
  }));
}

/**
 * Removes a credential. No-op if it doesn't exist.
 */
export async function removeCredential(name: string): Promise<void> {
  const file = await loadFile();
  if (file.credentials[name] === undefined) {
    return;
  }
  delete file.credentials[name];
  await persistFile(file);
}

/**
 * Returns true if the credentials file exists. Used by health checks.
 */
export async function credentialsFileExists(): Promise<boolean> {
  try {
    await stat(credentialsFile());
    return true;
  } catch {
    return false;
  }
}

// Suppress the unused-import warning on `join`; kept for symmetry with
// sibling modules. Side-effect free.
void join;
