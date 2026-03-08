import assert from 'node:assert/strict';
import { assessRetrieveHandoff } from '../../web/app/workspaces/browser/retrieve-handoff';
import type { MetadataRetrieveResultView, MetadataSelection } from '../../web/app/workspaces/browser/types';
import { buildRefreshWorkflowStages } from '../../web/app/workspaces/refresh/refresh-workflow-state';
import {
  assessDiffRunLineage,
  assessOrgRetrieveRunLineage,
  assessRefreshRunLineage,
  buildWorkflowLineage
} from '../../web/app/workspaces/refresh/workflow-lineage';
import type {
  OrgRetrieveRunView,
  RefreshDiffView,
  RefreshRunView
} from '../../web/app/workspaces/refresh/types';

const handoff: MetadataRetrieveResultView = {
  alias: 'shulman-uat',
  status: 'completed',
  parsePath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\sf-project\\force-app\\main\\default',
  metadataArgs: ['Flow:Civil_Rights_Intake_Questionnaire', 'CustomField:Opportunity.StageName'],
  autoRefresh: true,
  completedAt: '2026-03-08T18:00:00Z'
};

const selections: MetadataSelection[] = [
  { type: 'Flow', members: ['Civil_Rights_Intake_Questionnaire'] },
  { type: 'CustomField', members: ['Opportunity.StageName'] }
];

function buildRefreshRun(overrides: Partial<RefreshRunView> = {}): RefreshRunView {
  return {
    snapshotId: 'snap_current',
    mode: 'incremental',
    skipped: false,
    sourcePath: handoff.parsePath,
    nodeCount: 30,
    edgeCount: 42,
    evidenceCount: 70,
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
    meaningChangeSummary: 'meaning changed in 2 automation paths',
    addedNodeCount: 2,
    removedNodeCount: 0,
    addedEdgeCount: 3,
    removedEdgeCount: 1,
    structureDigestChanged: true,
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
        step: 'auth',
        status: 'completed',
        message: 'auth ok',
        elapsedMs: 120
      },
      {
        step: 'retrieve',
        status: 'completed',
        message: 'retrieve ok',
        elapsedMs: 220
      }
    ],
    ...overrides
  };
}

function run(): void {
  const retrieveAssessment = assessRetrieveHandoff(handoff, handoff.alias);
  const refreshRun = buildRefreshRun();
  const diffRun = buildDiffRun();
  const orgRetrieveRun = buildOrgRetrieveRun();

  const currentStages = buildRefreshWorkflowStages({
    retrieveHandoff: handoff,
    retrieveAssessment,
    retrieveSelections: selections,
    refreshLineage: assessRefreshRunLineage(refreshRun, handoff, selections, handoff.alias),
    diffLineage: assessDiffRunLineage(diffRun, handoff, selections, handoff.alias, refreshRun),
    orgRetrieveLineage: assessOrgRetrieveRunLineage(orgRetrieveRun, handoff, selections, handoff.alias),
    lastRefreshRun: refreshRun,
    lastDiffRun: diffRun,
    lastOrgRetrieveRun: orgRetrieveRun,
    fromSnapshot: 'snap_previous',
    toSnapshot: 'snap_current',
    orgRunRetrieve: true
  });

  assert.deepEqual(
    currentStages.map((stage) => stage.state),
    ['complete', 'complete', 'complete', 'complete'],
    'all workflow stages should read complete when lineage is current'
  );

  const missingDiffStages = buildRefreshWorkflowStages({
    retrieveHandoff: handoff,
    retrieveAssessment,
    retrieveSelections: selections,
    refreshLineage: assessRefreshRunLineage(refreshRun, handoff, selections, handoff.alias),
    diffLineage: assessDiffRunLineage(null, handoff, selections, handoff.alias, refreshRun),
    orgRetrieveLineage: assessOrgRetrieveRunLineage(null, handoff, selections, handoff.alias),
    lastRefreshRun: refreshRun,
    lastDiffRun: null,
    lastOrgRetrieveRun: null,
    fromSnapshot: '',
    toSnapshot: '',
    orgRunRetrieve: true
  });

  assert.equal(missingDiffStages[2].state, 'blocked');
  assert.ok(
    missingDiffStages[2].detail.includes('two snapshot IDs'),
    'diff stage should explain missing snapshot pair'
  );
  assert.equal(missingDiffStages[3].state, 'ready');

  const staleRefreshStages = buildRefreshWorkflowStages({
    retrieveHandoff: handoff,
    retrieveAssessment,
    retrieveSelections: selections,
    refreshLineage: assessRefreshRunLineage(
      buildRefreshRun({ sourcePath: 'C:\\other\\parse-path' }),
      handoff,
      selections,
      handoff.alias
    ),
    diffLineage: assessDiffRunLineage(null, handoff, selections, handoff.alias, null),
    orgRetrieveLineage: assessOrgRetrieveRunLineage(null, handoff, selections, handoff.alias),
    lastRefreshRun: buildRefreshRun({ sourcePath: 'C:\\other\\parse-path' }),
    lastDiffRun: null,
    lastOrgRetrieveRun: null,
    fromSnapshot: 'snap_previous',
    toSnapshot: 'snap_current',
    orgRunRetrieve: false
  });

  assert.equal(staleRefreshStages[1].state, 'stale');
  assert.ok(
    staleRefreshStages[1].detail.includes('source path'),
    'refresh stage should surface stale lineage reason'
  );
  assert.equal(staleRefreshStages[2].state, 'waiting');
  assert.equal(staleRefreshStages[3].state, 'ready');
  assert.ok(
    staleRefreshStages[3].summary.includes('auth-only mode'),
    'org pipeline stage should explain auth-only toggle state'
  );

  console.log('refresh workflow state test passed');
}

run();
