import { API_BASE, badRequestResponse, proxyUpstreamJson, upstreamErrorResponse } from '../../_lib/upstream';

interface MetaAdaptRequestBody {
  dryRun?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as MetaAdaptRequestBody;
    if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') {
      return badRequestResponse('dryRun must be a boolean when provided');
    }

    return proxyUpstreamJson('POST /api/meta/adapt', `${API_BASE}/meta/adapt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dryRun: body.dryRun as boolean | undefined
      })
    });
  } catch (error) {
    return upstreamErrorResponse('POST /api/meta/adapt', error);
  }
}
