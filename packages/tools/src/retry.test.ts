/**
 * @fileoverview Tests for the retry middleware. Covers retryable vs
 * non-retryable errors, backoff timing, and exhaustion.
 */

import {describe, it, expect, vi} from 'vitest';
import {withRetry, isRetryable, backoffMs, RETRYABLE_STATUSES} from './retry.js';

describe('isRetryable', () => {
  it('recognises Anthropic 429', () => {
    expect(isRetryable('anthropic', {status: 429})).toBe(true);
  });
  it('recognises Anthropic 529', () => {
    expect(isRetryable('anthropic', {status: 529})).toBe(true);
  });
  it('does not retry a 400', () => {
    expect(isRetryable('anthropic', {status: 400})).toBe(false);
  });
  it('recognises Bedrock ThrottlingException by name', () => {
    expect(isRetryable('bedrock', {code: 'ThrottlingException'})).toBe(true);
  });
  it('recognises timeout in message', () => {
    expect(isRetryable('openai', {message: 'Request timeout after 30s'})).toBe(true);
  });
  it('recognises RESOURCE_EXHAUSTED for Google', () => {
    expect(isRetryable('google', {code: 'RESOURCE_EXHAUSTED'})).toBe(true);
  });
});

describe('backoffMs', () => {
  it('respects the cap', () => {
    for (let i = 0; i < 100; i++) {
      const v = backoffMs(20, 500, 10_000);
      expect(v).toBeLessThanOrEqual(10_000);
    }
  });
  it('grows exponentially up to the cap', () => {
    for (let i = 0; i < 50; i++) {
      const v = backoffMs(3, 100, 1000);
      expect(v).toBeLessThanOrEqual(1000);
    }
  });
});

describe('RETRYABLE_STATUSES', () => {
  it('has entries for every provider', () => {
    for (const p of Object.keys(RETRYABLE_STATUSES)) {
      expect(RETRYABLE_STATUSES[p as keyof typeof RETRYABLE_STATUSES].length).toBeGreaterThan(0);
    }
  });
});

describe('withRetry', () => {
  it('succeeds on first try', async () => {
    let calls = 0;
    const r = await withRetry(async () => {
      calls++;
      return 'ok';
    }, {provider: 'anthropic'});
    expect(r).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries on retryable error and succeeds', async () => {
    let calls = 0;
    const r = await withRetry(
      async () => {
        calls++;
        if (calls < 3) {
          const e: Error & {status?: number} = new Error('rate limited');
          e.status = 429;
          throw e;
        }
        return 'ok';
      },
      {provider: 'anthropic', baseMs: 1, capMs: 2},
    );
    expect(r).toBe('ok');
    expect(calls).toBe(3);
  });

  it('does not retry on non-retryable error', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          const e: Error & {status?: number} = new Error('bad input');
          e.status = 400;
          throw e;
        },
        {provider: 'anthropic', baseMs: 1, capMs: 2},
      ),
    ).rejects.toThrow('bad input');
    expect(calls).toBe(1);
  });

  it('exhausts max attempts', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          const e: Error & {status?: number} = new Error('still throttled');
          e.status = 429;
          throw e;
        },
        {provider: 'anthropic', maxAttempts: 3, baseMs: 1, capMs: 2},
      ),
    ).rejects.toThrow('still throttled');
    expect(calls).toBe(3);
  });

  it('invokes onRetry callback with attempt, error, delay', async () => {
    const seen: Array<{attempt: number; delay: number}> = [];
    let calls = 0;
    await withRetry(
      async () => {
        calls++;
        if (calls < 2) {
          throw Object.assign(new Error('429'), {status: 429});
        }
        return 'ok';
      },
      {
        provider: 'anthropic',
        baseMs: 10,
        capMs: 20,
        onRetry: (a, _e, d) => seen.push({attempt: a, delay: d}),
      },
    );
    expect(seen.length).toBe(1);
    expect(seen[0]?.attempt).toBe(0);
    expect(seen[0]?.delay).toBeLessThanOrEqual(20);
  });
});
