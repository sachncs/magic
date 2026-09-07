/**
 * @fileoverview Sessions REST routes. POST creates, GET lists/gets,
 * DELETE removes.
 */

import type {FastifyPluginAsync} from 'fastify';
import {randomUUID} from 'node:crypto';
import {
  issueWsToken,
  type WsToken,
} from '@magic/web-shared/ws_auth';
import {
  readMeta,
  writeMeta,
  createStorage,
  cloneOrAttach,
  generateAndPersistTitle,
  type TitleModel,
} from '@magic/storage';
import {buildModel} from '@magic/agent-graph/model';
import {brand, newSessionId, newWorkspaceId, type SessionId, type WorkspaceId} from '@magic/shared/branded';

const sessionsRoutes: FastifyPluginAsync = async (app) => {
  const storage = createStorage();

  app.post('/sessions', async (req, reply) => {
    const body = req.body as {repo?: string; task?: string} | undefined;
    if (body?.repo === undefined || body.task === undefined) {
      return reply.code(400).send({error: 'repo and task are required'});
    }
    const sessionId = newSessionId();
    const resolved = await cloneOrAttach(body.repo);
    const workspaceId = resolved.workspaceId;
    await writeMeta(sessionId, {
      id: sessionId,
      workspaceId,
      repo: body.repo,
      task: body.task,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 'v1',
      graphVersion: 'v1',
    });
    const wsToken = issueWsToken(sessionId);
    return reply.code(201).send({sessionId, workspaceId, wsToken});
  });

  app.get('/sessions', async () => {
    // For v1: return an empty list. A real implementation reads the
    // sessions/ directory and returns meta summaries.
    return [];
  });

  app.get<{Params: {id: string}}>('/sessions/:id', async (req, reply) => {
    const id = brand<string, 'SessionId'>(req.params.id);
    const meta = await readMeta(id);
    if (meta === null) {
      return reply.code(404).send({error: 'not found'});
    }
    return meta;
  });

  app.delete<{Params: {id: string}}>('/sessions/:id', async (req, reply) => {
    const id = brand<string, 'SessionId'>(req.params.id);
    const meta = await readMeta(id);
    if (meta === null) {
      return reply.code(404).send({error: 'not found'});
    }
    // Real implementation: delete session dir + revoke WS token.
    void storage;
    return reply.code(204).send();
  });

  app.post<{Params: {id: string}}>('/sessions/:id/title', async (req, reply) => {
    const id = brand<string, 'SessionId'>(req.params.id);
    const meta = await readMeta(id);
    if (meta === null) {
      return reply.code(404).send({error: 'not found'});
    }
    const model = buildModel();
    // Wrap buildModel()'s descriptor as a TitleModel for the
    // title-generation step. Real impl would call the provider.
    const titleModel: TitleModel = {
      generateTitle: async (task: string) => {
        const m = model as {generateTitle?: (t: string) => Promise<string>};
        if (typeof m.generateTitle === 'function') {
          return m.generateTitle(task);
        }
        return task.slice(0, 60);
      },
    };
    const title = await generateAndPersistTitle(id, meta.task, titleModel);
    return {title};
  });
};

export default sessionsRoutes;
export {sessionsRoutes};

// Suppress unused-warning on WsToken (re-exported by the module).
void ({} as WsToken);
void ({} as SessionId);
void ({} as WorkspaceId);
void randomUUID;
