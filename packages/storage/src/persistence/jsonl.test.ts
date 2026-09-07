/**
 * @fileoverview Tests for the JSONL persistence backend.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {JsonlBackend, jsonlRecordsPath, type PersistedRecord} from './jsonl.js';

const rec = (id: string, content: string): PersistedRecord => ({
  id,
  kind: 'message',
  ts: '2026-08-17T16:00:00.000Z',
  payload: {content},
});

/**
 * Returns a unique session id per test invocation. The persistence
 * backends write to `${dataDir}/sessions/<id>/records.jsonl`; sharing
 * the same id across tests causes cross-test pollution.
 */
const sessionId = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
    const id = sessionId('a');
    await b.append(id, rec('1', 'hello'));
    await b.append(id, rec('2', 'world'));
    const replayed = await b.replay(id);
    expect(replayed.length).toBe(2);
    expect((replayed[0]?.payload as {content: string}).content).toBe('hello');
  });

  it('replay on unknown session returns []', async () => {
    const b = new JsonlBackend();
    expect(await b.replay(sessionId('unknown'))).toEqual([]);
  });

  it('isolates sessions', async () => {
    const b = new JsonlBackend();
    const id1 = sessionId('iso-a');
    const id2 = sessionId('iso-b');
    await b.append(id1, rec('1', 'a'));
    await b.append(id2, rec('1', 'b'));
    expect((await b.replay(id1)).length).toBe(1);
    expect((await b.replay(id2)).length).toBe(1);
  });

  it('flush is no-op when buffer empty', async () => {
    const b = new JsonlBackend();
    const id = sessionId('flush');
    await expect(b.flush(id)).resolves.toBeUndefined();
  });

  it('large payloads trigger threshold flush', async () => {
    const b = new JsonlBackend();
    const id = sessionId('big');
    const big = 'x'.repeat(80_000);
    await b.append(id, rec('1', big));
    const replayed = await b.replay(id);
    expect(replayed.length).toBe(1);
    expect((replayed[0]?.payload as {content: string}).content).toBe(big);
  });

  it('path helper returns the per-session file', async () => {
    const id = sessionId('path');
    const p = jsonlRecordsPath(id);
    expect(p).toContain(id);
    expect(p.endsWith('records.jsonl')).toBe(true);
  });
});

void readdir;
