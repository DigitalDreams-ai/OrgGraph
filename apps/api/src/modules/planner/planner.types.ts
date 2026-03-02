export type AskIntent = 'perms' | 'automation' | 'impact' | 'mixed' | 'review' | 'unknown';

export type AskReviewFocus = 'risk' | 'breakage' | 'approval';

export interface AskReviewWorkflow {
  kind: 'high_risk_change_review';
  focus: AskReviewFocus;
  targetType: 'field' | 'object';
  targetLabel: string;
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
}
