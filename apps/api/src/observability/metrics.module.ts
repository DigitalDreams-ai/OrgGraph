import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { GraphModule } from '../graph/graph.module';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

@Module({
  imports: [GraphModule],
  providers: [
    MetricsService,
    MetricsInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor
    }
  ],
  controllers: [MetricsController],
  exports: [MetricsService]
})
export class MetricsModule {}
