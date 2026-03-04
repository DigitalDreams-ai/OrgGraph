import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { RuntimeBootstrapService } from './config/runtime-bootstrap.service';

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

  const runtimeBootstrap = app.get(RuntimeBootstrapService);
  const bootstrapReady = await runtimeBootstrap.ensureRuntimeReady();
  if (!bootstrapReady) {
    const state = runtimeBootstrap.getBootstrapState();
    new Logger('Bootstrap').error(
      `runtime bootstrap failed; server will stay fail-closed until fixed (${state.message ?? 'unknown reason'})`
    );
  }

  const port = configService.port();
  await app.listen(port);
}

bootstrap();
