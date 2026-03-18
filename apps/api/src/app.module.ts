import { AnalysisModule } from './modules/analysis/analysis.module';
import { AskModule } from './modules/ask/ask.module';
import { ApiErrorFilter } from './common/api-error.filter';
import { ConfigModule } from './config/config.module';
import { RuntimeBootstrapService } from './config/runtime-bootstrap.service';
import { GithubModule } from './modules/github/github.module';
import { GraphModule } from './modules/graph/graph.module';
import { HealthModule } from './modules/health/health.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { MetaModule } from './modules/meta/meta.module';
import { MetricsModule } from './modules/observability/metrics.module';
import { OrgModule } from './modules/org/org.module';
import { QueriesModule } from './modules/queries/queries.module';
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule,
    GraphModule,
    IngestionModule,
    MetaModule,
    QueriesModule,
    AnalysisModule,
    AskModule,
    GithubModule,
    HealthModule,
    MetricsModule,
    OrgModule
  ],
  providers: [
    RuntimeBootstrapService,
    {
      provide: APP_FILTER,
      useClass: ApiErrorFilter
    }
  ]
})
export class AppModule {}
