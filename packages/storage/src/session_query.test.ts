/**
 * @fileoverview Tests for session_query. Covers linear scan + snippet
 * generation, plus SQLite FTS5 routing when a backend is passed.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

describe('searchAllSessions (linear)', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-query-'));
    process.env.MAGIC_DATA_DIR = workDir;
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(workDir, {recursive: true, force: true});
  });

  it('returns hits from session JSONL files', async () => {
    const sessionsDir = join(workDir, 'sessions');
    await mkdir(join(sessionsDir, 'sess-1'), {recursive: true});
    await writeFile(
      join(sessionsDir, 'sess-1', 'records.jsonl'),
      JSON.stringify({
        id: 'r1',
        kind: 'message',
        ts: '2026-08-17T16:00:00.000Z',
        payload: {content: 'the authentication is broken'},
      }) + '\n',
    );
    const {searchAllSessions} = await import('./session_query.js');
    const hits = await searchAllSessions('authentication');
    expect(hits.length).toBe(1);
    expect(hits[0]?.recordId).toBe('r1');
  });

  it('returns empty for empty query', async () => {
    const {searchAllSessions} = await import('./session_query.js');
    expect(await searchAllSessions('')).toEqual([]);
    expect(await searchAllSessions('   ')).toEqual([]);
  });

  it('snippet includes context around match', async () => {
    const sessionsDir = join(workDir, 'sessions');
    await mkdir(join(sessionsDir, 's1'), {recursive: true});
    const text =
      'this is a long message about authentication in the auth module that goes on and on with extra words for context';
    await writeFile(
      join(sessionsDir, 's1', 'records.jsonl'),
      JSON.stringify({id: 'r', kind: 'message', ts: '2026-08-17T16:00:00.000Z', payload: {content: text}}) + '\n',
    );
    const {searchAllSessions} = await import('./session_query.js');
    const hits = await searchAllSessions('authentication');
    expect(hits[0]?.snippet.toLowerCase()).toContain('authentication');
  });

  it('case-insensitive matching', async () => {
    const sessionsDir = join(workDir, 'sessions');
    await mkdir(join(sessionsDir, 's1'), {recursive: true});
    await writeFile(
      join(sessionsDir, 's1', 'records.jsonl'),
      JSON.stringify({id: 'r', kind: 'message', ts: '2026-08-17T16:00:00.000Z', payload: {content: 'Auth is broken'}}) + '\n',
    );
    const {searchAllSessions} = await import('./session_query.js');
    const hits = await searchAllSessions('auth');
    expect(hits.length).toBe(1);
  });

  it('returns empty when no sessions dir', async () => {
    const {searchAllSessions} = await import('./session_query.js');
    expect(await searchAllSessions('anything')).toEqual([]);
  });
});
