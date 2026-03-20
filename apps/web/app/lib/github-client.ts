import type { QueryResponse } from './ask-client';
import { resolveDesktopApiUrl } from './runtime-mode';

async function parseBoundaryResponse(res: Response): Promise<QueryResponse> {
  const text = await res.text();

  try {
    const parsed = JSON.parse(text) as QueryResponse & Record<string, unknown>;
    const payload =
      Object.prototype.hasOwnProperty.call(parsed, 'payload') && parsed.payload && typeof parsed.payload === 'object'
        ? (parsed.payload as Record<string, unknown>)
        : parsed;
    return {
      ok: typeof parsed.ok === 'boolean' ? parsed.ok : res.ok,
      statusCode: typeof parsed.statusCode === 'number' ? parsed.statusCode : res.status,
      payload,
      error: parsed.error
    };
  } catch {
    return {
      ok: false,
      statusCode: res.status,
      error: { message: text }
    };
  }
}

async function requestBoundary(path: string, init: RequestInit): Promise<QueryResponse> {
  const res = await fetch(path, init);
  return parseBoundaryResponse(res);
}

export function getGithubSessionStatus(): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/github/session/status'), { method: 'GET' });
}

export function loginGithubSession(): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/github/session/login'), { method: 'POST' });
}

export function listGithubRepos(limit = 50): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl(`/github/repos?limit=${encodeURIComponent(String(limit))}`), {
    method: 'GET'
  });
}

export function getGithubRepoBindingStatus(): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/github/repo/binding'), {
    method: 'GET'
  });
}

export function getGithubRepoContext(payload?: {
  owner?: string;
  repo?: string;
  branchLimit?: number;
  pullLimit?: number;
}): Promise<QueryResponse> {
  const params = new URLSearchParams();
  if (payload?.owner) {
    params.set('owner', payload.owner);
  }
  if (payload?.repo) {
    params.set('repo', payload.repo);
  }
  if (payload?.branchLimit !== undefined) {
    params.set('branchLimit', String(payload.branchLimit));
  }
  if (payload?.pullLimit !== undefined) {
    params.set('pullLimit', String(payload.pullLimit));
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return requestBoundary(resolveDesktopApiUrl(`/github/repo/context${suffix}`), {
    method: 'GET'
  });
}

export function getGithubPullRequestFiles(payload: {
  pullNumber: number;
  owner?: string;
  repo?: string;
  limit?: number;
}): Promise<QueryResponse> {
  const params = new URLSearchParams();
  params.set('pullNumber', String(payload.pullNumber));
  if (payload.owner) {
    params.set('owner', payload.owner);
  }
  if (payload.repo) {
    params.set('repo', payload.repo);
  }
  if (payload.limit !== undefined) {
    params.set('limit', String(payload.limit));
  }
  return requestBoundary(resolveDesktopApiUrl(`/github/pr/files?${params.toString()}`), {
    method: 'GET'
  });
}

export function getGithubWorkflowCatalog(payload?: { owner?: string; repo?: string }): Promise<QueryResponse> {
  const params = new URLSearchParams();
  if (payload?.owner) {
    params.set('owner', payload.owner);
  }
  if (payload?.repo) {
    params.set('repo', payload.repo);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return requestBoundary(resolveDesktopApiUrl(`/github/actions/workflows${suffix}`), {
    method: 'GET'
  });
}

export function getGithubWorkflowRuns(payload: {
  workflowKey: string;
  owner?: string;
  repo?: string;
  limit?: number;
}): Promise<QueryResponse> {
  const params = new URLSearchParams();
  params.set('workflowKey', payload.workflowKey);
  if (payload.owner) {
    params.set('owner', payload.owner);
  }
  if (payload.repo) {
    params.set('repo', payload.repo);
  }
  if (payload.limit !== undefined) {
    params.set('limit', String(payload.limit));
  }
  return requestBoundary(resolveDesktopApiUrl(`/github/actions/runs?${params.toString()}`), {
    method: 'GET'
  });
}

export function dispatchGithubWorkflow(payload: {
  workflowKey: string;
  ref: string;
  owner?: string;
  repo?: string;
  inputs?: Record<string, string>;
}): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/github/actions/dispatch'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function createGithubRepo(payload: {
  owner?: string;
  name: string;
  description?: string;
  visibility?: 'private' | 'public';
}): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/github/repos'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function selectGithubRepo(payload: { owner: string; repo: string }): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/github/session/select-repo'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
