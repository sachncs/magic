/**
 * @fileoverview Internal helpers for graph event stamping. Centralised
 * so every emitted event has a unique id and consistent timestamp.
 */

let counter = 0;

/**
 * Returns a unique event id. Sufficient for in-process correlation.
 * For cross-process uniqueness, prefix with a process id.
 */
export function newEventId(): string {
  counter = (counter + 1) & 0x7fffffff;
  return `evt-${Date.now().toString(36)}-${counter.toString(36)}`;
}
