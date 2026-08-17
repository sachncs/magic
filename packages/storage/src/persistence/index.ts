/**
 * @fileoverview Barrel for the persistence layer. Re-exports both
 * backends and the path helpers.
 */

export {JsonlBackend, jsonlRecordsPath, sqliteDbPath} from './jsonl.js';
export type {PersistedRecord, PersistenceBackend} from './jsonl.js';
export {SqliteBackend, openDefaultSqliteBackend} from './sqlite.js';
