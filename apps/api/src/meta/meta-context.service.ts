import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { resolveAskMetricsPath, resolveMetaAuditDir, resolveMetaContextPath } from '../common/path';
import { AppConfigService } from '../config/app-config.service';
import type { MetaAdaptResponse, MetaContextState } from './meta.types';

interface AskMetricRecord {
  intent: string;
  trustLevel: 'trusted' | 'conditional' | 'refused';
}

@Injectable()
export class MetaContextService {
  private static readonly DEFAULT_RELATION_MULTIPLIERS: Record<string, number> = {
    TRIGGERS_ON: 1,
    WRITES: 1,
    QUERIES: 1,
    REFERENCES: 1
  };

  private readonly contextPath: string;
  private readonly auditDir: string;
  private readonly metricsPath: string;

  constructor(private readonly configService: AppConfigService) {
    this.contextPath = resolveMetaContextPath(this.configService.metaContextPath());
    this.auditDir = resolveMetaAuditDir(this.configService.metaContextPath());
    this.metricsPath = resolveAskMetricsPath(this.configService.askMetricsPath());
    fs.mkdirSync(path.dirname(this.contextPath), { recursive: true });
    fs.mkdirSync(this.auditDir, { recursive: true });
  }

  getContext(): MetaContextState {
    return this.readContext();
  }

  relationMultiplier(rel: string): number {
    const state = this.readContext();
    return state.relationMultipliers[rel] ?? 1;
  }

  adapt(dryRun = false): MetaAdaptResponse {
    const before = this.readContext();
    const after = this.buildAdaptedContext(before);
    const changed = JSON.stringify(before.relationMultipliers) !== JSON.stringify(after.relationMultipliers);

    if (!dryRun && changed) {
      fs.writeFileSync(this.contextPath, JSON.stringify(after, null, 2), 'utf8');
    }

    const auditArtifactPath = path.join(
      this.auditDir,
      `${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    fs.writeFileSync(
      auditArtifactPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          dryRun,
          changed,
          contextPath: this.contextPath,
          before,
          after
        },
        null,
        2
      ),
      'utf8'
    );

    return {
      status: 'implemented',
      dryRun,
      changed,
      contextPath: this.contextPath,
      auditArtifactPath,
      before,
      after
    };
  }

  private readContext(): MetaContextState {
    if (!fs.existsSync(this.contextPath)) {
      return this.defaultContext(0, {}, {});
    }
    try {
      const parsed = JSON.parse(fs.readFileSync(this.contextPath, 'utf8')) as MetaContextState;
      if (!parsed || typeof parsed !== 'object') {
        return this.defaultContext(0, {}, {});
      }
      return {
        version: 'phase16-v1',
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
        relationMultipliers: {
          ...MetaContextService.DEFAULT_RELATION_MULTIPLIERS,
          ...(parsed.relationMultipliers ?? {})
        },
        provenance: parsed.provenance ?? {
          formulaVersion: 'phase16-v1',
          metricsSampleSize: 0,
          trustedByIntent: {},
          refusedByIntent: {}
        }
      };
    } catch {
      return this.defaultContext(0, {}, {});
    }
  }

  private buildAdaptedContext(previous: MetaContextState): MetaContextState {
    const records = this.readMetrics();
    const trustedByIntent: Record<string, number> = {};
    const refusedByIntent: Record<string, number> = {};
    for (const record of records) {
      if (record.trustLevel === 'trusted') {
        trustedByIntent[record.intent] = (trustedByIntent[record.intent] ?? 0) + 1;
      }
      if (record.trustLevel === 'refused') {
        refusedByIntent[record.intent] = (refusedByIntent[record.intent] ?? 0) + 1;
      }
    }

    const trustedImpact = trustedByIntent.impact ?? 0;
    const refusedImpact = refusedByIntent.impact ?? 0;
    const trustedAutomation = trustedByIntent.automation ?? 0;
    const refusedAutomation = refusedByIntent.automation ?? 0;

    const impactSignal = this.clamp((trustedImpact - refusedImpact) / Math.max(1, records.length), -0.5, 0.5);
    const automationSignal = this.clamp(
      (trustedAutomation - refusedAutomation) / Math.max(1, records.length),
      -0.5,
      0.5
    );

    const nextMultipliers = {
      TRIGGERS_ON: this.adjust(previous.relationMultipliers.TRIGGERS_ON ?? 1, automationSignal),
      WRITES: this.adjust(previous.relationMultipliers.WRITES ?? 1, impactSignal),
      QUERIES: this.adjust(previous.relationMultipliers.QUERIES ?? 1, impactSignal * 0.8),
      REFERENCES: this.adjust(previous.relationMultipliers.REFERENCES ?? 1, impactSignal * 0.6)
    };

    return {
      version: 'phase16-v1',
      updatedAt: new Date().toISOString(),
      relationMultipliers: nextMultipliers,
      provenance: {
        formulaVersion: 'phase16-v1',
        metricsSampleSize: records.length,
        trustedByIntent,
        refusedByIntent
      }
    };
  }

  private readMetrics(): AskMetricRecord[] {
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
      .map((line) => JSON.parse(line) as AskMetricRecord)
      .filter((record) => typeof record.intent === 'string');
  }

  private adjust(current: number, signal: number): number {
    return Number(this.clamp(current + signal * 0.2, 0.8, 1.25).toFixed(4));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private defaultContext(
    metricsSampleSize: number,
    trustedByIntent: Record<string, number>,
    refusedByIntent: Record<string, number>
  ): MetaContextState {
    return {
      version: 'phase16-v1',
      updatedAt: new Date(0).toISOString(),
      relationMultipliers: { ...MetaContextService.DEFAULT_RELATION_MULTIPLIERS },
      provenance: {
        formulaVersion: 'phase16-v1',
        metricsSampleSize,
        trustedByIntent,
        refusedByIntent
      }
    };
  }
}
