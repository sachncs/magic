# Phase 2 — `packages/storage`

15 items. Owns all disk persistence: sessions, manifests, workspace registry, credentials, SQLite + JSONL backends, FTS5 search, schema migrations, repo size cap.

**Ships when**: both persistence backends round-trip; FTS5 search returns expected hits; WAL enforced; migrations replay old schemas; repo size cap rejects oversized repos before clone.

---

## Items

| # | Path | What | Verification |
|---|---|---|---|
| 2.1 | `magic/packages/storage/package.json` | `name: "@magic/storage"`; deps: `@magic/shared`, `better-sqlite3`, `simple-git`, `zod`; devDeps: `vitest`, `@types/better-sqlite3` | `npm install` clean |
| 2.2 | `magic/packages/storage/src/data_dir.ts` | Resolve `${MAGIC_DATA_DIR:-./.magic}`; export `dataDir`, `sessionsDir`, `reposDir`, `spillDir`, `kbDir`; mkdir-p on first access; refuses if path is outside expected location (defensive) | unit test: resolves default; custom env; creates dirs |
| 2.3 | `magic/packages/storage/src/meta.ts` | `readMeta(id: SessionId): Promise<SessionMeta \| null>`, `writeMeta(id: SessionId, meta: SessionMeta): Promise<void>`; atomic write via temp file + rename; zod validation on read; calls `migrateSessionMeta` if `schemaVersion` < `LATEST` | unit test: atomic write (kill mid-write → previous meta survives); invalid JSON rejected |
| 2.4 | `magic/packages/storage/src/workspace_cache.ts` | `cloneOrAttach(repo: string): Promise<{ repoPath: string; hash: string; workspaceId: WorkspaceId }>`; URL → shallow clone into `${reposDir}/<hash>/` (idempotent — reuses if exists); local path → resolve to absolute + check exists; hash = sha256 of normalised URL/path; respects `MAGIC_KEEP_REPO` (if false, uses tmp dir per session) | integration test: clone URL; reuse on second call; local path |
| 2.5 | `magic/packages/storage/src/credentials.ts` | `CredentialsStore` write-only API: `set(name: string, value: string): Promise<void>`, `has(name: string): Promise<boolean>`, `getRedactedDescriptors(): Promise<Array<{ name: string; present: boolean; updatedAt?: string }>>`; values stored encrypted at rest (AES-256-GCM with key from `${DATA_DIR}/.key`); never returned via any public API | unit test: `getRedactedDescriptors` returns presence only (no value field exists on returned object); `set` + `has` round-trip |
| 2.6 | `magic/packages/storage/src/session_title.ts` | `SessionTitleService`; `generateTitle(task: string, model: Model): Promise<string>` using first-prompt LLM provider; persists title into meta; if model fails, falls back to first 60 chars of task | unit test: stub model returns title; fallback works on stub failure |
| 2.7 | `magic/packages/storage/src/session_manager.ts` | `createSessionManager(id: SessionId, dataDir: string): SessionManager`; constructs Strands `SessionManager` with `FileStorage(`${dataDir}/sessions/<id>`)`; same instance shared by every Agent in the graph (passed via constructor) | integration test: round-trip a SessionManager (write message, read back) |
| 2.8 | `magic/packages/storage/src/persistence/jsonl.ts` | `JsonlPersistence` implements `PersistenceBackend` interface (`append`, `replay`, `flush`); append-only `messages.jsonl` per session; `meta.json` separate; uses Node `fs/promises`; flushes on graceful shutdown | unit test: append + replay yields identical message stream; concurrent appends serialised |
| 2.9 | `magic/packages/storage/src/persistence/sqlite.ts` | `SqlitePersistence` uses `better-sqlite3`; schema: `messages(id, session_id, role, content, ts, idx)`; FTS5 virtual table `messages_fts` over `content`; **every connection opens with `PRAGMA journal_mode=WAL`, `PRAGMA synchronous=NORMAL`, `PRAGMA foreign_keys=ON`** | unit test: WAL applied (`PRAGMA journal_mode` returns `wal`); FTS5 search returns expected hits |
| 2.10 | `magic/packages/storage/src/session_query.ts` | `searchAllSessions(query: string, opts?: { limit?: number; workspaceId?: WorkspaceId }): Promise<Array<{ sessionId: SessionId; snippet: string; score: number }>>`; SQLite backend → FTS5 ranked query with `snippet()`; JSONL backend → linear scan + simple substring match; results merged per active backend | integration test: indexed search on SQLite matches; linear on JSONL matches |
| 2.11 | `magic/packages/storage/src/workspaces.ts` | `WorkspaceRegistry`: tracks branded `WorkspaceId`-keyed records `{ id, path, manifestHash, lastUsed, conventions? }`; `register({path, hash}): WorkspaceId`; `get(id): WorkspaceInfo`; `touch(id)` on session activity; persisted in `${dataDir}/workspaces.json` | unit test: register + get round-trip; touch updates `lastUsed` |
| 2.12 | `magic/packages/storage/src/index.ts` | Barrel; `createStorage(opts: { dataDir: string; persistence: 'jsonl' \| 'sqlite' }): Storage` factory that wires all the above; re-exports types from `@magic/shared` | `tsc --noEmit` clean |
| 2.13 | `magic/packages/storage/src/migrations/index.ts` + per-version files | `migrations/v0_to_v1.ts`, `v1_to_v2.ts` etc; `migrateSession(id: SessionId): Promise<void>` reads `meta.json`, runs all migrations from `meta.schemaVersion` to `LATEST`, writes back; each migration is a pure function `(old) => new` | unit test: v0 session migrates to latest; idempotent (running twice is safe) |
| 2.14 | `magic/packages/storage/tests/wal.test.ts` | Integration test: open SQLite, assert `PRAGMA journal_mode = 'wal'` | CI |
| 2.15 | `magic/packages/storage/src/repo_size_guard.ts` | `checkRepoSize(repo: string, maxMb?: number): Promise<void>`; for URL → uses `git clone --bare --depth 1` to tmp, measures, then full clone if under cap; for local path → recursive `du -sb`; rejects with clear error if > `MAGIC_MAX_REPO_MB` (default 500 MB); warning for paths between 80–100% of cap | unit test: oversized mock repo rejected; boundary cases |

---

## Dependencies

- Phase 0 (workspaces), Phase 1 (types + brands + schema versioning).

## Blocks

- Phase 4 (SessionManager), Phase 5 (routes read/write sessions).
