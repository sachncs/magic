/**
 * @fileworkspace Cancellation. Cancelling mid-edit restores the file
 * from the snapshot.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, writeFile, readFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {beginEdit, cancelEdit, endEdit, cancelAll} from '@magic/agent-graph/cancellation';

describe('e2e: cancellation', () => {
  let work: string;

  beforeEach(async () => {
    work = await mkdtemp(join(tmpdir(), 'magic-cancel-'));
    process.env['MAGIC_DATA_DIR'] = work;
    await mkdir(join(work, 'sub'), {recursive: true});
  });

  afterEach(async () => {
    delete process.env['MAGIC_DATA_DIR'];
    await rm(work, {recursive: true, force: true});
  });

  it('cancel restores from snapshot', async () => {
    const target = join(work, 'file.txt');
    await writeFile(target, 'original');
    await beginEdit(target);
    await writeFile(target, 'modified');
    await cancelEdit(target);
    expect(await readFile(target, 'utf8')).toBe('original');
  });

  it('cancelAll returns count', async () => {
    const a = join(work, 'a.txt');
    const b = join(work, 'b.txt');
    await writeFile(a, 'A');
    await writeFile(b, 'B');
    await beginEdit(a, 'sess-A' as ReturnType<typeof newSessionId>);
    await beginEdit(b, 'sess-A' as ReturnType<typeof newSessionId>);
    const n = await cancelAll('sess-A' as ReturnType<typeof newSessionId>);
    expect(n).toBe(2);
  });

  it('cancelAll is scoped to the session', async () => {
    const {newSessionId} = await import('@magic/shared/branded');
    const sA = newSessionId();
    const sB = newSessionId();
    const a = join(work, 'a.txt');
    const b = join(work, 'b.txt');
    await writeFile(a, 'A');
    await writeFile(b, 'B');
    await beginEdit(a, sA);
    await beginEdit(b, sB);
    const nA = await cancelAll(sA);
    expect(nA).toBe(1);
    // sB's edit is still inflight and cancels cleanly.
    const nB = await cancelAll(sB);
    expect(nB).toBe(1);
  });

  it('concurrent beginEdit on the same path produces distinct snapshots', async () => {
    const target = join(work, 'race.txt');
    await writeFile(target, 'original');
    const [a, b] = await Promise.all([beginEdit(target), beginEdit(target)]);
    expect(a.snapshotPath).not.toBe(b.snapshotPath);
    // Both snapshots should reference the same original file, and the
    // undo directory should contain two snapshot files (one per call).
    await cancelAll();
    const {readdir} = await import('node:fs/promises');
    const undoDir = `${process.env['MAGIC_DATA_DIR']}/undo`;
    const files = await readdir(undoDir);
    const raceFiles = files.filter((f) => f.endsWith(a.snapshotPath.split('/').pop()!.split('-').slice(0, 1).join('-')) || f.includes('race.txt'));
    expect(files.length).toBeGreaterThanOrEqual(2);
    expect(raceFiles.length).toBeGreaterThanOrEqual(2);
  });
});
