/**
 * @fileoverview Content-Security-Policy plugin. Applies safe defaults
 * for the SPA HTML and JSON responses.
 */

import type {FastifyPluginAsync} from 'fastify';
import fp from 'fastify-plugin';

const cspPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onSend', async (req, reply) => {
    if (req.url.startsWith('/api/')) {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('Referrer-Policy', 'no-referrer');
      return;
    }
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:",
    );
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  });
});

export default cspPlugin;
export {cspPlugin};
