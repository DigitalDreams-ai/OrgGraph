import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../../_lib/upstream';

export async function GET(req: Request): Promise<Response> {
  try {
    const input = new URL(req.url).searchParams;
    const params = new URLSearchParams();
    const q = input.get('q')?.trim();
    const limit = input.get('limit')?.trim();
    const refresh = input.get('refresh')?.trim();

    if (q) {
      params.set('q', q);
    }
    if (limit) {
      params.set('limit', limit);
    }
    if (refresh) {
      params.set('refresh', refresh);
    }

    return proxyUpstreamJson(
      'GET /api/org/metadata/catalog',
      `${API_BASE}/org/metadata/catalog${params.toString() ? `?${params.toString()}` : ''}`,
      { method: 'GET' }
    );
  } catch (error) {
    return upstreamErrorResponse('GET /api/org/metadata/catalog', error);
  }
}
