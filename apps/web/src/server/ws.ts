/**
 * @fileoverview WebSocket routes. /ws/sessions/:id requires the
 * session-scoped token issued at session create.
 */

import type {FastifyPluginAsync} from 'fastify';
import {randomUUID} from 'node:crypto';
import {validateWsToken, WsAuthError, WS_CLOSE_UNAUTHORIZED} from '@magic/web-shared/ws_auth';
import {resolveCheckpoint} from '@magic/agent-graph/checkpoints';
import {readMeta, createSessionManager} from '@magic/storage';
import {brand, type SessionId} from '@magic/shared/branded';

interface SocketLike {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  send: (msg: string) => void;
  close: (code: number, reason?: string) => void;
}

/**
 * The WS protocol version this build speaks. Clients send
 * \`{type:'hello', version:<n>}\` on connect; mismatched versions are
 * rejected.
 */
const WS_PROTOCOL_VERSION = 1;

interface HelloFrame {
  type: 'hello';
  version: number;
}

interface CheckpointFrame {
  type: 'checkpoint';
  checkpointId: string;
  approved: boolean;
  reason?: string;
}

interface MessageFrame {
  type: 'message';
  content: string;
}

interface PingFrame {
  type: 'ping';
}

type ClientFrame = HelloFrame | CheckpointFrame | MessageFrame | PingFrame;

function isClientFrame(v: unknown): v is ClientFrame {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const t = (v as {type?: unknown}).type;
  return t === 'hello' || t === 'checkpoint' || t === 'message' || t === 'ping';
}

const wsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{Params: {id: string}}>('/ws/sessions/:id', {websocket: true}, (socket, req) => {
    const s = socket as unknown as SocketLike;
    const id = brand<string, 'SessionId'>(req.params.id);
    const tokenRaw = (req.query as Record<string, unknown>)['token'];
    const token = typeof tokenRaw === 'string' ? tokenRaw : '';
    try {
      validateWsToken(token, id);
    } catch (e) {
      if (e instanceof WsAuthError) {
        s.close(WS_CLOSE_UNAUTHORIZED, e.message);
        return;
      }
      throw e;
    }
    let helloReceived = false;
    s.on('message', async (raw: unknown) => {
      const text = typeof raw === 'string' ? raw : raw instanceof Buffer ? raw.toString() : String(raw);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        s.send(JSON.stringify({type: 'error', message: 'invalid JSON'}));
        return;
      }
      if (!isClientFrame(parsed)) {
        s.send(JSON.stringify({type: 'error', message: 'unknown frame'}));
        return;
      }
      if (!helloReceived) {
        if (parsed.type !== 'hello') {
          s.send(JSON.stringify({type: 'error', message: 'expected hello'}));
          s.close(WS_CLOSE_UNAUTHORIZED, 'expected hello');
          return;
        }
        if (parsed.version !== WS_PROTOCOL_VERSION) {
          s.send(JSON.stringify({type: 'error', message: 'protocol version mismatch'}));
          s.close(WS_CLOSE_UNAUTHORIZED, 'protocol version mismatch');
          return;
        }
        helloReceived = true;
        s.send(JSON.stringify({type: 'hello-ack', version: WS_PROTOCOL_VERSION}));
        return;
      }
      switch (parsed.type) {
        case 'hello':
          // A duplicate hello is a no-op (idempotent ack).
          s.send(JSON.stringify({type: 'hello-ack', version: WS_PROTOCOL_VERSION}));
          return;
        case 'checkpoint':
          resolveCheckpoint(parsed.checkpointId, parsed.approved, parsed.reason);
          return;
        case 'message': {
          const meta = await readMeta(id);
          if (meta === null) {
            s.send(JSON.stringify({type: 'error', message: 'session not found'}));
            return;
          }
          const manager = createSessionManager(id);
          await manager.append({
            id: randomUUID(),
            role: 'user',
            content: parsed.content,
            ts: new Date().toISOString(),
          });
          s.send(JSON.stringify({type: 'message-ack', content: parsed.content}));
          return;
        }
        case 'ping':
          s.send(JSON.stringify({type: 'pong'}));
          return;
      }
    });
    s.on('close', () => {
      // Cleanup: drop this socket from the per-session set.
    });
  });
};

export default wsRoutes;
export {wsRoutes, WS_PROTOCOL_VERSION};
void ({} as SessionId);
