import { Injectable } from '@nestjs/common';
import { GraphService } from '../graph/graph.service';

@Injectable()
export class AnalysisService {
  private static readonly DEFAULT_LIMIT = 25;

  constructor(private readonly graphService: GraphService) {}

  impact(field: string, limit = AnalysisService.DEFAULT_LIMIT): {
    field: string;
    relationsChecked: string[];
    paths: Array<{ from: string; rel: string; to: string }>;
    totalPaths: number;
    truncated: boolean;
    explanation: string;
    status: 'implemented';
  } {
    const hits = this.graphService.findImpactForField(field);
    const sliced = hits.slice(0, limit);
    return {
      field,
      relationsChecked: ['REFERENCES', 'QUERIES', 'WRITES'],
      paths: sliced.map((hit) => ({ from: hit.name, rel: hit.rel, to: hit.target })),
      totalPaths: hits.length,
      truncated: hits.length > sliced.length,
      explanation:
        hits.length > 0
          ? `found ${hits.length} impact path(s) for ${field}`
          : `no impact path found for ${field}`,
      status: 'implemented'
    };
  }

  automation(object: string, limit = AnalysisService.DEFAULT_LIMIT): {
    object: string;
    relationsChecked: string[];
    automations: Array<{ type: string; name: string; rel: string }>;
    totalAutomations: number;
    truncated: boolean;
    explanation: string;
    status: 'scaffold' | 'implemented';
  } {
    const all = this.graphService
      .findAutomationsForObject(object)
      .map((row) => ({ type: row.type, name: row.name, rel: row.rel }));
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
      status: 'implemented'
    };
  }
}
