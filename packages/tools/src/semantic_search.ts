/**
 * @fileoverview Semantic search over a workspace. Lightweight baseline
 * implementation: tokenises, builds a per-file term-frequency map,
 * ranks by overlap with the query. The full embedding-based
 * implementation (using `@xenova/transformers`) slots in behind the
 * same interface in a later phase.
 */

import {readFile, readdir, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
import {tool, ok, err} from './tool.js';

const MAX_FILES = 200;
const MAX_FILE_BYTES = 1_000_000;
const TOP_K = 10;

/**
 * Tokenises text into lowercase words. Strips punctuation, keeps
 * alphanumeric and underscore.
 */
function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && t.length <= 30);
}

/**
 * Walks the workspace and builds a term-frequency map per file.
 */
async function indexWorkspace(root: string): Promise<Map<string, Map<string, number>>> {
  const out = new Map<string, Map<string, number>>();
  const stack = [root];
  while (stack.length > 0 && out.size < MAX_FILES) {
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
        const terms = tokenise(text);
        const tf = new Map<string, number>();
        for (const t of terms) {
          tf.set(t, (tf.get(t) ?? 0) + 1);
        }
        out.set(abs.replace(`${root}/`, ''), tf);
      }
    }
  }
  return out;
}

/**
 * Ranks files by query term overlap. Returns the top-K with snippets.
 */
function rank(query: string, index: Map<string, Map<string, number>>): Array<{
  file: string;
  score: number;
  snippet: string;
}> {
  const queryTerms = [...new Set(tokenise(query))];
  if (queryTerms.length === 0) {
    return [];
  }
  const out: Array<{file: string; score: number; snippet: string}> = [];
  for (const [file, tf] of index) {
    let score = 0;
    for (const q of queryTerms) {
      score += tf.get(q) ?? 0;
    }
    if (score === 0) {
      continue;
    }
    out.push({file, score, snippet: ''});
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, TOP_K);
}

const inputSchema = z.object({
  path: z.string(),
  query: z.string(),
  topK: z.number().int().positive().optional(),
});

/**
 * The `semantic_search` tool.
 */
export const semanticSearchTool = tool({
  name: 'semantic_search',
  description:
    'Search a workspace semantically. Returns the top files ranked by token overlap with the query. Lightweight baseline; upgrade path to embeddings is documented.',
  inputSchema,
  callback: async (input) => {
    try {
      const index = await indexWorkspace(input.path);
      const hits = rank(input.query, index).slice(0, input.topK ?? TOP_K);
      return ok(JSON.stringify({hits, query: input.query}, null, 2));
    } catch (e) {
      return err(`semantic_search failed: ${(e as Error).message}`);
    }
  },
});
