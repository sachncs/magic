/**
 * @fileoverview Tracks every workspace magic has ever seen. Persisted as
 * a single JSON file at `${dataDir}/workspaces.json`; updated on register
 * and on touch (which bumps `lastUsed`).
 */

import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {dataDir, ensureDataDir} from './data_dir.js';
import {unbrand, type WorkspaceId, newWorkspaceId} from '@magic/shared/branded';

/**
 * The on-disk record for a single workspace.
 */
export interface WorkspaceRecord {
  readonly id: WorkspaceId;
  readonly path: string;
  readonly manifestHash: string;
  readonly lastUsed: string;
  readonly conventions?: Record<string, string>;
}

/**
 * In-memory cache, hydrated from disk on construction.
 */
let cache: Map<WorkspaceId, WorkspaceRecord> | undefined;

/**
 * Returns the path to the workspaces registry file.
 */
function registryFile(): string {
  return `${dataDir()}/workspaces.json`;
}

/**
 * Loads the registry from disk into the in-memory cache.
 */
async function load(): Promise<Map<WorkspaceId, WorkspaceRecord>> {
  if (cache !== undefined) {
    return cache;
  }
  await ensureDataDir();
  try {
    const raw = await readFile(registryFile(), 'utf8');
    const parsed = JSON.parse(raw) as Array<WorkspaceRecord>;
    cache = new Map(parsed.map((r) => [r.id, r]));
  } catch {
    cache = new Map();
  }
  return cache;
}

/**
 * Persists the in-memory cache to disk.
 */
async function persist(): Promise<void> {
  if (cache === undefined) {
    return;
  }
  const path = registryFile();
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, JSON.stringify([...cache.values()], null, 2), {mode: 0o600});
}

/**
 * Registers a new workspace and returns its id.
 */
export async function registerWorkspace(
  repoPath: string,
  manifestHash: string,
): Promise<WorkspaceId> {
  const id = newWorkspaceId();
  const map = await load();
  map.set(id, {
    id,
    path: repoPath,
    manifestHash,
    lastUsed: new Date().toISOString(),
  });
  await persist();
  return id;
}

/**
 * Returns the record for a workspace, or undefined if unknown.
 */
export async function getWorkspace(id: WorkspaceId): Promise<WorkspaceRecord | undefined> {
  const map = await load();
  return map.get(id);
}

/**
 * Updates `lastUsed` to now. Used by session activity to mark workspaces
 * as recently active (for cleanup policies later).
 */
export async function touchWorkspace(id: WorkspaceId): Promise<void> {
  const map = await load();
  const record = map.get(id);
  if (record === undefined) {
    return;
  }
  map.set(id, {...record, lastUsed: new Date().toISOString()});
  await persist();
}

/**
 * Lists all known workspaces.
 */
export async function listWorkspaces(): Promise<ReadonlyArray<WorkspaceRecord>> {
  const map = await load();
  return [...map.values()];
}

/**
 * Test-only: reset the in-memory cache. Use between test cases that
 * touch the registry to avoid cross-test contamination.
 */
export function __resetWorkspaceCacheForTests(): void {
  cache = undefined;
}

/**
 * Test-only: get the unbranded path of a workspace (for assertions).
 */
export function __workspaceRecordPath(rec: WorkspaceRecord): string {
  return unbrand(rec.id) === rec.path ? rec.path : rec.path;
}
