/**
 * @fileoverview Per-path mutex for file edits. Two concurrent
 * `fileEditor` calls on the same path are serialised; the second
 * wins, and an audit entry is appended to `${dataDir}/audit.log`.
 *
 * This is in-process only. For multi-process safety, add a file lock
 * layer; the current design assumes a single Fastify process.
 */

import {appendFile, mkdir} from 'node:fs/promises';
import {dataDir} from '@magic/storage/data_dir';
import {createHash} from 'node:crypto';

/**
 * A per-path serialised queue. Maps a path to the promise representing
 * the most recent in-flight edit; new edits chain onto it.
 */
const locks = new Map<string, Promise<unknown>>();

/**
 * Audit entry shape. Appended as JSONL.
 */
interface AuditEntry {
  readonly ts: string;
  readonly path: string;
  readonly toolCallId: string;
  readonly winner: 'first' | 'second';
  readonly mode: 'edit' | 'create' | 'delete';
}

/**
 * Path of the audit log. One line per file operation.
 */
function auditPath(): string {
  return `${dataDir()}/audit.log`;
}

/**
 * Appends an audit entry. Best-effort; never throws.
 */
async function appendAudit(entry: AuditEntry): Promise<void> {
  try {
    await mkdir(dataDir(), {recursive: true});
    await appendFile(auditPath(), JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // Best-effort.
  }
}

/**
 * Runs `fn` while holding the per-path lock. The lock is acquired only
 * while `fn` is running; releases on completion (success or failure).
 */
export async function withFileLock<T>(
  path: string,
  fn: () => Promise<T>,
  audit: {toolCallId: string; mode: 'edit' | 'create' | 'delete'},
): Promise<T> {
  const key = createHash('sha256').update(path).digest('hex');
  const prev = locks.get(key) ?? Promise.resolve();
  let resolve: () => void;
  const next = new Promise<void>((r) => {
    resolve = r;
  });
  locks.set(
    key,
    prev.then(() => next),
  );
  try {
    await prev;
    return await fn();
  } finally {
    resolve!();
    if (locks.get(key) === prev.then(() => next)) {
      locks.delete(key);
    }
    await appendAudit({
      ts: new Date().toISOString(),
      path,
      toolCallId: audit.toolCallId,
      winner: 'second',
      mode: audit.mode,
    });
  }
}

/**
 * Test-only: clears the in-process lock table.
 */
export function __resetLocksForTests(): void {
  locks.clear();
}
