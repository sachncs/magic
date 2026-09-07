/**
 * @fileoverview Tests for the SQLite backend. Covers append, replay,
 * FTS5 search, and round-trip.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SqliteBackend} from './sqlite.js';

const sessionId = (label: string): string =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('SqliteBackend', () => {
  let workDir: string;
  let backend: SqliteBackend;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'magic-sqlite-'));
    process.env.MAGIC_DATA_DIR = workDir;
    backend = new SqliteBackend(`${workDir}/test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sqlite`);
  });

  afterEach(() => {
    backend.close();
    delete process.env.MAGIC_DATA_DIR;
    rmSync(workDir, {recursive: true, force: true});
  });

  it('appends and replays a single record', async () => {
    const id = sessionId('one');
    await backend.append(id, {
      id: 'r1',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'hello'},
    });
    const replayed = await backend.replay(id);
    expect(replayed.length).toBe(1);
    expect(replayed[0]?.id).toBe('r1');
  });

  it('isolates sessions', async () => {
    const id1 = sessionId('iso-a');
    const id2 = sessionId('iso-b');
    await backend.append(id1, {
      id: 'r1',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'a'},
    });
    await backend.append(id2, {
      id: 'r1',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'b'},
    });
    expect((await backend.replay(id1)).length).toBe(1);
    expect((await backend.replay(id2)).length).toBe(1);
  });

  it('orders by ts then id', async () => {
    const id = sessionId('order');
    await backend.append(id, {
      id: 'a',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'first'},
    });
    await backend.append(id, {
      id: 'b',
      kind: 'message',
      ts: '2026-08-17T16:00:01.000Z',
      payload: {content: 'second'},
    });
    const replayed = await backend.replay(id);
    expect(replayed[0]?.id).toBe('a');
    expect(replayed[1]?.id).toBe('b');
  });

  it('FTS5 search returns ranked results', async () => {
    const id = sessionId('search');
    await backend.append(id, {
      id: 'r1',
      kind: 'message',
      ts: '2026-08-17T16:00:00.000Z',
      payload: {content: 'authentication is broken in the login flow'},
    });
    await backend.append(id, {
      id: 'r2',
      kind: 'message',
      ts: '2026-08-17T16:00:01.000Z',
      payload: {content: 'the database connection pool is misconfigured'},
    });
    const hits = backend.search('authentication', 10);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.sessionId).toBe(id);
    expect(hits[0]?.recordId).toBe('r1');
  });

  it('FTS5 search returns empty for no matches', () => {
    const hits = backend.search('nonexistenttermxyz123', 10);
    expect(hits).toEqual([]);
  });
});
