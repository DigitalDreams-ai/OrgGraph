import type { AskPlan } from '../planner/planner.types';
import type { LlmProviderName } from '../llm/llm.types';

export interface AskRequest {
  query: string;
  context?: Record<string, string | number | boolean>;
  maxCitations?: number;
  includeLowConfidence?: boolean;
  consistencyCheck?: boolean;
  mode?: 'deterministic' | 'llm_assist';
  llm?: {
    provider?: LlmProviderName;
    model?: string;
    timeoutMs?: number;
    maxOutputTokens?: number;
  };
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
  deterministicAnswer: string;
  plan: AskPlan;
  citations: AskCitation[];
  confidence: number;
  mode: 'deterministic' | 'llm_assist';
  llm: {
    enabled: boolean;
    used: boolean;
    provider: LlmProviderName;
    model?: string;
    fallbackReason?: string;
    latencyMs?: number;
  };
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
