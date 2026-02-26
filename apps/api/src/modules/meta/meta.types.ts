export interface MetaContextState {
  version: 'phase16-v1';
  updatedAt: string;
  relationMultipliers: Record<string, number>;
  provenance: {
    formulaVersion: 'phase16-v1';
    metricsSampleSize: number;
    trustedByIntent: Record<string, number>;
    refusedByIntent: Record<string, number>;
  };
}

export interface MetaAdaptResponse {
  status: 'implemented';
  dryRun: boolean;
  changed: boolean;
  contextPath: string;
  auditArtifactPath: string;
  before: MetaContextState;
  after: MetaContextState;
}
