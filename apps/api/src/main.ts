import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(AppConfigService);
  app.useLogger(configService.nestLogLevels());
  app.enableCors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.toLowerCase();
      const allowed =
        normalizedOrigin === 'tauri://localhost' ||
        normalizedOrigin === 'https://tauri.localhost' ||
        normalizedOrigin === 'http://tauri.localhost' ||
        /^https?:\/\/(127\.0\.0\.1|localhost):\d+$/.test(normalizedOrigin);

      callback(null, allowed);
    }
  });

  const port = configService.port();
  await app.listen(port);
}

bootstrap();
