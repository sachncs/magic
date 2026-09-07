/**
 * @fileoverview Spill store round-trip: large content is spilled and
 * retrievable via locator.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {maybeSpill, retrieveSpill} from '@magic/tools/spill_store';

describe('e2e: spill store', () => {
  let work: string;

  beforeEach(async () => {
    work = await mkdtemp(join(tmpdir(), 'magic-spill-'));
    process.env['MAGIC_DATA_DIR'] = work;
  });

  afterEach(async () => {
    delete process.env['MAGIC_DATA_DIR'];
    await rm(work, {recursive: true, force: true});
  });

  it('passes small content through', async () => {
    const r = await maybeSpill('hello');
    expect(r.spilled).toBe(false);
  });

  it('spills large content', async () => {
    const big = 'x'.repeat(60_000);
    const r = await maybeSpill(big);
    expect(r.spilled).toBe(true);
    if (r.spilled) {
      const back = await retrieveSpill(r.record.locator);
      expect(back.length).toBe(60_000);
    }
  });

  it('retrieval via locator returns full content', async () => {
    const big = 'q'.repeat(60_000);
    const r = await maybeSpill(big);
    if (!r.spilled) {
      throw new Error('expected spill');
    }
    const back = await retrieveSpill(r.record.locator);
    expect(back).toBe(big);
  });
});
