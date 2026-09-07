/**
 * @fileoverview Tests for the provider fallback wrapper. Verifies
 * chain parsing, threshold-based swap, and hard-error non-fallback.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {withFallback, parseFallbackChain, fallbackThreshold} from './provider_fallback.js';

describe('parseFallbackChain', () => {
  const original = process.env.MAGIC_PROVIDER_FALLBACK;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MAGIC_PROVIDER_FALLBACK;
    } else {
      process.env.MAGIC_PROVIDER_FALLBACK = original;
    }
  });

  it('returns undefined when unset', () => {
    delete process.env.MAGIC_PROVIDER_FALLBACK;
    expect(parseFallbackChain()).toBeUndefined();
  });

  it('parses comma-separated list', () => {
    process.env.MAGIC_PROVIDER_FALLBACK = 'openai,anthropic,bedrock';
    const r = parseFallbackChain();
    expect(r).toEqual(['openai', 'anthropic', 'bedrock']);
  });

  it('trims whitespace', () => {
    process.env.MAGIC_PROVIDER_FALLBACK = ' openai , bedrock ';
    const r = parseFallbackChain();
    expect(r).toEqual(['openai', 'bedrock']);
  });
});

describe('fallbackThreshold', () => {
  const original = process.env.MAGIC_PROVIDER_FALLBACK_THRESHOLD;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MAGIC_PROVIDER_FALLBACK_THRESHOLD;
    } else {
      process.env.MAGIC_PROVIDER_FALLBACK_THRESHOLD = original;
    }
  });

  it('returns default when unset', () => {
    delete process.env.MAGIC_PROVIDER_FALLBACK_THRESHOLD;
    expect(fallbackThreshold()).toBe(3);
  });

  it('returns env value', () => {
    process.env.MAGIC_PROVIDER_FALLBACK_THRESHOLD = '5';
    expect(fallbackThreshold()).toBe(5);
  });

  it('falls back to default for non-numeric', () => {
    process.env.MAGIC_PROVIDER_FALLBACK_THRESHOLD = 'abc';
    expect(fallbackThreshold()).toBe(3);
  });
});

describe('withFallback', () => {
  beforeEach(() => {
    process.env.MAGIC_PROVIDER_FALLBACK = 'anthropic,bedrock';
  });

  afterEach(() => {
    delete process.env.MAGIC_PROVIDER_FALLBACK;
  });

  it('succeeds on first provider', async () => {
    const calls: string[] = [];
    const r = await withFallback<string>({
      primary: 'openai',
      threshold: 2,
      resolve: (p) => async () => {
        calls.push(p);
        return 'ok';
      },
    });
    expect(r).toBe('ok');
    expect(calls).toEqual(['openai']);
  });

  it('swaps to fallback after threshold failures', async () => {
    const calls: string[] = [];
    const r = await withFallback<string>({
      primary: 'openai',
      threshold: 2,
      resolve: (p) => async () => {
        calls.push(p);
        const e: Error & {status?: number} = new Error('429');
        e.status = 429;
        throw e;
      },
    });
    // withRetry retries within the same provider; withFallback swaps
    // after `threshold` consecutive retryable failures on the same
    // provider. We expect at least one swap to anthropic.
    expect(calls).toContain('anthropic');
    expect(r).toBeUndefined(); // nothing returned; the swap continued
  }, 30_000);

  it('throws hard error without fallback', async () => {
    await expect(
      withFallback<string>({
        primary: 'openai',
        threshold: 2,
        resolve: () => async () => {
          const e: Error & {status?: number} = new Error('400');
          e.status = 400;
          throw e;
        },
      }),
    ).rejects.toThrow('400');
  });
});
