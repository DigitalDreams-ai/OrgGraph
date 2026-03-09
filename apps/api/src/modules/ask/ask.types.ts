import type { AskPlan, AskReviewFocus } from '../planner/planner.types';
import type { LlmProviderName } from '../llm/llm.types';
import type { CompositionOperator, DerivationRelation } from '@orgumented/ontology';

export type AskTraceLevel = 'compact' | 'standard' | 'full';

export type AskRejectionReasonCode =
  | 'NO_OBJECT_OR_FIELD_GRANT'
  | 'NO_IMPACT_PATHS'
  | 'NO_AUTOMATION_MATCH'
  | 'FLOW_NAME_UNRESOLVED'
  | 'EVIDENCE_SCOPE_UNAVAILABLE'
  | 'EVIDENCE_SCOPE_UNSUPPORTED'
  | 'NO_DETERMINISTIC_INTENT'
  | 'POLICY_ENVELOPE_REJECTED';

export interface AskRejectedBranch {
  branch: string;
  reasonCode: AskRejectionReasonCode;
  reason: string;
}

export interface AskEvidenceSelection {
  type: string;
  members?: string[];
}

export interface AskEvidenceScope {
  kind: 'latest_retrieve';
  alias?: string;
  parsePath: string;
  metadataArgs: string[];
  selections?: AskEvidenceSelection[];
}

export interface AskRequest {
  query: string;
  context?: Record<string, string | number | boolean>;
  evidenceScope?: AskEvidenceScope;
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

export interface AskDecisionPacket {
  kind: 'high_risk_change_review';
  focus: AskReviewFocus;
  targetLabel: string;
  targetType: 'field' | 'object' | 'flow';
  summary: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  evidenceCoverage: {
    citationCount: number;
    hasPermissionPaths: boolean;
    hasAutomationCoverage: boolean;
    hasImpactPaths: boolean;
  };
  topRiskDrivers: string[];
  permissionImpact: {
    user: string;
    summary: string;
    granted: boolean;
    pathCount: number;
    principalCount: number;
    warnings: string[];
  };
  automationImpact: {
    summary: string;
    automationCount: number;
    topAutomationNames: string[];
  };
  changeImpact: {
    summary: string;
    impactPathCount: number;
    topImpactedSources: string[];
  };
  nextActions: Array<{
    label: string;
    rationale: string;
  }>;
}

export interface AskResponse {
  answer: string;
  deterministicAnswer: string;
  plan: AskPlan;
  decisionPacket?: AskDecisionPacket;
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
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
    estimatedCostUsd?: number;
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

export interface AskProofListResponse {
  proofs: Array<{
    proofId: string;
    replayToken: string;
    generatedAt: string;
    snapshotId: string;
    trustLevel: AskTrustLevel;
    query: string;
  }>;
  total: number;
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

export interface AskArchitectureDecisionRequest {
  user: string;
  object: string;
  field: string;
  maxPaths?: number;
}

export interface AskArchitectureDecisionResponse {
  user: string;
  object: string;
  field: string;
  engines: {
    permissionBlastRadius: {
      granted: boolean;
      principalCount: number;
      pathCount: number;
      blastRadiusScore: number;
      explanation: string;
      proofPaths: Array<{
        principal: string;
        object: string;
        path: Array<{ from: string; rel: string; to: string }>;
      }>;
    };
    automationCollision: {
      automationCount: number;
      impactPathCount: number;
      collisionCount: number;
      collisionScore: number;
      explanation: string;
      topCollisions: Array<{
        source: string;
        relations: string[];
      }>;
    };
    releaseRisk: {
      level: 'low' | 'medium' | 'high';
      riskScore: number;
      explanation: string;
      semanticDiff: {
        addedNodeCount: number;
        removedNodeCount: number;
        addedEdgeCount: number;
        removedEdgeCount: number;
      };
      meaningChangeSummary: string;
    };
  };
  composite: {
    trustLevel: AskTrustLevel;
    summary: string;
    topRiskDrivers: string[];
    replayToken: string;
    snapshotId: string;
  };
  status: 'implemented';
}

export type AskSimulationRiskProfile = 'strict' | 'balanced' | 'exploratory';

export interface AskSimulationChange {
  action: 'modify_field' | 'modify_object' | 'add_automation' | 'remove_automation' | 'other';
  object: string;
  field?: string;
  description?: string;
}

export interface AskSimulationRequest {
  user: string;
  object: string;
  field: string;
  profile?: AskSimulationRiskProfile;
  maxPaths?: number;
  proposedChanges: AskSimulationChange[];
}

export interface AskSimulationResponse {
  user: string;
  object: string;
  field: string;
  profile: AskSimulationRiskProfile;
  requestedChangeCount: number;
  simulatedImpactSurface: {
    permissionPaths: number;
    automationMatches: number;
    impactPaths: number;
  };
  scores: {
    permissionImpact: number;
    releaseRisk: number;
    compositeRisk: number;
    rollbackConfidence: number;
  };
  recommendation: {
    level: 'proceed' | 'review' | 'block';
    rationale: string;
    mitigations: string[];
  };
  status: 'implemented';
}

export interface AskSimulationCompareRequest {
  scenarioA: AskSimulationRequest;
  scenarioB: AskSimulationRequest;
}

export interface AskSimulationCompareResponse {
  scenarioA: AskSimulationResponse;
  scenarioB: AskSimulationResponse;
  recommendedScenario: 'A' | 'B' | 'tie';
  rationale: string;
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
  byProvider: Array<{
    provider: LlmProviderName;
    model?: string;
    count: number;
    successCount: number;
    errorCount: number;
    errorRate: number;
    avgLatencyMs?: number;
    avgInputTokens?: number;
    avgOutputTokens?: number;
    avgTotalTokens?: number;
    avgEstimatedCostUsd?: number;
  }>;
}

export interface AskTrustDashboardResponse {
  status: 'implemented';
  generatedAt: string;
  totals: {
    askRecords: number;
    proofArtifacts: number;
    trusted: number;
    conditional: number;
    refused: number;
  };
  replayPassRate: number;
  proofCoverageRate: number;
  driftTrend: {
    snapshotCount: number;
    latestSnapshotId?: string;
    previousSnapshotId?: string;
  };
  failureClasses: Array<{
    class: 'llm_fallback' | 'policy_refusal' | 'constraint_risk' | 'none';
    count: number;
  }>;
}

export interface AskInternalErrorEnvelope {
  error: {
    code: 'ASK_INTERNAL_ERROR';
    stage: 'planner' | 'graph' | 'evidence' | 'response';
    message: string;
  };
}
