import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, resetDb, signupAndLogin } from './e2e-utils';

interface TodoBody {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  userId: string;
}

describe('Todos (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let alice: string;
  let bob: string;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const createTodo = async (
    token: string,
    body: Partial<TodoBody>,
  ): Promise<TodoBody> =>
    (await http().post('/todos').set(as(token)).send(body).expect(201))
      .body as TodoBody;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDb(prisma);
    alice = await signupAndLogin(app, 'alice');
    bob = await signupAndLogin(app, 'bob_1');
  });

  afterAll(() => app.close());

  it('requires authentication on every route', async () => {
    await http().get('/todos').expect(401);
    await http().post('/todos').send({ title: 'x' }).expect(401);
    await http().get('/todos/1').expect(401);
    await http().get('/todos/search?keyword=x').expect(401);
    await http().put('/todos/1').send({ title: 'x' }).expect(401);
    await http().delete('/todos/1').expect(401);
  });

  describe('CRUD', () => {
    it('creates with defaults', async () => {
      const todo = await createTodo(alice, { title: 'Buy milk' });
      expect(todo).toMatchObject({
        title: 'Buy milk',
        description: null,
        completed: false,
        userId: 'alice',
      });
    });

    it('lists own todos, newest first', async () => {
      await createTodo(alice, { title: 'first' });
      await createTodo(alice, { title: 'second' });
      const res = await http().get('/todos').set(as(alice)).expect(200);
      expect((res.body as TodoBody[]).map((t) => t.title)).toEqual([
        'second',
        'first',
      ]);
    });

    it('gets one by id', async () => {
      const todo = await createTodo(alice, { title: 'Buy milk' });
      const res = await http()
        .get(`/todos/${todo.id}`)
        .set(as(alice))
        .expect(200);
      expect(res.body).toMatchObject({ id: todo.id, title: 'Buy milk' });
    });

    it('PUT is a partial update', async () => {
      const todo = await createTodo(alice, {
        title: 'Buy milk',
        description: '2 liters',
      });
      const res = await http()
        .put(`/todos/${todo.id}`)
        .set(as(alice))
        .send({ completed: true })
        .expect(200);
      expect(res.body).toMatchObject({
        title: 'Buy milk',
        description: '2 liters',
        completed: true,
      });
    });

    it('deletes', async () => {
      const todo = await createTodo(alice, { title: 'Buy milk' });
      await http().delete(`/todos/${todo.id}`).set(as(alice)).expect(204);
      await http().get(`/todos/${todo.id}`).set(as(alice)).expect(404);
    });

    it('returns 404 for a missing todo', async () => {
      await http().get('/todos/999999').set(as(alice)).expect(404);
      await http()
        .put('/todos/999999')
        .set(as(alice))
        .send({ title: 'x' })
        .expect(404);
      await http().delete('/todos/999999').set(as(alice)).expect(404);
    });
  });

  describe('ownership isolation', () => {
    it("another user's todo is a 404 on GET, PUT and DELETE, and stays unchanged", async () => {
      const todo = await createTodo(alice, { title: 'Alice only' });

      await http().get(`/todos/${todo.id}`).set(as(bob)).expect(404);
      await http()
        .put(`/todos/${todo.id}`)
        .set(as(bob))
        .send({ title: 'hacked', completed: true })
        .expect(404);
      await http().delete(`/todos/${todo.id}`).set(as(bob)).expect(404);

      const row = await prisma.todo.findUniqueOrThrow({
        where: { id: todo.id },
      });
      expect(row).toMatchObject({ title: 'Alice only', completed: false });
    });

    it('list and search return only the caller’s todos', async () => {
      await createTodo(alice, { title: 'shared word alice' });
      await createTodo(bob, { title: 'shared word bob' });

      const list = await http().get('/todos').set(as(bob)).expect(200);
      expect((list.body as TodoBody[]).map((t) => t.userId)).toEqual(['bob_1']);

      const search = await http()
        .get('/todos/search')
        .query({ keyword: 'shared' })
        .set(as(bob))
        .expect(200);
      expect((search.body as TodoBody[]).map((t) => t.title)).toEqual([
        'shared word bob',
      ]);
    });
  });

  describe('GET /todos/search', () => {
    it('matches title and description', async () => {
      await createTodo(alice, { title: 'Buy milk' });
      await createTodo(alice, {
        title: 'Groceries',
        description: 'milk, eggs',
      });
      await createTodo(alice, { title: 'Unrelated' });

      const res = await http()
        .get('/todos/search')
        .query({ keyword: 'milk' })
        .set(as(alice))
        .expect(200);
      expect((res.body as TodoBody[]).map((t) => t.title).sort()).toEqual([
        'Buy milk',
        'Groceries',
      ]);
    });

    it('ignores ASCII letter case', async () => {
      await createTodo(alice, { title: 'Buy MILK' });
      const res = await http()
        .get('/todos/search')
        .query({ keyword: 'milk' })
        .set(as(alice))
        .expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('matches Korean text', async () => {
      await createTodo(alice, { title: '우유 사기' });
      const res = await http()
        .get('/todos/search')
        .query({ keyword: '우유' })
        .set(as(alice))
        .expect(200);
      expect(res.body).toHaveLength(1);
    });

    it('trims the keyword', async () => {
      await createTodo(alice, { title: 'Buy milk' });
      const res = await http()
        .get('/todos/search')
        .query({ keyword: '  milk  ' })
        .set(as(alice))
        .expect(200);
      expect(res.body).toHaveLength(1);
    });

    it.each([
      ['missing', ''],
      ['empty', '?keyword='],
      ['whitespace only', '?keyword=%20%20'],
    ])('returns 400 when keyword is %s', async (_label, qs) => {
      await http().get(`/todos/search${qs}`).set(as(alice)).expect(400);
    });
  });

  describe('validation', () => {
    it.each([
      ['missing title', {}],
      ['empty title', { title: '' }],
      ['non-boolean completed', { title: 'x', completed: 'yes' }],
      ['unknown field', { title: 'x', userId: 'bob_1' }],
    ])('POST returns 400 for %s', async (_label, body) => {
      await http().post('/todos').set(as(alice)).send(body).expect(400);
    });

    it('returns 400 for a non-numeric id', async () => {
      await http().get('/todos/abc').set(as(alice)).expect(400);
    });
  });
});
