/**
 * @fileoverview WS auth tests. Reject without token, accept with
 * valid token, reject mismatched session, reject expired.
 */

import {describe, it, expect} from 'vitest';
import {
  issueWsToken,
  validateWsToken,
  WsAuthError,
  WS_CLOSE_UNAUTHORIZED,
  revokeWsToken,
  type WsToken,
} from '@magic/web-shared/ws_auth';
import {newSessionId} from '@magic/shared/branded';

describe('e2e: WS auth', () => {
  it('rejects missing token', () => {
    const id = newSessionId();
    expect(() => validateWsToken('', id)).toThrow(WsAuthError);
  });

  it('rejects unknown token', () => {
    const id = newSessionId();
    expect(() => validateWsToken('not-real' as WsToken, id)).toThrow('invalid');
  });

  it('accepts valid token for matching session', () => {
    const id = newSessionId();
    const t = issueWsToken(id);
    expect(validateWsToken(t, id)).toBe(id);
  });

  it('rejects mismatched session', () => {
    const idA = newSessionId();
    const idB = newSessionId();
    const t = issueWsToken(idA);
    expect(() => validateWsToken(t, idB)).toThrow(/mismatch/);
  });

  it('rejects after revoke', () => {
    const id = newSessionId();
    const t = issueWsToken(id);
    expect(validateWsToken(t, id)).toBe(id);
    revokeWsToken(t);
    expect(() => validateWsToken(t, id)).toThrow('invalid');
  });

  it('close code is 4401', () => {
    expect(WS_CLOSE_UNAUTHORIZED).toBe(4401);
  });
});
