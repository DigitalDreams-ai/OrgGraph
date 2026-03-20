import assert from 'node:assert/strict';
import {
  assessDiffRunLineage,
  assessOrgRetrieveRunLineage,
  assessRefreshRunLineage,
  buildWorkflowLineage
} from '../../web/app/workspaces/refresh/workflow-lineage';
import type { MetadataRetrieveResultView, MetadataSelection } from '../../web/app/workspaces/browser/types';
import type {
  OrgRetrieveRunView,
  RefreshDiffView,
  RefreshRunView
} from '../../web/app/workspaces/refresh/types';

const handoff: MetadataRetrieveResultView = {
  alias: 'shulman-uat',
  status: 'completed',
  parsePath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\sf-project\\force-app\\main\\default',
  metadataArgs: ['Flow:Civil_Rights_Intake_Questionnaire', 'CustomObject:Opportunity'],
  autoRefresh: true,
  completedAt: '2026-03-07T20:00:00Z'
};

const selections: MetadataSelection[] = [
  { type: 'Flow', members: ['Civil_Rights_Intake_Questionnaire'] },
  { type: 'CustomObject', members: ['Opportunity'] }
];

function buildRefreshRun(overrides: Partial<RefreshRunView> = {}): RefreshRunView {
  return {
    snapshotId: 'snap_current',
    mode: 'incremental',
    rebaselineApplied: false,
    skipped: false,
    sourcePath: handoff.parsePath,
    nodeCount: 10,
    edgeCount: 12,
    evidenceCount: 15,
    meaningChangeSummary: 'meaning stable',
    driftWithinBudget: true,
    driftSummary: 'within budget',
    driftViolationCount: 0,
    lineage: buildWorkflowLineage(handoff, selections, handoff.alias) ?? undefined,
    ...overrides
  };
}

function buildDiffRun(overrides: Partial<RefreshDiffView> = {}): RefreshDiffView {
  return {
    fromSnapshotId: 'snap_previous',
    toSnapshotId: 'snap_current',
    meaningChangeSummary: 'meaning stable',
    addedNodeCount: 0,
    removedNodeCount: 0,
    addedEdgeCount: 0,
    removedEdgeCount: 0,
    structureDigestChanged: false,
    driftWithinBudget: true,
    driftSummary: 'within budget',
    refreshSnapshotId: 'snap_current',
    lineage: buildWorkflowLineage(handoff, selections, handoff.alias) ?? undefined,
    ...overrides
  };
}

function buildOrgRetrieveRun(overrides: Partial<OrgRetrieveRunView> = {}): OrgRetrieveRunView {
  return {
    status: 'completed',
    alias: handoff.alias,
    completedAt: handoff.completedAt,
    parsePath: handoff.parsePath,
    projectPath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\sf-project',
    metadataArgs: handoff.metadataArgs,
    runRetrieve: true,
    lineage: buildWorkflowLineage(handoff, selections, handoff.alias) ?? undefined,
    stepSummary: [
      {
        step: 'retrieve',
        status: 'completed',
        message: 'retrieved metadata',
        elapsedMs: 100
      }
    ],
    ...overrides
  };
}

async function run(): Promise<void> {
  const refreshCurrent = assessRefreshRunLineage(
    buildRefreshRun(),
    handoff,
    selections,
    handoff.alias
  );
  assert.equal(refreshCurrent.state, 'current');

  const refreshStale = assessRefreshRunLineage(
    buildRefreshRun({ sourcePath: 'C:\\other\\parse-path' }),
    handoff,
    selections,
    handoff.alias
  );
  assert.equal(refreshStale.state, 'stale');
  assert.ok(
    refreshStale.reasons.some((reason) => reason.includes('source path')),
    'refresh stale state should explain source-path mismatch'
  );

  const changedHandoff: MetadataRetrieveResultView = {
    ...handoff,
    completedAt: '2026-03-07T20:10:00Z'
  };
  const diffStale = assessDiffRunLineage(
    buildDiffRun(),
    changedHandoff,
    selections,
    handoff.alias,
    buildRefreshRun()
  );
  assert.equal(diffStale.state, 'stale');
  assert.ok(
    diffStale.reasons.some((reason) => reason.includes('latest Browser handoff completed')),
    'diff stale state should explain newer handoff lineage'
  );

  const orgRetrieveStale = assessOrgRetrieveRunLineage(
    buildOrgRetrieveRun({ alias: 'other-alias' }),
    handoff,
    selections,
    handoff.alias
  );
  assert.equal(orgRetrieveStale.state, 'stale');
  assert.ok(
    orgRetrieveStale.reasons.some((reason) => reason.includes('Org Retrieve alias')),
    'org retrieve stale state should explain alias mismatch'
  );

  const authOnlyRun = assessOrgRetrieveRunLineage(
    buildOrgRetrieveRun({ runRetrieve: false, lineage: undefined }),
    handoff,
    selections,
    handoff.alias
  );
  assert.equal(authOnlyRun.state, 'missing');
  assert.ok(
    authOnlyRun.reasons.some((reason) => reason.includes('only covered auth/session steps')),
    'auth-only org retrieve should not be treated as a handoff-backed result'
  );

  console.log('refresh workflow lineage test passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
