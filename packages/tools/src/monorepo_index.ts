/**
 * @fileworkspace Monorepo indexer. Detects workspace type (pnpm/npm/
 * yarn/turbo/nx) and produces per-package metadata.
 */

import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tool, ok, err, type ToolResult} from './tool.js';

interface DetectedPackage {
  name: string;
  path: string;
  manifest: string;
  dependencies: Record<string, string>;
}

type MonorepoType = 'pnpm' | 'npm' | 'yarn' | 'turbo' | 'nx';

interface MonorepoResult {
  type: MonorepoType;
  packages: DetectedPackage[];
}

/**
 * Reads a JSON file as unknown; returns null on failure.
 */
async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Reads pnpm-workspace.yaml and returns package globs.
 */
async function readPnpmWorkspaces(root: string): Promise<string[] | null> {
  try {
    const text = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8');
    // Very small parser: extract `packages:` block lines beginning with `- `.
    const lines = text.split('\n');
    let inPackages = false;
    const out: string[] = [];
    for (const line of lines) {
      if (line.startsWith('packages:')) {
        inPackages = true;
        continue;
      }
      if (inPackages) {
        if (line.startsWith('  - ')) {
          out.push(line.slice(4).trim());
        } else if (line.startsWith('- ')) {
          out.push(line.slice(2).trim());
        } else if (line.trim() === '' || !line.startsWith(' ')) {
          inPackages = false;
        }
      }
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Resolves workspace globs to actual package directories. Supports
 * `packages/*`, `apps/*`, and exact paths.
 */
async function resolveGlobs(root: string, globs: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const g of globs) {
    if (g.endsWith('/*')) {
      const dir = join(root, g.slice(0, -2));
      try {
        const entries = await readdir(dir, {withFileTypes: true});
        for (const e of entries) {
          if (e.isDirectory()) {
            out.push(join(dir, e.name));
          }
        }
      } catch {
        // skip
      }
    } else {
      out.push(join(root, g));
    }
  }
  return out;
}

/**
 * Builds a DetectedPackage from a package directory.
 */
async function readPackage(pkgDir: string): Promise<DetectedPackage | null> {
  const manifest = join(pkgDir, 'package.json');
  const parsed = await readJson(manifest);
  if (parsed === null || typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;
  const name = typeof obj['name'] === 'string' ? obj['name'] : pkgDir.split('/').pop() ?? 'unknown';
  const deps = obj['dependencies'];
  return {
    name,
    path: pkgDir,
    manifest,
    dependencies: typeof deps === 'object' && deps !== null ? (deps as Record<string, string>) : {},
  };
}

/**
 * Detects the monorepo type. Returns null if no workspace signal.
 */
export async function detectMonorepo(root: string): Promise<MonorepoResult | null> {
  if (await readJson(join(root, 'turbo.json')) !== null) {
    const pnpm = await readPnpmWorkspaces(root);
    if (pnpm !== null) {
      const dirs = await resolveGlobs(root, pnpm);
      const packages = (await Promise.all(dirs.map(readPackage))).filter(
        (p): p is DetectedPackage => p !== null,
      );
      return {type: 'turbo', packages};
    }
  }
  if (await readJson(join(root, 'nx.json')) !== null) {
    const pnpm = await readPnpmWorkspaces(root);
    if (pnpm !== null) {
      const dirs = await resolveGlobs(root, pnpm);
      const packages = (await Promise.all(dirs.map(readPackage))).filter(
        (p): p is DetectedPackage => p !== null,
      );
      return {type: 'nx', packages};
    }
  }
  const pnpm = await readPnpmWorkspaces(root);
  if (pnpm !== null) {
    const dirs = await resolveGlobs(root, pnpm);
    const packages = (await Promise.all(dirs.map(readPackage))).filter(
      (p): p is DetectedPackage => p !== null,
    );
    return {type: 'pnpm', packages};
  }
  // npm/yarn workspaces: look at root package.json's `workspaces` field.
  const rootPkg = (await readJson(join(root, 'package.json'))) as
    | {workspaces?: string[] | {packages?: string[]}}
    | null;
  if (rootPkg !== null) {
    const ws = Array.isArray(rootPkg.workspaces)
      ? rootPkg.workspaces
      : rootPkg.workspaces?.packages;
    if (Array.isArray(ws)) {
      const dirs = await resolveGlobs(root, ws);
      const packages = (await Promise.all(dirs.map(readPackage))).filter(
        (p): p is DetectedPackage => p !== null,
      );
      const type: MonorepoType = (await readFile(join(root, 'yarn.lock'), 'utf8').catch(() => ''))
        ? 'yarn'
        : 'npm';
      return {type, packages};
    }
  }
  return null;
}

/**
 * The `monorepo_index` tool.
 */
export const monorepoIndexTool = tool({
  name: 'monorepo_index',
  description:
    'Detect whether a repository is a monorepo (pnpm/npm/yarn/turbo/nx) and return per-package metadata.',
  inputSchema: undefined as unknown as import('zod').ZodType<{path: string}>,
  callback: async (input): Promise<ToolResult> => {
    try {
      const r = await detectMonorepo(input.path);
      if (r === null) {
        return ok(JSON.stringify({monorepo: false}, null, 2));
      }
      return ok(JSON.stringify({monorepo: true, ...r}, null, 2));
    } catch (e) {
      return err(`monorepo_index failed: ${(e as Error).message}`);
    }
  },
});
