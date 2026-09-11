/**
 * @fileoverview Tests for version + migration utilities. Covers parsing,
 * support checks, and idempotent migration.
 */

import {describe, it, expect} from 'vitest';
import {
  schemaVersionSchema,
  graphVersionSchema,
  isSchemaVersionSupported,
  isGraphVersionCurrent,
  migrateSchema,
  parseSchemaVersion,
  compareSchemaVersions,
  SCHEMA_VERSION_LATEST,
  GRAPH_VERSION_LATEST,
} from './version.js';

describe('schemaVersionSchema', () => {
  it('accepts vMAJOR.MINOR', () => {
    expect(schemaVersionSchema.parse('v1.0')).toBe('v1.0');
    expect(schemaVersionSchema.parse('v12.34')).toBe('v12.34');
  });

  it('rejects malformed', () => {
    expect(() => schemaVersionSchema.parse('1.0')).toThrow();
    expect(() => schemaVersionSchema.parse('v1')).toThrow();
    expect(() => schemaVersionSchema.parse('v1.x')).toThrow();
    expect(() => schemaVersionSchema.parse('')).toThrow();
  });
});

describe('graphVersionSchema', () => {
  it('accepts vMAJOR.MINOR', () => {
    expect(graphVersionSchema.parse('v1.0')).toBe('v1.0');
  });

  it('rejects malformed', () => {
    expect(() => graphVersionSchema.parse('v1')).toThrow();
  });
});

describe('isSchemaVersionSupported', () => {
  it('returns true for the current version', () => {
    expect(isSchemaVersionSupported(SCHEMA_VERSION_LATEST)).toBe(true);
  });

  it('returns true for v0.0 (pre-versioning implicit)', () => {
    expect(isSchemaVersionSupported('v0.0')).toBe(true);
  });

  it('returns true for versions within the supported range', () => {
    expect(isSchemaVersionSupported('v0.0')).toBe(true);
    expect(isSchemaVersionSupported('v0.5')).toBe(true);
    expect(isSchemaVersionSupported('v1')).toBe(true);
  });

  it('compares double-digit version components numerically', () => {
    // 'v10.0' > 'v2.0' numerically, even though 'v10.0' < 'v2.0' lexically.
    expect(compareSchemaVersions('v10.0', 'v2.0')).toBe(1);
    expect(compareSchemaVersions('v2.0', 'v10.0')).toBe(-1);
    expect(compareSchemaVersions('v9.9', 'v10.0')).toBe(-1);
    expect(compareSchemaVersions('v10.0', 'v10.0')).toBe(0);
  });
});

describe('parseSchemaVersion', () => {
  it('parses vMAJOR.MINOR', () => {
    expect(parseSchemaVersion('v1.0')).toEqual({major: 1, minor: 0});
    expect(parseSchemaVersion('v10.3')).toEqual({major: 10, minor: 3});
  });

  it('treats vMAJOR as vMAJOR.0', () => {
    expect(parseSchemaVersion('v1')).toEqual({major: 1, minor: 0});
  });

  it('throws on malformed input', () => {
    expect(() => parseSchemaVersion('1.0')).toThrow();
    expect(() => parseSchemaVersion('v1.x')).toThrow();
    expect(() => parseSchemaVersion('')).toThrow();
  });
});

describe('isGraphVersionCurrent', () => {
  it('returns true only for the current version', () => {
    expect(isGraphVersionCurrent(GRAPH_VERSION_LATEST)).toBe(true);
    expect(isGraphVersionCurrent('v0.9')).toBe(false);
  });
});

describe('migrateSchema', () => {
  it('returns the record unchanged when at the latest version (no migrations)', () => {
    const rec = {id: 'x'};
    expect(migrateSchema(rec, SCHEMA_VERSION_LATEST)).toBe(rec);
  });

  it('handles same-version identity for v10.0 (numeric equality, not lexical)', () => {
    // compareSchemaVersions must agree with numeric ordering regardless
    // of how SCHEMA_VERSION_LATEST is set. v10.0 vs v10.0 is 0.
    expect(compareSchemaVersions('v10.0', 'v10.0')).toBe(0);
    // And v10.0 is strictly greater than v9.x, in contrast to lexical
    // compare where 'v10.0' < 'v9.x' would sort to the same bucket.
    expect(compareSchemaVersions('v9.5', 'v10.0')).toBe(-1);
    expect(compareSchemaVersions('v10.0', 'v9.5')).toBe(1);
  });

  it('throws when no migration is registered for the gap', () => {
    expect(() => migrateSchema({}, 'v0.05')).toThrow(/no migration/);
  });
});
