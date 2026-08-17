/**
 * @fileoverview Walks a directory tree and produces a `RepoManifest`.
 * Respects `.gitignore` (via the `ignore` package) and language
 * detection (by extension).
 */

import {readdir, stat} from 'node:fs/promises';
import {join, relative, sep, posix} from 'node:path';
import {createHash} from 'node:crypto';
import ignore from 'ignore';
import {z} from 'zod';
import {
  languageIdSchema,
  type LanguageId,
  type RepoFileEntry,
  type RepoManifest,
  type HarnessCommands,
} from '@magic/shared/types/repo';
import {detectHarness} from './harness.js';
import {tool, ok, err} from '../tool.js';

const MAX_FILES = 50_000;
const MAX_DEPTH = 16;

/**
 * Best-effort language detection by file extension.
 */
function detectLanguage(path: string): LanguageId | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) {
    return 'typescript';
  }
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return 'javascript';
  }
  if (lower.endsWith('.py')) {
    return 'python';
  }
  if (lower.endsWith('.rs')) {
    return 'rust';
  }
  if (lower.endsWith('.go')) {
    return 'go';
  }
  if (lower.endsWith('.java')) {
    return 'java';
  }
  if (lower.endsWith('.kt') || lower.endsWith('.kts')) {
    return 'kotlin';
  }
  if (lower.endsWith('.swift')) {
    return 'swift';
  }
  if (lower.endsWith('.rb')) {
    return 'ruby';
  }
  if (lower.endsWith('.php')) {
    return 'php';
  }
  if (lower.endsWith('.cs')) {
    return 'csharp';
  }
  if (lower.endsWith('.cpp') || lower.endsWith('.cc') || lower.endsWith('.cxx') || lower.endsWith('.hpp')) {
    return 'cpp';
  }
  if (lower.endsWith('.c') || lower.endsWith('.h')) {
    return 'c';
  }
  if (lower.endsWith('.sh') || lower.endsWith('.bash')) {
    return 'shell';
  }
  return undefined;
}

/**
 * Loads .gitignore patterns from the repo root. Returns an `ignore`
 * instance usable for `.ignores(path)` checks.
 */
async function loadGitignore(root: string): Promise<ReturnType<typeof ignore>> {
  const ig = ignore();
  try {
    const {readFile} = await import('node:fs/promises');
    const text = await readFile(join(root, '.gitignore'), 'utf8');
    ig.add(text);
  } catch {
    // No .gitignore is fine.
  }
  // Always ignore these.
  ig.add(['.git', 'node_modules', 'dist', 'build', '.magic', '.next', 'coverage']);
  return ig;
}

/**
 * Recursive walk. Returns up to `MAX_FILES` entries, stopping at
 * `MAX_DEPTH`. The returned paths are repo-relative POSIX.
 */
async function walk(
  root: string,
  ig: ReturnType<typeof ignore>,
  depth: number = 0,
): Promise<RepoFileEntry[]> {
  if (depth >= MAX_DEPTH) {
    return [];
  }
  let entries;
  try {
    entries = await readdir(root, {withFileTypes: true});
  } catch {
    return [];
  }
  const out: RepoFileEntry[] = [];
  for (const entry of entries) {
    if (out.length >= MAX_FILES) {
      break;
    }
    const abs = join(root, entry.name);
    const rel = relative(root, abs).split(sep).join(posix.sep);
    if (ig.ignores(rel)) {
      continue;
    }
    if (entry.isDirectory()) {
      const sub = await walk(abs, ig, depth + 1);
      out.push(...sub);
    } else if (entry.isFile()) {
      const s = await stat(abs);
      out.push({
        path: rel,
        bytes: s.size,
        language: languageIdSchema.options.find(() => true) && detectLanguage(rel),
      });
    }
  }
  return out;
}

/**
 * Computes a stable hash of a manifest. Uses file paths + sizes for
 * speed (no content hashing at index time).
 */
function hashManifest(manifest: Omit<RepoManifest, 'manifestHash'>): string {
  const canonical = manifest.files
    .map((f) => `${f.path}\t${f.bytes}`)
    .join('\n');
  return createHash('sha256').update(canonical).digest('hex');
}

const inputSchema = z.object({path: z.string()});

/**
 * The `repo_index` tool. Walks a repo and returns a `RepoManifest`.
 */
export const repoIndexTool = tool({
  name: 'repo_index',
  description:
    'Walk a repository and return a RepoManifest describing its files, languages, dependencies, and detected build/test/lint commands. Respects .gitignore.',
  inputSchema,
  callback: async (input) => {
    try {
      const ig = await loadGitignore(input.path);
      const files = await walk(input.path, ig);
      const languages = [
        ...new Set(
          files
            .map((f) => f.language)
            .filter((l): l is LanguageId => l !== undefined),
        ),
      ];
      const harness = await detectHarness(input.path);
      const partial: Omit<RepoManifest, 'manifestHash'> = {
        id: 'pending',
        rootPath: input.path,
        indexedAt: new Date().toISOString(),
        files,
        languages,
        dependencies: {},
        scripts: {},
        harness,
      };
      const manifestHash = hashManifest(partial);
      const manifest: RepoManifest = {...partial, manifestHash, id: manifestHash};
      return ok(JSON.stringify(manifest, null, 2));
    } catch (e) {
      return err(`repo_index failed: ${(e as Error).message}`);
    }
  },
});

void inputSchema;
