/**
 * @fileoverview Rate limit plugin. Caps requests per IP at 100/min on
 * /api/* routes (health bypassed).
 */

import type {FastifyPluginAsync} from 'fastify';
import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';

const rateLimitPlugin: FastifyPluginAsync = fp(async (app) => {
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: (req) => req.url.startsWith('/api/health/'),
  });
});

export default rateLimitPlugin;
export {rateLimitPlugin};
