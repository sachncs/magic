/**
 * @fileoverview Permission preset enforcement. Confirms the bash tool
 * refuses destructive commands under all presets.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {bashTool, isCommandSafe} from '@magic/tools';
import {setPreset, getCurrentPolicy} from '@magic/agent-graph/sandbox_policy';

describe('e2e: permission presets', () => {
  let work: string;

  beforeEach(async () => {
    work = await mkdtemp(join(tmpdir(), 'magic-perm-'));
    process.env['MAGIC_DATA_DIR'] = work;
  });

  afterEach(async () => {
    delete process.env['MAGIC_DATA_DIR'];
    await rm(work, {recursive: true, force: true});
  });

  it('isCommandSafe refuses rm -rf /', () => {
    expect(isCommandSafe('rm -rf /')).toBe(false);
  });

  it('setPreset(read-only) updates the singleton', () => {
    setPreset('read-only');
    expect(getCurrentPolicy().sandboxMode).toBe('read-only');
  });

  it('setPreset(workspace-write) allows writes inside repo', () => {
    setPreset('workspace-write');
    expect(getCurrentPolicy().sandboxMode).toBe('workspace-write');
    expect(getCurrentPolicy().writableRoots?.length).toBe(1);
  });

  it('setPreset(danger-full-access) removes write restrictions', () => {
    setPreset('danger-full-access');
    expect(getCurrentPolicy().sandboxMode).toBe('full');
    expect(getCurrentPolicy().writableRoots).toBeUndefined();
  });

  it('bash tool refuses destructive commands', async () => {
    const r = await bashTool.callback({repoPath: work, command: 'rm -rf /'});
    expect(r.status).toBe('error');
    expect((r.content[0] as {text: string}).text).toContain('denylist');
  });
});
