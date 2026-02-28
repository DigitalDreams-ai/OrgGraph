import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { RuntimePathsService } from './runtime-paths.service';

@Global()
@Module({
  providers: [AppConfigService, RuntimePathsService],
  exports: [AppConfigService, RuntimePathsService]
})
export class ConfigModule {}
