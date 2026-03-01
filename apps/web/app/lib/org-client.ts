import type { QueryResponse } from './ask-client';
import { resolveDesktopApiUrl } from './runtime-mode';

interface OrgAliasPayload {
  alias?: string;
}

interface OrgRetrievePayload {
  alias?: string;
  runAuth?: boolean;
  runRetrieve?: boolean;
  autoRefresh?: boolean;
}

interface MetadataCatalogPayload {
  q?: string;
  limit?: number;
  refresh?: boolean;
}

interface MetadataMembersPayload {
  type: string;
  q?: string;
  limit?: number;
  refresh?: boolean;
}

interface MetadataSelection {
  type: string;
  members?: string[];
}

interface MetadataRetrievePayload {
  selections: MetadataSelection[];
  autoRefresh?: boolean;
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
  return requestBoundary(resolveDesktopApiUrl('/org/status'), { method: 'GET' });
}

export function getOrgSession(): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/org/session'), { method: 'GET' });
}

export function listOrgSessionAliases(): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/org/session/aliases'), { method: 'GET' });
}

export function runOrgPreflight(alias?: string): Promise<QueryResponse> {
  const suffix = alias ? `?alias=${encodeURIComponent(alias)}` : '';
  const path = resolveDesktopApiUrl(`/org/preflight${suffix}`);
  return requestBoundary(path, { method: 'GET' });
}

export function connectOrgSession(payload: OrgAliasPayload): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/org/session/connect'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function switchOrgSession(payload: OrgAliasPayload): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/org/session/switch'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function disconnectOrgSession(): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/org/session/disconnect'), { method: 'POST' });
}

export function runOrgRetrieve(payload: OrgRetrievePayload): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/org/retrieve'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function getOrgMetadataCatalog(payload: MetadataCatalogPayload): Promise<QueryResponse> {
  const params = new URLSearchParams();
  if (typeof payload.q === 'string' && payload.q.length > 0) {
    params.set('q', payload.q);
  }
  if (typeof payload.limit === 'number' && Number.isFinite(payload.limit)) {
    params.set('limit', String(payload.limit));
  }
  if (typeof payload.refresh === 'boolean') {
    params.set('refresh', String(payload.refresh));
  }
  const suffix = params.toString();
  const path = resolveDesktopApiUrl(`/org/metadata/catalog${suffix ? `?${suffix}` : ''}`);
  return requestBoundary(path, { method: 'GET' });
}

export function getOrgMetadataMembers(payload: MetadataMembersPayload): Promise<QueryResponse> {
  const params = new URLSearchParams();
  params.set('type', payload.type);
  if (typeof payload.q === 'string' && payload.q.length > 0) {
    params.set('q', payload.q);
  }
  if (typeof payload.limit === 'number' && Number.isFinite(payload.limit)) {
    params.set('limit', String(payload.limit));
  }
  if (typeof payload.refresh === 'boolean') {
    params.set('refresh', String(payload.refresh));
  }
  const path = resolveDesktopApiUrl(`/org/metadata/members?${params.toString()}`);
  return requestBoundary(path, { method: 'GET' });
}

export function retrieveOrgMetadata(payload: MetadataRetrievePayload): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/org/metadata/retrieve'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
