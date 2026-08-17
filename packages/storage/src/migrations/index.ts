/**
 * @fileoverview Schema migration registry. The migration chain lives in
 * `@magic/shared/types/version`; this module provides the storage-side
 * `migrateSession` function that reads a session, runs all applicable
 * migrations, and writes it back.
 */

import {readFile, writeFile, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {rename} from 'node:fs/promises';
import {
  migrateSchema,
  SCHEMA_VERSION_LATEST,
  SCHEMA_VERSION_MIN_SUPPORTED,
} from '@magic/shared/types/version';
import type {SchemaVersion} from '@magic/shared/types/version';
import {sessionMetaFile} from '../data_dir.js';

/**
 * Migrates a session's `meta.json` to the current schema. Returns true
 * if a migration was performed, false if the session was already at the
 * latest version.
 */
export async function migrateSession(id: string): Promise<boolean> {
  const path = sessionMetaFile(id);
  try {
    await access(path);
  } catch {
    return false;
  }
  const raw = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error(`session ${id} meta is not an object`);
  }
  const record = parsed as Record<string, unknown>;
  const currentVersion =
    typeof record['schemaVersion'] === 'string'
      ? (record['schemaVersion'] as SchemaVersion)
      : ('v0.0' as SchemaVersion);

  if (currentVersion === SCHEMA_VERSION_LATEST) {
    return false;
  }
  if (currentVersion < SCHEMA_VERSION_MIN_SUPPORTED) {
    throw new Error(
      `session ${id} schema ${currentVersion} is below minimum supported ` +
        `${SCHEMA_VERSION_MIN_SUPPORTED}; cannot migrate`,
    );
  }

  const migrated = migrateSchema<Record<string, unknown>>(record, currentVersion);
  migrated['schemaVersion'] = SCHEMA_VERSION_LATEST;
  // Stamp updatedAt on the way through.
  migrated['updatedAt'] = new Date().toISOString();

  const tempPath = join(
    tmpdir(),
    `magic-migrate-${id}-${randomBytes(8).toString('hex')}.json`,
  );
  await writeFile(tempPath, JSON.stringify(migrated, null, 2), {mode: 0o600});
  await rename(tempPath, path);
  return true;
}
