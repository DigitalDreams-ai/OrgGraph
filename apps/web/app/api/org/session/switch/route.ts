import { badRequestResponse, API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../../_lib/upstream';

interface OrgAliasBody {
  alias?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as OrgAliasBody;
    if (typeof body.alias !== 'string' || body.alias.trim().length === 0) {
      return badRequestResponse('alias is required');
    }

    return proxyUpstreamJson('POST /api/org/session/switch', `${API_BASE}/org/session/switch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        alias: body.alias.trim()
      })
    });
  } catch (error) {
    return upstreamErrorResponse('POST /api/org/session/switch', error);
  }
}
