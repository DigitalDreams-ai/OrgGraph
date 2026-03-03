'use client';

import { useMemo, useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import {
  connectOrgSession,
  disconnectOrgSession,
  getOrgSession,
  getOrgSessionHistory,
  getOrgStatus,
  listOrgSessionAliases,
  runOrgPreflight,
  switchOrgSession
} from '../../lib/org-client';
import type {
  OrgAliasSummary,
  OrgPreflightIssue,
  OrgPreflightPayload,
  OrgSessionAuditEntry,
  OrgSessionAliasesPayload,
  OrgSessionHistoryPayload,
  OrgSessionPayload,
  OrgStatusPayload
} from './types';

interface UseConnectWorkspaceOptions {
  presentResponse: (response: QueryResponse) => void;
  resolveErrorMessage: (response: QueryResponse) => string;
  setLoading: (loading: boolean) => void;
  setCopied: (copied: boolean) => void;
  setErrorText: (message: string) => void;
}

function readPayload<T>(response: QueryResponse): T | null {
  return response.payload ? (response.payload as T) : null;
}

export function useConnectWorkspace(options: UseConnectWorkspaceOptions) {
  const [orgAlias, setOrgAlias] = useState('orgumented-sandbox');
  const [orgSession, setOrgSession] = useState<OrgSessionPayload | null>(null);
  const [orgStatus, setOrgStatus] = useState<OrgStatusPayload | null>(null);
  const [orgPreflight, setOrgPreflight] = useState<OrgPreflightPayload | null>(null);
  const [orgAliases, setOrgAliases] = useState<OrgSessionAliasesPayload | null>(null);
  const [orgSessionHistory, setOrgSessionHistory] = useState<OrgSessionHistoryPayload | null>(null);

  const aliasInventory = orgAliases?.aliases ?? [];
  const activeAlias = orgSession?.activeAlias || orgStatus?.session?.activeAlias || orgStatus?.alias || orgAlias;
  const sessionStatus = orgSession?.status || orgStatus?.session?.status || 'unknown';
  const restoreAlias = orgSessionHistory?.restoreAlias || (sessionStatus === 'disconnected' ? activeAlias : '');
  const recentSessionEvents = orgSessionHistory?.entries ?? [];
  const selectedAlias = useMemo<OrgAliasSummary | null>(
    () => aliasInventory.find((entry) => entry.alias === orgAlias) ?? null,
    [aliasInventory, orgAlias]
  );
  const preflightIssues = orgPreflight?.issues ?? [];
  const toolingReady = Boolean(orgStatus?.sf?.installed) && Boolean(orgStatus?.cci?.installed);
  const browserSeeded = Boolean(orgPreflight?.checks?.parsePathPresent);
  const selectedAliasReady = Boolean(
    orgPreflight?.integrationEnabled &&
      orgPreflight?.checks?.aliasAuthenticated &&
      orgPreflight?.checks?.sfInstalled
  );

  async function runAction(
    action: () => Promise<QueryResponse>,
    onSuccess?: (response: QueryResponse) => Promise<void> | void
  ): Promise<QueryResponse | null> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const response = await action();
      options.presentResponse(response);
      if (response.ok === false) {
        options.setErrorText(options.resolveErrorMessage(response));
      } else if (onSuccess) {
        await onSuccess(response);
      }
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected org request failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Org request failed. Check API readiness and local runtime health.');
      return null;
    } finally {
      options.setLoading(false);
    }
  }

  async function syncOverview(alias = orgAlias, present = false): Promise<QueryResponse> {
    const [statusResponse, sessionResponse, aliasesResponse, preflightResponse, historyResponse] = await Promise.all([
      getOrgStatus(),
      getOrgSession(),
      listOrgSessionAliases(),
      runOrgPreflight(alias),
      getOrgSessionHistory()
    ]);

    const statusPayload = readPayload<OrgStatusPayload>(statusResponse);
    const sessionPayload = readPayload<OrgSessionPayload>(sessionResponse);
    const aliasesPayload = readPayload<OrgSessionAliasesPayload>(aliasesResponse);
    const preflightPayload = readPayload<OrgPreflightPayload>(preflightResponse);
    const historyPayload = readPayload<OrgSessionHistoryPayload>(historyResponse);

    if (historyPayload) {
      setOrgSessionHistory(historyPayload);
    }

    if (statusPayload) {
      setOrgStatus(statusPayload);
    }
    if (sessionPayload) {
      setOrgSession(sessionPayload);
    }
    if (aliasesPayload) {
      setOrgAliases(aliasesPayload);
    }
    if (preflightPayload) {
      setOrgPreflight(preflightPayload);
    }

    const failedResponse = [statusResponse, sessionResponse, aliasesResponse, preflightResponse, historyResponse].find(
      (response) => response.ok === false
    );

    const overviewResponse: QueryResponse = {
      ok: !failedResponse,
      statusCode: failedResponse?.statusCode ?? 200,
      payload: {
        status: statusPayload,
        session: sessionPayload,
        aliases: aliasesPayload,
        preflight: preflightPayload,
        history: historyPayload
      },
      error: failedResponse?.error
    };

    if (present) {
      options.presentResponse(overviewResponse);
    }
    if (failedResponse) {
      options.setErrorText(options.resolveErrorMessage(failedResponse));
    }

    return overviewResponse;
  }

  function loadAliases(): Promise<QueryResponse | null> {
    return runAction(() => listOrgSessionAliases(), (response) => {
      const payload = readPayload<OrgSessionAliasesPayload>(response);
      if (payload) {
        setOrgAliases(payload);
      }
    });
  }

  function checkSession(): Promise<QueryResponse | null> {
    return runAction(() => getOrgSession(), (response) => {
      const payload = readPayload<OrgSessionPayload>(response);
      if (payload) {
        setOrgSession(payload);
      }
    });
  }

  function loadSessionHistory(): Promise<QueryResponse | null> {
    return runAction(() => getOrgSessionHistory(), (response) => {
      const payload = readPayload<OrgSessionHistoryPayload>(response);
      if (payload) {
        setOrgSessionHistory(payload);
      }
    });
  }

  function loadToolStatus(): Promise<QueryResponse | null> {
    return runAction(() => getOrgStatus(), (response) => {
      const payload = readPayload<OrgStatusPayload>(response);
      if (payload) {
        setOrgStatus(payload);
      }
    });
  }

  function runPreflight(alias = orgAlias): Promise<QueryResponse | null> {
    return runAction(() => runOrgPreflight(alias), (response) => {
      const payload = readPayload<OrgPreflightPayload>(response);
      if (payload) {
        setOrgPreflight(payload);
        setOrgAlias(alias);
      }
    });
  }

  function refreshOverview(alias = orgAlias): Promise<QueryResponse | null> {
    return runAction(() => syncOverview(alias, true), () => {
      setOrgAlias(alias);
    });
  }

  function connectExistingAlias(alias = orgAlias): Promise<QueryResponse | null> {
    return runAction(() => connectOrgSession({ alias }), async (response) => {
      const payload = readPayload<OrgSessionPayload>(response);
      if (payload) {
        setOrgSession(payload);
      }
      setOrgAlias(alias);
      await syncOverview(alias, false);
    });
  }

  function switchAlias(alias = orgAlias): Promise<QueryResponse | null> {
    return runAction(() => switchOrgSession({ alias }), async (response) => {
      const payload = readPayload<OrgSessionPayload>(response);
      if (payload) {
        setOrgSession(payload);
      }
      setOrgAlias(alias);
      await syncOverview(alias, false);
    });
  }

  function disconnect(): Promise<QueryResponse | null> {
    return runAction(() => disconnectOrgSession(), async (response) => {
      const payload = readPayload<OrgSessionPayload>(response);
      if (payload) {
        setOrgSession(payload);
      }
      await syncOverview(orgAlias, false);
    });
  }

  function restoreLastSession(): Promise<QueryResponse | null> {
    const alias = restoreAlias?.trim();
    if (!alias) {
      const fallback: QueryResponse = { ok: false, error: { message: 'No restorable alias available.' } };
      options.presentResponse(fallback);
      options.setErrorText('No restorable alias is available in recent session history.');
      return Promise.resolve(fallback);
    }
    return connectExistingAlias(alias);
  }

  function selectAlias(alias: string): void {
    setOrgAlias(alias);
  }

  async function inspectAlias(alias: string): Promise<void> {
    setOrgAlias(alias);
    await refreshOverview(alias);
  }

  return {
    orgAlias,
    setOrgAlias,
    orgSession,
    orgStatus,
    orgPreflight,
    orgAliases,
    orgSessionHistory,
    activeAlias,
    sessionStatus,
    restoreAlias,
    aliasInventory,
    recentSessionEvents: recentSessionEvents as OrgSessionAuditEntry[],
    selectedAlias,
    preflightIssues: preflightIssues as OrgPreflightIssue[],
    toolingReady,
    browserSeeded,
    selectedAliasReady,
    loadAliases,
    checkSession,
    loadSessionHistory,
    loadToolStatus,
    runPreflight,
    refreshOverview,
    connectExistingAlias,
    switchAlias,
    disconnect,
    restoreLastSession,
    selectAlias,
    inspectAlias
  };
}
