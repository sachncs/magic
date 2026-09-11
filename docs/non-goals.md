# Non-goals (v1)

These are explicitly **out of scope** for v1. They are listed here so
contributors don't waste time wondering whether to add them.

## Multi-user / accounts

- No user accounts, no login, no RBAC
- The app assumes a single trusted operator on localhost
- The Fastify server binds 127.0.0.1 by default; set
  `MAGIC_BIND_ALL_INTERFACES=true` to bind 0.0.0.0 (you must also
  configure `MAGIC_API_TOKEN` before doing so)
- Bearer-token auth (item 0.11) is the only access control
- **Revisit when**: we add team features or expose the app beyond localhost

## Mobile-native app

- The web UI is mobile-responsive (item 5.55)
- No PWA, no installable shell, no push notifications
- **Revisit when**: mobile usage justifies the engineering cost

## Plugin marketplace

- No third-party plugin authoring flow
- The agent graph is extensible in code, not at runtime
- **Revisit when**: there's a clear demand from power users

## Custom themes

- One theme (light + dark via system preference) per item 5.22
- No per-tenant branding, no theme marketplace
- **Revisit when**: we add multi-user (see above)

## Cloud sync / multi-device

- All data lives under `MAGIC_DATA_DIR` (default `./.magic`)
- No remote backup, no cloud sync, no cross-device session continuation
- Use `rsync` / `git` / whatever to back up the data dir
- **Revisit when**: there's a managed offering

## Multi-tenancy

- Single workspace per installation
- No tenant isolation in storage
- **Revisit when**: there's a managed offering

## Billing / quotas

- Per-session cost cap (item 4.19) is local only
- No per-user / per-tenant quotas
- No billing integration
- **Revisit when**: there's a managed offering

## Audit log export

- The audit log is written but not exported
- No external SIEM integration
- **Revisit when**: enterprise compliance requires it

## PR review of others' PRs

- `git_operator` only opens PRs; it does not review external PRs
- No `/review-pr <url>` command
- **Revisit when**: the agent graph is reliable enough to be a reviewer

## Multi-PR stacking

- Each session produces one branch + one PR
- No stack of dependent PRs
- **Revisit when**: large features need atomic review units

## Embedding-based generation

- We use embeddings for **search** (item 3.23) only
- We do not use embeddings to generate code (would require much larger models + careful RAG)
- **Revisit when**: the embedding model quality + retrieval pipeline improves

## Remote / cloud sandbox

- Sandbox is local-only (CWD-locked + denylist)
- No Docker, no Landlock, no SSH
- **Revisit when**: the user base wants to point magic at an untrusted repo

## i18n / l10n

- All UI strings in English only
- No translations
- **Revisit when**: non-English users ask

## Product telemetry

- No analytics, no event collection
- Local structured logs only (item 5.16)
- **Revisit when**: the project moves past local-only

## Custom model training

- We do not fine-tune or train models
- We use off-the-shelf providers (or local inference)
- **Never**: out of scope; that's a different product

## Real-time collaboration

- No multi-user editing of a session
- Each session is single-user
- **Revisit when**: teams adopt magic and want to share sessions live

## Native IDE plugins

- Web app only
- No VS Code, JetBrains, or Zed plugin in v1
- **Revisit when**: the user base asks

## How to propose a non-goal exit

If you want to work on a non-goal, the process is:
1. Open a GitHub issue describing the use case and demand
2. Link to this file
3. Wait for maintainer approval before opening a PR
4. Move the entry from "non-goals" to a new section "v1.5 candidates" if there's traction
