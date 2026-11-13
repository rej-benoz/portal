import { type INestApplication, ValidationPipe } from '@nestjs/common';

/** Global request handling shared by main.ts and the HTTP tests. */
export function configureApp(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
}
