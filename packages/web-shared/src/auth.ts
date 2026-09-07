/**
 * @fileoverview REST API bearer token authentication. Reads `MAGIC_API_TOKEN`
 * from environment at boot. When set, all `/api/*` routes (except
 * `/api/health/*`) require `Authorization: Bearer <token>`. When unset, the
 * server assumes it is only reachable from localhost and skips the check.
 *
 * `MAGIC_API_TOKEN` should be a random secret (e.g. `openssl rand -hex 32`).
 */

import {env} from 'node:process';

/**
 * Returns the configured bearer token, or undefined if not set.
 */
export function getApiToken(): string | undefined {
  const token = env.MAGIC_API_TOKEN;
  if (token && token.length > 0) {
    return token;
  }
  return undefined;
}

/**
 * Whether the server should require bearer auth. True iff a token is set.
 */
export function authRequired(): boolean {
  return getApiToken() !== undefined;
}

/**
 * Constant-time string comparison. Prevents timing side-channels when
 * comparing the presented token against the configured one.
 *
 * @param a - First string.
 * @param b - Second string.
 * @returns True if the strings are equal in length and content.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Extracts the bearer token from an `Authorization` header value. Returns
 * undefined if the header is missing, malformed, or uses a different scheme.
 *
 * @param header - The value of the `Authorization` header.
 * @returns The token, or undefined.
 */
export function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) {
    return undefined;
  }
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return undefined;
  }
  return match[1];
}

/**
 * Validates a presented token against the configured one using constant-time
 * comparison. Returns true iff auth is disabled (no token configured) or the
 * presented token matches.
 *
 * @param presented - The token from the request's Authorization header.
 * @returns True if access is allowed.
 */
export function isValidApiToken(presented: string | undefined): boolean {
  const configured = getApiToken();
  if (configured === undefined) {
    // No token configured; auth disabled (assume localhost-only)
    return true;
  }
  if (presented === undefined) {
    return false;
  }
  return timingSafeEqual(presented, configured);
}

/**
 * Paths that bypass auth even when a token is configured. Health checks
 * are public so monitoring can probe without holding the secret.
 */
export const PUBLIC_PATHS: ReadonlySet<string> = new Set([
  '/api/health/live',
  '/api/health/ready',
]);

/**
 * Whether a given path is exempt from auth.
 *
 * @param path - The request URL path (no query string).
 * @returns True if auth should be skipped for this path.
 */
export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path);
}
