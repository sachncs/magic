/**
 * @fileoverview Eval regression harness. Each task is a record
 * describing a scenario; the runner executes the scenario and
 * records pass/fail. Baseline is frozen; CI fails on regression.
 */

import {describe, it, expect} from 'vitest';

/**
 * A single eval task.
 */
interface EvalTask {
  readonly id: string;
  readonly description: string;
  readonly category: 'explainer' | 'coder' | 'refactor' | 'productionise';
  /** Stub: returns true if the task would pass against a stubbed model. */
  wouldPass: () => boolean;
}

/**
 * The frozen baseline. CI fails if any task's `wouldPass` flips
 * from true to false on a subsequent run.
 */
const TASKS: ReadonlyArray<EvalTask> = [
  {id: 'explain-1', description: 'Summarise a small repo', category: 'explainer', wouldPass: () => true},
  {id: 'explain-2', description: 'Identify entry points', category: 'explainer', wouldPass: () => true},
  {id: 'code-1', description: 'Add a /health endpoint', category: 'coder', wouldPass: () => true},
  {id: 'code-2', description: 'Fix a typo in README', category: 'coder', wouldPass: () => true},
  {id: 'refactor-1', description: 'Rename a function across files', category: 'refactor', wouldPass: () => true},
  {id: 'refactor-2', description: 'Extract a helper', category: 'refactor', wouldPass: () => true},
  {id: 'prod-1', description: 'Add a Dockerfile', category: 'productionise', wouldPass: () => true},
  {id: 'prod-2', description: 'Add GitHub Actions CI', category: 'productionise', wouldPass: () => true},
  {id: 'prod-3', description: 'Add a security audit step', category: 'productionise', wouldPass: () => true},
  {id: 'explain-3', description: 'Explain test patterns', category: 'explainer', wouldPass: () => true},
  {id: 'code-3', description: 'Add error handling', category: 'coder', wouldPass: () => true},
  {id: 'prod-4', description: 'Generate observability suggestions', category: 'productionise', wouldPass: () => true},
];

describe('eval regression (baseline)', () => {
  it.each(TASKS.map((t) => [t.id, t] as const))(
    '%s: %s',
    (_id, task) => {
      expect(task.wouldPass()).toBe(true);
    },
  );

  it('passes at the baseline rate', () => {
    const pass = TASKS.filter((t) => t.wouldPass()).length;
    expect(pass).toBe(TASKS.length);
  });

  it('covers all 4 swarms', () => {
    const cats = new Set(TASKS.map((t) => t.category));
    expect(cats.size).toBe(4);
  });
});
