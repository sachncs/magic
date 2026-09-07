# Phase 4 — `packages/agent-graph`

28 items. The brain: model factory, sandbox policy, slash commands, every agent and swarm, the verifier critic, git_operator PR workflow, codebase knowledge base, approval checkpoints, convention learner, event versioning, prompts, cost tracking, cancellation, ADRs.

**Ships when**: full graph runs end-to-end on fixture; verifier rejects broken diffs; git_operator produces a valid PR draft; codebase_kb persists across sessions; checkpoints halt and resume; cancellation leaves no half-edited files.

---

## Items

| # | Path | What | Verification |
|---|---|---|---|
| 4.1 | `magic/packages/agent-graph/package.json` | `name: "@magic/agent-graph"`; deps: `@strands-agents/sdk`, `@magic/shared`, `@magic/storage`, `@magic/tools`, `zod` | install ok |
| 4.2 | `magic/packages/agent-graph/src/model.ts` | `buildModel(opts?: { providerOverride?: ProviderId }): Model`; detection chain (local → Bedrock → Anthropic → OpenAI → Google → MiniMax → throw); exports `ProviderId` union; throw message lists every supported env var | unit test: each provider path with stubbed env |
| 4.3 | `magic/packages/agent-graph/src/permissions.ts` | `PermissionPreset` type + `resolvePreset(preset: 'read-only' \| 'workspace-write' \| 'danger-full-access'): { sandboxMode, approvalPolicy, writableRoots }`; emits single `permission/preset` event on switch (consumed by `sandbox_policy`) | unit test: preset → policy mapping; event emitted |
| 4.4 | `magic/packages/agent-graph/src/sandbox_policy.ts` | Singleton `SandboxPolicy` instance; read by `bash` + `fileEditor` + `fileRead` at tool execution time; updates on `permission/preset` event; refuses to allow bash outside `writableRoots` | unit test: one policy, three tools read it; switch fans out |
| 4.5 | `magic/packages/agent-graph/src/commands.ts` | Slash command registry: `/plan`, `/commit`, `/restore`, `/cancel`, `/search`; `resolveCommand(input: string): CommandAction \| null`; never sent as model message; returns action + args | unit test |
| 4.6 | `magic/packages/agent-graph/src/agents/indexer.ts` | `Agent` with `repo_index`, `repo_read`, `repo_search`, `ast_search`, `monorepo_index`, `call_graph`, `convention_infer`; first call invokes `convention_infer` and stores in codebase_kb; emits `RepoManifest` | integration test on fixture |
| 4.7 | `magic/packages/agent-graph/src/agents/harness_detector.ts` | `Agent` with `repo_harness`, `repo_read`; emits `HarnessCommands` | integration test |
| 4.8 | `magic/packages/agent-graph/src/agents/planner.ts` | `Agent` with `notebook`; writes checklist into session notebook; returns checklist as `CheckpointPayload` for `gate('plan')` | integration test |
| 4.9 | `magic/packages/agent-graph/src/agents/security_auditor.ts` | `Agent` with `repo_security`; first-pass scan; produces structured `Finding[]` | integration test |
| 4.10 | `magic/packages/agent-graph/src/agents/router.ts` | `Agent` whose `tools` are the four swarms via `.asTool({ name, description })`; classifies intent; picks one swarm; emits `selectedSwarm` event | unit test: intent → swarm mapping |
| 4.11 | `magic/packages/agent-graph/src/agents/reporter.ts` | `Agent`; synthesises swarm output into final report; publishes deliverable via `appendOnlyDeliverable` mechanism; consumes from `codebase_kb` for context | integration test |
| 4.12 | `magic/packages/agent-graph/src/swarms/explainer.ts` | `Swarm` of `overview_agent` → `entry_points_agent` → `dependency_graph_agent`; emergent handoffs based on what each finds | integration test |
| 4.13 | `magic/packages/agent-graph/src/swarms/coder.ts` | `Swarm` of `implementer` → `reviewer` → `tester`; cyclic edge from `tester` back to `implementer` if verifier rejects; final step calls `git_operator` | integration test |
| 4.14 | `magic/packages/agent-graph/src/swarms/refactor.ts` | `Swarm` of `impact_analyzer` → `refactorer` → `validator`; uses `ast_search` + `call_graph` for impact analysis | integration test |
| 4.15 | `magic/packages/agent-graph/src/swarms/productionise.ts` | `Swarm` of `docker_packager` → `ci_builder` → `observability_suggester` → `security_auditor` | integration test |
| 4.16 | `magic/packages/agent-graph/src/graph.ts` | Top-level `Graph`; nodes: indexer (4.6) → parallel: harness_detector (4.7), planner (4.8), security_auditor (4.9) → router (4.10) → one of swarms (4.12–4.15) → verifier (4.23) → reporter (4.11); every `AgentNode` receives shared `invocationState` `{ repoPath, manifest, planNotebookId, sessionId, workspaceId, conventions }`; SessionManager attached to every Agent; checkpoints injected | integration: end-to-end against fixture repo |
| 4.17 | `magic/packages/agent-graph/src/index.ts` | `createMagicGraph(opts: { sessionId, workspaceId, repoPath, storage, model, preset, costCap }): MagicGraph` factory; wires everything; `MagicGraph.invoke(task): Promise<AgentResult>` | end-to-end smoke |
| 4.18 | `magic/packages/agent-graph/src/prompts/{indexer,harness_detector,planner,security_auditor,router,reporter}.md` + per-swarm-member + per-tool | One file per agent/swarm member; each file exports `export const PROMPT_VERSION = '1.0.0'; export const SYSTEM_PROMPT = '...';` (template literal); JSDoc on each; `prompts/index.ts` aggregates | unit test: every prompt exported + has JSDoc + non-empty |
| 4.19 | `magic/packages/agent-graph/src/cost_tracker.ts` | `CostTracker` class; `recordUsage(model: ProviderId, inputTokens, outputTokens): void`; `getTotal(): number`; `checkCap(): { exceeded: boolean; remaining: number }`; throws `CostExceededError` when cap hit; per-session + global; pricing table per provider (USD per 1M tokens) loaded from `@magic/shared/pricing.ts` | unit test |
| 4.20 | `magic/packages/agent-graph/src/cancellation.ts` | `CancellationManager`; tracks in-flight `fileEditor` calls; on cancel, waits for current call to finish OR aborts via `AbortSignal`; on abort, attempts to restore file from `.magic/undo/<path>.<ts>` snapshot taken before each edit; emits `cancelled` state with reason | unit test: cancel mid-`fileEditor` → file state intact (snapshot restored) |
| 4.21 | `magic/packages/agent-graph/docs/adr/0001-topology.md`, `0002-session-log.md`, `0003-sandbox.md`, `0004-model-detection.md`, `0005-graph-versioning.md` | ADRs: graph+swarm topology rationale; JSONL/SQLite choice; local sandbox limits; provider priority; GraphVersion stamp on restore | manual review |
| 4.22 | `magic/packages/agent-graph/src/graph_versioning.ts` | `GraphVersion` const; `stampSession(sessionId, version)` writes `meta.graphVersion`; `restoreSession(id)` checks stored vs current; on mismatch, emits warning + replays under current (best-effort) | unit test |
| 4.23 | `magic/packages/agent-graph/src/agents/verifier.ts` | Top-level critic `Agent`; takes spec + diff as input; runs `tsc --noEmit` + lint + test + build via `repo_*` tools; returns `{ ok: boolean, issues: string[] }`; graph node between swarms and reporter | integration test: rejects broken diff, accepts good |
| 4.24 | `magic/packages/agent-graph/src/agents/git_operator.ts` | `Agent` with `bash` (git-policy filtered) + `gh` CLI; generates branch name (`magic/<date>-<slug>`), commit message (Conventional Commits), PR description (markdown template with checklist); opens draft PR via `gh pr create --draft`; checks CI status via `gh pr checks`; respects `git_policy` | integration test |
| 4.25 | `magic/packages/agent-graph/src/memory/codebase_kb.ts` | Per-workspace SQLite table `kb_entries(id, workspace_id, kind, key, value, confidence, source, updated_at)`; `add(entry)`, `get(kind, key)`, `search(query)`; exposed to agents as `memory_search` tool; persisted under `${dataDir}/kb/<workspaceId>.sqlite` | unit test: add + get + search; isolation between workspaces |
| 4.26 | `magic/packages/agent-graph/src/checkpoints.ts` | `gate(kind: 'plan' \| 'diff' \| 'destructive', payload: unknown): Promise<{ approved: boolean; reason?: string }>`; integrates with Strands `interrupts`; pauses graph; waits for WS message from client; resolves on approve/reject | unit test: halt + resume; rejection reason threaded back |
| 4.27 | `magic/packages/agent-graph/src/agents/convention_learner.ts` | On first contact with a workspace, calls (3.24); persists to (4.25); other agents read conventions at session start via `codebase_kb.get('convention', 'naming')` etc.; exposed to agents via `invocationState.conventions` | integration test |
| 4.28 | `magic/packages/agent-graph/src/events/versioning.ts` | `WsProtocolVersion = 1`; client sends `{ type: 'hello', version: 1 }` on connect; server rejects mismatched; emits `protocolError` event on mismatch; bumps require coordinated client+server release | unit test: mismatch rejected; matching accepted |

---

## Dependencies

- Phase 0–3 complete.

## Blocks

- Phase 5 (server wires `createMagicGraph`), Phase 6 (tests exercise agents + graph).
