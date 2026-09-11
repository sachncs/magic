/**
 * @fileoverview GET /api/sessions/search?q=... Cross-session search
 * via the storage layer. The base \`/api/sessions\` path is reserved
 * for the session list endpoint; renaming here prevents Fastify's
 * duplicate-route detection from rejecting both plugins at boot.
 */

import type {FastifyPluginAsync} from 'fastify';
import {searchAllSessions, createStorage} from '@magic/storage';

const searchRoutes: FastifyPluginAsync = async (app) => {
  const storage = createStorage();
  app.get<{Querystring: {q?: string; limit?: string}}>('/sessions/search', async (req) => {
    const q = req.query.q ?? '';
    const limit = req.query.limit !== undefined ? Number.parseInt(req.query.limit, 10) : 20;
    if (q.length === 0) {
      return {hits: []};
    }
    const hits = await searchAllSessions(q, {limit, sqlite: storage.sqlite});
    return {hits};
  });
};

export default searchRoutes;
export {searchRoutes};
