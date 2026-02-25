import { Module } from '@nestjs/common';
import { EvidenceModule } from '../evidence/evidence.module';
import { GraphModule } from '../graph/graph.module';
import { ApexClassParserService } from './apex-class-parser.service';
import { ApexTriggerParserService } from './apex-trigger-parser.service';
import { FlowParserService } from './flow-parser.service';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { PermissionsParserService } from './permissions-parser.service';

@Module({
  imports: [GraphModule, EvidenceModule],
  providers: [
    IngestionService,
    PermissionsParserService,
    ApexTriggerParserService,
    ApexClassParserService,
    FlowParserService
  ],
  controllers: [IngestionController],
  exports: [
    PermissionsParserService,
    ApexTriggerParserService,
    ApexClassParserService,
    FlowParserService
  ]
})
export class IngestionModule {}
