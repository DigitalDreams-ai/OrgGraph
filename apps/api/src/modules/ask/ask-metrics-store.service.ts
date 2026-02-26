import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { resolveAskMetricsPath } from '../../common/path';
import { AppConfigService } from '../../config/app-config.service';
import type { AskMeaningMetrics, AskMetricsExportResponse, AskTrustLevel } from './ask.types';
import type { LlmProviderName } from '../llm/llm.types';

interface AskMetricRecord {
  recordedAt: string;
  snapshotId: string;
  policyId: string;
  query: string;
  intent: string;
  trustLevel: AskTrustLevel;
  metrics: AskMeaningMetrics;
  llm?: {
    provider: LlmProviderName;
    model?: string;
    used: boolean;
    latencyMs?: number;
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
    estimatedCostUsd?: number;
    fallbackReason?: string;
  };
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

    const byProviderMap = new Map<
      string,
      {
        provider: LlmProviderName;
        model?: string;
        count: number;
        successCount: number;
        errorCount: number;
        sumLatencyMs: number;
        latencyCount: number;
        sumInputTokens: number;
        sumOutputTokens: number;
        sumTotalTokens: number;
        tokenCount: number;
        sumEstimatedCostUsd: number;
        costCount: number;
      }
    >();

    for (const record of records) {
      const provider = record.llm?.provider ?? 'none';
      const model = record.llm?.model;
      const key = `${provider}|${model ?? ''}`;
      const existing = byProviderMap.get(key) ?? {
        provider,
        model,
        count: 0,
        successCount: 0,
        errorCount: 0,
        sumLatencyMs: 0,
        latencyCount: 0,
        sumInputTokens: 0,
        sumOutputTokens: 0,
        sumTotalTokens: 0,
        tokenCount: 0,
        sumEstimatedCostUsd: 0,
        costCount: 0
      };

      existing.count += 1;
      if (record.llm?.used) {
        existing.successCount += 1;
      } else if (record.llm?.fallbackReason) {
        existing.errorCount += 1;
      }

      if (typeof record.llm?.latencyMs === 'number') {
        existing.sumLatencyMs += record.llm.latencyMs;
        existing.latencyCount += 1;
      }
      if (record.llm?.tokenUsage) {
        existing.sumInputTokens += record.llm.tokenUsage.input;
        existing.sumOutputTokens += record.llm.tokenUsage.output;
        existing.sumTotalTokens += record.llm.tokenUsage.total;
        existing.tokenCount += 1;
      }
      if (typeof record.llm?.estimatedCostUsd === 'number') {
        existing.sumEstimatedCostUsd += record.llm.estimatedCostUsd;
        existing.costCount += 1;
      }
      byProviderMap.set(key, existing);
    }

    const byProvider = [...byProviderMap.values()]
      .map((item) => ({
        provider: item.provider,
        model: item.model,
        count: item.count,
        successCount: item.successCount,
        errorCount: item.errorCount,
        errorRate: item.count > 0 ? round(item.errorCount / item.count) : 0,
        avgLatencyMs: item.latencyCount > 0 ? round(item.sumLatencyMs / item.latencyCount) : undefined,
        avgInputTokens: item.tokenCount > 0 ? round(item.sumInputTokens / item.tokenCount) : undefined,
        avgOutputTokens: item.tokenCount > 0 ? round(item.sumOutputTokens / item.tokenCount) : undefined,
        avgTotalTokens: item.tokenCount > 0 ? round(item.sumTotalTokens / item.tokenCount) : undefined,
        avgEstimatedCostUsd:
          item.costCount > 0 ? round(item.sumEstimatedCostUsd / item.costCount) : undefined
      }))
      .sort((a, b) => a.provider.localeCompare(b.provider) || (a.model ?? '').localeCompare(b.model ?? ''));

    return {
      status: 'implemented',
      totalRecords: records.length,
      bySnapshot,
      byProvider
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
