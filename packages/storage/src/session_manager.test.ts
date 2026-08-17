/**
 * @fileoverview Tests for the JSONL session manager. Covers append, replay,
 * buffering, and compaction.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {newSessionId, type SessionId} from '@magic/shared/branded';
import {
  createSessionManager,
  compactSessionLog,
  type SessionMessage,
} from './session_manager.js';

function msg(content: string, role: SessionMessage['role'] = 'user'): SessionMessage {
  return {
    id: `m-${Math.random()}`,
    role,
    content,
    ts: new Date().toISOString(),
  };
}

describe('JsonlSessionManager', () => {
  let workDir: string;
  let id: SessionId;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-session-'));
    process.env.MAGIC_DATA_DIR = workDir;
    id = newSessionId();
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(workDir, {recursive: true, force: true});
  });

  it('appends and replays a single message', async () => {
    const m = createSessionManager(id);
    await m.append(msg('hello'));
    const replayed = await m.replay();
    expect(replayed.length).toBe(1);
    expect(replayed[0]?.content).toBe('hello');
  });

  it('preserves message order across many appends', async () => {
    const m = createSessionManager(id);
    for (let i = 0; i < 50; i++) {
      await m.append(msg(`m-${i}`));
    }
    await m.flush();
    const replayed = await m.replay();
    expect(replayed.length).toBe(50);
    expect(replayed[0]?.content).toBe('m-0');
    expect(replayed[49]?.content).toBe('m-49');
  });

  it('flushes on threshold (large payload)', async () => {
    const m = createSessionManager(id);
    const big = 'x'.repeat(80_000);
    await m.append(msg(big));
    // After append, threshold should have triggered an automatic flush.
    const replayed = await m.replay();
    expect(replayed.length).toBe(1);
    expect(replayed[0]?.content).toBe(big);
  });

  it('replay on empty session returns []', async () => {
    const m = createSessionManager(id);
    expect(await m.replay()).toEqual([]);
  });

  it('compactSessionLog rewrites the file', async () => {
    const m = createSessionManager(id);
    await m.append(msg('a'));
    await m.append(msg('b'));
    const replayed = await m.replay();
    expect(replayed.length).toBe(2);
    await compactSessionLog(id, [msg('x')]);
    const after = await m.replay();
    expect(after.length).toBe(1);
    expect(after[0]?.content).toBe('x');
  });

  it('skips malformed lines on replay', async () => {
    const {dataDir} = await import('./data_dir.js');
    const path = `${dataDir()}/sessions/${id}/messages.jsonl`;
    const {mkdir, writeFile} = await import('node:fs/promises');
    const {dirname} = await import('node:path');
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, `${JSON.stringify(msg('good'))}\n{garbage}\n${JSON.stringify(msg('also-good'))}\n`, 'utf8');
    const m = createSessionManager(id);
    const replayed = await m.replay();
    expect(replayed.length).toBe(2);
    expect(replayed[0]?.content).toBe('good');
    expect(replayed[1]?.content).toBe('also-good');
  });
});
