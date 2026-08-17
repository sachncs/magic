/**
 * @fileoverview Tiny Todo fixture. A minimal Express app used by
 * magic's e2e tests. One route, one test, one lint script.
 */

import express, {type Request, type Response} from 'express';

const app = express();
app.use(express.json());

interface Todo {
  id: string;
  title: string;
  done: boolean;
}

const store = new Map<string, Todo>();

app.get('/health', (_req: Request, res: Response) => {
  res.json({ok: true});
});

app.post('/todos', (req: Request, res: Response) => {
  const {title} = req.body as {title?: string};
  if (typeof title !== 'string' || title.length === 0) {
    return res.status(400).json({error: 'title required'});
  }
  const todo: Todo = {id: crypto.randomUUID(), title, done: false};
  store.set(todo.id, todo);
  return res.status(201).json(todo);
});

app.get('/todos/:id', (req: Request, res: Response) => {
  const id = req.params.id ?? '';
  const todo = store.get(id);
  if (todo === undefined) {
    return res.status(404).json({error: 'not found'});
  }
  return res.json(todo);
});

app.get('/todos', (_req: Request, res: Response) => {
  return res.json([...store.values()]);
});

const port = Number.parseInt(process.env['PORT'] ?? '0', 10);
if (port > 0) {
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`tiny-todo listening on ${port}`);
  });
}

export default app;
