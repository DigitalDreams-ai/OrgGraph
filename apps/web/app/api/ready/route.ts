import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100';

export async function GET(): Promise<NextResponse> {
  try {
    const res = await fetch(`${API_BASE}/ready`, { cache: 'no-store' });
    const payload = await res.json().catch(() => undefined);
    if (!res.ok) {
      return NextResponse.json(
        {
          status: 'not_ready',
          service: 'web',
          upstreamApi: { ok: false, statusCode: res.status, payload }
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ready',
      service: 'web',
      upstreamApi: { ok: true, statusCode: res.status, payload }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'not_ready',
        service: 'web',
        upstreamApi: {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown upstream error'
        }
      },
      { status: 503 }
    );
  }
}
