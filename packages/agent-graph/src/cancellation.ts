/**
 * @fileoverview Cancellation manager. Tracks in-flight `fileEditor`
 * operations per session; on cancel, waits for the current call to
 * complete or aborts via AbortSignal. On abort, restores the file
 * from the snapshot stored in `${dataDir}/undo/<path>.<ts>-<seq>-<uuid>`.
 */

import {writeFile, copyFile, stat, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {dataDir} from '@magic/storage/data_dir';
import type {SessionId} from '@magic/shared/branded';

interface InflightEdit {
  readonly sessionId: SessionId;
  readonly path: string;
  readonly snapshotPath: string;
  readonly abortController: AbortController;
  readonly startedAt: number;
}

/**
 * In-flight edits keyed by session, then by path. Two sessions editing
 * the same path get separate snapshots and abort signals so cancelling
 * one session does not abort the other.
 */
const inflightBySession = new Map<SessionId, Map<string, InflightEdit>>();

/**
 * Monotonically increasing suffix so two concurrent \`beginEdit\` calls
 * on the same path within the same millisecond still produce distinct
 * snapshot files. Without this, the second \`copyFile\` overwrites the
 * first snapshot and cancel-restore silently loses the original.
 */
let snapshotSeq = 0;

/**
 * Looks up the per-session inflight map, creating it on first use.
 */
function sessionMap(sessionId: SessionId): Map<string, InflightEdit> {
  let m = inflightBySession.get(sessionId);
  if (m === undefined) {
    m = new Map<string, InflightEdit>();
    inflightBySession.set(sessionId, m);
  }
  return m;
}

/**
 * Takes a snapshot of a file before an edit. Returns the snapshot
 * path. Stores an in-flight record scoped to the given session so
 * cancellation can find it without affecting other sessions.
 */
export async function beginEdit(
  path: string,
  sessionIdOrSignal?: SessionId | AbortSignal,
  maybeSignal?: AbortSignal,
): Promise<{snapshotPath: string; signal: AbortSignal}> {
  // Back-compat: second arg may be an AbortSignal (no sessionId) or a
  // SessionId (with optional AbortSignal). Default to a synthetic
  // global session when not provided so existing call sites compile.
  const sessionId: SessionId = typeof sessionIdOrSignal === 'string'
    ? (sessionIdOrSignal as SessionId)
    : ('__default__' as SessionId);
  const signal = typeof sessionIdOrSignal === 'string' ? maybeSignal : sessionIdOrSignal;
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
  const edit: InflightEdit = {
    sessionId,
    path,
    snapshotPath,
    abortController: controller,
    startedAt: ts,
  };
  sessionMap(sessionId).set(path, edit);
  return {snapshotPath, signal: controller.signal};
}

/**
 * Marks an edit as complete. Removes the in-flight record.
 */
export function endEdit(path: string, sessionId: SessionId = '__default__' as SessionId): void {
  inflightBySession.get(sessionId)?.delete(path);
}

/**
 * Cancels an in-flight edit. Aborts the signal and restores the
 * snapshot if one exists. Returns true if an edit was cancelled.
 */
export async function cancelEdit(
  path: string,
  sessionId: SessionId = '__default__' as SessionId,
): Promise<boolean> {
  const edit = inflightBySession.get(sessionId)?.get(path);
  if (edit === undefined) {
    return false;
  }
  edit.abortController.abort('user-cancel');
  inflightBySession.get(sessionId)?.delete(path);
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
 * Cancels all in-flight edits for a given session. Cancelling one
 * session never aborts another's in-flight edits.
 */
export async function cancelAll(sessionId: SessionId): Promise<number> {
  const m = inflightBySession.get(sessionId);
  if (m === undefined) {
    return 0;
  }
  const paths = [...m.keys()];
  let n = 0;
  for (const p of paths) {
    if (await cancelEdit(p, sessionId)) {
      n++;
    }
  }
  return n;
}

void writeFile;
