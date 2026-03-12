import type { QueryResponse } from './ask-client';
import { resolveDesktopApiUrl } from './runtime-mode';

export type SecondaryQueryKind =
  | 'perms'
  | 'permsDiagnose'
  | 'permsSystem'
  | 'automation'
  | 'impact'
  | 'askTrustDashboard'
  | 'metaContext'
  | 'metaAdapt';

async function parseBoundaryResponse(res: Response): Promise<QueryResponse> {
  const text = await res.text();

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const payload =
      Object.prototype.hasOwnProperty.call(parsed, 'payload') && parsed.payload && typeof parsed.payload === 'object'
        ? (parsed.payload as Record<string, unknown>)
        : parsed;
    const topLevelMessage =
      typeof parsed.message === 'string'
        ? parsed.message
        : Array.isArray(parsed.message)
          ? parsed.message.filter((value): value is string => typeof value === 'string').join('; ')
          : undefined;
    const nestedError =
      parsed.error && typeof parsed.error === 'object'
        ? (parsed.error as { message?: unknown }).message
        : undefined;

    return {
      ok: typeof parsed.ok === 'boolean' ? parsed.ok : res.ok,
      statusCode: typeof parsed.statusCode === 'number' ? parsed.statusCode : res.status,
      payload,
      error:
        typeof nestedError === 'string'
          ? { message: nestedError }
          : typeof topLevelMessage === 'string' && topLevelMessage.length > 0
            ? { message: topLevelMessage }
            : undefined
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

function resolveBoundaryPath(path: string): string {
  return resolveDesktopApiUrl(path);
}

function buildBoundaryRequest(kind: SecondaryQueryKind, payload: Record<string, unknown>): { url: string; init: RequestInit } {
  const params = new URLSearchParams();
  if (kind === 'perms') {
    appendParam(params, 'user', payload.user);
    appendParam(params, 'object', payload.object);
    appendParam(params, 'field', payload.field);
    appendParam(params, 'limit', payload.limit);
    return { url: resolveBoundaryPath(`/perms?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'permsDiagnose') {
    appendParam(params, 'user', payload.user);
    return { url: resolveBoundaryPath(`/perms/diagnose?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'permsSystem') {
    appendParam(params, 'user', payload.user);
    appendParam(params, 'permission', payload.permission);
    appendParam(params, 'limit', payload.limit);
    return { url: resolveBoundaryPath(`/perms/system?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'automation') {
    appendParam(params, 'object', payload.object);
    appendParam(params, 'limit', payload.limit);
    appendParam(params, 'strict', payload.strict);
    appendParam(params, 'explain', payload.explain);
    appendParam(params, 'includeLowConfidence', payload.includeLowConfidence);
    return { url: resolveBoundaryPath(`/automation?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'impact') {
    appendParam(params, 'field', payload.field);
    appendParam(params, 'limit', payload.limit);
    appendParam(params, 'strict', payload.strict);
    appendParam(params, 'debug', payload.debug);
    appendParam(params, 'explain', payload.explain);
    appendParam(params, 'includeLowConfidence', payload.includeLowConfidence);
    return { url: resolveBoundaryPath(`/impact?${params.toString()}`), init: { method: 'GET' } };
  }
  if (kind === 'askTrustDashboard') {
    return { url: resolveBoundaryPath('/ask/trust/dashboard'), init: { method: 'GET' } };
  }
  if (kind === 'metaContext') {
    return { url: resolveBoundaryPath('/meta/context'), init: { method: 'GET' } };
  }
  return {
    url: resolveBoundaryPath('/meta/adapt'),
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
  const request = buildBoundaryRequest(kind, payload);
  const response = await fetch(request.url, request.init);
  return parseBoundaryResponse(response);
}
