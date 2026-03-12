import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  resolveProofLookupId,
  resolveReplayLookup,
  resolveSelectedHistoryProof,
  resolveSelectedHistoryProofId
} from '../app/workspaces/proofs/history-selection';
import { ProofsWorkspace } from '../app/workspaces/proofs/proofs-workspace';
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

  const noSelectionMarkup = renderToStaticMarkup(
    React.createElement(ProofsWorkspace, {
      proofId: 'proof_alpha',
      setProofId: () => undefined,
      replayToken: 'trace_alpha',
      setReplayToken: () => undefined,
      recentProofs,
      selectedRecentProof: null,
      selectedProof: null,
      replayResult: null,
      metricsExport: null,
      loading: false,
      onListRecent: () => undefined,
      onGetProof: () => undefined,
      onReplay: () => undefined,
      onOpenByToken: () => undefined,
      onReplayByToken: () => undefined,
      onExportMetrics: () => undefined,
      onExportProofArtifact: () => undefined,
      onExportReplayArtifact: () => undefined,
      onSelectRecentProof: () => undefined,
      onOpenRecentProof: () => undefined,
      onReplayRecentProof: () => undefined
    })
  );
  assert.match(noSelectionMarkup, /Open Selected History<\/button>/);
  assert.match(noSelectionMarkup, /Replay Selected History<\/button>/);
  assert.match(noSelectionMarkup, /Export Selected History Proof<\/button>/);
  assert.match(noSelectionMarkup, /Export Selected History Replay<\/button>/);
  assert.match(noSelectionMarkup, /Open by Token<\/button>/);
  assert.match(noSelectionMarkup, /Replay by Token<\/button>/);
  assert.match(noSelectionMarkup, /disabled="">Open Selected History/);
  assert.match(noSelectionMarkup, /disabled="">Replay Selected History/);
  assert.match(noSelectionMarkup, /disabled="">Export Selected History Proof/);
  assert.match(noSelectionMarkup, /disabled="">Export Selected History Replay/);
  assert.doesNotMatch(noSelectionMarkup, /disabled="">Open by Token/);
  assert.doesNotMatch(noSelectionMarkup, /disabled="">Replay by Token/);

  const selectedMarkup = renderToStaticMarkup(
    React.createElement(ProofsWorkspace, {
      proofId: 'proof_alpha',
      setProofId: () => undefined,
      replayToken: 'trace_alpha',
      setReplayToken: () => undefined,
      recentProofs,
      selectedRecentProof: recentProofs[0],
      selectedProof: null,
      replayResult: null,
      metricsExport: null,
      loading: false,
      onListRecent: () => undefined,
      onGetProof: () => undefined,
      onReplay: () => undefined,
      onOpenByToken: () => undefined,
      onReplayByToken: () => undefined,
      onExportMetrics: () => undefined,
      onExportProofArtifact: () => undefined,
      onExportReplayArtifact: () => undefined,
      onSelectRecentProof: () => undefined,
      onOpenRecentProof: () => undefined,
      onReplayRecentProof: () => undefined
    })
  );
  assert.doesNotMatch(selectedMarkup, /disabled="">Open Selected History/);
  assert.doesNotMatch(selectedMarkup, /disabled="">Replay Selected History/);
  assert.doesNotMatch(selectedMarkup, /disabled="">Export Selected History Proof/);
  assert.doesNotMatch(selectedMarkup, /disabled="">Export Selected History Replay/);
}

run();
