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
    await beginEdit(a);
    await beginEdit(b);
    const n = await cancelAll();
    expect(n).toBe(2);
  });
});
