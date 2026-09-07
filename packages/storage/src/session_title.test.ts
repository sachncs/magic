/**
 * @fileoverview Tests for session title generation. Covers model success,
 * model failure (fallback), and the truncation guard.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {newSessionId, brand, type SessionId} from '@magic/shared/branded';

describe('session_title', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-title-'));
    process.env.MAGIC_DATA_DIR = workDir;
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(workDir, {recursive: true, force: true});
  });

  it('uses the model title on success', async () => {
    const {writeMeta} = await import('./meta.js');
    const {generateAndPersistTitle} = await import('./session_title.js');
    const id = newSessionId();
    await writeMeta(id, {
      id: brand<string, 'SessionId'>(id),
      workspaceId: 'ws',
      repo: '/r',
      task: 'add /health',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
      graphVersion: 'v1',
    });

    const title = await generateAndPersistTitle(
      id,
      'add a /health endpoint to the API',
      {generateTitle: async () => 'Add /health endpoint'},
    );
    expect(title).toBe('Add /health endpoint');
  });

  it('falls back to first 60 chars on model error', async () => {
    const {writeMeta, readMeta} = await import('./meta.js');
    const {generateAndPersistTitle} = await import('./session_title.js');
    const id = newSessionId();
    await writeMeta(id, {
      id: brand<string, 'SessionId'>(id),
      workspaceId: 'ws',
      repo: '/r',
      task: 'short',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
      graphVersion: 'v1',
    });
    const longTask =
      'this is a really long task prompt that exceeds sixty characters in length and should be truncated';
    const title = await generateAndPersistTitle(id, longTask, {
      generateTitle: async () => {
        throw new Error('model down');
      },
    });
    expect(title.length).toBeLessThanOrEqual(61); // 60 + ellipsis
    expect(title.endsWith('…')).toBe(true);
  });

  it('truncates a runaway model output', async () => {
    const {writeMeta} = await import('./meta.js');
    const {generateAndPersistTitle} = await import('./session_title.js');
    const id = newSessionId();
    await writeMeta(id, {
      id: brand<string, 'SessionId'>(id),
      workspaceId: 'ws',
      repo: '/r',
      task: 'task',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
      graphVersion: 'v1',
    });
    const huge = 'x'.repeat(500);
    const title = await generateAndPersistTitle(id, 'task', {
      generateTitle: async () => huge,
    });
    expect(title.length).toBeLessThanOrEqual(80);
  });
});
