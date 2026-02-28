import { API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../../_lib/upstream';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    return await proxyUpstreamJson(
      'POST /api/ask/replay',
      `${API_BASE}/ask/replay`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          replayToken: body.replayToken,
          proofId: body.proofId
        })
      }
    );
  } catch (error) {
    return upstreamErrorResponse('POST /api/ask/replay', error);
  }
}
