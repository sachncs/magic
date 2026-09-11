# magic

> True agentic software engineering on any repository.

[![CI](https://github.com/sachncs/magic/actions/workflows/test.yml/badge.svg)](https://github.com/sachncs/magic/actions/workflows/test.yml)
[![Lint](https://github.com/sachncs/magic/actions/workflows/lint.yml/badge.svg)](https://github.com/sachncs/magic/actions/workflows/lint.yml)
[![Typecheck](https://github.com/sachncs/magic/actions/workflows/typecheck.yml/badge.svg)](https://github.com/sachncs/magic/actions/workflows/typecheck.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node 20+](https://img.shields.io/badge/node-%3E%3D20-339933)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)](https://www.typescriptlang.org/)

A Strands Agents-powered web app that consumes any repo and performs
true agentic software engineering on it: understand semantically,
plan, edit, verify at the build/typecheck/test level, open PRs, and
learn across sessions.

> **Project status.** `magic` is a personal tool maintained on a
> best-effort basis. The npm package `@magic/*` workspace set is not
> published; the \"magic\" name and `@magic` scope are internal
> conventions. v1 makes no commitment to package publication.
>
> Status: agent runners are stub heuristics. The graph topology,
> tool surface, and verifier pipeline are wired today; the LLM
> dispatcher behind them lands when the Strands SDK is integrated.

## Install

```bash
git clone https://github.com/sachncs/magic.git
cd magic
npm install
npm run dev
# → UI at http://localhost:5173
# → Fastify at http://localhost:4317
```

[Quickstart](#quickstart) ·
[Architecture](#architecture-one-line) ·
[Docs](./docs/architecture.md)

## Why magic

- **The problem.** Today's AI coding tools — autocomplete, single-shot
  chat, "agent in a tab" — plan, edit, and ship without verification
  gates. Reviews catch what they ship; tests catch what reviews miss.
- **The approach.** magic is an explicit agent graph (`indexer` →
  `harness_detector` + `planner` + `security_auditor` in parallel →
  `router` → swarm → `verifier` → `reporter`) where every edit must
  pass `typecheck + lint + test + build` before it can become a PR.
- **What you get.** Draft PRs that survive CI on the first push,
  with a branch name, Conventional Commits message, and a structured
  description.

## Capabilities

- **Understand** semantically (AST + call graph + conventions + prior knowledge)
- **Plan** with explicit checkpoint gates
- **Edit** with semantic awareness
- **Verify** at the level real SE demands: typecheck + lint + test + build
- **Iterate** when verification fails
- **Commit + PR** with branch name, message, description
- **Learn** — conventions, past fixes, project knowledge persist across sessions
- **Ask** — explicit approval gates before plan, diff, destructive ops
- **Queue** — multiple tasks per session, user-controlled order
- **Reproduce** UI bugs in a real browser (Playwright)
- **Measured** — eval regression harness catches quality drift

## Quickstart

```bash
# 1. Install
git clone https://github.com/sachncs/magic.git
cd magic
nvm use                # picks up Node 20 from .nvmrc
npm install

# 2. Configure
cp .env.example .env
$EDITOR .env          # set at least one model provider (see below)

# 3. Run
npm run dev
# → UI at http://localhost:5173
# → Fastify at http://localhost:4317
```

## Model providers

Set any of these and magic picks automatically (in priority order):

| Provider | Env vars |
|---|---|
| Local (Ollama / llama.cpp / any OpenAI-compatible) | `MAGIC_MODEL_PROVIDER` + `MAGIC_MODEL_BASE_URL` + `MAGIC_MODEL_NAME` |
| Amazon Bedrock | `AWS_BEARER_TOKEN_BEDROCK` (or `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`) |
| Anthropic | `ANTHROPIC_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google | `GOOGLE_API_KEY` |
| MiniMax | `MINIMAX_API_KEY` + `MINIMAX_BASE_URL` + `MINIMAX_MODEL` |

See `docs/providers.md` for per-provider setup notes.

## Architecture (one-line)

Graph orchestrator (`indexer` → parallel `harness_detector` / `planner` / `security_auditor` → `router`) dispatches into one of four Swarms (`explainer` / `coder` / `refactor` / `productionise`), then `verifier` (runs typecheck + lint + test + build), then `reporter`.

Every agent runs under a shared sandbox policy, persistent `SessionManager`, codebase knowledge base, and approval checkpoints.

See [docs/architecture.md](./docs/architecture.md) for the full topology, [docs/agentic_overview.md](./docs/agentic_overview.md) for what makes each capability agentic, and [`packages/agent-graph/docs/adr/`](./packages/agent-graph/docs/adr/) for the irreversible decisions.

## Repository layout

```
magic/
├── apps/web/                  # Fastify + React 19 SPA (only delivery surface)
└── packages/
    ├── shared/                # branded IDs, types, WS event union
    ├── storage/               # SessionManager + JSONL/SQLite persistence
    ├── tools/                 # repo/* + MCP + sandbox + AST + Playwright
    ├── agent-graph/           # Graph + agents + swarms + checkpoints + memory
    └── web-shared/            # types shared between Fastify and Preact
```

## Documentation

- [docs/architecture.md](./docs/architecture.md) — topology, data flow, capability seams
- [docs/agents.md](./docs/agents.md) — one paragraph per agent + swarm member
- [docs/providers.md](./docs/providers.md) — per-provider setup notes
- [docs/style.md](./docs/style.md) — code style + `gts` enforcement
- [docs/keyboard.md](./docs/keyboard.md) — keyboard shortcuts
- [docs/browser_support.md](./docs/browser_support.md) — supported browsers
- [docs/non-goals.md](./docs/non-goals.md) — what v1 does not do
- [docs/agentic_overview.md](./docs/agentic_overview.md) — what's agentic and how to extend

## Development

```bash
npm run dev           # start server + UI
npm run typecheck     # tsc --noEmit
npm run lint          # gts lint
npm run format        # gts fix
npm test              # unit + e2e tests
npm run test:e2e:browser  # Playwright
npm run test:a11y     # axe-core per route
npm run build         # vite build
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [STYLE_GUIDE.md](./STYLE_GUIDE.md).

## License

MIT — see [LICENSE](./LICENSE).
