import type { QueryResponse } from './ask-client';
import { resolveDesktopApiUrl } from './runtime-mode';

interface RefreshPayload {
  mode?: 'full' | 'incremental';
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

export function runRefresh(payload: RefreshPayload): Promise<QueryResponse> {
  return requestBoundary(
    resolveDesktopApiUrl('/refresh'),
    {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
    }
  );
}

export function getRefreshDiff(fromSnapshot: string, toSnapshot: string): Promise<QueryResponse> {
  const path = resolveDesktopApiUrl(
    `/refresh/diff/${encodeURIComponent(fromSnapshot)}/${encodeURIComponent(toSnapshot)}`
  );
  return requestBoundary(path, { method: 'GET' });
}
