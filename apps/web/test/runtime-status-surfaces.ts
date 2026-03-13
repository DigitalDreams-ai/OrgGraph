import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OperatorRail } from '../app/shell/operator-rail';
import { describeToolStatusSource } from '../app/shell/org-status-surface';
import { deriveRuntimeGateState, describeReadySurfaceStatus } from '../app/shell/runtime-gate';
import { StatusStrip } from '../app/shell/status-strip';
import { ConnectWorkspace } from '../app/workspaces/connect/connect-workspace';
import { RefreshWorkspace } from '../app/workspaces/refresh/refresh-workspace';
import { buildStructuredSnapshot } from '../app/workspaces/system/runtime-status';
import { SystemWorkspace } from '../app/workspaces/system/system-workspace';

function run(): void {
  assert.equal(describeToolStatusSource('runtime_unavailable'), 'runtime unavailable');
  assert.equal(describeToolStatusSource('live'), 'live status');
  assert.equal(describeToolStatusSource('unknown'), 'status not loaded');
  assert.equal(describeReadySurfaceStatus('ready'), 'ready');
  assert.equal(describeReadySurfaceStatus('http_400'), 'blocked');
  assert.equal(describeReadySurfaceStatus('unreachable'), 'unreachable');
  assert.equal(describeReadySurfaceStatus('unknown'), 'unknown');

  assert.equal(
    deriveRuntimeGateState({
      healthStatus: 'ok',
      readyStatus: 'ready',
      orgRuntimeUnavailable: false
    }),
    'ready'
  );
  assert.equal(
    deriveRuntimeGateState({
      healthStatus: 'ok',
      readyStatus: 'http_400',
      orgRuntimeUnavailable: false
    }),
    'blocked'
  );
  assert.equal(
    deriveRuntimeGateState({
      healthStatus: 'ok',
      readyStatus: 'ready',
      orgRuntimeUnavailable: true
    }),
    'unreachable'
  );

  const unreachableSnapshot = buildStructuredSnapshot({
    runtimeGateState: 'unreachable',
    healthStatus: 'unreachable',
    readyStatus: 'unreachable',
    runtimeIssues: [],
    orgStatus: null,
    preflightIssues: [],
    preflightChecks: undefined
  });
  assert.equal(unreachableSnapshot[1]?.title, 'Toolchain status');
  assert.equal(unreachableSnapshot[1]?.status, 'bad');
  assert.match(unreachableSnapshot[1]?.detail ?? '', /runtime is unreachable/i);
  assert.match(unreachableSnapshot[1]?.nextAction ?? '', /restore runtime first/i);
  assert.deepEqual(
    unreachableSnapshot[1]?.actions.map((action) => action.id),
    ['refresh-status', 'load-org-status']
  );

  const blockedSnapshot = buildStructuredSnapshot({
    runtimeGateState: 'blocked',
    healthStatus: 'ok',
    readyStatus: 'http_400',
    runtimeIssues: [],
    orgStatus: {
      integrationEnabled: true,
      sf: { installed: true },
      cci: { installed: true },
      session: { status: 'connected' }
    },
    preflightIssues: [],
    preflightChecks: {
      aliasAuthenticated: true,
      cciAliasAvailable: true,
      sessionConnected: true
    }
  });
  assert.equal(blockedSnapshot[1]?.status, 'warning');
  assert.match(blockedSnapshot[1]?.detail ?? '', /still readable/i);
  assert.match(blockedSnapshot[1]?.nextAction ?? '', /runtime readiness first/i);
  assert.deepEqual(
    blockedSnapshot[1]?.actions.map((action) => action.id),
    ['refresh-status', 'load-org-status', 'run-preflight']
  );
  assert.equal(blockedSnapshot[2]?.status, 'warning');
  assert.match(blockedSnapshot[2]?.detail ?? '', /fail-closed/i);
  assert.deepEqual(
    blockedSnapshot[2]?.actions.map((action) => action.id),
    ['refresh-status', 'open-connect']
  );

  const connectMarkup = renderToStaticMarkup(
    React.createElement(ConnectWorkspace, {
      orgAlias: 'shulman-uat',
      setOrgAlias: () => undefined,
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      orgStatus: {
        integrationEnabled: true,
        authMode: 'sf_cli_keychain',
        sf: { installed: true },
        cci: { installed: true, version: '4.5.0' },
        session: { status: 'connected' }
      },
      orgPreflight: {
        alias: 'shulman-uat',
        checks: {
          aliasAuthenticated: true,
          cciAliasAvailable: true,
          parsePathPresent: true,
          sessionConnected: true
        },
        issues: []
      },
      orgAliases: { activeAlias: 'shulman-uat', aliases: [] },
      orgSessionHistory: { restoreAlias: 'shulman-uat', events: [] },
      orgSession: { status: 'connected', alias: 'shulman-uat' },
      aliasInventory: [],
      recentSessionEvents: [],
      selectedAlias: {
        alias: 'shulman-uat',
        username: 'sbingham@example.com',
        orgId: '00Dxx000001kjZRUAY',
        instanceUrl: 'https://shulman-hill--uat.sandbox.my.salesforce.com',
        isDefault: true
      },
      preflightIssues: [],
      toolingReady: true,
      toolStatusSource: 'live',
      browserSeeded: true,
      selectedAliasReady: true,
      runtimeUnavailable: false,
      runtimeBlocked: false,
      restoreAlias: 'shulman-uat',
      loading: false,
      onRefreshOverview: () => undefined,
      onLoadAliases: () => undefined,
      onCheckSession: () => undefined,
      onLoadSessionHistory: () => undefined,
      onCheckToolStatus: () => undefined,
      onPreflight: () => undefined,
      onBridgeAlias: () => undefined,
      onSwitchAlias: () => undefined,
      onConnectExistingAlias: () => undefined,
      onDisconnect: () => undefined,
      onRestoreLastSession: () => undefined,
      onSelectAlias: () => undefined,
      onInspectAlias: () => undefined
    } as any)
  );
  assert.match(connectMarkup, /Org ID:<\/strong> <span class="path-value">00Dxx000001kjZRUAY<\/span>/);
  assert.match(connectMarkup, /Instance URL:<\/strong> <span class="path-value">https:\/\/shulman-hill--uat\.sandbox\.my\.salesforce\.com<\/span>/);
  assert.match(connectMarkup, /<pre class="diagnostic-code-block"># 1\) Authenticate in sf keychain/);

  const connectUnavailableMarkup = renderToStaticMarkup(
    React.createElement(ConnectWorkspace, {
      orgAlias: 'shulman-uat',
      setOrgAlias: () => undefined,
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      orgStatus: null,
      orgPreflight: null,
      orgAliases: null,
      orgSessionHistory: null,
      orgSession: null,
      aliasInventory: [],
      recentSessionEvents: [],
      selectedAlias: null,
      preflightIssues: [],
      toolingReady: false,
      toolStatusSource: 'runtime_unavailable',
      browserSeeded: false,
      selectedAliasReady: false,
      runtimeUnavailable: true,
      runtimeBlocked: true,
      restoreAlias: '',
      loading: false,
      onRefreshOverview: () => undefined,
      onLoadAliases: () => undefined,
      onCheckSession: () => undefined,
      onLoadSessionHistory: () => undefined,
      onCheckToolStatus: () => undefined,
      onPreflight: () => undefined,
      onBridgeAlias: () => undefined,
      onSwitchAlias: () => undefined,
      onConnectExistingAlias: () => undefined,
      onDisconnect: () => undefined,
      onRestoreLastSession: () => undefined,
      onSelectAlias: () => undefined,
      onInspectAlias: () => undefined
    } as any)
  );
  assert.match(connectUnavailableMarkup, /Session: runtime unavailable/);
  assert.match(connectUnavailableMarkup, /Tooling status: unavailable/);
  assert.match(connectUnavailableMarkup, /Runtime is unavailable, so tool checks are blocked\./);

  const statusStripBlockedMarkup = renderToStaticMarkup(
    React.createElement(StatusStrip, {
      healthStatus: 'ok',
      readyStatus: 'http_400',
      sessionStatus: 'connected',
      askTrust: 'waiting'
    })
  );
  assert.match(statusStripBlockedMarkup, /API Health<\/span><strong>ok<\/strong>/);
  assert.match(statusStripBlockedMarkup, /API Ready<\/span><strong>blocked<\/strong>/);
  assert.match(statusStripBlockedMarkup, /Org Session<\/span><strong>connected<\/strong>/);

  const statusStripUnavailableMarkup = renderToStaticMarkup(
    React.createElement(StatusStrip, {
      healthStatus: 'unreachable',
      readyStatus: 'unreachable',
      sessionStatus: 'runtime unavailable',
      askTrust: 'waiting'
    })
  );
  assert.match(statusStripUnavailableMarkup, /API Ready<\/span><strong>unreachable<\/strong>/);
  assert.match(statusStripUnavailableMarkup, /Org Session<\/span><strong>runtime unavailable<\/strong>/);

  const refreshMarkup = renderToStaticMarkup(
    React.createElement(RefreshWorkspace, {
      activeAlias: 'shulman-uat',
      selectedAlias: 'shulman-uat',
      retrieveHandoff: {
        alias: 'shulman-uat',
        completedAt: '2026-03-11T00:00:00Z',
        parsePath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\sf-project\\force-app\\main\\default',
        metadataArgs: ['Flow:Civil_Rights_Intake_Questionnaire'],
        autoRefresh: true,
        status: 'completed',
        refresh: { nodeCount: 1, edgeCount: 2, evidenceCount: 3 }
      },
      retrieveSelections: [],
      refreshMode: 'incremental',
      setRefreshMode: () => undefined,
      fromSnapshot: '',
      setFromSnapshot: () => undefined,
      toSnapshot: '',
      setToSnapshot: () => undefined,
      orgRunAuth: true,
      setOrgRunAuth: () => undefined,
      orgRunRetrieve: true,
      setOrgRunRetrieve: () => undefined,
      orgAutoRefresh: true,
      setOrgAutoRefresh: () => undefined,
      lastRefreshRun: {
        snapshotId: 'snap_1234567890abcdef',
        sourcePath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\sf-project\\force-app\\main\\default',
        nodeCount: 10,
        edgeCount: 20,
        evidenceCount: 30,
        meaningChangeSummary: 'n/a',
        driftSummary: 'within budget',
        driftWithinBudget: true,
        skipped: false
      },
      lastDiffRun: null,
      lastOrgRetrieveRun: {
        status: 'completed',
        alias: 'shulman-uat',
        completedAt: '2026-03-11T00:00:00Z',
        projectPath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\sf-project',
        parsePath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\sf-project\\force-app\\main\\default',
        metadataArgs: ['CustomField:Opportunity.StageName'],
        stepSummary: []
      },
      loading: false,
      onRunRefresh: () => undefined,
      onRunDiff: () => undefined,
      onRunOrgRetrieve: () => undefined,
      onOpenBrowser: () => undefined
    } as any)
  );
  assert.match(refreshMarkup, /Parse path:<\/strong> <span class="path-value">C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\sf-project\\force-app\\main\\default<\/span>/);
  assert.match(refreshMarkup, /Metadata args:<\/strong> <span class="path-value">Flow:Civil_Rights_Intake_Questionnaire<\/span>/);
  assert.match(refreshMarkup, /Project path:<\/strong> <span class="path-value">C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\sf-project<\/span>/);

  const operatorRailUnavailableMarkup = renderToStaticMarkup(
    React.createElement(OperatorRail, {
      copied: false,
      responseText: '',
      errorText: '',
      readyDetails: '',
      readyPayload: null,
      askSummary: 'Run Ask to generate a decision packet.',
      askTrust: 'waiting',
      askResult: null,
      askProofId: '',
      askReplayToken: '',
      sessionStatus: 'connected',
      activeAlias: 'shulman-uat',
      orgSession: null,
      orgStatus: null,
      orgPreflight: null,
      runtimeUnavailable: true,
      runtimeBlocked: true,
      toolStatusSource: 'runtime_unavailable',
      onCopy: () => undefined
    })
  );
  assert.match(operatorRailUnavailableMarkup, /Session:<\/strong> runtime unavailable/);
  assert.match(operatorRailUnavailableMarkup, /sf Installed:<\/strong> unavailable/);
  assert.match(operatorRailUnavailableMarkup, /CCI Installed:<\/strong> unavailable/);
  assert.match(operatorRailUnavailableMarkup, /Runtime Gate:<\/strong> unreachable/);

  const operatorRailBlockedMarkup = renderToStaticMarkup(
    React.createElement(OperatorRail, {
      copied: false,
      responseText: '',
      errorText: '',
      readyDetails: '',
      readyPayload: { status: 'blocked', checks: { db: { ok: true, backend: 'sqlite', nodeCount: 1, edgeCount: 2 } } } as any,
      askSummary: 'Run Ask to generate a decision packet.',
      askTrust: 'waiting',
      askResult: null,
      askProofId: '',
      askReplayToken: '',
      sessionStatus: 'connected',
      activeAlias: 'shulman-uat',
      orgSession: { status: 'connected', alias: 'shulman-uat' } as any,
      orgStatus: { integrationEnabled: true, authMode: 'sf_cli_keychain', sf: { installed: true }, cci: { installed: true }, session: { status: 'connected' } } as any,
      orgPreflight: null,
      runtimeUnavailable: false,
      runtimeBlocked: true,
      toolStatusSource: 'live',
      onCopy: () => undefined
    })
  );
  assert.match(operatorRailBlockedMarkup, /Session:<\/strong> connected/);
  assert.match(operatorRailBlockedMarkup, /sf Installed:<\/strong> yes/);
  assert.match(operatorRailBlockedMarkup, /CCI Installed:<\/strong> yes/);
  assert.match(operatorRailBlockedMarkup, /Runtime Gate:<\/strong> blocked/);

  const systemMarkup = renderToStaticMarkup(
    React.createElement(SystemWorkspace, {
      metaDryRun: true,
      setMetaDryRun: () => undefined,
      healthStatus: 'ok',
      readyStatus: 'ready',
      readyDetails: '{"status":"ready","checks":{"db":{"ok":true}}}',
      readyPayload: { status: 'ready', checks: { db: { ok: true, backend: 'sqlite', storageRef: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\org.db', nodeCount: 1, edgeCount: 2 } } },
      orgStatus: null,
      orgPreflight: null,
      runtimeUnavailable: false,
      runtimeBlocked: false,
      toolStatusSource: 'live',
      metaContext: null,
      metaAdaptResult: {
        status: 'completed',
        dryRun: true,
        changed: false,
        contextPath: 'C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\meta-context.json',
        auditArtifactPath: 'C:\\Users\\sean\\Projects\\GitHub\\OrgGraph\\logs\\meta-adapt-audit.json',
        before: { relationMultipliers: {} },
        after: { relationMultipliers: {} }
      },
      loading: false,
      onLoadMetaContext: () => undefined,
      onRunMetaAdapt: () => undefined,
      onLoadOrgStatus: () => undefined,
      onRunPreflight: () => undefined,
      onRefreshStatus: () => undefined,
      onOpenConnect: () => undefined,
      onOpenRefresh: () => undefined
    } as any)
  );
  assert.match(systemMarkup, /<details class="debug-details">/);
  assert.match(systemMarkup, /<pre class="diagnostic-code-block">\{&quot;status&quot;:&quot;ready&quot;/);
  assert.match(systemMarkup, /Context path:<\/strong> <span class="path-value">C:\\Users\\sean\\AppData\\Roaming\\Orgumented\\meta-context\.json<\/span>/);
  assert.match(systemMarkup, /Structured change summary/);
  assert.match(systemMarkup, /Relation changes<\/span><strong>0<\/strong>/);

  const systemBlockedMarkup = renderToStaticMarkup(
    React.createElement(SystemWorkspace, {
      metaDryRun: true,
      setMetaDryRun: () => undefined,
      healthStatus: 'ok',
      readyStatus: 'http_400',
      readyDetails: '{"status":"blocked"}',
      readyPayload: { status: 'blocked', checks: { db: { ok: true, backend: 'sqlite', nodeCount: 1, edgeCount: 2 } } },
      orgStatus: {
        integrationEnabled: true,
        sf: { installed: true },
        cci: { installed: true },
        session: { status: 'connected' }
      } as any,
      orgPreflight: null,
      runtimeUnavailable: false,
      runtimeBlocked: true,
      toolStatusSource: 'live',
      metaContext: null,
      metaAdaptResult: null,
      askTrustDashboard: null,
      runtimeMetrics: null,
      loading: false,
      onLoadMetaContext: () => undefined,
      onRunMetaAdapt: () => undefined,
      onLoadAskTrustDashboard: () => undefined,
      onLoadRuntimeMetrics: () => undefined,
      onLoadOrgStatus: () => undefined,
      onRunPreflight: () => undefined,
      onRefreshStatus: () => undefined,
      onOpenConnect: () => undefined,
      onOpenRefresh: () => undefined
    } as any)
  );
  assert.match(systemBlockedMarkup, /Health: ok/);
  assert.match(systemBlockedMarkup, /Ready: blocked/);
}

run();
