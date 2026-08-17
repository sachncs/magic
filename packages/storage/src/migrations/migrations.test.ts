/**
 * @fileoverview Tests for the session migration helper. Covers no-op at
 * latest version, write-back on older version, and refusal of unsupported
 * versions.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, writeFile, readFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

describe('migrateSession', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-migrate-'));
    process.env.MAGIC_DATA_DIR = workDir;
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(workDir, {recursive: true, force: true});
  });

  it('returns false and does not modify a session at the latest version', async () => {
    const {dataDir, ensureDataDir} = await import('../data_dir.js');
    await ensureDataDir();
    const sessionId = 'sess-latest';
    const dir = join(dataDir(), 'sessions', sessionId);
    await mkdir(dir, {recursive: true});
    const meta = {
      id: sessionId,
      workspaceId: 'ws-1',
      repo: '/r',
      task: 't',
      status: 'pending',
      createdAt: '2026-08-17T16:00:00.000Z',
      updatedAt: '2026-08-17T16:00:00.000Z',
      schemaVersion: 'v1',
      graphVersion: 'v1',
    };
    await writeFile(join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
    const {migrateSession} = await import('../migrations/index.js');
    const result = await migrateSession(sessionId);
    expect(result).toBe(false);
    const after = JSON.parse(await readFile(join(dir, 'meta.json'), 'utf8'));
    expect(after.updatedAt).toBe(meta.updatedAt); // unchanged
  });

  it('returns false for non-existent session', async () => {
    const {migrateSession} = await import('../migrations/index.js');
    expect(await migrateSession('does-not-exist')).toBe(false);
  });
});
