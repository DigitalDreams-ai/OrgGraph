'use client';

import { useEffect, useState } from 'react';
import {
  type QueryResponse
} from './lib/ask-client';
import {
  connectOrgSession,
  disconnectOrgSession,
  getOrgMetadataCatalog,
  getOrgMetadataMembers,
  getOrgSession,
  getOrgStatus,
  listOrgSessionAliases,
  retrieveOrgMetadata,
  runOrgRetrieve,
  runOrgPreflight,
  switchOrgSession
} from './lib/org-client';
import { getRefreshDiff, runRefresh } from './lib/refresh-client';
import { runSecondaryQueryRequest, type SecondaryQueryKind } from './lib/secondary-client';
import { getApiHealth, getApiReady } from './lib/status-client';
import { AskWorkspace } from './workspaces/ask/ask-workspace';
import { useAskWorkspace } from './workspaces/ask/use-ask-workspace';
import { AnalyzeWorkspace, type AnalyzeMode } from './workspaces/analyze/analyze-workspace';
import { BrowserWorkspace } from './workspaces/browser/browser-workspace';
import { ConnectWorkspace } from './workspaces/connect/connect-workspace';
import type {
  OrgPreflightPayload,
  OrgSessionAliasesPayload,
  OrgSessionPayload,
  OrgStatusPayload
} from './workspaces/connect/types';
import { ProofsWorkspace } from './workspaces/proofs/proofs-workspace';
import { useProofsWorkspace } from './workspaces/proofs/use-proofs-workspace';
import type {
  MetadataCatalogPayload,
  MetadataMembersPayload,
  MetadataSelection
} from './workspaces/browser/types';

type OrgQueryKind =
  | 'orgConnect'
  | 'orgSessionAliases'
  | 'orgSession'
  | 'orgPreflight'
  | 'orgSessionSwitch'
  | 'orgSessionDisconnect'
  | 'orgStatus'
  | 'orgRetrieve'
  | 'metadataCatalog'
  | 'metadataMembers'
  | 'metadataRetrieve';

type RefreshQueryKind = 'refresh' | 'refreshDiff';
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
  const [responseData, setResponseData] = useState<QueryResponse | null>(null);
  const [errorText, setErrorText] = useState('');

  const [healthStatus, setHealthStatus] = useState('unknown');
  const [readyStatus, setReadyStatus] = useState('unknown');
  const [readyDetails, setReadyDetails] = useState('');

  const [orgAlias, setOrgAlias] = useState('orgumented-sandbox');
  const [orgSession, setOrgSession] = useState<OrgSessionPayload | null>(null);
  const [orgStatus, setOrgStatus] = useState<OrgStatusPayload | null>(null);
  const [orgPreflight, setOrgPreflight] = useState<OrgPreflightPayload | null>(null);
  const [orgAliases, setOrgAliases] = useState<OrgSessionAliasesPayload | null>(null);

  const [metadataSearch, setMetadataSearch] = useState('');
  const [metadataMemberSearch, setMetadataMemberSearch] = useState('');
  const [metadataLimitRaw, setMetadataLimitRaw] = useState('200');
  const [metadataForceRefresh, setMetadataForceRefresh] = useState(false);
  const [metadataAutoRefresh, setMetadataAutoRefresh] = useState(true);
  const [metadataCatalog, setMetadataCatalog] = useState<MetadataCatalogPayload | null>(null);
  const [metadataMembersByType, setMetadataMembersByType] = useState<Record<string, MetadataMembersPayload>>({});
  const [metadataLoadingType, setMetadataLoadingType] = useState('');
  const [metadataSelected, setMetadataSelected] = useState<MetadataSelection[]>([]);
  const [metadataSelectionsRaw, setMetadataSelectionsRaw] = useState('[]');

  const [refreshMode, setRefreshMode] = useState<'incremental' | 'full'>('incremental');
  const [fromSnapshot, setFromSnapshot] = useState('');
  const [toSnapshot, setToSnapshot] = useState('');
  const [orgRunAuth, setOrgRunAuth] = useState(true);
  const [orgRunRetrieve, setOrgRunRetrieve] = useState(true);
  const [orgAutoRefresh, setOrgAutoRefresh] = useState(true);

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

  const activeAlias = orgSession?.activeAlias || orgStatus?.session?.activeAlias || orgStatus?.alias || orgAlias;
  const sessionStatus = orgSession?.status || orgStatus?.session?.status || 'unknown';

  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('orgumented.newui.tab') as UiTab | null;
      if (savedTab) setUiTab(savedTab);
      const savedAlias = localStorage.getItem('orgumented.newui.alias');
      if (savedAlias) setOrgAlias(savedAlias);
      const savedAsk = localStorage.getItem('orgumented.newui.ask');
      if (savedAsk) askWorkspace.setAskQuery(savedAsk);
    } catch {
      // ignore
    }
    void refreshStatuses();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('orgumented.newui.tab', uiTab);
      localStorage.setItem('orgumented.newui.alias', orgAlias);
      localStorage.setItem('orgumented.newui.ask', askWorkspace.askQuery);
    } catch {
      // ignore
    }
  }, [uiTab, orgAlias, askWorkspace.askQuery]);

  useEffect(() => {
    proofsWorkspace.syncFromAsk(askWorkspace.askProofId, askWorkspace.askReplayToken);
  }, [askWorkspace.askProofId, askWorkspace.askReplayToken]);

  useEffect(() => {
    setMetadataSelectionsRaw(pretty(metadataSelected));
  }, [metadataSelected]);

  async function refreshStatuses(): Promise<void> {
    try {
      const healthRes = await getApiHealth();
      const payload = healthRes.payload as { status?: string } | undefined;
      setHealthStatus(healthRes.ok ? payload?.status ?? 'ok' : `http_${healthRes.statusCode ?? 503}`);
    } catch {
      setHealthStatus('unreachable');
    }

    try {
      const readyRes = await getApiReady();
      const payload = readyRes.payload as { status?: string } | undefined;
      setReadyStatus(readyRes.ok ? payload?.status ?? 'ready' : `http_${readyRes.statusCode ?? 503}`);
      setReadyDetails(readyRes.payload ? pretty(readyRes.payload) : '');
    } catch {
      setReadyStatus('unreachable');
      setReadyDetails('');
    }
  }

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

  async function runOrgQuery(kind: OrgQueryKind, payload: Record<string, unknown> = {}): Promise<QueryResponse | null> {
    setLoading(true);
    setCopied(false);
    setErrorText('');

    try {
      let parsed: QueryResponse;
      if (kind === 'orgSessionAliases') {
        parsed = await listOrgSessionAliases();
      } else if (kind === 'orgSession') {
        parsed = await getOrgSession();
      } else if (kind === 'metadataCatalog') {
        parsed = await getOrgMetadataCatalog({
          q: typeof payload.q === 'string' ? payload.q : undefined,
          limit: typeof payload.limit === 'number' ? payload.limit : undefined,
          refresh: typeof payload.refresh === 'boolean' ? payload.refresh : undefined
        });
      } else if (kind === 'metadataMembers') {
        parsed = await getOrgMetadataMembers({
          type: typeof payload.type === 'string' ? payload.type : '',
          q: typeof payload.q === 'string' ? payload.q : undefined,
          limit: typeof payload.limit === 'number' ? payload.limit : undefined,
          refresh: typeof payload.refresh === 'boolean' ? payload.refresh : undefined
        });
      } else if (kind === 'orgPreflight') {
        parsed = await runOrgPreflight(typeof payload.alias === 'string' ? payload.alias : undefined);
      } else if (kind === 'orgSessionSwitch') {
        parsed = await switchOrgSession({
          alias: typeof payload.alias === 'string' ? payload.alias : undefined
        });
      } else if (kind === 'orgSessionDisconnect') {
        parsed = await disconnectOrgSession();
      } else if (kind === 'metadataRetrieve') {
        parsed = await retrieveOrgMetadata({
          selections: Array.isArray(payload.selections)
            ? (payload.selections as Array<{ type: string; members?: string[] }>)
            : [],
          autoRefresh: typeof payload.autoRefresh === 'boolean' ? payload.autoRefresh : undefined
        });
      } else if (kind === 'orgRetrieve') {
        parsed = await runOrgRetrieve({
          alias: typeof payload.alias === 'string' ? payload.alias : undefined,
          runAuth: typeof payload.runAuth === 'boolean' ? payload.runAuth : undefined,
          runRetrieve: typeof payload.runRetrieve === 'boolean' ? payload.runRetrieve : undefined,
          autoRefresh: typeof payload.autoRefresh === 'boolean' ? payload.autoRefresh : undefined
        });
      } else if (kind === 'orgConnect') {
        parsed = await connectOrgSession({
          alias: typeof payload.alias === 'string' ? payload.alias : undefined
        });
      } else {
        parsed = await getOrgStatus();
      }

      presentResponse(parsed);

      if (parsed.ok === false) {
        setErrorText(resolveErrorMessage(parsed));
      }
      if ((kind === 'orgSession' || kind === 'orgSessionSwitch' || kind === 'orgSessionDisconnect') && parsed.payload) {
        setOrgSession(parsed.payload as OrgSessionPayload);
      }
      if (kind === 'orgSessionAliases' && parsed.payload) {
        setOrgAliases(parsed.payload as OrgSessionAliasesPayload);
      }
      if (kind === 'orgStatus' && parsed.payload) {
        setOrgStatus(parsed.payload as OrgStatusPayload);
      }
      if (kind === 'orgPreflight' && parsed.payload) {
        setOrgPreflight(parsed.payload as OrgPreflightPayload);
      }
      if (kind === 'metadataCatalog' && parsed.payload) {
        setMetadataCatalog(parsed.payload as MetadataCatalogPayload);
      }
      if (kind === 'metadataMembers' && parsed.payload && typeof payload.type === 'string') {
        const type = payload.type;
        setMetadataMembersByType((current) => ({
          ...current,
          [type]: parsed.payload as MetadataMembersPayload
        }));
      }

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected org query failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      presentResponse(fallback);
      setErrorText('Request failed. Check API readiness, query format, and local runtime health. Use /ready and /metrics for diagnosis.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function runRefreshQuery(kind: RefreshQueryKind, payload: Record<string, unknown> = {}): Promise<QueryResponse | null> {
    setLoading(true);
    setCopied(false);
    setErrorText('');

    try {
      const parsed =
        kind === 'refresh'
          ? await runRefresh({
              mode: payload.mode === 'full' || payload.mode === 'incremental' ? payload.mode : undefined
            })
          : await getRefreshDiff(
              typeof payload.fromSnapshot === 'string' ? payload.fromSnapshot : '',
              typeof payload.toSnapshot === 'string' ? payload.toSnapshot : ''
            );

      presentResponse(parsed);

      if (parsed.ok === false) {
        setErrorText(resolveErrorMessage(parsed));
      }

      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected refresh query failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      presentResponse(fallback);
      setErrorText('Request failed. Check API readiness, query format, and local runtime health. Use /ready and /metrics for diagnosis.');
      return null;
    } finally {
      setLoading(false);
    }
  }

  function presentResponse(parsed: QueryResponse): void {
    setResponseData(parsed);
    setResponseText(pretty(parsed));
  }

  function toggleTypeSelection(type: string): void {
    setMetadataSelected((current) => {
      const idx = current.findIndex((entry) => entry.type === type);
      if (idx >= 0) {
        return current.filter((entry) => entry.type !== type);
      }
      return [...current, { type }];
    });
  }

  function toggleMemberSelection(type: string, member: string): void {
    setMetadataSelected((current) => {
      const idx = current.findIndex((entry) => entry.type === type);
      if (idx < 0) {
        return [...current, { type, members: [member] }];
      }

      const existing = current[idx];
      const members = Array.isArray(existing.members) ? [...existing.members] : [];
      const exists = members.includes(member);
      const nextMembers = exists ? members.filter((v) => v !== member) : [...members, member].sort((a, b) => a.localeCompare(b));
      const nextEntry = nextMembers.length > 0 ? { type, members: nextMembers } : { type };
      const copy = [...current];
      copy[idx] = nextEntry;
      return copy;
    });
  }

  function isTypeSelected(type: string): boolean {
    return metadataSelected.some((entry) => entry.type === type);
  }

  function isMemberSelected(type: string, member: string): boolean {
    const typeEntry = metadataSelected.find((entry) => entry.type === type);
    if (!typeEntry || !Array.isArray(typeEntry.members)) return false;
    return typeEntry.members.includes(member);
  }

  async function loadMembers(type: string): Promise<void> {
    setMetadataLoadingType(type);
    await runOrgQuery('metadataMembers', {
      type,
      q: metadataMemberSearch,
      limit: parseOptionalInt(metadataLimitRaw) ?? 1000,
      refresh: metadataForceRefresh
    });
    setMetadataLoadingType('');
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

  const statusTone = (status: string): string => {
    if (status === 'ok' || status === 'ready' || status === 'connected') return 'good';
    if (status === 'unknown') return 'muted';
    return 'bad';
  };

  const trustTone = (trustLevel: string): string => {
    if (trustLevel === 'trusted') return 'good';
    if (trustLevel === 'conditional' || trustLevel === 'waiting') return 'muted';
    return 'bad';
  };

  return (
    <main className="og-shell">
      <header className="og-topbar">
        <div className="brand-block">
          <p className="brand-kicker">Deterministic Semantic Runtime</p>
          <h1>Orgumented Desktop</h1>
          <p className="brand-sub">Ask-first architecture operations with a local desktop shell, trusted evidence, and replayable proof.</p>
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={() => void refreshStatuses()} disabled={loading}>Refresh Status</button>
          <button type="button" onClick={() => void runOrgQuery('orgPreflight', { alias: orgAlias })} disabled={loading}>Preflight</button>
          <button type="button" onClick={() => void runOrgQuery('orgConnect', { alias: orgAlias })} disabled={loading}>Connect Org</button>
        </div>
      </header>

      <section className="status-strip">
        <article className={`status-pill ${statusTone(healthStatus)}`}>
          <span>API Health</span>
          <strong>{healthStatus}</strong>
        </article>
        <article className={`status-pill ${statusTone(readyStatus)}`}>
          <span>API Ready</span>
          <strong>{readyStatus}</strong>
        </article>
        <article className={`status-pill ${statusTone(sessionStatus)}`}>
          <span>Org Session</span>
          <strong>{sessionStatus}</strong>
        </article>
        <article className={`status-pill ${trustTone(askWorkspace.askTrust)}`}>
          <span>Ask Trust</span>
          <strong>{askWorkspace.askTrust}</strong>
        </article>
      </section>

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
              activeAlias={activeAlias}
              sessionStatus={sessionStatus}
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
              trustTone={trustTone}
              onRunAsk={() => void askWorkspace.runAsk(parseOptionalInt(askWorkspace.maxCitationsRaw) ?? 5)}
              onRunAskElaboration={() => void askWorkspace.runAskElaboration(parseOptionalInt(askWorkspace.maxCitationsRaw) ?? 5)}
              onOpenConnect={() => setUiTab('connect')}
              onRefreshAliases={() => void runOrgQuery('orgSessionAliases')}
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
              orgAlias={orgAlias}
              setOrgAlias={setOrgAlias}
              orgStatus={orgStatus}
              orgPreflight={orgPreflight}
              orgAliases={orgAliases}
              orgSession={orgSession}
              loading={loading}
              onLoadAliases={() => void runOrgQuery('orgSessionAliases')}
              onCheckSession={() => void runOrgQuery('orgSession')}
              onCheckToolStatus={() => void runOrgQuery('orgStatus')}
              onPreflight={() => void runOrgQuery('orgPreflight', { alias: orgAlias })}
              onSwitchAlias={() => void runOrgQuery('orgSessionSwitch', { alias: orgAlias })}
              onConnectExistingAlias={() => void runOrgQuery('orgConnect', { alias: orgAlias })}
              onDisconnect={() => void runOrgQuery('orgSessionDisconnect')}
              onInspectAlias={(alias) => {
                setOrgAlias(alias);
                void runOrgQuery('orgPreflight', { alias });
              }}
            />
          )}

          {uiTab === 'browser' && (
            <BrowserWorkspace
              metadataSearch={metadataSearch}
              setMetadataSearch={setMetadataSearch}
              metadataMemberSearch={metadataMemberSearch}
              setMetadataMemberSearch={setMetadataMemberSearch}
              metadataLimitRaw={metadataLimitRaw}
              setMetadataLimitRaw={setMetadataLimitRaw}
              metadataForceRefresh={metadataForceRefresh}
              setMetadataForceRefresh={setMetadataForceRefresh}
              metadataAutoRefresh={metadataAutoRefresh}
              setMetadataAutoRefresh={setMetadataAutoRefresh}
              metadataCatalog={metadataCatalog}
              metadataMembersByType={metadataMembersByType}
              metadataLoadingType={metadataLoadingType}
              metadataSelectionsRaw={metadataSelectionsRaw}
              setMetadataSelectionsRaw={setMetadataSelectionsRaw}
              loading={loading}
              onRefreshTypes={() =>
                void runOrgQuery('metadataCatalog', {
                  q: metadataSearch,
                  limit: parseOptionalInt(metadataLimitRaw) ?? 200,
                  refresh: metadataForceRefresh
                })
              }
              onClearFilters={() => {
                setMetadataSearch('');
                setMetadataMemberSearch('');
                setMetadataForceRefresh(false);
              }}
              onLoadMembers={(type) => void loadMembers(type)}
              onToggleType={toggleTypeSelection}
              onToggleMember={toggleMemberSelection}
              isTypeSelected={isTypeSelected}
              isMemberSelected={isMemberSelected}
              onRetrieveSelected={() => {
                let selections: MetadataSelection[] = metadataSelected;
                try {
                  const parsed = JSON.parse(metadataSelectionsRaw) as MetadataSelection[];
                  if (Array.isArray(parsed)) {
                    selections = parsed;
                  }
                } catch {
                  // keep structured selection
                }
                void runOrgQuery('metadataRetrieve', { selections, autoRefresh: metadataAutoRefresh });
              }}
            />
          )}

          {uiTab === 'refresh' && (
            <>
              <h2>Refresh &amp; Build</h2>
              <p className="section-lead">Rebuild semantic state and compare snapshot drift with deterministic outputs.</p>

              <label htmlFor="refreshMode">Refresh Mode</label>
              <select id="refreshMode" value={refreshMode} onChange={(e) => setRefreshMode(e.target.value as 'incremental' | 'full')}>
                <option value="incremental">incremental</option>
                <option value="full">full</option>
              </select>

              <div className="action-row">
                <button type="button" onClick={() => void runRefreshQuery('refresh', { mode: refreshMode })} disabled={loading}>Run Refresh</button>
              </div>

              <div className="field-grid">
                <div>
                  <label htmlFor="fromSnapshot">From Snapshot ID</label>
                  <input id="fromSnapshot" value={fromSnapshot} onChange={(e) => setFromSnapshot(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="toSnapshot">To Snapshot ID</label>
                  <input id="toSnapshot" value={toSnapshot} onChange={(e) => setToSnapshot(e.target.value)} />
                </div>
              </div>

              <div className="action-row">
                <button
                  type="button"
                  onClick={() => void runRefreshQuery('refreshDiff', { fromSnapshot, toSnapshot })}
                  disabled={loading}
                >
                  Run Diff
                </button>
              </div>

              <h3>Org Retrieve Pipeline</h3>
              <div className="field-grid">
                <label className="check-row" htmlFor="orgRunAuth">
                  <input id="orgRunAuth" type="checkbox" checked={orgRunAuth} onChange={(e) => setOrgRunAuth(e.target.checked)} />
                  Run Auth
                </label>
                <label className="check-row" htmlFor="orgRunRetrieve">
                  <input id="orgRunRetrieve" type="checkbox" checked={orgRunRetrieve} onChange={(e) => setOrgRunRetrieve(e.target.checked)} />
                  Run Retrieve
                </label>
                <label className="check-row" htmlFor="orgAutoRefresh">
                  <input id="orgAutoRefresh" type="checkbox" checked={orgAutoRefresh} onChange={(e) => setOrgAutoRefresh(e.target.checked)} />
                  Auto Refresh
                </label>
              </div>
              <div className="action-row">
                <button
                  type="button"
                  onClick={() =>
                    void runOrgQuery('orgRetrieve', {
                      alias: orgAlias,
                      runAuth: orgRunAuth,
                      runRetrieve: orgRunRetrieve,
                      autoRefresh: orgAutoRefresh
                    })
                  }
                  disabled={loading}
                >
                  Run Org Retrieve
                </button>
              </div>
            </>
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
            <>
              <h2>Settings &amp; Diagnostics</h2>
              <p className="section-lead">Operational context, adaptation dry-run, runtime health, and local diagnostics.</p>
              <label className="check-row" htmlFor="metaDryRun">
                <input id="metaDryRun" type="checkbox" checked={metaDryRun} onChange={(e) => setMetaDryRun(e.target.checked)} />
                Meta Adapt Dry Run
              </label>
              <div className="action-row">
                <button type="button" onClick={() => void runQuery('metaContext')} disabled={loading}>Meta Context</button>
                <button type="button" onClick={() => void runQuery('metaAdapt', { dryRun: metaDryRun })} disabled={loading}>Meta Adapt (Dry Run)</button>
                <button type="button" onClick={() => void runOrgQuery('orgStatus')} disabled={loading}>Org Status</button>
              </div>
            </>
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
            <p><strong>Session:</strong> {sessionStatus}</p>
            <p><strong>Alias:</strong> {activeAlias}</p>
            <p><strong>Auth Mode:</strong> {orgSession?.authMode || orgStatus?.authMode || 'sf_cli_keychain'}</p>
            <p><strong>sf Installed:</strong> {orgStatus?.sf?.installed ? 'yes' : 'no'}</p>
            <p><strong>CCI Installed:</strong> {orgStatus?.cci?.installed ? 'yes' : 'no'}</p>
          </div>

          {orgPreflight?.issues && orgPreflight.issues.length > 0 ? (
            <div className="sub-card warn">
              <h3>Preflight Issues</h3>
              <ul>
                {orgPreflight.issues.slice(0, 5).map((issue, idx) => (
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

          {readyDetails ? (
            <details>
              <summary>Ready Details</summary>
              <pre>{readyDetails}</pre>
            </details>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
