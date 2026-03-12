import assert from 'node:assert/strict';
import {
  resolveProofLookupId,
  resolveReplayLookup,
  resolveSelectedHistoryProof,
  resolveSelectedHistoryProofId
} from '../app/workspaces/proofs/history-selection';
import type { RecentProofItem } from '../app/workspaces/proofs/types';

const recentProofs: RecentProofItem[] = [
  {
    proofId: 'proof_alpha',
    replayToken: 'trace_alpha',
    generatedAt: '2026-03-01T10:00:00Z',
    snapshotId: 'snap_alpha',
    trustLevel: 'trusted',
    query: 'What touches Opportunity.StageName?',
    label: 'What touches Opportunity.StageName?',
    subtitle: 'Trust trusted • snap_alpha • 2026-03-01T10:00:00Z'
  },
  {
    proofId: 'proof_beta',
    replayToken: 'trace_beta',
    generatedAt: '2026-03-01T11:00:00Z',
    snapshotId: 'snap_beta',
    trustLevel: 'conditional',
    query: 'Who can edit Opportunity.StageName?',
    label: 'Who can edit Opportunity.StageName?',
    subtitle: 'Trust conditional • snap_beta • 2026-03-01T11:00:00Z'
  }
];

function run(): void {
  assert.equal(resolveSelectedHistoryProofId(recentProofs, '', ''), 'proof_alpha');
  assert.equal(resolveSelectedHistoryProofId(recentProofs, '', 'proof_beta'), 'proof_beta');
  assert.equal(resolveSelectedHistoryProofId(recentProofs, 'proof_beta', 'proof_alpha'), 'proof_beta');
  assert.equal(resolveSelectedHistoryProofId(recentProofs, 'missing', ''), 'proof_alpha');

  assert.equal(resolveSelectedHistoryProof(recentProofs, 'proof_beta')?.proofId, 'proof_beta');
  assert.equal(resolveSelectedHistoryProof(recentProofs, '', 'proof_alpha')?.replayToken, 'trace_alpha');

  const selectedRecentProof = resolveSelectedHistoryProof(recentProofs, 'proof_beta', '');
  assert.equal(resolveProofLookupId(selectedRecentProof, 'proof_alpha'), 'proof_beta');

  const replayLookup = resolveReplayLookup(selectedRecentProof, 'proof_alpha', 'trace_alpha');
  assert.deepEqual(replayLookup, {
    proofId: 'proof_beta',
    replayToken: 'trace_beta'
  });

  const advancedOnlyReplayLookup = resolveReplayLookup(null, ' proof_alpha ', ' trace_alpha ');
  assert.deepEqual(advancedOnlyReplayLookup, {
    proofId: 'proof_alpha',
    replayToken: 'trace_alpha'
  });
}

run();
