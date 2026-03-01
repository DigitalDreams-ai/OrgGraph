import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../_lib/upstream';

export async function GET() {
  try {
    return await proxyUpstreamJson(
      'GET /api/ask/metrics',
      `${API_BASE}/ask/metrics/export`,
      { method: 'GET' }
    );
  } catch (error) {
    return upstreamErrorResponse('GET /api/ask/metrics', error);
  }
}
