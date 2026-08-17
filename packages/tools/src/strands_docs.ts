/**
 * @fileoverview Strands docs MCP client. Wraps the
 * `strands-agents-mcp-server` subprocess and exposes its `search_docs`
 * and `fetch_doc` tools to agents. Network access is gated by
 * `network_guard`.
 *
 * The MCP server runs via `uvx strands-agents-mcp-server`; the
 * underlying stdio transport is owned by the agent runtime, not this
 * module. This file defines the request/response shapes and a local
 * mock for testing without `uvx` installed.
 */

import {tool, ok, err, type ToolResult} from './tool.js';

/**
 * A single search hit from the docs server.
 */
export interface DocsSearchHit {
  readonly path: string;
  readonly title: string;
  readonly snippet: string;
  readonly score: number;
}

/**
 * The shape of the MCP client as far as our tools are concerned. The
 * Strands SDK's `McpClient` satisfies this in production; tests pass
 * a stub.
 */
export interface DocsClient {
  searchDocs(query: string): Promise<ReadonlyArray<DocsSearchHit>>;
  fetchDoc(path: string): Promise<string>;
}

/**
 * Stub client used when the MCP server is not available. Returns empty
 * hits / a placeholder doc so dependent code does not crash during
 * dev. Logs a warning the first time it's used.
 */
export class StubDocsClient implements DocsClient {
  private warned = false;
  async searchDocs(_query: string): Promise<ReadonlyArray<DocsSearchHit>> {
    if (!this.warned) {
      // eslint-disable-next-line no-console
      console.warn('[magic] Strands docs MCP server not available; returning empty results');
      this.warned = true;
    }
    return [];
  }
  async fetchDoc(_path: string): Promise<string> {
    return '# (docs unavailable)\n\nThe Strands docs MCP server is not running. Set MAGIC_MCP_DOCS_ENABLED=true and ensure `uvx` is on PATH.';
  }
}

/**
 * The `search_docs` tool. Wraps the MCP client's `searchDocs`.
 */
export const searchDocsTool = tool({
  name: 'search_docs',
  description: 'Search the Strands Agents documentation for a query. Returns ranked hits.',
  inputSchema: undefined as unknown as import('zod').ZodType<{query: string}>,
  callback: async (input): Promise<ToolResult> => {
    try {
      const client = currentDocsClient();
      const hits = await client.searchDocs(input.query);
      return ok(JSON.stringify({hits: hits.slice(0, 10), count: hits.length}, null, 2));
    } catch (e) {
      return err(`search_docs failed: ${(e as Error).message}`);
    }
  },
});

/**
 * The `fetch_doc` tool. Wraps the MCP client's `fetchDoc`.
 */
export const fetchDocTool = tool({
  name: 'fetch_doc',
  description: 'Fetch the full content of a Strands docs page by path.',
  inputSchema: undefined as unknown as import('zod').ZodType<{path: string}>,
  callback: async (input): Promise<ToolResult> => {
    try {
      const client = currentDocsClient();
      const text = await client.fetchDoc(input.path);
      return ok(text);
    } catch (e) {
      return err(`fetch_doc failed: ${(e as Error).message}`);
    }
  },
});

let _client: DocsClient | undefined;

/**
 * Sets the global docs client. Called by the agent runtime at boot.
 * If not set, a StubDocsClient is used.
 */
export function setDocsClient(client: DocsClient | undefined): void {
  _client = client;
}

/**
 * Returns the currently-active docs client.
 */
export function currentDocsClient(): DocsClient {
  if (_client === undefined) {
    _client = new StubDocsClient();
  }
  return _client;
}
