/**
 * @fileoverview POST /api/sessions/:id/cancel. Halts the graph
 * mid-flight and updates meta.
 */

import type {FastifyPluginAsync} from 'fastify';
import {brand, type SessionId} from '@magic/shared/branded';
import {readMeta, writeMeta} from '@magic/storage';
import {cancelAll} from '@magic/agent-graph/cancellation';

const cancelRoutes: FastifyPluginAsync = async (app) => {
  app.post<{Params: {id: string}}>('/sessions/:id/cancel', async (req, reply) => {
    const id = brand<string, 'SessionId'>(req.params.id);
    const meta = await readMeta(id);
    if (meta === null) {
      return reply.code(404).send({error: 'not found'});
    }
    const cancelled = await cancelAll();
    await writeMeta(id, {...meta, status: 'cancelled', updatedAt: new Date().toISOString()});
    return {cancelled};
  });
};

export default cancelRoutes;
export {cancelRoutes};
void ({} as SessionId);
