# Agents

Every agent is a `MagicAgent` (see `packages/agent-graph/src/agent.ts`):
a system prompt + tool set + runner. The runner is a function
`(state, message) → AgentResult`. In v1 the runners call the local
tool surface directly; the Strands SDK can replace them with
model-driven agents without changing the graph topology.

## Indexer

**File**: `packages/agent-graph/src/agents/indexer.ts` (via `agents/index.ts`).
**Role**: Walk a repository and produce a `RepoManifest`. The first
node in every graph run; populates the shared `InvocationState.manifest`.

## Harness detector

**File**: `packages/agent-graph/src/agents/indexer.ts` (harnessDetectorAgent).
**Role**: Detect build/test/lint/format commands. Tries `package.json` →
`Makefile` → `pyproject.toml` → `Cargo.toml` → `go.mod`. Detects pnpm
via `pnpm-lock.yaml`.

## Planner

**File**: `packages/agent-graph/src/agents/indexer.ts` (plannerAgent).
**Role**: Produce a step-by-step plan as a notebook checklist. 3–8
steps for typical tasks; each step has a clear success condition.

## Security auditor

**File**: `packages/agent-graph/src/agents/indexer.ts` (securityAuditorAgent).
**Role**: Run `repo_security` (npm audit / pip-audit / secret scan)
and summarise findings.

## Convention learner

**File**: `packages/agent-graph/src/agents/indexer.ts` (conventionLearnerAgent).
**Role**: On first contact with a workspace, infer naming / error
handling / test pattern / import style and persist to the codebase
KB. Other agents read the KB before starting work.

## Router

**File**: `packages/agent-graph/src/agents/indexer.ts` (routerAgent).
**Role**: Classify the user's intent and dispatch to a swarm. Tools
are the four swarms (passed via `.asTool()` in the Strands
integration). The default is `coder` (most general).

## Verifier

**File**: `packages/agent-graph/src/agents/indexer.ts` (verifierAgent).
**Role**: Run `typecheck` + `lint` + `test` + `build` on the diff.
Return `{ok: boolean, issues: string[]}`. Conservative: rejects on
any failure. The graph layer retries the previous swarm when
verifier rejects.

## Git operator

**File**: `packages/agent-graph/src/agents/indexer.ts` (gitOperatorAgent).
**Role**: Generate branch name (`magic/<date>-<slug>`), commit
message (Conventional Commits), PR description (markdown template).
Use `gh pr create --draft`; check CI via `gh pr checks`. Respects
`git_policy` (denies `push --force`, `reset --hard`, etc).

## Reporter

**File**: `packages/agent-graph/src/agents/indexer.ts` (reporterAgent).
**Role**: Synthesise the swarm's output into a markdown report
with sections: Summary, Changes, Verification, Next Steps.

## Swarms

### Explainer

`indexer → planner → reporter`. Read-only codebase understanding
with a written summary.

### Coder

`indexer → planner → verifier → git_operator → reporter`.
Implement a feature or fix a bug end-to-end with verification and
PR. Cyclic retry on verifier failure.

### Refactor

`indexer → planner → verifier → reporter`. Multi-file refactor
with impact analysis (uses `ast_search` + `call_graph` for impact
mapping in the Strands integration).

### Productionise

`indexer → planner → reporter`. Generates Dockerfile, CI config,
observability suggestions, and a security review.

## Prompts

Every system prompt is a versioned constant in
`packages/agent-graph/src/prompts/index.ts`. Bumping the prompt
without bumping the graph version will trigger a warning on
restore; bump `GRAPH_VERSION` when agent behaviour changes
materially.
