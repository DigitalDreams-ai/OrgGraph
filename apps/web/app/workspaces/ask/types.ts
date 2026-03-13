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
    sourceMode?: string;
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
    topCitationSources?: string[];
    flowImpact?: {
      readFieldCount?: number;
      writeFieldCount?: number;
      readObjectCount?: number;
      writeObjectCount?: number;
      referencedObjectCount?: number;
      triggerTypes?: string[];
      topCitationSources?: string[];
      summaries?: {
        reads?: string;
        writes?: string;
        readObjects?: string;
        writeObjects?: string;
        referencedObjects?: string;
        triggerTypes?: string;
      };
    };
    componentUsage?: {
      familyHint?:
        | 'flow'
        | 'layout'
        | 'apex_class'
        | 'apex_trigger'
        | 'custom_object'
        | 'custom_field'
        | 'email_template'
        | 'tab';
      matchedCount?: number;
      referenceHitCount?: number;
      sourceFileCount?: number;
      definitionOnly?: boolean;
      topReferenceSources?: string[];
      summaries?: {
        references?: string;
        coverage?: string;
        family?: string;
        definition?: string;
      };
    };
    evidenceGaps?: string[];
    nextActions?: Array<{ label?: string; rationale?: string }>;
  };
  policy?: { policyId?: string };
  proof?: { proofId?: string; replayToken?: string; snapshotId?: string };
  citations?: Array<{ sourcePath?: string; score?: number; snippet?: string }>;
};
