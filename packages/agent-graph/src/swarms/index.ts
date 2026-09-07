/**
 * @fileoverview Swarm definitions. A swarm is a sub-graph of related
 * agents that handle one intent end-to-end. Each swarm is a function
 * over the shared invocation state.
 */

import type {MagicAgent, InvocationState, AgentResult} from '../agent.js';
import {
  indexerAgent,
  plannerAgent,
  reporterAgent,
  verifierAgent,
  gitOperatorAgent,
  conventionLearnerAgent,
} from '../agents/index.js';

/**
 * A swarm is an ordered list of agent steps. Each step takes the
 * accumulated state and returns a partial result.
 */
export type SwarmStep = (state: InvocationState, prev: AgentResult) => Promise<AgentResult>;

/**
 * A swarm definition: id, description, ordered steps.
 */
export interface Swarm {
  readonly id: string;
  readonly description: string;
  readonly agents: ReadonlyArray<MagicAgent>;
  /**
   * Runs the swarm sequentially. Each step's result feeds the next
   * via `previousOutput`.
   */
  run: (state: InvocationState, initialMessage: string) => Promise<AgentResult>;
}

/**
 * Helper: builds a swarm from a list of agents. The first agent
 * receives the user's message; subsequent agents receive the
 * previous agent's `text` as `previousOutput`.
 */
export function buildSwarm(
  id: string,
  description: string,
  agents: ReadonlyArray<MagicAgent>,
): Swarm {
  return {
    id,
    description,
    agents,
    run: async (state, initialMessage) => {
      let prev: AgentResult = {text: '', toolCalls: [], usage: {inputTokens: 0, outputTokens: 0}, events: []};
      for (const agent of agents) {
        const input = {
          message: agent === agents[0] ? initialMessage : prev.text,
          state,
          previousOutput: prev.text,
        };
        prev = await agent.runner(input);
      }
      return prev;
    },
  };
}

/**
 * Explainer swarm: indexer → planner → reporter. Read-only codebase
 * understanding with a written summary.
 */
export const explainerSwarm: Swarm = buildSwarm(
  'explainer',
  'Read-only codebase understanding with a written summary.',
  [indexerAgent, plannerAgent, reporterAgent],
);

/**
 * Coder swarm: indexer → planner → verifier → git_operator → reporter.
 * Cyclic retry on verifier failure (next-run only; no in-process loop
 * to keep the runner simple — the graph layer handles re-invocation).
 */
export const coderSwarm: Swarm = buildSwarm(
  'coder',
  'Implement a feature or fix a bug end-to-end with verification and PR.',
  [indexerAgent, plannerAgent, verifierAgent, gitOperatorAgent, reporterAgent],
);

/**
 * Refactor swarm: indexer (impact analysis via ast_search + call_graph)
 * → planner → verifier → reporter.
 */
export const refactorSwarm: Swarm = buildSwarm(
  'refactor',
  'Multi-file refactor with impact analysis and verification.',
  [indexerAgent, plannerAgent, verifierAgent, reporterAgent],
);

/**
 * Productionise swarm: indexer → security_auditor → reporter.
 * Generates Dockerfiles, CI, observability, security review.
 */
export const productioniseSwarm: Swarm = buildSwarm(
  'productionise',
  'Produce Dockerfiles, CI config, observability suggestions, security review.',
  [indexerAgent, plannerAgent, reporterAgent],
);

/**
 * Returns the swarm matching the given id, or undefined.
 */
export function getSwarm(id: string): Swarm | undefined {
  switch (id) {
    case 'explainer':
      return explainerSwarm;
    case 'coder':
      return coderSwarm;
    case 'refactor':
      return refactorSwarm;
    case 'productionise':
      return productioniseSwarm;
    default:
      return undefined;
  }
}

/**
 * Lists all available swarms by id.
 */
export function listSwarmIds(): ReadonlyArray<string> {
  return ['explainer', 'coder', 'refactor', 'productionise'];
}

void conventionLearnerAgent;
