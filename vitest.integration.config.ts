/**
 * @fileoverview Integration test config. Runs the e2e tests in
 * `tests/e2e/**` and the agent-graph suites with longer timeouts and
 * serial execution (the integration harness may exercise real
 * subprocesses and shared filesystem state).
 */

import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/e2e/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'apps/web/tests/**'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
    poolOptions: {
      forks: {singleFork: true, isolate: true},
    },
    fileParallelism: false,
  },
});