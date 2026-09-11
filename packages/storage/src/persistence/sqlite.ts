/**
 * @fileoverview SQLite persistence backend using better-sqlite3. Schema:
 *
 *   records(id, session_id, kind, ts, payload_json)
 *   records_fts(content) -- FTS5 virtual table over payload_json-as-text
 *
 * Every connection opens with WAL mode for concurrent read safety.
 * Schema is created on first open if missing.
 */

import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {sqliteDbPath} from './jsonl.js';
import {dataDir} from '../data_dir.js';
import type {PersistedRecord, PersistenceBackend} from './jsonl.js';

/**
 * SQLite-backed persistence. One database file for all sessions; FTS5
 * index over message content enables fast cross-session search.
 */
export class SqliteBackend implements PersistenceBackend {
  private readonly db: Database.Database;

  constructor(filename: string = sqliteDbPath()) {
    mkdirSync(dirname(filename), {recursive: true});
    this.db = new Database(filename);
    // Every connection opens with WAL mode for concurrent-read safety.
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.initSchema();
  }

  /**
   * Creates the tables and FTS5 index if they don't exist.
   */
  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        ts TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        PRIMARY KEY (id, session_id)
      );
      CREATE INDEX IF NOT EXISTS idx_records_session
        ON records (session_id, ts);
      CREATE VIRTUAL TABLE IF NOT EXISTS records_fts
        USING fts5(content, session_id UNINDEXED, content='', tokenize='porter');
    `);
  }

  append(sessionId: string, record: PersistedRecord): Promise<void> {
    const stmt = this.db.prepare(
      `INSERT OR REPLACE INTO records (id, session_id, kind, ts, payload_json)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const fts = this.db.prepare(
      `INSERT OR REPLACE INTO records_fts (rowid, content, session_id)
       VALUES (?, ?, ?)`,
    );
    const tx = this.db.transaction(() => {
      const info = stmt.run(record.id, sessionId, record.kind, record.ts, JSON.stringify(record.payload));
      // Use lastInsertRowid rather than a SELECT against the same
      // transaction: SELECT inside the transaction doesn't always see
      // the row just inserted, which produced NULL rowids in FTS.
      const rowid = info.lastInsertRowid;
      fts.run(rowid, JSON.stringify(record.payload), sessionId);
    });
    tx();
    return Promise.resolve();
  }

  flush(): Promise<void> {
    // SQLite writes are synchronous; no buffer to flush.
    return Promise.resolve();
  }

  async replay(sessionId: string): Promise<ReadonlyArray<PersistedRecord>> {
    const stmt = this.db.prepare(
      `SELECT id, kind, ts, payload_json FROM records
       WHERE session_id = ?
       ORDER BY ts ASC, id ASC`,
    );
    const rows = stmt.all(sessionId) as Array<{
      id: string;
      kind: string;
      ts: string;
      payload_json: string;
    }>;
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind as PersistedRecord['kind'],
      ts: r.ts,
      payload: JSON.parse(r.payload_json),
    }));
  }

  /**
   * Full-text search across all sessions. Returns the top `limit` rows
   * ranked by FTS5 score, each with a snippet for preview.
   */
  search(query: string, limit: number = 20): Array<{
    sessionId: string;
    recordId: string;
    snippet: string;
    score: number;
  }> {
    const stmt = this.db.prepare(
      `SELECT r.session_id, r.id, snippet(records_fts, 0, '<mark>', '</mark>', '…', 16) AS snippet,
              bm25(records_fts) AS score
       FROM records_fts
       JOIN records r ON r.rowid = records_fts.rowid
       WHERE records_fts MATCH ?
       ORDER BY score ASC
       LIMIT ?`,
    );
    const rows = stmt.all(query, limit) as Array<{
      session_id: string;
      id: string;
      snippet: string;
      score: number;
    }>;
    return rows.map((r) => ({
      sessionId: r.session_id,
      recordId: r.id,
      snippet: r.snippet,
      score: r.score,
    }));
  }

  /**
   * Closes the database connection. Call on graceful shutdown.
   */
  close(): void {
    this.db.close();
  }

  /**
   * Returns the underlying better-sqlite3 Database for advanced use
   * (e.g. health checks). Do not use in business code.
   */
  raw(): Database.Database {
    return this.db;
  }
}

/**
 * Convenience: open the default database.
 */
export function openDefaultSqliteBackend(): SqliteBackend {
  // Touch dataDir so the data root exists.
  dataDir();
  return new SqliteBackend();
}
