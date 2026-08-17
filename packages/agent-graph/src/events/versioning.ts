/**
 * @fileoverview WS protocol versioning. Clients declare their version
 * on connect; mismatches are rejected. Bumping requires coordinated
 * client+server release.
 */

import type {WsProtocolVersion} from '@magic/shared/events';

/**
 * The current protocol version. Increment on breaking changes to the
 * event union in @magic/shared/events.
 */
export const WS_PROTOCOL_VERSION: WsProtocolVersion = 1;

/**
 * Bumped when a session's graph definition changes in a way that
 * affects replay (agent set, prompts, routing).
 */
export const GRAPH_VERSION = 'v1' as const;

/**
 * Throws if the client's declared version doesn't match the server's.
 * Use as a gate on WS connect.
 */
export function assertProtocolVersion(client: unknown): asserts client is {version: WsProtocolVersion} {
  if (typeof client !== 'object' || client === null) {
    throw new Error('WS protocol error: expected hello message');
  }
  const v = (client as {version?: number}).version;
  if (v !== WS_PROTOCOL_VERSION) {
    throw new Error(
      `WS protocol version mismatch: client=${v}, server=${WS_PROTOCOL_VERSION}`,
    );
  }
}
