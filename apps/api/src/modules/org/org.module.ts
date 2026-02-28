import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { CommandRunnerService } from './command-runner.service';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { OrgToolAdapterService } from './org-tool-adapter.service';

@Module({
  imports: [ConfigModule, IngestionModule],
  providers: [OrgService, CommandRunnerService, OrgToolAdapterService],
  controllers: [OrgController]
})
export class OrgModule {}
