# Contributing to magic

Thanks for your interest in improving magic. This document covers the basics for contributing code.

## Development setup

```bash
git clone <your-fork-url>
cd magic
nvm use                # picks up Node 20 from .nvmrc
npm install
cp .env.example .env   # then edit with your model provider credentials
npm run dev            # starts server (4317) + UI (5173)
```

## Style

This project follows the [Google JS](https://google.github.io/styleguide/jsguide.html) and [Google TS](https://google.github.io/styleguide/tsguide.html) style guides. We enforce via [`gts`](https://github.com/google/gts).

```bash
npm run lint      # check
npm run format    # auto-fix
```

CI runs `npm run lint` on every PR. PRs with lint errors cannot merge.

Read [STYLE_GUIDE.md](./STYLE_GUIDE.md) for the cheat-sheet.

## Architecture

Before making changes, read:
- [docs/architecture.md](./docs/architecture.md) — topology overview
- [docs/agentic_overview.md](./docs/agentic_overview.md) — what's agentic and how to extend it
- `packages/agent-graph/docs/adr/` — irreversible decisions (topology, session log, sandbox, model detection, Graph versioning)

## Pull request flow

1. Branch from `main` (`git checkout -b fix/short-description`)
2. Make your change
3. Add or update tests (we ship with full e2e coverage; new behaviour needs tests)
4. Run `npm run typecheck && npm run lint && npm test`
5. Push and open a PR
6. Ensure CI passes (lint + typecheck + tests + a11y + eval)

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add playwright tool for UI debugging
fix: ws reconnect now resumes from last-event-id
docs: update agentic overview with eval harness usage
chore: bump dependencies
```

## Adding a new agent or swarm

See `docs/agentic_overview.md#how-to-extend-each-capability`.

## Adding a new model provider

1. Add env vars to `.env.example`
2. Add detection branch in `packages/agent-graph/src/model.ts`
3. Add provider pricing to `packages/shared/src/types/pricing.ts`
4. Add unit test in `packages/agent-graph/tests/model.test.ts`
5. Add provider card to `apps/web/src/components/settings/Models.tsx`
6. Update `docs/providers.md`

## Reporting issues

Use GitHub Issues. Include reproduction steps, expected vs actual behaviour, and your environment (OS, Node version, model provider).

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md). By participating you agree to abide by it.
