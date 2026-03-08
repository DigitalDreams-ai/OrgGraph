'use client';

import type { RetrieveHandoffAssessment } from '../browser/retrieve-handoff';
import type { WorkflowLineageAssessment } from './workflow-lineage';
import type {
  OrgRetrieveRunView,
  RefreshDiffView,
  RefreshRunView,
  RefreshRetrieveHandoffView,
  RefreshRetrieveSelectionView
} from './types';

export type RefreshWorkflowStageState =
  | 'complete'
  | 'ready'
  | 'blocked'
  | 'stale'
  | 'waiting';

export interface RefreshWorkflowStage {
  id: 'retrieve' | 'refresh' | 'diff' | 'orgRetrieve';
  label: string;
  state: RefreshWorkflowStageState;
  summary: string;
  detail: string;
  action: string;
}

interface BuildRefreshWorkflowStagesOptions {
  retrieveHandoff: RefreshRetrieveHandoffView | null;
  retrieveAssessment: RetrieveHandoffAssessment;
  retrieveSelections: RefreshRetrieveSelectionView[];
  refreshLineage: WorkflowLineageAssessment;
  diffLineage: WorkflowLineageAssessment;
  orgRetrieveLineage: WorkflowLineageAssessment;
  lastRefreshRun: RefreshRunView | null;
  lastDiffRun: RefreshDiffView | null;
  lastOrgRetrieveRun: OrgRetrieveRunView | null;
  fromSnapshot: string;
  toSnapshot: string;
  orgRunRetrieve: boolean;
}

function formatMetadataScope(selections: RefreshRetrieveSelectionView[]): string {
  const familyCount = selections.length;
  const memberCount = selections.reduce((total, selection) => {
    if (!Array.isArray(selection.members)) {
      return total;
    }
    return total + selection.members.length;
  }, 0);

  if (familyCount === 0) {
    return 'No staged metadata selections';
  }

  return `${familyCount} famil${familyCount === 1 ? 'y' : 'ies'} staged • ${memberCount} named item${memberCount === 1 ? '' : 's'}`;
}

function snapshotPairState(fromSnapshot: string, toSnapshot: string): {
  valid: boolean;
  detail: string;
} {
  const from = fromSnapshot.trim();
  const to = toSnapshot.trim();
  if (!from || !to) {
    return {
      valid: false,
      detail: 'Diff needs two snapshot IDs. Run at least two refresh cycles or set both snapshot fields.'
    };
  }
  if (from === to) {
    return {
      valid: false,
      detail: 'Diff is blocked because both snapshot fields point to the same snapshot.'
    };
  }
  return {
    valid: true,
    detail: `${from} → ${to}`
  };
}

export function buildRefreshWorkflowStages(
  options: BuildRefreshWorkflowStagesOptions
): RefreshWorkflowStage[] {
  const hasReadyHandoff =
    options.retrieveAssessment.state === 'ready' && options.retrieveSelections.length > 0;
  const snapshots = snapshotPairState(options.fromSnapshot, options.toSnapshot);

  const retrieveStage: RefreshWorkflowStage =
    !options.retrieveHandoff
      ? {
          id: 'retrieve',
          label: '1. Retrieve Cart',
          state: 'waiting',
          summary: 'Browser handoff not captured yet',
          detail: 'Open Org Browser, check the metadata you want, then run Retrieve Cart.',
          action: 'Open Org Browser and run Retrieve Cart.'
        }
      : options.retrieveAssessment.state !== 'ready'
        ? {
            id: 'retrieve',
            label: '1. Retrieve Cart',
            state: 'blocked',
            summary: 'Browser handoff is blocked',
            detail:
              options.retrieveAssessment.reasons[0] ??
              'Re-run Retrieve Cart for the active alias.',
            action: 'Fix the handoff issue in Org Browser, then run Retrieve Cart again.'
          }
        : options.retrieveSelections.length === 0
          ? {
              id: 'retrieve',
              label: '1. Retrieve Cart',
              state: 'blocked',
              summary: 'No staged selections were saved',
              detail:
                'The latest retrieve completed, but no checked families or items were staged with it.',
              action: 'Go back to Org Browser, check at least one row, then run Retrieve Cart again.'
            }
          : {
              id: 'retrieve',
              label: '1. Retrieve Cart',
              state: 'complete',
              summary: 'Retrieve handoff ready',
              detail: `${formatMetadataScope(options.retrieveSelections)} • parse path recorded`,
              action: 'Continue to Refresh Semantic State.'
            };

  const refreshStage: RefreshWorkflowStage =
    !hasReadyHandoff
      ? {
          id: 'refresh',
          label: '2. Refresh Semantic State',
          state: 'waiting',
          summary: 'Waiting on Browser handoff',
          detail: 'Refresh stays fail-closed until Retrieve Cart is current and staged.',
          action: 'Complete Retrieve Cart first.'
        }
      : !options.lastRefreshRun
        ? {
            id: 'refresh',
            label: '2. Refresh Semantic State',
            state: 'ready',
            summary: 'Ready to rebuild semantic state',
            detail: 'The current Browser handoff is grounded and can seed a refresh.',
            action: 'Run Refresh Semantic State.'
          }
        : options.refreshLineage.state !== 'current'
          ? {
              id: 'refresh',
              label: '2. Refresh Semantic State',
              state: 'stale',
              summary: 'Refresh summary is stale',
              detail:
                options.refreshLineage.reasons[0] ??
                'The last refresh no longer matches the current Browser handoff.',
              action: 'Run Refresh Semantic State again.'
            }
          : {
              id: 'refresh',
              label: '2. Refresh Semantic State',
              state: 'complete',
              summary: `Snapshot ${options.lastRefreshRun.snapshotId}`,
              detail: `${options.lastRefreshRun.nodeCount} nodes • ${options.lastRefreshRun.edgeCount} edges • ${options.lastRefreshRun.evidenceCount} evidence`,
              action: snapshots.valid
                ? 'You can compare drift now.'
                : 'Capture one more refresh snapshot or set both snapshot fields before diff.'
            };

  const diffStage: RefreshWorkflowStage =
    !hasReadyHandoff
      ? {
          id: 'diff',
          label: '3. Compare Snapshot Drift',
          state: 'waiting',
          summary: 'Waiting on Browser handoff',
          detail: 'Diff cannot run until Retrieve Cart and Refresh are current.',
          action: 'Complete Retrieve Cart and Refresh first.'
        }
      : options.refreshLineage.state !== 'current'
        ? {
            id: 'diff',
            label: '3. Compare Snapshot Drift',
            state: 'waiting',
            summary: 'Waiting on current refresh',
            detail:
              options.refreshLineage.reasons[0] ??
              'Diff needs a current refresh summary before it can compare snapshots.',
            action: 'Run Refresh Semantic State first.'
          }
        : !snapshots.valid
          ? {
              id: 'diff',
              label: '3. Compare Snapshot Drift',
              state: 'blocked',
              summary: 'Snapshot pair not ready',
              detail: snapshots.detail,
              action: 'Capture another refresh snapshot or set two different snapshot IDs.'
            }
          : !options.lastDiffRun
            ? {
                id: 'diff',
                label: '3. Compare Snapshot Drift',
                state: 'ready',
                summary: 'Ready to compare the staged snapshots',
                detail: snapshots.detail,
                action: 'Run Compare Snapshot Drift.'
              }
            : options.diffLineage.state !== 'current'
              ? {
                  id: 'diff',
                  label: '3. Compare Snapshot Drift',
                  state: 'stale',
                  summary: 'Diff summary is stale',
                  detail:
                    options.diffLineage.reasons[0] ??
                    'The last diff no longer matches the current handoff.',
                  action: 'Run Compare Snapshot Drift again.'
                }
              : {
                  id: 'diff',
                  label: '3. Compare Snapshot Drift',
                  state: 'complete',
                  summary: options.lastDiffRun.meaningChangeSummary || 'Diff captured',
                  detail: `${snapshots.detail} • +${options.lastDiffRun.addedNodeCount}/-${options.lastDiffRun.removedNodeCount} nodes`,
                  action: 'Review drift, then run the org pipeline if you need an end-to-end execution proof.'
                };

  const orgRetrieveStage: RefreshWorkflowStage =
    !hasReadyHandoff
      ? {
          id: 'orgRetrieve',
          label: '4. Run Org Pipeline',
          state: 'waiting',
          summary: 'Waiting on Browser handoff',
          detail: 'The org pipeline only becomes meaningful after a grounded Retrieve Cart handoff.',
          action: 'Complete Retrieve Cart first.'
        }
      : !options.orgRunRetrieve
        ? {
            id: 'orgRetrieve',
            label: '4. Run Org Pipeline',
            state: 'ready',
            summary: 'Pipeline set to auth-only mode',
            detail: 'Run Retrieve is currently disabled, so a pipeline run would not produce handoff-backed metadata output.',
            action: 'Enable Run Retrieve if you want a full retrieve pipeline result.'
          }
        : !options.lastOrgRetrieveRun
          ? {
              id: 'orgRetrieve',
              label: '4. Run Org Pipeline',
              state: 'ready',
              summary: 'Ready for a full org pipeline run',
              detail: 'Current handoff can drive auth/retrieve/refresh as one deterministic pipeline.',
              action: 'Run Org Pipeline.'
            }
          : options.orgRetrieveLineage.state !== 'current'
            ? {
                id: 'orgRetrieve',
                label: '4. Run Org Pipeline',
                state: 'stale',
                summary: 'Pipeline summary is stale',
                detail:
                  options.orgRetrieveLineage.reasons[0] ??
                  'The last pipeline result no longer matches the current handoff.',
                action: 'Run Org Pipeline again.'
              }
            : {
                id: 'orgRetrieve',
                label: '4. Run Org Pipeline',
                state: 'complete',
                summary: 'Pipeline run captured',
                detail: `${options.lastOrgRetrieveRun.stepSummary.length} step${options.lastOrgRetrieveRun.stepSummary.length === 1 ? '' : 's'} recorded for ${options.lastOrgRetrieveRun.alias}`,
                action: 'Use this result as the current handoff-backed pipeline proof.'
              };

  return [retrieveStage, refreshStage, diffStage, orgRetrieveStage];
}
