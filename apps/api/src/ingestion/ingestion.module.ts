import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { PermissionsParserService } from './permissions-parser.service';

@Module({
  imports: [GraphModule],
  providers: [IngestionService, PermissionsParserService],
  controllers: [IngestionController],
  exports: [PermissionsParserService]
})
export class IngestionModule {}
