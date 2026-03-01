import { badRequestResponse, API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../../../_lib/upstream';

interface RouteParams {
  params: {
    snapshotA?: string;
    snapshotB?: string;
  };
}

export async function GET(_req: Request, context: RouteParams): Promise<Response> {
  try {
    const snapshotA = context.params.snapshotA?.trim() || '';
    const snapshotB = context.params.snapshotB?.trim() || '';
    if (!snapshotA || !snapshotB) {
      return badRequestResponse('snapshotA and snapshotB are required');
    }

    return proxyUpstreamJson(
      'GET /api/refresh/diff/[snapshotA]/[snapshotB]',
      `${API_BASE}/refresh/diff/${encodeURIComponent(snapshotA)}/${encodeURIComponent(snapshotB)}`,
      { method: 'GET' }
    );
  } catch (error) {
    return upstreamErrorResponse('GET /api/refresh/diff/[snapshotA]/[snapshotB]', error);
  }
}
