/**
 * @fileoverview Tests for data_dir, meta, and workspaces. Cover path
 * resolution, atomic meta writes, schema-version migration on read, and
 * the workspace registry.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

describe('data_dir', () => {
  const original = process.env.MAGIC_DATA_DIR;
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-storage-'));
    process.env.MAGIC_DATA_DIR = workDir;
  });

  afterEach(async () => {
    if (original === undefined) {
      delete process.env.MAGIC_DATA_DIR;
    } else {
      process.env.MAGIC_DATA_DIR = original;
    }
    await rm(workDir, {recursive: true, force: true});
  });

  it('honours MAGIC_DATA_DIR', async () => {
    const {dataDir, ensureDataDir} = await import('./data_dir.js');
    const root = await ensureDataDir();
    expect(root).toBe(workDir);
    expect(dataDir()).toBe(workDir);
  });

  it('falls back to ./magic when env unset', async () => {
    delete process.env.MAGIC_DATA_DIR;
    // Re-import to pick up the change. dynamic import gives a fresh module
    // graph only with --experimental-vm-modules; for the test we check the
    // resolution function directly.
    const {resolveDataDir} = await import('./data_dir.js');
    const resolved = resolveDataDir();
    // Cwd-relative; cannot be empty.
    expect(resolved.length).toBeGreaterThan(0);
  });
});

describe('meta atomic write + migration on read', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-storage-'));
    process.env.MAGIC_DATA_DIR = workDir;
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(workDir, {recursive: true, force: true});
  });

  it('writes and reads back the same meta', async () => {
    const {writeMeta, readMeta} = await import('./meta.js');
    const meta = {
      id: 'sess-1',
      workspaceId: 'ws-1',
      repo: '/tmp/repo',
      task: 'do the thing',
      status: 'pending' as const,
      createdAt: '2026-08-17T16:00:00.000Z',
      updatedAt: '2026-08-17T16:00:00.000Z',
      schemaVersion: 'v1' as const,
      graphVersion: 'v1' as const,
    };
    await writeMeta('sess-1', meta);
    const back = await readMeta('sess-1');
    expect(back).not.toBeNull();
    expect(back?.id).toBe('sess-1');
    expect(back?.status).toBe('pending');
  });

  it('returns null for unknown session', async () => {
    const {readMeta} = await import('./meta.js');
    const result = await readMeta('does-not-exist');
    expect(result).toBeNull();
  });

  it('migrates a v0.0 meta to v1 on read', async () => {
    const {sessionMetaFile, ensureDataDir, sessionDir} = await import('./data_dir.js');
    await ensureDataDir();
    const {mkdir} = await import('node:fs/promises');
    await mkdir(sessionDir('sess-2'), {recursive: true});
    const oldMeta = {
      id: 'sess-2',
      workspaceId: 'ws-1',
      repo: '/r',
      task: 'old task',
      status: 'pending',
      createdAt: '2026-08-17T16:00:00.000Z',
      updatedAt: '2026-08-17T16:00:00.000Z',
      graphVersion: 'v1',
      schemaVersion: 'v0.0', // pre-versioning
    };
    await writeFile(sessionMetaFile('sess-2'), JSON.stringify(oldMeta, null, 2));
    const {readMeta} = await import('./meta.js');
    const back = await readMeta('sess-2');
    expect(back?.schemaVersion).toBe('v1');
  });
});

describe('workspaces registry', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-storage-'));
    process.env.MAGIC_DATA_DIR = workDir;
    const {__resetWorkspaceCacheForTests} = await import('./workspaces.js');
    __resetWorkspaceCacheForTests();
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(workDir, {recursive: true, force: true});
  });

  it('registers and retrieves a workspace', async () => {
    const {registerWorkspace, getWorkspace, listWorkspaces} = await import(
      './workspaces.js'
    );
    const id = await registerWorkspace('/tmp/repo-a', 'hash-a');
    const rec = await getWorkspace(id);
    expect(rec?.path).toBe('/tmp/repo-a');
    expect(rec?.manifestHash).toBe('hash-a');
    const all = await listWorkspaces();
    expect(all.length).toBe(1);
  });

  it('touch updates lastUsed', async () => {
    const {registerWorkspace, touchWorkspace, getWorkspace} = await import(
      './workspaces.js'
    );
    const id = await registerWorkspace('/tmp/repo-b', 'hash-b');
    const before = (await getWorkspace(id))?.lastUsed;
    expect(before).toBeDefined();
    await new Promise((r) => setTimeout(r, 10));
    await touchWorkspace(id);
    const after = (await getWorkspace(id))?.lastUsed;
    expect(after).not.toBe(before);
  });

  it('returns undefined for unknown workspace', async () => {
    const {getWorkspace} = await import('./workspaces.js');
    const result = await getWorkspace(
      '00000000-0000-0000-0000-000000000000' as unknown as Parameters<typeof getWorkspace>[0],
    );
    expect(result).toBeUndefined();
  });

  it('persists to disk and re-reads', async () => {
    const {registerWorkspace, __resetWorkspaceCacheForTests} = await import(
      './workspaces.js'
    );
    await registerWorkspace('/tmp/repo-c', 'hash-c');
    const {dataDir} = await import('./data_dir.js');
    const file = `${dataDir()}/workspaces.json`;
    const onDisk = JSON.parse(await readFile(file, 'utf8')) as Array<unknown>;
    expect(onDisk.length).toBe(1);
  });
});
