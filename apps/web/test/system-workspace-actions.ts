import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemWorkspace } from '../app/workspaces/system/system-workspace';
import type { ReadyPayload } from '../app/shell/use-shell-runtime';
import type { OrgPreflightPayload, OrgStatusPayload } from '../app/workspaces/connect/types';
import type {
  AskTrustDashboardPayload,
  MetaAdaptPayload,
  MetaContextPayload,
  RuntimeMetricsPayload
} from '../app/workspaces/system/types';

function buildReadyPayload(): ReadyPayload {
  return {
    status: 'ready',
    checks: {
      bootstrap: { ok: true, status: 'ready', message: 'bootstrap ready' },
      db: { ok: true, backend: 'sqlite', nodeCount: 10, edgeCount: 20 },
      fixtures: { ok: true, sourcePath: 'C:/tmp/fixtures' },
      evidence: { ok: true, indexPath: 'C:/tmp/evidence.json' }
    }
  };
}

function buildOrgStatus(): OrgStatusPayload {
  return {
    integrationEnabled: true,
    authMode: 'sf_cli_keychain',
    alias: 'fixture-org',
    sf: { installed: true, message: 'sf ok' },
    cci: { installed: true, message: 'cci ok' },
    session: { status: 'connected', activeAlias: 'fixture-org' }
  } as OrgStatusPayload;
}

function buildOrgPreflight(): OrgPreflightPayload {
  return {
    issues: [
      {
        severity: 'warning',
        code: 'CCI_ALIAS_MISSING',
        message: 'CCI alias fixture-org missing',
        remediation: 'Bridge the alias in Org Sessions, then rerun preflight.'
      }
    ],
    checks: {
      aliasAuthenticated: true,
      cciAliasAvailable: false,
      parsePathPresent: true,
      sessionConnected: true
    }
  } as OrgPreflightPayload;
}

function buildMetaContext(): MetaContextPayload {
  return {
    status: 'implemented',
    context: {
      version: 'ctx_v1',
      updatedAt: '2026-03-12T20:00:00Z',
      relationMultipliers: {
        impacts: 1.2,
        reads: 0.9
      },
      provenance: {
        formulaVersion: 'formula_v1',
        metricsSampleSize: 12,
        trustedByIntent: {
          impact: 7
        },
        refusedByIntent: {
          review: 1
        }
      }
    }
  };
}

function buildMetaAdaptResult(): MetaAdaptPayload {
  return {
    status: 'implemented',
    dryRun: true,
    changed: true,
    contextPath: 'C:/Users/sean/AppData/Roaming/Orgumented/meta/context-with-a-very-long-path.json',
    auditArtifactPath: 'C:/Users/sean/AppData/Roaming/Orgumented/meta/audit/very-long-adapt-audit-artifact.json',
    before: buildMetaContext().context,
    after: {
      version: 'ctx_v2',
      updatedAt: '2026-03-12T21:00:00Z',
      relationMultipliers: {
        impacts: 1.4,
        writes: 1.1
      },
      provenance: {
        formulaVersion: 'formula_v2',
        metricsSampleSize: 16,
        trustedByIntent: {
          impact: 8
        },
        refusedByIntent: {
          review: 1
        }
      }
    }
  };
}

function buildAskTrustDashboard(): AskTrustDashboardPayload {
  return {
    status: 'implemented',
    generatedAt: '2026-03-12T20:00:00Z',
    totals: {
      askRecords: 10,
      proofArtifacts: 9,
      trusted: 7,
      conditional: 2,
      refused: 1
    },
    replayPassRate: 0.9,
    proofCoverageRate: 0.9,
    driftTrend: {
      snapshotCount: 2,
      latestSnapshotId: 'snap_latest',
      previousSnapshotId: 'snap_previous'
    },
    failureClasses: [
      { class: 'llm_fallback', count: 1 },
      { class: 'policy_refusal', count: 1 },
      { class: 'constraint_risk', count: 2 },
      { class: 'none', count: 6 }
    ]
  };
}

function buildRuntimeMetrics(): RuntimeMetricsPayload {
  return {
    status: 'ok',
    dbBackend: 'sqlite',
    totalRequests: 42,
    byRoute: [
      {
        method: 'GET',
        path: '/ready',
        requestCount: 12,
        avgElapsedMs: 14.2,
        lastStatusCode: 200,
        lastSeenAt: '2026-03-12T20:05:00Z'
      },
      {
        method: 'POST',
        path: '/refresh',
        requestCount: 3,
        avgElapsedMs: 185.5,
        lastStatusCode: 500,
        lastSeenAt: '2026-03-12T20:06:00Z'
      },
      {
        method: 'GET',
        path: '/ask/trust/dashboard',
        requestCount: 4,
        avgElapsedMs: 33.1,
        lastStatusCode: 200,
        lastSeenAt: '2026-03-12T20:07:00Z'
      }
    ]
  };
}

function run(): void {
  const markup = renderToStaticMarkup(
    React.createElement(SystemWorkspace, {
      metaDryRun: true,
      setMetaDryRun: () => undefined,
      healthStatus: 'ok',
      readyStatus: 'http_400',
      readyDetails: '{"status":"blocked"}',
      readyPayload: buildReadyPayload(),
      orgStatus: buildOrgStatus(),
      orgPreflight: buildOrgPreflight(),
      runtimeUnavailable: false,
      runtimeBlocked: true,
      toolStatusSource: 'live',
      metaContext: buildMetaContext(),
      metaAdaptResult: buildMetaAdaptResult(),
      askTrustDashboard: buildAskTrustDashboard(),
      runtimeMetrics: buildRuntimeMetrics(),
      loading: false,
      onLoadMetaContext: () => undefined,
      onRunMetaAdapt: () => undefined,
      onLoadOrgStatus: () => undefined,
      onLoadAskTrustDashboard: () => undefined,
      onLoadRuntimeMetrics: () => undefined,
      onRunPreflight: () => undefined,
      onRefreshStatus: () => undefined,
      onOpenConnect: () => undefined,
      onOpenRefresh: () => undefined
    })
  );

  assert.match(markup, /Runtime health quick actions/);
  assert.match(markup, /Toolchain quick actions/);
  assert.match(markup, /Refresh Status/);
  assert.match(markup, /Open Refresh &amp; Build/);
  assert.match(markup, /Ask Trust/);
  assert.match(markup, /Load Org Status/);
  assert.match(markup, /Runtime Telemetry/);
  assert.match(markup, /Run Preflight/);
  assert.match(markup, /Open Org Sessions/);
  assert.match(markup, /Operator triage snapshot/);
  assert.match(markup, /Ask trust telemetry/);
  assert.match(markup, /Replay pass: 90%/);
  assert.match(markup, /Proof coverage: 90%/);
  assert.match(markup, /<span class="path-value">llm_fallback<\/span>: 1/);
  assert.match(markup, /<span class="path-value">constraint_risk<\/span>: 2/);
  assert.match(markup, /Ask trust quick actions/);
  assert.match(markup, /Refresh Ask Trust/);
  assert.match(markup, /Open Runtime Telemetry/);
  assert.match(markup, /<strong>Context path:<\/strong>\s*<span class="path-value">C:\/Users\/sean\/AppData\/Roaming\/Orgumented\/meta\/context-with-a-very-long-path\.json<\/span>/);
  assert.match(markup, /<strong>Audit artifact:<\/strong>\s*<span class="path-value">C:\/Users\/sean\/AppData\/Roaming\/Orgumented\/meta\/audit\/very-long-adapt-audit-artifact\.json<\/span>/);
  assert.match(markup, /Structured change summary/);
  assert.match(markup, /Relation changes/);
  assert.match(markup, />3<\/strong>/);
  assert.match(markup, /Sample delta/);
  assert.match(markup, />\+4<\/strong>/);
  assert.match(markup, /Formula version/);
  assert.match(markup, />changed<\/strong>/);
  assert.match(markup, /Added relations/);
  assert.match(markup, /writes/);
  assert.match(markup, /Removed relations/);
  assert.match(markup, /reads/);
  assert.match(markup, /Updated multipliers/);
  assert.match(markup, /impacts/);
  assert.match(markup, /Meta context quick actions/);
  assert.match(markup, /Refresh Meta Context/);
  assert.match(markup, /Meta adapt quick actions/);
  assert.match(markup, /Rerun Meta Adapt/);
  assert.match(markup, /Runtime telemetry/);
  assert.match(markup, /Route timings and failure signatures/);
  assert.match(markup, /Requests: 42/);
  assert.match(markup, /Failure routes: 1/);
  assert.match(markup, /Hottest route/);
  assert.match(markup, /Slowest route/);
  assert.match(markup, /Latest route/);
  assert.match(markup, /Failure signature:/);
  assert.match(markup, /POST \/refresh/);
  assert.match(markup, /last status 500/);
  assert.match(markup, /Runtime telemetry quick actions/);
  assert.match(markup, /Refresh Runtime Telemetry/);

  const emptyMarkup = renderToStaticMarkup(
    React.createElement(SystemWorkspace, {
      metaDryRun: true,
      setMetaDryRun: () => undefined,
      healthStatus: 'ok',
      readyStatus: 'ready',
      readyDetails: '',
      readyPayload: buildReadyPayload(),
      orgStatus: buildOrgStatus(),
      orgPreflight: buildOrgPreflight(),
      runtimeUnavailable: false,
      runtimeBlocked: false,
      toolStatusSource: 'live',
      metaContext: null,
      metaAdaptResult: null,
      askTrustDashboard: null,
      runtimeMetrics: null,
      loading: false,
      onLoadMetaContext: () => undefined,
      onRunMetaAdapt: () => undefined,
      onLoadOrgStatus: () => undefined,
      onLoadAskTrustDashboard: () => undefined,
      onLoadRuntimeMetrics: () => undefined,
      onRunPreflight: () => undefined,
      onRefreshStatus: () => undefined,
      onOpenConnect: () => undefined,
      onOpenRefresh: () => undefined
    })
  );

  assert.match(emptyMarkup, /Load Meta Context to inspect semantic weighting and provenance\./);
  assert.match(emptyMarkup, /Load Meta Context/);
  assert.match(emptyMarkup, /Run Meta Adapt to inspect deterministic before\/after deltas\./);
  assert.match(emptyMarkup, /Run Meta Adapt/);
}

run();
