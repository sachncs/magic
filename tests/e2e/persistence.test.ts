/**
 * @fileoverview Tests that the storage layer round-trips with both
 * persistence backends.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createStorage} from '@magic/storage';

describe('e2e: persistence round-trip', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-persist-'));
    process.env['MAGIC_DATA_DIR'] = workDir;
  });

  afterEach(async () => {
    delete process.env['MAGIC_DATA_DIR'];
    await rm(workDir, {recursive: true, force: true});
  });

  it('JSONL: append + replay', async () => {
    const s = createStorage({persistence: 'jsonl'});
    await s.backend.append('s1', {id: 'r1', kind: 'message', ts: 't1', payload: {x: 1}});
    await s.backend.append('s1', {id: 'r2', kind: 'message', ts: 't2', payload: {x: 2}});
    const replayed = await s.backend.replay('s1');
    expect(replayed.length).toBe(2);
    s.sqlite?.close();
  });

  it('SQLite: append + replay', async () => {
    const s = createStorage({persistence: 'sqlite'});
    await s.backend.append('s1', {id: 'r1', kind: 'message', ts: 't1', payload: {x: 1}});
    await s.backend.append('s1', {id: 'r2', kind: 'message', ts: 't2', payload: {x: 2}});
    const replayed = await s.backend.replay('s1');
    expect(replayed.length).toBe(2);
    s.sqlite?.close();
  });

  it('SQLite FTS5 search returns hits', async () => {
    const s = createStorage({persistence: 'sqlite'});
    await s.backend.append('s1', {id: 'r1', kind: 'message', ts: 't', payload: {content: 'authentication is broken'}});
    await s.backend.append('s1', {id: 'r2', kind: 'message', ts: 't', payload: {content: 'database is fine'}});
    const hits = s.sqlite?.search('authentication', 10) ?? [];
    expect(hits.length).toBeGreaterThan(0);
    s.sqlite?.close();
  });
});
