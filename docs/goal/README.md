# magic — atomic plan

A Strands Agents-powered web app that consumes any repo and performs true agentic software engineering on it: understand semantically, plan, edit, verify at the build/typecheck/test level, open PRs, learn across sessions.

This directory is the implementation contract. Walk phases 0 → 7 in order. Each phase is self-contained and ships before the next begins.

## Project layout

```
magic/
├── package.json                # npm workspaces root
├── tsconfig.base.json
├── apps/web/                   # Fastify + React 19 SPA (only delivery surface)
└── packages/
    ├── shared/                 # branded IDs, types, event union
    ├── storage/                # SessionManager + JSONL/SQLite persistence
    ├── tools/                  # repo/* + MCP + sandbox + AST + Playwright
    ├── agent-graph/            # Graph + agents + swarms + checkpoints + memory
    └── web-shared/             # types shared between Fastify and Preact
```

## Topology (one-line summary)

Graph orchestrator (indexer → harness/planner/security → router → reporter) dispatches into Swarms (explainer / coder / refactor / productionise). Every agent runs under shared sandbox policy, persistent SessionManager, codebase knowledge base, and approval checkpoints.

Full architecture: see `phase-4-agent-graph.md` and ADRs in `packages/agent-graph/docs/adr/`.

## Phases

| Phase | File | Items | Ships when |
|---|---|---:|---|
| 0 | [phase-0-bootstrap.md](./phase-0-bootstrap.md) | 13 | `npm install` + `npm run lint` + `npm run typecheck` clean; CI runs on PR |
| 1 | [phase-1-shared.md](./phase-1-shared.md) | 8 | All types/brands compile, unit tests pass, consumed by other packages without circular deps |
| 2 | [phase-2-storage.md](./phase-2-storage.md) | 15 | Both persistence backends round-trip; FTS5 search works; WAL enforced; migrations replay old schemas |
| 3 | [phase-3-tools.md](./phase-3-tools.md) | 26 | Every tool unit-tested; sandbox + spill + network-guard compose without conflicts; AST/monorepo/semantic tools work on fixture |
| 4 | [phase-4-agent-graph.md](./phase-4-agent-graph.md) | 28 | Full graph runs end-to-end on fixture; verifier rejects broken diffs; git_operator produces valid PR; codebase_kb persists; checkpoints halt/resume |
| 5 | [phase-5-web.md](./phase-5-web.md) | 55 | Vite dev server boots; prod build < 500 MB image; all routes pass Playwright + axe-core; WS auth + bearer auth enforced |
| 6 | [phase-6-tests.md](./phase-6-tests.md) | 30 | All tests pass in CI; eval harness reports ≥ baseline pass rate; Playwright + axe clean |
| 7 | [phase-7-docs.md](./phase-7-docs.md) | 8 | Every doc reviewed; agentic_overview explains what's agentic vs not; non-goals is current |

**Total: 183 atomic items across 8 phases.**

## Acceptance plan — definition of done for v1

### Functional

- [ ] `npm install && npm run dev` boots; UI `localhost:5173`, Fastify `localhost:4317`
- [ ] All 6 model providers selectable via env; missing-provider error if none set
- [ ] Pre-flight rejects models without tool-use / streaming
- [ ] `POST /api/sessions` accepts URL or local path; repo cached per `MAGIC_KEEP_REPO`
- [ ] Repo size cap enforced; oversized repos rejected with clear error
- [ ] All 4 swarms (explainer / coder / refactor / productionise) reach `verifier` then `reporter` on fixture
- [ ] `verifier` runs `typecheck` + `lint` + `test` + `build`; rejects broken diffs
- [ ] `git_operator` generates branch + commit + PR description; opens draft PR
- [ ] Codebase knowledge base persists across sessions; recalled on relevant prompts
- [ ] Approval checkpoints halt at plan, diff, destructive op; resume on user click
- [ ] AST-aware search (`ast_search`, `call_graph`) used by default when language supports
- [ ] Convention learner infers naming/error/test patterns on first repo contact
- [ ] Task queue: queue multiple tasks; reorder; cancel one without killing session
- [ ] Playwright tool reproduces UI bugs in real browser
- [ ] `POST /api/sessions/:id/cancel` halts mid-flight; no half-edited files
- [ ] Server restart → restore session; messages + notebooks reappear (JSONL + SQLite)
- [ ] SQLite WAL mode enforced
- [ ] Permission preset switch fans out to sandbox + approval
- [ ] Git destructive commands (`push --force`, `reset --hard`, `clean -fd`) blocked
- [ ] Concurrent `fileEditor` on same file → second-wins + audit entry
- [ ] Tool output > spill threshold → spilled; full output retrievable via locator
- [ ] WS reconnect from `last-event-id`; no missed events
- [ ] Two tabs on same session: one writer, others read-only
- [ ] Per-session cost cap configurable; session halts at cap
- [ ] Provider fallback chain: if primary fails N times, try secondary
- [ ] Sandbox resource limits enforced (memory/CPU/disk)
- [ ] Schema migrations replay old sessions correctly
- [ ] WS + REST auth: session token / bearer required
- [ ] Artifact export: deliverables downloadable as patch or tarball

### Non-functional

- [ ] `npm run lint` (`gts`) passes
- [ ] `npm run typecheck` passes
- [ ] All Phase 6 e2e + UI + a11y + eval tests pass in CI
- [ ] axe-core per route: 0 violations
- [ ] Playwright smoke per route
- [ ] CSP on Fastify static; CORS allowlist; rate limit on `/api/*`
- [ ] `.env.example` ships with all env vars + comments
- [ ] Structured logging via pino with request-id correlation
- [ ] Cost displayed live in UI; tokens × provider pricing
- [ ] Undo last `fileEditor` from UI (per session)
- [ ] Keyboard shortcuts work end-to-end
- [ ] Empty / error / loading states on every route
- [ ] Browser support matrix documented

### Documentation

- [ ] `README.md`, `docs/architecture.md`, `docs/agents.md`, `docs/providers.md`, `docs/style.md`, `docs/non-goals.md`, `docs/agentic_overview.md` complete
- [ ] Every system prompt in `packages/agent-graph/src/prompts/`
- [ ] ADRs 0001–0005 (topology, session log, sandbox, model detection, Graph versioning)
- [ ] `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`

### Operational

- [ ] Root `Dockerfile` (multi-stage; image < 500 MB)
- [ ] `docker-compose.dev.yml` (Fastify + Ollama)
- [ ] GitHub Actions: lint, typecheck, test, build, docker, a11y
- [ ] Dependabot weekly; `engines.node` in root `package.json`
- [ ] `/api/health/live` + `/api/health/ready` split

## Universal style rules (apply to every item)

**Files & naming**
- UTF-8, LF, no tabs, no trailing whitespace
- File order: `@fileoverview` JSDoc → imports → implementation, single blank line between sections
- File names: `snake_case.ts` for non-component TS; `PascalCase.tsx` for React components; `kebab-case` allowed for tooling files (Dockerfile, .github, etc.)
- `const` by default, `let` only when reassigning, never `var`; one variable per declaration

**Formatting**
- 80-column limit, 2-space indent, semicolons required
- Single quotes for ordinary strings, template literals for interpolation/multi-line
- Trailing commas in multi-line array/object literals
- Braces always (except trivial single-line `if`); K&R style; empty blocks `{}`
- No line continuations (`\`); `Number()` to parse numbers, never unary `+` or `parseInt` for base 10

**Modules**
- Named exports only — **no default exports anywhere**
- `import type { ... }` for type-only imports
- No `namespace`, no `require()`, no `import x = require(...)`
- No `export let` (mutable exports)

**Classes**
- No `#private` fields — use TS `private`
- `readonly` on never-reassigned members
- No `public` modifier (default)
- Parameter properties encouraged
- Class declarations: no semicolon after `}`; methods separated by single blank line

**Functions**
- Function declarations for named functions; arrow functions for callbacks/nested
- Block bodies when return value unused
- `===`/`!==` only; never `this` in static methods; no `prototype` manipulation

**Documentation**
- JSDoc on all exported symbols
- Block comments can be `/* */` or `//`; JSDoc is `/** */` only

**Component-specific (apps/web)**
- React 19 function components; `PascalCase.tsx`
- Tailwind v4 utilities; `cn()` from shadcn
- TanStack Router (file-based) for routes, TanStack Query for server state, Zustand for UI state

**Formatting enforcement**
- `gts` (Google TypeScript Style) installed in Phase 0; provides ESLint + Prettier configs matching the guides
- `npm run lint` and `npm run format` scripts

## Env vars (reference)

| Var | Default | Purpose |
|---|---|---|
| `MAGIC_DATA_DIR` | `./.magic` | Root for sessions, repos, spill, KB |
| `MAGIC_KEEP_REPO` | `true` | Cache cloned repos under `${DATA_DIR}/repos/<hash>/` |
| `MAGIC_PERSISTENCE` | `jsonl` | `jsonl` \| `sqlite` |
| `MAGIC_PERMISSION_PRESET` | `workspace-write` | `read-only` \| `workspace-write` \| `danger-full-access` |
| `MAGIC_NETWORK_MODE` | `open` | `open` \| `localhost-only` (tool-mediated egress) |
| `MAGIC_API_TOKEN` | *(none)* | Bearer token for REST auth (required when not on localhost) |
| `MAGIC_MAX_REPO_MB` | `500` | Repo size cap for `cloneOrAttach` |
| `MAGIC_MODEL_PROVIDER` | *(none)* | Local: `ollama` \| `openai-compat` \| `llamacpp` |
| `MAGIC_MODEL_BASE_URL` | `http://localhost:11434/v1` | OpenAI-compatible endpoint (local) |
| `MAGIC_MODEL_NAME` | `qwen2.5-coder:14b` | Model id (Ollama tag or upstream name) |
| `MAGIC_MODEL_API_KEY` | *(empty)* | Optional local-endpoint key |
| `MAGIC_BEDROCK_MODEL_ID` | `global.anthropic.claude-sonnet-4-6` | Bedrock model id |
| `MAGIC_PROVIDER_FALLBACK` | *(none)* | Comma-separated fallback chain (e.g. `openai,anthropic`) |
| `PORT` | `4317` | Fastify port |
| `AWS_*` / `AWS_BEARER_TOKEN_BEDROCK` | — | Bedrock creds |
| `ANTHROPIC_API_KEY` | — | Anthropic |
| `OPENAI_API_KEY` | — | OpenAI |
| `GOOGLE_API_KEY` | — | Google |
| `MINIMAX_API_KEY` + `MINIMAX_BASE_URL` + `MINIMAX_MODEL` | — | MiniMax |

**Detection order in `buildModel()`** (first match wins):
1. `MAGIC_MODEL_PROVIDER` set → local model
2. `AWS_BEARER_TOKEN_BEDROCK` or AWS creds → Bedrock
3. `ANTHROPIC_API_KEY` → Anthropic
4. `OPENAI_API_KEY` → OpenAI
5. `GOOGLE_API_KEY` → Google
6. `MINIMAX_API_KEY` + `MINIMAX_BASE_URL` + `MINIMAX_MODEL` → MiniMax
7. None → throw onboarding error

## Non-goals (v1)

Documented in `docs/non-goals.md`:
- Multi-user / accounts / RBAC / SSO
- Mobile-native app (mobile-responsive web only)
- Plugin marketplace / third-party plugin authoring
- Custom themes
- Cloud sync / multi-device
- Multi-tenancy
- Billing / quotas beyond local cost cap
- Audit log export
- PR review of others' PRs (only opens own)
- Multi-PR stacking
- Codebase embedding-based *generation* (only search)
- Remote / cloud sandbox backends
- i18n / l10n of UI strings (English only)
- Product telemetry / analytics

## How to use this plan

1. Start at phase 0, item 0.1. Do not skip ahead.
2. Each item has `Path` (where it lives), `What` (what to build), `Verification` (how to know it's done).
3. The "Ships when" at the top of each phase is the gate to start the next phase.
4. If a phase ships but later items depend on later-phase work, that's fine — the phase is the unit of intermediate completion.
5. ADRs in `packages/agent-graph/docs/adr/` document the irreversible decisions (topology, session log, sandbox, model detection, Graph versioning). Read them before deviating.
