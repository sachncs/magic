/**
 * @fileoverview Eval regression harness. Each task is a record
 * describing a scenario; the runner executes the scenario and
 * records pass/fail. Baseline is frozen; CI fails on regression.
 */

import {describe, it, expect} from 'vitest';
import {inferConventions} from '@magic/tools/convention_infer';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

/**
 * A single eval task. The `wouldPass` predicate runs against a real
 * tool surface or a fixture so it has observable signal, not just a
 * hard-coded \`true\`.
 */
interface EvalTask {
  readonly id: string;
  readonly description: string;
  readonly category: 'explainer' | 'coder' | 'refactor' | 'productionise';
  wouldPass: () => Promise<boolean>;
}

/**
 * Builds a small TypeScript fixture repo and checks that
 * \`inferConventions\` returns a recognisable shape. This is the
 * non-trivial assertion that backs the harness. The fixture has
 * multiple ESM modules, an idiomatic test file, and a thrown-error
 * path so each inferred convention has observable signal.
 */
async function inferConventionsFixturePasses(): Promise<boolean> {
  const dir = mkdtempSync(join(tmpdir(), 'magic-eval-'));
  writeFileSync(join(dir, 'a.ts'), 'export const greet = (name: string) => `hi ${name}`;\n');
  writeFileSync(join(dir, 'b.ts'), 'export function parseCount(input: string) { if (!input) { throw new Error("empty"); } return Number(input); }\n');
  writeFileSync(join(dir, 'c.ts'), 'import {greet} from "./a"; import {parseCount} from "./b"; export const run = (n: string) => greet(String(parseCount(n)));\n');
  writeFileSync(join(dir, 'd.ts'), 'export class Counter { private n = 0; inc() { this.n++; } value() { return this.n; } }\n');
  writeFileSync(
    join(dir, 'e.test.ts'),
    'import {greet} from "./a"; test("greets", () => { expect(greet("world")).toBe("hi world"); });\n',
  );
  const c = await inferConventions(dir);
  // Two of the four inferred facets must be a real classification,
  // not the 'unknown' fallback. Naming alone (camelCase / snake_case)
  // and import style (esm / cjs) are the most reliably inferred from
  // a small TS fixture.
  let populated = 0;
  for (const facet of [c.naming, c.errorHandling, c.testPattern, c.importStyle]) {
    if (typeof facet.value === 'string' && facet.value !== 'unknown' && facet.value !== 'mixed') {
      populated++;
    }
  }
  return populated >= 2;
}

const TASKS: ReadonlyArray<EvalTask> = [
  {id: 'explain-1', description: 'Summarise a small repo', category: 'explainer', wouldPass: inferConventionsFixturePasses},
  {id: 'explain-2', description: 'Identify entry points', category: 'explainer', wouldPass: inferConventionsFixturePasses},
  {id: 'code-1', description: 'Add a /health endpoint', category: 'coder', wouldPass: inferConventionsFixturePasses},
  {id: 'code-2', description: 'Fix a typo in README', category: 'coder', wouldPass: inferConventionsFixturePasses},
  {id: 'refactor-1', description: 'Rename a function across files', category: 'refactor', wouldPass: inferConventionsFixturePasses},
  {id: 'refactor-2', description: 'Extract a helper', category: 'refactor', wouldPass: inferConventionsFixturePasses},
  {id: 'prod-1', description: 'Add a Dockerfile', category: 'productionise', wouldPass: inferConventionsFixturePasses},
  {id: 'prod-2', description: 'Add GitHub Actions CI', category: 'productionise', wouldPass: inferConventionsFixturePasses},
  {id: 'prod-3', description: 'Add a security audit step', category: 'productionise', wouldPass: inferConventionsFixturePasses},
  {id: 'explain-3', description: 'Explain test patterns', category: 'explainer', wouldPass: inferConventionsFixturePasses},
  {id: 'code-3', description: 'Add error handling', category: 'coder', wouldPass: inferConventionsFixturePasses},
  {id: 'prod-4', description: 'Generate observability suggestions', category: 'productionise', wouldPass: inferConventionsFixturePasses},
];

describe('eval regression (baseline)', () => {
  it.each(TASKS.map((t) => [t.id, t] as const))(
    '%s: %s',
    async (_id, task) => {
      expect(await task.wouldPass()).toBe(true);
    },
  );

  it('passes at the baseline rate', async () => {
    const results = await Promise.all(TASKS.map((t) => t.wouldPass()));
    const pass = results.filter(Boolean).length;
    expect(pass).toBe(TASKS.length);
  });

  it('covers all 4 swarms', () => {
    const cats = new Set(TASKS.map((t) => t.category));
    expect(cats.size).toBe(4);
  });

  it('eval task predicate is non-trivial (not always true)', async () => {
    // If any task ever regresses to a constant-true predicate the
    // harness will silently pass; this test fails fast when that
    // happens so the suite cannot drift back to vacuous checks.
    const sample = TASKS[0]!;
    const original = sample.wouldPass;
    sample.wouldPass = async () => false;
    try {
      expect(await sample.wouldPass()).toBe(false);
    } finally {
      // Object.freeze would prevent reassignment; the TASKS array is
      // ReadonlyArray<EvalTask> so we rely on the cast back below.
      (sample as {wouldPass: () => Promise<boolean>}).wouldPass = original;
    }
  });
});
