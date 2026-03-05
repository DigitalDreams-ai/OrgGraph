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
    retrieveHandoff: browserWorkspace.lastMetadataRetrieve,
    retrieveSelections: browserWorkspace.lastRetrievedSelections,
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
  const runtimeUnavailable =
    connectWorkspace.runtimeUnavailable ||
    shellRuntime.healthStatus === 'unreachable' ||
    shellRuntime.readyStatus === 'unreachable';
  const openAskFromAnalyze = (query: string): void => {
    askWorkspace.setAskQuery(query);
    setUiTab('ask');
  };
  const openProofHistoryFromAsk = (): void => {
    proofsWorkspace.syncFromAsk(askWorkspace.askProofId, askWorkspace.askReplayToken);
    setUiTab('proofs');
    void proofsWorkspace.runProofsRecent(parseOptionalInt(secondaryQueryRunner.limitRaw) ?? 20);
  };

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

  useEffect(() => {
    if (uiTab !== 'proofs' || proofsWorkspace.recentProofs.length > 0) {
      return;
    }

    void proofsWorkspace.runProofsRecent(parseOptionalInt(secondaryQueryRunner.limitRaw) ?? 20);
  }, [uiTab, proofsWorkspace.recentProofs.length, secondaryQueryRunner.limitRaw]);

  useEffect(() => {
    if (uiTab !== 'proofs' || !proofsWorkspace.proofId.trim()) {
      return;
    }

    if (proofsWorkspace.selectedProof?.proofId === proofsWorkspace.proofId) {
      return;
    }

    void proofsWorkspace.runProofLookup();
  }, [uiTab, proofsWorkspace.proofId, proofsWorkspace.selectedProof?.proofId]);

  useEffect(() => {
    if (uiTab !== 'browser' || browserWorkspace.metadataCatalogRequested) {
      return;
    }

    void browserWorkspace.refreshTypes();
  }, [uiTab, browserWorkspace.metadataCatalogRequested]);

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
              onSaveToHistory={openProofHistoryFromAsk}
            />
          )}

          {uiTab === 'connect' && (
            <ConnectWorkspace
              orgAlias={connectWorkspace.orgAlias}
              setOrgAlias={connectWorkspace.setOrgAlias}
              activeAlias={connectWorkspace.activeAlias}
              sessionStatus={connectWorkspace.sessionStatus}
              orgStatus={connectWorkspace.orgStatus}
              orgPreflight={connectWorkspace.orgPreflight}
              orgAliases={connectWorkspace.orgAliases}
              orgSessionHistory={connectWorkspace.orgSessionHistory}
              orgSession={connectWorkspace.orgSession}
              aliasInventory={connectWorkspace.aliasInventory}
              recentSessionEvents={connectWorkspace.recentSessionEvents}
              selectedAlias={connectWorkspace.selectedAlias}
              preflightIssues={connectWorkspace.preflightIssues}
              toolingReady={connectWorkspace.toolingReady}
              browserSeeded={connectWorkspace.browserSeeded}
              selectedAliasReady={connectWorkspace.selectedAliasReady}
              runtimeUnavailable={runtimeUnavailable}
              restoreAlias={connectWorkspace.restoreAlias}
              loading={secondaryQueryRunner.loading}
              onRefreshOverview={() => void connectWorkspace.refreshOverview()}
              onLoadAliases={() => void connectWorkspace.loadAliases()}
              onCheckSession={() => void connectWorkspace.checkSession()}
              onLoadSessionHistory={() => void connectWorkspace.loadSessionHistory()}
              onCheckToolStatus={() => void connectWorkspace.loadToolStatus()}
              onPreflight={() => void connectWorkspace.runPreflight()}
              onSwitchAlias={(alias) => void connectWorkspace.switchAlias(alias)}
              onConnectExistingAlias={(alias) => void connectWorkspace.connectExistingAlias(alias)}
              onDisconnect={() => void connectWorkspace.disconnect()}
              onRestoreLastSession={() => void connectWorkspace.restoreLastSession()}
              onSelectAlias={connectWorkspace.selectAlias}
              onInspectAlias={(alias) => void connectWorkspace.inspectAlias(alias)}
            />
          )}

          {uiTab === 'browser' && (
            <BrowserWorkspace
              activeAlias={connectWorkspace.activeAlias}
              selectedAlias={connectWorkspace.orgAlias}
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
              metadataSearchResults={browserWorkspace.metadataSearchResults}
              metadataMembersByType={browserWorkspace.metadataMembersByType}
              metadataLoadingType={browserWorkspace.metadataLoadingType}
              metadataWarnings={browserWorkspace.metadataWarnings}
              metadataSelectionsPreview={browserWorkspace.metadataSelectionsPreview}
              selectedMetadata={browserWorkspace.selectedMetadata}
              selectionSummary={browserWorkspace.selectionSummary}
              visibleCatalogTypes={browserWorkspace.visibleCatalogTypes}
              lastMetadataRetrieve={browserWorkspace.lastMetadataRetrieve}
              metadataCatalogRequested={browserWorkspace.metadataCatalogRequested}
              loading={secondaryQueryRunner.loading}
              onRefreshTypes={() => void browserWorkspace.refreshTypes()}
              onRefreshExplorer={() => void browserWorkspace.refreshExplorer()}
              onLoadVisibleMembers={() => void browserWorkspace.loadVisibleMembers()}
              onClearFilters={browserWorkspace.clearFilters}
              onClearSelections={browserWorkspace.clearSelections}
              onLoadMembers={(type) => void browserWorkspace.loadMembers(type)}
              isMemberSelected={browserWorkspace.isMemberSelected}
              getTypeSelectionState={browserWorkspace.getTypeSelectionState}
              onSetTypeSelected={browserWorkspace.setTypeSelected}
              onSetMemberSelected={browserWorkspace.setMemberSelected}
              onSetMembersSelected={browserWorkspace.setMembersSelected}
              onRemoveType={browserWorkspace.removeTypeSelection}
              onRemoveMember={browserWorkspace.removeMemberSelection}
              onRetrieveSelected={() => void browserWorkspace.retrieveSelected()}
              onOpenRefresh={() => setUiTab('refresh')}
            />
          )}

          {uiTab === 'refresh' && (
            <RefreshWorkspace
              activeAlias={connectWorkspace.activeAlias}
              selectedAlias={connectWorkspace.orgAlias}
              retrieveHandoff={browserWorkspace.lastMetadataRetrieve}
              retrieveSelections={browserWorkspace.lastRetrievedSelections}
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
              lastRefreshRun={refreshWorkspace.lastRefreshRun}
              lastDiffRun={refreshWorkspace.lastDiffRun}
              lastOrgRetrieveRun={refreshWorkspace.lastOrgRetrieveRun}
              loading={secondaryQueryRunner.loading}
              onRunRefresh={() => void refreshWorkspace.runRefreshNow()}
              onRunDiff={() => void refreshWorkspace.runDiff()}
              onRunOrgRetrieve={() => void refreshWorkspace.runOrgRetrieveNow()}
              onOpenBrowser={() => setUiTab('browser')}
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
              permissionsResult={analyzeWorkspace.permissionsResult}
              permissionDiagnosis={analyzeWorkspace.permissionDiagnosis}
              automationResult={analyzeWorkspace.automationResult}
              impactResult={analyzeWorkspace.impactResult}
              systemPermissionResult={analyzeWorkspace.systemPermissionResult}
              loading={secondaryQueryRunner.loading}
              onRunPermissions={() => void analyzeWorkspace.runPermissions()}
              onDiagnoseUserMapping={() => void analyzeWorkspace.diagnoseUserMapping()}
              onRunAutomation={() => void analyzeWorkspace.runAutomationAnalysis()}
              onRunImpact={() => void analyzeWorkspace.runImpactAnalysis()}
              onRunSystemPermission={() => void analyzeWorkspace.runSystemPermissionCheck()}
              onOpenAsk={openAskFromAnalyze}
            />
          )}

          {uiTab === 'proofs' && (
            <ProofsWorkspace
              proofId={proofsWorkspace.proofId}
              setProofId={proofsWorkspace.setProofId}
              replayToken={proofsWorkspace.replayToken}
              setReplayToken={proofsWorkspace.setReplayToken}
              recentProofs={proofsWorkspace.recentProofs}
              selectedRecentProof={proofsWorkspace.selectedRecentProof}
              selectedProof={proofsWorkspace.selectedProof}
              replayResult={proofsWorkspace.replayResult}
              metricsExport={proofsWorkspace.metricsExport}
              loading={secondaryQueryRunner.loading}
              onListRecent={() => void proofsWorkspace.runProofsRecent(parseOptionalInt(secondaryQueryRunner.limitRaw) ?? 20)}
              onGetProof={() => void proofsWorkspace.runProofLookup()}
              onReplay={() => void proofsWorkspace.runReplay()}
              onExportMetrics={() => void proofsWorkspace.runMetricsExport()}
              onOpenRecentProof={(proof) => void proofsWorkspace.openRecentProof(proof)}
              onReplayRecentProof={(proof) => void proofsWorkspace.replayRecentProof(proof)}
            />
          )}

          {uiTab === 'system' && (
            <SystemWorkspace
              metaDryRun={systemWorkspace.metaDryRun}
              setMetaDryRun={systemWorkspace.setMetaDryRun}
              healthStatus={shellRuntime.healthStatus}
              readyStatus={shellRuntime.readyStatus}
              readyDetails={shellRuntime.readyDetails}
              readyPayload={shellRuntime.readyPayload}
              orgStatus={connectWorkspace.orgStatus}
              runtimeUnavailable={runtimeUnavailable}
              metaContext={systemWorkspace.metaContext}
              metaAdaptResult={systemWorkspace.metaAdaptResult}
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
          readyPayload={shellRuntime.readyPayload}
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
          runtimeUnavailable={runtimeUnavailable}
          onCopy={() => void responseInspector.copyJson()}
        />
      </section>
    </main>
  );
}
