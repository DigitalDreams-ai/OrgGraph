export type AskPayload = {
  answer?: string;
  deterministicAnswer?: string;
  confidence?: number;
  trustLevel?: string;
  decisionPacket?: {
    kind?: string;
    focus?: string;
    targetLabel?: string;
    targetType?: string;
    summary?: string;
    riskLevel?: string;
    topRiskDrivers?: string[];
    permissionImpact?: {
      user?: string;
      summary?: string;
      granted?: boolean;
      pathCount?: number;
      principalCount?: number;
      warnings?: string[];
    };
    automationImpact?: {
      summary?: string;
      automationCount?: number;
      topAutomationNames?: string[];
    };
    changeImpact?: {
      summary?: string;
      impactPathCount?: number;
      topImpactedSources?: string[];
    };
    nextActions?: Array<{ label?: string; rationale?: string }>;
  };
  policy?: { policyId?: string };
  proof?: { proofId?: string; replayToken?: string; snapshotId?: string };
  citations?: Array<{ sourcePath?: string; score?: number; snippet?: string }>;
};
