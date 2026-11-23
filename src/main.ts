import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { setupSwagger } from './swagger';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  setupSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
