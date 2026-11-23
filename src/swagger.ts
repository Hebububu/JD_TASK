import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

export function createSwaggerDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('TODO API')
    .setDescription(
      'Personal todo lists with JWT auth. Sign up, log in, then click ' +
        '"Authorize" and paste the access_token.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}

/** Serves Swagger UI at /docs and the raw spec at /docs-json. */
export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('docs', app, createSwaggerDocument(app), {
    swaggerOptions: { persistAuthorization: true },
  });
}
