/**
 * @fileoverview Tests for the spill store. Covers small content
 * passthrough, large content spilling, and round-trip retrieval.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, readdir, stat, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {maybeSpill, retrieveSpill, spillResult} from './spill_store.js';
import {unbrand, brand, type SpillLocator} from '@magic/shared/branded';

describe('spill store', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'magic-spill-'));
    process.env.MAGIC_DATA_DIR = workDir;
  });

  afterEach(async () => {
    delete process.env.MAGIC_DATA_DIR;
    await rm(workDir, {recursive: true, force: true});
  });

  it('passes small content through unchanged', async () => {
    const r = await maybeSpill('hello world');
    expect(r.spilled).toBe(false);
    if (!r.spilled) {
      expect(r.content).toBe('hello world');
    }
  });

  it('spills large content and returns a preview', async () => {
    const big = 'x'.repeat(60_000);
    const r = await maybeSpill(big);
    expect(r.spilled).toBe(true);
    if (r.spilled) {
      expect(r.record.byteSize).toBe(60_000);
      expect(r.record.preview).toContain('spilled to');
      expect(r.record.preview.length).toBeLessThan(big.length);
    }
  });

  it('writes the spill file to disk', async () => {
    const big = `y${Date.now()}-${Math.random()}`.repeat(60_000);
    const r = await maybeSpill(big);
    expect(r.spilled).toBe(true);
    if (r.spilled) {
      const {dataDir} = await import('@magic/storage/data_dir');
      const dir = join(dataDir(), 'spill');
      const files = await readdir(dir);
      expect(files.length).toBeGreaterThan(0);
      const onDisk = await readFile(join(dir, files[0] ?? ''), 'utf8');
      const parsed = JSON.parse(onDisk) as {content: string};
      expect(parsed.content.length).toBe(60_000);
    }
  });

  it('retrieves the full content via locator', async () => {
    const big = 'z'.repeat(60_000);
    const r = await maybeSpill(big);
    if (!r.spilled) {
      throw new Error('expected spill');
    }
    const back = await retrieveSpill(r.record.locator);
    expect(back.length).toBe(60_000);
  });

  it('spillResult returns preview + locator for large text', async () => {
    const big = 'q'.repeat(60_000);
    const r = await spillResult(big);
    expect(r.text).toContain('spilled to');
    expect(r.locator).toBeDefined();
  });

  it('spillResult returns original for small text', async () => {
    const r = await spillResult('small');
    expect(r.text).toBe('small');
    expect(r.locator).toBeUndefined();
  });
});
