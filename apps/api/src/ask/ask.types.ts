import type { AskPlan } from '../planner/planner.types';
import type { LlmProviderName } from '../llm/llm.types';
import type { CompositionOperator, DerivationRelation } from '@orggraph/ontology';

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

export type AskTrustLevel = 'trusted' | 'conditional' | 'refused';

export interface AskPolicyEnvelope {
  policyId: string;
  groundingThreshold: number;
  constraintThreshold: number;
  ambiguityMaxThreshold: number;
}

export interface AskMeaningMetrics {
  groundingScore: number;
  constraintSatisfaction: number;
  ambiguityScore: number;
  stabilityScore: number;
  deltaNovelty: number;
  riskSurfaceScore: number;
}

export interface AskDerivationEdge {
  id: string;
  rel: DerivationRelation;
  from: string;
  to: string;
}

export interface AskProofArtifact {
  proofId: string;
  replayToken: string;
  generatedAt: string;
  snapshotId: string;
  policyId: string;
  request: AskRequest;
  plan: AskPlan;
  operatorsExecuted: CompositionOperator[];
  rejectedBranches: Array<{ branch: string; reason: string }>;
  derivationEdges: AskDerivationEdge[];
  citationIds: string[];
  trustLevel: AskTrustLevel;
  metrics: AskMeaningMetrics;
  responseSummary: {
    answer: string;
    deterministicAnswer: string;
    confidence: number;
    mode: 'deterministic' | 'llm_assist';
  };
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
  policy: AskPolicyEnvelope;
  metrics: AskMeaningMetrics;
  trustLevel: AskTrustLevel;
  proof: {
    proofId: string;
    replayToken: string;
    snapshotId: string;
    operatorsExecuted: CompositionOperator[];
    rejectedBranches: Array<{ branch: string; reason: string }>;
  };
  status: 'implemented';
}

export interface AskProofLookupResponse {
  proof: AskProofArtifact;
  status: 'implemented';
}

export interface AskReplayRequest {
  replayToken?: string;
  proofId?: string;
}

export interface AskReplayResponse {
  replayToken: string;
  proofId: string;
  matched: boolean;
  snapshotId: string;
  policyId: string;
  original: {
    answer: string;
    deterministicAnswer: string;
    confidence: number;
    mode: 'deterministic' | 'llm_assist';
    trustLevel: AskTrustLevel;
  };
  replayed: {
    answer: string;
    deterministicAnswer: string;
    confidence: number;
    mode: 'deterministic' | 'llm_assist';
    trustLevel: AskTrustLevel;
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
