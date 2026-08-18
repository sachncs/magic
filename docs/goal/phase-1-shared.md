# Phase 1 — `packages/shared`

8 items. Defines the type system that every other package depends on: branded opaque IDs, repo + session + tool-card shapes, the WS event union, and schema versioning.

**Ships when**: all types/brands compile, unit tests pass, consumed by other packages without circular dependencies.

---

## Items

| # | Path | What | Verification |
|---|---|---|---|
| 1.1 | `magic/packages/shared/package.json` | `name: "@magic/shared"`, `type: "module"`, `main: "./src/index.ts"`, `exports`: `{ ".": "./src/index.ts", "./branded": "./src/branded.ts", "./types": "./src/types/index.ts", "./events": "./src/events/index.ts" }`; `devDependencies`: `typescript`, `vitest` | `npm pack --dry-run` shows expected exports |
| 1.2 | `magic/packages/shared/src/branded.ts` | `Branded<T, K>` phantom-typed opaque ID helper using `__brand` symbol; concrete brands: `SessionId`, `WorkspaceId`, `AgentId`, `RepoId`, `MessageId`, `DeliverableId`, `SpillLocator`; helpers `brand<T, K>(v: T): Branded<T, K>` and `unbrand<T>(v: Branded<T, K>): T`; `JSDoc` each brand | unit test: brand round-trip; type mismatch rejected at compile time |
| 1.3 | `magic/packages/shared/src/types/repo.ts` | `RepoManifest` shape: `{ id: RepoId; rootPath: string; languages: LanguageId[]; dependencies: Record<string, string>; scripts: Record<string, string>; harnessRef: HarnessRef; monorepo?: MonorepoInfo }`. `HarnessCommands` shape: `{ build?, test?, lint?, format?, packageManager, detectedFrom: 'package.json' \| 'Makefile' \| 'pyproject.toml' \| 'Cargo.toml' }`. `LanguageId` union: `'typescript' \| 'javascript' \| 'python' \| 'rust' \| 'go' \| 'java' \| 'kotlin' \| 'swift' \| 'ruby' \| 'php' \| 'csharp' \| 'cpp' \| 'c' \| 'shell' \| 'other'` | unit test: serialize + parse round-trip via `zod` |
| 1.4 | `magic/packages/shared/src/types/session.ts` | `SessionStatus` union: `'pending' \| 'running' \| 'paused' \| 'completed' \| 'failed' \| 'cancelled'`. `SessionMeta` shape: `{ id: SessionId; workspaceId: WorkspaceId; repo: string; task: string; status: SessionStatus; currentNode?: string; createdAt: string; updatedAt: string; schemaVersion: SchemaVersion; graphVersion: GraphVersion; manifestRef?: string; title?: string; costSoFar?: number; costCap?: number; providerChain?: string[] }` | unit test: round-trip; status transitions validated |
| 1.5 | `magic/packages/shared/src/types/tool_card.ts` | `ToolCardKind` union: `'generic' \| 'terminal' \| 'diff' \| 'search' \| 'web'`. `ToolCardView<T>` shape: `{ kind: ToolCardKind; args: T; preview: string; locator?: SpillLocator }`. Type signatures for `presentCall<TIn, TView>(args: TIn): ToolCardView<TView>` and `presentResult<TIn, TOut, TView>(args: TIn, result: TOut): ToolCardView<TView>` — both pure functions of args | unit test: presentCall(args) is deterministic (same args → same view) |
| 1.6 | `magic/packages/shared/src/events/index.ts` | Discriminated union of WS events with `version: WsProtocolVersion` field on each: `{ type: 'nodeStart', nodeId, ts }` \| `{ type: 'nodeEnd', nodeId, status, ts }` \| `{ type: 'toolUse', toolName, args, ts }` \| `{ type: 'fileEdit', path, hunk, ts }` \| `{ type: 'testResult', passed, failed, logs, ts }` \| `{ type: 'message', role, content, ts }` \| `{ type: 'done', stopReason, ts }` \| `{ type: 'error', message, ts }` \| `{ type: 'spill', locator, preview, ts }` \| `{ type: 'checkpoint', kind: 'plan' \| 'diff' \| 'destructive', payload, ts }` \| `{ type: 'costUpdate', sessionCost, cap, ts }` \| `{ type: 'memoryHit', entries, ts }` \| `{ type: 'titleUpdate', title, ts }` | unit test: exhaustive `switch` on `type` type-checks without `default` |
| 1.7 | `magic/packages/shared/src/index.ts` | Barrel: re-export `branded`, all `types/*`, `events`; named exports only | `tsc --noEmit` + `npm run lint` clean |
| 1.8 | `magic/packages/shared/src/types/version.ts` | `SchemaVersion` const enum: `LATEST`, `MIN_SUPPORTED`. `GraphVersion` const: `LATEST`. Versioned type aliases: `SessionMetaV1`, `SessionMetaV2` etc. Migration mapping function `migrateSessionMeta(from: SchemaVersion, meta: unknown): SessionMeta` | unit test: `migrateSessionMeta` correctly transforms v0 → latest |

---

## Dependencies

- Phase 0 complete.

## Blocks

- Phases 2–5 (all packages import from `@magic/shared`).
