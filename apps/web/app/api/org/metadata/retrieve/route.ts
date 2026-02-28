import { badRequestResponse, API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../../_lib/upstream';

interface MetadataSelection {
  type?: unknown;
  members?: unknown;
}

interface MetadataRetrieveBody {
  selections?: unknown;
  autoRefresh?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as MetadataRetrieveBody;
    if (!Array.isArray(body.selections) || body.selections.length === 0) {
      return badRequestResponse('selections must be a non-empty array');
    }
    if (body.autoRefresh !== undefined && typeof body.autoRefresh !== 'boolean') {
      return badRequestResponse('autoRefresh must be a boolean');
    }

    const selections = body.selections.map((item) => {
      const entry = item as MetadataSelection;
      if (!entry || typeof entry !== 'object') {
        throw new Error('each selection must be an object');
      }
      if (typeof entry.type !== 'string' || entry.type.trim().length === 0) {
        throw new Error('selection.type must be a non-empty string');
      }
      if (entry.members !== undefined && (!Array.isArray(entry.members) || entry.members.some((m) => typeof m !== 'string'))) {
        throw new Error('selection.members must be an array of strings');
      }
      return {
        type: entry.type.trim(),
        members: (entry.members as string[] | undefined)?.map((m) => m.trim()).filter((m) => m.length > 0)
      };
    });

    return proxyUpstreamJson('POST /api/org/metadata/retrieve', `${API_BASE}/org/metadata/retrieve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        selections,
        autoRefresh: body.autoRefresh as boolean | undefined
      })
    });
  } catch (error) {
    if (error instanceof Error) {
      return badRequestResponse(error.message);
    }
    return upstreamErrorResponse('POST /api/org/metadata/retrieve', error);
  }
}
