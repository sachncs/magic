/**
 * @fileworkspace Codebase knowledge base. Per-workspace persistent
 * storage for agent-learned knowledge (conventions, past fixes,
 * project notes). Backed by a simple JSONL file in `${kbDir}/`.
 */

import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {kbDir, ensureDataDir} from '@magic/storage/data_dir';
import {brand, unbrand, type WorkspaceId, type KbEntryId, newKbEntryId} from '@magic/shared/branded';

/**
 * A single KB entry.
 */
export interface KbEntry {
  readonly id: KbEntryId;
  readonly workspaceId: WorkspaceId;
  readonly kind: string;
  readonly key: string;
  readonly value: string;
  readonly confidence: number;
  readonly source: string;
  readonly updatedAt: string;
}

function workspaceFile(workspaceId: WorkspaceId): string {
  return join(kbDir(), `${unbrand(workspaceId)}.jsonl`);
}

async function loadAll(workspaceId: WorkspaceId): Promise<KbEntry[]> {
  try {
    const raw = await readFile(workspaceFile(workspaceId), 'utf8');
    return raw
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as KbEntry);
  } catch {
    return [];
  }
}

async function persistAll(workspaceId: WorkspaceId, entries: ReadonlyArray<KbEntry>): Promise<void> {
  await ensureDataDir();
  await mkdir(kbDir(), {recursive: true});
  await writeFile(
    workspaceFile(workspaceId),
    entries.map((e) => JSON.stringify(e)).join('\n') + (entries.length > 0 ? '\n' : ''),
    'utf8',
  );
}

/**
 * Adds an entry to the workspace's KB. Overwrites if an entry with
 * the same (kind, key) exists.
 */
export async function addKbEntry(
  workspaceId: WorkspaceId,
  kind: string,
  key: string,
  value: string,
  confidence: number,
  source: string,
): Promise<KbEntry> {
  const all = await loadAll(workspaceId);
  const filtered = all.filter((e) => !(e.kind === kind && e.key === key));
  const entry: KbEntry = {
    id: newKbEntryId(),
    workspaceId,
    kind,
    key,
    value,
    confidence: Math.max(0, Math.min(1, confidence)),
    source,
    updatedAt: new Date().toISOString(),
  };
  await persistAll(workspaceId, [...filtered, entry]);
  return entry;
}

/**
 * Gets a single entry by kind + key. Returns undefined if not found.
 */
export async function getKbEntry(
  workspaceId: WorkspaceId,
  kind: string,
  key: string,
): Promise<KbEntry | undefined> {
  const all = await loadAll(workspaceId);
  return all.find((e) => e.kind === kind && e.key === key);
}

/**
 * Lists all entries for a workspace.
 */
export async function listKbEntries(workspaceId: WorkspaceId): Promise<ReadonlyArray<KbEntry>> {
  return loadAll(workspaceId);
}

/**
 * Naive substring search across all entries of a workspace. Returns
 * ranked hits.
 */
export async function searchKb(
  workspaceId: WorkspaceId,
  query: string,
): Promise<ReadonlyArray<KbEntry>> {
  const all = await loadAll(workspaceId);
  const needle = query.toLowerCase();
  return all.filter((e) => e.value.toLowerCase().includes(needle) || e.key.toLowerCase().includes(needle));
}

/**
 * Removes an entry by id.
 */
export async function removeKbEntry(workspaceId: WorkspaceId, id: KbEntryId): Promise<void> {
  const all = await loadAll(workspaceId);
  const filtered = all.filter((e) => e.id !== id);
  await persistAll(workspaceId, filtered);
}

void readdir;
void brand;
