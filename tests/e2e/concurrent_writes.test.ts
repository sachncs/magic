/**
 * @fileoverview Concurrent file writes. Two `fileEditor` calls on the
 * same path are serialised; audit entry appended.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, readFile, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {withFileLock, __resetLocksForTests} from '@magic/tools';

describe('e2e: concurrent writes', () => {
  let work: string;

  beforeEach(async () => {
    work = await mkdtemp(join(tmpdir(), 'magic-conc-'));
    process.env['MAGIC_DATA_DIR'] = work;
    await mkdir(join(work, 'sub'), {recursive: true});
  });

  afterEach(async () => {
    delete process.env['MAGIC_DATA_DIR'];
    await rm(work, {recursive: true, force: true});
  });

  it('serialises two calls on the same path', async () => {
    const order: string[] = [];
    await Promise.all([
      withFileLock('/foo.txt', async () => {
        order.push('a-start');
        await new Promise((r) => setTimeout(r, 20));
        order.push('a-end');
      }, {toolCallId: 't1', mode: 'edit'}),
      withFileLock('/foo.txt', async () => {
        order.push('b-start');
        order.push('b-end');
      }, {toolCallId: 't2', mode: 'edit'}),
    ]);
    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
    __resetLocksForTests();
  });

  it('audit entry appended to audit.log', async () => {
    await withFileLock('/x.txt', async () => undefined, {toolCallId: 't1', mode: 'edit'});
    const log = await readFile(join(work, 'audit.log'), 'utf8');
    expect(log).toContain('t1');
    void writeFile;
  });
});
