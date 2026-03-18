import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConnectWorkspace } from '../app/workspaces/connect/connect-workspace';

function run(): void {
  const longAlias = 'shulman-uat-with-a-very-long-alias-name-that-must-wrap-cleanly';
  const longUsername = 'sbingham.with.a.very.long.username@shulman-hill-with-a-very-long-domain-name.example';
  const longOrgId = '00Dxx000001kjZRUAY-VERY-LONG-ORG-IDENTIFIER-SEGMENT';
  const longInstanceUrl =
    'https://shulman-hill--uat.sandbox.my.salesforce.com/services/data/v62.0/sobjects/Very_Long_Resource_Name_With_Many_Segments';
  const connectMarkup = renderToStaticMarkup(
    React.createElement(ConnectWorkspace, {
      orgAlias: longAlias,
      setOrgAlias: () => undefined,
      activeAlias: longAlias,
      sessionStatus: 'connected',
      orgStatus: {
        integrationEnabled: true,
        authMode: 'sf_cli_keychain',
        sf: { installed: true },
        cci: { installed: true, version: '4.5.0' },
        session: { status: 'connected', connectedAt: '2026-03-13T01:00:00Z' }
      },
      orgPreflight: {
        alias: longAlias,
        checks: {
          aliasAuthenticated: true,
          cciAliasAvailable: true,
          parsePathPresent: true,
          sessionConnected: true
        },
        issues: []
      },
      orgAliases: { activeAlias: longAlias, aliases: [] },
      orgSessionHistory: { restoreAlias: longAlias, events: [] },
      orgSession: { status: 'connected', alias: longAlias, connectedAt: '2026-03-13T01:00:00Z' },
      aliasInventory: [
        {
          alias: longAlias,
          username: longUsername,
          orgId: longOrgId,
          instanceUrl: longInstanceUrl,
          isDefault: true
        }
      ],
      recentSessionEvents: [],
      selectedAlias: {
        alias: longAlias,
        username: longUsername,
        orgId: longOrgId,
        instanceUrl: longInstanceUrl,
        isDefault: true
      },
      preflightIssues: [],
      toolingReady: true,
      toolStatusSource: 'live',
      browserSeeded: true,
      selectedAliasReady: true,
      runtimeUnavailable: false,
      runtimeBlocked: false,
      restoreAlias: longAlias,
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

  assert.match(connectMarkup, /<strong>Alias:<\/strong> <span class="path-value">shulman-uat-with-a-very-long-alias-name-that-must-wrap-cleanly<\/span>/);
  assert.match(
    connectMarkup,
    /<strong>Username:<\/strong> <span class="path-value">sbingham\.with\.a\.very\.long\.username@shulman-hill-with-a-very-long-domain-name\.example<\/span>/
  );
  assert.match(
    connectMarkup,
    /<strong>Instance URL:<\/strong> <span class="path-value">https:\/\/shulman-hill--uat\.sandbox\.my\.salesforce\.com\/services\/data\/v62\.0\/sobjects\/Very_Long_Resource_Name_With_Many_Segments<\/span>/
  );
  assert.match(connectMarkup, /<strong>Active alias:<\/strong> <span class="path-value">shulman-uat-with-a-very-long-alias-name-that-must-wrap-cleanly<\/span>/);
  assert.match(connectMarkup, /<strong><span class="path-value">shulman-uat-with-a-very-long-alias-name-that-must-wrap-cleanly<\/span><\/strong>/);
  assert.match(connectMarkup, /<summary>Advanced session tools<\/summary>/);
  assert.match(connectMarkup, /Bridge CCI Alias<\/button>/);
  assert.doesNotMatch(connectMarkup, /<p class="panel-caption">Operator commands<\/p>/);
}

run();
