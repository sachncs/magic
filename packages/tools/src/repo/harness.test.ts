/**
 * @fileoverview Tests for the harness detector. Exercises each manifest
 * type and the priority order.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {detectHarness} from './harness.js';

async function setupDir(): Promise<string> {
  return await mkdtemp(join(tmpdir(), 'magic-harness-'));
}

describe('detectHarness', () => {
  let work: string;

  beforeEach(async () => {
    work = await setupDir();
  });

  afterEach(async () => {
    await rm(work, {recursive: true, force: true});
  });

  it('detects package.json (npm)', async () => {
    await writeFile(
      join(work, 'package.json'),
      JSON.stringify({
        name: 'x',
        scripts: {build: 'tsc', test: 'vitest', lint: 'eslint .'},
      }),
    );
    const h = await detectHarness(work);
    expect(h.packageManager).toBe('npm');
    expect(h.build).toBe('tsc');
    expect(h.test).toBe('vitest');
    expect(h.lint).toBe('eslint .');
    expect(h.detectedFrom).toBe('package.json');
  });

  it('detects pnpm via lockfile', async () => {
    await writeFile(join(work, 'package.json'), JSON.stringify({name: 'x', scripts: {test: 'vitest'}}));
    await writeFile(join(work, 'pnpm-lock.yaml'), '');
    const h = await detectHarness(work);
    expect(h.packageManager).toBe('pnpm');
  });

  it('detects Makefile', async () => {
    await writeFile(
      join(work, 'Makefile'),
      'build:\n\ttsc\ntest:\n\tvitest\nlint:\n\teslint .\n',
    );
    const h = await detectHarness(work);
    expect(h.packageManager).toBe('make');
    expect(h.build).toBe('make build');
    expect(h.test).toBe('make test');
    expect(h.lint).toBe('make lint');
  });

  it('detects pyproject.toml with ruff', async () => {
    await writeFile(
      join(work, 'pyproject.toml'),
      '[project]\nname = "x"\n[tool.pytest.ini_options]\n[tool.ruff]\n',
    );
    const h = await detectHarness(work);
    expect(h.detectedFrom).toBe('pyproject.toml');
    expect(h.lint).toBe('ruff check');
  });

  it('detects Cargo.toml', async () => {
    await writeFile(join(work, 'Cargo.toml'), '[package]\nname = "x"\n');
    const h = await detectHarness(work);
    expect(h.packageManager).toBe('cargo');
    expect(h.test).toBe('cargo test');
  });

  it('detects go.mod', async () => {
    await writeFile(join(work, 'go.mod'), 'module example.com/x\n\ngo 1.22\n');
    const h = await detectHarness(work);
    expect(h.packageManager).toBe('go');
    expect(h.test).toBe('go test ./...');
  });

  it('returns unknown when no manifest found', async () => {
    const h = await detectHarness(work);
    expect(h.detectedFrom).toBe('unknown');
    expect(h.packageManager).toBe('unknown');
  });

  it('prefers package.json over Makefile when both exist', async () => {
    await mkdir(work, {recursive: true});
    await writeFile(join(work, 'package.json'), JSON.stringify({name: 'x', scripts: {test: 'vitest'}}));
    await writeFile(join(work, 'Makefile'), 'test:\n\techo test\n');
    const h = await detectHarness(work);
    expect(h.detectedFrom).toBe('package.json');
  });
});
