/**
 * @fileoverview Lightweight convention inference. Samples files in a
 * repo and produces a report on naming, error-handling, test pattern,
 * and import style. Used by `convention_learner` agent in Phase 4.
 *
 * This is a heuristic baseline; the agent-graph layer can replace it
 * with an LLM-driven inference that builds on this report.
 */

import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';

const SAMPLE_SIZE = 20;
const MAX_FILE_BYTES = 200_000;

export type NamingStyle = 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case' | 'mixed';
export type ErrorStyle = 'throw' | 'result' | 'callback' | 'unknown';
export type TestStyle = 'co-located' | 'separate' | 'inline' | 'unknown';
export type ImportStyle = 'esm' | 'cjs' | 'mixed' | 'unknown';

export interface InferredConventions {
  naming: {value: NamingStyle; confidence: number};
  errorHandling: {value: ErrorStyle; confidence: number};
  testPattern: {value: TestStyle; confidence: number};
  importStyle: {value: ImportStyle; confidence: number};
}

/**
 * Returns the dominant naming style among identifiers extracted from
 * the sampled files. Heuristic: classify each identifier, count, pick
 * the plurality.
 */
function inferNaming(identifiers: ReadonlyArray<string>): NamingStyle {
  if (identifiers.length === 0) {
    return 'mixed';
  }
  const counts = {camelCase: 0, snake_case: 0, PascalCase: 0, 'kebab-case': 0, mixed: 0};
  for (const id of identifiers) {
    if (/^[A-Z][a-zA-Z0-9]*$/.test(id)) {
      counts.PascalCase++;
    } else if (/^[a-z][a-zA-Z0-9]*$/.test(id)) {
      counts.camelCase++;
    } else if (/^[a-z][a-z0-9_]*$/.test(id)) {
      counts.snake_case++;
    } else if (/^[a-z][a-z0-9-]*$/.test(id)) {
      counts['kebab-case']++;
    } else {
      counts.mixed++;
    }
  }
  const entries = Object.entries(counts) as Array<[NamingStyle, number]>;
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  if (top === undefined || top[1] === 0) {
    return 'mixed';
  }
  return top[0];
}

/**
 * Returns the dominant naming confidence (0..1).
 */
function namingConfidence(identifiers: ReadonlyArray<string>): number {
  if (identifiers.length === 0) {
    return 0;
  }
  const counts = {camelCase: 0, snake_case: 0, PascalCase: 0, 'kebab-case': 0, mixed: 0};
  for (const id of identifiers) {
    if (/^[A-Z][a-zA-Z0-9]*$/.test(id)) {
      counts.PascalCase++;
    } else if (/^[a-z][a-zA-Z0-9]*$/.test(id)) {
      counts.camelCase++;
    } else if (/^[a-z][a-z0-9_]*$/.test(id)) {
      counts.snake_case++;
    } else if (/^[a-z][a-z0-9-]*$/.test(id)) {
      counts['kebab-case']++;
    } else {
      counts.mixed++;
    }
  }
  const total = identifiers.length;
  const top = Math.max(...Object.values(counts));
  return total === 0 ? 0 : top / total;
}

/**
 * Heuristic: 'throw' if any of the sampled files use `throw new` or
 * `raise `; 'result' if they return error objects; 'callback' if they
 * pass `(err, ...)` callbacks. Otherwise 'unknown'.
 */
function inferErrorStyle(text: string): ErrorStyle {
  if (/throw new\s+\w*Error\b/.test(text) || /\braise\s+\w*Error\b/.test(text)) {
    return 'throw';
  }
  if (/return\s+\{[^}]*error[:\s]/.test(text) || /Result<.*Error/.test(text)) {
    return 'result';
  }
  if (/function\s*\([^)]*err[^)]*\)\s*\{/.test(text) || /\(err,\s*[^)]+\)\s*=>/.test(text)) {
    return 'callback';
  }
  return 'unknown';
}

/**
 * Heuristic: 'co-located' if .test.ts files live next to source files
 * (e.g. `foo.ts` + `foo.test.ts`); 'separate' if tests are in a
 * `__tests__/` or `tests/` directory; 'inline' if any files have
 * `it(...)` or `test(...)` at the top level alongside production code.
 */
async function inferTestStyle(root: string): Promise<{style: TestStyle; confidence: number}> {
  let coLocated = 0;
  let separate = 0;
  let inline = 0;
  const sample = await sampleFiles(root);
  for (const file of sample) {
    const lower = file.toLowerCase();
    if (lower.includes('__tests__') || lower.includes('/tests/') || lower.startsWith('tests/')) {
      separate++;
    } else if (/\.test\.[a-z]+$/.test(lower) || /\.spec\.[a-z]+$/.test(lower)) {
      coLocated++;
    } else {
      const text = await tryRead(file);
      if (text !== null && /(?:^|\n)\s*(?:it|test|describe)\s*\(/.test(text)) {
        inline++;
      }
    }
  }
  const total = Math.max(1, coLocated + separate + inline);
  if (coLocated > separate && coLocated > inline) {
    return {style: 'co-located', confidence: coLocated / total};
  }
  if (separate > coLocated && separate > inline) {
    return {style: 'separate', confidence: separate / total};
  }
  if (inline > 0) {
    return {style: 'inline', confidence: inline / total};
  }
  return {style: 'unknown', confidence: 0};
}

/**
 * Heuristic: 'esm' if files use `import ... from`; 'cjs' if they use
 * `require(`; 'mixed' if both.
 */
function inferImportStyle(text: string): ImportStyle {
  const hasEsm = /^\s*import\s.+\sfrom\s.+$/m.test(text);
  const hasCjs = /\brequire\s*\(/.test(text);
  if (hasEsm && hasCjs) {
    return 'mixed';
  }
  if (hasEsm) {
    return 'esm';
  }
  if (hasCjs) {
    return 'cjs';
  }
  return 'unknown';
}

/**
 * Extracts top-level identifiers from any source file. Matches:
 *   - TypeScript/JavaScript: `function|class|interface|type|const|let|var|enum name`
 *   - Python: `def name(`, `class name`, `name =` (module-level assignment)
 *   - Go: `func name(`
 */
function extractIdentifiers(text: string): string[] {
  const out: string[] = [];
  const patterns = [
    /(?:function|class|interface|type|const|let|var|enum)\s+([A-Za-z_$][\w$]*)/g,
    /(?:def|class)\s+([A-Za-z_][\w]*)\s*\(/g,
    /^([A-Za-z_][\w]*)\s*=[^=]/gm, // module-level assignment (Python)
    /func\s+([A-Za-z_][\w]*)\s*\(/g,
    /func\s+\([^)]+\)\s+([A-Za-z_][\w]*)\s*\(/g, // Go method
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      const id = m[1];
      if (id !== undefined && !out.includes(id)) {
        out.push(id);
      }
    }
  }
  return out;
}

async function tryRead(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Returns up to `SAMPLE_SIZE` non-vendored files from a repo.
 */
async function sampleFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  const stack = [root];
  while (stack.length > 0 && out.length < SAMPLE_SIZE) {
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
        e.name === 'build'
      ) {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(abs);
      } else if (e.isFile() && /\.(ts|tsx|js|jsx|py|go)$/.test(e.name)) {
        out.push(abs);
      }
    }
  }
  return out;
}

/**
 * Infers conventions from the repo at `root`.
 */
export async function inferConventions(root: string): Promise<InferredConventions> {
  const files = await sampleFiles(root);
  const identifiers: string[] = [];
  let combinedText = '';
  for (const file of files) {
    const text = await tryRead(file);
    if (text === null) {
      continue;
    }
    if (text.length > MAX_FILE_BYTES) {
      continue;
    }
    combinedText += text + '\n';
    identifiers.push(...extractIdentifiers(text));
  }
  const test = await inferTestStyle(root);
  return {
    naming: {value: inferNaming(identifiers), confidence: namingConfidence(identifiers)},
    errorHandling: {value: inferErrorStyle(combinedText), confidence: combinedText.length > 0 ? 0.6 : 0},
    testPattern: {value: test.style, confidence: test.confidence},
    importStyle: {value: inferImportStyle(combinedText), confidence: combinedText.length > 0 ? 0.7 : 0},
  };
}
