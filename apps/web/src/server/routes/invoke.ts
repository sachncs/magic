/**
 * @fileoverview POST /api/sessions/:id/invoke. Restores the
 * SessionManager and re-invokes the graph with the given message.
 *
 * Today the agent graph layer is not yet wired (see issue #34). The
 * route therefore persists the user message via the SessionManager so
 * nothing is lost, then returns 202 with an explanatory error field;
 * once the Strands integration lands, the dispatch can plug in here
 * without changing the wire shape.
 */

import type {FastifyPluginAsync} from 'fastify';
import {randomUUID} from 'node:crypto';
import {brand, type SessionId} from '@magic/shared/branded';
import {readMeta, writeMeta, createSessionManager} from '@magic/storage';

const invokeRoutes: FastifyPluginAsync = async (app) => {
  app.post<{
    Params: {id: string};
    Body: {message: string};
  }>('/sessions/:id/invoke', async (req, reply) => {
    const id = brand<string, 'SessionId'>(req.params.id);
    const meta = await readMeta(id);
    if (meta === null) {
      return reply.code(404).send({error: 'not found'});
    }
    const message = typeof req.body?.message === 'string' ? req.body.message : '';
    if (message.length === 0) {
      return reply.code(400).send({error: 'message is required'});
    }
    // Persist the user's prompt in the session JSONL so the message
    // survives a crash even though the graph is not running yet.
    const manager = createSessionManager(id);
    await manager.append({
      id: randomUUID(),
      role: 'user',
      content: message,
      ts: new Date().toISOString(),
    });
    await manager.flush();
    await writeMeta(id, {...meta, status: 'pending', updatedAt: new Date().toISOString()});
    return reply.code(202).send({
      accepted: true,
      message,
      note: 'graph layer not yet wired; message persisted in session log',
    });
  });
};

export default invokeRoutes;
export {invokeRoutes};
void ({} as SessionId);
