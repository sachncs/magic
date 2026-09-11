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
 * Parses a `vMAJOR` or `vMAJOR.MINOR` string into a `(major, minor)`
 * tuple. `v1` is equivalent to `v1.0`. Throws if the string does not
 * match the schema-version format.
 */
export function parseSchemaVersion(v: string): {major: number; minor: number} {
  const match = /^v(\d+)(?:\.(\d+))?$/.exec(v);
  if (!match) {
    throw new Error(`not a schema version: ${v}`);
  }
  return {major: Number(match[1]), minor: match[2] ? Number(match[2]) : 0};
}

/**
 * Compares two schema-version strings numerically. Returns
 * `-1 | 0 | 1` like `Array.prototype.sort`. Throws on malformed input.
 */
export function compareSchemaVersions(a: string, b: string): -1 | 0 | 1 {
  const va = parseSchemaVersion(a);
  const vb = parseSchemaVersion(b);
  if (va.major !== vb.major) {
    return va.major < vb.major ? -1 : 1;
  }
  if (va.minor !== vb.minor) {
    return va.minor < vb.minor ? -1 : 1;
  }
  return 0;
}

/**
 * Returns true if the given schema version can be safely loaded by the
 * current code. A version is supported if it is between MIN_SUPPORTED and
 * LATEST inclusive.
 */
export function isSchemaVersionSupported(v: string): boolean {
  return (
    compareSchemaVersions(v, SCHEMA_VERSION_MIN_SUPPORTED) >= 0 &&
    compareSchemaVersions(v, SCHEMA_VERSION_LATEST) <= 0
  );
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
 * The v0.0 → v1 migration: identity (no shape changes; just stamps the
 * latest version). Sessions created before explicit versioning migrate
 * transparently.
 */
const v0_0_to_v1: SchemaMigration = (record) => record;
void v0_0_to_v1;

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

  while (compareSchemaVersions(version, SCHEMA_VERSION_LATEST) < 0) {
    const migration = schemaMigrations[version];
    if (!migration) {
      throw new Error(
        `no migration from ${version} to next; cannot reach ${SCHEMA_VERSION_LATEST}`,
      );
    }
    result = migration(result);
    // Bump version (assumes sequential vMAJOR.MINOR).
    const parts = parseSchemaVersion(version);
    version = `v${parts.major}.${parts.minor + 1}`;
  }

  return result as T;
}
