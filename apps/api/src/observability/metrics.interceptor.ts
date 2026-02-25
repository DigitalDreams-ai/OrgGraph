import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

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
        this.metrics.record(path, method, statusCode, Date.now() - startedAt);
      })
    );
  }
}

