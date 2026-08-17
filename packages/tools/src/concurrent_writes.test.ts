/**
 * @fileoverview Tests for the per-path file mutex. Covers serialisation
 * of concurrent calls and audit-log append.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

describe('withFileLock', () => {
  let work: string;

  beforeEach(async () => {
    work = await mkdtemp(join(tmpdir(), 'magic-lock-'));
    process.env.MAGIC_DATA_DIR = work;
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(work, {recursive: true, force: true});
  });

  it('serialises concurrent calls on the same path', async () => {
    const {withFileLock, __resetLocksForTests} = await import('./concurrent_writes.js');
    __resetLocksForTests();
    const order: string[] = [];
    const p1 = withFileLock('/foo.txt', async () => {
      order.push('a-start');
      await new Promise((r) => setTimeout(r, 30));
      order.push('a-end');
    }, {toolCallId: 't1', mode: 'edit'});
    const p2 = withFileLock('/foo.txt', async () => {
      order.push('b-start');
      order.push('b-end');
    }, {toolCallId: 't2', mode: 'edit'});
    await Promise.all([p1, p2]);
    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
  });

  it('does not serialise different paths', async () => {
    const {withFileLock, __resetLocksForTests} = await import('./concurrent_writes.js');
    __resetLocksForTests();
    let overlap = false;
    await Promise.all([
      withFileLock('/a', async () => {
        await new Promise((r) => setTimeout(r, 20));
        if (overlap) {
          throw new Error('overlap');
        }
        overlap = true;
        await new Promise((r) => setTimeout(r, 20));
        overlap = false;
      }, {toolCallId: 't1', mode: 'edit'}),
      withFileLock('/b', async () => {
        await new Promise((r) => setTimeout(r, 10));
      }, {toolCallId: 't2', mode: 'edit'}),
    ]);
  });

  it('appends an audit entry on completion', async () => {
    const {withFileLock, __resetLocksForTests} = await import('./concurrent_writes.js');
    __resetLocksForTests();
    await withFileLock('/x.txt', async () => undefined, {toolCallId: 't1', mode: 'edit'});
    const log = await readFile(join(work, 'audit.log'), 'utf8');
    const entries = log.trim().split('\n').map((l) => JSON.parse(l) as {path: string; toolCallId: string});
    expect(entries[0]?.path).toBe('/x.txt');
    expect(entries[0]?.toolCallId).toBe('t1');
  });
});
