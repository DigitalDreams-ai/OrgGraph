import { Controller, Get, Module } from '@nestjs/common';
import { AnalysisModule } from './analysis/analysis.module';
import { AskModule } from './ask/ask.module';
import { ConfigModule } from './config/config.module';
import { GraphModule } from './graph/graph.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { QueriesModule } from './queries/queries.module';

@Controller()
class HealthController {
  @Get('/health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}

@Module({
  imports: [ConfigModule, GraphModule, IngestionModule, QueriesModule, AnalysisModule, AskModule],
  controllers: [HealthController]
})
export class AppModule {}
