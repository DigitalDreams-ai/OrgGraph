import { Controller, Get } from '@nestjs/common';
import { GraphService } from '../graph/graph.service';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly graphService: GraphService
  ) {}

  @Get('/metrics')
  metrics(): {
    status: 'ok';
    dbBackend: string;
    totalRequests: number;
    byRoute: Array<{
      path: string;
      method: string;
      requestCount: number;
      avgElapsedMs: number;
      lastStatusCode: number;
      lastSeenAt: string;
    }>;
  } {
    const snapshot = this.metricsService.snapshot();
    return {
      status: 'ok',
      dbBackend: this.graphService.backend(),
      ...snapshot
    };
  }
}
