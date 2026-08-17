/**
 * @fileoverview Tests for the monorepo indexer. Exercises the parser
 * against a minimal pnpm-workspace.yaml fixture.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {detectMonorepo} from './monorepo_index.js';

describe('detectMonorepo', () => {
  let work: string;

  beforeEach(async () => {
    work = await mkdtemp(join(tmpdir(), 'magic-mono-'));
  });

  afterEach(async () => {
    await rm(work, {recursive: true, force: true});
  });

  it('detects pnpm workspace', async () => {
    await writeFile(
      join(work, 'pnpm-workspace.yaml'),
      'packages:\n  - "packages/*"\n  - "apps/*"\n',
    );
    await mkdir(join(work, 'packages', 'a'), {recursive: true});
    await writeFile(
      join(work, 'packages', 'a', 'package.json'),
      JSON.stringify({name: '@scope/a', dependencies: {lodash: '^4'}}),
    );
    await mkdir(join(work, 'apps', 'web'), {recursive: true});
    await writeFile(
      join(work, 'apps', 'web', 'package.json'),
      JSON.stringify({name: '@scope/web'}),
    );
    const r = await detectMonorepo(work);
    expect(r).not.toBeNull();
    expect(r?.type).toBe('pnpm');
    expect(r?.packages.length).toBe(2);
    expect(r?.packages[0]?.name).toBe('@scope/a');
  });

  it('returns null for a non-monorepo', async () => {
    await writeFile(join(work, 'package.json'), JSON.stringify({name: 'solo'}));
    const r = await detectMonorepo(work);
    expect(r).toBeNull();
  });

  it('detects turbo + pnpm-workspace', async () => {
    await writeFile(join(work, 'turbo.json'), JSON.stringify({pipeline: {build: {}}}));
    await writeFile(join(work, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');
    await mkdir(join(work, 'packages', 'x'), {recursive: true});
    await writeFile(join(work, 'packages', 'x', 'package.json'), JSON.stringify({name: 'x'}));
    const r = await detectMonorepo(work);
    expect(r?.type).toBe('turbo');
  });
});
