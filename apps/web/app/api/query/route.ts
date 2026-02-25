import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100';

type QueryKind = 'refresh' | 'perms' | 'automation' | 'impact' | 'ask';

interface QueryRequest {
  kind?: QueryKind;
  endpoint?: QueryKind;
  payload?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let lastError: Error | undefined;

  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, init);
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        if (i < attempts - 1) {
          await sleep(200 * (i + 1));
          continue;
        }
      }
      return res;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('unknown fetch error');
      if (i < attempts - 1) {
        await sleep(200 * (i + 1));
        continue;
      }
    }
  }

  throw lastError ?? new Error('request failed after retries');
}

function buildUpstream(request: QueryRequest): { url: string; init: RequestInit } {
  const body = request.payload ?? {};
  if (request.kind === 'refresh') {
    return {
      url: `${API_BASE}/refresh`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }
    };
  }

  if (request.kind === 'perms') {
    const params = new URLSearchParams();
    if (typeof body.user === 'string') params.set('user', body.user);
    if (typeof body.object === 'string') params.set('object', body.object);
    if (typeof body.field === 'string' && body.field.length > 0) params.set('field', body.field);
    return { url: `${API_BASE}/perms?${params.toString()}`, init: { method: 'GET' } };
  }

  if (request.kind === 'automation') {
    const params = new URLSearchParams();
    if (typeof body.object === 'string') params.set('object', body.object);
    return { url: `${API_BASE}/automation?${params.toString()}`, init: { method: 'GET' } };
  }

  if (request.kind === 'impact') {
    const params = new URLSearchParams();
    if (typeof body.field === 'string') params.set('field', body.field);
    return { url: `${API_BASE}/impact?${params.toString()}`, init: { method: 'GET' } };
  }

  return {
    url: `${API_BASE}/ask`,
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        query: body.query,
        maxCitations: typeof body.maxCitations === 'number' ? body.maxCitations : 5
      })
    }
  };
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const json = (await req.json()) as Partial<QueryRequest>;
    const kindRaw = json?.kind ?? json?.endpoint;
    if (!json || typeof kindRaw !== 'string') {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'kind (or endpoint) is required' } },
        { status: 400 }
      );
    }

    const kind = kindRaw as QueryKind;
    if (!['refresh', 'perms', 'automation', 'impact', 'ask'].includes(kind)) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'invalid query kind' } },
        { status: 400 }
      );
    }

    const payload = (json.payload ?? json.params) as Record<string, unknown> | undefined;
    const upstream = buildUpstream({ kind, payload });
    const upstreamRes = await fetchWithRetry(upstream.url, { ...upstream.init, cache: 'no-store' });

    const contentType = upstreamRes.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await upstreamRes.text();
      return NextResponse.json(
        { ok: upstreamRes.ok, statusCode: upstreamRes.status, payload: { raw: text } },
        { status: upstreamRes.status }
      );
    }

    const upstreamPayload = await upstreamRes.json();
    return NextResponse.json(
      { ok: upstreamRes.ok, statusCode: upstreamRes.status, payload: upstreamPayload },
      { status: upstreamRes.status }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: 'UPSTREAM_ERROR',
          message: error instanceof Error ? error.message : 'Unexpected query route error'
        }
      },
      { status: 502 }
    );
  }
}
