'use client';

import { assessRetrieveHandoff } from '../browser/retrieve-handoff';
import type { MetadataRetrieveResultView, MetadataSelection } from '../browser/types';
import type {
  OrgRetrieveRunView,
  RefreshDiffView,
  RefreshRunView,
  WorkflowLineage
} from './types';

export interface WorkflowLineageAssessment {
  state: 'missing' | 'stale' | 'current';
  reasons: string[];
}

function normalizeRuntimePath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();
}

function normalizeMetadataArgs(metadataArgs: string[]): string[] {
  return metadataArgs
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0)
    .sort((left, right) => left.localeCompare(right));
}

function metadataArgsMatch(left: string[], right: string[]): boolean {
  const normalizedLeft = normalizeMetadataArgs(left);
  const normalizedRight = normalizeMetadataArgs(right);
  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }
  return normalizedLeft.every((entry, index) => entry === normalizedRight[index]);
}

function currentLineageContext(
  handoff: MetadataRetrieveResultView | null,
  selections: MetadataSelection[],
  expectedAlias?: string
): { current: WorkflowLineage | null; reasons: string[] } {
  const handoffAssessment = assessRetrieveHandoff(handoff, expectedAlias);
  const reasons: string[] = [];

  if (handoffAssessment.state !== 'ready') {
    reasons.push(handoffAssessment.reasons[0] ?? 'Current Browser handoff is not ready.');
  }
  if (selections.length === 0) {
    reasons.push('No staged metadata selections are present for the current Browser handoff.');
  }

  if (!handoff || handoffAssessment.state !== 'ready' || selections.length === 0) {
    return { current: null, reasons };
  }

  return {
    current: {
      alias: handoff.alias,
      parsePath: handoff.parsePath,
      metadataArgs: handoff.metadataArgs,
      selectionCount: selections.length,
      handoffCompletedAt: handoff.completedAt
    },
    reasons: []
  };
}

function compareStoredLineage(
  label: string,
  stored: WorkflowLineage | undefined,
  current: WorkflowLineage
): string[] {
  if (!stored) {
    return [`${label} result was captured before handoff lineage was recorded. Re-run ${label.toLowerCase()} from the current Browser handoff.`];
  }

  const reasons: string[] = [];
  if (stored.alias.trim().toLowerCase() !== current.alias.trim().toLowerCase()) {
    reasons.push(
      `${label} alias '${stored.alias}' does not match current Browser alias '${current.alias}'.`
    );
  }
  if (normalizeRuntimePath(stored.parsePath) !== normalizeRuntimePath(current.parsePath)) {
    reasons.push(
      `${label} parse path '${stored.parsePath}' does not match current Browser handoff path '${current.parsePath}'.`
    );
  }
  if (!metadataArgsMatch(stored.metadataArgs, current.metadataArgs)) {
    reasons.push(`${label} metadata arguments no longer match the current Browser handoff.`);
  }
  if (stored.selectionCount !== current.selectionCount) {
    reasons.push(
      `${label} captured ${stored.selectionCount} staged selection(s), but the current Browser handoff has ${current.selectionCount}.`
    );
  }
  if (stored.handoffCompletedAt !== current.handoffCompletedAt) {
    reasons.push('The latest Browser handoff completed after this result was captured.');
  }
  return reasons;
}

export function buildWorkflowLineage(
  handoff: MetadataRetrieveResultView | null,
  selections: MetadataSelection[],
  expectedAlias?: string
): WorkflowLineage | null {
  return currentLineageContext(handoff, selections, expectedAlias).current;
}

export function assessRefreshRunLineage(
  refreshRun: RefreshRunView | null,
  handoff: MetadataRetrieveResultView | null,
  selections: MetadataSelection[],
  expectedAlias?: string
): WorkflowLineageAssessment {
  if (!refreshRun) {
    return {
      state: 'missing',
      reasons: ['Run Refresh Semantic State from the current Browser handoff to capture a grounded rebuild summary.']
    };
  }

  const { current, reasons: currentReasons } = currentLineageContext(handoff, selections, expectedAlias);
  if (!current) {
    return {
      state: 'stale',
      reasons: [
        `Refresh no longer belongs to an active Browser handoff. ${currentReasons[0] ?? 'Run Retrieve Cart again.'}`
      ]
    };
  }

  const reasons = compareStoredLineage('Refresh', refreshRun.lineage, current);
  if (!refreshRun.sourcePath) {
    reasons.push('Refresh result did not record a source path.');
  } else if (normalizeRuntimePath(refreshRun.sourcePath) !== normalizeRuntimePath(current.parsePath)) {
    reasons.push(
      `Refresh source path '${refreshRun.sourcePath}' does not match current Browser handoff path '${current.parsePath}'.`
    );
  }

  return {
    state: reasons.length > 0 ? 'stale' : 'current',
    reasons
  };
}

export function assessDiffRunLineage(
  diffRun: RefreshDiffView | null,
  handoff: MetadataRetrieveResultView | null,
  selections: MetadataSelection[],
  expectedAlias: string | undefined,
  refreshRun: RefreshRunView | null
): WorkflowLineageAssessment {
  if (!diffRun) {
    return {
      state: 'missing',
      reasons: ['Run Compare Snapshot Drift after Refresh Semantic State captures the current Browser handoff lineage.']
    };
  }

  const { current, reasons: currentReasons } = currentLineageContext(handoff, selections, expectedAlias);
  if (!current) {
    return {
      state: 'stale',
      reasons: [
        `Diff no longer belongs to an active Browser handoff. ${currentReasons[0] ?? 'Run Retrieve Cart and Refresh again.'}`
      ]
    };
  }

  const reasons = compareStoredLineage('Diff', diffRun.lineage, current);
  const refreshAssessment = assessRefreshRunLineage(refreshRun, handoff, selections, expectedAlias);
  if (refreshAssessment.state !== 'current') {
    reasons.push(refreshAssessment.reasons[0] ?? 'Latest Refresh is not current for this Browser handoff.');
  }
  if (!diffRun.refreshSnapshotId) {
    reasons.push('Diff result did not record the Refresh snapshot it was based on.');
  } else if (!refreshRun?.snapshotId) {
    reasons.push('Latest Refresh summary is missing, so Diff cannot be confirmed against the current rebuild.');
  } else if (diffRun.refreshSnapshotId !== refreshRun.snapshotId) {
    reasons.push(
      `Diff was based on Refresh snapshot '${diffRun.refreshSnapshotId}', but the latest Refresh snapshot is '${refreshRun.snapshotId}'.`
    );
  }

  return {
    state: reasons.length > 0 ? 'stale' : 'current',
    reasons
  };
}

export function assessOrgRetrieveRunLineage(
  orgRetrieveRun: OrgRetrieveRunView | null,
  handoff: MetadataRetrieveResultView | null,
  selections: MetadataSelection[],
  expectedAlias?: string
): WorkflowLineageAssessment {
  if (!orgRetrieveRun) {
    return {
      state: 'missing',
      reasons: ['Run Org Pipeline with Run Retrieve enabled to capture a grounded pipeline result.']
    };
  }

  if (orgRetrieveRun.runRetrieve === false) {
    return {
      state: 'missing',
      reasons: [
        'Latest Org Retrieve run only covered auth/session steps. Enable Run Retrieve to capture a handoff-based pipeline result.'
      ]
    };
  }

  const { current, reasons: currentReasons } = currentLineageContext(handoff, selections, expectedAlias);
  if (!current) {
    return {
      state: 'stale',
      reasons: [
        `Org Retrieve no longer belongs to an active Browser handoff. ${currentReasons[0] ?? 'Run Retrieve Cart again.'}`
      ]
    };
  }

  const reasons = compareStoredLineage('Org Retrieve', orgRetrieveRun.lineage, current);
  if (orgRetrieveRun.alias.trim().toLowerCase() !== current.alias.trim().toLowerCase()) {
    reasons.push(
      `Org Retrieve alias '${orgRetrieveRun.alias}' does not match current Browser alias '${current.alias}'.`
    );
  }
  if (normalizeRuntimePath(orgRetrieveRun.parsePath) !== normalizeRuntimePath(current.parsePath)) {
    reasons.push(
      `Org Retrieve parse path '${orgRetrieveRun.parsePath}' does not match current Browser handoff path '${current.parsePath}'.`
    );
  }
  if (!metadataArgsMatch(orgRetrieveRun.metadataArgs, current.metadataArgs)) {
    reasons.push('Org Retrieve metadata arguments no longer match the current Browser handoff.');
  }

  return {
    state: reasons.length > 0 ? 'stale' : 'current',
    reasons
  };
}
