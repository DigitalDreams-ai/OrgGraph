'use client';

export interface MetaContextPayload {
  status: 'implemented';
  context: {
    version: string;
    updatedAt: string;
    relationMultipliers: Record<string, number>;
    provenance: {
      formulaVersion: string;
      metricsSampleSize: number;
      trustedByIntent: Record<string, number>;
      refusedByIntent: Record<string, number>;
    };
  };
}

export interface MetaAdaptPayload {
  status: 'implemented';
  dryRun: boolean;
  changed: boolean;
  contextPath: string;
  auditArtifactPath: string;
  before: MetaContextPayload['context'];
  after: MetaContextPayload['context'];
}

export interface AskTrustDashboardPayload {
  status: 'implemented';
  generatedAt: string;
  totals: {
    askRecords: number;
    proofArtifacts: number;
    trusted: number;
    conditional: number;
    refused: number;
  };
  replayPassRate: number;
  proofCoverageRate: number;
  driftTrend: {
    snapshotCount: number;
    latestSnapshotId?: string;
    previousSnapshotId?: string;
  };
  failureClasses: Array<{
    class: 'llm_fallback' | 'policy_refusal' | 'constraint_risk' | 'none';
    count: number;
  }>;
}

export interface RuntimeMetricsPayload {
  status: 'ok';
  dbBackend: string;
  totalRequests: number;
  byRoute: Array<{
    path: string;
    method: string;
    requestCount: number;
    avgElapsedMs: number;
    lastStatusCode: number;
    lastSeenAt: string;
  }>;
}
