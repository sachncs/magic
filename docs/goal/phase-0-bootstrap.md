# Phase 0 — Workspace bootstrap

13 items. Establishes the npm workspaces monorepo, TypeScript baseline, lint enforcement, env-var-as-code, auth primitives, and CI/CD scaffolding.

**Ships when**: `npm install` + `npm run lint` + `npm run typecheck` all clean; CI runs on PR; `.env.example` documents every env var.

---

## Items

| # | Path | What | Verification |
|---|---|---|---|
| 0.1 | `magic/package.json` | npm workspaces root; scripts: `dev`, `build`, `start`, `typecheck`, `lint`, `format`, `test`; `engines.node: ">=20"`; `workspaces: ["apps/*", "packages/*"]` | `npm install` clean; `npm run` lists all scripts |
| 0.2 | `magic/tsconfig.base.json` | Strict TS: `strict: true`, `target: "ES2023"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `verbatimModuleSyntax: true`, `lib: ["ES2023", "DOM", "DOM.Iterable"]` | `npx tsc -p tsconfig.base.json --noEmit` clean |
| 0.3 | `magic/.gitignore`, `.editorconfig`, `.nvmrc` | gitignore: `node_modules`, `dist`, `.magic/`, `*.tsbuildinfo`, `coverage`, `.env`. editorconfig: `*` LF, `*.{ts,tsx,js,jsx,json,md}` indent 2 spaces. nvmrc: `20` | manual review |
| 0.4 | `magic/STYLE_GUIDE.md` | Links to Google JS + TS style guides; lists our deviations (none for v1); references `gts` as enforcement; how to run lint locally | manual review |
| 0.5 | `magic/package.json` (lint scripts) | Install `gts` at root; add `npm run lint` → `gts lint`, `npm run format` → `gts fix`; commit baseline `.eslintrc` + `.prettierrc.js` from `gts init` | `npm run lint` passes on empty tree |
| 0.6 | `magic/{apps/web,packages/shared,packages/storage,packages/tools,packages/agent-graph,packages/web-shared}/package.json` + `src/index.ts` | Create stub dirs each with `package.json` (`name: "@magic/<name>"`, `type: "module"`, `main: "./src/index.ts"`) + empty `src/index.ts` | `ls apps packages` shows expected tree |
| 0.7 | `magic/.env.example` | All env vars (per README env-var table) with inline comments: data dir, persistence, presets, network, providers, sandbox, MCP, repo cap, model provider | manual review |
| 0.8 | `magic/LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md` | MIT LICENSE; CONTRIBUTING references STYLE_GUIDE + ADRs; COC = Contributor Covenant v2.1; CHANGELOG stub with `## [Unreleased]` heading | manual review |
| 0.9 | `magic/.github/dependabot.yml`, root `package.json` | Dependabot weekly for npm; `engines.node: ">=20"` in root | Dependabot config validates |
| 0.10 | `magic/packages/web-shared/src/ws_auth.ts` + `apps/web/src/server/ws.ts` | Generate session-scoped token on session create (UUIDv4); pass to client via `POST /api/sessions` response; `WS /ws/sessions/:id?token=<token>` validates token in first frame; close code 4401 on mismatch | unit test: WS rejects without token, accepts with valid token |
| 0.11 | `magic/packages/web-shared/src/auth.ts` + `apps/web/src/server/routes/auth_middleware.ts` | Read `MAGIC_API_TOKEN` at boot; Fastify middleware checks `Authorization: Bearer <token>` on all `/api/*` except `/api/health/*`; rejects 401 if missing/wrong | unit test: missing token → 401; valid token → 200; `/api/health/live` → 200 without token |
| 0.12 | `magic/docs/browser_support.md` | Browser support matrix: Chrome / Firefox / Safari / Edge latest 2 versions; minimum Node 20; no IE; no legacy mobile browsers | manual review |
| 0.13 | Root `package.json` | Add `repository`, `homepage`, `bugs`, `keywords` fields; cross-link via npm workspace tooling | `npm ls` shows all packages; `npm info @magic/shared` shows links |

---

## Dependencies

- None.

## Blocks

- All subsequent phases.
