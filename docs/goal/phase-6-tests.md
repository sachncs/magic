# Phase 6 — Integration & tests

30 items. End-to-end tests, UI tests, regression eval harness. Every behaviour promised by the acceptance plan has a corresponding test.

**Ships when**: all tests pass in CI; eval harness reports ≥ baseline pass rate; Playwright + axe clean.

---

## Test runner setup

Each `tests/` directory uses **Vitest** for unit/integration tests and **Playwright** for browser tests. CI runs:
1. Unit tests per package (`npm test --workspace=<pkg>`)
2. Integration tests (`npm run test:integration`)
3. Playwright tests (`npm run test:e2e:browser`)
4. axe-core accessibility tests (`npm run test:a11y`)
5. Eval regression harness (`npm run test:eval`)

---

## Items

| # | Path | What | Verification |
|---|---|---|---|
| 6.1 | `magic/examples/tiny_todo/` | Fixture: tiny TypeScript Express app with one route, one Vitest test, one ESLint config, one `package.json` script trio (`build`, `test`, `lint`) | manual review |
| 6.2 | `magic/tests/e2e/full_graph.test.ts` | Boots server; `POST /api/sessions` against fixture; asserts graph reaches `verifier` then `reporter`; asserts all 4 swarm entry points reachable via router dispatch | CI: passes |
| 6.3 | `magic/tests/e2e/persistence.test.ts` | Create session → invoke → kill server → restart → restore session → assert state preserved; runs once with `MAGIC_PERSISTENCE=jsonl`, once with `sqlite` | CI |
| 6.4 | `magic/tests/e2e/permission_presets.test.ts` | Set `MAGIC_PERMISSION_PRESET=read-only`; assert bash outside CWD is rejected; switch to `workspace-write`; assert allowed again | CI |
| 6.5 | `magic/tests/e2e/spill.test.ts` | Trigger a tool that produces >50 KB output; assert spill record created at `${spillDir}/<hash>.json`; assert model saw preview + locator | CI |
| 6.6 | `magic/tests/e2e/mcp_docs.test.ts` | Confirm `uvx strands-agents-mcp-server` reachable; invoke `search_docs`; assert response shape; respects `MAGIC_NETWORK_MODE=localhost-only` | manual (requires `uvx`); CI skipped if absent |
| 6.7 | `magic/tests/e2e/multi_provider.test.ts` | For each of (local, Bedrock, Anthropic, OpenAI, Google, MiniMax): stub env → `buildModel()` returns expected concrete class | CI |
| 6.8 | `magic/tests/e2e/session_query.test.ts` | Seed two sessions with known messages; `searchAllSessions(query)` returns expected hits ranked correctly (SQLite FTS5) and matching (JSONL linear) | CI |
| 6.9 | `magic/tests/e2e/style.test.ts` | Runs `npm run lint` at root; asserts 0 errors | CI |
| 6.10 | `magic/tests/e2e/concurrent_writes.test.ts` | Two concurrent `fileEditor` calls on same file path; assert second wins; assert audit entry appended to `${dataDir}/audit.log` | CI |
| 6.11 | `magic/tests/e2e/cancellation.test.ts` | Start a `fileEditor` call; mid-flight POST cancel; assert file state is intact (snapshot restored or original unchanged); assert `meta.status === 'cancelled'` | CI |
| 6.12 | `magic/tests/e2e/cost_cap.test.ts` | Set per-session cost cap to tiny value; invoke; assert session halts with `CostExceededError`; UI shows halted state | CI |
| 6.13 | `magic/tests/e2e/ws_reconnect.test.ts` | Open WS; receive events; disconnect mid-stream; reconnect with `last-event-id`; assert no events missed | CI |
| 6.14 | `magic/tests/e2e/a11y.test.ts` | For each route (sessions, settings/*, deliverables): Playwright loads page; axe-core runs; assert 0 violations of severity ≥ "serious" | CI |
| 6.15 | `magic/tests/e2e/spill_recovery.test.ts` | Spill output; call `retrieveSpill(locator)`; assert full original output reconstructed | CI |
| 6.16 | `magic/tests/e2e/policy.test.ts` | For each git destructive command (`push --force`, `reset --hard`, `clean -fd`) and bash-outside-CWD case: assert blocked; assert safe commands pass | CI |
| 6.17 | `magic/tests/e2e/ws_contract.test.ts` | WS event union exhaustive: switch over `event.type` covers all kinds without `default`; producer (server) and consumer (test client) agree on shape per kind; round-trip via JSON | CI |
| 6.18 | `magic/tests/e2e/trajectory_snapshot.test.ts` | Record a fixture session; render trajectory view via Playwright; snapshot DOM; assert stable across replays; diff cards snapshot stable | CI |
| 6.19 | `magic/tests/e2e/two_tab.test.ts` | Open 2 WS clients on same session; first sends message; second receives read-only stream; assert second cannot send (server rejects) | CI |
| 6.20 | `magic/tests/e2e/verifier.test.ts` | Run `verifier` on (a) intentionally broken diff (test fails) → returns `{ok: false, issues: [...]}`, (b) good diff → returns `{ok: true}`; both via stubbed `repo_*` tool responses | CI |
| 6.21 | `magic/tests/e2e/git_workflow.test.ts` | Mock `gh` CLI; invoke `git_operator`; assert branch name + commit message + PR description match Conventional Commits + template; assert `gh pr create --draft` called; assert CI check queried | CI |
| 6.22 | `magic/tests/e2e/memory.test.ts` | Add entries to `codebase_kb` for workspace A; assert recalled on relevant prompt in same session; create new session for same workspace; assert recalled across session | CI |
| 6.23 | `magic/tests/e2e/checkpoints.test.ts` | Trigger `gate('plan')`; assert graph halts; send approve message; assert resumes; trigger `gate('diff')`; reject with reason; assert agent receives reason and retries | CI |
| 6.24 | `magic/tests/eval/` | `tasks/*.ts`: ≥10 fixed tasks across all 4 swarms (e.g. "add a /health endpoint", "refactor X to use Y", "add Dockerfile", "find security issues"); `runner.ts` executes each against stubbed model; `baseline.json` frozen pass-rate; CI fails if pass rate drops | CI: pass rate ≥ baseline |
| 6.25 | `magic/tests/e2e/ast_search.test.ts` | `ast_search` finds a TS function definition that ripgrep misses (text inside string literal); `call_graph` traces callers correctly across files | CI |
| 6.26 | `magic/tests/e2e/task_queue.test.ts` | Queue 3 tasks; reorder; run all; cancel task 2 mid-run; assert tasks 1 and 3 complete, task 2 cancelled cleanly | CI |
| 6.27 | `magic/tests/e2e/monorepo.test.ts` | `monorepo_index` on a pnpm workspace fixture; agent invokes tool across package boundaries; respects per-package harness | CI |
| 6.28 | `magic/tests/e2e/auth.test.ts` | WS connect without token → close code 4401; WS with valid token → connects; REST without bearer → 401; REST with bearer → 200; `/api/health/live` → 200 without bearer | CI |
| 6.29 | `magic/tests/e2e/resource_limits.test.ts` | Run a tool that allocates >`MAGIC_SANDBOX_MAX_MEMORY_MB`; assert subprocess killed within timeout; assert error returned to agent | CI |
| 6.30 | `magic/tests/e2e/repo_size_cap.test.ts` | Mock repo of 600 MB; `cloneOrAttach` rejects with clear error containing size + cap; mock 400 MB → allowed | CI |

---

## Dependencies

- Phases 0–5 complete.

## Blocks

- Phase 7 (docs reference test coverage), v1 ship.
