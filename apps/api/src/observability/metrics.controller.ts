import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('/metrics')
  metrics(): {
    status: 'ok';
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
      ...snapshot
    };
  }
}

