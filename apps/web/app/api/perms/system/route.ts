import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../_lib/upstream';

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    return proxyUpstreamJson(
      'GET /api/perms/system',
      `${API_BASE}/perms/system?${url.searchParams.toString()}`,
      { method: 'GET' }
    );
  } catch (error) {
    return upstreamErrorResponse('GET /api/perms/system', error);
  }
}
