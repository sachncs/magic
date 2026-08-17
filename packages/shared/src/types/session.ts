/**
 * @fileoverview Session metadata type. `SessionMeta` is the canonical
 * persisted record for a single session; lives in `meta.json` (one per
 * session) and is migrated across schema versions on load.
 */

import {z} from 'zod';

/**
 * The lifecycle states a session can be in.
 *
 * - `pending`: created, not yet started
 * - `running`: graph is actively executing
 * - `paused`: halted at a checkpoint awaiting user approval
 * - `completed`: graph finished without error
 * - `failed`: graph finished with an error
 * - `cancelled`: user-initiated cancel mid-flight
 */
export const SESSION_STATUSES = [
  'pending',
  'running',
  'paused',
  'completed',
  'failed',
  'cancelled',
] as const;

/**
 * Branded type for a session status.
 */
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/**
 * Zod schema for `SessionStatus`. Used at I/O boundaries.
 */
export const sessionStatusSchema = z.enum(SESSION_STATUSES);

/**
 * Cost tracking fields on a session.
 */
export interface SessionCost {
  /** USD spent so far. */
  readonly soFar: number;
  /** USD cap; session halts when `soFar >= cap`. 0 means no cap. */
  readonly cap: number;
}

/**
 * Schema version string. Format: `vMAJOR.MINOR`. See `types/version.ts`.
 */
export type SchemaVersion = string & {readonly __schema: true};

/**
 * Graph definition version. Bumped when agent definitions or routing change.
 * Stamped on every session so old sessions can be replayed under the
 * correct definition (or warn on mismatch).
 */
export type GraphVersion = string & {readonly __graph: true};

/**
 * The canonical session metadata record. Persisted as `meta.json`.
 */
export interface SessionMeta {
  /** Branded session id (UUIDv4). */
  readonly id: string;
  /** Branded workspace id this session belongs to. */
  readonly workspaceId: string;
  /** The repo input: git URL, file:// path, or absolute local path. */
  readonly repo: string;
  /** The user's task prompt. */
  readonly task: string;
  /** Current status. */
  readonly status: SessionStatus;
  /** Id of the currently-executing graph node, if any. */
  readonly currentNode?: string;
  /** ISO timestamp of session creation. */
  readonly createdAt: string;
  /** ISO timestamp of last meta.json write. */
  readonly updatedAt: string;
  /** Schema version of this meta record. */
  readonly schemaVersion: SchemaVersion;
  /** Graph definition version this session was created under. */
  readonly graphVersion: GraphVersion;
  /** Reference to the persisted `RepoManifest` (path or id). */
  readonly manifestRef?: string;
  /** Auto-generated session title. */
  readonly title?: string;
  /** Cost tracking. */
  readonly cost?: SessionCost;
  /** Provider chain actually used (after fallbacks). */
  readonly providerChain?: ReadonlyArray<string>;
  /** Tasks queued for this session (multi-task). */
  readonly queuedTasks?: ReadonlyArray<QueuedTask>;
  /** Tasks already processed (history). */
  readonly completedTasks?: ReadonlyArray<CompletedTask>;
}

/**
 * A task queued for execution within a session. Supports multi-task sessions.
 */
export interface QueuedTask {
  /** Branded task id. */
  readonly id: string;
  /** Task prompt. */
  readonly prompt: string;
  /** Position in queue (0-based). */
  readonly order: number;
  /** ISO timestamp queued. */
  readonly queuedAt: string;
}

/**
 * A completed task within a session.
 */
export interface CompletedTask {
  /** Matches a QueuedTask.id. */
  readonly id: string;
  /** Original prompt. */
  readonly prompt: string;
  /** Result summary or final message. */
  readonly result: string;
  /** Cost in USD. */
  readonly costUsd: number;
  /** Tokens used (input + output). */
  readonly tokens: number;
  /** ISO timestamp completed. */
  readonly completedAt: string;
}

/**
 * Zod schema for `SessionCost`.
 */
export const sessionCostSchema = z.object({
  soFar: z.number().nonnegative(),
  cap: z.number().nonnegative(),
}) as z.ZodType<SessionCost>;

/**
 * Zod schema for `QueuedTask`.
 */
export const queuedTaskSchema = z.object({
  id: z.string(),
  prompt: z.string().min(1),
  order: z.number().int().nonnegative(),
  queuedAt: z.string(),
}) as z.ZodType<QueuedTask>;

/**
 * Zod schema for `CompletedTask`.
 */
export const completedTaskSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  result: z.string(),
  costUsd: z.number().nonnegative(),
  tokens: z.number().int().nonnegative(),
  completedAt: z.string(),
}) as z.ZodType<CompletedTask>;

/**
 * Zod schema for `SessionMeta`. Strict by default — extra fields rejected.
 */
export const sessionMetaSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  repo: z.string(),
  task: z.string(),
  status: sessionStatusSchema,
  currentNode: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.string(),
  graphVersion: z.string(),
  manifestRef: z.string().optional(),
  title: z.string().optional(),
  cost: sessionCostSchema.optional(),
  providerChain: z.array(z.string()).optional(),
  queuedTasks: z.array(queuedTaskSchema).optional(),
  completedTasks: z.array(completedTaskSchema).optional(),
}) as z.ZodType<SessionMeta>;

/**
 * Returns the set of valid `SessionStatus` values.
 */
export function allSessionStatuses(): ReadonlyArray<SessionStatus> {
  return SESSION_STATUSES;
}

/**
 * Returns true if the status is a terminal state (no further transitions
 * expected).
 */
export function isTerminalStatus(status: SessionStatus): boolean {
  return (
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled'
  );
}
