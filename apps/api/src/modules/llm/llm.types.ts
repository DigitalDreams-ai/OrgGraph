import type { AskCitation } from '../ask/ask.types';
import type { AskPlan } from '../planner/planner.types';

export type LlmProviderName = 'none' | 'openai' | 'anthropic';

export interface LlmGenerateRequest {
  query: string;
  deterministicAnswer: string;
  plan: AskPlan;
  citations: AskCitation[];
}

export interface LlmGenerateOptions {
  provider?: LlmProviderName;
  model?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

export interface LlmGenerateResponse {
  answer: string;
  reasoningSummary: string;
  citationsUsed: string[];
  provider: Exclude<LlmProviderName, 'none'>;
  model: string;
  rawText?: string;
}

export interface LlmHealth {
  ok: boolean;
  provider: LlmProviderName;
  model?: string;
  message: string;
}
