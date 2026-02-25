import { AnalysisModule } from './analysis/analysis.module';
import { AskModule } from './ask/ask.module';
import { ApiErrorFilter } from './common/api-error.filter';
import { ConfigModule } from './config/config.module';
import { GraphModule } from './graph/graph.module';
import { HealthModule } from './health/health.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { MetricsModule } from './observability/metrics.module';
import { QueriesModule } from './queries/queries.module';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule,
    GraphModule,
    IngestionModule,
    QueriesModule,
    AnalysisModule,
    AskModule,
    HealthModule,
    MetricsModule
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApiErrorFilter
    }
  ]
})
export class AppModule {}
