import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../_lib/upstream';

export async function GET(): Promise<Response> {
  try {
    return proxyUpstreamJson('GET /api/org/status', `${API_BASE}/org/status`, { method: 'GET' });
  } catch (error) {
    return upstreamErrorResponse('GET /api/org/status', error);
  }
}
