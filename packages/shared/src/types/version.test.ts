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

  it('returns false for too-old versions', () => {
    expect(isSchemaVersionSupported('v0.1')).toBe(false);
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

  it('throws for unsupported older versions', () => {
    expect(() => migrateSchema({}, 'v0.1')).toThrow(/unsupported/);
  });
});
