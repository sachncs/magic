# Phase 7 — Docs

8 items. README, architecture, agent roster, providers, style, non-goals, agentic overview, keyboard reference. Every doc reviewed.

**Ships when**: every doc reviewed; `agentic_overview.md` explains what's agentic vs not; `non-goals.md` is current.

---

## Items

| # | Path | What | Verification |
|---|---|---|---|
| 7.1 | `magic/README.md` | Quickstart (`npm install && npm run dev`); prerequisites (Node 20, optionally `uvx` for MCP); env var table link to `.env.example`; provider setup links to `docs/providers.md`; architecture diagram; link to `docs/agentic_overview.md`; link to `docs/keyboard.md`; link to `STYLE_GUIDE.md`; link to `docs/non-goals.md` | manual review |
| 7.2 | `magic/docs/architecture.md` | Topology diagram (graph + swarms); capability seams table (model, tools, sandbox, sessions, KB, checkpoints); agent roster with one-line summary each; data flow (request → router → swarm → verifier → reporter → WS → UI) | manual review |
| 7.3 | `magic/docs/agents.md` | One paragraph per agent: indexer, harness_detector, planner, security_auditor, router, reporter, verifier, git_operator, convention_learner; one paragraph per swarm member (4 swarms × 3–4 members each); cross-references to prompt files in `packages/agent-graph/src/prompts/` | manual review |
| 7.4 | `magic/docs/providers.md` | Per-provider setup notes: Bedrock (AWS creds + region), Anthropic (API key), OpenAI (API key), Google (API key), MiniMax (API key + base URL + model), Ollama (install + pull), llama.cpp (server launch), any-OpenAI-compatible (base URL + name + optional key); detection order matches `buildModel()` | manual review |
| 7.5 | `magic/docs/style.md` | Links to `STYLE_GUIDE.md` and Google guides; lists any project-specific deviations (none for v1); references `gts`; example of correct file structure | manual review |
| 7.6 | `magic/docs/non-goals.md` | Explicit list of what's NOT in v1 with rationale + "when we'd revisit": multi-user, mobile-native, plugin marketplace, custom themes, cloud sync, multi-tenancy, billing, audit log export, PR review of others' PRs, multi-PR stacking, embedding-based generation, remote sandbox, i18n, telemetry | manual review |
| 7.7 | `magic/docs/agentic_overview.md` | What's agentic (and what makes each capability agentic): verifier loop, git_operator PR, codebase_kb persistence, checkpoints, AST search, convention learner, task queue, Playwright; what's NOT agentic (raw chat without verification, no PR workflow, no memory); how to extend each capability (add a new verifier check, add a new convention kind, add a new swarm); eval harness usage (where the suite lives, how to add a task, how to update baseline) | manual review |
| 7.8 | `magic/docs/keyboard.md` | Keyboard shortcuts reference: `Cmd+K` palette, `Cmd+/` trajectory toggle, `Cmd+Shift+P` PR preview, `Cmd+Z` undo last edit, `Cmd+.` cancel session, `Esc` close modals; cross-platform note (Cmd on macOS, Ctrl elsewhere); per-route additional shortcuts | manual review |

---

## Dependencies

- Phases 0–6 complete (docs reference implemented behaviour).

## Blocks

- v1 ship.
