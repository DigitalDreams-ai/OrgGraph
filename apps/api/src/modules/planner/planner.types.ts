export type AskIntent = 'perms' | 'automation' | 'impact' | 'mixed' | 'unknown';

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
}
