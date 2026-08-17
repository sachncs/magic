/**
 * @fileoverview Schema and graph versioning. `SchemaVersion` tracks the
 * shape of persisted records (`SessionMeta`, `RepoManifest`); `GraphVersion`
 * tracks the definition of the agent graph itself (agent set, prompts,
 * routing). Bumping either is a breaking change.
 *
 * Migration utilities transform older records into the current shape on
 * load. Each migration is a pure function `(old) => new`.
 */

import {z} from 'zod';

/**
 * Schema version string. Format: `vMAJOR.MINOR`.
 */
export type SchemaVersion = string;

/**
 * The current schema version. Bump when SessionMeta / RepoManifest change
 * in a way that requires a migration.
 */
export const SCHEMA_VERSION_LATEST: SchemaVersion = 'v1';

/**
 * The minimum schema version we still support on load. Sessions older than
 * this are rejected. We accept `v0.0` (pre-versioning) because it
 * represents the implicit schema before explicit versioning.
 */
export const SCHEMA_VERSION_MIN_SUPPORTED = 'v0.0' as const;

/**
 * Graph definition version. Bumped when the graph definition changes
 * in a way that affects replay.
 */
export type GraphVersion = string;

/**
 * The current graph definition version. Bump when the graph definition
 * changes in a way that affects replay.
 */
export const GRAPH_VERSION_LATEST: GraphVersion = 'v1';

/**
 * Parses a `SchemaVersion` string. Throws if malformed.
 */
export const schemaVersionSchema = z
  .string()
  .regex(/^v\d+\.\d+$/, 'must be in form vMAJOR.MINOR');

/**
 * Parses a `GraphVersion` string. Throws if malformed.
 */
export const graphVersionSchema = z
  .string()
  .regex(/^v\d+\.\d+$/, 'must be in form vMAJOR.MINOR');

/**
 * Returns true if the given schema version can be safely loaded by the
 * current code. A version is supported if it is between MIN_SUPPORTED and
 * LATEST inclusive.
 */
export function isSchemaVersionSupported(v: string): boolean {
  return v >= SCHEMA_VERSION_MIN_SUPPORTED && v <= SCHEMA_VERSION_LATEST;
}

/**
 * Returns true if the given graph version is at-least as new as LATEST.
 * Used to decide whether a session can be replayed verbatim vs. needs
 * a warning.
 */
export function isGraphVersionCurrent(v: string): boolean {
  return v === GRAPH_VERSION_LATEST;
}

/**
 * A single schema migration: takes a record at version `from` and
 * returns it at version `from + 1`. Migrations are pure, idempotent
 * (re-running is a no-op), and chain in order.
 */
export type SchemaMigration = (record: unknown) => unknown;

/**
 * Migration registry. Keyed by the version it migrates FROM. Each entry
 * transforms `vN` into `vN+1`. Adding a new version:
 *
 *   1. Add a migration function under the new key
 *   2. Bump `SCHEMA_VERSION_LATEST`
 *   3. If older versions are no longer supported, raise MIN_SUPPORTED
 */
export const schemaMigrations: Readonly<Record<string, SchemaMigration>> = {
  // No migrations yet — v1 is the starting point.
};

/**
 * Migration registry for graph versions. Keyed by the version it migrates
 * FROM. Bump `GRAPH_VERSION_LATEST` when the graph definition changes.
 */
export const graphMigrations: Readonly<Record<string, SchemaMigration>> = {
  // No migrations yet.
};

/**
 * Applies schema migrations in order, from the record's current version
 * up to `SCHEMA_VERSION_LATEST`. Returns the migrated record. Throws if
 * the record's version is below `SCHEMA_VERSION_MIN_SUPPORTED` or if a
 * required migration is missing.
 */
export function migrateSchema<T = unknown>(
  record: unknown,
  currentVersion: string,
): T {
  if (!isSchemaVersionSupported(currentVersion)) {
    throw new Error(
      `unsupported schema version ${currentVersion}; ` +
        `min supported: ${SCHEMA_VERSION_MIN_SUPPORTED}, ` +
        `latest: ${SCHEMA_VERSION_LATEST}`,
    );
  }

  let result = record;
  let version = currentVersion;

  while (version !== SCHEMA_VERSION_LATEST) {
    const migration = schemaMigrations[version];
    if (!migration) {
      throw new Error(
        `no migration from ${version} to next; cannot reach ${SCHEMA_VERSION_LATEST}`,
      );
    }
    result = migration(result);
    // Bump version (assumes sequential vMAJOR.MINOR).
    const parts = version.slice(1).split('.').map(Number);
    parts[1] = (parts[1] ?? 0) + 1;
    version = `v${parts[0]}.${parts[1]}`;
  }

  return result as T;
}
