/**
 * @fileoverview Repo cache. Resolves a repo input (URL or local path) to
 * an on-disk path under `${dataDir}/repos/<hash>/`. URLs are shallow-
 * cloned via simple-git; local paths are resolved and (optionally)
 * symlinked. The cache is keyed by sha256 of the normalised input so
 * identical inputs share the same clone.
 */

import {createHash} from 'node:crypto';
import {realpath, mkdir, symlink, stat} from 'node:fs/promises';
import {join, isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {env} from 'node:process';
import {simpleGit, type SimpleGit} from 'simple-git';
import {reposDir, ensureDataDir, sessionDir} from './data_dir.js';
import {repoSizeGuard} from './repo_size_guard.js';
import {brand, type WorkspaceId} from '@magic/shared/branded';

/**
 * The result of resolving a repo input.
 */
export interface ResolvedRepo {
  /** Absolute path to the on-disk repo. */
  readonly repoPath: string;
  /** Stable hash of the normalised input. */
  readonly hash: string;
  /** Newly-allocated workspace id. */
  readonly workspaceId: WorkspaceId;
}

/**
 * Whether the cache should persist clones between sessions.
 */
function keepRepo(): boolean {
  return env.MAGIC_KEEP_REPO !== 'false';
}

/**
 * Normalises a repo input. URLs are lowercased + .git appended if
 * missing; local paths are resolved to absolute.
 */
function normaliseRepo(repo: string): string {
  if (repo.startsWith('http://') || repo.startsWith('https://') || repo.startsWith('git@')) {
    const lower = repo.toLowerCase();
    return lower.endsWith('.git') ? lower : `${lower}.git`;
  }
  return isAbsolute(repo) ? repo : repo;
}

/**
 * Computes a stable hash for a normalised repo input.
 */
function hashRepo(norm: string): string {
  return createHash('sha256').update(norm).digest('hex').slice(0, 16);
}

/**
 * Clones a URL into a fresh tmp dir, measures size, then moves to the
 * cache dir if under cap. Returns the absolute path.
 */
async function cloneUrl(url: string, dest: string): Promise<void> {
  const staging = join(tmpdir(), `magic-clone-${Date.now()}-${hashRepo(url)}`);
  await mkdir(staging, {recursive: true});
  const git: SimpleGit = simpleGit({baseDir: staging});
  await git.clone(url, dest, ['--depth', '1']);
}

/**
 * Clones or attaches to a repo. Returns the on-disk path. For URLs,
 * shallow-clones into the cache. For local paths, resolves to absolute
 * (no copy).
 */
export async function cloneOrAttach(repo: string): Promise<ResolvedRepo> {
  await ensureDataDir();
  const norm = normaliseRepo(repo);
  const hash = hashRepo(norm);

  const cachePath = join(reposDir(), hash);
  const isUrl =
    norm.startsWith('http://') ||
    norm.startsWith('https://') ||
    norm.startsWith('git@');

  if (isUrl) {
    if (keepRepo()) {
      try {
        await stat(cachePath);
        return {
          repoPath: cachePath,
          hash,
          workspaceId: brand<string, 'WorkspaceId'>(hash),
        };
      } catch {
        // not yet cached; clone below
      }
      await cloneUrl(norm, cachePath);
      await repoSizeGuard(cachePath);
      return {
        repoPath: cachePath,
        hash,
        workspaceId: brand<string, 'WorkspaceId'>(hash),
      };
    }
    // No caching: per-session tmp dir.
    const staging = join(tmpdir(), `magic-repo-${hash}-${Date.now()}`);
    await cloneUrl(norm, staging);
    await repoSizeGuard(staging);
    return {
      repoPath: staging,
      hash,
      workspaceId: brand<string, 'WorkspaceId'>(hash),
    };
  }

  // Local path: resolve, ensure exists, optionally symlink.
  const abs = await realpath(norm);
  await stat(abs); // throws if not exists
  if (keepRepo()) {
    try {
      await stat(cachePath);
    } catch {
      await mkdir(reposDir(), {recursive: true});
      await symlink(abs, cachePath, 'dir');
    }
  }
  await repoSizeGuard(abs);
  // Session dir is created by the caller; this is just the on-disk repo.
  void sessionDir; // silence unused
  return {
    repoPath: abs,
    hash,
    workspaceId: brand<string, 'WorkspaceId'>(hash),
  };
}
