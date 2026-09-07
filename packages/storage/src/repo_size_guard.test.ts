/**
 * @fileoverview Tests for the repo size guard. Covers getMaxRepoMb,
 * measureDirBytes on a known directory, and guard thresholds.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, writeFile, mkdir, stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {measureDirBytes, getMaxRepoMb, repoSizeGuard} from './repo_size_guard.js';

describe('getMaxRepoMb', () => {
  const original = process.env.MAGIC_MAX_REPO_MB;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.MAGIC_MAX_REPO_MB;
    } else {
      process.env.MAGIC_MAX_REPO_MB = original;
    }
  });

  it('returns default when env unset', () => {
    delete process.env.MAGIC_MAX_REPO_MB;
    expect(getMaxRepoMb()).toBe(500);
  });

  it('returns env value when set', () => {
    process.env.MAGIC_MAX_REPO_MB = '42';
    expect(getMaxRepoMb()).toBe(42);
  });

  it('returns default for non-numeric or non-positive', () => {
    process.env.MAGIC_MAX_REPO_MB = 'abc';
    expect(getMaxRepoMb()).toBe(500);
    process.env.MAGIC_MAX_REPO_MB = '0';
    expect(getMaxRepoMb()).toBe(500);
    process.env.MAGIC_MAX_REPO_MB = '-1';
    expect(getMaxRepoMb()).toBe(500);
  });
});

describe('measureDirBytes', () => {
  it('returns 0 for empty dir', async () => {
    const work = await mkdtemp(join(tmpdir(), 'magic-size-'));
    try {
      const bytes = await measureDirBytes(work);
      expect(bytes).toBeGreaterThanOrEqual(0);
    } finally {
      await rm(work, {recursive: true, force: true});
    }
  });

  it('counts file sizes', async () => {
    const work = await mkdtemp(join(tmpdir(), 'magic-size-'));
    try {
      await writeFile(join(work, 'a.txt'), 'x'.repeat(1000));
      await writeFile(join(work, 'b.txt'), 'y'.repeat(2000));
      const bytes = await measureDirBytes(work);
      expect(bytes).toBeGreaterThanOrEqual(3000);
    } finally {
      await rm(work, {recursive: true, force: true});
    }
  });

  it('recurses into subdirs', async () => {
    const work = await mkdtemp(join(tmpdir(), 'magic-size-'));
    try {
      await mkdir(join(work, 'sub'), {recursive: true});
      await writeFile(join(work, 'sub', 'c.txt'), 'z'.repeat(500));
      const bytes = await measureDirBytes(work);
      expect(bytes).toBeGreaterThanOrEqual(500);
    } finally {
      await rm(work, {recursive: true, force: true});
    }
  });
});

describe('repoSizeGuard', () => {
  let work: string;

  beforeEach(async () => {
    work = await mkdtemp(join(tmpdir(), 'magic-guard-'));
  });

  afterEach(async () => {
    await rm(work, {recursive: true, force: true});
  });

  it('passes for a small repo', async () => {
    await writeFile(join(work, 'a.txt'), 'small');
    await expect(repoSizeGuard(work)).resolves.toBeUndefined();
  });

  it('throws for an oversized repo (mock via env)', async () => {
    const original = process.env.MAGIC_MAX_REPO_MB;
    process.env.MAGIC_MAX_REPO_MB = '1'; // 1 MB cap
    try {
      // Create a 2 MB file to blow the cap.
      const big = Buffer.alloc(2 * 1024 * 1024, 'x');
      await writeFile(join(work, 'big.bin'), big);
      await expect(repoSizeGuard(work)).rejects.toThrow(/exceeds cap/);
    } finally {
      if (original === undefined) {
        delete process.env.MAGIC_MAX_REPO_MB;
      } else {
        process.env.MAGIC_MAX_REPO_MB = original;
      }
    }
  });

  it('rejects missing path', async () => {
    const s = await stat(work); // exists
    expect(s.isDirectory()).toBe(true);
    await expect(repoSizeGuard('/this/does/not/exist/12345')).rejects.toThrow();
  });
});
