/**
 * @fileoverview Persistence backend abstraction. Two implementations:
 *
 * - `jsonl` (default): append-only JSONL files. Simple, robust, no
 *   dependencies. Good for individuals and small session counts.
 *
 * - `sqlite`: better-sqlite3 with FTS5 virtual table over message
 *   content. Required for session-query to work efficiently at scale.
 *
 * Both backends implement the same `PersistenceBackend` interface so
 * the rest of the codebase depends only on the contract.
 */

import {appendFile, readFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {ensureDataDir, sessionDir, dataDir} from '../data_dir.js';

/**
 * A single persisted record. The `kind` discriminator tells the backend
 * how to (de)serialise. We keep records generic at this layer; the
 * higher-level SessionManager is responsible for SessionMessage shape.
 */
export interface PersistedRecord {
  readonly id: string;
  readonly kind: 'message' | 'meta' | 'spill' | 'kb';
  readonly ts: string;
  readonly payload: unknown;
}

/**
 * Abstract persistence backend.
 */
export interface PersistenceBackend {
  /** Append a record. */
  append(sessionId: string, record: PersistedRecord): Promise<void>;
  /** Replay all records for a session in order. */
  replay(sessionId: string): Promise<ReadonlyArray<PersistedRecord>>;
  /** Flush any buffered writes. */
  flush(sessionId: string): Promise<void>;
}

/**
 * Returns the path of the per-session JSONL file.
 */
function jsonlPath(sessionId: string): string {
  return join(sessionDir(sessionId), 'records.jsonl');
}

/**
 * JSONL-backed persistence.
 */
export class JsonlBackend implements PersistenceBackend {
  private readonly buffers = new Map<string, PersistedRecord[]>();
  private static readonly FLUSH_THRESHOLD = 64 * 1024;

  async append(sessionId: string, record: PersistedRecord): Promise<void> {
    let buf = this.buffers.get(sessionId);
    if (buf === undefined) {
      buf = [];
      this.buffers.set(sessionId, buf);
    }
    buf.push(record);
    if (
      buf.reduce((acc, r) => acc + JSON.stringify(r).length, 0) >=
      JsonlBackend.FLUSH_THRESHOLD
    ) {
      await this.flush(sessionId);
    }
  }

  async flush(sessionId: string): Promise<void> {
    const buf = this.buffers.get(sessionId);
    if (buf === undefined || buf.length === 0) {
      return;
    }
    await ensureDataDir();
    await mkdir(sessionDir(sessionId), {recursive: true});
    const lines = buf.map((r) => JSON.stringify(r)).join('\n') + '\n';
    await appendFile(jsonlPath(sessionId), lines, 'utf8');
    this.buffers.set(sessionId, []);
  }

  async replay(sessionId: string): Promise<ReadonlyArray<PersistedRecord>> {
    await this.flush(sessionId);
    let raw = '';
    try {
      raw = await readFile(jsonlPath(sessionId), 'utf8');
    } catch {
      return [];
    }
    const out: PersistedRecord[] = [];
    for (const line of raw.split('\n')) {
      if (line.length === 0) {
        continue;
      }
      try {
        out.push(JSON.parse(line) as PersistedRecord);
      } catch {
        continue;
      }
    }
    return out;
  }
}

/**
 * Path helper for the SQLite database.
 */
export function sqliteDbPath(): string {
  return join(dataDir(), 'sessions.sqlite');
}

/**
 * Path helper used by tests to inspect the JSONL file.
 */
export function jsonlRecordsPath(sessionId: string): string {
  return jsonlPath(sessionId);
}
