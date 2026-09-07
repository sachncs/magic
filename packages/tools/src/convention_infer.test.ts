/**
 * @fileoverview Tests for convention inference. Exercises the heuristic
 * against minimal fixture directories.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {mkdtemp, rm, writeFile, mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {inferConventions} from './convention_infer.js';

describe('inferConventions', () => {
  let work: string;

  beforeEach(async () => {
    work = await mkdtemp(join(tmpdir(), 'magic-conv-'));
  });

  afterEach(async () => {
    await rm(work, {recursive: true, force: true});
  });

  it('detects camelCase from a TS file', async () => {
    await writeFile(
      join(work, 'a.ts'),
      'export function getUserName() { return "x"; }\nexport const defaultName = "x";\n',
    );
    const c = await inferConventions(work);
    expect(c.naming.value).toBe('camelCase');
    expect(c.naming.confidence).toBeGreaterThan(0);
  });

  it('detects snake_case from a Python file', async () => {
    await writeFile(
      join(work, 'a.py'),
      'def get_user_name():\n    return "x"\ndefault_name = "x"\n',
    );
    const c = await inferConventions(work);
    expect(c.naming.value).toBe('snake_case');
  });

  it('detects throw error style', async () => {
    await writeFile(join(work, 'a.ts'), 'throw new Error("bad");\n');
    const c = await inferConventions(work);
    expect(c.errorHandling.value).toBe('throw');
  });

  it('detects ESM imports', async () => {
    await writeFile(join(work, 'a.ts'), 'import {x} from "y";\n');
    const c = await inferConventions(work);
    expect(c.importStyle.value).toBe('esm');
  });

  it('detects co-located tests', async () => {
    await writeFile(join(work, 'foo.ts'), 'export const x = 1;\n');
    await writeFile(join(work, 'foo.test.ts'), 'import {x} from "./foo"; test("x", () => {});\n');
    const c = await inferConventions(work);
    expect(c.testPattern.value).toBe('co-located');
  });

  it('detects separate tests directory', async () => {
    await mkdir(join(work, '__tests__'), {recursive: true});
    await writeFile(join(work, '__tests__', 'a.test.ts'), 'test("x", () => {});\n');
    const c = await inferConventions(work);
    expect(c.testPattern.value).toBe('separate');
  });
});
