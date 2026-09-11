/**
 * @fileoverview Cancellation manager. Tracks in-flight `fileEditor`
 * operations; on cancel, waits for the current call to complete or
 * aborts via AbortSignal. On abort, restores the file from the
 * snapshot stored in `${dataDir}/undo/<path>.<ts>-<seq>-<uuid>`.
 */

import {writeFile, copyFile, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {dataDir} from '@magic/storage/data_dir';

interface InflightEdit {
  readonly path: string;
  readonly snapshotPath: string;
  readonly abortController: AbortController;
  readonly startedAt: number;
}

const inflight = new Map<string, InflightEdit>();

/**
 * Monotonically increasing suffix so two concurrent \`beginEdit\` calls
 * on the same path within the same millisecond still produce distinct
 * snapshot files. Without this, the second \`copyFile\` overwrites the
 * first snapshot and cancel-restore silently loses the original.
 */
let snapshotSeq = 0;

/**
 * Takes a snapshot of a file before an edit. Returns the snapshot
 * path. Stores an in-flight record so cancellation can find it.
 */
export async function beginEdit(
  path: string,
  signal?: AbortSignal,
): Promise<{snapshotPath: string; signal: AbortSignal}> {
  const ts = Date.now();
  const seq = ++snapshotSeq;
  const undoDir = `${dataDir()}/undo`;
  await mkdir(undoDir, {recursive: true});
  const safePath = path.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const snapshotPath = join(undoDir, `${safePath}.${ts}-${seq}-${randomUUID()}`);
  try {
    await stat(path);
    await copyFile(path, snapshotPath);
  } catch {
    // File doesn't exist yet (new file creation). Snapshot is "no
    // file" — cancellation deletes the in-progress file.
  }
  const controller = new AbortController();
  if (signal !== undefined) {
    signal.addEventListener('abort', () => {
      controller.abort(signal.reason);
    });
  }
  inflight.set(path, {path, snapshotPath, abortController: controller, startedAt: ts});
  return {snapshotPath, signal: controller.signal};
}

/**
 * Marks an edit as complete. Removes the in-flight record.
 */
export function endEdit(path: string): void {
  inflight.delete(path);
}

/**
 * Cancels an in-flight edit. Aborts the signal and restores the
 * snapshot if one exists. Returns true if an edit was cancelled.
 */
export async function cancelEdit(path: string): Promise<boolean> {
  const edit = inflight.get(path);
  if (edit === undefined) {
    return false;
  }
  edit.abortController.abort('user-cancel');
  inflight.delete(path);
  // Restore from snapshot.
  try {
    await stat(edit.snapshotPath);
    await copyFile(edit.snapshotPath, edit.path);
    return true;
  } catch {
    // No snapshot → was a new file. Caller should clean up.
    return true;
  }
}

/**
 * Cancels all in-flight edits.
 */
export async function cancelAll(): Promise<number> {
  const paths = [...inflight.keys()];
  let n = 0;
  for (const p of paths) {
    if (await cancelEdit(p)) {
      n++;
    }
  }
  return n;
}

void writeFile;
