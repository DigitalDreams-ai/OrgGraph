import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../../_lib/upstream';

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const limit = params.get('limit');
    const upstreamParams = new URLSearchParams();
    if (limit && limit.trim().length > 0) {
      upstreamParams.set('limit', limit);
    }

    return await proxyUpstreamJson(
      'GET /api/ask/proofs/recent',
      `${API_BASE}/ask/proofs/recent?${upstreamParams.toString()}`,
      { method: 'GET' }
    );
  } catch (error) {
    return upstreamErrorResponse('GET /api/ask/proofs/recent', error);
  }
}
