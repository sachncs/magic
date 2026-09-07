/**
 * @fileoverview Tests for the Strands docs MCP wrappers. Uses a stub
 * client to avoid requiring `uvx` at test time.
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {
  searchDocsTool,
  fetchDocTool,
  setDocsClient,
  type DocsClient,
} from './strands_docs.js';

class FakeDocsClient implements DocsClient {
  async searchDocs(query: string) {
    return [
      {path: `/docs/${query}`, title: `Doc about ${query}`, snippet: `${query} ...`, score: 1},
    ];
  }
  async fetchDoc(path: string) {
    return `# ${path}\n\ncontent`;
  }
}

describe('docs tools', () => {
  beforeEach(() => {
    setDocsClient(new FakeDocsClient());
  });

  afterEach(() => {
    setDocsClient(undefined);
  });

  it('searchDocs returns ranked hits', async () => {
    const r = await searchDocsTool.callback({query: 'graph'});
    expect(r.status).toBe('success');
    const text = (r.content[0] as {text: string}).text;
    expect(text).toContain('graph');
  });

  it('fetchDoc returns full content', async () => {
    const r = await fetchDocTool.callback({path: '/docs/graph'});
    expect(r.status).toBe('success');
    expect((r.content[0] as {text: string}).text).toContain('content');
  });
});
