/**
 * @fileoverview WebSocket event protocol. Every message between Fastify
 * and the React client is one of these discriminated union members.
 *
 * Bumping `WsProtocolVersion` in `types/version.ts` is a breaking change
 * and requires coordinated client + server release.
 */

import {z} from 'zod';

/**
 * The base fields every event carries.
 */
const baseFields = {
  /** Event version (1 today). */
  version: z.literal(1),
  /** Milliseconds since Unix epoch. */
  ts: z.number().int().nonnegative(),
};

/**
 * A graph node has started executing.
 */
export const nodeStartEventSchema = z.object({
  ...baseFields,
  type: z.literal('nodeStart'),
  nodeId: z.string(),
  swarmId: z.string().optional(),
});

/**
 * A graph node has finished (success, failure, or cancel).
 */
export const nodeEndEventSchema = z.object({
  ...baseFields,
  type: z.literal('nodeEnd'),
  nodeId: z.string(),
  status: z.enum(['ok', 'failed', 'cancelled']),
  durationMs: z.number().int().nonnegative(),
});

/**
 * A tool has been invoked. `args` is the structured input; `presentCall` is
 * the pre-rendered view sent to the client for display.
 */
export const toolUseEventSchema = z.object({
  ...baseFields,
  type: z.literal('toolUse'),
  toolName: z.string(),
  toolCallId: z.string(),
  args: z.unknown(),
  presentCall: z.unknown(),
});

/**
 * A file has been edited. `hunk` is the unified-diff hunk applied.
 */
export const fileEditEventSchema = z.object({
  ...baseFields,
  type: z.literal('fileEdit'),
  path: z.string(),
  toolCallId: z.string(),
  hunk: z.string(),
  oldSha256: z.string().optional(),
  newSha256: z.string().optional(),
});

/**
 * Test execution result.
 */
export const testResultEventSchema = z.object({
  ...baseFields,
  type: z.literal('testResult'),
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  logs: z.string().optional(),
  spillLocator: z.string().optional(),
});

/**
 * A chat message (assistant, user, or system).
 */
export const messageEventSchema = z.object({
  ...baseFields,
  type: z.literal('message'),
  role: z.enum(['assistant', 'user', 'system', 'tool']),
  content: z.string(),
  messageId: z.string(),
});

/**
 * The graph finished. `stopReason` mirrors Strands's stop reasons.
 */
export const doneEventSchema = z.object({
  ...baseFields,
  type: z.literal('done'),
  stopReason: z.enum([
    'end_turn',
    'tool_use',
    'cancelled',
    'limit_turns',
    'limit_total_tokens',
    'limit_output_tokens',
    'max_tokens',
    'stop_sequence',
    'content_filtered',
    'guardrail_intervention',
    'cost_cap',
  ]),
  finalResult: z.string().optional(),
});

/**
 * An error occurred mid-graph.
 */
export const errorEventSchema = z.object({
  ...baseFields,
  type: z.literal('error'),
  message: z.string(),
  recoverable: z.boolean(),
  stack: z.string().optional(),
});

/**
 * A tool result was spilled. The client shows a preview; the full output is
 * retrievable via `GET /api/sessions/:id/spill/:locator`.
 */
export const spillEventSchema = z.object({
  ...baseFields,
  type: z.literal('spill'),
  toolCallId: z.string(),
  locator: z.string(),
  byteSize: z.number().int().nonnegative(),
  preview: z.string(),
});

/**
 * A checkpoint requires user approval (plan / diff / destructive).
 */
export const checkpointEventSchema = z.object({
  ...baseFields,
  type: z.literal('checkpoint'),
  kind: z.enum(['plan', 'diff', 'destructive']),
  checkpointId: z.string(),
  payload: z.unknown(),
  message: z.string().optional(),
});

/**
 * Live cost update for the session.
 */
export const costUpdateEventSchema = z.object({
  ...baseFields,
  type: z.literal('costUpdate'),
  sessionCostUsd: z.number().nonnegative(),
  capUsd: z.number().nonnegative(),
});

/**
 * Codebase knowledge base hit — agent recalled entries.
 */
export const memoryHitEventSchema = z.object({
  ...baseFields,
  type: z.literal('memoryHit'),
  entries: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      key: z.string(),
      value: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

/**
 * Title update for the session.
 */
export const titleUpdateEventSchema = z.object({
  ...baseFields,
  type: z.literal('titleUpdate'),
  title: z.string(),
});

/**
 * The discriminated union of all WS events. Add new event kinds here.
 */
export const wsEventSchema = z.discriminatedUnion('type', [
  nodeStartEventSchema,
  nodeEndEventSchema,
  toolUseEventSchema,
  fileEditEventSchema,
  testResultEventSchema,
  messageEventSchema,
  doneEventSchema,
  errorEventSchema,
  spillEventSchema,
  checkpointEventSchema,
  costUpdateEventSchema,
  memoryHitEventSchema,
  titleUpdateEventSchema,
]);

/**
 * The current WS protocol version. Bumping is a breaking change;
 * requires coordinated client + server release.
 */
export type WsProtocolVersion = 1;

/**
 * TypeScript type for any WS event.
 */
export type WsEvent = z.infer<typeof wsEventSchema>;

/**
 * TypeScript types for each individual event kind.
 */
export type NodeStartEvent = z.infer<typeof nodeStartEventSchema>;
export type NodeEndEvent = z.infer<typeof nodeEndEventSchema>;
export type ToolUseEvent = z.infer<typeof toolUseEventSchema>;
export type FileEditEvent = z.infer<typeof fileEditEventSchema>;
export type TestResultEvent = z.infer<typeof testResultEventSchema>;
export type MessageEvent = z.infer<typeof messageEventSchema>;
export type DoneEvent = z.infer<typeof doneEventSchema>;
export type ErrorEvent = z.infer<typeof errorEventSchema>;
export type SpillEvent = z.infer<typeof spillEventSchema>;
export type CheckpointEvent = z.infer<typeof checkpointEventSchema>;
export type CostUpdateEvent = z.infer<typeof costUpdateEventSchema>;
export type MemoryHitEvent = z.infer<typeof memoryHitEventSchema>;
export type TitleUpdateEvent = z.infer<typeof titleUpdateEventSchema>;
