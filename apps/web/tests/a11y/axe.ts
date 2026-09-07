/**
 * @fileoverview axe-core injection helper. Loaded by Playwright specs
 * that want to run an a11y scan on the current page.
 */

import type {Page} from '@playwright/test';

declare global {
  interface Window {
    axe?: {
      run: (opts: unknown) => Promise<{violations: Array<{id: string; impact?: string; nodes: unknown[]}>}>;
    };
  }
}

/**
 * Loads axe-core from CDN into the current page. Run once per spec.
 */
export async function injectAxe(page: Page): Promise<void> {
  await page.addScriptTag({
    url: 'https://cdn.jsdelivr.net/npm/axe-core@4.10.0/axe.min.js',
  });
}
