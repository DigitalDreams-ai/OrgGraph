'use client';

import type { MetadataRetrieveResultView } from './types';

export type RetrieveHandoffState = 'missing' | 'blocked' | 'ready';

export interface RetrieveHandoffAssessment {
  state: RetrieveHandoffState;
  reasons: string[];
}

export function assessRetrieveHandoff(
  handoff: MetadataRetrieveResultView | null,
  expectedAlias?: string
): RetrieveHandoffAssessment {
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
  if (expectedAlias && handoff.alias) {
    const expected = expectedAlias.trim().toLowerCase();
    const actual = handoff.alias.trim().toLowerCase();
    if (expected && actual && expected !== actual) {
      reasons.push(
        `Retrieve alias '${handoff.alias}' does not match active alias '${expectedAlias}'. Re-run Retrieve Cart for the active org.`
      );
    }
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
