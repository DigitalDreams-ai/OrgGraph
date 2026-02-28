'use client';

import { useState } from 'react';
import {
  exportAskMetrics,
  getAskProof,
  listAskProofsRecent,
  replayAskProof,
  type QueryResponse
} from '../../lib/ask-client';

interface UseProofsWorkspaceOptions {
  presentResponse: (response: QueryResponse) => void;
  resolveErrorMessage: (response: QueryResponse) => string;
  setLoading: (loading: boolean) => void;
  setCopied: (copied: boolean) => void;
  setErrorText: (message: string) => void;
}

export function useProofsWorkspace(options: UseProofsWorkspaceOptions) {
  const [proofId, setProofId] = useState('');
  const [replayToken, setReplayToken] = useState('');

  function syncFromAsk(nextProofId?: string, nextReplayToken?: string): void {
    if (nextProofId) {
      setProofId(nextProofId);
    }
    if (nextReplayToken) {
      setReplayToken(nextReplayToken);
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
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected recent proofs failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Proof history request failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
  }

  async function runProofLookup(): Promise<void> {
    if (!proofId.trim()) return;

    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await getAskProof(proofId.trim());
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected proof lookup failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Proof lookup failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
  }

  async function runReplay(): Promise<void> {
    if (!proofId.trim() && !replayToken.trim()) return;

    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await replayAskProof({
        replayToken: replayToken.trim() || undefined,
        proofId: proofId.trim() || undefined
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected replay failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Replay failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
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
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected metrics export failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Metrics export failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
  }

  return {
    proofId,
    setProofId,
    replayToken,
    setReplayToken,
    syncFromAsk,
    runProofsRecent,
    runProofLookup,
    runReplay,
    runMetricsExport
  };
}
