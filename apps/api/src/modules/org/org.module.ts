import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { CommandRunnerService } from './command-runner.service';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';

@Module({
  imports: [ConfigModule, IngestionModule],
  providers: [OrgService, CommandRunnerService],
  controllers: [OrgController]
})
export class OrgModule {}

