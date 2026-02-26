import { Injectable } from '@nestjs/common';

interface MetricPoint {
  path: string;
  method: string;
  statusCode: number;
  elapsedMs: number;
  timestamp: string;
}

@Injectable()
export class MetricsService {
  private readonly points: MetricPoint[] = [];

  record(path: string, method: string, statusCode: number, elapsedMs: number): void {
    this.points.push({
      path,
      method,
      statusCode,
      elapsedMs,
      timestamp: new Date().toISOString()
    });

    // Keep memory bounded for long-running NAS process.
    if (this.points.length > 2000) {
      this.points.splice(0, this.points.length - 2000);
    }
  }

  snapshot(): {
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
    const map = new Map<
      string,
      {
        path: string;
        method: string;
        requestCount: number;
        totalElapsedMs: number;
        lastStatusCode: number;
        lastSeenAt: string;
      }
    >();

    for (const point of this.points) {
      const key = `${point.method} ${point.path}`;
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          path: point.path,
          method: point.method,
          requestCount: 1,
          totalElapsedMs: point.elapsedMs,
          lastStatusCode: point.statusCode,
          lastSeenAt: point.timestamp
        });
      } else {
        current.requestCount += 1;
        current.totalElapsedMs += point.elapsedMs;
        current.lastStatusCode = point.statusCode;
        current.lastSeenAt = point.timestamp;
      }
    }

    const byRoute = [...map.values()]
      .map((item) => ({
        path: item.path,
        method: item.method,
        requestCount: item.requestCount,
        avgElapsedMs: Math.round((item.totalElapsedMs / item.requestCount) * 100) / 100,
        lastStatusCode: item.lastStatusCode,
        lastSeenAt: item.lastSeenAt
      }))
      .sort((a, b) => b.requestCount - a.requestCount || a.path.localeCompare(b.path));

    return {
      totalRequests: this.points.length,
      byRoute
    };
  }
}

