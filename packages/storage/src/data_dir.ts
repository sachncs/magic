/**
 * @fileoverview Resolves the on-disk data directory and ensures its
 * subdirectories exist. All persistence in magic lives under one root,
 * so the layout is consistent across deployments.
 */

import {mkdir, stat} from 'node:fs/promises';
import {resolve, isAbsolute} from 'node:path';
import {env} from 'node:process';

/**
 * The default data directory when `MAGIC_DATA_DIR` is not set. Resolves
 * to `.magic` relative to the current working directory.
 */
const DEFAULT_DATA_DIR = './.magic';

/**
 * Resolves the absolute path of the data directory. Honours
 * `MAGIC_DATA_DIR` if set; otherwise falls back to `./.magic`.
 */
export function resolveDataDir(): string {
  const raw = env.MAGIC_DATA_DIR ?? DEFAULT_DATA_DIR;
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
}

/**
 * Lazily-resolved root path. Computed once on first access.
 */
let cachedRoot: string | undefined;

/**
 * Returns the absolute path of the magic data root. Cached after first
 * call.
 */
export function dataDir(): string {
  if (cachedRoot === undefined) {
    cachedRoot = resolveDataDir();
  }
  return cachedRoot;
}

/**
 * Returns the absolute path of the sessions subdirectory.
 */
export function sessionsDir(): string {
  return `${dataDir()}/sessions`;
}

/**
 * Returns the absolute path of the cached repos subdirectory.
 */
export function reposDir(): string {
  return `${dataDir()}/repos`;
}

/**
 * Returns the absolute path of the spill subdirectory (oversized tool
 * output that was offloaded to disk).
 */
export function spillDir(): string {
  return `${dataDir()}/spill`;
}

/**
 * Returns the absolute path of the knowledge-base subdirectory
 * (per-workspace SQLite files).
 */
export function kbDir(): string {
  return `${dataDir()}/kb`;
}

/**
 * Returns the absolute path of the workspaces registry file
 * (`workspaces.json`).
 */
export function workspacesFile(): string {
  return `${dataDir()}/workspaces.json`;
}

/**
 * Returns the path of a single session's directory.
 */
export function sessionDir(id: string): string {
  return `${sessionsDir()}/${id}`;
}

/**
 * Returns the path of a single session's meta.json.
 */
export function sessionMetaFile(id: string): string {
  return `${sessionDir(id)}/meta.json`;
}

/**
 * Ensures the data root and all its subdirectories exist. Idempotent.
 * Returns the root path.
 */
export async function ensureDataDir(): Promise<string> {
  const root = dataDir();
  await mkdir(root, {recursive: true});
  await mkdir(sessionsDir(), {recursive: true});
  await mkdir(reposDir(), {recursive: true});
  await mkdir(spillDir(), {recursive: true});
  await mkdir(kbDir(), {recursive: true});
  return root;
}

/**
 * Returns true if the data root exists on disk.
 */
export async function dataDirExists(): Promise<boolean> {
  try {
    await stat(dataDir());
    return true;
  } catch {
    return false;
  }
}
