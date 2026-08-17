/**
 * @fileoverview Tests for the SQLite backend. Covers append, replay,
 * FTS5 search, and round-trip.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SqliteBackend} from './sqlite.js';

describe('SqliteBackend', () => {
  let workDir: string;
  let backend: SqliteBackend;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'magic-sqlite-'));
    process.env.MAGIC_DATA_DIR = workDir;
    backend = new SqliteBackend(`${workDir}/test.sqlite`);
  });

  afterEach(() => {
    backend.close();
    delete process.env.MAGIC_DATA_DIR;
    rmSync(workDir, {recursive: true, force: true});
  });

  it('appends and replays a single record', async () => {
    await backend.append('s1', {
      id: 'r1',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'hello'},
    });
    const replayed = await backend.replay('s1');
    expect(replayed.length).toBe(1);
    expect(replayed[0]?.id).toBe('r1');
  });

  it('isolates sessions', async () => {
    await backend.append('s1', {
      id: 'r1',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'a'},
    });
    await backend.append('s2', {
      id: 'r1',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'b'},
    });
    expect((await backend.replay('s1')).length).toBe(1);
    expect((await backend.replay('s2')).length).toBe(1);
  });

  it('orders by ts then id', async () => {
    await backend.append('s1', {
      id: 'a',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'first'},
    });
    await backend.append('s1', {
      id: 'b',
      kind: 'message',
      ts: '2026-08-17T16:00:01.000Z',
      payload: {content: 'second'},
    });
    const replayed = await backend.replay('s1');
    expect(replayed[0]?.id).toBe('a');
    expect(replayed[1]?.id).toBe('b');
  });

  it('FTS5 search returns ranked results', async () => {
    await backend.append('s1', {
      id: 'r1',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'authentication is broken in the login flow'},
    });
    await backend.append('s1', {
      id: 'r2',
      kind: 'message',
      ts: '2026-08-17T16:00:01.000Z',
      payload: {content: 'the database connection pool is misconfigured'},
    });
    const hits = backend.search('authentication', 10);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.sessionId).toBe('s1');
    expect(hits[0]?.recordId).toBe('r1');
  });

  it('FTS5 search returns empty for no matches', () => {
    const hits = backend.search('nonexistent-term-xyz', 10);
    expect(hits).toEqual([]);
  });
});
