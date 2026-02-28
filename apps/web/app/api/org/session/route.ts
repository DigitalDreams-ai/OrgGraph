import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../_lib/upstream';

export async function GET(): Promise<Response> {
  try {
    return proxyUpstreamJson('GET /api/org/session', `${API_BASE}/org/session`, { method: 'GET' });
  } catch (error) {
    return upstreamErrorResponse('GET /api/org/session', error);
  }
}
