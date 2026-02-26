import type { AskPlan } from '../planner/planner.types';
import type { LlmProviderName } from '../llm/llm.types';
import type { CompositionOperator, DerivationRelation } from '@orggraph/ontology';

export type AskTraceLevel = 'compact' | 'standard' | 'full';

export type AskRejectionReasonCode =
  | 'NO_OBJECT_OR_FIELD_GRANT'
  | 'NO_IMPACT_PATHS'
  | 'NO_AUTOMATION_MATCH'
  | 'NO_DETERMINISTIC_INTENT'
  | 'POLICY_ENVELOPE_REJECTED';

export interface AskRejectedBranch {
  branch: string;
  reasonCode: AskRejectionReasonCode;
  reason: string;
}

export interface AskRequest {
  query: string;
  context?: Record<string, string | number | boolean>;
  maxCitations?: number;
  includeLowConfidence?: boolean;
  consistencyCheck?: boolean;
  traceLevel?: AskTraceLevel;
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
  traceLevel: AskTraceLevel;
  request: AskRequest;
  plan: AskPlan;
  operatorsExecuted: CompositionOperator[];
  rejectedBranches: AskRejectedBranch[];
  derivationEdges: AskDerivationEdge[];
  citationIds: string[];
  executionTrace?: string[];
  trustLevel: AskTrustLevel;
  metrics: AskMeaningMetrics;
  responseSummary: {
    answer: string;
    deterministicAnswer: string;
    confidence: number;
    mode: 'deterministic' | 'llm_assist';
    corePayloadFingerprint: string;
    corePayloadJson: string;
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
  refusalReasons?: string[];
  proof: {
    proofId: string;
    replayToken: string;
    snapshotId: string;
    traceLevel: AskTraceLevel;
    operatorsExecuted: CompositionOperator[];
    rejectedBranches: AskRejectedBranch[];
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
  corePayloadMatched: boolean;
  metricsMatched: boolean;
  snapshotId: string;
  policyId: string;
  original: {
    answer: string;
    deterministicAnswer: string;
    confidence: number;
    mode: 'deterministic' | 'llm_assist';
    trustLevel: AskTrustLevel;
    metrics: AskMeaningMetrics;
  };
  replayed: {
    answer: string;
    deterministicAnswer: string;
    confidence: number;
    mode: 'deterministic' | 'llm_assist';
    trustLevel: AskTrustLevel;
    metrics: AskMeaningMetrics;
  };
  status: 'implemented';
}

export interface AskPolicyValidateRequest {
  groundingThreshold?: number;
  constraintThreshold?: number;
  ambiguityMaxThreshold?: number;
  dryRun?: boolean;
}

export interface AskPolicyValidateResponse {
  policyId: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  thresholds: {
    groundingThreshold: number;
    constraintThreshold: number;
    ambiguityMaxThreshold: number;
  };
  dryRun: boolean;
  status: 'implemented';
}

export interface AskMetricsExportResponse {
  status: 'implemented';
  totalRecords: number;
  bySnapshot: Array<{
    snapshotId: string;
    count: number;
    trusted: number;
    conditional: number;
    refused: number;
    avgGroundingScore: number;
    avgConstraintSatisfaction: number;
    avgAmbiguityScore: number;
    avgRiskSurfaceScore: number;
    latestRecordedAt: string;
  }>;
}

export interface AskInternalErrorEnvelope {
  error: {
    code: 'ASK_INTERNAL_ERROR';
    stage: 'planner' | 'graph' | 'evidence' | 'response';
    message: string;
  };
}
