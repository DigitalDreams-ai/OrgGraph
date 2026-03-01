import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../../_lib/upstream';

export async function GET(): Promise<Response> {
  try {
    return proxyUpstreamJson('GET /api/org/session/aliases', `${API_BASE}/org/session/aliases`, { method: 'GET' });
  } catch (error) {
    return upstreamErrorResponse('GET /api/org/session/aliases', error);
  }
}
