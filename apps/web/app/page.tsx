'use client';

import { useEffect, useState } from 'react';
import {
  type QueryResponse
} from './lib/ask-client';
import { runSecondaryQueryRequest, type SecondaryQueryKind } from './lib/secondary-client';
import { ShellTopbar } from './shell/shell-topbar';
import { StatusStrip } from './shell/status-strip';
import { useShellRuntime } from './shell/use-shell-runtime';
import { AskWorkspace } from './workspaces/ask/ask-workspace';
import { useAskWorkspace } from './workspaces/ask/use-ask-workspace';
import { AnalyzeWorkspace, type AnalyzeMode } from './workspaces/analyze/analyze-workspace';
import { BrowserWorkspace } from './workspaces/browser/browser-workspace';
import { useBrowserWorkspace } from './workspaces/browser/use-browser-workspace';
import { ConnectWorkspace } from './workspaces/connect/connect-workspace';
import { useConnectWorkspace } from './workspaces/connect/use-connect-workspace';
import { ProofsWorkspace } from './workspaces/proofs/proofs-workspace';
import { useProofsWorkspace } from './workspaces/proofs/use-proofs-workspace';
import { RefreshWorkspace } from './workspaces/refresh/refresh-workspace';
import { useRefreshWorkspace } from './workspaces/refresh/use-refresh-workspace';
import { SystemWorkspace } from './workspaces/system/system-workspace';

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

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function resolveErrorMessage(data: QueryResponse): string {
  const payload = data.payload as
    | {
        error?: {
          message?: string;
          details?: { reason?: string; hint?: string };
        };
      }
    | undefined;
  const payloadErrorReason = payload?.error?.details?.reason;
  const payloadErrorHint = payload?.error?.details?.hint;
  const payloadError = payload?.error?.message;
  const topError = data.error?.message;
  return (
    payloadErrorReason ||
    payloadErrorHint ||
    payloadError ||
    topError ||
    'Request failed. Check API readiness, query format, and local runtime health. Use /ready and /metrics for diagnosis.'
  );
}

export default function Page(): JSX.Element {
  const [uiTab, setUiTab] = useState<UiTab>('ask');
  const [analyzeMode, setAnalyzeMode] = useState<AnalyzeMode>('perms');

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [errorText, setErrorText] = useState('');

  const [user, setUser] = useState('sbingham@shulman-hill.com.uat');
  const [objectName, setObjectName] = useState('Opportunity');
  const [fieldName, setFieldName] = useState('Opportunity.StageName');
  const [systemPermission, setSystemPermission] = useState('ApproveUninstalledConnectedApps');
  const [limitRaw, setLimitRaw] = useState('25');
  const [strictMode, setStrictMode] = useState(true);
  const [explainMode, setExplainMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const [metaDryRun, setMetaDryRun] = useState(true);

  const askWorkspace = useAskWorkspace({
    presentResponse,
    resolveErrorMessage,
    setLoading,
    setCopied,
    setErrorText
  });
  const proofsWorkspace = useProofsWorkspace({
    presentResponse,
    resolveErrorMessage,
    setLoading,
    setCopied,
    setErrorText
  });
  const browserWorkspace = useBrowserWorkspace({
    presentResponse,
    resolveErrorMessage,
    setLoading,
    setCopied,
    setErrorText
  });
  const connectWorkspace = useConnectWorkspace({
    presentResponse,
    resolveErrorMessage,
    setLoading,
    setCopied,
    setErrorText
  });
  const refreshWorkspace = useRefreshWorkspace({
    orgAlias: connectWorkspace.orgAlias,
    presentResponse,
    resolveErrorMessage,
    setLoading,
    setCopied,
    setErrorText
  });
  const shellRuntime = useShellRuntime();

  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('orgumented.newui.tab') as UiTab | null;
      if (savedTab) setUiTab(savedTab);
      const savedAlias = localStorage.getItem('orgumented.newui.alias');
      if (savedAlias) connectWorkspace.setOrgAlias(savedAlias);
      const savedAsk = localStorage.getItem('orgumented.newui.ask');
      if (savedAsk) askWorkspace.setAskQuery(savedAsk);
    } catch {
      // ignore
    }
    void shellRuntime.refreshStatuses();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('orgumented.newui.tab', uiTab);
      localStorage.setItem('orgumented.newui.alias', connectWorkspace.orgAlias);
      localStorage.setItem('orgumented.newui.ask', askWorkspace.askQuery);
    } catch {
      // ignore
    }
  }, [uiTab, connectWorkspace.orgAlias, askWorkspace.askQuery]);

  useEffect(() => {
    proofsWorkspace.syncFromAsk(askWorkspace.askProofId, askWorkspace.askReplayToken);
  }, [askWorkspace.askProofId, askWorkspace.askReplayToken]);

  async function runQuery(kind: QueryKind, payload: Record<string, unknown> = {}): Promise<QueryResponse | null> {
    setLoading(true);
    setCopied(false);
    setErrorText('');

    try {
      const parsed = await runSecondaryQueryRequest(kind, payload);

      presentResponse(parsed);

      if (parsed.ok === false) {
        setErrorText(resolveErrorMessage(parsed));
      }
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected query failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      presentResponse(fallback);
      setErrorText('Request failed. Check API readiness, query format, and local runtime health. Use /ready and /metrics for diagnosis.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  function presentResponse(parsed: QueryResponse): void {
    setResponseText(pretty(parsed));
  }

  async function copyJson(): Promise<void> {
    if (!responseText) return;

    try {
      await navigator.clipboard.writeText(responseText);
      setCopied(true);
      return;
    } catch {
      // fallback
    }

    const area = document.createElement('textarea');
    area.value = responseText;
    area.setAttribute('readonly', 'true');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const copiedFallback = document.execCommand('copy');
    document.body.removeChild(area);
    if (copiedFallback) {
      setCopied(true);
      return;
    }

    setErrorText('Copy failed in this browser context. Select JSON from Raw JSON and copy manually.');
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
                setAnalyzeMode('automation');
                setUiTab('analyze');
              }}
              onInspectPermissions={() => {
                setAnalyzeMode('perms');
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
              analyzeMode={analyzeMode}
              setAnalyzeMode={setAnalyzeMode}
              user={user}
              setUser={setUser}
              objectName={objectName}
              setObjectName={setObjectName}
              fieldName={fieldName}
              setFieldName={setFieldName}
              systemPermission={systemPermission}
              setSystemPermission={setSystemPermission}
              limitRaw={limitRaw}
              setLimitRaw={setLimitRaw}
              strictMode={strictMode}
              setStrictMode={setStrictMode}
              explainMode={explainMode}
              setExplainMode={setExplainMode}
              debugMode={debugMode}
              setDebugMode={setDebugMode}
              loading={loading}
              onRunPermissions={() =>
                void runQuery('perms', {
                  user,
                  object: objectName,
                  field: fieldName,
                  limit: parseOptionalInt(limitRaw)
                })
              }
              onDiagnoseUserMapping={() => void runQuery('permsDiagnose', { user })}
              onRunAutomation={() =>
                void runQuery('automation', {
                  object: objectName,
                  limit: parseOptionalInt(limitRaw),
                  strict: strictMode,
                  explain: explainMode,
                  includeLowConfidence: askWorkspace.includeLowConfidence
                })
              }
              onRunImpact={() =>
                void runQuery('impact', {
                  field: fieldName,
                  limit: parseOptionalInt(limitRaw),
                  strict: strictMode,
                  explain: explainMode,
                  debug: debugMode,
                  includeLowConfidence: askWorkspace.includeLowConfidence
                })
              }
              onRunSystemPermission={() =>
                void runQuery('permsSystem', {
                  user,
                  permission: systemPermission,
                  limit: parseOptionalInt(limitRaw)
                })
              }
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
              metaDryRun={metaDryRun}
              setMetaDryRun={setMetaDryRun}
              loading={loading}
              onLoadMetaContext={() => void runQuery('metaContext')}
              onRunMetaAdapt={() => void runQuery('metaAdapt', { dryRun: metaDryRun })}
              onLoadOrgStatus={() => void connectWorkspace.loadToolStatus()}
            />
          )}
        </section>

        <aside className="right-rail panel">
          <div className="rail-head">
            <h2>Operator Rail</h2>
            <button type="button" onClick={() => void copyJson()} disabled={!responseText}>{copied ? 'Copied' : 'Copy Response'}</button>
          </div>

          {errorText ? <p className="error-text">{errorText}</p> : null}

          <div className="sub-card">
            <h3>Ask Snapshot</h3>
            <p>{askWorkspace.askSummary}</p>
          </div>

          <div className="sub-card">
            <h3>Trust Envelope</h3>
            <p><strong>Trust:</strong> {askWorkspace.askTrust}</p>
            <p><strong>Confidence:</strong> {typeof askWorkspace.askResult?.confidence === 'number' ? askWorkspace.askResult.confidence : 'n/a'}</p>
            <p><strong>Policy ID:</strong> {askWorkspace.askResult?.policy?.policyId || 'n/a'}</p>
            <p><strong>Proof ID:</strong> {askWorkspace.askProofId || 'n/a'}</p>
            <p><strong>Replay Token:</strong> {askWorkspace.askReplayToken || 'n/a'}</p>
          </div>

          <div className="sub-card">
            <h3>Connection</h3>
            <p><strong>Session:</strong> {connectWorkspace.sessionStatus}</p>
            <p><strong>Alias:</strong> {connectWorkspace.activeAlias}</p>
            <p><strong>Auth Mode:</strong> {connectWorkspace.orgSession?.authMode || connectWorkspace.orgStatus?.authMode || 'sf_cli_keychain'}</p>
            <p><strong>sf Installed:</strong> {connectWorkspace.orgStatus?.sf?.installed ? 'yes' : 'no'}</p>
            <p><strong>CCI Installed:</strong> {connectWorkspace.orgStatus?.cci?.installed ? 'yes' : 'no'}</p>
          </div>

          {connectWorkspace.orgPreflight?.issues && connectWorkspace.orgPreflight.issues.length > 0 ? (
            <div className="sub-card warn">
              <h3>Preflight Issues</h3>
              <ul>
                {connectWorkspace.orgPreflight.issues.slice(0, 5).map((issue, idx) => (
                  <li key={`${issue.code || 'issue'}-${idx}`}>
                    <strong>{issue.severity?.toUpperCase() || 'INFO'}:</strong> {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details>
            <summary>Raw JSON Inspector</summary>
            <pre>{responseText || '{\n  "hint": "Run an action to view response"\n}'}</pre>
          </details>

          {shellRuntime.readyDetails ? (
            <details>
              <summary>Ready Details</summary>
              <pre>{shellRuntime.readyDetails}</pre>
            </details>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
