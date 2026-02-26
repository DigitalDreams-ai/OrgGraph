import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { resolveAskMetricsPath } from '../common/path';
import { AppConfigService } from '../config/app-config.service';
import type { AskMeaningMetrics, AskTrustLevel } from './ask.types';

interface AskMetricRecord {
  recordedAt: string;
  snapshotId: string;
  policyId: string;
  query: string;
  intent: string;
  trustLevel: AskTrustLevel;
  metrics: AskMeaningMetrics;
}

@Injectable()
export class AskMetricsStoreService {
  private readonly metricsPath: string;

  constructor(private readonly config: AppConfigService) {
    this.metricsPath = resolveAskMetricsPath(this.config.askMetricsPath());
    fs.mkdirSync(path.dirname(this.metricsPath), { recursive: true });
  }

  append(record: AskMetricRecord): void {
    fs.appendFileSync(this.metricsPath, `${JSON.stringify(record)}\n`, 'utf8');
  }
}
