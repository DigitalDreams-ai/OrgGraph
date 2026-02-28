import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../../_lib/upstream';

export async function POST(): Promise<Response> {
  try {
    return proxyUpstreamJson('POST /api/org/session/disconnect', `${API_BASE}/org/session/disconnect`, {
      method: 'POST'
    });
  } catch (error) {
    return upstreamErrorResponse('POST /api/org/session/disconnect', error);
  }
}
