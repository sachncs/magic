/**
 * @fileoverview WebSocket authentication for magic sessions. Each session gets
 * a unique token issued at creation time; clients must present it when
 * connecting to `WS /ws/sessions/:id?token=<token>`. Tokens are UUIDv4 — long
 * enough to resist brute force, single-use per session lifetime.
 */

import {randomUUID} from 'node:crypto';
import type {SessionId} from '@magic/shared/branded';

/**
 * A session-scoped WebSocket token. Opaque; never logged.
 */
export type WsToken = string & {readonly __brand: 'WsToken'};

/**
 * In-memory token registry. Tokens live for the lifetime of the server process;
 * on restart, all clients must reconnect with new tokens (sessions themselves
 * are persisted to disk and can be re-bound to a new token on demand).
 */
const tokens = new Map<WsToken, {sessionId: SessionId; createdAt: number}>();

/**
 * Token lifetime. After this many milliseconds, a token is considered expired
 * and rejected even if the session still exists. 24 hours.
 */
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Generates a new WebSocket token bound to a session.
 *
 * @param sessionId - The session this token grants access to.
 * @returns The new opaque token.
 */
export function issueWsToken(sessionId: SessionId): WsToken {
  const raw = randomUUID();
  const token = raw as WsToken;
  tokens.set(token, {sessionId, createdAt: Date.now()});
  return token;
}

/**
 * Validates a token presented by a connecting client. Returns the bound
 * session ID on success; throws on failure.
 *
 * @param token - The token from the `?token=` query parameter.
 * @param sessionId - The session ID from the URL path; must match.
 * @returns The bound session ID.
 * @throws {WsAuthError} If the token is missing, invalid, expired, or does
 *   not match the session ID in the URL.
 */
export function validateWsToken(token: string, sessionId: SessionId): SessionId {
  if (!token) {
    throw new WsAuthError('missing token');
  }
  const record = tokens.get(token as WsToken);
  if (!record) {
    throw new WsAuthError('invalid token');
  }
  if (Date.now() - record.createdAt > TOKEN_TTL_MS) {
    tokens.delete(token as WsToken);
    throw new WsAuthError('token expired');
  }
  if (record.sessionId !== sessionId) {
    throw new WsAuthError('token does not match session');
  }
  return record.sessionId;
}

/**
 * Revokes a token. Called when a session is deleted.
 *
 * @param token - The token to revoke.
 */
export function revokeWsToken(token: WsToken): void {
  tokens.delete(token);
}

/**
 * WebSocket close code used for auth failures. Per RFC 6455, codes 4000-4999
 * are reserved for application use; 4401 mirrors HTTP 401 Unauthorized.
 */
export const WS_CLOSE_UNAUTHORIZED = 4401;

/**
 * Error thrown by {@link validateWsToken} on failure. Carries a message safe
 * to send to the client; do not include the token itself.
 */
export class WsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WsAuthError';
  }
}
