/**
 * @fileoverview /api/health/* routes. /live is always 200; /ready
 * probes the configured model + storage.
 */

import type {FastifyPluginAsync} from 'fastify';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health/live', async () => ({ok: true}));
  app.get('/health/ready', async (_req, reply) => {
    try {
      // Probe model: the buildModel() call throws ModelNotConfiguredError
      // when no provider is set. Storage probe is a stat() of dataDir.
      const {buildModel} = await import('@magic/agent-graph/model');
      const {dataDirExists} = await import('@magic/storage/data_dir');
      const model = buildModel();
      const dir = await dataDirExists();
      if (!dir) {
        return reply.code(503).send({ok: false, reason: 'data dir not initialised'});
      }
      return {ok: true, model: model.providerId, dataDir: dir};
    } catch (e) {
      return reply.code(503).send({ok: false, reason: (e as Error).message});
    }
  });
};

export default healthRoutes;
export {healthRoutes};
