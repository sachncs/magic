# ADR 0001 — Top-level topology: Graph + Swarms

## Status
Accepted (v1).

## Context
We need a coordination layer for multiple specialised agents in a single session. The options considered were:
- A single monolithic agent with many tools
- A flat list of agents invoked directly by the user
- A hierarchical orchestrator (a "manager" agent that delegates to specialists)
- A directed graph of agents with conditional edges

## Decision
We chose a directed graph (`Graph`) that composes indexer + parallel
harness/planner/security nodes, a router, then one of four swarms
(explainer / coder / refactor / productionise), then a verifier, then a
reporter.

Swarms are emergent sub-graphs: each is a small team of specialists
that handoff to one another. The graph layer is deterministic and
auditable; the swarms are where the model is invoked.

## Consequences
- Deterministic entry and exit; easy to debug
- Swarms can be added without touching the top-level graph
- Cyclic edges (coder_swarm → verifier → re-invoke) are supported
- Per-agent prompts are independent; changes are localised

## Alternatives considered
- Pure Swarm (no top-level Graph): rejected — too unstructured for
  explainer/refactor/productionise swarms that need a deterministic
  indexer first
- Pure Graph (no Swarms): rejected — coder swarm benefits from
  emergent handoffs (implementer → reviewer → tester)

## Date
2026-08-17.
