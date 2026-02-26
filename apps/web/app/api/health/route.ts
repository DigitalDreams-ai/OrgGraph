import { NextResponse } from 'next/server';
const WEB_LOG_ENABLED = (process.env.ORGUMENTED_WEB_LOG_ENABLED || 'false').trim().toLowerCase() === 'true';

export async function GET(): Promise<NextResponse> {
  if (WEB_LOG_ENABLED) {
    console.log('[web] GET /api/health');
  }
  return NextResponse.json({
    status: 'ok',
    service: 'web'
  });
}
