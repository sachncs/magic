/**
 * @fileoverview Exponential backoff with jitter for provider calls.
 * Per-provider retryable status codes are configured here. Used by the
 * provider-fallback wrapper (3.26) and by direct model calls.
 */

import type {ProviderId} from '@magic/shared/types/pricing';

/**
 * Per-provider retryable status codes. When the model client throws an
 * error with one of these, the call is retried.
 */
export const RETRYABLE_STATUSES: Readonly<Record<ProviderId, ReadonlyArray<number | string>>> = {
  bedrock: ['ThrottlingException', 'TooManyRequestsException', 429, 500, 503],
  anthropic: [429, 500, 503, 529, 'overloaded_error'],
  openai: [429, 500, 502, 503, 504],
  google: [429, 500, 503, 'RESOURCE_EXHAUSTED', 'UNAVAILABLE'],
  minimax: [429, 500, 502, 503, 504],
  ollama: [500, 502, 503, 504],
  llamacpp: [500, 502, 503, 504],
  'openai-compat': [429, 500, 502, 503, 504],
};

/**
 * Returns true if the given error looks retryable.
 */
export function isRetryable(provider: ProviderId, err: unknown): boolean {
  const status = (err as {status?: number | string; code?: number | string; message?: string});
  const code = status.status ?? status.code;
  if (typeof code === 'number' || typeof code === 'string') {
    return RETRYABLE_STATUSES[provider].includes(code);
  }
  // Network/timeout errors are always retryable.
  const msg = (status.message ?? '').toLowerCase();
  if (msg.includes('timeout') || msg.includes('econnreset') || msg.includes('etimedout')) {
    return true;
  }
  return false;
}

/**
 * Computes the backoff delay for a given attempt (0-indexed). Uses
 * exponential growth with full jitter.
 */
export function backoffMs(
  attempt: number,
  baseMs: number = 500,
  capMs: number = 30_000,
): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.floor(Math.random() * exp);
}

/**
 * Options for `withRetry`.
 */
export interface RetryOptions {
  readonly provider: ProviderId;
  readonly maxAttempts?: number;
  readonly baseMs?: number;
  readonly capMs?: number;
  readonly onRetry?: (attempt: number, err: unknown, delayMs: number) => void;
}

const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Wraps an async function with retry + exponential backoff. Returns the
 * final result or throws the last error.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const max = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const base = opts.baseMs ?? 500;
  const cap = opts.capMs ?? 30_000;
  let lastErr: unknown;
  for (let attempt = 0; attempt < max; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === max - 1 || !isRetryable(opts.provider, e)) {
        throw e;
      }
      const delay = backoffMs(attempt, base, cap);
      opts.onRetry?.(attempt, e, delay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
