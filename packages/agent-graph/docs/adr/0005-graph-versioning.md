# ADR 0005 — Graph versioning

## Status
Accepted (v1).

## Context
Agent definitions (prompts, tools, routing) evolve. A session created
under v1 of the graph may be restored months later under v2, where
the agents behave differently. We need a versioning story that:
- Tells the user when they're loading a session under a different
  version
- Doesn't break the session (we still want to replay best-effort)
- Is cheap to maintain

## Decision
- A `GraphVersion` const lives in `@magic/agent-graph`.
- Every session's `meta.json` is stamped with the `graphVersion` at
  creation via `stampGraphVersion()`.
- On restore, `checkGraphVersionMismatch()` compares the stored
  version to the current. On mismatch, a warning is logged but the
  session is still replayed.

## Consequences
- Users see "graph version mismatch" on stale sessions
- The graph layer can introduce a migration step later by inspecting
  the stored version
- Bumping the version is a single-file change; the rest of the
  system reads the constant

## Alternatives considered
- Hard fail on mismatch: rejected — too disruptive; users would
  lose access to old sessions on every upgrade
- No versioning: rejected — silent behavioural drift is worse than
  a warning

## Date
2026-08-17.
