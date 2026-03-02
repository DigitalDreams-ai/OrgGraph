'use client';

export interface RecentProofItem {
  proofId: string;
  replayToken: string;
  generatedAt: string;
  snapshotId: string;
  trustLevel: string;
  query: string;
  label: string;
  subtitle: string;
}

export interface ProofArtifactView {
  proofId: string;
  replayToken: string;
  generatedAt: string;
  snapshotId: string;
  policyId: string;
  traceLevel: string;
  query: string;
  trustLevel: string;
  deterministicAnswer: string;
  confidence: number | null;
  operatorsExecuted: string[];
  rejectedBranches: string[];
  citationCount: number;
  derivationEdgeCount: number;
}

export interface ReplayResultView {
  proofId: string;
  replayToken: string;
  snapshotId: string;
  policyId: string;
  matched: boolean;
  corePayloadMatched: boolean;
  metricsMatched: boolean;
  original: {
    deterministicAnswer: string;
    trustLevel: string;
    confidence: number | null;
  };
  replayed: {
    deterministicAnswer: string;
    trustLevel: string;
    confidence: number | null;
  };
}

export interface MetricsSnapshotView {
  snapshotId: string;
  count: number;
  trusted: number;
  conditional: number;
  refused: number;
  latestRecordedAt: string;
}

export interface MetricsProviderView {
  provider: string;
  model?: string;
  count: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
}

export interface MetricsExportView {
  totalRecords: number;
  bySnapshot: MetricsSnapshotView[];
  byProvider: MetricsProviderView[];
}
