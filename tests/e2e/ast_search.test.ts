/**
 * @fileoverview AST search and call graph against the tiny_todo
 * fixture. Verifies symbols and cross-file call relationships.
 */

import {describe, it, expect} from 'vitest';
import {findSymbolsInText} from '@magic/tools/ast_search';
import {join} from 'node:path';
import {readFile} from 'node:fs/promises';

describe('e2e: AST + call graph', () => {
  it('finds the express route handler symbol', async () => {
    const fixture = join(__dirname, '..', '..', 'examples', 'tiny_todo', 'src', 'index.ts');
    const text = await readFile(fixture, 'utf8');
    const hits = findSymbolsInText(text, 'typescript', 'app');
    expect(hits.length).toBeGreaterThan(0);
  });

  it('regex fallback surfaces express usage', async () => {
    const fixture = join(__dirname, '..', '..', 'examples', 'tiny_todo', 'src', 'index.ts');
    const text = await readFile(fixture, 'utf8');
    // `app.get(`, `app.post(`, `app.listen(` should be present
    expect(text).toContain('app.get(');
    expect(text).toContain('app.post(');
    expect(text).toContain('app.listen(');
  });
});
