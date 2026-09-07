# ADR 0002 — Session log: JSONL default, SQLite optional

## Status
Accepted (v1).

## Context
Sessions produce a stream of records: messages, file edits, tool
calls, spills, KB entries. We need durable storage that supports both
simple local use and large session counts with FTS5 search.

## Decision
- Default: append-only JSONL (`records.jsonl` per session). One file
  per session, simple, robust, no dependencies.
- Optional: better-sqlite3 with WAL mode and FTS5 virtual table. Used
  when `MAGIC_PERSISTENCE=sqlite`. The same `PersistenceBackend`
  interface abstracts both.

## Consequences
- New users get a working out-of-the-box experience with no DB setup
- Power users with hundreds of sessions can flip a single env var
- The query API (`searchAllSessions`) routes to FTS5 when SQLite is
  active and falls back to a linear scan otherwise
- Both backends share the same `PersistedRecord` shape; consumers
  don't care which is active

## Alternatives considered
- SQLite only: rejected — too much setup for the 90% case
- JSONL + external index: rejected — adds an extra moving part

## Date
2026-08-17.
