import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, PASSWORD, resetDb, signupAndLogin } from './e2e-utils';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(() => resetDb(prisma));

  afterAll(() => app.close());

  describe('POST /users/signup', () => {
    it('creates a user and returns only the id', async () => {
      const res = await http()
        .post('/users/signup')
        .send({ id: 'alice', password: PASSWORD })
        .expect(201);
      expect(res.body).toEqual({ id: 'alice' });
    });

    it('stores a hash, not the plaintext password', async () => {
      await http()
        .post('/users/signup')
        .send({ id: 'alice', password: PASSWORD })
        .expect(201);
      const row = await prisma.user.findUniqueOrThrow({
        where: { id: 'alice' },
      });
      expect(row.password).not.toBe(PASSWORD);
    });

    it('returns 409 for a duplicate id', async () => {
      await http()
        .post('/users/signup')
        .send({ id: 'alice', password: PASSWORD })
        .expect(201);
      await http()
        .post('/users/signup')
        .send({ id: 'alice', password: 'another-password' })
        .expect(409);
    });

    it.each([
      ['too short id', { id: 'abc', password: PASSWORD }],
      ['invalid id characters', { id: 'al ice!', password: PASSWORD }],
      ['short password', { id: 'alice', password: 'short' }],
      ['missing password', { id: 'alice' }],
      ['unknown field', { id: 'alice', password: PASSWORD, role: 'admin' }],
    ])('returns 400 for %s', async (_label, body) => {
      await http().post('/users/signup').send(body).expect(400);
    });
  });

  describe('POST /users/login', () => {
    beforeEach(() =>
      http().post('/users/signup').send({ id: 'alice', password: PASSWORD }),
    );

    it('returns an access_token for correct credentials', async () => {
      const res = await http()
        .post('/users/login')
        .send({ id: 'alice', password: PASSWORD })
        .expect(200);
      expect(res.body).toEqual({ access_token: expect.any(String) });
    });

    it('returns the same 401 for a wrong password and an unknown id', async () => {
      const wrongPassword = await http()
        .post('/users/login')
        .send({ id: 'alice', password: 'wrong-password' })
        .expect(401);
      const unknownId = await http()
        .post('/users/login')
        .send({ id: 'nobody', password: PASSWORD })
        .expect(401);
      expect(wrongPassword.body).toEqual(unknownId.body);
    });
  });

  describe('/users/me', () => {
    it('returns 401 without a token', async () => {
      await http().get('/users/me').expect(401);
    });

    it('returns 401 for a malformed token', async () => {
      await http()
        .get('/users/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
    });

    it('GET returns the current user id only', async () => {
      const token = await signupAndLogin(app, 'alice');
      const res = await http()
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(res.body).toEqual({ id: 'alice' });
    });

    it('PUT changes the password: old fails, new works', async () => {
      const token = await signupAndLogin(app, 'alice');
      const res = await http()
        .put('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'new-password-456' })
        .expect(200);
      expect(res.body).toEqual({ id: 'alice' });

      await http()
        .post('/users/login')
        .send({ id: 'alice', password: PASSWORD })
        .expect(401);
      await http()
        .post('/users/login')
        .send({ id: 'alice', password: 'new-password-456' })
        .expect(200);
    });

    it('PUT rejects changing the id', async () => {
      const token = await signupAndLogin(app, 'alice');
      await http()
        .put('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ id: 'mallory', password: 'new-password-456' })
        .expect(400);
    });

    it('PUT rejects a short password', async () => {
      const token = await signupAndLogin(app, 'alice');
      await http()
        .put('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'short' })
        .expect(400);
    });

    it('DELETE removes the user and their todos; the token stops working', async () => {
      const token = await signupAndLogin(app, 'alice');
      await http()
        .post('/todos')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'will be deleted' })
        .expect(201);

      await http()
        .delete('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      await http()
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(await prisma.user.count()).toBe(0);
      expect(await prisma.todo.count()).toBe(0);
    });
  });
});
