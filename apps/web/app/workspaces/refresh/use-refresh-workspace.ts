'use client';

import { useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import { runOrgRetrieve } from '../../lib/org-client';
import { getRefreshDiff, runRefresh } from '../../lib/refresh-client';

interface UseRefreshWorkspaceOptions {
  orgAlias: string;
  presentResponse: (response: QueryResponse) => void;
  resolveErrorMessage: (response: QueryResponse) => string;
  setLoading: (loading: boolean) => void;
  setCopied: (copied: boolean) => void;
  setErrorText: (message: string) => void;
}

export function useRefreshWorkspace(options: UseRefreshWorkspaceOptions) {
  const [refreshMode, setRefreshMode] = useState<'incremental' | 'full'>('incremental');
  const [fromSnapshot, setFromSnapshot] = useState('');
  const [toSnapshot, setToSnapshot] = useState('');
  const [orgRunAuth, setOrgRunAuth] = useState(true);
  const [orgRunRetrieve, setOrgRunRetrieve] = useState(true);
  const [orgAutoRefresh, setOrgAutoRefresh] = useState(true);

  async function runRefreshNow(): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await runRefresh({ mode: refreshMode });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected refresh query failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Refresh request failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
  }

  async function runDiff(): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await getRefreshDiff(fromSnapshot, toSnapshot);
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected refresh diff failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Refresh diff request failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
  }

  async function runOrgRetrieveNow(): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await runOrgRetrieve({
        alias: options.orgAlias,
        runAuth: orgRunAuth,
        runRetrieve: orgRunRetrieve,
        autoRefresh: orgAutoRefresh
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected org retrieve failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Org retrieve request failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
  }

  return {
    refreshMode,
    setRefreshMode,
    fromSnapshot,
    setFromSnapshot,
    toSnapshot,
    setToSnapshot,
    orgRunAuth,
    setOrgRunAuth,
    orgRunRetrieve,
    setOrgRunRetrieve,
    orgAutoRefresh,
    setOrgAutoRefresh,
    runRefreshNow,
    runDiff,
    runOrgRetrieveNow
  };
}
