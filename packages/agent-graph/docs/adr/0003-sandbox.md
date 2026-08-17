# ADR 0003 — Sandbox: local CWD-locked by default

## Status
Accepted (v1).

## Context
Agent-executed shell commands can damage the host system. Options:
- Full Landlock/bwrap container: safest, hardest to set up
- Docker: portable, requires Docker
- Local CWD-locked: simple, no dependencies, defends only against
  the most common mistakes
- No sandbox: simple, but risky

## Decision
- Local sandbox: shell tools run with `cwd: repoPath`. Destructive
  commands (`rm -rf /`, `mkfs`, `dd of=/dev/...`, `curl | sh`,
  `shutdown`, etc.) are blocked at the tool boundary via a regex
  denylist.
- Git-specific denylist: `push --force`, `reset --hard`,
  `clean -fd`, `filter-branch`. Allowlist: `status`, `log`, `diff`,
  `add`, `commit`, `branch`, `checkout`, `fetch`, `merge`, etc.
- Resource limits (memory, CPU, disk) applied via env or per-call.
- Network mode `localhost-only` (via `MAGIC_NETWORK_MODE`) restricts
  `httpRequest`, MCP docs, and repo security external calls to
  `localhost` / `127.0.0.1` / `::1`.
- A Landlock/Docker backend is a documented v1.5 upgrade (see
  `docs/non-goals.md`).

## Consequences
- Zero-setup safety for the common case
- A determined attacker can bypass the denylist by composing
  commands in unusual ways; the user is expected to review
  high-risk operations via the `destructive` checkpoint
- Future upgrade to Landlock is a backend swap; tool contracts
  don't change

## Alternatives considered
- Landlock-only: rejected — Linux-only, and not all kernels support it
- No sandbox: rejected — even an honest model can issue `rm -rf /tmp/*`
  by accident

## Date
2026-08-17.
