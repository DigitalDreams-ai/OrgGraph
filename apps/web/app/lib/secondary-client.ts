import type { QueryResponse } from './ask-client';
import { isDesktopDirectApiMode, resolveDesktopApiUrl } from './runtime-mode';

export type SecondaryQueryKind =
  | 'perms'
  | 'permsDiagnose'
  | 'permsSystem'
  | 'automation'
  | 'impact'
  | 'metaContext'
  | 'metaAdapt';

async function parseBoundaryResponse(res: Response): Promise<QueryResponse> {
  const text = await res.text();

  try {
    const parsed = JSON.parse(text) as QueryResponse;
    return {
      ok: typeof parsed.ok === 'boolean' ? parsed.ok : res.ok,
      statusCode: typeof parsed.statusCode === 'number' ? parsed.statusCode : res.status,
      payload: parsed.payload,
      error: parsed.error
    };
  } catch {
    return {
      ok: false,
      statusCode: res.status,
      error: { message: text }
    };
  }
}

function appendParam(params: URLSearchParams, key: string, value: unknown): void {
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
}

function buildDirectRequest(kind: SecondaryQueryKind, payload: Record<string, unknown>): { url: string; init: RequestInit } {
  const params = new URLSearchParams();
  if (kind === 'perms') {
    appendParam(params, 'user', payload.user);
    appendParam(params, 'object', payload.object);
    appendParam(params, 'field', payload.field);
    appendParam(params, 'limit', payload.limit);
    return { url: resolveDesktopApiUrl(`/perms?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'permsDiagnose') {
    appendParam(params, 'user', payload.user);
    return { url: resolveDesktopApiUrl(`/perms/diagnose?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'permsSystem') {
    appendParam(params, 'user', payload.user);
    appendParam(params, 'permission', payload.permission);
    appendParam(params, 'limit', payload.limit);
    return { url: resolveDesktopApiUrl(`/perms/system?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'automation') {
    appendParam(params, 'object', payload.object);
    appendParam(params, 'limit', payload.limit);
    appendParam(params, 'strict', payload.strict);
    appendParam(params, 'explain', payload.explain);
    appendParam(params, 'includeLowConfidence', payload.includeLowConfidence);
    return { url: resolveDesktopApiUrl(`/automation?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'impact') {
    appendParam(params, 'field', payload.field);
    appendParam(params, 'limit', payload.limit);
    appendParam(params, 'strict', payload.strict);
    appendParam(params, 'debug', payload.debug);
    appendParam(params, 'explain', payload.explain);
    appendParam(params, 'includeLowConfidence', payload.includeLowConfidence);
    return { url: resolveDesktopApiUrl(`/impact?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'metaContext') {
    return { url: resolveDesktopApiUrl('/meta/context'), init: { method: 'GET' } };
  }
  return {
    url: resolveDesktopApiUrl('/meta/adapt'),
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dryRun: typeof payload.dryRun === 'boolean' ? payload.dryRun : undefined
      })
    }
  };
}

export async function runSecondaryQueryRequest(
  kind: SecondaryQueryKind,
  payload: Record<string, unknown> = {}
): Promise<QueryResponse> {
  if (!isDesktopDirectApiMode()) {
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, payload })
    });
    return parseBoundaryResponse(response);
  }

  const direct = buildDirectRequest(kind, payload);
  const response = await fetch(direct.url, direct.init);
  return parseBoundaryResponse(response);
}
