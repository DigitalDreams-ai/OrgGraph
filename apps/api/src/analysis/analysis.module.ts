import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [GraphModule],
  providers: [AnalysisService],
  controllers: [AnalysisController],
  exports: [AnalysisService]
})
export class AnalysisModule {}
