import { API_BASE, badRequestResponse, proxyUpstreamJson, upstreamErrorResponse } from '../../../_lib/upstream';

export async function GET(_: Request, context: { params: { proofId: string } }) {
  const proofId = context.params.proofId?.trim() ?? '';
  if (!proofId) {
    return badRequestResponse('proofId is required');
  }

  try {
    return await proxyUpstreamJson(
      'GET /api/ask/proof/[proofId]',
      `${API_BASE}/ask/proof/${encodeURIComponent(proofId)}`,
      { method: 'GET' }
    );
  } catch (error) {
    return upstreamErrorResponse('GET /api/ask/proof/[proofId]', error);
  }
}
