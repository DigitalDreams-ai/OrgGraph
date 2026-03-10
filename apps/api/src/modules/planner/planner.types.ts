export type AskIntent = 'perms' | 'automation' | 'impact' | 'mixed' | 'review' | 'unknown';
export type AskSemanticFrameIntent =
  | 'impact_analysis'
  | 'permission_path_explanation'
  | 'automation_path_explanation'
  | 'approval_decision'
  | 'evidence_lookup';
export type AskSemanticFrameTargetKind = 'object' | 'field' | 'flow' | 'decision_packet';
export type AskSemanticFrameTargetSource = 'metadata' | 'query' | 'review_workflow';
export type AskSemanticFrameSourceMode = 'graph_global' | 'latest_retrieve' | 'proof_history';
export type AskSemanticFrameAdmissibilityStatus = 'accepted' | 'needs_clarification' | 'blocked';
export type AskSemanticFrameAmbiguityStatus =
  | 'clear'
  | 'ambiguous_target'
  | 'ambiguous_scope'
  | 'unsupported_question'
  | 'insufficient_evidence';

export type AskReviewFocus = 'risk' | 'breakage' | 'approval';
export type AskReviewAction = 'change';

export interface AskReviewWorkflow {
  kind: 'high_risk_change_review';
  compilerRuleId: 'review_approval_change' | 'review_breakage_change' | 'review_risk_change';
  action: AskReviewAction;
  focus: AskReviewFocus;
  targetType: 'field' | 'object';
  targetLabel: string;
}

export interface AskSemanticFrameTargetCandidate {
  id: string;
  kind: AskSemanticFrameTargetKind;
  source: AskSemanticFrameTargetSource;
}

export interface AskSemanticFrameTarget {
  kind: AskSemanticFrameTargetKind;
  raw: string;
  candidates: AskSemanticFrameTargetCandidate[];
  selected?: string;
}

export interface AskSemanticFrameV1 {
  version: 'v1';
  intent: AskSemanticFrameIntent;
  target?: AskSemanticFrameTarget;
  sourceMode: AskSemanticFrameSourceMode;
  scope: {
    snapshot: string;
    orgSession: string;
  };
  modifiers: {
    includeAutomation: boolean;
    includePermissions: boolean;
    includeEvidence: boolean;
    includeProof: boolean;
  };
  admissibility: {
    status: AskSemanticFrameAdmissibilityStatus;
    reason: string | null;
  };
  ambiguity: {
    status: AskSemanticFrameAmbiguityStatus;
    issues: string[];
  };
}

export interface AskPlan {
  intent: AskIntent;
  normalizedQuery?: string;
  rewriteRules?: string[];
  entities: {
    user?: string;
    object?: string;
    field?: string;
  };
  graphCalls: string[];
  evidenceCalls: string[];
  reviewWorkflow?: AskReviewWorkflow;
  semanticFrame?: AskSemanticFrameV1;
}
