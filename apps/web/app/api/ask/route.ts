import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../_lib/upstream';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    return await proxyUpstreamJson(
      'POST /api/ask',
      `${API_BASE}/ask`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          query: body.query,
          maxCitations: typeof body.maxCitations === 'number' ? body.maxCitations : 5,
          includeLowConfidence:
            typeof body.includeLowConfidence === 'boolean' ? body.includeLowConfidence : undefined,
          consistencyCheck:
            typeof body.consistencyCheck === 'boolean' ? body.consistencyCheck : undefined,
          context: typeof body.context === 'object' && body.context !== null ? body.context : undefined
        })
      }
    );
  } catch (error) {
    return upstreamErrorResponse('POST /api/ask', error);
  }
}
