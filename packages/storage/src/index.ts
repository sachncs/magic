/**
 * @fileoverview Barrel + factory for @magic/storage. The
 * `createStorage()` factory picks the persistence backend based on
 * `MAGIC_PERSISTENCE` and returns a single object containing every
 * sub-module.
 */

export * from './data_dir.js';
export * from './meta.js';
export * from './workspaces.js';
export * from './credentials.js';
export * from './session_title.js';
export * from './session_manager.js';
export * from './session_query.js';
export * from './workspace_cache.js';
export * from './repo_size_guard.js';
export * from './persistence/index.js';
export * from './migrations/index.js';

import {JsonlBackend, SqliteBackend, sqliteDbPath} from './persistence/index.js';
import type {PersistenceBackend} from './persistence/index.js';
import {env} from 'node:process';

/**
 * Resolves the persistence backend name from env, defaulting to 'jsonl'.
 */
export function resolvePersistenceName(): 'jsonl' | 'sqlite' {
  const raw = env.MAGIC_PERSISTENCE?.toLowerCase();
  return raw === 'sqlite' ? 'sqlite' : 'jsonl';
}

/**
 * The aggregated storage object. Holds a backend for raw record IO plus
 * a SQLite handle for FTS5 search when applicable.
 */
export interface Storage {
  readonly backend: PersistenceBackend;
  readonly sqlite: SqliteBackend | undefined;
}

/**
 * Creates the storage layer. The SQLite backend is always constructed
 * (cheap) so that the FTS5 path is available even when the default
 * backend is JSONL.
 */
export function createStorage(opts?: {persistence?: 'jsonl' | 'sqlite'}): Storage {
  const name = opts?.persistence ?? resolvePersistenceName();
  const sqlite = new SqliteBackend(sqliteDbPath());
  // Suppress an unused warning on JsonlBackend when sqlite is selected;
  // we still construct it for callers that want the simpler path.
  void JsonlBackend;
  return {
    backend: name === 'sqlite' ? sqlite : new JsonlBackend(),
    sqlite,
  };
}
