'use client';

import type { MetadataRetrieveResultView, MetadataSelection } from '../browser/types';

export type RefreshRetrieveHandoffView = MetadataRetrieveResultView;
export type RefreshRetrieveSelectionView = MetadataSelection;

export interface WorkflowLineage {
  alias: string;
  parsePath: string;
  metadataArgs: string[];
  selectionCount: number;
  handoffCompletedAt: string;
}

export interface RefreshRunView {
  snapshotId: string;
  mode: string;
  skipped: boolean;
  sourcePath: string;
  nodeCount: number;
  edgeCount: number;
  evidenceCount: number;
  meaningChangeSummary: string;
  driftWithinBudget: boolean;
  driftSummary: string;
  driftViolationCount: number;
  lineage?: WorkflowLineage;
}

export interface RefreshDiffView {
  fromSnapshotId: string;
  toSnapshotId: string;
  meaningChangeSummary: string;
  addedNodeCount: number;
  removedNodeCount: number;
  addedEdgeCount: number;
  removedEdgeCount: number;
  structureDigestChanged: boolean;
  driftWithinBudget: boolean;
  driftSummary: string;
  refreshSnapshotId?: string;
  lineage?: WorkflowLineage;
}

export interface OrgRetrieveRunView {
  status: string;
  alias: string;
  completedAt: string;
  parsePath: string;
  projectPath: string;
  metadataArgs: string[];
  runRetrieve?: boolean;
  lineage?: WorkflowLineage;
  stepSummary: Array<{
    step: string;
    status: string;
    message: string;
    elapsedMs: number;
  }>;
}
