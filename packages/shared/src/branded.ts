/**
 * @fileoverview Branded opaque types. A `Branded<T, K>` is structurally `T`
 * but nominally `K` — you cannot accidentally pass a `SessionId` where a
 * `WorkspaceId` is expected, even though both are strings at runtime.
 *
 * Brands are erased at compile time to plain `T`; they impose zero runtime
 * cost. Use `brand<T, K>(value)` to construct and `unbrand<T>(value)` to
 * extract the underlying value.
 */

declare const brandSymbol: unique symbol;

/**
 * Phantom-typed opaque wrapper. The `__brand` field is unique per brand name;
 * the field never exists at runtime.
 */
export type Branded<T, K extends string> = T & {readonly [brandSymbol]: K};

/**
 * Brands a value. No runtime check; the brand is enforced by the type system.
 */
export function brand<T, K extends string>(value: T): Branded<T, K> {
  return value as Branded<T, K>;
}

/**
 * Unbrands a value, returning the underlying raw type.
 */
export function unbrand<T, K extends string>(value: Branded<T, K>): T {
  return value as T;
}

/**
 * Branded string for a session identifier (UUIDv4).
 */
export type SessionId = Branded<string, 'SessionId'>;

/**
 * Branded string for a workspace identifier (UUIDv4).
 */
export type WorkspaceId = Branded<string, 'WorkspaceId'>;

/**
 * Branded string for an agent identifier.
 */
export type AgentId = Branded<string, 'AgentId'>;

/**
 * Branded string for a repo identifier.
 */
export type RepoId = Branded<string, 'RepoId'>;

/**
 * Branded string for a message identifier.
 */
export type MessageId = Branded<string, 'MessageId'>;

/**
 * Branded string for a deliverable identifier.
 */
export type DeliverableId = Branded<string, 'DeliverableId'>;

/**
 * Branded string for a spill locator (hash of spilled tool output).
 */
export type SpillLocator = Branded<string, 'SpillLocator'>;

/**
 * Branded string for a tool call identifier.
 */
export type ToolCallId = Branded<string, 'ToolCallId'>;

/**
 * Branded string for a swarm identifier (e.g. 'coder', 'refactor').
 */
export type SwarmId = Branded<string, 'SwarmId'>;

/**
 * Branded string for a graph node identifier.
 */
export type NodeId = Branded<string, 'NodeId'>;

/**
 * Branded string for a queued task identifier.
 */
export type TaskId = Branded<string, 'TaskId'>;

/**
 * Branded string for a knowledge-base entry identifier.
 */
export type KbEntryId = Branded<string, 'KbEntryId'>;

/**
 * Branded string for a WebSocket token.
 */
export type WsToken = Branded<string, 'WsToken'>;

/**
 * Generates a new branded SessionId using crypto.randomUUID.
 */
export function newSessionId(): SessionId {
  return brand<string, 'SessionId'>(crypto.randomUUID());
}

/**
 * Generates a new branded WorkspaceId using crypto.randomUUID.
 */
export function newWorkspaceId(): WorkspaceId {
  return brand<string, 'WorkspaceId'>(crypto.randomUUID());
}

/**
 * Generates a new branded AgentId.
 */
export function newAgentId(): AgentId {
  return brand<string, 'AgentId'>(crypto.randomUUID());
}

/**
 * Generates a new branded RepoId.
 */
export function newRepoId(): RepoId {
  return brand<string, 'RepoId'>(crypto.randomUUID());
}

/**
 * Generates a new branded MessageId.
 */
export function newMessageId(): MessageId {
  return brand<string, 'MessageId'>(crypto.randomUUID());
}

/**
 * Generates a new branded DeliverableId.
 */
export function newDeliverableId(): DeliverableId {
  return brand<string, 'DeliverableId'>(crypto.randomUUID());
}

/**
 * Generates a new branded ToolCallId.
 */
export function newToolCallId(): ToolCallId {
  return brand<string, 'ToolCallId'>(crypto.randomUUID());
}

/**
 * Generates a new branded TaskId.
 */
export function newTaskId(): TaskId {
  return brand<string, 'TaskId'>(crypto.randomUUID());
}

/**
 * Generates a new branded KbEntryId.
 */
export function newKbEntryId(): KbEntryId {
  return brand<string, 'KbEntryId'>(crypto.randomUUID());
}

/**
 * Generates a new branded SpillLocator from a content hash.
 */
export function newSpillLocator(hash: string): SpillLocator {
  return brand<string, 'SpillLocator'>(hash);
}
