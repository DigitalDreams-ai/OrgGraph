import { NextResponse } from 'next/server';
import { API_BASE, fetchWithRetry, upstreamErrorResponse } from '../_lib/upstream';

type QueryKind =
  | 'refresh'
  | 'perms'
  | 'permsDiagnose'
  | 'permsSystem'
  | 'automation'
  | 'impact'
  | 'refreshDiff'
  | 'askArchitecture'
  | 'askSimulate'
  | 'askSimulateCompare'
  | 'askTrustDashboard'
  | 'metaContext'
  | 'metaAdapt';

interface QueryRequest {
  kind?: QueryKind;
  endpoint?: QueryKind;
  payload?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

function summarizeUpstreamPayload(kind: QueryKind, upstreamPayload: unknown): unknown {
  if (kind !== 'refresh' || typeof upstreamPayload !== 'object' || upstreamPayload === null) {
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

function buildUpstream(request: QueryRequest): { url: string; init: RequestInit } {
  const body = request.payload ?? {};
  const appendParam = (params: URLSearchParams, key: string, value: unknown): void => {
    if (typeof value === 'string' && value.length > 0) {
      params.set(key, value);
      return;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      params.set(key, String(value));
      return;
    }
    if (typeof value === 'boolean') {
      params.set(key, String(value));
    }
  };

  if (request.kind === 'refresh') {
    return {
      url: `${API_BASE}/refresh`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, summaryOnly: true })
      }
    };
  }

  if (request.kind === 'refreshDiff') {
    const from = typeof body.fromSnapshot === 'string' ? body.fromSnapshot : '';
    const to = typeof body.toSnapshot === 'string' ? body.toSnapshot : '';
    return { url: `${API_BASE}/refresh/diff/${encodeURIComponent(from)}/${encodeURIComponent(to)}`, init: { method: 'GET' } };
  }

  if (request.kind === 'askArchitecture') {
    return {
      url: `${API_BASE}/ask/architecture`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          user: body.user,
          object: body.object,
          field: body.field,
          maxPaths: body.maxPaths
        })
      }
    };
  }

  if (request.kind === 'askSimulate') {
    return {
      url: `${API_BASE}/ask/simulate`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          user: body.user,
          object: body.object,
          field: body.field,
          profile: body.profile,
          maxPaths: body.maxPaths,
          proposedChanges: Array.isArray(body.proposedChanges) ? body.proposedChanges : []
        })
      }
    };
  }

  if (request.kind === 'askSimulateCompare') {
    return {
      url: `${API_BASE}/ask/simulate/compare`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scenarioA: body.scenarioA,
          scenarioB: body.scenarioB
        })
      }
    };
  }

  if (request.kind === 'askTrustDashboard') {
    return { url: `${API_BASE}/ask/trust/dashboard`, init: { method: 'GET' } };
  }

  if (request.kind === 'metaContext') {
    return { url: `${API_BASE}/meta/context`, init: { method: 'GET' } };
  }

  if (request.kind === 'metaAdapt') {
    return {
      url: `${API_BASE}/meta/adapt`,
      init: {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          dryRun: typeof body.dryRun === 'boolean' ? body.dryRun : undefined
        })
      }
    };
  }

  if (request.kind === 'perms') {
    const params = new URLSearchParams();
    appendParam(params, 'user', body.user);
    appendParam(params, 'object', body.object);
    appendParam(params, 'field', body.field);
    appendParam(params, 'limit', body.limit);
    return { url: `${API_BASE}/perms?${params.toString()}`, init: { method: 'GET' } };
  }

  if (request.kind === 'permsDiagnose') {
    const params = new URLSearchParams();
    appendParam(params, 'user', body.user);
    return { url: `${API_BASE}/perms/diagnose?${params.toString()}`, init: { method: 'GET' } };
  }

  if (request.kind === 'permsSystem') {
    const params = new URLSearchParams();
    appendParam(params, 'user', body.user);
    appendParam(params, 'permission', body.permission);
    appendParam(params, 'limit', body.limit);
    return { url: `${API_BASE}/perms/system?${params.toString()}`, init: { method: 'GET' } };
  }

  if (request.kind === 'automation') {
    const params = new URLSearchParams();
    appendParam(params, 'object', body.object);
    appendParam(params, 'limit', body.limit);
    appendParam(params, 'strict', body.strict);
    appendParam(params, 'explain', body.explain);
    appendParam(params, 'includeLowConfidence', body.includeLowConfidence);
    return { url: `${API_BASE}/automation?${params.toString()}`, init: { method: 'GET' } };
  }

  if (request.kind === 'impact') {
    const params = new URLSearchParams();
    appendParam(params, 'field', body.field);
    appendParam(params, 'limit', body.limit);
    appendParam(params, 'strict', body.strict);
    appendParam(params, 'debug', body.debug);
    appendParam(params, 'explain', body.explain);
    appendParam(params, 'includeLowConfidence', body.includeLowConfidence);
    return { url: `${API_BASE}/impact?${params.toString()}`, init: { method: 'GET' } };
  }

  throw new Error(`unsupported query kind: ${request.kind}`);
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const json = (await req.json()) as Partial<QueryRequest>;
    const kindRaw = json?.kind ?? json?.endpoint;
    if (!json || typeof kindRaw !== 'string') {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'kind (or endpoint) is required' } },
        { status: 400 }
      );
    }

    const kind = kindRaw as QueryKind;
    if (
      ![
        'refresh',
        'perms',
        'permsDiagnose',
        'permsSystem',
        'automation',
        'impact',
        'refreshDiff',
        'askArchitecture',
        'metaContext',
        'metaAdapt'
      ].includes(kind)
    ) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'invalid query kind' } },
        { status: 400 }
      );
    }

    const payload = (json.payload ?? json.params) as Record<string, unknown> | undefined;
    const upstream = buildUpstream({ kind, payload });
    const upstreamRes = await fetchWithRetry(upstream.url, { ...upstream.init, cache: 'no-store' });

    const contentType = upstreamRes.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const text = await upstreamRes.text();
      return NextResponse.json(
        { ok: upstreamRes.ok, statusCode: upstreamRes.status, payload: { raw: text } },
        { status: upstreamRes.status }
      );
    }

    const upstreamPayload = summarizeUpstreamPayload(kind, await upstreamRes.json());
    return NextResponse.json(
      { ok: upstreamRes.ok, statusCode: upstreamRes.status, payload: upstreamPayload },
      { status: upstreamRes.status }
    );
  } catch (error) {
    return upstreamErrorResponse('POST /api/query', error);
  }
}
