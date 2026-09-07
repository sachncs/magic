/**
 * @fileoverview Tests for the network guard. Covers localhost allow,
 * non-localhost deny under localhost-only mode, open mode passthrough.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {isUrlAllowed, isLocalhostUrl, assertUrlAllowed, networkMode} from './network_guard.js';

describe('isLocalhostUrl', () => {
  it('accepts http://localhost', () => {
    expect(isLocalhostUrl('http://localhost:11434/v1')).toBe(true);
  });
  it('accepts 127.0.0.1', () => {
    expect(isLocalhostUrl('http://127.0.0.1:4317')).toBe(true);
  });
  it('accepts ::1', () => {
    expect(isLocalhostUrl('http://[::1]:4317')).toBe(true);
  });
  it('rejects api.openai.com', () => {
    expect(isLocalhostUrl('https://api.openai.com/v1')).toBe(false);
  });
  it('rejects malformed', () => {
    expect(isLocalhostUrl('not a url')).toBe(false);
  });
  it('accepts git ssh-style localhost', () => {
    expect(isLocalhostUrl('git@localhost:repo.git')).toBe(true);
  });
});

describe('isUrlAllowed (mode-dependent)', () => {
  const originalMode = process.env.MAGIC_NETWORK_MODE;

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.MAGIC_NETWORK_MODE;
    } else {
      process.env.MAGIC_NETWORK_MODE = originalMode;
    }
  });

  it('open mode allows everything', () => {
    delete process.env.MAGIC_NETWORK_MODE;
    expect(networkMode()).toBe('open');
    expect(isUrlAllowed('https://api.openai.com/v1')).toBe(true);
  });

  it('localhost-only mode allows localhost', () => {
    process.env.MAGIC_NETWORK_MODE = 'localhost-only';
    expect(isUrlAllowed('http://localhost:11434/v1')).toBe(true);
  });

  it('localhost-only mode denies public URLs', () => {
    process.env.MAGIC_NETWORK_MODE = 'localhost-only';
    expect(isUrlAllowed('https://api.openai.com/v1')).toBe(false);
  });
});

describe('assertUrlAllowed', () => {
  beforeEach(() => {
    process.env.MAGIC_NETWORK_MODE = 'localhost-only';
  });

  afterEach(() => {
    delete process.env.MAGIC_NETWORK_MODE;
  });

  it('passes for localhost', () => {
    expect(() => assertUrlAllowed('http://localhost:11434')).not.toThrow();
  });

  it('throws for public URL', () => {
    expect(() => assertUrlAllowed('https://api.openai.com')).toThrow(/forbids/);
  });
});
