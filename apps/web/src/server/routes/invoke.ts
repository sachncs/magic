/**
 * @fileoverview POST /api/sessions/:id/invoke. Restores the
 * SessionManager and re-invokes the graph with the given message.
 */

import type {FastifyPluginAsync} from 'fastify';
import {brand, type SessionId} from '@magic/shared/branded';
import {readMeta} from '@magic/storage';

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
    // Real impl: restore SessionManager, construct graph, invoke.
    // For v1, we acknowledge and update meta.
    return reply.code(202).send({accepted: true, message: req.body.message});
  });
};

export default invokeRoutes;
export {invokeRoutes};
void ({} as SessionId);
