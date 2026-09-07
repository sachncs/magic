/**
 * @fileoverview Graph versioning. Each session is stamped with the
 * graph version it was created under. On restore, mismatch emits a
 * warning; the graph still replays best-effort.
 */

import {GRAPH_VERSION} from './events/versioning.js';
import {readMeta, writeMeta} from '@magic/storage/meta';
import type {SessionId} from '@magic/shared/branded';

const MISMATCH_WARNING =
  'graph version mismatch: session was created under a different version; replay is best-effort';

/**
 * Stamps the session with the current graph version. Called on
 * session creation.
 */
export async function stampGraphVersion(sessionId: SessionId): Promise<void> {
  const meta = await readMeta(sessionId);
  if (meta === null) {
    return;
  }
  await writeMeta(sessionId, {...meta, graphVersion: GRAPH_VERSION});
}

/**
 * Returns the warning string when the session's stored version
 * doesn't match the current. Otherwise null.
 */
export async function checkGraphVersionMismatch(sessionId: SessionId): Promise<string | null> {
  const meta = await readMeta(sessionId);
  if (meta === null) {
    return null;
  }
  if (meta.graphVersion !== GRAPH_VERSION) {
    return MISMATCH_WARNING;
  }
  return null;
}
