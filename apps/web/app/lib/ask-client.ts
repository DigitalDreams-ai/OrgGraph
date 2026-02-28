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

export function runAskRequest(payload: AskRequestPayload): Promise<QueryResponse> {
  return requestBoundary('/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function listAskProofsRecent(limit: number): Promise<QueryResponse> {
  return requestBoundary(`/api/ask/proofs/recent?limit=${encodeURIComponent(String(limit))}`, {
    method: 'GET'
  });
}

export function getAskProof(proofId: string): Promise<QueryResponse> {
  return requestBoundary(`/api/ask/proof/${encodeURIComponent(proofId)}`, {
    method: 'GET'
  });
}

export function replayAskProof(payload: AskReplayPayload): Promise<QueryResponse> {
  return requestBoundary('/api/ask/replay', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function exportAskMetrics(): Promise<QueryResponse> {
  return requestBoundary('/api/ask/metrics', {
    method: 'GET'
  });
}
