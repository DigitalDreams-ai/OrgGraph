import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../_lib/upstream';

export async function GET(): Promise<Response> {
  try {
    return proxyUpstreamJson('GET /api/meta/context', `${API_BASE}/meta/context`, { method: 'GET' });
  } catch (error) {
    return upstreamErrorResponse('GET /api/meta/context', error);
  }
}
