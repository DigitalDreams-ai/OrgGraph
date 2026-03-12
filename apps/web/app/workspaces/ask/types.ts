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
    recommendation?: {
      verdict?:
        | 'approve_with_verification'
        | 'review_before_approval'
        | 'do_not_approve_yet'
        | 'needs_more_evidence';
      summary?: string;
    };
    riskScore?: number;
    riskLevel?: string;
    evidenceCoverage?: {
      citationCount?: number;
      hasPermissionPaths?: boolean;
      hasAutomationCoverage?: boolean;
      hasImpactPaths?: boolean;
    };
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
    evidenceGaps?: string[];
    nextActions?: Array<{ label?: string; rationale?: string }>;
  };
  policy?: { policyId?: string };
  proof?: { proofId?: string; replayToken?: string; snapshotId?: string };
  citations?: Array<{ sourcePath?: string; score?: number; snippet?: string }>;
};
