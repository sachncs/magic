/**
 * @fileoverview Read/write `meta.json` for a session with atomic semantics.
 * Validates the payload against the current schema and migrates older
 * versions on read.
 */

import {readFile, rename, writeFile, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {sessionMetaSchema, type SessionMeta} from '@magic/shared/types/session';
import {migrateSchema, SCHEMA_VERSION_LATEST} from '@magic/shared/types/version';
import type {SchemaVersion} from '@magic/shared/types/version';
import {ensureDataDir, sessionMetaFile, sessionDir} from './data_dir.js';

/**
 * Reads the meta.json for a session. Returns null if it doesn't exist.
 * On read, runs the payload through schema migration so the returned
 * record is always at the latest version.
 */
export async function readMeta(id: string): Promise<SessionMeta | null> {
  const path = sessionMetaFile(id);
  try {
    await access(path);
  } catch {
    return null;
  }
  const raw = await readFile(path, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`meta.json for session ${id} is not valid JSON`);
  }

  // Determine version; default to v0.0 if missing (pre-versioning).
  const record = parsed as Record<string, unknown>;
  const currentVersion =
    typeof record['schemaVersion'] === 'string'
      ? (record['schemaVersion'] as string)
      : 'v0.0';

  const migrated = migrateSchema<Record<string, unknown>>(record, currentVersion);
  // Stamp the latest version on the way out.
  migrated['schemaVersion'] = SCHEMA_VERSION_LATEST;
  return sessionMetaSchema.parse(migrated);
}

/**
 * Writes meta.json atomically: writes to a temp file in the same
 * directory, then renames. A crash mid-write leaves the previous version
 * intact.
 */
export async function writeMeta(id: string, meta: SessionMeta): Promise<void> {
  await ensureDataDir();
  await import('node:fs/promises').then((m) => m.mkdir(sessionDir(id), {recursive: true}));

  // Re-parse to ensure we always write the latest shape.
  const validated = sessionMetaSchema.parse({
    ...meta,
    schemaVersion: SCHEMA_VERSION_LATEST as unknown as SchemaVersion,
    updatedAt: new Date().toISOString(),
  });
  const json = JSON.stringify(validated, null, 2);

  const targetPath = sessionMetaFile(id);
  const tempPath = join(
    tmpdir(),
    `magic-meta-${id}-${randomBytes(8).toString('hex')}.json`,
  );

  await writeFile(tempPath, json, {mode: 0o600});
  await rename(tempPath, targetPath);
}
