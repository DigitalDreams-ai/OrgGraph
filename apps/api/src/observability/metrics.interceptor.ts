import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { AppConfigService } from '../config/app-config.service';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);
  private static readonly LOG_EXCLUDED_PATHS = new Set(['/ready']);

  constructor(
    private readonly metrics: MetricsService,
    private readonly configService: AppConfigService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    return next.handle().pipe(
      finalize(() => {
        const path = typeof request?.route?.path === 'string' ? request.route.path : request.url;
        const method = request?.method ?? 'UNKNOWN';
        const statusCode = Number(response?.statusCode ?? 0);
        const elapsedMs = Date.now() - startedAt;
        this.metrics.record(path, method, statusCode, elapsedMs);
        if (
          this.configService.httpLogEnabled() &&
          !MetricsInterceptor.LOG_EXCLUDED_PATHS.has(path)
        ) {
          this.logger.log(`${method} ${path} -> ${statusCode} (${elapsedMs}ms)`);
        }
      })
    );
  }
}
