import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SystemWorkspace } from '../app/workspaces/system/system-workspace';
import type { ReadyPayload } from '../app/shell/use-shell-runtime';
import type { OrgPreflightPayload, OrgStatusPayload } from '../app/workspaces/connect/types';

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
      metaContext: null,
      metaAdaptResult: null,
      loading: false,
      onLoadMetaContext: () => undefined,
      onRunMetaAdapt: () => undefined,
      onLoadOrgStatus: () => undefined,
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
  assert.match(markup, /Load Org Status/);
  assert.match(markup, /Run Preflight/);
  assert.match(markup, /Open Org Sessions/);
  assert.match(markup, /Operator triage snapshot/);
}

run();
