/**
 * @fileoverview Tests for the Playwright stub. Verifies the tool
 * surface and stub fallback.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {playwrightTool, setPlaywrightClient, type PlaywrightClient} from './playwright_tool.js';

class FakePlaywright implements PlaywrightClient {
  async run(action: {kind: string; url?: string}) {
    return {content: `navigated to ${action.url ?? '(no url)'}`, consoleLogs: []};
  }
}

describe('playwright tool', () => {
  beforeEach(() => setPlaywrightClient(new FakePlaywright()));
  afterEach(() => setPlaywrightClient(undefined));

  it('dispatches a navigate action', async () => {
    const r = await playwrightTool.callback({action: {kind: 'navigate', url: 'http://localhost:3000'}});
    expect(r.status).toBe('success');
    const text = (r.content[0] as {text: string}).text;
    expect(text).toContain('http://localhost:3000');
  });

  it('falls back to stub when no client is set', async () => {
    setPlaywrightClient(undefined);
    const r = await playwrightTool.callback({action: {kind: 'screenshot'}});
    expect(r.status).toBe('success');
    expect((r.content[0] as {text: string}).text).toContain('stub: screenshot');
  });
});
