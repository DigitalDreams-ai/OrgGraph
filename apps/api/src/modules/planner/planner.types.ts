export type AskIntent = 'perms' | 'automation' | 'impact' | 'mixed' | 'unknown';

export interface AskPlan {
  intent: AskIntent;
  entities: {
    user?: string;
    object?: string;
    field?: string;
  };
  graphCalls: string[];
  evidenceCalls: string[];
}
