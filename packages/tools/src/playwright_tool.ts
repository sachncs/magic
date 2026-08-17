/**
 * @fileoverview Stub for the Playwright tool. The real implementation
 * uses `playwright-core` headless Chromium; the tool is only usable
 * when the dependency is installed and the agent runtime has
 * initialised a browser context. This file defines the tool surface
 * and a deterministic stub for tests.
 */

import {z} from 'zod';
import {tool, ok, err} from './tool.js';

/**
 * The shape of a Playwright action. Concrete actions are dispatched
 * by the runtime; the stub returns a deterministic placeholder.
 */
export type PlaywrightAction =
  | {kind: 'navigate'; url: string}
  | {kind: 'click'; selector: string}
  | {kind: 'screenshot'; fullPage?: boolean}
  | {kind: 'evaluate'; expression: string}
  | {kind: 'console'};

export interface PlaywrightResult {
  readonly content?: string;
  readonly screenshot?: string; // base64
  readonly consoleLogs?: ReadonlyArray<{type: string; text: string}>;
}

/**
 * A real Playwright client (provided by the agent runtime at boot).
 * The stub returns placeholders.
 */
export interface PlaywrightClient {
  run(action: PlaywrightAction): Promise<PlaywrightResult>;
}

/**
 * Stub client used when Playwright is not available.
 */
export class StubPlaywrightClient implements PlaywrightClient {
  async run(action: PlaywrightAction): Promise<PlaywrightResult> {
    return {
      content: `stub: ${action.kind}`,
      consoleLogs: [],
    };
  }
}

let _client: PlaywrightClient | undefined;

/**
 * Sets the global Playwright client.
 */
export function setPlaywrightClient(client: PlaywrightClient | undefined): void {
  _client = client;
}

function currentClient(): PlaywrightClient {
  if (_client === undefined) {
    _client = new StubPlaywrightClient();
  }
  return _client;
}

const actionSchema = z.union([
  z.object({kind: z.literal('navigate'), url: z.string()}),
  z.object({kind: z.literal('click'), selector: z.string()}),
  z.object({kind: z.literal('screenshot'), fullPage: z.boolean().optional()}),
  z.object({kind: z.literal('evaluate'), expression: z.string()}),
  z.object({kind: z.literal('console')}),
]);

const inputSchema = z.object({action: actionSchema});

/**
 * The `playwright` tool. Dispatches actions to the active client.
 */
export const playwrightTool = tool({
  name: 'playwright',
  description:
    'Run a Playwright action in a headless browser. Supports navigate/click/screenshot/evaluate/console. Useful for reproducing UI bugs.',
  inputSchema,
  callback: async (input) => {
    try {
      const r = await currentClient().run(input.action);
      return ok(JSON.stringify(r, null, 2));
    } catch (e) {
      return err(`playwright failed: ${(e as Error).message}`);
    }
  },
});
