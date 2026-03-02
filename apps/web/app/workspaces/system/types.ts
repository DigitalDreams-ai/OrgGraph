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
