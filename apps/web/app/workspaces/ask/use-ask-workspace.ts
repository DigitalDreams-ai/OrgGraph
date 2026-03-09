'use client';

import { useState } from 'react';
import { runAskRequest, type QueryResponse } from '../../lib/ask-client';
import type { AskPayload } from './types';
import type { MetadataRetrieveResultView, MetadataSelection } from '../browser/types';

interface UseAskWorkspaceOptions {
  latestRetrieve: MetadataRetrieveResultView | null;
  latestRetrieveSelections: MetadataSelection[];
  presentResponse: (response: QueryResponse) => void;
  resolveErrorMessage: (response: QueryResponse) => string;
  setLoading: (loading: boolean) => void;
  setCopied: (copied: boolean) => void;
  setErrorText: (message: string) => void;
}

interface RunAskRequestOptions {
  query: string;
  maxCitations: number;
  consistencyCheck: boolean;
  includeLowConfidence: boolean;
  evidenceScope?: {
    kind: 'latest_retrieve';
    alias?: string;
    parsePath: string;
    metadataArgs: string[];
    selections?: MetadataSelection[];
  };
}

function buildEvidenceScope(
  latestRetrieve: MetadataRetrieveResultView | null,
  latestRetrieveSelections: MetadataSelection[]
): RunAskRequestOptions['evidenceScope'] | undefined {
  if (!latestRetrieve || !latestRetrieve.parsePath.trim()) {
    return undefined;
  }

  return {
    kind: 'latest_retrieve',
    alias: latestRetrieve.alias || undefined,
    parsePath: latestRetrieve.parsePath,
    metadataArgs: latestRetrieve.metadataArgs,
    selections: latestRetrieveSelections.map((selection) => ({
      type: selection.type,
      members: Array.isArray(selection.members) ? [...selection.members] : undefined
    }))
  };
}

export function useAskWorkspace(options: UseAskWorkspaceOptions) {
  const [askQuery, setAskQuery] = useState('What touches Opportunity.StageName?');
  const [maxCitationsRaw, setMaxCitationsRaw] = useState('5');
  const [consistencyCheck, setConsistencyCheck] = useState(true);
  const [includeLowConfidence, setIncludeLowConfidence] = useState(false);
  const [askElaboration, setAskElaboration] = useState('');
  const [askResult, setAskResult] = useState<AskPayload | null>(null);

  const askSummary =
    askResult?.decisionPacket?.summary ||
    askResult?.answer ||
    askResult?.deterministicAnswer ||
    'Run Ask to generate a decision packet.';
  const askTrust = askResult?.trustLevel || 'waiting';
  const askProofId = askResult?.proof?.proofId || '';
  const askReplayToken = askResult?.proof?.replayToken || '';
  const askCitations = askResult?.citations || [];

  async function executeAskRequest(
    payload: RunAskRequestOptions,
    onSuccess?: (result: AskPayload) => void,
    fallbackError = 'Ask failed before API response. Confirm Orgumented desktop runtime is running, then retry.'
  ): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await runAskRequest(payload);
      options.presentResponse(result);

      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        return;
      }

      const parsed = result.payload as AskPayload | undefined;
      if (!parsed) {
        return;
      }

      setAskResult(parsed);
      onSuccess?.(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected ask failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText(fallbackError);
    } finally {
      options.setLoading(false);
    }
  }

  async function runAsk(maxCitations: number): Promise<void> {
    await executeAskRequest(
      {
        query: askQuery,
        maxCitations,
        consistencyCheck,
        includeLowConfidence,
        evidenceScope: buildEvidenceScope(options.latestRetrieve, options.latestRetrieveSelections)
      },
      () => {
        setAskElaboration('');
      }
    );
  }

  async function runAskElaboration(maxCitations: number): Promise<void> {
    if (!askQuery.trim()) return;

    await executeAskRequest(
      {
        query: `Provide a concise operator explanation for: ${askQuery}`,
        maxCitations,
        consistencyCheck,
        includeLowConfidence,
        evidenceScope: buildEvidenceScope(options.latestRetrieve, options.latestRetrieveSelections)
      },
      (parsed) => {
        setAskElaboration(parsed.answer || parsed.deterministicAnswer || 'No elaboration returned.');
      },
      'Ask elaboration failed before API response. Confirm Orgumented desktop runtime is running, then retry.'
    );
  }

  return {
    askQuery,
    setAskQuery,
    maxCitationsRaw,
    setMaxCitationsRaw,
    consistencyCheck,
    setConsistencyCheck,
    includeLowConfidence,
    setIncludeLowConfidence,
    askElaboration,
    askResult,
    askSummary,
    askTrust,
    askProofId,
    askReplayToken,
    askCitations,
    runAsk,
    runAskElaboration
  };
}
