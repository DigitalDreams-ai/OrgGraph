import type { AskPlan } from '../planner/planner.types';

export interface AskRequest {
  query: string;
  context?: Record<string, string | number | boolean>;
  maxCitations?: number;
  includeLowConfidence?: boolean;
  consistencyCheck?: boolean;
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
  consistency: {
    checked: boolean;
    aligned: boolean;
    reason: string;
  };
  status: 'implemented';
}

export interface AskInternalErrorEnvelope {
  error: {
    code: 'ASK_INTERNAL_ERROR';
    stage: 'planner' | 'graph' | 'evidence' | 'response';
    message: string;
  };
}
