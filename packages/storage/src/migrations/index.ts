/**
 * @fileoverview Schema migration registry. The migration chain lives in
 * `@magic/shared/types/version`; this module provides the storage-side
 * `migrateSession` function that reads a session, runs all applicable
 * migrations, and writes it back.
 */

import {writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {rename} from 'node:fs/promises';
import {
  compareSchemaVersions,
  migrateSchema,
  SCHEMA_VERSION_LATEST,
  SCHEMA_VERSION_MIN_SUPPORTED,
} from '@magic/shared/types/version';
import {loadRawMeta, stampLatest} from '../meta.js';
import {sessionMetaFile} from '../data_dir.js';

/**
 * Migrates a session's `meta.json` to the current schema. Returns true
 * if a migration was performed, false if the session was already at the
 * latest version.
 */
export async function migrateSession(id: string): Promise<boolean> {
  const record = await loadRawMeta(id);
  if (record === null) {
    return false;
  }

  const currentVersion =
    typeof record['schemaVersion'] === 'string'
      ? (record['schemaVersion'])
      : 'v0.0';

  if (compareSchemaVersions(currentVersion, SCHEMA_VERSION_LATEST) === 0) {
    return false;
  }
  if (compareSchemaVersions(currentVersion, SCHEMA_VERSION_MIN_SUPPORTED) < 0) {
    throw new Error(
      `session ${id} schema ${currentVersion} is below minimum supported ` +
        `${SCHEMA_VERSION_MIN_SUPPORTED}; cannot migrate`,
    );
  }

  const migrated = migrateSchema<Record<string, unknown>>(record, currentVersion);
  stampLatest(migrated, {bumpUpdatedAt: true});

  const path = sessionMetaFile(id);
  const tempPath = join(
    tmpdir(),
    `magic-migrate-${id}-${randomBytes(8).toString('hex')}.json`,
  );
  await writeFile(tempPath, JSON.stringify(migrated, null, 2), {mode: 0o600});
  await rename(tempPath, path);
  return true;
}
