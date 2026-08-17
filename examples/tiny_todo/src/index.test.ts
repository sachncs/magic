import {describe, it, expect, beforeEach} from 'vitest';
import request from 'supertest';
import app from './index.js';

describe('tiny-todo', () => {
  beforeEach(() => {
    // No global state to reset in this minimal fixture.
  });

  it('GET /health returns ok', async () => {
    const r = await request(app).get('/health');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ok: true});
  });

  it('POST /todos creates a todo', async () => {
    const r = await request(app).post('/todos').send({title: 'buy milk'});
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({title: 'buy milk', done: false});
    expect(typeof r.body.id).toBe('string');
  });

  it('POST /todos rejects missing title', async () => {
    const r = await request(app).post('/todos').send({});
    expect(r.status).toBe(400);
  });

  it('GET /todos/:id returns 404 for unknown id', async () => {
    const r = await request(app).get('/todos/does-not-exist');
    expect(r.status).toBe(404);
  });
});
