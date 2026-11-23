import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { createTestApp, PASSWORD, resetDb, signupAndLogin } from './e2e-utils';

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(() => resetDb(prisma));

  afterAll(() => app.close());

  describe('Required scenarios', () => {
    it('[Scenario 1] signup -> login -> GET /users/me with the issued token succeeds', async () => {
      const signup = await http()
        .post('/users/signup')
        .send({ id: 'alice', password: PASSWORD })
        .expect(201);
      expect(signup.body).toEqual({ id: 'alice' });

      const login = await http()
        .post('/users/login')
        .send({ id: 'alice', password: PASSWORD })
        .expect(200);
      const { access_token } = login.body as { access_token: string };
      expect(access_token).toEqual(expect.any(String));

      const me = await http()
        .get('/users/me')
        .set(bearer(access_token))
        .expect(200);
      expect(me.body).toEqual({ id: 'alice' });
    });

    it.each([
      ['GET', () => http().get('/users/me')],
      ['PUT', () => http().put('/users/me').send({ password: 'new-password' })],
      ['DELETE', () => http().delete('/users/me')],
    ])(
      '[Scenario 3] %s /users/me without a token returns 401',
      async (_method, call) => {
        await call().expect(401);
      },
    );
  });

  describe('POST /users/signup', () => {
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
    it('returns 401 for a malformed token', async () => {
      await http().get('/users/me').set(bearer('not-a-jwt')).expect(401);
    });

    it('PUT changes the password: old fails, new works', async () => {
      const token = await signupAndLogin(app, 'alice');
      const res = await http()
        .put('/users/me')
        .set(bearer(token))
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
        .set(bearer(token))
        .send({ id: 'mallory', password: 'new-password-456' })
        .expect(400);
    });

    it('PUT rejects a short password', async () => {
      const token = await signupAndLogin(app, 'alice');
      await http()
        .put('/users/me')
        .set(bearer(token))
        .send({ password: 'short' })
        .expect(400);
    });

    it('DELETE removes the user and their todos; the token stops working', async () => {
      const token = await signupAndLogin(app, 'alice');
      await http()
        .post('/todos')
        .set(bearer(token))
        .send({ title: 'will be deleted' })
        .expect(201);

      await http().delete('/users/me').set(bearer(token)).expect(204);

      await http().get('/users/me').set(bearer(token)).expect(401);
      expect(await prisma.user.count()).toBe(0);
      expect(await prisma.todo.count()).toBe(0);
    });
  });
});
