'use client';

import { useEffect, useState } from 'react';
import { OperatorRail } from './shell/operator-rail';
import { useShellPreferences } from './shell/use-shell-preferences';
import { useSecondaryQueryRunner } from './shell/use-secondary-query-runner';
import { resolveQueryErrorMessage, useResponseInspector } from './shell/use-response-inspector';
import { ShellTopbar } from './shell/shell-topbar';
import { StatusStrip } from './shell/status-strip';
import { useShellRuntime } from './shell/use-shell-runtime';
import { WorkspaceNav, type WorkspaceTab as UiTab } from './shell/workspace-nav';
import { AskWorkspace } from './workspaces/ask/ask-workspace';
import { useAskShellActions } from './workspaces/ask/use-ask-shell-actions';
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

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev-local';

function parseOptionalInt(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export default function Page(): JSX.Element {
  const [uiTab, setUiTab] = useState<UiTab>('ask');

  const responseInspector = useResponseInspector();
  const secondaryQueryRunner = useSecondaryQueryRunner({
    presentResponse: responseInspector.presentResponse,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const askWorkspace = useAskWorkspace({
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading: secondaryQueryRunner.setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const proofsWorkspace = useProofsWorkspace({
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading: secondaryQueryRunner.setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const browserWorkspace = useBrowserWorkspace({
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading: secondaryQueryRunner.setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const connectWorkspace = useConnectWorkspace({
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading: secondaryQueryRunner.setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const refreshWorkspace = useRefreshWorkspace({
    orgAlias: connectWorkspace.orgAlias,
    presentResponse: responseInspector.presentResponse,
    resolveErrorMessage: resolveQueryErrorMessage,
    setLoading: secondaryQueryRunner.setLoading,
    setCopied: responseInspector.setCopied,
    setErrorText: responseInspector.setErrorText
  });
  const shellRuntime = useShellRuntime();
  const analyzeWorkspace = useAnalyzeWorkspace({
    runQuery: secondaryQueryRunner.runQuery,
    parseOptionalInt,
    limitRaw: secondaryQueryRunner.limitRaw,
    includeLowConfidence: askWorkspace.includeLowConfidence
  });
  const askShellActions = useAskShellActions({
    askProofId: askWorkspace.askProofId,
    askReplayToken: askWorkspace.askReplayToken,
    maxCitationsRaw: askWorkspace.maxCitationsRaw,
    parseOptionalInt,
    runAsk: askWorkspace.runAsk,
    runAskElaboration: askWorkspace.runAskElaboration,
    loadAliases: connectWorkspace.loadAliases,
    setAnalyzeMode: analyzeWorkspace.setAnalyzeMode,
    syncProofs: proofsWorkspace.syncFromAsk,
    setUiTab
  });
  const systemWorkspace = useSystemWorkspace({
    runQuery: secondaryQueryRunner.runQuery,
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

  return (
    <main className="og-shell">
      <ShellTopbar
        loading={secondaryQueryRunner.loading}
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
        <WorkspaceNav uiTab={uiTab} setUiTab={setUiTab} />

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
              loading={secondaryQueryRunner.loading}
              trustTone={(trustLevel) => {
                if (trustLevel === 'trusted') return 'good';
                if (trustLevel === 'conditional' || trustLevel === 'waiting') return 'muted';
                return 'bad';
              }}
              onRunAsk={() => void askShellActions.runAsk()}
              onRunAskElaboration={() => void askShellActions.runAskElaboration()}
              onOpenConnect={askShellActions.openConnect}
              onRefreshAliases={() => void askShellActions.refreshAliases()}
              onOpenBrowser={askShellActions.openBrowser}
              onOpenRefresh={askShellActions.openRefresh}
              onInspectAutomation={askShellActions.inspectAutomation}
              onInspectPermissions={askShellActions.inspectPermissions}
              onOpenProof={askShellActions.openProof}
              onSaveToHistory={askShellActions.openProof}
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
              loading={secondaryQueryRunner.loading}
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
              loading={secondaryQueryRunner.loading}
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
              loading={secondaryQueryRunner.loading}
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
              limitRaw={secondaryQueryRunner.limitRaw}
              setLimitRaw={secondaryQueryRunner.setLimitRaw}
              strictMode={analyzeWorkspace.strictMode}
              setStrictMode={analyzeWorkspace.setStrictMode}
              explainMode={analyzeWorkspace.explainMode}
              setExplainMode={analyzeWorkspace.setExplainMode}
              debugMode={analyzeWorkspace.debugMode}
              setDebugMode={analyzeWorkspace.setDebugMode}
              loading={secondaryQueryRunner.loading}
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
              loading={secondaryQueryRunner.loading}
              onListRecent={() => void proofsWorkspace.runProofsRecent(parseOptionalInt(secondaryQueryRunner.limitRaw) ?? 20)}
              onGetProof={() => void proofsWorkspace.runProofLookup()}
              onReplay={() => void proofsWorkspace.runReplay()}
              onExportMetrics={() => void proofsWorkspace.runMetricsExport()}
            />
          )}

          {uiTab === 'system' && (
            <SystemWorkspace
              metaDryRun={systemWorkspace.metaDryRun}
              setMetaDryRun={systemWorkspace.setMetaDryRun}
              loading={secondaryQueryRunner.loading}
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
