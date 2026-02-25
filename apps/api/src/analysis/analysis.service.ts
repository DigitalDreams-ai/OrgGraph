import { Injectable } from '@nestjs/common';
import { GraphService } from '../graph/graph.service';

@Injectable()
export class AnalysisService {
  private static readonly DEFAULT_LIMIT = 25;
  private static readonly REL_BASE_SCORE: Record<string, number> = {
    TRIGGERS_ON: 1,
    WRITES: 0.95,
    QUERIES: 0.75,
    REFERENCES: 0.6
  };

  constructor(private readonly graphService: GraphService) {}

  impact(field: string, limit = AnalysisService.DEFAULT_LIMIT, strict = false, debug = false): {
    field: string;
    relationsChecked: string[];
    paths: Array<{ from: string; rel: string; to: string; confidence: 'high' | 'medium' | 'low'; score: number }>;
    totalPaths: number;
    truncated: boolean;
    explanation: string;
    strictMode: boolean;
    debug?: { raw: unknown[] };
    status: 'implemented';
  } {
    const hits = this.graphService.findImpactForField(field);
    const ranked = hits
      .map((hit) => ({
        ...hit,
        confidence: this.parseConfidence(hit.meta),
        score: this.scoreForHit(hit.rel, this.parseConfidence(hit.meta)),
        exactField: hit.target === field
      }))
      .filter((hit) => !strict || hit.confidence !== 'low')
      .sort((a, b) => Number(b.exactField) - Number(a.exactField) || b.score - a.score || a.name.localeCompare(b.name));
    const sliced = ranked.slice(0, limit);
    return {
      field,
      relationsChecked: ['REFERENCES', 'QUERIES', 'WRITES'],
      paths: sliced.map((hit) => ({
        from: hit.name,
        rel: hit.rel,
        to: hit.target,
        confidence: hit.confidence,
        score: Number(hit.score.toFixed(3))
      })),
      totalPaths: ranked.length,
      truncated: ranked.length > sliced.length,
      explanation:
        ranked.length > 0
          ? `found ${ranked.length} impact path(s) for ${field}`
          : `no impact path found for ${field}`,
      strictMode: strict,
      ...(debug
        ? {
            debug: {
              raw: ranked
            }
          }
        : {}),
      status: 'implemented'
    };
  }

  automation(object: string, limit = AnalysisService.DEFAULT_LIMIT, strict = false): {
    object: string;
    relationsChecked: string[];
    automations: Array<{ type: string; name: string; rel: string; confidence: 'high' | 'medium' | 'low'; score: number }>;
    totalAutomations: number;
    truncated: boolean;
    explanation: string;
    strictMode: boolean;
    status: 'scaffold' | 'implemented';
  } {
    const all = this.graphService
      .findAutomationsForObject(object)
      .map((row) => {
        const confidence = this.parseConfidence(row.meta);
        return {
          type: row.type,
          name: row.name,
          rel: row.rel,
          confidence,
          score: Number(this.scoreForHit(row.rel, confidence).toFixed(3))
        };
      })
      .filter((row) => !strict || row.confidence !== 'low')
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    const automations = all.slice(0, limit);

    return {
      object,
      relationsChecked: ['TRIGGERS_ON', 'REFERENCES', 'QUERIES', 'WRITES'],
      automations,
      totalAutomations: all.length,
      truncated: all.length > automations.length,
      explanation:
        all.length > 0
          ? `found ${all.length} automation item(s) for ${object}`
          : `no automation found for ${object}`,
      strictMode: strict,
      status: 'implemented'
    };
  }

  private parseConfidence(meta?: string): 'high' | 'medium' | 'low' {
    if (!meta) {
      return 'medium';
    }
    try {
      const parsed = JSON.parse(meta) as { confidence?: string };
      if (parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low') {
        return parsed.confidence;
      }
    } catch {
      // no-op
    }
    return 'medium';
  }

  private scoreForHit(rel: string, confidence: 'high' | 'medium' | 'low'): number {
    const base = AnalysisService.REL_BASE_SCORE[rel] ?? 0.5;
    const conf = confidence === 'high' ? 1 : confidence === 'medium' ? 0.75 : 0.4;
    return base * conf;
  }
}
