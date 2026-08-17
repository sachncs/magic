# Agentic overview

What makes magic "agentic" — and what's not — plus how to extend each capability.

## TL;DR

magic is **agentic** when it can: (1) understand the codebase
semantically, (2) plan, (3) edit with semantic awareness, (4) verify
at the level real SE demands (typecheck + lint + test + build), (5)
iterate when verification fails, (6) commit and open a PR, (7) learn
across sessions, (8) ask for approval at plan/diff/destructive gates,
(9) queue multiple tasks, (10) reproduce UI bugs in a real browser,
(11) be measured for quality regression.

It is **not** fully autonomous: it asks for approval at every
high-impact decision and surfaces every change for review.

## What each agentic capability does

### 1. Semantic code understanding

`indexer` produces a `RepoManifest` (files, languages, deps, harness).
`ast_search` finds symbols (TS/JS, Python, Go). `call_graph` returns
caller/callee relationships. `monorepo_index` detects workspace
structure. `semantic_search` does term-overlap ranking (embeddings
slot in behind the same interface later).

### 2. Plan with explicit checkpoint gates

`planner` writes a step-by-step notebook. The graph halts at a
`plan` checkpoint and waits for user approval via the WS handler.
Rejected plans include the reason in the next agent invocation.

### 3. Edit with semantic awareness

Agents use `ast_search` and `call_graph` to find target sites. The
concurrent-writes guard serialises same-path edits; the second
writer wins and an audit entry is appended.

### 4. Verify at the level real SE demands

`verifier` runs `tsc --noEmit` + lint + test + build via the harness.
A conservative rejection: any failure is a hard fail. The graph
retries the previous swarm on rejection.

### 5. Iterate when verification fails

`coder_swarm` has a cyclic edge from `verifier` back to the
implementer when tests fail. The graph layer detects the rejection
and re-invokes; the cycle is bounded by `MAGIC_COST_CAP_USD`.

### 6. Commit + open a PR

`git_operator` generates a branch name (`magic/<date>-<slug>`),
Conventional Commits message, and a PR description (Summary /
Changes / Verification / Next Steps). Uses `gh pr create --draft`;
checks CI via `gh pr checks`. Respects `git_policy` (denies
`push --force`, `reset --hard`, etc).

### 7. Learn across sessions

`codebase_kb` persists per-workspace entries. `convention_learner`
runs once per workspace; other agents read the KB at session start.
The session log itself is the canonical history; restore replays it.

### 8. Approval gates

Three kinds of checkpoint:
- `plan` — halt after planning, wait for approval
- `diff` — halt before applying a diff, show the patch
- `destructive` — halt before any destructive op (rm, force-push, etc)

WS message from the client calls `resolveCheckpoint(id, approved,
reason)`. Rejected checkpoints return the reason to the agent.

### 9. Queue multiple tasks

`meta.queuedTasks` is a list; user can reorder, cancel one task
without ending the session, and "Run next" dispatches the next
task. Each task gets its own cost / tokens / result.

### 10. Reproduce UI bugs

`playwright` tool drives headless Chromium for navigate/click/
screenshot/evaluate/console. Sandboxed to `localhost` by default
(`MAGIC_PLAYWRIGHT_DOMAINS`).

### 11. Measured for quality

`tests/eval/` ships a 12-task baseline across all 4 swarms. CI fails
if the pass rate drops. New tasks can be added by appending to
`TASKS`; the baseline is frozen.

## What is NOT agentic

- **No autonomous multi-PR stacking** — see non-goals
- **No reviewing others' PRs** — see non-goals
- **No self-training** — we use off-the-shelf models
- **No multi-day autonomous runs** — sessions have cost caps

## How to extend each capability

### Add a new verifier check

`packages/agent-graph/src/agents/indexer.ts` (verifierAgent). Add
a new tool call (e.g. `repo_audit`) to the runner; append issues
to the array; return `{ok, issues}`.

### Add a new convention kind

`packages/tools/src/convention_infer.ts` — add a new axis to
`InferredConventions` and update the heuristic. Then update
`convention_learner` agent to persist the new kind.

### Add a new swarm

1. Write the agent(s) in `packages/agent-graph/src/agents/`.
2. Compose the swarm in `packages/agent-graph/src/swarms/index.ts`
   using `buildSwarm(id, description, agents)`.
3. Add the swarm to the router's tool list.
4. Add an edge in `graph.ts` from `router` to your new swarm.
5. Add a test in `tests/eval/`.

### Add a new tool

1. Define the tool in `packages/tools/src/` with `tool()` factory.
2. Add it to the `createSandboxedTools` factory in
   `packages/tools/src/index.ts`.
3. Pass the tool to the agent(s) that should use it.

### Add a new model provider

1. Add the provider id to `PROVIDER_IDS` in
   `packages/shared/src/types/pricing.ts`.
2. Add a detection branch in `buildModel()` in
   `packages/agent-graph/src/model.ts`.
3. Add a price entry to `PRICING` in
   `packages/shared/src/types/pricing.ts`.
4. Add a unit test in `tests/e2e/multi_provider.test.ts`.
5. Add a provider card to `apps/web/src/routes/settings/models.tsx`.
6. Document in `docs/providers.md`.

## Why a verifier step matters

A model that writes code without verification is a fancy search-and-
replace tool. The verifier is what makes magic "agentic" — it
rejects the model's work when it doesn't pass typecheck, lint, test,
and build. Without the verifier, the graph would happily ship
broken code with a confident-sounding commit message.

If you remove the verifier from the graph, you have removed the most
important agentic property of the system. Don't do that.
