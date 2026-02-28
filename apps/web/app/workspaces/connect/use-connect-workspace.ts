'use client';

import { useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import {
  connectOrgSession,
  disconnectOrgSession,
  getOrgSession,
  getOrgStatus,
  listOrgSessionAliases,
  runOrgPreflight,
  switchOrgSession
} from '../../lib/org-client';
import type {
  OrgPreflightPayload,
  OrgSessionAliasesPayload,
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

export function useConnectWorkspace(options: UseConnectWorkspaceOptions) {
  const [orgAlias, setOrgAlias] = useState('orgumented-sandbox');
  const [orgSession, setOrgSession] = useState<OrgSessionPayload | null>(null);
  const [orgStatus, setOrgStatus] = useState<OrgStatusPayload | null>(null);
  const [orgPreflight, setOrgPreflight] = useState<OrgPreflightPayload | null>(null);
  const [orgAliases, setOrgAliases] = useState<OrgSessionAliasesPayload | null>(null);

  const activeAlias = orgSession?.activeAlias || orgStatus?.session?.activeAlias || orgStatus?.alias || orgAlias;
  const sessionStatus = orgSession?.status || orgStatus?.session?.status || 'unknown';

  async function runAction(action: () => Promise<QueryResponse>, onSuccess?: (response: QueryResponse) => void): Promise<QueryResponse | null> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const response = await action();
      options.presentResponse(response);
      if (response.ok === false) {
        options.setErrorText(options.resolveErrorMessage(response));
      } else if (onSuccess) {
        onSuccess(response);
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

  function loadAliases(): Promise<QueryResponse | null> {
    return runAction(
      () => listOrgSessionAliases(),
      (response) => {
        if (response.payload) {
          setOrgAliases(response.payload as OrgSessionAliasesPayload);
        }
      }
    );
  }

  function checkSession(): Promise<QueryResponse | null> {
    return runAction(
      () => getOrgSession(),
      (response) => {
        if (response.payload) {
          setOrgSession(response.payload as OrgSessionPayload);
        }
      }
    );
  }

  function loadToolStatus(): Promise<QueryResponse | null> {
    return runAction(
      () => getOrgStatus(),
      (response) => {
        if (response.payload) {
          setOrgStatus(response.payload as OrgStatusPayload);
        }
      }
    );
  }

  function runPreflight(alias = orgAlias): Promise<QueryResponse | null> {
    return runAction(
      () => runOrgPreflight(alias),
      (response) => {
        if (response.payload) {
          setOrgPreflight(response.payload as OrgPreflightPayload);
        }
      }
    );
  }

  function connectExistingAlias(alias = orgAlias): Promise<QueryResponse | null> {
    return runAction(() => connectOrgSession({ alias }));
  }

  function switchAlias(alias = orgAlias): Promise<QueryResponse | null> {
    return runAction(
      () => switchOrgSession({ alias }),
      (response) => {
        if (response.payload) {
          setOrgSession(response.payload as OrgSessionPayload);
        }
      }
    );
  }

  function disconnect(): Promise<QueryResponse | null> {
    return runAction(
      () => disconnectOrgSession(),
      (response) => {
        if (response.payload) {
          setOrgSession(response.payload as OrgSessionPayload);
        }
      }
    );
  }

  async function inspectAlias(alias: string): Promise<void> {
    setOrgAlias(alias);
    await runPreflight(alias);
  }

  return {
    orgAlias,
    setOrgAlias,
    orgSession,
    orgStatus,
    orgPreflight,
    orgAliases,
    activeAlias,
    sessionStatus,
    loadAliases,
    checkSession,
    loadToolStatus,
    runPreflight,
    connectExistingAlias,
    switchAlias,
    disconnect,
    inspectAlias
  };
}
