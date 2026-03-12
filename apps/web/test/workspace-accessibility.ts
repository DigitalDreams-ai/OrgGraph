import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AskWorkspace } from '../app/workspaces/ask/ask-workspace';
import { BrowserWorkspace } from '../app/workspaces/browser/browser-workspace';
import { ConnectWorkspace } from '../app/workspaces/connect/connect-workspace';
import { RefreshWorkspace } from '../app/workspaces/refresh/refresh-workspace';
import { WorkspaceNav } from '../app/shell/workspace-nav';

function run(): void {
  const askMarkup = renderToStaticMarkup(
    createElement(AskWorkspace, {
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      buildVersion: 'dev-local',
      latestRetrieve: null,
      latestRetrieveSelections: [],
      askQuery: 'What touches Opportunity.StageName?',
      setAskQuery: () => undefined,
      maxCitationsRaw: '10',
      setMaxCitationsRaw: () => undefined,
      consistencyCheck: true,
      setConsistencyCheck: () => undefined,
      includeLowConfidence: false,
      setIncludeLowConfidence: () => undefined,
      askElaboration: '',
      askResult: null,
      askSummary: 'Opportunity.StageName impact summary.',
      askTrust: 'trusted',
      askProofId: 'proof_123',
      askReplayToken: 'trace_123',
      askCitations: [],
      loading: false,
      trustTone: () => 'good',
      onRunAsk: () => undefined,
      onRunAskElaboration: () => undefined,
      onOpenConnect: () => undefined,
      onRefreshAliases: () => undefined,
      onOpenBrowser: () => undefined,
      onOpenRefresh: () => undefined,
      onInspectAutomation: () => undefined,
      onInspectPermissions: () => undefined,
      onOpenProof: () => undefined,
      onSaveToHistory: () => undefined
    })
  );
  assert.match(askMarkup, /for="askQuery"/);
  assert.match(askMarkup, /id="askQuery"/);
  assert.match(askMarkup, /role="status" aria-live="polite">Opportunity\.StageName impact summary\./);

  const connectMarkup = renderToStaticMarkup(
    createElement(ConnectWorkspace, {
      orgAlias: 'shulman-uat',
      setOrgAlias: () => undefined,
      activeAlias: 'shulman-uat',
      sessionStatus: 'connected',
      orgStatus: {
        cci: { installed: true, version: '4.5.0', versionPinned: true },
        sf: { installed: true },
        session: { status: 'connected' }
      },
      orgPreflight: {
        checks: {
          aliasAuthenticated: true,
          cciAliasAvailable: true,
          parsePathPresent: true,
          sessionConnected: true
        }
      },
      orgAliases: null,
      orgSessionHistory: null,
      orgSession: null,
      aliasInventory: [],
      recentSessionEvents: [],
      selectedAlias: null,
      preflightIssues: [{ severity: 'warning', code: 'missing_parse_path', message: 'Parse path missing.' }],
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
    })
  );
  assert.match(connectMarkup, /for="orgAlias"/);
  assert.match(connectMarkup, /id="orgAlias"/);
  assert.match(connectMarkup, /Readiness blockers and warnings/);
  assert.match(connectMarkup, /role="status" aria-live="polite"/);

  const browserMarkup = renderToStaticMarkup(
    createElement(BrowserWorkspace, {
      activeAlias: 'shulman-uat',
      selectedAlias: 'shulman-uat',
      metadataSearch: 'Opportunity',
      setMetadataSearch: () => undefined,
      metadataFamilySearch: '',
      setMetadataFamilySearch: () => undefined,
      metadataMemberSearch: '',
      setMetadataMemberSearch: () => undefined,
      metadataLimitRaw: '200',
      setMetadataLimitRaw: () => undefined,
      metadataForceRefresh: false,
      setMetadataForceRefresh: () => undefined,
      metadataAutoRefresh: true,
      setMetadataAutoRefresh: () => undefined,
      metadataCatalog: {
        source: 'metadata_api',
        refreshedAt: '2026-03-11T00:00:00Z',
        totalTypes: 1,
        types: [
          {
            type: 'CustomField',
            memberCount: 1,
            directoryName: 'objects',
            suffix: 'field-meta.xml',
            inFolder: false,
            metaFile: true
          }
        ]
      },
      metadataSearchResults: [{ kind: 'type', type: 'CustomField', name: 'CustomField', matchField: 'type' }],
      metadataMembersByType: {
        CustomField: {
          source: 'metadata_api',
          refreshedAt: '2026-03-11T00:00:00Z',
          type: 'CustomField',
          totalMembers: 1,
          members: [{ name: 'Opportunity.StageName' }]
        }
      },
      metadataLoadingType: '',
      metadataWarnings: [],
      metadataSelectionsPreview: 'CustomField',
      selectedMetadata: [{ type: 'CustomField' }],
      selectionSummary: { typeCount: 1, memberCount: 0 },
      visibleCatalogTypes: ['CustomField'],
      lastMetadataRetrieve: null,
      metadataCatalogRequested: true,
      loading: false,
      onRefreshTypes: () => undefined,
      onRefreshExplorer: () => undefined,
      onLoadVisibleMembers: () => undefined,
      onClearFilters: () => undefined,
      onClearSelections: () => undefined,
      onLoadMembers: () => undefined,
      getTypeSelectionState: () => 'none' as const,
      isMemberSelected: () => false,
      onSetTypeSelected: () => undefined,
      onSetMemberSelected: () => undefined,
      onSetMembersSelected: () => undefined,
      onRemoveType: () => undefined,
      onRemoveMember: () => undefined,
      onRetrieveSelected: () => undefined,
      onOpenRefresh: () => undefined
    })
  );
  assert.match(browserMarkup, /for="metadataSearch"/);
  assert.match(browserMarkup, /for="metadataFamilySearch"/);
  assert.match(browserMarkup, /for="metadataMemberSearch"/);
  assert.match(browserMarkup, /for="metadataLimit"/);
  assert.match(browserMarkup, /Matching metadata items/);
  assert.match(browserMarkup, /Selection cart/);
  assert.match(browserMarkup, /role="status" aria-live="polite"/);
  assert.match(browserMarkup, /aria-expanded="false"/);

  const refreshMarkup = renderToStaticMarkup(
    createElement(RefreshWorkspace, {
      activeAlias: 'shulman-uat',
      selectedAlias: 'shulman-uat',
      retrieveHandoff: null,
      retrieveSelections: [],
      refreshMode: 'incremental',
      setRefreshMode: () => undefined,
      fromSnapshot: '',
      setFromSnapshot: () => undefined,
      toSnapshot: '',
      setToSnapshot: () => undefined,
      orgRunAuth: true,
      setOrgRunAuth: () => undefined,
      orgRunRetrieve: false,
      setOrgRunRetrieve: () => undefined,
      orgAutoRefresh: true,
      setOrgAutoRefresh: () => undefined,
      lastRefreshRun: null,
      lastDiffRun: null,
      lastOrgRetrieveRun: null,
      loading: false,
      onRunRefresh: () => undefined,
      onRunDiff: () => undefined,
      onRunOrgRetrieve: () => undefined,
      onOpenBrowser: () => undefined
    })
  );
  assert.match(refreshMarkup, /Next action/);
  assert.match(refreshMarkup, /role="status" aria-live="polite"/);

  const navMarkup = renderToStaticMarkup(
    createElement(WorkspaceNav, {
      uiTab: 'ask',
      setUiTab: () => undefined
    })
  );
  assert.match(navMarkup, /role="tablist"/);
  assert.match(navMarkup, /role="tab"/);
  assert.match(navMarkup, /aria-selected="true"/);
}

run();
