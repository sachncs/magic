/**
 * @fileoverview Tests for the JSONL persistence backend.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JsonlBackend, type PersistedRecord} from './jsonl.js';

const rec = (id: string, content: string): PersistedRecord => ({
  id,
  kind: 'message',
  ts: '2026-08-17T16:00:00.000Z',
  payload: {content},
});

describe('JsonlBackend', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-jsonl-'));
    process.env.MAGIC_DATA_DIR = workDir;
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(workDir, {recursive: true, force: true});
  });

  it('appends and replays', async () => {
    const b = new JsonlBackend();
    await b.append('s1', rec('1', 'hello'));
    await b.append('s1', rec('2', 'world'));
    const replayed = await b.replay('s1');
    expect(replayed.length).toBe(2);
    expect((replayed[0]?.payload as {content: string}).content).toBe('hello');
  });

  it('replay on unknown session returns []', async () => {
    const b = new JsonlBackend();
    expect(await b.replay('does-not-exist')).toEqual([]);
  });

  it('isolates sessions', async () => {
    const b = new JsonlBackend();
    await b.append('s1', rec('1', 'a'));
    await b.append('s2', rec('1', 'b'));
    expect((await b.replay('s1')).length).toBe(1);
    expect((await b.replay('s2')).length).toBe(1);
  });

  it('flush is no-op when buffer empty', async () => {
    const b = new JsonlBackend();
    await expect(b.flush('s1')).resolves.toBeUndefined();
  });

  it('large payloads trigger threshold flush', async () => {
    const b = new JsonlBackend();
    const big = 'x'.repeat(80_000);
    await b.append('s1', rec('1', big));
    const replayed = await b.replay('s1');
    expect(replayed.length).toBe(1);
    expect((replayed[0]?.payload as {content: string}).content).toBe(big);
  });
});
