import type { QueryResponse } from './ask-client';

interface OrgAliasPayload {
  alias?: string;
}

async function parseBoundaryResponse(res: Response): Promise<QueryResponse> {
  const text = await res.text();

  try {
    const parsed = JSON.parse(text) as QueryResponse;
    return {
      ok: typeof parsed.ok === 'boolean' ? parsed.ok : res.ok,
      statusCode: typeof parsed.statusCode === 'number' ? parsed.statusCode : res.status,
      payload: parsed.payload,
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

export function getOrgStatus(): Promise<QueryResponse> {
  return requestBoundary('/api/org/status', { method: 'GET' });
}

export function getOrgSession(): Promise<QueryResponse> {
  return requestBoundary('/api/org/session', { method: 'GET' });
}

export function listOrgSessionAliases(): Promise<QueryResponse> {
  return requestBoundary('/api/org/session/aliases', { method: 'GET' });
}

export function runOrgPreflight(alias?: string): Promise<QueryResponse> {
  const suffix = alias ? `?alias=${encodeURIComponent(alias)}` : '';
  return requestBoundary(`/api/org/preflight${suffix}`, { method: 'GET' });
}

export function connectOrgSession(payload: OrgAliasPayload): Promise<QueryResponse> {
  return requestBoundary('/api/org/session/connect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function switchOrgSession(payload: OrgAliasPayload): Promise<QueryResponse> {
  return requestBoundary('/api/org/session/switch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function disconnectOrgSession(): Promise<QueryResponse> {
  return requestBoundary('/api/org/session/disconnect', { method: 'POST' });
}
