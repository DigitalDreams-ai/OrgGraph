'use client';

import { useState } from 'react';
import {
  exportAskMetrics,
  getAskProof,
  listAskProofsRecent,
  replayAskProof,
  type QueryResponse
} from '../../lib/ask-client';
import {
  resolveProofLookupId,
  resolveProofExportName,
  resolveReplayLookup,
  resolveReplayExportName,
  resolveSelectedHistoryProof,
  resolveSelectedHistoryProofId,
  shouldClearAdvancedReplayResult,
  shouldClearAdvancedSelectedProof
} from './history-selection';
import type {
  MetricsExportView,
  ProofArtifactView,
  RecentProofItem,
  ReplayResultView
} from './types';

interface UseProofsWorkspaceOptions {
  presentResponse: (response: QueryResponse) => void;
  resolveErrorMessage: (response: QueryResponse) => string;
  setLoading: (loading: boolean) => void;
  setCopied: (copied: boolean) => void;
  setErrorText: (message: string) => void;
}

function payloadAsRecord(response: QueryResponse): Record<string, unknown> | null {
  if (!response.payload || typeof response.payload !== 'object' || Array.isArray(response.payload)) {
    return null;
  }
  return response.payload as Record<string, unknown>;
}

function parseRecentProofs(response: QueryResponse): RecentProofItem[] {
  const payload = payloadAsRecord(response);
  const proofs = Array.isArray(payload?.proofs) ? payload.proofs : [];

  return proofs
    .map((proof) => {
      if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
        return null;
      }

      const item = proof as Record<string, unknown>;
      const proofId = String(item.proofId ?? '');
      const replayToken = String(item.replayToken ?? '');
      const generatedAt = String(item.generatedAt ?? '');
      const snapshotId = String(item.snapshotId ?? '');
      const trustLevel = String(item.trustLevel ?? 'unknown');
      const query = String(item.query ?? '');
      const label = query || `Proof ${proofId.slice(0, 12) || 'unknown'}`;
      const subtitleParts = [`Trust ${trustLevel}`, snapshotId || 'snapshot n/a', generatedAt || 'generated n/a'];

      return {
        proofId,
        replayToken,
        generatedAt,
        snapshotId,
        trustLevel,
        query,
        label,
        subtitle: subtitleParts.join(' • ')
      };
    })
    .filter((proof): proof is RecentProofItem => Boolean(proof?.proofId));
}

function parseProofArtifact(response: QueryResponse): ProofArtifactView | null {
  const payload = payloadAsRecord(response);
  const proof = payload?.proof;
  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    return null;
  }

  const artifact = proof as Record<string, unknown>;
  const responseSummary =
    artifact.responseSummary && typeof artifact.responseSummary === 'object' && !Array.isArray(artifact.responseSummary)
      ? (artifact.responseSummary as Record<string, unknown>)
      : {};
  const request =
    artifact.request && typeof artifact.request === 'object' && !Array.isArray(artifact.request)
      ? (artifact.request as Record<string, unknown>)
      : {};

  return {
    proofId: String(artifact.proofId ?? ''),
    replayToken: String(artifact.replayToken ?? ''),
    generatedAt: String(artifact.generatedAt ?? ''),
    snapshotId: String(artifact.snapshotId ?? ''),
    policyId: String(artifact.policyId ?? ''),
    traceLevel: String(artifact.traceLevel ?? ''),
    query: String(request.query ?? ''),
    trustLevel: String(artifact.trustLevel ?? 'unknown'),
    deterministicAnswer: String(responseSummary.deterministicAnswer ?? ''),
    confidence: typeof responseSummary.confidence === 'number' ? responseSummary.confidence : null,
    operatorsExecuted: Array.isArray(artifact.operatorsExecuted)
      ? artifact.operatorsExecuted.map((item) => String(item))
      : [],
    rejectedBranches: Array.isArray(artifact.rejectedBranches)
      ? artifact.rejectedBranches
          .map((branch) => {
            if (!branch || typeof branch !== 'object' || Array.isArray(branch)) {
              return '';
            }
            return String((branch as Record<string, unknown>).reasonCode ?? '');
          })
          .filter(Boolean)
      : [],
    citationCount: Array.isArray(artifact.citationIds) ? artifact.citationIds.length : 0,
    derivationEdgeCount: Array.isArray(artifact.derivationEdges) ? artifact.derivationEdges.length : 0
  };
}

function parseReplayResult(response: QueryResponse): ReplayResultView | null {
  const payload = payloadAsRecord(response);
  if (!payload) {
    return null;
  }

  const original =
    payload.original && typeof payload.original === 'object' && !Array.isArray(payload.original)
      ? (payload.original as Record<string, unknown>)
      : {};
  const replayed =
    payload.replayed && typeof payload.replayed === 'object' && !Array.isArray(payload.replayed)
      ? (payload.replayed as Record<string, unknown>)
      : {};

  return {
    proofId: String(payload.proofId ?? ''),
    replayToken: String(payload.replayToken ?? ''),
    snapshotId: String(payload.snapshotId ?? ''),
    policyId: String(payload.policyId ?? ''),
    matched: payload.matched === true,
    corePayloadMatched: payload.corePayloadMatched === true,
    metricsMatched: payload.metricsMatched === true,
    original: {
      deterministicAnswer: String(original.deterministicAnswer ?? ''),
      trustLevel: String(original.trustLevel ?? 'unknown'),
      confidence: typeof original.confidence === 'number' ? original.confidence : null
    },
    replayed: {
      deterministicAnswer: String(replayed.deterministicAnswer ?? ''),
      trustLevel: String(replayed.trustLevel ?? 'unknown'),
      confidence: typeof replayed.confidence === 'number' ? replayed.confidence : null
    }
  };
}

function parseMetricsExport(response: QueryResponse): MetricsExportView | null {
  const payload = payloadAsRecord(response);
  if (!payload) {
    return null;
  }

  return {
    totalRecords: Number(payload.totalRecords ?? 0),
    bySnapshot: Array.isArray(payload.bySnapshot)
      ? payload.bySnapshot.map((item) => {
          const snapshot = item as Record<string, unknown>;
          return {
            snapshotId: String(snapshot.snapshotId ?? ''),
            count: Number(snapshot.count ?? 0),
            trusted: Number(snapshot.trusted ?? 0),
            conditional: Number(snapshot.conditional ?? 0),
            refused: Number(snapshot.refused ?? 0),
            latestRecordedAt: String(snapshot.latestRecordedAt ?? '')
          };
        })
      : [],
    byProvider: Array.isArray(payload.byProvider)
      ? payload.byProvider.map((item) => {
          const provider = item as Record<string, unknown>;
          return {
            provider: String(provider.provider ?? 'unknown'),
            model: provider.model ? String(provider.model) : undefined,
            count: Number(provider.count ?? 0),
            successCount: Number(provider.successCount ?? 0),
            errorCount: Number(provider.errorCount ?? 0),
            errorRate: Number(provider.errorRate ?? 0)
          };
        })
      : []
  };
}

function downloadJsonArtifact(fileName: string, payload: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Browser download APIs are unavailable in this runtime.');
  }
  const serialized = `${JSON.stringify(payload, null, 2)}\n`;
  const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

export function useProofsWorkspace(options: UseProofsWorkspaceOptions) {
  const [advancedProofId, setAdvancedProofId] = useState('');
  const [advancedReplayToken, setAdvancedReplayToken] = useState('');
  const [selectedHistoryProofId, setSelectedHistoryProofId] = useState('');
  const [recentProofs, setRecentProofs] = useState<RecentProofItem[]>([]);
  const [selectedProof, setSelectedProof] = useState<ProofArtifactView | null>(null);
  const [replayResult, setReplayResult] = useState<ReplayResultView | null>(null);
  const [metricsExport, setMetricsExport] = useState<MetricsExportView | null>(null);

  const selectedRecentProof = resolveSelectedHistoryProof(recentProofs, selectedHistoryProofId);

  function reportSelectionRequired(message: string): void {
    const fallback: QueryResponse = { ok: false, error: { message } };
    options.presentResponse(fallback);
    options.setErrorText(message);
  }

  function useRecentProof(proof: RecentProofItem): void {
    setSelectedHistoryProofId(proof.proofId);
  }

  function selectRecentProof(proof: RecentProofItem): void {
    useRecentProof(proof);
  }

  async function openRecentProof(proof: RecentProofItem): Promise<void> {
    selectRecentProof(proof);
    await runProofLookupById(proof.proofId);
  }

  async function replayRecentProof(proof: RecentProofItem): Promise<void> {
    selectRecentProof(proof);
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await replayAskProof({
        replayToken: proof.replayToken,
        proofId: proof.proofId
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        setReplayResult(null);
      } else {
        setReplayResult(parseReplayResult(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected replay failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Replay failed. Check API readiness and local runtime health.');
      setReplayResult(null);
    } finally {
      options.setLoading(false);
    }
  }

  function syncFromAsk(nextProofId?: string, nextReplayToken?: string): void {
    if (nextProofId) {
      setSelectedHistoryProofId(nextProofId);
    }
    if (nextProofId || nextReplayToken) {
      setAdvancedProofId('');
      setAdvancedReplayToken('');
    }
  }

  async function runProofsRecent(limit: number): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await listAskProofsRecent(limit);
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        setRecentProofs([]);
      } else {
        const nextRecentProofs = parseRecentProofs(result);
        setRecentProofs(nextRecentProofs);

        if (nextRecentProofs.length === 0) {
          setSelectedHistoryProofId('');
          return;
        }

        const nextSelectedId = resolveSelectedHistoryProofId(nextRecentProofs, selectedHistoryProofId);
        const fallbackSelection = nextRecentProofs.find((item) => item.proofId === nextSelectedId) ?? nextRecentProofs[0];
        if (fallbackSelection) {
          setSelectedHistoryProofId(fallbackSelection.proofId);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected recent proofs failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Proof history request failed. Check API readiness and local runtime health.');
      setRecentProofs([]);
    } finally {
      options.setLoading(false);
    }
  }

  async function runProofLookupById(nextProofId: string, syncAdvancedTokens = false): Promise<void> {
    if (!nextProofId.trim()) {
      reportSelectionRequired('Select a history label first, or provide a proof ID in Advanced token lookup.');
      return;
    }
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await getAskProof(nextProofId.trim());
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        setSelectedProof(null);
      } else {
        const nextProof = parseProofArtifact(result);
        setSelectedProof(nextProof);
        if (nextProof && syncAdvancedTokens) {
          setAdvancedProofId(nextProof.proofId);
          setAdvancedReplayToken(nextProof.replayToken);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected proof lookup failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Proof lookup failed. Check API readiness and local runtime health.');
      setSelectedProof(null);
    } finally {
      options.setLoading(false);
    }
  }

  async function runProofLookup(): Promise<void> {
    if (!selectedRecentProof?.proofId) {
      reportSelectionRequired('Select a history label first before opening proof from the primary workflow.');
      return;
    }
    await runProofLookupById(selectedRecentProof.proofId);
  }

  async function runReplay(): Promise<void> {
    if (!selectedRecentProof?.proofId || !selectedRecentProof.replayToken) {
      reportSelectionRequired('Select a history label first before replaying from the primary workflow.');
      return;
    }

    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await replayAskProof({
        replayToken: selectedRecentProof.replayToken,
        proofId: selectedRecentProof.proofId
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        setReplayResult(null);
      } else {
        setReplayResult(parseReplayResult(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected replay failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Replay failed. Check API readiness and local runtime health.');
      setReplayResult(null);
    } finally {
      options.setLoading(false);
    }
  }

  async function runAdvancedProofLookup(): Promise<void> {
    const lookupId = resolveProofLookupId(null, advancedProofId);
    if (!lookupId) {
      reportSelectionRequired('Provide a proof ID in Advanced token lookup before opening by token.');
      return;
    }
    await runProofLookupById(lookupId, true);
  }

  async function runAdvancedReplay(): Promise<void> {
    const lookup = resolveReplayLookup(null, advancedProofId, advancedReplayToken);

    if (!lookup.proofId && !lookup.replayToken) {
      reportSelectionRequired('Provide a proof ID or replay token in Advanced token lookup before replaying by token.');
      return;
    }

    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await replayAskProof({
        replayToken: lookup.replayToken,
        proofId: lookup.proofId
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        setReplayResult(null);
      } else {
        setReplayResult(parseReplayResult(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected replay failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Replay failed. Check API readiness and local runtime health.');
      setReplayResult(null);
    } finally {
      options.setLoading(false);
    }
  }

  async function exportProofArtifactFor(
    proof: RecentProofItem,
    selectionMode: 'selected' | 'row'
  ): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      let artifact = selectedProof;
      if (!artifact || artifact.proofId !== proof.proofId) {
        const result = await getAskProof(proof.proofId);
        options.presentResponse(result);
        if (result.ok === false) {
          options.setErrorText(options.resolveErrorMessage(result));
          return;
        }
        artifact = parseProofArtifact(result);
        setSelectedProof(artifact);
      }

      if (!artifact) {
        options.setErrorText(
          selectionMode === 'row'
            ? 'Proof export failed. The selected history row did not resolve to a proof artifact.'
            : 'Proof export failed. The selected history label did not resolve to a proof artifact.'
        );
        return;
      }

      const name = resolveProofExportName(proof, artifact);
      downloadJsonArtifact(`orgumented-proof-${name}.json`, artifact as unknown as Record<string, unknown>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected proof export failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Proof export failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
  }

  async function exportSelectedProofArtifact(): Promise<void> {
    if (!selectedRecentProof?.proofId) {
      reportSelectionRequired('Select a history label first before exporting proof from the primary workflow.');
      return;
    }
    await exportProofArtifactFor(selectedRecentProof, 'selected');
  }

  async function exportRecentProofArtifact(proof: RecentProofItem): Promise<void> {
    useRecentProof(proof);
    await exportProofArtifactFor(proof, 'row');
  }

  async function exportReplayArtifactFor(
    proof: RecentProofItem,
    selectionMode: 'selected' | 'row'
  ): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      let artifact = replayResult;
      if (!artifact || artifact.proofId !== proof.proofId || artifact.replayToken !== proof.replayToken) {
        const result = await replayAskProof({
          replayToken: proof.replayToken,
          proofId: proof.proofId
        });
        options.presentResponse(result);
        if (result.ok === false) {
          options.setErrorText(options.resolveErrorMessage(result));
          return;
        }
        artifact = parseReplayResult(result);
        setReplayResult(artifact);
      }

      if (!artifact) {
        options.setErrorText(
          selectionMode === 'row'
            ? 'Replay export failed. The selected history row did not resolve to replay parity output.'
            : 'Replay export failed. The selected history label did not resolve to replay parity output.'
        );
        return;
      }

      const name = resolveReplayExportName(proof, artifact);
      downloadJsonArtifact(`orgumented-replay-${name}.json`, artifact as unknown as Record<string, unknown>);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected replay export failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Replay export failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
  }

  async function exportRecentReplayArtifact(proof: RecentProofItem): Promise<void> {
    useRecentProof(proof);
    if (!proof.proofId || !proof.replayToken) {
      reportSelectionRequired('The selected history row does not include replay parity output.');
      return;
    }
    await exportReplayArtifactFor(proof, 'row');
  }

  async function exportSelectedReplayArtifact(): Promise<void> {
    if (!selectedRecentProof?.proofId || !selectedRecentProof.replayToken) {
      reportSelectionRequired('Select a history label first before exporting replay from the primary workflow.');
      return;
    }
    await exportReplayArtifactFor(selectedRecentProof, 'selected');
  }

  async function runMetricsExport(): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await exportAskMetrics();
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        setMetricsExport(null);
      } else {
        setMetricsExport(parseMetricsExport(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected metrics export failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Metrics export failed. Check API readiness and local runtime health.');
      setMetricsExport(null);
    } finally {
      options.setLoading(false);
    }
  }

  function clearAdvancedTokens(): void {
    setAdvancedProofId('');
    setAdvancedReplayToken('');

    if (shouldClearAdvancedSelectedProof(selectedRecentProof, selectedProof)) {
      setSelectedProof(null);
    }

    if (shouldClearAdvancedReplayResult(selectedRecentProof, replayResult)) {
      setReplayResult(null);
    }
  }

  return {
    proofId: advancedProofId,
    setProofId: setAdvancedProofId,
    replayToken: advancedReplayToken,
    setReplayToken: setAdvancedReplayToken,
    selectedHistoryProofId,
    recentProofs,
    selectedRecentProof,
    selectedProof,
    replayResult,
    metricsExport,
    useRecentProof,
    selectRecentProof,
    openRecentProof,
    replayRecentProof,
    syncFromAsk,
    runProofsRecent,
    runProofLookup,
    runAdvancedProofLookup,
    runReplay,
    runAdvancedReplay,
    runMetricsExport,
    exportSelectedProofArtifact,
    exportSelectedReplayArtifact,
    exportRecentProofArtifact,
    exportRecentReplayArtifact,
    clearAdvancedTokens
  };
}
