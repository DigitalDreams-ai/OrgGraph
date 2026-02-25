import type { AskPlan } from '../planner/planner.types';

export interface AskRequest {
  query: string;
  context?: Record<string, string | number | boolean>;
  maxCitations?: number;
}

export interface AskCitation {
  id: string;
  sourcePath: string;
  sourceType: string;
  snippet: string;
  score: number;
}

export interface AskResponse {
  answer: string;
  plan: AskPlan;
  citations: AskCitation[];
  confidence: number;
  status: 'implemented';
}

export interface AskInternalErrorEnvelope {
  error: {
    code: 'ASK_INTERNAL_ERROR';
    stage: 'planner' | 'graph' | 'evidence' | 'response';
    message: string;
  };
}
