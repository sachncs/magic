/**
 * @fileoverview WebSocket routes. /ws/sessions/:id requires the
 * session-scoped token issued at session create.
 */

import type {FastifyPluginAsync} from 'fastify';
import {validateWsToken, WsAuthError, WS_CLOSE_UNAUTHORIZED} from '@magic/web-shared/ws_auth';
import {brand, type SessionId} from '@magic/shared/branded';

interface SocketLike {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  send: (msg: string) => void;
  close: (code: number, reason?: string) => void;
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
    s.on('message', (raw: unknown) => {
      const text = typeof raw === 'string' ? raw : raw instanceof Buffer ? raw.toString() : String(raw);
      s.send(`echo: ${text}`);
    });
    s.on('close', () => {
      // Cleanup: drop this socket from the per-session set.
    });
  });
};

export default wsRoutes;
export {wsRoutes};
void ({} as SessionId);
