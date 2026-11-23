import { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { App } from 'supertest/types';
import { createSwaggerDocument } from '../src/swagger';
import { createTestApp } from './e2e-utils';

type Operation = {
  summary?: string;
  responses: Record<string, unknown>;
  security?: unknown[];
};

describe('Swagger document (e2e)', () => {
  let app: INestApplication<App>;
  let doc: OpenAPIObject;

  const operations = () =>
    Object.entries(doc.paths).flatMap(([path, item]) =>
      Object.entries(item as Record<string, Operation>).map(([method, op]) => ({
        route: `${method.toUpperCase()} ${path}`,
        op,
      })),
    );

  beforeAll(async () => {
    ({ app } = await createTestApp());
    doc = createSwaggerDocument(app);
  });

  afterAll(() => app.close());

  it('documents all 11 required endpoints', () => {
    expect(
      operations()
        .map((o) => o.route)
        .sort(),
    ).toEqual(
      [
        'POST /users/signup',
        'POST /users/login',
        'GET /users/me',
        'PUT /users/me',
        'DELETE /users/me',
        'POST /todos',
        'GET /todos',
        'GET /todos/search',
        'GET /todos/{id}',
        'PUT /todos/{id}',
        'DELETE /todos/{id}',
      ].sort(),
    );
  });

  it('gives every operation a summary', () => {
    const missing = operations()
      .filter(({ op }) => !op.summary)
      .map((o) => o.route);
    expect(missing).toEqual([]);
  });

  it('marks every authenticated route as bearer-protected', () => {
    const unsecured = operations()
      .filter(({ route }) => !/^POST \/users\/(signup|login)$/.test(route))
      .filter(({ op }) => !op.security?.length)
      .map((o) => o.route);
    expect(unsecured).toEqual([]);
  });

  it('documents response bodies and never exposes a password field', () => {
    const schemas = doc.components?.schemas ?? {};
    expect(Object.keys(schemas)).toEqual(
      expect.arrayContaining([
        'UserResponseDto',
        'AccessTokenDto',
        'TodoResponseDto',
        'ErrorResponseDto',
      ]),
    );
    const responseSchemas = ['UserResponseDto', 'TodoResponseDto'].map((name) =>
      JSON.stringify(schemas[name]),
    );
    for (const schema of responseSchemas) {
      expect(schema).not.toContain('password');
    }
  });
});
