import { Injectable } from '@nestjs/common';
import { GraphService } from '../graph/graph.service';

@Injectable()
export class AnalysisService {
  constructor(private readonly graphService: GraphService) {}

  impact(field: string): {
    field: string;
    relationsChecked: string[];
    paths: Array<{ from: string; rel: string; to: string }>;
    explanation: string;
    status: 'scaffold';
  } {
    return {
      field,
      relationsChecked: ['REFERENCES', 'QUERIES', 'WRITES'],
      paths: [],
      explanation: `impact analysis scaffolded for ${field}`,
      status: 'scaffold'
    };
  }

  automation(object: string): {
    object: string;
    relationsChecked: string[];
    automations: Array<{ type: string; name: string; rel: string }>;
    explanation: string;
    status: 'scaffold' | 'implemented';
  } {
    const automations = this.graphService
      .findAutomationsForObject(object)
      .map((row) => ({ type: row.type, name: row.name, rel: row.rel }));

    return {
      object,
      relationsChecked: ['TRIGGERS_ON'],
      automations,
      explanation:
        automations.length > 0
          ? `found ${automations.length} automation item(s) for ${object}`
          : `no automation found for ${object}`,
      status: 'implemented'
    };
  }
}
