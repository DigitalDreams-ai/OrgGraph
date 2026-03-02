import { resolveDesktopApiUrl } from './runtime-mode';

export interface QueryResponse {
  ok?: boolean;
  statusCode?: number;
  payload?: Record<string, unknown>;
  error?: { message?: string };
}

interface AskRequestPayload {
  query: string;
  maxCitations?: number;
  includeLowConfidence?: boolean;
  consistencyCheck?: boolean;
  context?: Record<string, unknown>;
}

interface AskReplayPayload {
  replayToken?: string;
  proofId?: string;
}

async function parseBoundaryResponse(res: Response): Promise<QueryResponse> {
  const text = await res.text();

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const payload =
      Object.prototype.hasOwnProperty.call(parsed, 'payload') && parsed.payload && typeof parsed.payload === 'object'
        ? (parsed.payload as Record<string, unknown>)
        : parsed;
    const topLevelMessage =
      typeof parsed.message === 'string'
        ? parsed.message
        : Array.isArray(parsed.message)
          ? parsed.message.filter((value): value is string => typeof value === 'string').join('; ')
          : undefined;
    const nestedError =
      parsed.error && typeof parsed.error === 'object'
        ? (parsed.error as { message?: unknown }).message
        : undefined;

    return {
      ok: typeof parsed.ok === 'boolean' ? parsed.ok : res.ok,
      statusCode: typeof parsed.statusCode === 'number' ? parsed.statusCode : res.status,
      payload,
      error:
        typeof nestedError === 'string'
          ? { message: nestedError }
          : typeof topLevelMessage === 'string' && topLevelMessage.length > 0
            ? { message: topLevelMessage }
            : undefined
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

export function runAskRequest(payload: AskRequestPayload): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/ask'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function listAskProofsRecent(limit: number): Promise<QueryResponse> {
  const path = resolveDesktopApiUrl(`/ask/proofs/recent?limit=${encodeURIComponent(String(limit))}`);
  return requestBoundary(path, {
    method: 'GET'
  });
}

export function getAskProof(proofId: string): Promise<QueryResponse> {
  const path = resolveDesktopApiUrl(`/ask/proof/${encodeURIComponent(proofId)}`);
  return requestBoundary(path, {
    method: 'GET'
  });
}

export function replayAskProof(payload: AskReplayPayload): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/ask/replay'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function exportAskMetrics(): Promise<QueryResponse> {
  return requestBoundary(resolveDesktopApiUrl('/ask/metrics/export'), {
    method: 'GET'
  });
}
