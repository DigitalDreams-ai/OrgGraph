'use client';

import { useEffect, useState } from 'react';
import {
  exportAskMetrics,
  getAskProof,
  listAskProofsRecent,
  replayAskProof,
  type QueryResponse
} from './lib/ask-client';
import { AskWorkspace } from './workspaces/ask/ask-workspace';
import { useAskWorkspace } from './workspaces/ask/use-ask-workspace';

type QueryKind =
  | 'refresh'
  | 'orgConnect'
  | 'orgSessionAliases'
  | 'orgSession'
  | 'orgPreflight'
  | 'orgSessionSwitch'
  | 'orgSessionDisconnect'
  | 'perms'
  | 'permsDiagnose'
  | 'permsSystem'
  | 'automation'
  | 'impact'
  | 'orgStatus'
  | 'orgRetrieve'
  | 'metadataCatalog'
  | 'metadataMembers'
  | 'metadataRetrieve'
  | 'refreshDiff'
  | 'metaContext'
  | 'metaAdapt';

type UiTab = 'ask' | 'connect' | 'browser' | 'refresh' | 'analyze' | 'proofs' | 'system';
type AnalyzeMode = 'perms' | 'automation' | 'impact' | 'system';

type MetadataCatalogType = { type: string; memberCount: number };
type MetadataMember = { name: string };

type MetadataCatalogPayload = {
  source: 'local' | 'source_api' | 'metadata_api' | 'cache' | 'mixed';
  refreshedAt: string;
  totalTypes: number;
  types: MetadataCatalogType[];
  warnings?: string[];
};

type MetadataMembersPayload = {
  source: 'local' | 'source_api' | 'metadata_api' | 'cache' | 'mixed';
  refreshedAt: string;
  type: string;
  totalMembers: number;
  members: MetadataMember[];
  warnings?: string[];
};

type OrgSessionPayload = {
  status?: string;
  activeAlias?: string;
  authMode?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastError?: string;
};

type OrgAliasSummary = {
  alias: string;
  username?: string;
  orgId?: string;
  instanceUrl?: string;
  isDefault: boolean;
  source: 'sf_cli_keychain';
};

type OrgSessionAliasesPayload = {
  authMode?: string;
  activeAlias?: string;
  aliases?: OrgAliasSummary[];
};

type OrgStatusPayload = {
  integrationEnabled?: boolean;
  alias?: string;
  authMode?: string;
  cci?: {
    installed?: boolean;
    version?: string;
    requiredVersion?: string;
    versionPinned?: boolean;
    message?: string;
  };
  sf?: { installed?: boolean; message?: string };
  session?: OrgSessionPayload;
};

type OrgPreflightPayload = {
  ok?: boolean;
  checks?: {
    cciInstalled?: boolean;
    cciVersionPinned?: boolean;
    cciAliasAvailable?: boolean;
    sfInstalled?: boolean;
    parsePathPresent?: boolean;
    aliasAuthenticated?: boolean;
    sessionConnected?: boolean;
  };
  issues?: Array<{ code?: string; severity?: string; message?: string; remediation?: string }>;
};

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
    'Request failed. Check API readiness, query format, and local runtime health. Use /api/ready and /metrics for diagnosis.'
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
  const [metadataSelected, setMetadataSelected] = useState<Array<{ type: string; members?: string[] }>>([]);
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

  const [proofId, setProofId] = useState('');
  const [replayToken, setReplayToken] = useState('');
  const [metaDryRun, setMetaDryRun] = useState(true);

  const askWorkspace = useAskWorkspace({
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
    if (askWorkspace.askProofId) {
      setProofId(askWorkspace.askProofId);
    }
    if (askWorkspace.askReplayToken) {
      setReplayToken(askWorkspace.askReplayToken);
    }
  }, [askWorkspace.askProofId, askWorkspace.askReplayToken]);

  useEffect(() => {
    setMetadataSelectionsRaw(pretty(metadataSelected));
  }, [metadataSelected]);

  async function refreshStatuses(): Promise<void> {
    try {
      const healthRes = await fetch('/api/health', { cache: 'no-store' });
      setHealthStatus(healthRes.ok ? 'ok' : `http_${healthRes.status}`);
    } catch {
      setHealthStatus('unreachable');
    }

    try {
      const readyRes = await fetch('/api/ready', { cache: 'no-store' });
      const readyJson = await readyRes.json();
      setReadyStatus(readyRes.ok ? 'ready' : `http_${readyRes.status}`);
      setReadyDetails(pretty(readyJson));
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
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, payload })
      });

      const text = await res.text();
      let parsed: QueryResponse;
      try {
        parsed = JSON.parse(text) as QueryResponse;
      } catch {
        parsed = { ok: false, statusCode: res.status, error: { message: text } };
      }

      presentResponse(parsed);

      if (!res.ok || parsed.ok === false) {
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
      const message = error instanceof Error ? error.message : 'Unexpected query failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      presentResponse(fallback);
      setErrorText('Request failed. Check API readiness, query format, and local runtime health. Use /api/ready and /metrics for diagnosis.');
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
    await runQuery('metadataMembers', {
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

  async function runAskProofsRecent(): Promise<void> {
    setLoading(true);
    setCopied(false);
    setErrorText('');

    try {
      const result = await listAskProofsRecent(parseOptionalInt(limitRaw) ?? 20);
      presentResponse(result);
      if (result.ok === false) {
        setErrorText(resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected recent proofs failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      presentResponse(fallback);
      setErrorText('Proof history request failed. Check API readiness and local runtime health.');
    } finally {
      setLoading(false);
    }
  }

  async function runAskProofLookup(): Promise<void> {
    if (!proofId.trim()) return;

    setLoading(true);
    setCopied(false);
    setErrorText('');

    try {
      const result = await getAskProof(proofId.trim());
      presentResponse(result);
      if (result.ok === false) {
        setErrorText(resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected proof lookup failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      presentResponse(fallback);
      setErrorText('Proof lookup failed. Check API readiness and local runtime health.');
    } finally {
      setLoading(false);
    }
  }

  async function runAskReplay(): Promise<void> {
    if (!proofId.trim() && !replayToken.trim()) return;

    setLoading(true);
    setCopied(false);
    setErrorText('');

    try {
      const result = await replayAskProof({
        replayToken: replayToken.trim() || undefined,
        proofId: proofId.trim() || undefined
      });
      presentResponse(result);
      if (result.ok === false) {
        setErrorText(resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected replay failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      presentResponse(fallback);
      setErrorText('Replay failed. Check API readiness and local runtime health.');
    } finally {
      setLoading(false);
    }
  }

  async function runAskMetricsExport(): Promise<void> {
    setLoading(true);
    setCopied(false);
    setErrorText('');

    try {
      const result = await exportAskMetrics();
      presentResponse(result);
      if (result.ok === false) {
        setErrorText(resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected metrics export failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      presentResponse(fallback);
      setErrorText('Metrics export failed. Check API readiness and local runtime health.');
    } finally {
      setLoading(false);
    }
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
          <button type="button" onClick={() => void runQuery('orgPreflight', { alias: orgAlias })} disabled={loading}>Preflight</button>
          <button type="button" onClick={() => void runQuery('orgConnect', { alias: orgAlias })} disabled={loading}>Connect Org</button>
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
              onRefreshAliases={() => void runQuery('orgSessionAliases')}
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
                if (askWorkspace.askProofId) setProofId(askWorkspace.askProofId);
                if (askWorkspace.askReplayToken) setReplayToken(askWorkspace.askReplayToken);
                setUiTab('proofs');
              }}
              onSaveToHistory={() => {
                if (askWorkspace.askReplayToken) setReplayToken(askWorkspace.askReplayToken);
                if (askWorkspace.askProofId) setProofId(askWorkspace.askProofId);
                setUiTab('proofs');
              }}
            />
          )}

          {uiTab === 'connect' && (
            <>
              <h2>Org Sessions</h2>
              <p className="section-lead">
                Login uses Salesforce CLI keychain first, then CCI registry import for deterministic org tooling.
              </p>

              <div className="sub-card">
                <h3>Runtime Commands</h3>
                <pre>{`# 1) Authenticate in sf keychain
sf org login web --alias ${orgAlias} --instance-url https://test.salesforce.com --set-default

# 2) Bridge alias into CCI registry
cci org import ${orgAlias} <sf-username>`}</pre>
              </div>

              <label htmlFor="orgAlias">Org Alias</label>
              <input id="orgAlias" value={orgAlias} onChange={(e) => setOrgAlias(e.target.value)} />

              <div className="field-grid">
                <div className="sub-card">
                  <h3>sf CLI</h3>
                  <p><strong>Installed:</strong> {orgStatus?.sf?.installed ? 'yes' : 'no'}</p>
                  <p>{orgStatus?.sf?.message || 'Run Check Tool Status'}</p>
                </div>
                <div className="sub-card">
                  <h3>CCI</h3>
                  <p><strong>Installed:</strong> {orgStatus?.cci?.installed ? 'yes' : 'no'}</p>
                  <p><strong>Version:</strong> {orgStatus?.cci?.version || 'n/a'}</p>
                  <p>{orgStatus?.cci?.message || 'Run Check Tool Status'}</p>
                </div>
                <div className="sub-card">
                  <h3>Preflight</h3>
                  <p><strong>Alias Authenticated:</strong> {orgPreflight?.checks?.aliasAuthenticated ? 'yes' : 'no'}</p>
                  <p><strong>CCI Alias Available:</strong> {orgPreflight?.checks?.cciAliasAvailable ? 'yes' : 'no'}</p>
                </div>
                <div className="sub-card">
                  <h3>Alias Inventory</h3>
                  <p><strong>Loaded:</strong> {orgAliases?.aliases?.length ?? 0}</p>
                  <p><strong>Active:</strong> {orgAliases?.activeAlias || orgSession?.activeAlias || orgAlias}</p>
                </div>
              </div>

              <div className="action-row">
                <button type="button" onClick={() => void runQuery('orgSessionAliases')} disabled={loading}>Load Aliases</button>
                <button type="button" onClick={() => void runQuery('orgSession')} disabled={loading}>Check Session</button>
                <button type="button" onClick={() => void runQuery('orgStatus')} disabled={loading}>Check Tool Status</button>
                <button type="button" onClick={() => void runQuery('orgPreflight', { alias: orgAlias })} disabled={loading}>Preflight</button>
                <button type="button" onClick={() => void runQuery('orgSessionSwitch', { alias: orgAlias })} disabled={loading}>Switch Alias</button>
                <button type="button" onClick={() => void runQuery('orgConnect', { alias: orgAlias })} disabled={loading}>Connect Existing Alias</button>
                <button type="button" className="ghost" onClick={() => void runQuery('orgSessionDisconnect')} disabled={loading}>Disconnect</button>
              </div>

              {orgAliases?.aliases && orgAliases.aliases.length > 0 ? (
                <div className="sub-card">
                  <h3>Discovered Aliases</h3>
                  <ul className="member-list">
                    {orgAliases.aliases.map((entry) => (
                      <li key={entry.alias}>
                        <span>
                          <strong>{entry.alias}</strong>
                          {entry.isDefault ? ' default' : ''}
                          {entry.username ? ` | ${entry.username}` : ''}
                        </span>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setOrgAlias(entry.alias);
                            void runQuery('orgPreflight', { alias: entry.alias });
                          }}
                        >
                          Inspect
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}

          {uiTab === 'browser' && (
            <>
              <h2>Org Browser</h2>
              <p className="section-lead">Org-wide selective metadata retrieval with searchable type/member navigation.</p>

              <div className="field-grid">
                <div>
                  <label htmlFor="metadataSearch">Type Search</label>
                  <input id="metadataSearch" value={metadataSearch} onChange={(e) => setMetadataSearch(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="metadataMemberSearch">Member Search</label>
                  <input id="metadataMemberSearch" value={metadataMemberSearch} onChange={(e) => setMetadataMemberSearch(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="metadataLimit">Catalog Limit</label>
                  <input id="metadataLimit" value={metadataLimitRaw} onChange={(e) => setMetadataLimitRaw(e.target.value)} />
                </div>
                <label className="check-row" htmlFor="forceRefresh">
                  <input id="forceRefresh" type="checkbox" checked={metadataForceRefresh} onChange={(e) => setMetadataForceRefresh(e.target.checked)} />
                  Force Refresh
                </label>
                <label className="check-row" htmlFor="metadataAutoRefresh">
                  <input id="metadataAutoRefresh" type="checkbox" checked={metadataAutoRefresh} onChange={(e) => setMetadataAutoRefresh(e.target.checked)} />
                  Auto Refresh After Retrieve
                </label>
              </div>

              <div className="action-row">
                <button
                  type="button"
                  onClick={() =>
                    void runQuery('metadataCatalog', {
                      q: metadataSearch,
                      limit: parseOptionalInt(metadataLimitRaw) ?? 200,
                      refresh: metadataForceRefresh
                    })
                  }
                  disabled={loading}
                >
                  Refresh Types
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    setMetadataSearch('');
                    setMetadataMemberSearch('');
                    setMetadataForceRefresh(false);
                  }}
                >
                  Clear Filters
                </button>
              </div>

              <div className="org-browser-frame">
                {(metadataCatalog?.types || []).map((typeRow) => {
                  const membersPayload = metadataMembersByType[typeRow.type];
                  const members = membersPayload?.members || [];
                  return (
                    <details key={typeRow.type}>
                      <summary>
                        <span>{typeRow.type}</span>
                        <span>{typeRow.memberCount}</span>
                      </summary>
                      <div className="type-actions">
                        <button type="button" onClick={() => void loadMembers(typeRow.type)} disabled={loading || metadataLoadingType === typeRow.type}>
                          {metadataLoadingType === typeRow.type ? 'Loading...' : 'Load Members'}
                        </button>
                        <button type="button" className="ghost" onClick={() => toggleTypeSelection(typeRow.type)}>
                          {isTypeSelected(typeRow.type) ? 'Remove Type' : 'Add Type'}
                        </button>
                      </div>
                      {members.length > 0 ? (
                        <ul className="member-list">
                          {members.map((member) => (
                            <li key={`${typeRow.type}:${member.name}`}>
                              <span>{member.name}</span>
                              <button type="button" className="ghost" onClick={() => toggleMemberSelection(typeRow.type, member.name)}>
                                {isMemberSelected(typeRow.type, member.name) ? 'Remove' : 'Add'}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">No members loaded.</p>
                      )}
                    </details>
                  );
                })}
              </div>

              <h3>Retrieval Cart</h3>
              <textarea
                rows={8}
                value={metadataSelectionsRaw}
                onChange={(e) => setMetadataSelectionsRaw(e.target.value)}
                placeholder='[{"type":"CustomObject","members":["Account"]}]'
              />
              <div className="action-row">
                <button
                  type="button"
                  onClick={() => {
                    let selections: Array<{ type: string; members?: string[] }> = metadataSelected;
                    try {
                      const parsed = JSON.parse(metadataSelectionsRaw) as Array<{ type: string; members?: string[] }>;
                      if (Array.isArray(parsed)) {
                        selections = parsed;
                      }
                    } catch {
                      // keep structured selection
                    }
                    void runQuery('metadataRetrieve', { selections, autoRefresh: metadataAutoRefresh });
                  }}
                  disabled={loading}
                >
                  Retrieve Selected
                </button>
              </div>
            </>
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
                <button type="button" onClick={() => void runQuery('refresh', { mode: refreshMode })} disabled={loading}>Run Refresh</button>
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
                  onClick={() => void runQuery('refreshDiff', { fromSnapshot, toSnapshot })}
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
                    void runQuery('orgRetrieve', {
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
            <>
              <h2>Explain &amp; Analyze</h2>
              <p className="section-lead">Deterministic permission, automation, and impact analysis with controlled strictness.</p>

              <div className="sub-tab-row" role="tablist" aria-label="Analyze sub tabs">
                <button type="button" className={analyzeMode === 'perms' ? 'sub-tab active' : 'sub-tab'} onClick={() => setAnalyzeMode('perms')}>Permissions</button>
                <button type="button" className={analyzeMode === 'automation' ? 'sub-tab active' : 'sub-tab'} onClick={() => setAnalyzeMode('automation')}>Automation</button>
                <button type="button" className={analyzeMode === 'impact' ? 'sub-tab active' : 'sub-tab'} onClick={() => setAnalyzeMode('impact')}>Impact</button>
                <button type="button" className={analyzeMode === 'system' ? 'sub-tab active' : 'sub-tab'} onClick={() => setAnalyzeMode('system')}>System Permission</button>
              </div>

              <div className="field-grid">
                <div>
                  <label htmlFor="anUser">User</label>
                  <input id="anUser" value={user} onChange={(e) => setUser(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="anObject">Object</label>
                  <input id="anObject" value={objectName} onChange={(e) => setObjectName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="anField">Field</label>
                  <input id="anField" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="anSystemPerm">System Permission</label>
                  <input id="anSystemPerm" value={systemPermission} onChange={(e) => setSystemPermission(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="anLimit">Limit</label>
                  <input id="anLimit" value={limitRaw} onChange={(e) => setLimitRaw(e.target.value)} />
                </div>
                <label className="check-row" htmlFor="strictMode">
                  <input id="strictMode" type="checkbox" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} />
                  Strict Mode
                </label>
                <label className="check-row" htmlFor="explainMode">
                  <input id="explainMode" type="checkbox" checked={explainMode} onChange={(e) => setExplainMode(e.target.checked)} />
                  Explain Mode
                </label>
                <label className="check-row" htmlFor="debugMode">
                  <input id="debugMode" type="checkbox" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} />
                  Debug Mode
                </label>
              </div>

              <div className="action-row">
                {analyzeMode === 'perms' ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        void runQuery('perms', {
                          user,
                          object: objectName,
                          field: fieldName,
                          limit: parseOptionalInt(limitRaw)
                        })
                      }
                      disabled={loading}
                    >
                      Run Permissions Analysis
                    </button>
                    <button type="button" className="ghost" onClick={() => void runQuery('permsDiagnose', { user })} disabled={loading}>
                      Diagnose User Mapping
                    </button>
                  </>
                ) : null}

                {analyzeMode === 'automation' ? (
                  <button
                    type="button"
                    onClick={() =>
                      void runQuery('automation', {
                        object: objectName,
                        limit: parseOptionalInt(limitRaw),
                        strict: strictMode,
                        explain: explainMode,
                        includeLowConfidence: askWorkspace.includeLowConfidence
                      })
                    }
                    disabled={loading}
                  >
                    Run Automation Analysis
                  </button>
                ) : null}

                {analyzeMode === 'impact' ? (
                  <button
                    type="button"
                    onClick={() =>
                      void runQuery('impact', {
                        field: fieldName,
                        limit: parseOptionalInt(limitRaw),
                        strict: strictMode,
                        explain: explainMode,
                        debug: debugMode,
                        includeLowConfidence: askWorkspace.includeLowConfidence
                      })
                    }
                    disabled={loading}
                  >
                    Run Impact Analysis
                  </button>
                ) : null}

                {analyzeMode === 'system' ? (
                  <button
                    type="button"
                    onClick={() =>
                      void runQuery('permsSystem', {
                        user,
                        permission: systemPermission,
                        limit: parseOptionalInt(limitRaw)
                      })
                    }
                    disabled={loading}
                  >
                    Run System Permission Check
                  </button>
                ) : null}
              </div>
            </>
          )}

          {uiTab === 'proofs' && (
            <>
              <h2>Proofs &amp; History</h2>
              <p className="section-lead">Inspect deterministic proof artifacts, replay tokens, and history exports without managing raw tokens as the primary workflow.</p>

              <div className="field-grid">
                <div>
                  <label htmlFor="proofId">Proof ID</label>
                  <input id="proofId" value={proofId} onChange={(e) => setProofId(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="replayToken">Replay Token</label>
                  <input id="replayToken" value={replayToken} onChange={(e) => setReplayToken(e.target.value)} />
                </div>
              </div>

              <div className="action-row">
                <button type="button" onClick={() => void runAskProofsRecent()} disabled={loading}>List Recent Proofs</button>
                <button type="button" onClick={() => void runAskProofLookup()} disabled={loading || !proofId.trim()}>Get Proof</button>
                <button type="button" onClick={() => void runAskReplay()} disabled={loading || (!proofId.trim() && !replayToken.trim())}>Replay Proof</button>
                <button type="button" onClick={() => void runAskMetricsExport()} disabled={loading}>Export Metrics</button>
              </div>
            </>
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
                <button type="button" onClick={() => void runQuery('orgStatus')} disabled={loading}>Org Status</button>
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
