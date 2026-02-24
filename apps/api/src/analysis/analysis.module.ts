import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  providers: [AnalysisService],
  controllers: [AnalysisController]
})
export class AnalysisModule {}
