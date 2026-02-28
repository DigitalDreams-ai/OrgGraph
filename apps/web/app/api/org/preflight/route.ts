import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../_lib/upstream';

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const alias = url.searchParams.get('alias')?.trim();
    const params = new URLSearchParams();
    if (alias) {
      params.set('alias', alias);
    }
    const suffix = params.toString();
    const upstream = suffix ? `${API_BASE}/org/preflight?${suffix}` : `${API_BASE}/org/preflight`;
    return proxyUpstreamJson('GET /api/org/preflight', upstream, { method: 'GET' });
  } catch (error) {
    return upstreamErrorResponse('GET /api/org/preflight', error);
  }
}
