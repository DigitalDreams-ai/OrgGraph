import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describeToolStatusSource } from '../app/shell/org-status-surface';
import { deriveRuntimeGateState } from '../app/shell/runtime-gate';
import { ConnectWorkspace } from '../app/workspaces/connect/connect-workspace';
import { RefreshWorkspace } from '../app/workspaces/refresh/refresh-workspace';
import { buildStructuredSnapshot } from '../app/workspaces/system/runtime-status';
import { SystemWorkspace } from '../app/workspaces/system/system-workspace';

function run(): void {
  assert.equal(describeToolStatusSource('runtime_unavailable'), 'runtime unavailable');
  assert.equal(describeToolStatusSource('live'), 'live status');
  assert.equal(describeToolStatusSource('unknown'), 'status not loaded');

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
}

run();
