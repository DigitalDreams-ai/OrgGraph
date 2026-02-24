import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalysisService {
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
    status: 'scaffold';
  } {
    return {
      object,
      relationsChecked: ['TRIGGERS_ON'],
      automations: [],
      explanation: `automation query scaffolded for ${object}`,
      status: 'scaffold'
    };
  }
}
