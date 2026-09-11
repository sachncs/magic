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
 * Reads and JSON-parses the raw `meta.json` for a session, or returns
 * null if the file does not exist. Shared by {@link readMeta} and
 * {@link migrateSession} so they cannot drift in how they parse or
 * version-derive the on-disk record.
 */
export async function loadRawMeta(id: string): Promise<Record<string, unknown> | null> {
  const path = sessionMetaFile(id);
  try {
    await access(path);
  } catch {
    return null;
  }
  const raw = await readFile(path, 'utf8');
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`meta.json for session ${id} is not valid JSON`);
  }
}

/**
 * Stamps the latest schema version (and `updatedAt` if requested) on
 * the in-memory record. The single source of truth for which fields
 * are stamped when a meta record is rewritten.
 */
export function stampLatest(record: Record<string, unknown>, opts: {bumpUpdatedAt?: boolean} = {}): Record<string, unknown> {
  record['schemaVersion'] = SCHEMA_VERSION_LATEST;
  if (opts.bumpUpdatedAt === true) {
    record['updatedAt'] = new Date().toISOString();
  }
  return record;
}

/**
 * Reads the meta.json for a session. Returns null if it doesn't exist.
 * On read, runs the payload through schema migration so the returned
 * record is always at the latest version.
 */
export async function readMeta(id: string): Promise<SessionMeta | null> {
  const record = await loadRawMeta(id);
  if (record === null) {
    return null;
  }
  const currentVersion =
    typeof record['schemaVersion'] === 'string'
      ? (record['schemaVersion'] as string)
      : 'v0.0';
  const migrated = migrateSchema<Record<string, unknown>>(record, currentVersion);
  stampLatest(migrated);
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
