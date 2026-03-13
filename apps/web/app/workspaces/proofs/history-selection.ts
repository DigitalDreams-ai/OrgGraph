'use client';

import type { ProofArtifactView, RecentProofItem, ReplayResultView } from './types';

function normalize(value: string | undefined): string {
  return value?.trim() || '';
}

function sanitizeArtifactName(value: string | undefined): string {
  const next = normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return next || 'artifact';
}

export function resolveSelectedHistoryProofId(
  recentProofs: RecentProofItem[],
  selectedHistoryProofId: string
): string {
  const nextSelectedHistoryProofId = normalize(selectedHistoryProofId);
  if (nextSelectedHistoryProofId) {
    const matchesSelection = recentProofs.some((proof) => proof.proofId === nextSelectedHistoryProofId);
    if (matchesSelection) {
      return nextSelectedHistoryProofId;
    }
  }

  return recentProofs[0]?.proofId || '';
}

export function resolveSelectedHistoryProof(
  recentProofs: RecentProofItem[],
  selectedHistoryProofId: string
): RecentProofItem | null {
  const proofId = resolveSelectedHistoryProofId(recentProofs, selectedHistoryProofId);
  return recentProofs.find((proof) => proof.proofId === proofId) ?? null;
}

export function resolveProofLookupId(selectedRecentProof: RecentProofItem | null, proofId: string): string {
  return normalize(selectedRecentProof?.proofId) || normalize(proofId);
}

export function resolveReplayLookup(
  selectedRecentProof: RecentProofItem | null,
  proofId: string,
  replayToken: string
): { proofId?: string; replayToken?: string } {
  const selectedProofId = normalize(selectedRecentProof?.proofId);
  const selectedReplayToken = normalize(selectedRecentProof?.replayToken);
  const nextProofId = selectedProofId || normalize(proofId);
  const nextReplayToken = selectedReplayToken || normalize(replayToken);

  return {
    proofId: nextProofId || undefined,
    replayToken: nextReplayToken || undefined
  };
}

export function shouldClearAdvancedSelectedProof(
  selectedRecentProof: RecentProofItem | null,
  selectedProof: ProofArtifactView | null
): boolean {
  return Boolean(selectedProof && selectedProof.proofId !== normalize(selectedRecentProof?.proofId));
}

export function shouldClearAdvancedReplayResult(
  selectedRecentProof: RecentProofItem | null,
  replayResult: ReplayResultView | null
): boolean {
  return Boolean(
    replayResult &&
      (
        replayResult.proofId !== normalize(selectedRecentProof?.proofId) ||
        replayResult.replayToken !== normalize(selectedRecentProof?.replayToken)
      )
  );
}

export function resolveProofExportName(
  selectedRecentProof: RecentProofItem | null,
  selectedProof: ProofArtifactView | null
): string {
  return sanitizeArtifactName(selectedRecentProof?.label || selectedProof?.query || selectedProof?.proofId);
}

export function resolveReplayExportName(
  selectedRecentProof: RecentProofItem | null,
  replayResult: ReplayResultView | null
): string {
  return sanitizeArtifactName(selectedRecentProof?.label || replayResult?.proofId || replayResult?.replayToken);
}
