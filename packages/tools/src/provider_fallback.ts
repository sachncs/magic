/**
 * @fileoverview Provider fallback. Wraps a primary provider call and
 * swaps to a secondary provider after N consecutive failures. Driven
 * by `MAGIC_PROVIDER_FALLBACK` env (comma-separated list).
 */

import {env} from 'node:process';
import type {ProviderId} from '@magic/shared/types/pricing';
import {withRetry, isRetryable, backoffMs, type RetryOptions} from './retry.js';

/**
 * Parses `MAGIC_PROVIDER_FALLBACK` into an ordered list. Returns
 * `undefined` when unset.
 */
export function parseFallbackChain(): ReadonlyArray<ProviderId> | undefined {
  const raw = env.MAGIC_PROVIDER_FALLBACK;
  if (raw === undefined || raw.length === 0) {
    return undefined;
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0) as ProviderId[];
}

/**
 * Returns the threshold (consecutive failures) after which we swap
 * to the next provider in the chain.
 */
export function fallbackThreshold(): number {
  const raw = env.MAGIC_PROVIDER_FALLBACK_THRESHOLD;
  if (raw === undefined) {
    return 3;
  }
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) {
    return 3;
  }
  return n;
}

/**
 * Options for `withFallback`.
 */
export interface FallbackOptions {
  /** The primary provider; tried first. */
  readonly primary: ProviderId;
  /**
   * Optional ordered list of fallback providers. If omitted, derived
   * from `MAGIC_PROVIDER_FALLBACK`.
   */
  readonly fallbacks?: ReadonlyArray<ProviderId>;
  /** Consecutive failures before swapping. Default: 3. */
  readonly threshold?: number;
  /**
   * Resolves a provider id to a function that performs the call. The
   * runtime uses this to construct the right model client per provider.
   */
  readonly resolve: (provider: ProviderId) => () => Promise<unknown>;
  /**
   * Called when the call swaps to a fallback provider.
   */
  readonly onSwap?: (from: ProviderId, to: ProviderId) => void;
}

/**
 * Runs `resolve(primary)()` with retry. On `threshold` consecutive
 * retryable failures, swaps to the next provider in the chain. Returns
 * the result of the first provider to succeed, or throws the last
 * error if all providers fail.
 */
export async function withFallback<T>(opts: FallbackOptions): Promise<T> {
  const fallbacks = opts.fallbacks ?? parseFallbackChain() ?? [];
  const threshold = opts.threshold ?? fallbackThreshold();
  const chain: ProviderId[] = [opts.primary, ...fallbacks];

  let consecutive = 0;
  let lastErr: unknown;
  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    if (provider === undefined) {
      continue;
    }
    try {
      const fn = opts.resolve(provider);
      const r = (await withRetry(fn as () => Promise<T>, {
        provider,
        baseMs: 500,
        capMs: 10_000,
      })) as T;
      return r;
    } catch (e) {
      lastErr = e;
      if (!isRetryable(provider, e)) {
        throw e; // hard error; don't fall back
      }
      consecutive++;
      if (consecutive < threshold) {
        const delay = backoffMs(consecutive, 500, 5_000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      // Swap to next provider.
      if (i + 1 < chain.length) {
        const next = chain[i + 1];
        if (next !== undefined) {
          opts.onSwap?.(provider, next);
          consecutive = 0;
          continue;
        }
      }
      throw e;
    }
  }
  throw lastErr;
}

void {} as RetryOptions;
