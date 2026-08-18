# Phase 3 — `packages/tools`

26 items. The tool catalog every agent gets: repo inspection, search, edit, lint/test/security, MCP docs, sandbox + safety wrappers, AST + call-graph + semantic + monorepo + Playwright, and resource limits + provider fallback.

**Ships when**: every tool unit-tested; sandbox + spill + network-guard compose without conflicts; AST/monorepo/semantic tools work on the fixture repo; resource limits enforced; provider fallback chain works.

---

## Items

| # | Path | What | Verification |
|---|---|---|---|
| 3.1 | `magic/packages/tools/package.json` | `name: "@magic/tools"`; deps: `@strands-agents/sdk`, `@magic/shared`, `zod`, `simple-git`, `ts-morph`, `tree-sitter`, `tree-sitter-typescript`, `tree-sitter-python`, `@xenova/transformers`, `playwright-core`, `pino` | `npm install` clean |
| 3.2 | `magic/packages/tools/src/repo/index.ts` | `tool()` factory returning `repo_index(path: string)`; walks file tree via `fs.promises.readdir` recursive; respects `.gitignore` (uses `ignore` package); emits `RepoManifest` | integration test on fixture |
| 3.3 | `magic/packages/tools/src/repo/search.ts` | `repo_search(path, query: string, opts?: { globs?: string[]; context?: number; maxResults?: number })`; uses Node `child_process` to spawn `rg` if installed, else falls back to JS regex scan; returns `{ file, line, match, context: string[] }[]` | integration test |
| 3.4 | `magic/packages/tools/src/repo/read.ts` | `repo_read(path, opts?: { startLine?: number; endLine?: number; maxBytes?: number })`; reads file slice with line numbers; default `maxBytes: 200_000`; rejects with clear error if exceeded | unit test: range read; size cap enforced |
| 3.5 | `magic/packages/tools/src/repo/harness.ts` | `repo_harness(path)`; detects package manager + build/test/lint/format commands by inspecting `package.json` (`scripts`), `Makefile` (targets), `pyproject.toml` (`[tool.poetry]`, `[project.optional-dependencies]`), `Cargo.toml` (`[[bin]]`); returns `HarnessCommands` | unit test: each manifest type |
| 3.6 | `magic/packages/tools/src/repo/lint.ts` | `repo_lint(path)`; runs detected lint command via Strands `bash` tool (in sandbox); returns `{ ok, output }`; respects `MAGIC_NETWORK_MODE` | integration test |
| 3.7 | `magic/packages/tools/src/repo/test.ts` | `repo_test(path, opts?: { target?: string; watch?: boolean })`; runs detected test command; parses output for pass/fail counts (jest/vitest/go test patterns); returns `{ passed, failed, logs }` | integration test |
| 3.8 | `magic/packages/tools/src/repo/security.ts` | `repo_security(path)`; runs `npm audit --json` / `pip-audit --json` / secret scan (regex for AWS keys, GitHub tokens, etc.); returns `{ vulnerabilities: Finding[], secrets: Finding[] }` | integration test |
| 3.9 | `magic/packages/tools/src/strands_docs.ts` | `McpClient` + `StdioClientTransport({ command: 'uvx', args: ['strands-agents-mcp-server'] })`; exports single `tool()` wrapper exposing `search_docs(query)` + `fetch_doc(path)`; respects `MAGIC_NETWORK_MODE` via `networkGuard` | manual: invoke search_docs, verify response |
| 3.10 | `magic/packages/tools/src/tool_cards.ts` | `card()` helper: `tool({ name, description, inputSchema, callback, card: ToolCardKind, presentCall, presentResult })`; built-in renderers: `genericCard`, `terminalCard`, `diffCard`, `searchCard`, `webCard`; each `presentCall`/`presentResult` is a pure function `(args) => view` | unit test: determinism (same args → same view string) |
| 3.11 | `magic/packages/tools/src/spill_store.ts` | Spill middleware: tool result > threshold (default 50 KB) → writes full output to `${spillDir}/<hash>.json`, replaces inline with preview (first 2 KB + last 1 KB) + `SpillLocator` (`{ hash, byteSize, lineCount }`); `retrieveSpill(locator): Promise<string>` | unit test: spill triggered at threshold; retrieve returns full output |
| 3.12 | `magic/packages/tools/src/network_guard.ts` | `networkGuard(url: string): boolean`; rejects non-`localhost`/`127.0.0.1`/`[::1]` URLs when `MAGIC_NETWORK_MODE=localhost-only`; used by `httpRequest`, MCP docs, `repo_security` external calls | unit test: localhost allowed; public rejected |
| 3.13 | `magic/packages/tools/src/sandbox.ts` | `createLocalSandbox(repoPath: string, opts?: { resourceLimits?: ResourceLimits }): Sandbox`; Strands `Sandbox` instance; CWD locked to `repoPath`; bash subprocess spawned with `cwd: repoPath`; destructive denylist regex (`rm -rf /`, `mkfs`, `dd if=`, etc.) enforced at tool boundary | unit test: bash outside CWD rejected; denylist triggers |
| 3.14 | `magic/packages/tools/src/index.ts` | `createSandboxedTools(sandbox, repoPath): Tool[]` factory; composes repo tools + spill middleware + network-guard + tool-cards | smoke: agent with these tools runs a trivial task |
| 3.15 | `magic/packages/tools/src/git_policy.ts` | `gitPolicy(command: string): { allow: boolean; reason?: string }`; allowlist: `status`, `diff`, `log`, `add`, `commit`, `branch`, `checkout`, `fetch`, `merge`, `rev-parse`, `show`; denylist: `push --force`/`push -f`, `reset --hard`, `clean -fd`/`clean -fdx`, `filter-branch`; greps the full argv, not just the subcommand | unit test: each denylisted command blocked; allowlist passes |
| 3.16 | `magic/packages/tools/src/concurrent_writes.ts` | Per-path mutex (in-process `Map<string, Promise>` chain); `withFileLock(path, fn): Promise<T>`; on conflict: second write wins, audit entry appended to `${dataDir}/audit.log` with `{ ts, path, toolCallId, winner }` | unit test: concurrent calls serialised; audit entry written |
| 3.17 | `magic/packages/tools/src/capability_check.ts` | `checkCapabilities(model: Model): Promise<{ toolUse: boolean; streaming: boolean; vision: boolean }>`; one-shot probe (cheap model query); throws if `toolUse === false` | unit test: rejection path; stubbed model response |
| 3.18 | `magic/packages/tools/src/retry.ts` | `withRetry<T>(fn: () => Promise<T>, opts?: { provider: ProviderId; maxAttempts?: number }): Promise<T>`; exponential backoff with jitter; provider-specific retryable status codes (Anthropic 429/529, OpenAI 429/500/503, Bedrock ThrottlingException, Google RESOURCE_EXHAUSTED) | unit test: each provider path; backoff timing |
| 3.19 | `magic/packages/tools/src/ast_search.ts` | `ast_search(path, query: string, opts?: { lang?: LanguageId; symbolKinds?: SymbolKind[] })`; uses `ts-morph` for TS/JS (functions, classes, interfaces, types, variables); `tree-sitter-typescript`/`tree-sitter-python` for polyglot; returns `{ file, line, column, symbol, kind, snippet }[]`; ignores text matches inside string literals | integration test |
| 3.20 | `magic/packages/tools/src/call_graph.ts` | `call_graph(path, symbol: string, opts?: { direction: 'callers' \| 'callees' \| 'both'; depth?: number })`; uses `ts-morph` for TS; returns `{ node: SymbolRef, edges: Edge[] }` (forest of caller/callee relations); defaults: `depth: 3` | integration test |
| 3.21 | `magic/packages/tools/src/monorepo_index.ts` | `monorepo_index(path)`; detects monorepo (pnpm `pnpm-workspace.yaml`, npm `workspaces` in `package.json`, yarn `workspaces`, turbo `turbo.json`, nx `nx.json`); produces `{ type: 'pnpm' \| 'npm' \| 'yarn' \| 'turbo' \| 'nx', packages: Array<{ name, path, manifest }> }` | integration test |
| 3.22 | `magic/packages/tools/src/playwright_tool.ts` | `tool()` exposing `playwright({ action: 'navigate' \| 'click' \| 'screenshot' \| 'evaluate' \| 'console', ... })`; uses `playwright-core` headless Chromium; sandboxed to `localhost`/`127.0.0.1` URLs by default (configurable via `MAGIC_PLAYWRIGHT_DOMAINS`); returns `{ content?, screenshot?: base64, consoleLogs? }` | integration test |
| 3.23 | `magic/packages/tools/src/semantic_search.ts` | `semantic_search(query: string, opts?: { workspaceId: WorkspaceId; topK?: number })`; uses `@xenova/transformers` for local embeddings (model `all-MiniLM-L6-v2`); pre-indexes workspace files on first call; stores vectors in `${kbDir}/<workspaceId>/embeddings.bin`; returns `{ file, line, snippet, score }[]` | integration test |
| 3.24 | `magic/packages/tools/src/convention_infer.ts` | `infer_conventions(path): Promise<{ naming: NamingStyle; errorHandling: ErrorStyle; testPattern: TestStyle; importStyle: ImportStyle }>`; samples 20–50 files; uses AST for symbol extraction; returns `{ kind: 'string' \| 'camelCase' \| 'PascalCase' \| 'snake_case', confidence: number }` per axis; persisted to codebase_kb by `convention_learner` agent | integration test |
| 3.25 | `magic/packages/tools/src/resource_limits.ts` | `applyResourceLimits(cmd: string, opts: ResourceLimits): SpawnOptions`; for Linux: prepends `prlimit --pid=$$ --as=<mem> --cpu=<cpu>` (or uses `--rlimit-*` on macOS); defaults: `MAGIC_SANDBOX_MAX_MEMORY_MB=2048`, `MAGIC_SANDBOX_MAX_CPU=2.0`, `MAGIC_SANDBOX_MAX_DISK_MB=5120`; enforces kill if subprocess exceeds | unit test: tool exceeding memory is killed (use a tool that allocates GBs); timeout enforced |
| 3.26 | `magic/packages/tools/src/provider_fallback.ts` | `withFallback<T>(primary: () => Promise<T>, opts: { fallbacks: ProviderId[]; maxAttemptsPerProvider?: number }): Promise<T>`; on N consecutive failures (default 3) of primary, swap to next provider in chain; respects `MAGIC_PROVIDER_FALLBACK` (comma-separated); emits event on swap | unit test: fallback triggered on stubbed failure; chain exhausted throws |

---

## Dependencies

- Phase 0, Phase 1, Phase 2 (storage for audit log, KB).

## Blocks

- Phase 4 (every agent imports from `@magic/tools`).
