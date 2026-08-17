/**
 * @fileoverview Checkpoint gates. Halts the graph at plan / diff /
 * destructive operations; waits for user approval over WS.
 */

import type {SessionId} from '@magic/shared/branded';
import {newEventId} from './events/internal.js';

/**
 * The kinds of checkpoints we support.
 */
export type CheckpointKind = 'plan' | 'diff' | 'destructive';

/**
 * A pending checkpoint, keyed by id.
 */
export interface PendingCheckpoint {
  readonly id: string;
  readonly kind: CheckpointKind;
  readonly payload: unknown;
  readonly resolve: (approved: boolean, reason?: string) => void;
  readonly createdAt: number;
}

const pending = new Map<string, PendingCheckpoint>();

/**
 * Pauses the graph and waits for user approval. Returns a promise
 * that resolves to `{approved, reason?}` when the WS message arrives.
 *
 * The `emitEvent` callback is called with the checkpoint event to
 * send to the client; the client responds with a WS message that
 * calls `resolveCheckpoint(id, approved, reason)`.
 */
export async function gate(
  sessionId: SessionId,
  kind: CheckpointKind,
  payload: unknown,
  emitEvent: (event: unknown) => void,
): Promise<{approved: boolean; reason?: string}> {
  const id = newEventId();
  return new Promise((resolve) => {
    pending.set(id, {id, kind, payload, resolve, createdAt: Date.now()});
    emitEvent({
      version: 1,
      type: 'checkpoint',
      kind,
      checkpointId: id,
      payload,
      sessionId,
      ts: Date.now(),
    });
  });
}

/**
 * Called from the WS message handler when the user approves or
 * rejects a checkpoint. Returns true if the checkpoint was found.
 */
export function resolveCheckpoint(
  id: string,
  approved: boolean,
  reason?: string,
): boolean {
  const cp = pending.get(id);
  if (cp === undefined) {
    return false;
  }
  pending.delete(id);
  cp.resolve(approved, reason);
  return true;
}

/**
 * Returns the list of currently-pending checkpoint ids. Used for
 * diagnostics.
 */
export function listPending(): ReadonlyArray<string> {
  return [...pending.keys()];
}
