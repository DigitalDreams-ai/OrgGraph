'use client';

import type { RecentProofItem } from './types';

function normalize(value: string | undefined): string {
  return value?.trim() || '';
}

export function resolveSelectedHistoryProofId(
  recentProofs: RecentProofItem[],
  selectedHistoryProofId: string,
  fallbackProofId?: string
): string {
  const nextSelectedHistoryProofId = normalize(selectedHistoryProofId);
  if (nextSelectedHistoryProofId) {
    const matchesSelection = recentProofs.some((proof) => proof.proofId === nextSelectedHistoryProofId);
    if (matchesSelection) {
      return nextSelectedHistoryProofId;
    }
  }

  const nextFallbackProofId = normalize(fallbackProofId);
  if (nextFallbackProofId) {
    const matchesFallback = recentProofs.some((proof) => proof.proofId === nextFallbackProofId);
    if (matchesFallback) {
      return nextFallbackProofId;
    }
  }

  return recentProofs[0]?.proofId || '';
}

export function resolveSelectedHistoryProof(
  recentProofs: RecentProofItem[],
  selectedHistoryProofId: string,
  fallbackProofId?: string
): RecentProofItem | null {
  const proofId = resolveSelectedHistoryProofId(recentProofs, selectedHistoryProofId, fallbackProofId);
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
