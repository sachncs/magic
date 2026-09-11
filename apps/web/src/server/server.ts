/**
 * @fileoverview Fastify server entry. Mounts routes, security
 * middleware, and WS. The graph is instantiated per-session.
 */

import Fastify, {type FastifyInstance} from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import pino from 'pino';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sessionsRoutes} from './routes/sessions.js';
import {invokeRoutes} from './routes/invoke.js';
import {cancelRoutes} from './routes/cancel.js';
import {searchRoutes} from './routes/search.js';
import {healthRoutes} from './routes/health.js';
import {wsRoutes} from './ws.js';
import {authPlugin} from './security/auth.js';
import {cspPlugin} from './security/csp.js';
import {rateLimitPlugin} from './security/rate_limit.js';
import {requestIdPlugin} from './logging.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/**
 * Reads the SPA bundle from disk; injected into every HTML response
 * after `vite build` runs.
 */
function readIndexHtml(): string {
  try {
    return readFileSync(join(__dirname, '..', '..', 'dist', 'index.html'), 'utf8');
  } catch {
    return '<!doctype html><html><body>magic — run `npm run build`</body></html>';
  }
}

/**
 * Builds the Fastify application. The caller is responsible for
 * `listen`ing.
 */
export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: pino({
      level: process.env['LOG_LEVEL'] ?? 'info',
      transport:
        process.env['NODE_ENV'] === 'production'
          ? undefined
          : {target: 'pino-pretty', options: {colorize: true}},
    }),
    genReqId: () => `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  });

  // Security middleware (CSP, CORS, rate limit) + bearer auth.
  await app.register(helmet, {contentSecurityPolicy: false});
  await app.register(cors, {
    origin: process.env['MAGIC_ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  });
  await app.register(rateLimitPlugin);
  await app.register(cspPlugin);
  await app.register(authPlugin);

  // Request-id correlation.
  await app.register(requestIdPlugin);

  // WebSocket support (registered before ws routes so the upgrade hook is present).
  await app.register(websocket);
  await app.register(wsRoutes);

  // REST routes.
  await app.register(healthRoutes, {prefix: '/api'});
  await app.register(sessionsRoutes, {prefix: '/api'});
  await app.register(invokeRoutes, {prefix: '/api'});
  await app.register(cancelRoutes, {prefix: '/api'});
  await app.register(searchRoutes, {prefix: '/api'});

  // Serve the SPA. In dev, the Vite server runs on 5173 and proxies
  // /api and /ws to this server; in prod, we serve the static bundle
  // directly.
  app.get('/', async (_req, reply) => {
    reply.type('text/html').send(readIndexHtml());
  });

  return app;
}

/**
 * Resolves the bind address for the Fastify listener. Defaults to
 * loopback so an unauthenticated dev server is not exposed to the
 * network. Opt-in to all-interfaces binding by setting
 * \`MAGIC_BIND_ALL_INTERFACES=true\` — usually only safe when
 * \`MAGIC_API_TOKEN\` is also set.
 */
export function bindHost(): string {
  return process.env['MAGIC_BIND_ALL_INTERFACES'] === 'true' ? '0.0.0.0' : '127.0.0.1';
}

/**
 * When run directly (e.g. `tsx src/server/server.ts`), start the
 * server on `PORT` (default 4317).
 */
async function main(): Promise<void> {
  const port = Number.parseInt(process.env['PORT'] ?? '4317', 10);
  const app = await buildServer();
  await app.listen({port, host: bindHost()});
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  void main();
}
