'use client';

import { useState } from 'react';
import type { QueryResponse } from '../lib/ask-client';
import { runSecondaryQueryRequest, type SecondaryQueryKind } from '../lib/secondary-client';
import { resolveQueryErrorMessage } from './use-response-inspector';

type SecondaryQueryRunnerOptions = {
  presentResponse: (response: QueryResponse) => void;
  setCopied: (value: boolean) => void;
  setErrorText: (value: string) => void;
};

export function useSecondaryQueryRunner(options: SecondaryQueryRunnerOptions) {
  const [loading, setLoading] = useState(false);
  const [limitRaw, setLimitRaw] = useState('25');

  async function runQuery(
    kind: SecondaryQueryKind,
    payload: Record<string, unknown> = {}
  ): Promise<QueryResponse | null> {
    setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const parsed = await runSecondaryQueryRequest(kind, payload);

      options.presentResponse(parsed);

      if (parsed.ok === false) {
        options.setErrorText(resolveQueryErrorMessage(parsed));
      }
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected query failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText(
        'Request failed before API response. Confirm Orgumented desktop runtime is running, then retry.'
      );
      return null;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    limitRaw,
    setLimitRaw,
    runQuery,
    setLoading
  };
}
