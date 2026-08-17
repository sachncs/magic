/**
 * @fileoverview Tests for ws_auth. Covers token issuance, validation,
 * mismatch, expiry, and revocation. Uses fake timers for TTL tests.
 */

import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {
  issueWsToken,
  validateWsToken,
  revokeWsToken,
  WsAuthError,
  WS_CLOSE_UNAUTHORIZED,
  type WsToken,
} from './ws_auth.js';
import {brand, type SessionId} from '@magic/shared/branded';

function newSessionId(): SessionId {
  return brand<string, 'SessionId'>(`sess-${Math.random()}`);
}

describe('issueWsToken', () => {
  it('returns a non-empty string token', () => {
    const sessionId = newSessionId();
    const token = issueWsToken(sessionId);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('returns a different token on each call', () => {
    const sessionId = newSessionId();
    const t1 = issueWsToken(sessionId);
    const t2 = issueWsToken(sessionId);
    expect(t1).not.toBe(t2);
  });
});

describe('validateWsToken', () => {
  let sessionId: SessionId;

  beforeEach(() => {
    sessionId = newSessionId();
  });

  it('returns the bound session id for a valid token', () => {
    const token = issueWsToken(sessionId);
    expect(validateWsToken(token, sessionId)).toBe(sessionId);
  });

  it('throws WsAuthError on missing token', () => {
    expect(() => validateWsToken('', sessionId)).toThrow(WsAuthError);
    expect(() => validateWsToken('', sessionId)).toThrow('missing token');
  });

  it('throws WsAuthError on invalid token', () => {
    const fake = 'not-a-real-token' as WsToken;
    expect(() => validateWsToken(fake, sessionId)).toThrow(WsAuthError);
    expect(() => validateWsToken(fake, sessionId)).toThrow('invalid token');
  });

  it('throws WsAuthError when token does not match session id', () => {
    const token = issueWsToken(sessionId);
    const otherSession = newSessionId();
    expect(() => validateWsToken(token, otherSession)).toThrow(WsAuthError);
    expect(() => validateWsToken(token, otherSession)).toThrow(
      'token does not match session',
    );
  });

  it('throws WsAuthError on expired token', () => {
    vi.useFakeTimers();
    try {
      const token = issueWsToken(sessionId);
      // Advance time past 24h TTL
      vi.advanceTimersByTime(25 * 60 * 60 * 1000);
      expect(() => validateWsToken(token, sessionId)).toThrow(WsAuthError);
      expect(() => validateWsToken(token, sessionId)).toThrow('token expired');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('revokeWsToken', () => {
  it('makes a previously valid token invalid', () => {
    const sessionId = newSessionId();
    const token = issueWsToken(sessionId);
    expect(validateWsToken(token, sessionId)).toBe(sessionId);
    revokeWsToken(token);
    expect(() => validateWsToken(token, sessionId)).toThrow('invalid token');
  });
});

describe('WS_CLOSE_UNAUTHORIZED', () => {
  it('is 4401 (HTTP 401 equivalent in app range 4000-4999)', () => {
    expect(WS_CLOSE_UNAUTHORIZED).toBe(4401);
  });
});
