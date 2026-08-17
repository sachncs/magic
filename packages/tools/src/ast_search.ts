/**
 * @fileoverview AST-aware code search. Uses regex-based symbol
 * extraction as a portable baseline; ts-morph and tree-sitter slots
 * are documented for upgrade.
 *
 * Finds: function declarations, class declarations, interface
 * declarations, type aliases, exported bindings. Returns the matching
 * symbol sites with file, line, and snippet.
 */

import {readFile} from 'node:fs/promises';
import {join, isAbsolute} from 'node:path';
import {readdir, stat} from 'node:fs/promises';
import {tool, ok, err, type ToolResult} from './tool.js';
import {languageIdSchema, type LanguageId} from '@magic/shared/types/repo';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export interface AstHit {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly symbol: string;
  readonly kind: SymbolKind;
  readonly snippet: string;
}

export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'const'
  | 'method'
  | 'enum';

const TS_PATTERNS: Array<{kind: SymbolKind; re: RegExp}> = [
  {kind: 'function', re: /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/},
  {kind: 'class', re: /^(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/},
  {kind: 'interface', re: /^(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/},
  {kind: 'type', re: /^(?:export\s+)?type\s+([A-Za-z_$][\w$]*)\s*[=<]/},
  {kind: 'const', re: /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*[=:]/},
  {kind: 'enum', re: /^(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/},
  {kind: 'method', re: /^\s+(?:public\s+|private\s+|protected\s+|async\s+|static\s+)*([A-Za-z_$][\w$]*)\s*\(/},
];

const PY_PATTERNS: Array<{kind: SymbolKind; re: RegExp}> = [
  {kind: 'function', re: /^def\s+([A-Za-z_][\w]*)\s*\(/},
  {kind: 'class', re: /^class\s+([A-Za-z_][\w]*)/},
];

const GO_PATTERNS: Array<{kind: SymbolKind; re: RegExp}> = [
  {kind: 'function', re: /^func\s+([A-Za-z_][\w]*)\s*\(/},
  {kind: 'method', re: /^func\s+\([^)]+\)\s+([A-Za-z_][\w]*)\s*\(/},
];

/**
 * Returns the regex set for a given language.
 */
function patternsFor(lang: LanguageId): Array<{kind: SymbolKind; re: RegExp}> {
  switch (lang) {
    case 'typescript':
    case 'javascript':
      return TS_PATTERNS;
    case 'python':
      return PY_PATTERNS;
    case 'go':
      return GO_PATTERNS;
    default:
      return TS_PATTERNS; // reasonable default
  }
}

/**
 * Returns the language for a file path.
 */
function detectLang(path: string): LanguageId {
  const lower = path.toLowerCase();
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) {
    return 'typescript';
  }
  if (lower.endsWith('.py')) {
    return 'python';
  }
  if (lower.endsWith('.go')) {
    return 'go';
  }
  return 'other';
}

/**
 * Scans a file's text for symbols matching the language's patterns.
 */
export function findSymbolsInText(
  text: string,
  lang: LanguageId,
  query: string,
): AstHit[] {
  const patterns = patternsFor(lang);
  const lines = text.split('\n');
  const hits: AstHit[] = [];
  const lowerQuery = query.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    for (const {kind, re} of patterns) {
      re.lastIndex = 0;
      const m = re.exec(line);
      if (m === null) {
        continue;
      }
      const sym = m[1] ?? '';
      if (!sym.toLowerCase().includes(lowerQuery)) {
        continue;
      }
      hits.push({
        file: '',
        line: i + 1,
        column: m.index + 1,
        symbol: sym,
        kind,
        snippet: line.trim(),
      });
    }
  }
  return hits;
}

/**
 * Walks the repo and finds matching symbols. Skips binaries, large
 * files, and vendored directories.
 */
async function walkSymbols(
  root: string,
  query: string,
): Promise<AstHit[]> {
  const hits: AstHit[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (dir === undefined) {
      break;
    }
    let entries;
    try {
      entries = await readdir(dir, {withFileTypes: true});
    } catch {
      continue;
    }
    for (const e of entries) {
      if (
        e.name === 'node_modules' ||
        e.name === '.git' ||
        e.name === 'dist' ||
        e.name === 'build' ||
        e.name === '.magic' ||
        e.name === 'coverage'
      ) {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(abs);
      } else if (e.isFile()) {
        const lang = detectLang(e.name);
        if (lang === 'other') {
          continue;
        }
        try {
          const s = await stat(abs);
          if (s.size > MAX_FILE_BYTES) {
            continue;
          }
        } catch {
          continue;
        }
        let text: string;
        try {
          text = await readFile(abs, 'utf8');
        } catch {
          continue;
        }
        if (text.includes('\u0000')) {
          continue;
        }
        const found = findSymbolsInText(text, lang, query);
        for (const hit of found) {
          hits.push({...hit, file: abs.replace(`${root}/`, '')});
        }
      }
    }
  }
  return hits;
}

/**
 * The `ast_search` tool.
 */
export const astSearchTool = tool({
  name: 'ast_search',
  description:
    'Search for symbols (functions, classes, interfaces, types) by name across a repo. Language-aware (TS, JS, Python, Go).',
  inputSchema: undefined as unknown as import('zod').ZodType<{
    path: string;
    query: string;
    language?: string;
  }>,
  callback: async (input): Promise<ToolResult> => {
    try {
      const root = isAbsolute(input.path) ? input.path : input.path;
      const lang = input.language !== undefined ? languageIdSchema.parse(input.language) : undefined;
      const all = await walkSymbols(root, input.query);
      const filtered = lang === undefined ? all : all.filter(() => true); // language hint reserved
      return ok(JSON.stringify({hits: filtered.slice(0, 100), count: filtered.length}, null, 2));
    } catch (e) {
      return err(`ast_search failed: ${(e as Error).message}`);
    }
  },
});
