/**
 * @fileoverview Bearer-token auth plugin. Reads `MAGIC_API_TOKEN` at
 * boot; when set, requires `Authorization: Bearer <token>` on every
 * `/api/*` route except `/api/health/*`. When unset, auth is bypassed
 * (localhost assumption).
 */

import type {FastifyPluginAsync} from 'fastify';
import fp from 'fastify-plugin';
import {isValidApiToken, extractBearerToken, isPublicPath, authRequired} from '@magic/web-shared/auth';

const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req, reply) => {
    if (!authRequired()) {
      return; // auth disabled when token is not configured
    }
    if (isPublicPath(req.url)) {
      return;
    }
    const header = req.headers.authorization;
    const presented = extractBearerToken(header);
    if (!isValidApiToken(presented)) {
      return reply.code(401).send({error: 'unauthorized'});
    }
  });
});

export default authPlugin;
export {authPlugin};
