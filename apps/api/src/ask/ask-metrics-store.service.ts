import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { resolveAskMetricsPath } from '../common/path';
import { AppConfigService } from '../config/app-config.service';
import type { AskMeaningMetrics, AskMetricsExportResponse, AskTrustLevel } from './ask.types';

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

  exportSummary(): AskMetricsExportResponse {
    const records = this.readAll();
    const bySnapshotMap = new Map<
      string,
      {
        snapshotId: string;
        count: number;
        trusted: number;
        conditional: number;
        refused: number;
        sumGrounding: number;
        sumConstraint: number;
        sumAmbiguity: number;
        sumRiskSurface: number;
        latestRecordedAt: string;
      }
    >();

    for (const record of records) {
      const existing = bySnapshotMap.get(record.snapshotId) ?? {
        snapshotId: record.snapshotId,
        count: 0,
        trusted: 0,
        conditional: 0,
        refused: 0,
        sumGrounding: 0,
        sumConstraint: 0,
        sumAmbiguity: 0,
        sumRiskSurface: 0,
        latestRecordedAt: record.recordedAt
      };

      existing.count += 1;
      existing.trusted += record.trustLevel === 'trusted' ? 1 : 0;
      existing.conditional += record.trustLevel === 'conditional' ? 1 : 0;
      existing.refused += record.trustLevel === 'refused' ? 1 : 0;
      existing.sumGrounding += record.metrics.groundingScore;
      existing.sumConstraint += record.metrics.constraintSatisfaction;
      existing.sumAmbiguity += record.metrics.ambiguityScore;
      existing.sumRiskSurface += record.metrics.riskSurfaceScore;
      if (record.recordedAt > existing.latestRecordedAt) {
        existing.latestRecordedAt = record.recordedAt;
      }
      bySnapshotMap.set(record.snapshotId, existing);
    }

    const bySnapshot = [...bySnapshotMap.values()]
      .map((item) => ({
        snapshotId: item.snapshotId,
        count: item.count,
        trusted: item.trusted,
        conditional: item.conditional,
        refused: item.refused,
        avgGroundingScore: round(item.sumGrounding / item.count),
        avgConstraintSatisfaction: round(item.sumConstraint / item.count),
        avgAmbiguityScore: round(item.sumAmbiguity / item.count),
        avgRiskSurfaceScore: round(item.sumRiskSurface / item.count),
        latestRecordedAt: item.latestRecordedAt
      }))
      .sort((a, b) => a.snapshotId.localeCompare(b.snapshotId));

    return {
      status: 'implemented',
      totalRecords: records.length,
      bySnapshot
    };
  }

  private readAll(): AskMetricRecord[] {
    if (!fs.existsSync(this.metricsPath)) {
      return [];
    }
    const raw = fs.readFileSync(this.metricsPath, 'utf8').trim();
    if (raw.length === 0) {
      return [];
    }
    return raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as AskMetricRecord);
  }
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
