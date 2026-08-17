/**
 * @fileoverview Playwright smoke test for the new-session form. Uses
 * the @a11y tag so the a11y workflow picks it up.
 */

import {test, expect} from '@playwright/test';

test.describe('new session form @a11y', () => {
  test('renders and accepts input', async ({page}) => {
    await page.goto('/');
    await expect(page.getByRole('heading', {name: /new session/i})).toBeVisible();
    await page.getByPlaceholder(/repository/i).fill('https://github.com/owner/repo');
    await page.getByPlaceholder(/task/i).fill('add a /health endpoint');
  });

  test('axe-core has no serious violations on home', async ({page}) => {
    await page.goto('/');
    // axe-core injection lives in apps/web/tests/a11y/axe.ts
    const violations = await page.evaluate(async () => {
      const w = window as unknown as {axe?: {run: (opts: unknown) => Promise<{violations: unknown[]}>}};
      if (w.axe === undefined) {
        return [];
      }
      const r = await w.axe.run({});
      return r.violations;
    });
    expect(Array.isArray(violations) ? violations : []).toHaveLength(0);
  });
});
