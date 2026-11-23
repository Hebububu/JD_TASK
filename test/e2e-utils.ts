import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

export async function createTestApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}

/** SQLite has no TRUNCATE; delete children first. */
export async function resetDb(prisma: PrismaService) {
  await prisma.todo.deleteMany();
  await prisma.user.deleteMany();
}

export const PASSWORD = 'password123';

/** Signs up `id` and returns a bearer token for it. */
export async function signupAndLogin(
  app: INestApplication<App>,
  id: string,
  password = PASSWORD,
): Promise<string> {
  await request(app.getHttpServer())
    .post('/users/signup')
    .send({ id, password })
    .expect(201);
  const res = await request(app.getHttpServer())
    .post('/users/login')
    .send({ id, password })
    .expect(200);
  return (res.body as { access_token: string }).access_token;
}
