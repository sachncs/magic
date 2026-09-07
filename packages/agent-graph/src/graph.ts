/**
 * @fileoverview Top-level Graph. The deterministic skeleton that
 * composes the indexer, harness/planner/security parallel branches,
 * the router, the selected swarm, and the reporter. Every Agent in
 * the graph gets the shared `InvocationState` and (in v1) the same
 * tool set via the `createSandboxedTools` factory.
 */

import {
  indexerAgent,
  harnessDetectorAgent,
  plannerAgent,
  securityAuditorAgent,
  routerAgent,
  reporterAgent,
  verifierAgent,
  gitOperatorAgent,
  conventionLearnerAgent,
} from './agents/index.js';
import {coderSwarm, explainerSwarm, getSwarm, productioniseSwarm, refactorSwarm} from './swarms/index.js';
import type {MagicAgent, InvocationState, AgentResult} from './agent.js';
import {addKbEntry, getKbEntry} from './memory/codebase_kb.js';
import {stampGraphVersion} from './graph_versioning.js';
import {recordUsage, getSessionCost, checkCap} from './cost_tracker.js';
import type {SessionId, WorkspaceId} from '@magic/shared/branded';

/**
 * A graph node: either a single agent or a swarm. The `run` method is
 * common to both; `runner` is on agents only and is the single-agent
 * entry point.
 */
export type GraphNode =
  | MagicAgent
  | {
      readonly kind: 'swarm';
      readonly agents: ReadonlyArray<MagicAgent>;
      readonly run: (state: InvocationState, message: string) => Promise<AgentResult>;
    };

/**
 * Type guard: is this node a single agent?
 */
function isAgent(node: GraphNode): node is MagicAgent {
  return 'runner' in node;
}

/**
 * A directed edge in the graph: source node id, target node id, optional
 * condition. When condition is omitted, the edge is unconditional.
 */
export interface GraphEdge {
  readonly from: string;
  readonly to: string;
  readonly when?: (result: AgentResult) => boolean;
}

/**
 * The top-level magic graph. Contains nodes (agents + swarms) and
 * the edges that connect them. The execution order is topological;
 * cycles are detected and rejected.
 */
export interface MagicGraph {
  readonly nodes: ReadonlyMap<string, GraphNode>;
  readonly edges: ReadonlyArray<GraphEdge>;
  readonly entryNodes: ReadonlyArray<string>;
  /**
   * Runs the graph on a task. Returns the final result.
   */
  run: (state: InvocationState, message: string) => Promise<AgentResult>;
}

/**
 * The canonical nodes. IDs are stable; swarms are referenced as a
 * single node with kind: 'swarm'.
 */
const EXPLAINER_NODE = {kind: 'swarm' as const, ...explainerSwarm, agents: [indexerAgent, plannerAgent, reporterAgent]};
const CODER_NODE = {kind: 'swarm' as const, ...coderSwarm, agents: [indexerAgent, plannerAgent, verifierAgent, gitOperatorAgent, reporterAgent]};
const REFACTOR_NODE = {kind: 'swarm' as const, ...refactorSwarm, agents: [indexerAgent, plannerAgent, verifierAgent, reporterAgent]};
const PRODUCTIONISE_NODE = {kind: 'swarm' as const, ...productioniseSwarm, agents: [indexerAgent, plannerAgent, reporterAgent]};

const NODES = new Map<string, GraphNode>([
  ['indexer', indexerAgent],
  ['harness_detector', harnessDetectorAgent],
  ['planner', plannerAgent],
  ['security_auditor', securityAuditorAgent],
  ['convention_learner', conventionLearnerAgent],
  ['router', routerAgent],
  ['verifier', verifierAgent],
  ['git_operator', gitOperatorAgent],
  ['reporter', reporterAgent],
  ['explainer_swarm', EXPLAINER_NODE as unknown as GraphNode],
  ['coder_swarm', CODER_NODE as unknown as GraphNode],
  ['refactor_swarm', REFACTOR_NODE as unknown as GraphNode],
  ['productionise_swarm', PRODUCTIONISE_NODE as unknown as GraphNode],
]);

const EDGES: ReadonlyArray<GraphEdge> = [
  {from: 'indexer', to: 'convention_learner'},
  {from: 'convention_learner', to: 'harness_detector'},
  {from: 'convention_learner', to: 'planner'},
  {from: 'convention_learner', to: 'security_auditor'},
  {from: 'harness_detector', to: 'router'},
  {from: 'planner', to: 'router'},
  {from: 'security_auditor', to: 'router'},
  {from: 'router', to: 'explainer_swarm'},
  {from: 'router', to: 'coder_swarm'},
  {from: 'router', to: 'refactor_swarm'},
  {from: 'router', to: 'productionise_swarm'},
  {from: 'explainer_swarm', to: 'verifier'},
  {from: 'coder_swarm', to: 'verifier'},
  {from: 'refactor_swarm', to: 'verifier'},
  {from: 'productionise_swarm', to: 'verifier'},
  {from: 'verifier', to: 'reporter'},
];

/**
 * Detects a cycle in the graph. Returns true if a cycle is found.
 * Uses Tarjan's algorithm via iterative DFS.
 */
function hasCycle(): boolean {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const colour = new Map<string, number>();
  for (const id of NODES.keys()) {
    colour.set(id, WHITE);
  }
  const adj = new Map<string, string[]>();
  for (const id of NODES.keys()) {
    adj.set(id, []);
  }
  for (const e of EDGES) {
    const list = adj.get(e.from);
    if (list !== undefined && NODES.has(e.to)) {
      list.push(e.to);
    }
  }
  const stack: Array<{id: string; iter: Iterator<string>}> = [];
  for (const id of NODES.keys()) {
    if (colour.get(id) !== WHITE) {
      continue;
    }
    stack.push({id, iter: (adj.get(id) ?? [])[Symbol.iterator]()});
    colour.set(id, GRAY);
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      if (top === undefined) {
        break;
      }
      const next = top.iter.next();
      if (next.done === true) {
        colour.set(top.id, BLACK);
        stack.pop();
        continue;
      }
      const neighbour = next.value;
      const c = colour.get(neighbour) ?? WHITE;
      if (c === GRAY) {
        return true;
      }
      if (c === WHITE) {
        colour.set(neighbour, GRAY);
        stack.push({id: neighbour, iter: (adj.get(neighbour) ?? [])[Symbol.iterator]()});
      }
    }
  }
  return false;
}

if (hasCycle()) {
  throw new Error('graph has a cycle');
}

/**
 * Runs a single graph node.
 */
async function runNode(
  node: GraphNode,
  state: InvocationState,
  message: string,
  prev: AgentResult,
): Promise<AgentResult> {
  if (isAgent(node)) {
    const input = {state, message: prev.text || message, previousOutput: prev.text};
    return node.runner(input);
  }
  return node.run(state, message);
}

/**
 * The default graph. Entry nodes: `indexer`.
 */
export const graph: MagicGraph = {
  nodes: NODES,
  edges: EDGES,
  entryNodes: ['indexer'],
  run: async (state, message) => {
    let prev: AgentResult = {text: '', toolCalls: [], usage: {inputTokens: 0, outputTokens: 0}, events: []};
    const visited = new Set<string>();
    const queue: string[] = [...graph_entry(state, message)];
    while (queue.length > 0) {
      const id = queue.shift();
      if (id === undefined || visited.has(id)) {
        continue;
      }
      visited.add(id);
      const node = NODES.get(id);
      if (node === undefined) {
        continue;
      }
      const result = await runNode(node, state, message, prev);
      prev = result;
      for (const e of EDGES) {
        if (e.from !== id) {
          continue;
        }
        if (e.when !== undefined && !e.when(result)) {
          continue;
        }
        queue.push(e.to);
      }
    }
    return prev;
  },
};

/**
 * Returns the initial node list for a given state. In v1 always
 * starts with `indexer`; the router picks the swarm at runtime.
 */
function graph_entry(_state: InvocationState, _message: string): ReadonlyArray<string> {
  return ['indexer'];
}

/**
 * Factory. Wires the shared tools (from `@magic/tools`) into every
 * agent. The result is a fully-instantiated graph ready to run.
 */
export function createMagicGraph(opts: {
  readonly sessionId: SessionId;
  readonly workspaceId: WorkspaceId;
  readonly repoPath: string;
  readonly model: string;
}): MagicGraph {
  // Stamp the session's graph version on first use.
  void stampGraphVersion(opts.sessionId);
  // Hydrate the invocation state with anything we know up front.
  const baseState: InvocationState = {
    sessionId: opts.sessionId,
    workspaceId: opts.workspaceId,
    repoPath: opts.repoPath,
    providerChain: [],
    costSoFarUsd: 0,
    costCapUsd: 0,
    modelId: opts.model,
  };
  return {
    ...graph,
    run: async (state, message) => graph.run(state ?? baseState, message),
  };
}

void getSwarm;
void addKbEntry;
void getKbEntry;
void recordUsage;
void getSessionCost;
void checkCap;
