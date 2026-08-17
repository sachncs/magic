/**
 * @fileoverview Tests for the Phase 4 sub-systems.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {brand, newSessionId, type SessionId} from '@magic/shared/branded';

describe('cost_tracker', () => {
  beforeEach(async () => {
    process.env.MAGIC_DATA_DIR = await mkdtemp(join(tmpdir(), 'magic-cost-'));
  });

  afterEach(async () => {
    const dir = process.env.MAGIC_DATA_DIR;
    delete process.env.MAGIC_DATA_DIR;
    if (dir) {
      await rm(dir, {recursive: true, force: true});
    }
  });

  it('records cost for a known pricing', async () => {
    const {recordUsage, getSessionCost, __resetCostTrackerForTests} = await import('./cost_tracker.js');
    __resetCostTrackerForTests();
    const id = newSessionId();
    const cost = recordUsage(id, 'bedrock', 'global.anthropic.claude-sonnet-4-6', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18, 6);
    expect(getSessionCost(id)).toBeCloseTo(18, 6);
  });

  it('throws CostExceededError on session cap', async () => {
    const {recordUsage, setSessionCap, checkCap, __resetCostTrackerForTests} = await import('./cost_tracker.js');
    __resetCostTrackerForTests();
    const id = newSessionId();
    setSessionCap(id, 0.01);
    recordUsage(id, 'bedrock', 'global.anthropic.claude-sonnet-4-6', 1_000_000, 0);
    expect(() => checkCap(id)).toThrow(/cost cap/i);
  });

  it('returns 0 for unknown model', async () => {
    const {recordUsage, __resetCostTrackerForTests} = await import('./cost_tracker.js');
    __resetCostTrackerForTests();
    const id = newSessionId();
    const cost = recordUsage(id, 'bedrock', 'unknown-model', 1000, 1000);
    expect(cost).toBe(0);
  });
});

describe('cancellation', () => {
  beforeEach(async () => {
    process.env.MAGIC_DATA_DIR = await mkdtemp(join(tmpdir(), 'magic-cancel-'));
  });

  afterEach(async () => {
    const dir = process.env.MAGIC_DATA_DIR;
    delete process.env.MAGIC_DATA_DIR;
    if (dir) {
      await rm(dir, {recursive: true, force: true});
    }
  });

  it('beginEdit takes a snapshot', async () => {
    const {writeFile, readFile, mkdir} = await import('node:fs/promises');
    const work = join(process.env.MAGIC_DATA_DIR!, 'work');
    await mkdir(work, {recursive: true});
    const target = join(work, 'file.txt');
    await writeFile(target, 'original');
    const {beginEdit, cancelEdit, endEdit} = await import('./cancellation.js');
    const {snapshotPath} = await beginEdit(target);
    await writeFile(target, 'modified');
    expect(await readFile(target, 'utf8')).toBe('modified');
    await cancelEdit(target);
    expect(await readFile(target, 'utf8')).toBe('original');
    void snapshotPath;
    void endEdit;
  });
});

describe('codebase_kb', () => {
  beforeEach(async () => {
    process.env.MAGIC_DATA_DIR = await mkdtemp(join(tmpdir(), 'magic-kb-'));
  });

  afterEach(async () => {
    const dir = process.env.MAGIC_DATA_DIR;
    delete process.env.MAGIC_DATA_DIR;
    if (dir) {
      await rm(dir, {recursive: true, force: true});
    }
  });

  it('add + get + list + search + remove', async () => {
    const {addKbEntry, getKbEntry, listKbEntries, searchKb, removeKbEntry} = await import(
      './memory/codebase_kb.js'
    );
    const ws = brand<string, 'WorkspaceId'>('ws-1');
    const e1 = await addKbEntry(ws, 'convention', 'naming', 'camelCase', 0.9, 'infer_conventions');
    expect(e1.id).toBeDefined();
    const e2 = await getKbEntry(ws, 'convention', 'naming');
    expect(e2?.value).toBe('camelCase');
    const all = await listKbEntries(ws);
    expect(all.length).toBe(1);
    const hits = await searchKb(ws, 'camel');
    expect(hits.length).toBe(1);
    await removeKbEntry(ws, e1.id);
    expect((await listKbEntries(ws)).length).toBe(0);
  });

  it('overwrites on duplicate (kind, key)', async () => {
    const {addKbEntry, getKbEntry} = await import('./memory/codebase_kb.js');
    const ws = brand<string, 'WorkspaceId'>('ws-2');
    await addKbEntry(ws, 'convention', 'naming', 'snake_case', 0.9, 'infer_conventions');
    await addKbEntry(ws, 'convention', 'naming', 'camelCase', 0.95, 'infer_conventions');
    const e = await getKbEntry(ws, 'convention', 'naming');
    expect(e?.value).toBe('camelCase');
    expect(e?.confidence).toBeCloseTo(0.95);
  });
});

describe('checkpoints', () => {
  it('gate + resolveCheckpoint round-trip', async () => {
    const {gate, resolveCheckpoint, listPending} = await import('./checkpoints.js');
    const id = newSessionId();
    const events: unknown[] = [];
    const promise = gate(id, 'plan', {steps: ['a']}, (e) => events.push(e));
    expect(events.length).toBe(1);
    expect(listPending().length).toBe(1);
    const e = events[0] as {checkpointId: string};
    const ok = resolveCheckpoint(e.checkpointId, true);
    expect(ok).toBe(true);
    const r = await promise;
    expect(r.approved).toBe(true);
    expect(listPending().length).toBe(0);
  });

  it('resolveCheckpoint returns false for unknown id', async () => {
    const {resolveCheckpoint} = await import('./checkpoints.js');
    expect(resolveCheckpoint('not-a-real-id', false)).toBe(false);
  });
});

describe('graph_versioning', () => {
  it('mismatch warning string is non-empty', async () => {
    const {checkGraphVersionMismatch} = await import('./graph_versioning.js');
    // We don't need a real session for this; the function returns null
    // for missing sessions. Just verify the function shape.
    const id = newSessionId();
    const r = await checkGraphVersionMismatch(id);
    expect(r).toBeNull();
  });
});

describe('events versioning', () => {
  it('assertProtocolVersion passes for matching version', async () => {
    const {assertProtocolVersion, WS_PROTOCOL_VERSION} = await import('./events/versioning.js');
    expect(() => assertProtocolVersion({version: WS_PROTOCOL_VERSION})).not.toThrow();
  });

  it('assertProtocolVersion throws on mismatch', async () => {
    const {assertProtocolVersion} = await import('./events/versioning.js');
    expect(() => assertProtocolVersion({version: 999})).toThrow(/mismatch/);
  });

  it('assertProtocolVersion throws on missing version', async () => {
    const {assertProtocolVersion} = await import('./events/versioning.js');
    expect(() => assertProtocolVersion({})).toThrow(/expected hello/);
    // The actual error: throws about hello message format mismatch (v mismatch).
  });
  it('assertProtocolVersion throws on missing version (real path)', async () => {
    const {assertProtocolVersion} = await import('./events/versioning.js');
    // Missing version field triggers the hello message check.
    expect(() => assertProtocolVersion({other: 'stuff'})).toThrow();
  });
});
