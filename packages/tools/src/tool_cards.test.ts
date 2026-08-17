/**
 * @fileoverview Tests for the tool-cards render-intent union. The
 * critical contract: same args + same result MUST always produce the
 * same view (replay-safety).
 */

import {describe, it, expect} from 'vitest';
import {presentTerminal, presentSearch, presentGeneric} from './tool_cards.js';
import {ok, type ToolResult} from './tool.js';

describe('tool_cards (replay-safety)', () => {
  it('presentGeneric is deterministic', () => {
    const args = {a: 1, b: 2};
    const v1 = presentGeneric<{a: number; b: number}>(args, ok('r'));
    const v2 = presentGeneric<{a: number; b: number}>(args, ok('r'));
    expect(v1).toEqual(v2);
  });

  it('presentTerminal is deterministic', () => {
    const r: ToolResult = ok(JSON.stringify({stdout: 'hi', stderr: ''}));
    const v1 = presentTerminal('echo hi', r, 0, 12);
    const v2 = presentTerminal('echo hi', r, 0, 12);
    expect(v1).toEqual(v2);
  });

  it('presentTerminal includes command in preview', () => {
    const r: ToolResult = ok(JSON.stringify({stdout: 'out', stderr: ''}));
    const v = presentTerminal('ls -la', r, 0, 5);
    expect(v.preview).toBe('ls -la');
    expect(v.terminal?.command).toBe('ls -la');
    expect(v.terminal?.exitCode).toBe(0);
    expect(v.terminal?.durationMs).toBe(5);
  });

  it('presentSearch shows match count in preview', () => {
    const v = presentSearch('auth', 3, [
      {file: 'src/auth.ts', line: 12, snippet: '...auth...'},
    ]);
    expect(v.preview).toContain('3');
    expect(v.search?.matchCount).toBe(3);
  });
});
