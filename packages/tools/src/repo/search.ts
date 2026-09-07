/**
 * @fileoverview Plain-text search tool. Falls back to a JS regex scan
 * when `rg` is not installed; prefers `rg` when available for speed.
 */

import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {tool, ok, err} from '../tool.js';

const execFileAsync = promisify(execFile);

const MAX_RESULTS = 200;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

interface SearchHit {
  readonly file: string;
  readonly line: number;
  readonly match: string;
  readonly context: ReadonlyArray<string>;
}

const inputSchema = z.object({
  path: z.string(),
  query: z.string(),
  globs: z.array(z.string()).optional(),
  context: z.number().int().nonnegative().optional(),
  maxResults: z.number().int().positive().optional(),
});

/**
 * The `repo_search` tool.
 */
export const repoSearchTool = tool({
  name: 'repo_search',
  description:
    'Search a repository for a string or regex. Returns matches with file, line, and a few lines of context. Prefers rg when installed.',
  inputSchema,
  callback: async (input) => {
    try {
      const limit = input.maxResults ?? MAX_RESULTS;
      const ctx = input.context ?? 2;
      const globs = input.globs ?? [];
      const hits = await searchWithRg(input.path, input.query, globs, ctx, limit);
      if (hits !== null) {
        return ok(JSON.stringify({hits: hits.slice(0, limit), count: hits.length}, null, 2));
      }
      const fallback = await searchWithJs(input.path, input.query, globs, ctx, limit);
      return ok(JSON.stringify({hits: fallback, count: fallback.length}, null, 2));
    } catch (e) {
      return err(`repo_search failed: ${(e as Error).message}`);
    }
  },
});

/**
 * Tries `rg` first. Returns null if `rg` is not on PATH.
 */
async function searchWithRg(
  root: string,
  query: string,
  globs: string[],
  context: number,
  limit: number,
): Promise<SearchHit[] | null> {
  try {
    const args = [
      '--json',
      '--no-heading',
      '--line-number',
      `-C${context}`,
      '--max-count',
      String(limit),
    ];
    for (const g of globs) {
      args.push('--glob', g);
    }
    args.push(query, root);
    const {stdout} = await execFileAsync('rg', args, {maxBuffer: 16 * 1024 * 1024});
    const hits: SearchHit[] = [];
    for (const line of stdout.split('\n')) {
      if (line.length === 0) {
        continue;
      }
      try {
        const obj = JSON.parse(line) as {
          type: string;
          data?: {path?: {text?: string}; line_number?: number; lines?: {text?: string}};
        };
        if (obj.type !== 'match') {
          continue;
        }
        const d = obj.data;
        if (!d) {
          continue;
        }
        hits.push({
          file: d.path?.text ?? '',
          line: d.line_number ?? 0,
          match: d.lines?.text ?? '',
          context: [],
        });
      } catch {
        // Skip malformed lines.
      }
    }
    return hits;
  } catch (e) {
    const code = (e as {code?: string}).code;
    if (code === 'ENOENT') {
      return null;
    }
    if ((e as {code?: number}).code === 1) {
      return [];
    }
    throw e;
  }
}

/**
 * Plain JS regex walk. Slower but always available.
 */
async function searchWithJs(
  root: string,
  query: string,
  globs: string[],
  context: number,
  limit: number,
): Promise<SearchHit[]> {
  const re = new RegExp(escapeRegex(query), 'i');
  const hits: SearchHit[] = [];
  await walkFiles(root, globs, async (file) => {
    if (hits.length >= limit) {
      return;
    }
    let text: string;
    try {
      text = await readFile(file, 'utf8');
    } catch {
      return;
    }
    if (text.length > MAX_FILE_BYTES) {
      return;
    }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length && hits.length < limit; i++) {
      if (re.test(lines[i] ?? '')) {
        const ctxStart = Math.max(0, i - context);
        const ctxEnd = Math.min(lines.length, i + context + 1);
        hits.push({
          file: file.replace(root + '/', ''),
          line: i + 1,
          match: lines[i] ?? '',
          context: lines.slice(ctxStart, ctxEnd),
        });
      }
    }
  });
  return hits;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function walkFiles(
  root: string,
  globs: string[],
  visit: (file: string) => Promise<void>,
): Promise<void> {
  const {readdir, stat} = await import('node:fs/promises');
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
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist' || e.name === 'build') {
        continue;
      }
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(abs);
      } else if (e.isFile()) {
        if (globs.length > 0 && !matchesAnyGlob(e.name, globs)) {
          continue;
        }
        try {
          await stat(abs);
        } catch {
          continue;
        }
        await visit(abs);
      }
    }
  }
}

function matchesAnyGlob(name: string, globs: string[]): boolean {
  for (const g of globs) {
    if (g.startsWith('*.')) {
      if (name.endsWith(g.slice(1))) {
        return true;
      }
    } else if (name === g) {
      return true;
    }
  }
  return false;
}
