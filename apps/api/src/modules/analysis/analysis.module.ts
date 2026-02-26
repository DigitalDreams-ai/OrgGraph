import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { MetaModule } from '../meta/meta.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [GraphModule, MetaModule],
  providers: [AnalysisService],
  controllers: [AnalysisController],
  exports: [AnalysisService]
})
export class AnalysisModule {}
