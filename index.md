---
layout: default
title: magic
description: "magic — agentic software engineering on any repository."
---

# magic

True agentic software engineering on any repository.

magic is a Strands Agents-powered web app that consumes any repo and
performs end-to-end software engineering on it: understand semantically,
plan, edit, verify at the build/typecheck/test level, open PRs, and
learn across sessions.

## Documentation

- [Architecture](https://github.com/sachncs/magic/blob/main/docs/architecture.md) — graph topology and data flow
- [Agentic overview](https://github.com/sachncs/magic/blob/main/docs/agentic_overview.md) — what's agentic and how to extend each capability
- [Agents reference](https://github.com/sachncs/magic/blob/main/docs/agents.md) — one paragraph per agent + swarm member
- [Model providers](https://github.com/sachncs/magic/blob/main/docs/providers.md) — per-provider env-var setup
- [Style guide](https://github.com/sachncs/magic/blob/main/docs/style.md) — code style + `gts` enforcement
- [Keyboard shortcuts](https://github.com/sachncs/magic/blob/main/docs/keyboard.md)
- [Browser support](https://github.com/sachncs/magic/blob/main/docs/browser_support.md)
- [Non-goals](https://github.com/sachncs/magic/blob/main/docs/non-goals.md) — what v1 does not do

### Architecture decision records

The irreversible design decisions live in
[`packages/agent-graph/docs/adr/`](https://github.com/sachncs/magic/tree/main/packages/agent-graph/docs/adr):

- ADR-0001: graph topology (indexer → harness/planner/security → router → swarm → verifier → reporter)
- ADR-0002: session log format
- ADR-0003: sandbox policy
- ADR-0004: model detection chain
- ADR-0005: graph versioning

## Project status

`magic` is a personal tool maintained on a best-effort basis. The
`@magic/*` workspace set is internal; v1 makes no commitment to
package publication. Agent runners are currently stub heuristics; the
LLM dispatcher behind them lands when the Strands SDK is integrated.

## Source

The canonical source for this project lives at
[`sachncs/magic`](https://github.com/sachncs/magic).
See the README there for installation, usage, and contribution instructions.