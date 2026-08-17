import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'packages/**/src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'apps/web/tests/**'],
    testTimeout: 30_000,
    pool: 'forks',
    poolOptions: {
      forks: {singleFork: true},
    },
  },
});
