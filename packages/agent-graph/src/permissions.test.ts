/**
 * @fileoverview Tests for permission presets, sandbox policy, and
 * slash commands.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {PERMISSION_PRESETS, resolvePreset, currentPreset} from './permissions.js';
import {setPreset, getCurrentPolicy} from './sandbox_policy.js';
import {parseCommand, isCommand, COMMANDS} from './commands.js';

describe('permissions', () => {
  it('PERMISSION_PRESETS has 3 entries', () => {
    expect(PERMISSION_PRESETS.length).toBe(3);
  });

  it('read-only preset disallows writes', () => {
    const p = resolvePreset('read-only', '/repo');
    expect(p.sandboxMode).toBe('read-only');
    expect(p.writableRoots).toEqual([]);
  });

  it('workspace-write preset allows writes inside repo', () => {
    const p = resolvePreset('workspace-write', '/repo');
    expect(p.sandboxMode).toBe('workspace-write');
    expect(p.writableRoots).toEqual(['/repo']);
  });

  it('danger-full-access preset allows everything', () => {
    const p = resolvePreset('danger-full-access', '/repo');
    expect(p.sandboxMode).toBe('full');
    expect(p.writableRoots).toBeUndefined();
    expect(p.approvalPolicy).toBe('never');
  });

  it('currentPreset defaults to workspace-write', () => {
    delete process.env.MAGIC_PERMISSION_PRESET;
    expect(currentPreset()).toBe('workspace-write');
  });
});

describe('sandbox_policy', () => {
  const original = process.env.MAGIC_PERMISSION_PRESET;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MAGIC_PERMISSION_PRESET;
    } else {
      process.env.MAGIC_PERMISSION_PRESET = original;
    }
  });

  it('setPreset updates the singleton', () => {
    setPreset('read-only');
    expect(getCurrentPolicy().sandboxMode).toBe('read-only');
    setPreset('danger-full-access');
    expect(getCurrentPolicy().sandboxMode).toBe('full');
  });
});

describe('commands', () => {
  it('isCommand recognises each command', () => {
    for (const c of COMMANDS) {
      expect(isCommand(c)).toBe(true);
      expect(isCommand(`  ${c}  some text`)).toBe(true);
    }
    expect(isCommand('hello world')).toBe(false);
  });

  it('parses /plan with spec', () => {
    expect(parseCommand('/plan add a /health endpoint')).toEqual({
      kind: 'plan',
      spec: 'add a /health endpoint',
    });
  });

  it('parses /commit with message', () => {
    expect(parseCommand('/commit fix: typo')).toEqual({
      kind: 'commit',
      message: 'fix: typo',
    });
  });

  it('parses /restore with session id', () => {
    expect(parseCommand('/restore sess-1')).toEqual({
      kind: 'restore',
      sessionId: 'sess-1',
    });
  });

  it('parses /cancel with and without reason', () => {
    expect(parseCommand('/cancel')).toEqual({kind: 'cancel', reason: undefined});
    expect(parseCommand('/cancel too slow')).toEqual({kind: 'cancel', reason: 'too slow'});
  });

  it('parses /search with query', () => {
    expect(parseCommand('/search auth')).toEqual({kind: 'search', query: 'auth'});
  });

  it('returns null for non-command input', () => {
    expect(parseCommand('hello world')).toBeNull();
  });
});
