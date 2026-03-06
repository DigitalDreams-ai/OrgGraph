'use client';

import type { MetadataRetrieveResultView, MetadataSelection } from '../browser/types';

export type RefreshRetrieveHandoffView = MetadataRetrieveResultView;
export type RefreshRetrieveSelectionView = MetadataSelection;

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
}

export interface OrgRetrieveRunView {
  status: string;
  alias: string;
  completedAt: string;
  parsePath: string;
  projectPath: string;
  metadataArgs: string[];
  stepSummary: Array<{
    step: string;
    status: string;
    message: string;
    elapsedMs: number;
  }>;
}
