/**
 * @fileoverview Tests for the AST search tool. Exercises the symbol
 * extractor against minimal TS fixtures.
 */

import {describe, it, expect} from 'vitest';
import {findSymbolsInText} from './ast_search.js';

describe('findSymbolsInText (TS)', () => {
  it('finds a function declaration', () => {
    const text = [
      'export function getUserName() {',
      '  return "x";',
      '}',
      '',
    ].join('\n');
    const hits = findSymbolsInText(text, 'typescript', 'getUser');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.symbol).toBe('getUserName');
    expect(hits[0]?.kind).toBe('function');
  });

  it('finds a class declaration', () => {
    const text = 'export class MyService {}\n';
    const hits = findSymbolsInText(text, 'typescript', 'Service');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.kind).toBe('class');
  });

  it('finds an interface declaration', () => {
    const text = 'export interface UserProps { id: string }\n';
    const hits = findSymbolsInText(text, 'typescript', 'User');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.kind).toBe('interface');
  });

  it('returns empty for no match', () => {
    const hits = findSymbolsInText('const x = 1;', 'typescript', 'zzz');
    expect(hits.length).toBe(0);
  });
});
