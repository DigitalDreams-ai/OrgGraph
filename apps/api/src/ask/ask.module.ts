import { Module } from '@nestjs/common';
import { AnalysisModule } from '../analysis/analysis.module';
import { EvidenceModule } from '../evidence/evidence.module';
import { PlannerModule } from '../planner/planner.module';
import { QueriesModule } from '../queries/queries.module';
import { AskController } from './ask.controller';
import { AskService } from './ask.service';

@Module({
  imports: [PlannerModule, EvidenceModule, QueriesModule, AnalysisModule],
  providers: [AskService],
  controllers: [AskController]
})
export class AskModule {}
