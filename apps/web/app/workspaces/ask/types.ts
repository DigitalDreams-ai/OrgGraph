export type AskPayload = {
  answer?: string;
  deterministicAnswer?: string;
  confidence?: number;
  trustLevel?: string;
  policy?: { policyId?: string };
  proof?: { proofId?: string; replayToken?: string; snapshotId?: string };
  citations?: Array<{ sourcePath?: string; score?: number; snippet?: string }>;
};
