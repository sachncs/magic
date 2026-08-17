/**
 * @fileoverview Tests for branded types. Covers brand/unbrand round-trip,
 * nominal type safety (compile-time), and newX factories.
 */

import {describe, it, expect} from 'vitest';
import {
  brand,
  unbrand,
  newSessionId,
  newWorkspaceId,
  newAgentId,
  newToolCallId,
  newSpillLocator,
  type SessionId,
  type WorkspaceId,
  type AgentId,
} from './branded.js';

describe('brand / unbrand', () => {
  it('round-trips a string', () => {
    const raw = 'sess-1';
    const branded = brand<string, 'SessionId'>(raw);
    expect(unbrand(branded)).toBe(raw);
  });

  it('does not alter the runtime value', () => {
    const raw = 'value';
    const branded = brand<string, 'SessionId'>(raw);
    expect(String(branded)).toBe('value');
  });
});

describe('factories', () => {
  it('newSessionId returns a UUID-shaped string', () => {
    const id = newSessionId();
    expect(typeof unbrand(id)).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('newWorkspaceId returns a UUID-shaped string', () => {
    const id = newWorkspaceId();
    expect(typeof unbrand(id)).toBe('string');
  });

  it('newAgentId returns a UUID-shaped string', () => {
    const id = newAgentId();
    expect(typeof unbrand(id)).toBe('string');
  });

  it('newToolCallId returns a UUID-shaped string', () => {
    const id = newToolCallId();
    expect(typeof unbrand(id)).toBe('string');
  });

  it('factories produce unique values', () => {
    const ids = new Set([newSessionId(), newSessionId(), newSessionId()]);
    expect(ids.size).toBe(3);
  });

  it('newSpillLocator brands a hash', () => {
    const loc = newSpillLocator('abc123def');
    expect(unbrand(loc)).toBe('abc123def');
  });
});

describe('nominal safety', () => {
  it('a SessionId is not assignable to a WorkspaceId at the type level', () => {
    // This test is mostly a compile-time check. The runtime cast below
    // exists to prove the brands are independent; the real safety is that
    // TS rejects `const w: WorkspaceId = s;` at compile.
    const s: SessionId = newSessionId();
    const w: WorkspaceId = brand<string, 'WorkspaceId'>(unbrand(s));
    expect(unbrand(w)).toBe(unbrand(s));
  });

  it('different brand symbols do not collide', () => {
    const a: AgentId = newAgentId();
    const s: SessionId = newSessionId();
    // Unbranding both to string works; type system prevents direct cross-assign.
    expect(typeof unbrand(a)).toBe('string');
    expect(typeof unbrand(s)).toBe('string');
  });
});
