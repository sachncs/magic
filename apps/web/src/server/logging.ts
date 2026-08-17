/**
 * @fileoverview Request-id correlation. Every request gets an `x-request-id`
 * header propagated through the structured log.
 */

import type {FastifyPluginAsync} from 'fastify';
import fp from 'fastify-plugin';
import {randomUUID} from 'node:crypto';

const requestIdPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    const existing = req.headers['x-request-id'];
    const id = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
    reply.header('x-request-id', id);
    (req as unknown as {requestId: string}).requestId = id;
  });
});

export default requestIdPlugin;
export {requestIdPlugin};
