'use client';

import { useMemo, useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import {
  createGithubRepo,
  getGithubPullRequestFiles,
  getGithubRepoContext,
  getGithubSessionStatus,
  listGithubRepos,
  loginGithubSession,
  selectGithubRepo
} from '../../lib/github-client';
import {
  bridgeOrgSessionAlias,
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
  GithubRepoListPayload,
  GithubRepoContextPayload,
  GithubRepoSummary,
  GithubPullRequestFileScopePayload,
  GithubSessionIssue,
  GithubSessionPayload,
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

function textIncludesRuntimeUnavailable(value: string): boolean {
  const lowered = value.toLowerCase();
  return (
    lowered.includes('runtime unavailable') ||
    lowered.includes('runtime not grounded') ||
    lowered.includes('runtime bootstrap failed') ||
    lowered.includes('api unavailable') ||
    lowered.includes('failed to fetch') ||
    lowered.includes('networkerror') ||
    lowered.includes('econnrefused')
  );
}

function responseIndicatesRuntimeUnavailable(response: QueryResponse): boolean {
  if (response.ok) {
    return false;
  }

  const errorMessage = response.error?.message;
  if (typeof errorMessage === 'string' && textIncludesRuntimeUnavailable(errorMessage)) {
    return true;
  }

  const payload = response.payload;
  const payloadMessage =
    payload && typeof payload === 'object' && typeof (payload as { message?: unknown }).message === 'string'
      ? ((payload as { message: string }).message)
      : '';

  if (payloadMessage.length > 0 && textIncludesRuntimeUnavailable(payloadMessage)) {
    return true;
  }

  if (response.statusCode === 503) {
    const combined = `${errorMessage ?? ''} ${payloadMessage}`.trim();
    return combined.length > 0 && textIncludesRuntimeUnavailable(combined);
  }

  return false;
}

export function useConnectWorkspace(options: UseConnectWorkspaceOptions) {
  const [orgAlias, setOrgAlias] = useState('orgumented-sandbox');
  const [githubRepoOwner, setGithubRepoOwner] = useState('');
  const [githubRepoName, setGithubRepoName] = useState('');
  const [githubRepoDescription, setGithubRepoDescription] = useState('');
  const [githubRepoPrivate, setGithubRepoPrivate] = useState(true);
  const [githubPullNumber, setGithubPullNumber] = useState('');
  const [orgSession, setOrgSession] = useState<OrgSessionPayload | null>(null);
  const [orgStatus, setOrgStatus] = useState<OrgStatusPayload | null>(null);
  const [orgPreflight, setOrgPreflight] = useState<OrgPreflightPayload | null>(null);
  const [orgAliases, setOrgAliases] = useState<OrgSessionAliasesPayload | null>(null);
  const [orgSessionHistory, setOrgSessionHistory] = useState<OrgSessionHistoryPayload | null>(null);
  const [githubSession, setGithubSession] = useState<GithubSessionPayload | null>(null);
  const [githubRepos, setGithubRepos] = useState<GithubRepoListPayload | null>(null);
  const [githubRepoContext, setGithubRepoContext] = useState<GithubRepoContextPayload | null>(null);
  const [githubPullRequestFiles, setGithubPullRequestFiles] = useState<GithubPullRequestFileScopePayload | null>(null);
  const [runtimeUnavailable, setRuntimeUnavailable] = useState(false);

  const aliasInventory = orgAliases?.aliases ?? [];
  const activeAlias = orgSession?.activeAlias || orgStatus?.session?.activeAlias || orgStatus?.alias || orgAlias;
  const sessionStatus = runtimeUnavailable ? 'runtime unavailable' : orgSession?.status || orgStatus?.session?.status || 'unknown';
  const restoreAlias = orgSessionHistory?.restoreAlias || (sessionStatus === 'disconnected' ? activeAlias : '');
  const recentSessionEvents = orgSessionHistory?.entries ?? [];
  const selectedAlias = useMemo<OrgAliasSummary | null>(
    () => aliasInventory.find((entry) => entry.alias === orgAlias) ?? null,
    [aliasInventory, orgAlias]
  );
  const preflightIssues = orgPreflight?.issues ?? [];
  const toolingReady = Boolean(orgStatus?.sf?.installed) && Boolean(orgStatus?.cci?.installed);
  const toolStatusSource: 'runtime_unavailable' | 'live' | 'unknown' =
    runtimeUnavailable ? 'runtime_unavailable' : orgStatus ? 'live' : 'unknown';
  const browserSeeded = Boolean(orgPreflight?.checks?.parsePathPresent);
  const selectedAliasReady = Boolean(
    orgPreflight?.integrationEnabled &&
      orgPreflight?.checks?.aliasAuthenticated &&
      orgPreflight?.checks?.sfInstalled
  );
  const githubAccessibleRepos = githubRepos?.repos ?? [];
  const githubSelectedRepo = githubRepos?.selectedRepo || githubSession?.selectedRepo || null;
  const githubIssues = githubSession?.issues ?? [];

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
      if (onSuccess) {
        await onSuccess(response);
      }
      if (response.ok === false) {
        options.setErrorText(options.resolveErrorMessage(response));
        setRuntimeUnavailable(responseIndicatesRuntimeUnavailable(response));
      } else {
        setRuntimeUnavailable(false);
      }
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected org request failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Org request failed. Check API readiness and local runtime health.');
      setRuntimeUnavailable(true);
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

    setOrgSessionHistory(historyPayload);
    setOrgStatus(statusPayload);
    setOrgSession(sessionPayload);
    setOrgAliases(aliasesPayload);
    setOrgPreflight(preflightPayload);

    const responses = [statusResponse, sessionResponse, aliasesResponse, preflightResponse, historyResponse];
    const failedResponse = responses.find((response) => response.ok === false);
    const runtimeUnavailableDetected = responses.some((response) => response.ok === false && responseIndicatesRuntimeUnavailable(response));

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
      setRuntimeUnavailable(runtimeUnavailableDetected);
    } else {
      setRuntimeUnavailable(false);
    }

    return overviewResponse;
  }

  function loadAliases(): Promise<QueryResponse | null> {
    return runAction(() => listOrgSessionAliases(), (response) => {
      const payload = readPayload<OrgSessionAliasesPayload>(response);
      setOrgAliases(payload);
    });
  }

  function checkSession(): Promise<QueryResponse | null> {
    return runAction(() => getOrgSession(), (response) => {
      const payload = readPayload<OrgSessionPayload>(response);
      setOrgSession(payload);
    });
  }

  function loadSessionHistory(): Promise<QueryResponse | null> {
    return runAction(() => getOrgSessionHistory(), (response) => {
      const payload = readPayload<OrgSessionHistoryPayload>(response);
      setOrgSessionHistory(payload);
    });
  }

  function loadToolStatus(): Promise<QueryResponse | null> {
    return runAction(() => getOrgStatus(), (response) => {
      const payload = readPayload<OrgStatusPayload>(response);
      setOrgStatus(payload);
    });
  }

  function runPreflight(alias = orgAlias): Promise<QueryResponse | null> {
    return runAction(() => runOrgPreflight(alias), (response) => {
      const payload = readPayload<OrgPreflightPayload>(response);
      setOrgPreflight(payload);
      if (payload) {
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

  function bridgeAlias(alias = orgAlias): Promise<QueryResponse | null> {
    return runAction(() => bridgeOrgSessionAlias({ alias }), async () => {
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

  function syncGithubOwnerDefaults(
    payload: GithubSessionPayload | GithubRepoListPayload | null,
    preserveExistingOwner = true
  ): void {
    const viewerLogin = payload?.viewer?.login?.trim();
    if (!viewerLogin) {
      return;
    }

    if (!preserveExistingOwner || githubRepoOwner.trim().length === 0) {
      setGithubRepoOwner(viewerLogin);
    }
  }

  function refreshGithubStatus(): Promise<QueryResponse | null> {
    return runAction(() => getGithubSessionStatus(), (response) => {
      const payload = readPayload<GithubSessionPayload>(response);
      setGithubSession(payload);
      if (!payload?.selectedRepo) {
        setGithubRepoContext(null);
        setGithubPullRequestFiles(null);
      }
      syncGithubOwnerDefaults(payload);
    });
  }

  function authorizeGithub(): Promise<QueryResponse | null> {
    return runAction(() => loginGithubSession(), async (response) => {
      const payload = readPayload<GithubSessionPayload>(response);
      setGithubSession(payload);
      syncGithubOwnerDefaults(payload, false);
      const reposResponse = await listGithubRepos();
      const reposPayload = readPayload<GithubRepoListPayload>(reposResponse);
      setGithubRepos(reposPayload);
      setGithubRepoContext(null);
      setGithubPullRequestFiles(null);
    });
  }

  function loadGithubReposAction(): Promise<QueryResponse | null> {
    return runAction(() => listGithubRepos(), (response) => {
      const payload = readPayload<GithubRepoListPayload>(response);
      setGithubRepos(payload);
      syncGithubOwnerDefaults(payload);
    });
  }

  function createGithubRepoAction(): Promise<QueryResponse | QueryResponse | null> {
    const name = githubRepoName.trim();
    const owner = githubRepoOwner.trim();
    if (!name) {
      const fallback: QueryResponse = { ok: false, error: { message: 'GitHub repo name is required.' } };
      options.presentResponse(fallback);
      options.setErrorText('Enter a GitHub repo name before creating a repo.');
      return Promise.resolve(fallback);
    }

    return runAction(
      () =>
        createGithubRepo({
          owner: owner || undefined,
          name,
          description: githubRepoDescription.trim() || undefined,
          visibility: githubRepoPrivate ? 'private' : 'public'
        }),
      async (response) => {
        await refreshGithubStatus();
        await loadGithubReposAction();
        await loadGithubRepoContextAction();
        setGithubPullRequestFiles(null);
        const payload = readPayload<{ selectedRepo?: GithubRepoSummary }>(response);
        if (payload?.selectedRepo?.owner) {
          setGithubRepoOwner(payload.selectedRepo.owner);
        }
        setGithubRepoName('');
        setGithubRepoDescription('');
      }
    );
  }

  function selectGithubRepoAction(owner: string, repo: string): Promise<QueryResponse | null> {
    return runAction(() => selectGithubRepo({ owner, repo }), async () => {
      await refreshGithubStatus();
      await loadGithubReposAction();
      await loadGithubRepoContextAction(owner, repo);
      setGithubPullRequestFiles(null);
      setGithubRepoOwner(owner);
    });
  }

  function loadGithubRepoContextAction(owner?: string, repo?: string): Promise<QueryResponse | null> {
    return runAction(
      () =>
        getGithubRepoContext({
          owner: owner?.trim() || undefined,
          repo: repo?.trim() || undefined
        }),
      (response) => {
        const payload = readPayload<GithubRepoContextPayload>(response);
        setGithubRepoContext(payload);
      }
    );
  }

  function loadGithubPullRequestFilesAction(pullNumberRaw?: string): Promise<QueryResponse | null> {
    const candidate = (pullNumberRaw ?? githubPullNumber).trim();
    const pullNumber = Number(candidate);
    if (!Number.isInteger(pullNumber) || pullNumber < 1) {
      const fallback: QueryResponse = { ok: false, error: { message: 'GitHub pull request number must be a positive integer.' } };
      options.presentResponse(fallback);
      options.setErrorText('Enter a valid GitHub pull request number before loading changed-file scope.');
      return Promise.resolve(fallback);
    }

    return runAction(
      () =>
        getGithubPullRequestFiles({
          pullNumber
        }),
      (response) => {
        const payload = readPayload<GithubPullRequestFileScopePayload>(response);
        setGithubPullRequestFiles(payload);
        setGithubPullNumber(String(pullNumber));
      }
    );
  }

  return {
    orgAlias,
    setOrgAlias,
    githubRepoOwner,
    setGithubRepoOwner,
    githubRepoName,
    setGithubRepoName,
    githubRepoDescription,
    setGithubRepoDescription,
    githubRepoPrivate,
    setGithubRepoPrivate,
    githubPullNumber,
    setGithubPullNumber,
    orgSession,
    orgStatus,
    orgPreflight,
    orgAliases,
    orgSessionHistory,
    githubSession,
    githubRepos,
    githubRepoContext,
    githubPullRequestFiles,
    activeAlias,
    sessionStatus,
    restoreAlias,
    aliasInventory,
    recentSessionEvents: recentSessionEvents as OrgSessionAuditEntry[],
    selectedAlias,
    preflightIssues: preflightIssues as OrgPreflightIssue[],
    toolingReady,
    toolStatusSource,
    browserSeeded,
    selectedAliasReady,
    runtimeUnavailable,
    githubAccessibleRepos,
    githubSelectedRepo,
    githubIssues: githubIssues as GithubSessionIssue[],
    loadAliases,
    checkSession,
    loadSessionHistory,
    loadToolStatus,
    runPreflight,
    refreshOverview,
    connectExistingAlias,
    bridgeAlias,
    switchAlias,
    disconnect,
    restoreLastSession,
    selectAlias,
    inspectAlias,
    refreshGithubStatus,
    authorizeGithub,
    loadGithubRepos: loadGithubReposAction,
    loadGithubRepoContext: loadGithubRepoContextAction,
    loadGithubPullRequestFiles: loadGithubPullRequestFilesAction,
    createGithubRepo: createGithubRepoAction,
    selectGithubRepo: selectGithubRepoAction
  };
}
