import { NextResponse } from 'next/server';

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100';
const WEB_LOG_ENABLED = (process.env.ORGUMENTED_WEB_LOG_ENABLED || 'false').trim().toLowerCase() === 'true';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
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

export function badRequestResponse(message: string): NextResponse {
  return NextResponse.json(
    { error: { code: 'BAD_REQUEST', message } },
    { status: 400 }
  );
}

export async function proxyUpstreamJson(
  routeLabel: string,
  url: string,
  init: RequestInit,
  summarize: (payload: unknown) => unknown = (payload) => payload
): Promise<NextResponse> {
  if (WEB_LOG_ENABLED) {
    console.log(`[web] ${routeLabel} -> ${url}`);
  }

  const upstreamRes = await fetchWithRetry(url, { ...init, cache: 'no-store' });
  const contentType = upstreamRes.headers.get('content-type') ?? '';

  if (!contentType.includes('application/json')) {
    const text = await upstreamRes.text();
    return NextResponse.json(
      { ok: upstreamRes.ok, statusCode: upstreamRes.status, payload: { raw: text } },
      { status: upstreamRes.status }
    );
  }

  const upstreamPayload = summarize(await upstreamRes.json());
  if (WEB_LOG_ENABLED) {
    console.log(`[web] ${routeLabel} status=${upstreamRes.status}`);
  }
  return NextResponse.json(
    { ok: upstreamRes.ok, statusCode: upstreamRes.status, payload: upstreamPayload },
    { status: upstreamRes.status }
  );
}

export function upstreamErrorResponse(routeLabel: string, error: unknown): NextResponse {
  if (WEB_LOG_ENABLED) {
    const message = error instanceof Error ? error.message : 'Unexpected query route error';
    console.error(`[web] ${routeLabel} failed: ${message}`);
  }

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
