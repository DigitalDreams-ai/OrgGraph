import { badRequestResponse, API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../_lib/upstream';

interface OrgRetrieveBody {
  alias?: unknown;
  runAuth?: unknown;
  runRetrieve?: unknown;
  autoRefresh?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as OrgRetrieveBody;
    if (body.alias !== undefined && (typeof body.alias !== 'string' || body.alias.trim().length === 0)) {
      return badRequestResponse('alias must be a non-empty string when provided');
    }
    if (body.runAuth !== undefined && typeof body.runAuth !== 'boolean') {
      return badRequestResponse('runAuth must be a boolean');
    }
    if (body.runRetrieve !== undefined && typeof body.runRetrieve !== 'boolean') {
      return badRequestResponse('runRetrieve must be a boolean');
    }
    if (body.autoRefresh !== undefined && typeof body.autoRefresh !== 'boolean') {
      return badRequestResponse('autoRefresh must be a boolean');
    }

    return proxyUpstreamJson('POST /api/org/retrieve', `${API_BASE}/org/retrieve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        alias: typeof body.alias === 'string' ? body.alias.trim() : undefined,
        runAuth: body.runAuth as boolean | undefined,
        runRetrieve: body.runRetrieve as boolean | undefined,
        autoRefresh: body.autoRefresh as boolean | undefined
      })
    });
  } catch (error) {
    return upstreamErrorResponse('POST /api/org/retrieve', error);
  }
}
