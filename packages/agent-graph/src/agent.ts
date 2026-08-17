/**
 * @fileoverview Core agent abstraction. The Strands SDK's `Agent`
 * class satisfies this interface in production; tests use stubs.
 *
 * Each agent is a self-contained function from `(state) => result`
 * with metadata (system prompt, tools, model id). The graph calls
 * agents via this interface; the implementation behind the interface
 * can be swapped without changing call sites.
 */

import type {SessionId, WorkspaceId, SwarmId, NodeId, ToolCallId} from '@magic/shared/branded';
import type {WsEvent} from '@magic/shared/events';
import type {RepoManifest} from '@magic/shared/types/repo';
import type {InferredConventions} from '@magic/tools';
import type {ToolDefinition} from '@magic/tools';

/**
 * The shared invocation state passed to every agent. Read-only from
 * the agent's perspective; the graph mutates it between nodes.
 */
export interface InvocationState {
  readonly sessionId: SessionId;
  readonly workspaceId: WorkspaceId;
  readonly repoPath: string;
  readonly manifest?: RepoManifest;
  readonly planNotebookId?: string;
  readonly conventions?: InferredConventions;
  readonly providerChain: ReadonlyArray<string>;
  readonly costSoFarUsd: number;
  readonly costCapUsd: number;
  readonly modelId: string;
}

/**
 * The input to a single agent invocation.
 */
export interface AgentInput {
  /** Previous agent's output (if any). */
  readonly previousOutput?: string;
  /** Free-form message from the user, the router, or another agent. */
  readonly message: string;
  /** Read-only shared state. */
  readonly state: InvocationState;
}

/**
 * The output of a single agent invocation.
 */
export interface AgentResult {
  /** Free-form text the agent produced. */
  readonly text: string;
  /** Tool calls the agent made during this invocation. */
  readonly toolCalls: ReadonlyArray<{
    readonly toolCallId: ToolCallId;
    readonly toolName: string;
    readonly args: unknown;
  }>;
  /** Token usage (input + output) for cost tracking. */
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
  /** Optional structured output the agent produced. */
  readonly structured?: unknown;
  /** Events emitted during this invocation (for the WS stream). */
  readonly events: ReadonlyArray<WsEvent>;
}

/**
 * The signature every agent implementation satisfies.
 */
export type AgentRunner = (input: AgentInput) => Promise<AgentResult>;

/**
 * A looser type that accepts any tool regardless of its specific zod
 * schema. Used at agent / graph boundaries where variance prevents
 * carrying the per-tool schema type through. Uses `any` for the
 * schema because `ZodType` is invariant and TS rejects the widening.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTool = ToolDefinition<any>;

/**
 * The metadata the graph needs to schedule an agent.
 */
export interface MagicAgent {
  readonly id: NodeId;
  readonly swarmId?: SwarmId;
  readonly description: string;
  readonly systemPrompt: string;
  readonly tools: ReadonlyArray<AnyTool>;
  readonly runner: AgentRunner;
}

/**
 * Creates a `MagicAgent` from the given pieces. Used as the single
 * construction point so every agent gets a consistent shape.
 */
export function defineAgent(def: {
  id: string;
  swarmId?: string;
  description: string;
  systemPrompt: string;
  tools: ReadonlyArray<AnyTool>;
  runner: AgentRunner;
}): MagicAgent {
  return {
    id: def.id as NodeId,
    swarmId: def.swarmId as SwarmId | undefined,
    description: def.description,
    systemPrompt: def.systemPrompt,
    tools: def.tools,
    runner: def.runner,
  };
}
