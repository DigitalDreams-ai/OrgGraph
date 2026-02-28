'use client';

import { useEffect, useState } from 'react';
import {
  type QueryResponse
} from './lib/ask-client';
import { runSecondaryQueryRequest, type SecondaryQueryKind } from './lib/secondary-client';
import { OperatorRail } from './shell/operator-rail';
import { useShellPreferences } from './shell/use-shell-preferences';
import { resolveQueryErrorMessage, useResponseInspector } from './shell/use-response-inspector';
import { ShellTopbar } from './shell/shell-topbar';
import { StatusStrip } from './shell/status-strip';
import { useShellRuntime } from './shell/use-shell-runtime';
import { AskWorkspace } from './workspaces/ask/ask-workspace';
import { useAskWorkspace } from './workspaces/ask/use-ask-workspace';
import { AnalyzeWorkspace } from './workspaces/analyze/analyze-workspace';
import { useAnalyzeWorkspace } from './workspaces/analyze/use-analyze-workspace';
import { BrowserWorkspace } from './workspaces/browser/browser-workspace';
import { useBrowserWorkspace } from './workspaces/browser/use-browser-workspace';
import { ConnectWorkspace } from './workspaces/connect/connect-workspace';
import { useConnectWorkspace } from './workspaces/connect/use-connect-workspace';
import { ProofsWorkspace } from './workspaces/proofs/proofs-workspace';
import { useProofsWorkspace } from './workspaces/proofs/use-proofs-workspace';
import { RefreshWorkspace } from './workspaces/refresh/refresh-workspace';
import { useRefreshWorkspace } from './workspaces/refresh/use-refresh-workspace';
import { SystemWorkspace } from './workspaces/system/system-workspace';
import { useSystemWorkspace } from './workspaces/system/use-system-workspace';

type QueryKind = SecondaryQueryKind;

type UiTab = 'ask' | 'connect' | 'browser' | 'refresh' | 'analyze' | 'proofs' | 'system';

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev-local';
const PRIMARY_TABS: Array<[UiTab, string, string]> = [
  ['ask', 'Ask', 'Decision packets, trust, and follow-up actions.'],
  ['connect', 'Org Sessions', 'Local Salesforce sessions backed by sf and cci.'],
  ['browser', 'Org Browser', 'Browse metadata types and retrieve selected members.'],
  ['refresh', 'Refresh & Build', 'Refresh semantic state and compare snapshot drift.'],
  ['analyze', 'Explain & Analyze', 'Readable analysis cards for permissions and automation.'],
  ['proofs', 'Proofs & History', 'Replay, inspect, and export proof artifacts.'],
  ['system', 'Settings & Diagnostics', 'Runtime health, tool versions, and diagnostics.']
];
const ASK_PRESETS = [
  'What touches Opportunity.StageName?',
  'Who can edit Opportunity.StageName?',
  'What automations update Opportunity.StageName?'
];

function parseOptionalInt(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export default function Page(): JSX.Element {
  const [uiTab, setUiTab] = useState<UiTab>('ask');

  const [loading, setLoading] = useState(false);
  const [limitRaw, setLimitRaw] = useState('25');

  const responseInspector = useResponseInspector();
  const askWorkspace = useAskWorkspace({
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const proofsWorkspace = useProofsWorkspace({
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const browserWorkspace = useBrowserWorkspace({
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const connectWorkspace = useConnectWorkspace({
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const refreshWorkspace = useRefreshWorkspace({
    orgAlias: connectWorkspace.orgAlias,
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const shellRuntime = useShellRuntime();
  const analyzeWorkspace = useAnalyzeWorkspace({
    runQuery,
    parseOptionalInt,
    limitRaw,
    includeLowConfidence: askWorkspace.includeLowConfidence
  });
  const systemWorkspace = useSystemWorkspace({
    runQuery,
    loadOrgStatus: () => connectWorkspace.loadToolStatus()
  });

  useShellPreferences<UiTab>({
    uiTab,
    setUiTab,
    orgAlias: connectWorkspace.orgAlias,
    setOrgAlias: connectWorkspace.setOrgAlias,
    askQuery: askWorkspace.askQuery,
    setAskQuery: askWorkspace.setAskQuery,
    onHydrated: () => void shellRuntime.refreshStatuses()
  });

  useEffect(() => {
    proofsWorkspace.syncFromAsk(askWorkspace.askProofId, askWorkspace.askReplayToken);
  }, [askWorkspace.askProofId, askWorkspace.askReplayToken]);

  async function runQuery(kind: QueryKind, payload: Record<string, unknown> = {}): Promise<QueryResponse | null> {
    setLoading(true);
    responseInspector.setCopied(false);
    responseInspector.setErrorText('');

    try {
      const parsed = await runSecondaryQueryRequest(kind, payload);

      responseInspector.presentResponse(parsed);

      if (parsed.ok === false) {
        responseInspector.setErrorText(resolveQueryErrorMessage(parsed));
      }
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected query failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      responseInspector.presentResponse(fallback);
      responseInspector.setErrorText('Request failed. Check API readiness, query format, and local runtime health. Use /ready and /metrics for diagnosis.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="og-shell">
      <ShellTopbar
        loading={loading}
        onRefreshStatus={() => void shellRuntime.refreshStatuses()}
        onRunPreflight={() => void connectWorkspace.runPreflight()}
        onConnectOrg={() => void connectWorkspace.connectExistingAlias()}
      />

      <StatusStrip
        healthStatus={shellRuntime.healthStatus}
        readyStatus={shellRuntime.readyStatus}
        sessionStatus={connectWorkspace.sessionStatus}
        askTrust={askWorkspace.askTrust}
      />

      <section className="workspace-grid">
        <aside className="left-nav panel">
          <h2>Workspace</h2>
          <nav className="tab-stack" role="tablist" aria-label="Primary navigation tabs">
            {PRIMARY_TABS.map(([id, label, caption]) => (
              <button
                key={id}
                role="tab"
                aria-selected={uiTab === id}
                type="button"
                className={uiTab === id ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setUiTab(id)}
              >
                <span>{label}</span>
                <small>{caption}</small>
              </button>
            ))}
          </nav>

          <div className="hint-card">
            <h3>Launch Rule</h3>
            <p>
              Ask stays first. JSON and low-level payloads are still available, but only as secondary inspection surfaces.
            </p>
          </div>
        </aside>

        <section className="center-work panel">
          {uiTab === 'ask' && (
            <AskWorkspace
              activeAlias={connectWorkspace.activeAlias}
              sessionStatus={connectWorkspace.sessionStatus}
              buildVersion={BUILD_VERSION}
              askQuery={askWorkspace.askQuery}
              setAskQuery={askWorkspace.setAskQuery}
              maxCitationsRaw={askWorkspace.maxCitationsRaw}
              setMaxCitationsRaw={askWorkspace.setMaxCitationsRaw}
              consistencyCheck={askWorkspace.consistencyCheck}
              setConsistencyCheck={askWorkspace.setConsistencyCheck}
              includeLowConfidence={askWorkspace.includeLowConfidence}
              setIncludeLowConfidence={askWorkspace.setIncludeLowConfidence}
              askElaboration={askWorkspace.askElaboration}
              askResult={askWorkspace.askResult}
              askSummary={askWorkspace.askSummary}
              askTrust={askWorkspace.askTrust}
              askProofId={askWorkspace.askProofId}
              askReplayToken={askWorkspace.askReplayToken}
              askCitations={askWorkspace.askCitations}
              loading={loading}
              trustTone={(trustLevel) => {
                if (trustLevel === 'trusted') return 'good';
                if (trustLevel === 'conditional' || trustLevel === 'waiting') return 'muted';
                return 'bad';
              }}
              onRunAsk={() => void askWorkspace.runAsk(parseOptionalInt(askWorkspace.maxCitationsRaw) ?? 5)}
              onRunAskElaboration={() => void askWorkspace.runAskElaboration(parseOptionalInt(askWorkspace.maxCitationsRaw) ?? 5)}
              onOpenConnect={() => setUiTab('connect')}
              onRefreshAliases={() => void connectWorkspace.loadAliases()}
              onOpenBrowser={() => setUiTab('browser')}
              onOpenRefresh={() => setUiTab('refresh')}
              onInspectAutomation={() => {
                analyzeWorkspace.setAnalyzeMode('automation');
                setUiTab('analyze');
              }}
              onInspectPermissions={() => {
                analyzeWorkspace.setAnalyzeMode('perms');
                setUiTab('analyze');
              }}
              onOpenProof={() => {
                proofsWorkspace.syncFromAsk(askWorkspace.askProofId, askWorkspace.askReplayToken);
                setUiTab('proofs');
              }}
              onSaveToHistory={() => {
                proofsWorkspace.syncFromAsk(askWorkspace.askProofId, askWorkspace.askReplayToken);
                setUiTab('proofs');
              }}
            />
          )}

          {uiTab === 'connect' && (
            <ConnectWorkspace
              orgAlias={connectWorkspace.orgAlias}
              setOrgAlias={connectWorkspace.setOrgAlias}
              orgStatus={connectWorkspace.orgStatus}
              orgPreflight={connectWorkspace.orgPreflight}
              orgAliases={connectWorkspace.orgAliases}
              orgSession={connectWorkspace.orgSession}
              loading={loading}
              onLoadAliases={() => void connectWorkspace.loadAliases()}
              onCheckSession={() => void connectWorkspace.checkSession()}
              onCheckToolStatus={() => void connectWorkspace.loadToolStatus()}
              onPreflight={() => void connectWorkspace.runPreflight()}
              onSwitchAlias={() => void connectWorkspace.switchAlias()}
              onConnectExistingAlias={() => void connectWorkspace.connectExistingAlias()}
              onDisconnect={() => void connectWorkspace.disconnect()}
              onInspectAlias={(alias) => void connectWorkspace.inspectAlias(alias)}
            />
          )}

          {uiTab === 'browser' && (
            <BrowserWorkspace
              metadataSearch={browserWorkspace.metadataSearch}
              setMetadataSearch={browserWorkspace.setMetadataSearch}
              metadataMemberSearch={browserWorkspace.metadataMemberSearch}
              setMetadataMemberSearch={browserWorkspace.setMetadataMemberSearch}
              metadataLimitRaw={browserWorkspace.metadataLimitRaw}
              setMetadataLimitRaw={browserWorkspace.setMetadataLimitRaw}
              metadataForceRefresh={browserWorkspace.metadataForceRefresh}
              setMetadataForceRefresh={browserWorkspace.setMetadataForceRefresh}
              metadataAutoRefresh={browserWorkspace.metadataAutoRefresh}
              setMetadataAutoRefresh={browserWorkspace.setMetadataAutoRefresh}
              metadataCatalog={browserWorkspace.metadataCatalog}
              metadataMembersByType={browserWorkspace.metadataMembersByType}
              metadataLoadingType={browserWorkspace.metadataLoadingType}
              metadataSelectionsRaw={browserWorkspace.metadataSelectionsRaw}
              setMetadataSelectionsRaw={browserWorkspace.setMetadataSelectionsRaw}
              loading={loading}
              onRefreshTypes={() => void browserWorkspace.refreshTypes()}
              onClearFilters={browserWorkspace.clearFilters}
              onLoadMembers={(type) => void browserWorkspace.loadMembers(type)}
              onToggleType={browserWorkspace.toggleTypeSelection}
              onToggleMember={browserWorkspace.toggleMemberSelection}
              isTypeSelected={browserWorkspace.isTypeSelected}
              isMemberSelected={browserWorkspace.isMemberSelected}
              onRetrieveSelected={() => void browserWorkspace.retrieveSelected()}
            />
          )}

          {uiTab === 'refresh' && (
            <RefreshWorkspace
              refreshMode={refreshWorkspace.refreshMode}
              setRefreshMode={refreshWorkspace.setRefreshMode}
              fromSnapshot={refreshWorkspace.fromSnapshot}
              setFromSnapshot={refreshWorkspace.setFromSnapshot}
              toSnapshot={refreshWorkspace.toSnapshot}
              setToSnapshot={refreshWorkspace.setToSnapshot}
              orgRunAuth={refreshWorkspace.orgRunAuth}
              setOrgRunAuth={refreshWorkspace.setOrgRunAuth}
              orgRunRetrieve={refreshWorkspace.orgRunRetrieve}
              setOrgRunRetrieve={refreshWorkspace.setOrgRunRetrieve}
              orgAutoRefresh={refreshWorkspace.orgAutoRefresh}
              setOrgAutoRefresh={refreshWorkspace.setOrgAutoRefresh}
              loading={loading}
              onRunRefresh={() => void refreshWorkspace.runRefreshNow()}
              onRunDiff={() => void refreshWorkspace.runDiff()}
              onRunOrgRetrieve={() => void refreshWorkspace.runOrgRetrieveNow()}
            />
          )}

          {uiTab === 'analyze' && (
            <AnalyzeWorkspace
              analyzeMode={analyzeWorkspace.analyzeMode}
              setAnalyzeMode={analyzeWorkspace.setAnalyzeMode}
              user={analyzeWorkspace.user}
              setUser={analyzeWorkspace.setUser}
              objectName={analyzeWorkspace.objectName}
              setObjectName={analyzeWorkspace.setObjectName}
              fieldName={analyzeWorkspace.fieldName}
              setFieldName={analyzeWorkspace.setFieldName}
              systemPermission={analyzeWorkspace.systemPermission}
              setSystemPermission={analyzeWorkspace.setSystemPermission}
              limitRaw={limitRaw}
              setLimitRaw={setLimitRaw}
              strictMode={analyzeWorkspace.strictMode}
              setStrictMode={analyzeWorkspace.setStrictMode}
              explainMode={analyzeWorkspace.explainMode}
              setExplainMode={analyzeWorkspace.setExplainMode}
              debugMode={analyzeWorkspace.debugMode}
              setDebugMode={analyzeWorkspace.setDebugMode}
              loading={loading}
              onRunPermissions={() => void analyzeWorkspace.runPermissions()}
              onDiagnoseUserMapping={() => void analyzeWorkspace.diagnoseUserMapping()}
              onRunAutomation={() => void analyzeWorkspace.runAutomationAnalysis()}
              onRunImpact={() => void analyzeWorkspace.runImpactAnalysis()}
              onRunSystemPermission={() => void analyzeWorkspace.runSystemPermissionCheck()}
            />
          )}

          {uiTab === 'proofs' && (
            <ProofsWorkspace
              proofId={proofsWorkspace.proofId}
              setProofId={proofsWorkspace.setProofId}
              replayToken={proofsWorkspace.replayToken}
              setReplayToken={proofsWorkspace.setReplayToken}
              loading={loading}
              onListRecent={() => void proofsWorkspace.runProofsRecent(parseOptionalInt(limitRaw) ?? 20)}
              onGetProof={() => void proofsWorkspace.runProofLookup()}
              onReplay={() => void proofsWorkspace.runReplay()}
              onExportMetrics={() => void proofsWorkspace.runMetricsExport()}
            />
          )}

          {uiTab === 'system' && (
            <SystemWorkspace
              metaDryRun={systemWorkspace.metaDryRun}
              setMetaDryRun={systemWorkspace.setMetaDryRun}
              loading={loading}
              onLoadMetaContext={() => void systemWorkspace.loadMetaContext()}
              onRunMetaAdapt={() => void systemWorkspace.runMetaAdapt()}
              onLoadOrgStatus={() => void systemWorkspace.loadOrgStatus()}
            />
          )}
        </section>

        <OperatorRail
          copied={responseInspector.copied}
          responseText={responseInspector.responseText}
          errorText={responseInspector.errorText}
          readyDetails={shellRuntime.readyDetails}
          askSummary={askWorkspace.askSummary}
          askTrust={askWorkspace.askTrust}
          askResult={askWorkspace.askResult}
          askProofId={askWorkspace.askProofId}
          askReplayToken={askWorkspace.askReplayToken}
          sessionStatus={connectWorkspace.sessionStatus}
          activeAlias={connectWorkspace.activeAlias}
          orgSession={connectWorkspace.orgSession}
          orgStatus={connectWorkspace.orgStatus}
          orgPreflight={connectWorkspace.orgPreflight}
          onCopy={() => void responseInspector.copyJson()}
        />
      </section>
    </main>
  );
}
