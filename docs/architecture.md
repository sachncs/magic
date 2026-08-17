# Architecture

## Topology

```
                            ┌──────────────┐
                            │   indexer    │  emits RepoManifest
                            └──────┬───────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
          ┌─────────────────┐ ┌─────────┐ ┌────────────────────┐
          │harness_detector │ │ planner │ │ security_auditor   │
          └────────┬────────┘ └────┬────┘ └─────────┬──────────┘
                   │              │                │
                   └──────────────┼────────────────┘
                                  ▼
                          ┌──────────────┐
                          │    router    │  classifies intent
                          └──────┬───────┘
                                 │  (one of:)
            ┌────────┬───────────┼────────┬───────────┐
            ▼        ▼           ▼        ▼           ▼
       explainer   coder      refactor  productionise
        swarm     swarm       swarm      swarm
            │        │           │        │
            └────────┴─────┬─────┴────────┘
                            ▼
                    ┌──────────────┐
                    │   verifier   │  typecheck + lint + test + build
                    └──────┬───────┘
                           ▼
                    ┌──────────────┐
                    │   reporter   │  synthesises final report
                    └──────────────┘
```

## Capability seams

The agent runtime composes the following capability seams (each
pluggable via a service + providers + consumers pattern, per the
Strands `Capability` model):

| Seam | Purpose | Notes |
|---|---|---|
| `model` | LLM provider | Bedrock, Anthropic, OpenAI, Google, MiniMax, Ollama, llama.cpp |
| `tools` | Tool surface | repo index/search/read, bash, AST, call graph, Playwright, MCP docs |
| `sandbox` | Shell tool confinement | CWD-locked + destructive denylist + resource limits |
| `session` | Persistent per-session state | SessionManager + FileStorage |
| `kb` | Codebase knowledge base | SQLite per workspace |
| `checkpoints` | Approval gates | plan / diff / destructive |
| `prompts` | System prompt per agent | Version-controlled in `src/prompts/` |

## Data flow

```
User → composer → POST /api/sessions/:id/invoke
                  ↓
            Fastify route → agent graph run()
                  ↓
            InvocationState (shared) flows through every node
                  ↓
            Agent runners produce AgentResult
                  ↓
            Strands hooks emit WsEvent[] to subscribers
                  ↓
            @fastify/websocket pushes frames to /ws/sessions/:id
                  ↓
            useWebSocket() in the React client dispatches into
            TanStack Query cache → components re-render
```

## State ownership

- **Server state** (sessions, messages, manifests): TanStack Query
- **UI state** (palette open, drawer, current selection): Zustand
  (persisted subset)
- **URL state** (active session id, settings tab): TanStack Router

## Sandbox policy

Every `bash`, `fileEditor`, and `fileRead` tool reads the shared
`SandboxPolicy` singleton (set by the current `PermissionPreset`).
Switching presets fans out one event to all three tools.

| Preset | sandboxMode | approvalPolicy | writableRoots |
|---|---|---|---|
| read-only | read-only | destructive-only | `[]` |
| workspace-write | workspace-write | destructive-only | `[repoPath]` |
| danger-full-access | full | never | `undefined` |

Network mode (`MAGIC_NETWORK_MODE`) restricts `httpRequest`, the
MCP docs client, and external security-tool calls to
`localhost` / `127.0.0.1` / `::1` when set to `localhost-only`. Model
provider calls are always allowed.

## Data persistence

- `meta.json` per session: status, current node, cost, queued tasks, etc.
- `records.jsonl` per session (default) or `sessions.sqlite` (FTS5)
- `audit.log` for file-edit audit trail
- `workspaces.json` for the workspace registry
- `kb/<workspaceId>.jsonl` per workspace for the KB

## Failure modes

| Failure | Behaviour |
|---|---|
| Model provider 429 | Retry with exponential backoff, swap to fallback after N attempts |
| Model provider down | All providers fail → `ModelNotConfiguredError` on startup; runtime error if mid-session |
| Tool exceeds memory | Subprocess killed; error returned to agent |
| File edit lost in race | `withFileLock` serialises; second writer wins, audit entry appended |
| User cancels mid-edit | `cancelEdit` restores from snapshot; UI shows cancelled state |
| Cost cap exceeded | `CostExceededError` halts the session; UI shows halted state |
| Out-of-band git push --force | `git_policy` denies at tool boundary; surface error to agent |
