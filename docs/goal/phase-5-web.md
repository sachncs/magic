# Phase 5 — `apps/web`

55 items. The only delivery surface: Fastify server + React 19 SPA + Vite + shadcn/ui + Tailwind v4 + TanStack Router/Query + Zustand. Auth (bearer + WS session token), security middleware, structured logging, Docker, GitHub Actions, all UI affordances for agentic autonomy.

**Ships when**: Vite dev server boots; production build produces < 500 MB Docker image; all routes pass Playwright + axe-core; WS auth + bearer auth enforced; cost cap UI live; PR preview + approval gates + memory browser + task queue all wired; artifact export works.

---

## 5a — Server (Fastify)

| # | Path | What | Verification |
|---|---|---|---|
| 5.1 | `magic/apps/web/package.json` | `name: "@magic/web"`; deps: `fastify`, `@fastify/websocket`, `@fastify/static`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/helmet`, `pino`, `pino-pretty`, `preact`, `@tanstack/react-query`, `@tanstack/react-router`, `zustand`, `react-hook-form`, `@hookform/resolvers`, `sonner`, `next-themes`, `tailwindcss`, `@tailwindcss/vite`, `@radix-ui/react-*` (per shadcn install), `lucide-react`, `shiki`, `clsx`, `tailwind-merge`, `class-variance-authority`, `concurrently`, `tsx`, `@magic/shared`, `@magic/storage`, `@magic/agent-graph`, `@magic/web-shared` | `npm install` clean |
| 5.2 | `magic/apps/web/vite.config.ts` | Vite config with `@vitejs/plugin-react`, `@tailwindcss/vite`, `path.resolve(__dirname, '../../packages/*/src')` aliases for `@magic/*`; `server.proxy`: `{ '/api': 'http://localhost:4317', '/ws': { target: 'ws://localhost:4317', ws: true } }` | `npm run dev:ui` boots; HMR works |
| 5.3 | `magic/apps/web/tsconfig.json` + `tsconfig.node.json` | Extends base; `jsx: "react-jsx"`, `noEmit: true` (Vite handles); `tsconfig.node.json` for `vite.config.ts` | `tsc --noEmit` clean |
| 5.4 | `magic/apps/web/tailwind.config.ts` + `src/index.css` | Tailwind v4 CSS-first config in `index.css` via `@theme`; shadcn CSS variables (`--background`, `--foreground`, `--primary`, etc.); dark mode via `.dark` class | `npx shadcn@latest add button` works; theme switches |
| 5.5 | `magic/apps/web/components.json` | `{ "$schema": "https://ui.shadcn.com/schema.json", "style": "new-york", "rsc": false, "tsx": true, "tailwind": { "config": "", "css": "src/index.css", "baseColor": "neutral", "cssVariables": true, "prefix": "" }, "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }, "iconLibrary": "lucide" }` | shadcn CLI happy |
| 5.6 | `magic/apps/web/src/server/server.ts` | Fastify app factory `buildServer(opts): FastifyInstance`; registers plugins (5.13–5.16), routes (5.7–5.11), WS (5.12); serves `${__dirname}/../dist` as static after `vite build`; reads env, calls `buildModel()` for readiness probe; graceful shutdown closes all SessionManagers | `npm run dev:server` boots; `/api/health/ready` returns 200 |
| 5.7 | `magic/apps/web/src/server/routes/sessions.ts` | `POST /api/sessions { repo, task }` → creates SessionId, generates WS token, calls `createMagicGraph`, returns `{ sessionId, wsToken }`; `GET /api/sessions` → list with summaries from storage; `GET /api/sessions/:id` → full meta + message history; `DELETE /api/sessions/:id` → removes session dir | integration test per route |
| 5.8 | `magic/apps/web/src/server/routes/invoke.ts` | `POST /api/sessions/:id/invoke { message }` → restores SessionManager from storage, attaches to fresh graph, invokes; supports multi-turn | integration test |
| 5.9 | `magic/apps/web/src/server/routes/cancel.ts` | `POST /api/sessions/:id/cancel` → `agent.cancel()` + AbortSignal; updates meta.status; emits `cancelled` event on WS | unit test |
| 5.10 | `magic/apps/web/src/server/routes/search.ts` | `GET /api/sessions?q=<query>` → delegates to storage `searchAllSessions`; returns `{ sessionId, snippet, score }[]` | integration test |
| 5.11 | `magic/apps/web/src/server/routes/health.ts` | `GET /api/health/live` → 200 always; `GET /api/health/ready` → 200 if model probe succeeds and data dir writable, 503 otherwise | curl both |
| 5.12 | `magic/apps/web/src/server/ws.ts` | `WS /ws/sessions/:id?token=<token>`; validates token (5.10); subscribes to Strands graph hooks; forwards events per WS union (1.6); tracks `last-event-id` for reconnect (5.33); per-session single-writer lock (5.46); secondary clients (same session) get read-only stream | manual + e2e (6.13, 6.19) |
| 5.13 | `magic/apps/web/src/server/security/csp.ts` | Fastify hook on `onSend` for static responses; sets `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` | unit test |
| 5.14 | `magic/apps/web/src/server/security/cors.ts` | `@fastify/cors` config: `origin: env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173']`, `credentials: true` | unit test |
| 5.15 | `magic/apps/web/src/server/security/rate_limit.ts` | `@fastify/rate-limit`: `max: 100`, `timeWindow: '1 minute'`, applied to `/api/*` (excl. health) | unit test |
| 5.16 | `magic/apps/web/src/server/logging.ts` | pino with `pino-pretty` in dev, JSON in prod; request-id via `gen-request-id` + `request-id` header propagated; structured fields: `sessionId`, `userId`, `toolName`, `durationMs` | unit test: request-id flows |
| 5.17 | `magic/Dockerfile` | Multi-stage: `node:20-alpine` builder → runtime; copies `dist` + `node_modules`; `EXPOSE 4317`; `CMD ["node", "dist/apps/web/server/server.js"]`; target < 500 MB | `docker build`; `docker images` shows size |
| 5.18 | `magic/docker-compose.dev.yml` | Services: `app` (Fastify), `ollama` (ollama/ollama:latest); shared volume `${MAGIC_DATA_DIR:-./.magic}:/app/.magic`; `app` depends on `ollama`; port mapping `4317:4317`, `11434:11434` | `docker compose up` brings both up |
| 5.19 | `magic/.github/workflows/lint.yml`, `test.yml`, `build.yml`, `docker.yml`, `a11y.yml` | Each: `on: push, pull_request`; `runs-on: ubuntu-latest`; checkout + setup-node 20 + cache + install + run; `docker.yml` only on main branch | push → actions run; status checks visible on PR |
| 5.20 | `magic/.dockerignore` | `node_modules`, `dist`, `.magic`, `*.log`, `.env`, `.git`, `coverage`, `docs/goal` | manual |

## 5b — UI (React 19 + TanStack Router)

| # | Path | What | Verification |
|---|---|---|---|
| 5.21 | `magic/apps/web/index.html` + `src/main.tsx` + `src/App.tsx` | Vite HTML entry mounts `#root`; `main.tsx` creates root + `<App/>`; `App.tsx` wraps with `<QueryClientProvider>`, `<RouterProvider>`, `<ThemeProvider>`, `<TooltipProvider>`, `<Toaster>` | `npm run dev:ui` boots; blank page loads |
| 5.22 | `magic/apps/web/src/index.css` | Tailwind v4 import + `@theme` block + shadcn CSS vars (light + dark); `body { @apply bg-background text-foreground }` | styles apply |
| 5.23 | `magic/apps/web/src/components/ui/*.tsx` | ~30 shadcn components via `npx shadcn@latest add button card dialog sheet dropdown-menu tooltip popover tabs accordion collapsible scroll-area separator skeleton input textarea select checkbox radio-group switch slider form label field sonner alert progress badge command context-menu hover-card menubar table pagination breadcrumb navigation-menu sidebar resizable chart` | each in `ui/`; tree-shakeable |
| 5.24 | `magic/apps/web/src/lib/api.ts` + `src/lib/ws.ts` + `src/lib/query.ts` | `api.ts`: typed `fetch` wrapper for Fastify REST (returns parsed JSON, throws on non-2xx); `ws.ts`: `useWebSocket(sessionId)` hook, reconnects with `last-event-id`, dispatches events into TanStack Query cache via `queryClient.setQueryData`; `query.ts`: `QueryClient` with default `staleTime: 30s` | navigation + WS dispatch verified manually |
| 5.25 | `magic/apps/web/src/stores/ui.ts` + `src/stores/theme.ts` | Zustand `useUiStore({ paletteOpen, drawerOpen, selectedSessionId, ... })`; `useThemeStore({ theme: 'light' \| 'dark' \| 'system' })` persisted via `next-themes` to localStorage | toggle persists across reload |
| 5.26 | `magic/apps/web/src/components/shell/Shell.tsx` + `LoaderStatus.tsx` | Self-sufficient shell: reads boot signal from `<div id="boot">` injected by server; renders header + sidebar + main; never imports a plugin package directly; `LoaderStatus.tsx` shows first-paint progress even when children throw | manual: throw in a route, shell still renders |
| 5.27 | `magic/apps/web/src/components/layout/AppLayout.tsx` + `Title.tsx` | `AppLayout`: top bar (logo, sessions dropdown, settings cog) + sidebar + main panel + drawer slots; `Title.tsx`: sets `document.title = ${session.title ?? 'magic'} — magic`, reactive to title events | manual render |
| 5.28 | `magic/apps/web/src/components/cards/{CardRegistry,GenericCard,TerminalCard,DiffCard,SearchCard,WebCard}.tsx` | Card registry maps `ToolCardKind` → component; uses shadcn `card`, `badge`, `button`; `DiffCard` uses shiki for syntax; each card handles `presentCall`/`presentResult` shape | each kind renders from a fake event |
| 5.29 | `magic/apps/web/src/components/trajectory/{TrajectoryView,TimelineRow}.tsx` | Turn ledger: rows = turns, columns = TTFT, decoding time, duration, tokens; zoom/pan via shadcn `resizable`; chart via `chart` (Recharts adapter) | manual: long session scrolls smoothly |
| 5.30 | `magic/apps/web/src/components/commands/CommandsPalette.tsx` | shadcn `command` mounted in composer; `/` opens; commands: `/plan`, `/commit`, `/restore`, `/cancel`, `/search`; result sent via WS message back to server | `/` opens; each command fires |
| 5.31 | `magic/apps/web/src/components/deliverables/DeliverablesPanel.tsx` | Right-side panel listing deliverables published via reporter (4.11); each deliverable shows title + download buttons (patch, tar.gz) | manual |
| 5.32 | `magic/apps/web/src/components/directory_picker/BrowseMode.tsx` | Lists `${dataDir}/repos/*` from `GET /api/repos` + URL input; no OS dialog needed; "use" button populates session creation form | manual |
| 5.33 | `magic/apps/web/src/components/settings/General.tsx` | Form fields: data dir override, repo cache toggle, persistence backend selector; react-hook-form + zod resolver; saves via `PATCH /api/settings` | manual: each field saves + persists |
| 5.34 | `magic/apps/web/src/components/settings/Models.tsx` | Provider cards: Bedrock / Anthropic / OpenAI / Google / MiniMax / Local; each shows presence (redacted), key input (write-only), "Test connection" button that probes `/v1/models`; local provider has Base URL + Name fields | manual: each card shows presence, never value; probe works |
| 5.35 | `magic/apps/web/src/components/settings/Permissions.tsx` | Single toggle: `read-only` / `workspace-write` / `danger-full-access`; writes one event that fans out to sandbox + approval | manual: switch updates sandbox behaviour |
| 5.36 | `magic/apps/web/src/components/settings/Credentials.tsx` | Redacted views per provider; write-only update path; presence flags only | manual: secret never displayed back |
| 5.37 | `magic/apps/web/src/components/sessions/Sidebar.tsx` | Lists sessions from `GET /api/sessions`; click loads into chat; per-row Restore / Cancel / Delete buttons | manual |
| 5.38 | `magic/apps/web/src/components/sessions/Chat.tsx` | Chat composer + message stream; subscribes to WS via `useWebSocket(sessionId)`; renders tool cards via (5.28); renders trajectory toggle, deliverables toggle | manual: end-to-end chat works |
| 5.39 | `magic/apps/web/src/components/sessions/Composer.tsx` | Input + send; respects `/` for commands palette; shows cost so far; respects cost cap (disables send when exceeded) | manual |
| 5.40 | `magic/apps/web/src/components/settings/_registry.ts` | Settings plugin registry: each page (5.33–5.36) registered independently; `useSettingsTabs()` returns array | unit test |
| 5.41 | `magic/apps/web/src/routes/__root.tsx` + `index.tsx` + `sessions.$id.tsx` | TanStack Router file tree; root wraps in shell; index redirects to most recent session; `sessions.$id` renders chat | navigation works |
| 5.42 | `magic/apps/web/src/routes/settings/{general,models,permissions,credentials}.tsx` | Each renders its settings component (5.33–5.36) | manual |
| 5.43 | `magic/apps/web/src/hooks/useShortcuts.ts` + `docs/keyboard.md` | Spec: `Cmd+K` palette, `Cmd+/` toggle trajectory, `Cmd+Shift+P` PR preview, `Cmd+Z` undo last edit, `Cmd+.` cancel session, `Esc` close modals; implemented via `useEffect` listener | manual: full keyboard nav works |
| 5.44 | `magic/apps/web/src/components/ui/{EmptyState,ErrorState,LoadingSkeleton}.tsx` | Reusable states; applied per route via route-level wrapper | manual: every route has all 3 |
| 5.45 | `magic/apps/web/src/hooks/useCostTracker.ts` + sidebar live cost | Subscribes to `costUpdate` WS events; displays in sidebar; `MAGIC_COST_CAP` env sets default | manual + e2e (6.12) |
| 5.46 | `magic/apps/web/src/components/chat/UndoButton.tsx` + backend hook | Per-session history stack of `fileEditor` calls; "Undo" reverts last edit; `POST /api/sessions/:id/undo` | manual + e2e |
| 5.47 | `magic/apps/web/tests/playwright/*.spec.ts` | One spec per route (sessions, settings/*, deliverables); basic flow assertions | CI: 0 failures |
| 5.48 | `magic/apps/web/tests/a11y/*.spec.ts` | axe-core scan on each route; assertion: 0 violations of severity ≥ "serious" | CI: 0 violations |
| 5.49 | `magic/apps/web/src/components/pr/PRPreviewPanel.tsx` | Renders branch name + commit message + PR description from git_operator; "Open in GitHub" link; CI status placeholder | manual + e2e (6.21) |
| 5.50 | `magic/apps/web/src/components/checkpoint/ApprovalGateModal.tsx` | Shown on `checkpoint` WS event; renders plan or diff payload; "Approve" / "Reject + reason" buttons; sends WS message back | manual + e2e (6.23) |
| 5.51 | `magic/apps/web/src/components/memory/MemoryBrowser.tsx` | Lists codebase_kb entries per workspace; add/edit/delete via `POST/PATCH/DELETE /api/workspaces/:id/kb`; read-only mode for non-writer tabs | manual |
| 5.52 | `magic/apps/web/src/components/queue/TaskQueue.tsx` | Drag-reorder list; per-task cancel; "Run next" button sends next task to invoke | manual + e2e (6.26) |
| 5.53 | `magic/apps/web/src/server/routes/task_queue.ts` | `POST /api/sessions/:id/queue`, `DELETE /api/sessions/:id/queue/:taskId`, `PATCH /api/sessions/:id/queue/order`; persists queue in `meta.queuedTasks` | integration test |
| 5.54 | `magic/apps/web/src/server/routes/deliverables.ts` | `GET /api/sessions/:id/deliverables/:deliverableId.patch` (diff) and `.tar.gz` (full snapshot); streams via `reply.send(stream)` | integration test |
| 5.55 | `magic/apps/web/src/hooks/useResponsive.ts` + sidebar collapse on viewport | `< md`: sidebar collapses to drawer; chat fills width; respects touch vs mouse | manual: viewport resize works |

## 5c — npm scripts

| # | Path | What | Verification |
|---|---|---|---|
| 5.56 | `magic/package.json` scripts | `dev`: `concurrently -k -n server,ui -c blue,green "npm:dev:server" "npm:dev:ui"`; `dev:server`: `tsx watch apps/web/src/server/server.ts`; `dev:ui`: `vite`; `build`: `vite build && tsc -p apps/web/tsconfig.node.json`; `start`: `node dist/apps/web/server/server.js`; `preview`: `vite preview` | `npm run dev` boots both; `npm run build` succeeds |

---

## Dependencies

- Phases 0–4 complete.

## Blocks

- Phase 6 (Playwright + a11y tests target these routes), Phase 7 (docs reference the UI).
