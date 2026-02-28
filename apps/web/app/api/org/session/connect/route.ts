import { badRequestResponse, API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../../_lib/upstream';

interface OrgAliasBody {
  alias?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as OrgAliasBody;
    if (body.alias !== undefined && (typeof body.alias !== 'string' || body.alias.trim().length === 0)) {
      return badRequestResponse('alias must be a non-empty string when provided');
    }

    return proxyUpstreamJson('POST /api/org/session/connect', `${API_BASE}/org/session/connect`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        alias: typeof body.alias === 'string' ? body.alias.trim() : undefined
      })
    });
  } catch (error) {
    return upstreamErrorResponse('POST /api/org/session/connect', error);
  }
}
