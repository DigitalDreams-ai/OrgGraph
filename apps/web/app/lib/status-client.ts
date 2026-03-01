import type { QueryResponse } from './ask-client';
import { resolveDesktopApiUrl } from './runtime-mode';

async function parseBoundaryResponse(res: Response): Promise<QueryResponse> {
  const text = await res.text();

  try {
    const parsed = JSON.parse(text) as QueryResponse;
    return {
      ok: typeof parsed.ok === 'boolean' ? parsed.ok : res.ok,
      statusCode: typeof parsed.statusCode === 'number' ? parsed.statusCode : res.status,
      payload: parsed.payload ?? (parsed as Record<string, unknown>),
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

async function requestStatus(path: string): Promise<QueryResponse> {
  const response = await fetch(resolveDesktopApiUrl(path), { cache: 'no-store' });
  return parseBoundaryResponse(response);
}

export function getApiHealth(): Promise<QueryResponse> {
  return requestStatus('/health');
}

export function getApiReady(): Promise<QueryResponse> {
  return requestStatus('/ready');
}
