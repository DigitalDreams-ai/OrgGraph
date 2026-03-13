import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  resolveProofLookupId,
  resolveProofExportName,
  resolveReplayLookup,
  resolveReplayExportName,
  resolveSelectedHistoryProof,
  resolveSelectedHistoryProofId,
  shouldClearAdvancedReplayResult,
  shouldClearAdvancedSelectedProof
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
  assert.equal(resolveSelectedHistoryProofId(recentProofs, ''), 'proof_alpha');
  assert.equal(resolveSelectedHistoryProofId(recentProofs, 'proof_beta'), 'proof_beta');
  assert.equal(resolveSelectedHistoryProofId(recentProofs, 'missing'), 'proof_alpha');

  assert.equal(resolveSelectedHistoryProof(recentProofs, 'proof_beta')?.proofId, 'proof_beta');
  assert.equal(resolveSelectedHistoryProof(recentProofs, '')?.replayToken, 'trace_alpha');

  const selectedRecentProof = resolveSelectedHistoryProof(recentProofs, 'proof_beta');
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
  assert.equal(
    resolveProofExportName(recentProofs[0], {
      proofId: 'proof_alpha',
      replayToken: 'trace_alpha',
      generatedAt: '2026-03-01T10:00:00Z',
      snapshotId: 'snap_alpha',
      policyId: 'policy_alpha',
      traceLevel: 'strict',
      query: 'What touches Opportunity.StageName?',
      trustLevel: 'trusted',
      deterministicAnswer: 'Impact found.',
      confidence: 0.91,
      operatorsExecuted: ['impact'],
      rejectedBranches: [],
      citationCount: 4,
      derivationEdgeCount: 9
    }),
    'what-touches-opportunity.stagename'
  );
  assert.equal(
    resolveReplayExportName(recentProofs[0], {
      proofId: 'proof_alpha',
      replayToken: 'trace_alpha',
      snapshotId: 'snap_alpha',
      policyId: 'policy_alpha',
      matched: true,
      corePayloadMatched: true,
      metricsMatched: true,
      original: {
        trustLevel: 'trusted',
        deterministicAnswer: 'Impact found.',
        confidence: 0.91
      },
      replayed: {
        trustLevel: 'trusted',
        deterministicAnswer: 'Impact found.',
        confidence: 0.91
      }
    }),
    'what-touches-opportunity.stagename'
  );
  assert.equal(resolveProofExportName(null, null), 'artifact');
  assert.equal(shouldClearAdvancedSelectedProof(recentProofs[0], null), false);
  assert.equal(
    shouldClearAdvancedSelectedProof(recentProofs[0], {
      proofId: 'proof_alpha',
      replayToken: 'trace_alpha',
      generatedAt: '2026-03-01T10:00:00Z',
      snapshotId: 'snap_alpha',
      policyId: 'policy_alpha',
      traceLevel: 'strict',
      query: 'What touches Opportunity.StageName?',
      trustLevel: 'trusted',
      deterministicAnswer: 'Impact found.',
      confidence: 0.91,
      operatorsExecuted: ['impact'],
      rejectedBranches: [],
      citationCount: 4,
      derivationEdgeCount: 9
    }),
    false
  );
  assert.equal(
    shouldClearAdvancedSelectedProof(recentProofs[0], {
      proofId: 'proof_beta',
      replayToken: 'trace_beta',
      generatedAt: '2026-03-01T11:00:00Z',
      snapshotId: 'snap_beta',
      policyId: 'policy_beta',
      traceLevel: 'strict',
      query: 'Who can edit Opportunity.StageName?',
      trustLevel: 'conditional',
      deterministicAnswer: 'Conditional answer',
      confidence: 0.71,
      operatorsExecuted: ['planner'],
      rejectedBranches: [],
      citationCount: 2,
      derivationEdgeCount: 4
    }),
    true
  );
  assert.equal(
    shouldClearAdvancedReplayResult(recentProofs[0], {
      proofId: 'proof_alpha',
      replayToken: 'trace_alpha',
      snapshotId: 'snap_alpha',
      policyId: 'policy_alpha',
      matched: true,
      corePayloadMatched: true,
      metricsMatched: true,
      original: {
        trustLevel: 'trusted',
        deterministicAnswer: 'Impact found.',
        confidence: 0.91
      },
      replayed: {
        trustLevel: 'trusted',
        deterministicAnswer: 'Impact found.',
        confidence: 0.91
      }
    }),
    false
  );
  assert.equal(
    shouldClearAdvancedReplayResult(recentProofs[0], {
      proofId: 'proof_beta',
      replayToken: 'trace_beta',
      snapshotId: 'snap_beta',
      policyId: 'policy_beta',
      matched: true,
      corePayloadMatched: true,
      metricsMatched: true,
      original: {
        trustLevel: 'conditional',
        deterministicAnswer: 'Conditional answer',
        confidence: 0.71
      },
      replayed: {
        trustLevel: 'conditional',
        deterministicAnswer: 'Conditional answer',
        confidence: 0.71
      }
    }),
    true
  );

  const noSelectionMarkup = renderToStaticMarkup(
    React.createElement(ProofsWorkspace, {
      proofId: '',
      setProofId: () => undefined,
      replayToken: '',
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
      onClearAdvancedTokens: () => undefined,
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
  assert.match(noSelectionMarkup, /disabled="">Open by Token/);
  assert.match(noSelectionMarkup, /disabled="">Replay by Token/);
  assert.match(noSelectionMarkup, /disabled="">Clear Advanced Tokens/);
  assert.match(noSelectionMarkup, /History label: none/);
  assert.match(noSelectionMarkup, /Loaded proof: not opened/);
  assert.match(noSelectionMarkup, /Advanced tokens: empty/);

  const advancedOnlyMarkup = renderToStaticMarkup(
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
      onClearAdvancedTokens: () => undefined,
      onExportMetrics: () => undefined,
      onExportProofArtifact: () => undefined,
      onExportReplayArtifact: () => undefined,
      onSelectRecentProof: () => undefined,
      onOpenRecentProof: () => undefined,
      onReplayRecentProof: () => undefined
    })
  );
  assert.doesNotMatch(advancedOnlyMarkup, /disabled="">Open by Token/);
  assert.doesNotMatch(advancedOnlyMarkup, /disabled="">Replay by Token/);
  assert.doesNotMatch(advancedOnlyMarkup, /disabled="">Clear Advanced Tokens/);
  assert.match(advancedOnlyMarkup, /Advanced tokens: present/);
  assert.match(advancedOnlyMarkup, /Advanced proof ID: <span class="path-value">proof_alpha<\/span> • replay token:\s*<span class="path-value">trace_alpha<\/span>/);

  const selectedMarkup = renderToStaticMarkup(
    React.createElement(ProofsWorkspace, {
      proofId: '',
      setProofId: () => undefined,
      replayToken: '',
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
      onClearAdvancedTokens: () => undefined,
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
  assert.match(selectedMarkup, /History label: selected/);
  assert.match(selectedMarkup, /Loaded proof: not opened/);
  assert.match(selectedMarkup, /Advanced tokens: empty/);

  const advancedLoadedMarkup = renderToStaticMarkup(
    React.createElement(ProofsWorkspace, {
      proofId: 'proof_beta',
      setProofId: () => undefined,
      replayToken: 'trace_beta',
      setReplayToken: () => undefined,
      recentProofs,
      selectedRecentProof: recentProofs[0],
      selectedProof: {
        proofId: 'proof_beta',
        replayToken: 'trace_beta',
        generatedAt: '2026-03-01T11:00:00Z',
        snapshotId: 'snap_beta',
        policyId: 'policy_beta',
        traceLevel: 'trusted',
        query: 'Who can edit Opportunity.StageName?',
        trustLevel: 'conditional',
        deterministicAnswer: 'Conditional answer',
        confidence: 0.71,
        operatorsExecuted: ['planner'],
        rejectedBranches: [],
        citationCount: 2,
        derivationEdgeCount: 4
      },
      replayResult: null,
      metricsExport: null,
      loading: false,
      onListRecent: () => undefined,
      onGetProof: () => undefined,
      onReplay: () => undefined,
      onOpenByToken: () => undefined,
      onReplayByToken: () => undefined,
      onClearAdvancedTokens: () => undefined,
      onExportMetrics: () => undefined,
      onExportProofArtifact: () => undefined,
      onExportReplayArtifact: () => undefined,
      onSelectRecentProof: () => undefined,
      onOpenRecentProof: () => undefined,
      onReplayRecentProof: () => undefined
    })
  );
  assert.match(advancedLoadedMarkup, /History label: selected/);
  assert.match(advancedLoadedMarkup, /Loaded proof: advanced token lookup/);
  assert.match(advancedLoadedMarkup, /Advanced tokens: present/);

  const detailMarkup = renderToStaticMarkup(
    React.createElement(ProofsWorkspace, {
      proofId: '',
      setProofId: () => undefined,
      replayToken: '',
      setReplayToken: () => undefined,
      recentProofs,
      selectedRecentProof: recentProofs[0],
      selectedProof: {
        proofId: 'proof_alpha',
        replayToken: 'trace_alpha',
        generatedAt: '2026-03-01T10:00:00Z',
        snapshotId: 'snap_alpha',
        policyId: 'policy_alpha',
        traceLevel: 'strict',
        query: 'What touches Opportunity.StageName?',
        deterministicAnswer: 'Impact found.',
        confidence: 0.91,
        trustLevel: 'trusted',
        operatorsExecuted: ['impact'],
        rejectedBranches: [],
        citationCount: 4,
        derivationEdgeCount: 9
      },
      replayResult: {
        proofId: 'proof_alpha',
        replayToken: 'trace_alpha',
        snapshotId: 'snap_alpha',
        policyId: 'policy_alpha',
        matched: true,
        corePayloadMatched: true,
        metricsMatched: true,
        original: {
          trustLevel: 'trusted',
          deterministicAnswer: 'Impact found.',
          confidence: 0.91
        },
        replayed: {
          trustLevel: 'trusted',
          deterministicAnswer: 'Impact found.',
          confidence: 0.91
        }
      },
      metricsExport: {
        totalRecords: 1,
        bySnapshot: [
          {
            snapshotId: 'snap_alpha',
            count: 1,
            trusted: 1,
            conditional: 0,
            refused: 0,
            latestRecordedAt: '2026-03-01T10:00:00Z'
          }
        ],
        byProvider: [
          {
            provider: 'openai',
            model: 'gpt-5.4',
            count: 1,
            successCount: 1,
            errorCount: 0,
            errorRate: 0
          }
        ]
      },
      loading: false,
      onListRecent: () => undefined,
      onGetProof: () => undefined,
      onReplay: () => undefined,
      onOpenByToken: () => undefined,
      onReplayByToken: () => undefined,
      onClearAdvancedTokens: () => undefined,
      onExportMetrics: () => undefined,
      onExportProofArtifact: () => undefined,
      onExportReplayArtifact: () => undefined,
      onSelectRecentProof: () => undefined,
      onOpenRecentProof: () => undefined,
      onReplayRecentProof: () => undefined
    })
  );
  assert.match(detailMarkup, /History label: selected/);
  assert.match(detailMarkup, /Loaded proof: selected history/);
  assert.match(detailMarkup, /Advanced tokens: empty/);
  assert.match(detailMarkup, /Advanced proof ID: <span class="path-value">n\/a<\/span> • replay token:\s*<span class="path-value">n\/a<\/span>/);
  assert.match(detailMarkup, /<strong><span class="path-value">What touches Opportunity\.StageName\?<\/span><\/strong>/);
  assert.match(detailMarkup, /<strong>Snapshot:<\/strong> <span class="path-value">snap_alpha<\/span>/);
  assert.match(detailMarkup, /<strong>Generated:<\/strong> <span class="path-value">2026-03-01T10:00:00Z<\/span>/);
  assert.match(detailMarkup, /<strong>Policy:<\/strong> <span class="path-value">policy_alpha<\/span>/);
}

run();
