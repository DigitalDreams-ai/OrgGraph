'use client';

import type { MetadataRetrieveResultView } from './types';

export type RetrieveHandoffState = 'missing' | 'blocked' | 'ready';

export interface RetrieveHandoffAssessment {
  state: RetrieveHandoffState;
  reasons: string[];
}

export function assessRetrieveHandoff(handoff: MetadataRetrieveResultView | null): RetrieveHandoffAssessment {
  if (!handoff) {
    return {
      state: 'missing',
      reasons: ['Run a selective retrieve in Org Browser before treating Refresh & Build as seeded.']
    };
  }

  const reasons: string[] = [];
  if (handoff.status !== 'completed') {
    reasons.push(`Latest retrieve status is '${handoff.status || 'unknown'}', not 'completed'.`);
  }
  if (!handoff.alias) {
    reasons.push('Retrieve result did not report the active alias.');
  }
  if (!handoff.parsePath) {
    reasons.push('Retrieve result did not report a parse path.');
  }
  if (handoff.metadataArgs.length === 0) {
    reasons.push('Retrieve result did not include metadata arguments.');
  }

  return {
    state: reasons.length > 0 ? 'blocked' : 'ready',
    reasons
  };
}
