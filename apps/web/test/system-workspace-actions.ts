import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemWorkspace } from '../app/workspaces/system/system-workspace';
import type { ReadyPayload } from '../app/shell/use-shell-runtime';
import type { OrgPreflightPayload, OrgStatusPayload } from '../app/workspaces/connect/types';
import type {
  AskTrustDashboardPayload,
  MetaAdaptPayload,
  MetaContextPayload
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
    after: buildMetaContext().context
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
      loading: false,
      onLoadMetaContext: () => undefined,
      onRunMetaAdapt: () => undefined,
      onLoadOrgStatus: () => undefined,
      onLoadAskTrustDashboard: () => undefined,
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
  assert.match(markup, /Run Preflight/);
  assert.match(markup, /Open Org Sessions/);
  assert.match(markup, /Operator triage snapshot/);
  assert.match(markup, /Ask trust telemetry/);
  assert.match(markup, /Replay pass: 90%/);
  assert.match(markup, /Proof coverage: 90%/);
  assert.match(markup, /llm_fallback: 1/);
  assert.match(markup, /<strong>Context path:<\/strong>\s*<span class="path-value">C:\/Users\/sean\/AppData\/Roaming\/Orgumented\/meta\/context-with-a-very-long-path\.json<\/span>/);
  assert.match(markup, /<strong>Audit artifact:<\/strong>\s*<span class="path-value">C:\/Users\/sean\/AppData\/Roaming\/Orgumented\/meta\/audit\/very-long-adapt-audit-artifact\.json<\/span>/);
}

run();
