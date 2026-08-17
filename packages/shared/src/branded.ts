/**
 * @fileoverview Branded opaque types. A `Branded<T, K>` is structurally `T`
 * but nominally `K` — you cannot accidentally pass a `SessionId` where a
 * `WorkspaceId` is expected, even though both are strings at runtime.
 *
 * Brands are erased at compile time to plain `T`; they impose zero runtime
 * cost. Use `brand<T, K>(value)` to construct and `unbrand<T>(value)` to
 * extract the underlying value.
 */

/**
 * Phantom-typed opaque wrapper. The `__brand` field is a unique symbol per
 * brand name; the field never exists at runtime.
 */
export type Branded<T, K extends string> = T & {readonly __brand: K};

/**
 * Brands a value. No runtime check; the brand is enforced by the type system.
 *
 * @param value - The raw value to brand.
 * @returns The branded value.
 */
export function brand<T, K extends string>(value: T): Branded<T, K> {
  return value as Branded<T, K>;
}

/**
 * Unbrands a value, returning the underlying raw type.
 *
 * @param value - The branded value.
 * @returns The raw value.
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
 * Branded string for a spill locator.
 */
export type SpillLocator = Branded<string, 'SpillLocator'>;

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
