import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { ApexTriggerParserService } from './apex-trigger-parser.service';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { PermissionsParserService } from './permissions-parser.service';

@Module({
  imports: [GraphModule],
  providers: [IngestionService, PermissionsParserService, ApexTriggerParserService],
  controllers: [IngestionController],
  exports: [PermissionsParserService, ApexTriggerParserService]
})
export class IngestionModule {}
