import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../_lib/upstream';

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    return proxyUpstreamJson(
      'GET /api/perms',
      `${API_BASE}/perms?${url.searchParams.toString()}`,
      { method: 'GET' }
    );
  } catch (error) {
    return upstreamErrorResponse('GET /api/perms', error);
  }
}
