import { badRequestResponse, API_BASE, proxyUpstreamJson, upstreamErrorResponse } from '../_lib/upstream';

interface RefreshRequestBody {
  mode?: unknown;
}

function summarizeRefreshPayload(upstreamPayload: unknown): unknown {
  if (typeof upstreamPayload !== 'object' || upstreamPayload === null) {
    return upstreamPayload;
  }

  const payload = upstreamPayload as Record<string, unknown>;
  const driftPolicy =
    typeof payload.driftPolicy === 'object' && payload.driftPolicy !== null
      ? (payload.driftPolicy as Record<string, unknown>)
      : undefined;
  const driftEvaluation =
    typeof payload.driftEvaluation === 'object' && payload.driftEvaluation !== null
      ? (payload.driftEvaluation as Record<string, unknown>)
      : undefined;
  const ontology =
    typeof payload.ontology === 'object' && payload.ontology !== null
      ? (payload.ontology as Record<string, unknown>)
      : undefined;
  const parserStats = Array.isArray(payload.parserStats) ? payload.parserStats : [];

  return {
    snapshotId: payload.snapshotId,
    mode: payload.mode,
    rebaselineApplied: payload.rebaselineApplied === true,
    skipped: payload.skipped === true,
    skipReason: payload.skipReason,
    nodeCount: payload.nodeCount,
    edgeCount: payload.edgeCount,
    evidenceCount: payload.evidenceCount,
    elapsedMs: payload.elapsedMs,
    sourcePath: payload.sourcePath,
    databasePath: payload.databasePath,
    evidenceIndexPath: payload.evidenceIndexPath,
    meaningChangeSummary: payload.meaningChangeSummary,
    parserCount: parserStats.length,
    parserNames: parserStats
      .map((entry) =>
        typeof entry === 'object' && entry !== null && typeof (entry as Record<string, unknown>).parser === 'string'
          ? ((entry as Record<string, unknown>).parser as string)
          : undefined
      )
      .filter((value): value is string => Boolean(value)),
    ontology: {
      violationCount: ontology?.violationCount ?? 0,
      warningCount: ontology?.warningCount ?? 0
    },
    driftPolicy: {
      policyId: driftPolicy?.policyId,
      enforceOnRefresh: driftPolicy?.enforceOnRefresh
    },
    driftEvaluation: {
      withinBudget: driftEvaluation?.withinBudget,
      isBootstrap: driftEvaluation?.isBootstrap,
      summary: driftEvaluation?.summary,
      violationCount: Array.isArray(driftEvaluation?.violations) ? driftEvaluation?.violations.length : 0
    },
    driftReportPath: payload.driftReportPath
  };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as RefreshRequestBody;
    if (body.mode !== undefined && body.mode !== 'full' && body.mode !== 'incremental') {
      return badRequestResponse('mode must be one of: full, incremental');
    }

    return proxyUpstreamJson(
      'POST /api/refresh',
      `${API_BASE}/refresh`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: body.mode as 'full' | 'incremental' | undefined,
          summaryOnly: true
        })
      },
      summarizeRefreshPayload
    );
  } catch (error) {
    return upstreamErrorResponse('POST /api/refresh', error);
  }
}
