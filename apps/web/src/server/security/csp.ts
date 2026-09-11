/**
 * @fileoverview Content-Security-Policy plugin. Applies safe defaults
 * for the SPA HTML and JSON responses.
 */

import {randomBytes} from 'node:crypto';
import type {FastifyPluginAsync} from 'fastify';
import fp from 'fastify-plugin';

const cspPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onSend', async (req, reply) => {
    if (req.url.startsWith('/api/')) {
      reply.header('X-Content-Type-Options', 'nosniff');
      reply.header('Referrer-Policy', 'no-referrer');
      return;
    }
    const nonce = randomBytes(16).toString('base64');
    // unsafe-eval is required by some dev tooling (vite HMR); it is
    // opt-in via MAGIC_DEV_CSP_UNSAFE_EVAL=1 in non-production so a
    // production deployment never ships an eval-allowing policy.
    const scriptExtra =
      process.env['NODE_ENV'] === 'production' || process.env['MAGIC_DEV_CSP_UNSAFE_EVAL'] !== '1'
        ? ''
        : " 'unsafe-eval'";
    reply.header(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'nonce-${nonce}'${scriptExtra}; style-src 'self' 'nonce-${nonce}'; img-src 'self' data:; connect-src 'self' ws: wss:`,
    );
    // Stash the nonce on the reply so a downstream onSend hook (e.g.
    // the HTML renderer) can substitute it into <script>/<style> tags.
    reply.header('X-CSP-Nonce', nonce);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  });
});

export default cspPlugin;
export {cspPlugin};
