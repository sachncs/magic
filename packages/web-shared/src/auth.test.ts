/**
 * @fileoverview Tests for REST auth. Covers token extraction, constant-time
 * comparison, and path-based auth bypass.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {
  getApiToken,
  authRequired,
  timingSafeEqual,
  extractBearerToken,
  isValidApiToken,
  isPublicPath,
  pathFromUrl,
} from './auth.js';

describe('getApiToken / authRequired', () => {
  const originalToken = process.env.MAGIC_API_TOKEN;

  beforeEach(() => {
    delete process.env.MAGIC_API_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.MAGIC_API_TOKEN;
    } else {
      process.env.MAGIC_API_TOKEN = originalToken;
    }
  });

  it('returns undefined and authRequired=false when env not set', () => {
    expect(getApiToken()).toBeUndefined();
    expect(authRequired()).toBe(false);
  });

  it('returns the token and authRequired=true when set', () => {
    process.env.MAGIC_API_TOKEN = 'secret123';
    expect(getApiToken()).toBe('secret123');
    expect(authRequired()).toBe(true);
  });

  it('treats empty string as unset', () => {
    process.env.MAGIC_API_TOKEN = '';
    expect(getApiToken()).toBeUndefined();
    expect(authRequired()).toBe(false);
  });
});

describe('timingSafeEqual', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
  });

  it('returns false for unequal strings of same length', () => {
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
  });

  it('returns false for strings of different length', () => {
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  it('returns true for empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true);
  });
});

describe('extractBearerToken', () => {
  it('extracts from valid Bearer header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('is case-insensitive on scheme', () => {
    expect(extractBearerToken('bearer abc123')).toBe('abc123');
    expect(extractBearerToken('BEARER abc123')).toBe('abc123');
  });

  it('returns undefined for missing header', () => {
    expect(extractBearerToken(undefined)).toBeUndefined();
  });

  it('returns undefined for empty header', () => {
    expect(extractBearerToken('')).toBeUndefined();
  });

  it('returns undefined for non-Bearer scheme', () => {
    expect(extractBearerToken('Basic abc123')).toBeUndefined();
  });

  it('returns undefined for malformed header', () => {
    expect(extractBearerToken('abc123')).toBeUndefined();
    expect(extractBearerToken('Bearer')).toBeUndefined();
  });
});

describe('isValidApiToken', () => {
  const originalToken = process.env.MAGIC_API_TOKEN;

  beforeEach(() => {
    delete process.env.MAGIC_API_TOKEN;
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.MAGIC_API_TOKEN;
    } else {
      process.env.MAGIC_API_TOKEN = originalToken;
    }
  });

  it('allows any token when none configured (localhost assumption)', () => {
    expect(isValidApiToken(undefined)).toBe(true);
    expect(isValidApiToken('anything')).toBe(true);
  });

  it('rejects missing token when configured', () => {
    process.env.MAGIC_API_TOKEN = 'secret';
    expect(isValidApiToken(undefined)).toBe(false);
  });

  it('accepts matching token', () => {
    process.env.MAGIC_API_TOKEN = 'secret';
    expect(isValidApiToken('secret')).toBe(true);
  });

  it('rejects non-matching token', () => {
    process.env.MAGIC_API_TOKEN = 'secret';
    expect(isValidApiToken('wrong')).toBe(false);
  });
});

describe('isPublicPath', () => {
  it('returns true for health paths', () => {
    expect(isPublicPath('/api/health/live')).toBe(true);
    expect(isPublicPath('/api/health/ready')).toBe(true);
  });

  it('returns true for health paths with query strings', () => {
    expect(isPublicPath('/api/health/live?probe=1')).toBe(true);
    expect(isPublicPath('/api/health/ready?source=monitor')).toBe(true);
    expect(isPublicPath('/api/health/live#hash')).toBe(true);
  });

  it('returns false for non-health paths', () => {
    expect(isPublicPath('/api/sessions')).toBe(false);
    expect(isPublicPath('/api/sessions/abc')).toBe(false);
    expect(isPublicPath('/api/sessions?q=foo')).toBe(false);
  });
});

describe('pathFromUrl', () => {
  it('returns the path unchanged when there is no query or fragment', () => {
    expect(pathFromUrl('/api/health/live')).toBe('/api/health/live');
  });

  it('strips the query string', () => {
    expect(pathFromUrl('/api/health/live?probe=1')).toBe('/api/health/live');
  });

  it('strips the fragment', () => {
    expect(pathFromUrl('/api/health/live#section')).toBe('/api/health/live');
  });

  it('strips both, keeping the query before the fragment', () => {
    expect(pathFromUrl('/api/health/live?probe=1#sec')).toBe('/api/health/live');
  });
});
