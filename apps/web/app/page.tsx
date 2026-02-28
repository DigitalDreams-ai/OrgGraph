'use client';

import { useEffect, useMemo, useState } from 'react';

type QueryKind =
  | 'refresh'
  | 'orgConnect'
  | 'orgSession'
  | 'orgPreflight'
  | 'orgSessionSwitch'
  | 'orgSessionDisconnect'
  | 'perms'
  | 'permsDiagnose'
  | 'permsSystem'
  | 'automation'
  | 'impact'
  | 'ask'
  | 'orgStatus'
  | 'orgRetrieve'
  | 'metadataCatalog'
  | 'metadataMembers'
  | 'metadataRetrieve'
  | 'refreshDiff'
  | 'askProofsRecent'
  | 'askProof'
  | 'askReplay'
  | 'askMetrics'
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

type AskPayload = {
  answer?: string;
  deterministicAnswer?: string;
  confidence?: number;
  trustLevel?: string;
  policy?: { policyId?: string };
  proof?: { proofId?: string; replayToken?: string; snapshotId?: string };
  citations?: Array<{ sourcePath?: string; score?: number; snippet?: string }>;
};

type OrgSessionPayload = {
  status?: string;
  activeAlias?: string;
  authMode?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastError?: string;
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

type QueryResponse = {
  ok?: boolean;
  statusCode?: number;
  payload?: Record<string, unknown>;
  error?: { message?: string };
};

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev-local';

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

  const [askQuery, setAskQuery] = useState('What touches Opportunity.StageName?');
  const [maxCitationsRaw, setMaxCitationsRaw] = useState('5');
  const [consistencyCheck, setConsistencyCheck] = useState(true);
  const [includeLowConfidence, setIncludeLowConfidence] = useState(false);
  const [askElaboration, setAskElaboration] = useState('');

  const [orgAlias, setOrgAlias] = useState('orgumented-sandbox');
  const [orgSession, setOrgSession] = useState<OrgSessionPayload | null>(null);
  const [orgStatus, setOrgStatus] = useState<OrgStatusPayload | null>(null);
  const [orgPreflight, setOrgPreflight] = useState<OrgPreflightPayload | null>(null);

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

  const askPayload = useMemo(() => {
    if (!responseData?.payload) return null;
    return responseData.payload as AskPayload;
  }, [responseData]);

  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('orgumented.newui.tab') as UiTab | null;
      if (savedTab) setUiTab(savedTab);
      const savedAlias = localStorage.getItem('orgumented.newui.alias');
      if (savedAlias) setOrgAlias(savedAlias);
      const savedAsk = localStorage.getItem('orgumented.newui.ask');
      if (savedAsk) setAskQuery(savedAsk);
    } catch {
      // ignore
    }
    void refreshStatuses();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('orgumented.newui.tab', uiTab);
      localStorage.setItem('orgumented.newui.alias', orgAlias);
      localStorage.setItem('orgumented.newui.ask', askQuery);
    } catch {
      // ignore
    }
  }, [uiTab, orgAlias, askQuery]);

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

      setResponseData(parsed);
      setResponseText(pretty(parsed));

      if (!res.ok || parsed.ok === false) {
        setErrorText(resolveErrorMessage(parsed));
      }

      if (kind === 'ask' && parsed.payload) {
        setAskElaboration('');
      }
      if ((kind === 'orgSession' || kind === 'orgSessionSwitch' || kind === 'orgSessionDisconnect') && parsed.payload) {
        setOrgSession(parsed.payload as OrgSessionPayload);
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
      setResponseData(fallback);
      setResponseText(pretty(fallback));
      setErrorText('Request failed. Check API readiness, query format, and local runtime health. Use /api/ready and /metrics for diagnosis.');
      return null;
    } finally {
      setLoading(false);
    }
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

  async function runAsk(): Promise<void> {
    await runQuery('ask', {
      query: askQuery,
      maxCitations: parseOptionalInt(maxCitationsRaw) ?? 5,
      consistencyCheck,
      includeLowConfidence
    });
  }

  async function runAskElaboration(): Promise<void> {
    if (!askQuery.trim()) return;
    const result = await runQuery('ask', {
      query: `Provide a concise operator explanation for: ${askQuery}`,
      maxCitations: parseOptionalInt(maxCitationsRaw) ?? 5,
      consistencyCheck,
      includeLowConfidence
    });
    const payload = result?.payload as AskPayload | undefined;
    if (payload) {
      setAskElaboration(payload.answer || payload.deterministicAnswer || 'No elaboration returned.');
    }
  }

  const statusTone = (status: string): string => {
    if (status === 'ok' || status === 'ready') return 'good';
    if (status === 'unknown') return 'muted';
    return 'bad';
  };

  return (
    <main className="og-shell">
      <header className="og-topbar">
        <div className="brand-block">
          <p className="brand-kicker">Deterministic Semantic Runtime</p>
          <h1>Orgumented Mission Control</h1>
          <p className="brand-sub">Ask-first architecture operations with replayable proof and trusted evidence.</p>
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
        <article className="status-pill muted">
          <span>Build</span>
          <strong>{BUILD_VERSION}</strong>
        </article>
        <article className="status-pill muted">
          <span>Alias</span>
          <strong>{orgSession?.activeAlias || orgStatus?.alias || orgAlias}</strong>
        </article>
      </section>

      <section className="workspace-grid">
        <aside className="left-nav panel">
          <h2>Workspace</h2>
          <nav className="tab-stack" role="tablist" aria-label="Primary navigation tabs">
            {([
              ['connect', 'Connect'],
              ['browser', 'Org Browser'],
              ['refresh', 'Refresh & Build'],
              ['analyze', 'Analyze'],
              ['ask', 'Ask'],
              ['proofs', 'Proofs & Metrics'],
              ['system', 'System']
            ] as Array<[UiTab, string]>).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={uiTab === id}
                type="button"
                className={uiTab === id ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setUiTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hint-card">
            <h3>Flagship</h3>
            <p>
              Ask is the primary workflow. Deterministic answer first, then optional elaboration,
              with replayable proof and citations.
            </p>
          </div>
        </aside>

        <section className="center-work panel">
          {uiTab === 'ask' && (
            <>
              <h2>Ask</h2>
              <p className="section-lead">Ask architecture questions in natural language. Orgumented compiles to deterministic graph operations.</p>

              <label htmlFor="askQuery">Question</label>
              <textarea
                id="askQuery"
                rows={5}
                value={askQuery}
                onChange={(e) => setAskQuery(e.target.value)}
                placeholder="What touches Opportunity.StageName?"
              />

              <div className="field-grid">
                <div>
                  <label htmlFor="maxCitations">Max Citations</label>
                  <input id="maxCitations" value={maxCitationsRaw} onChange={(e) => setMaxCitationsRaw(e.target.value)} />
                </div>
                <label className="check-row" htmlFor="consistencyCheck">
                  <input
                    id="consistencyCheck"
                    type="checkbox"
                    checked={consistencyCheck}
                    onChange={(e) => setConsistencyCheck(e.target.checked)}
                  />
                  Consistency Check
                </label>
                <label className="check-row" htmlFor="includeLowConfidence">
                  <input
                    id="includeLowConfidence"
                    type="checkbox"
                    checked={includeLowConfidence}
                    onChange={(e) => setIncludeLowConfidence(e.target.checked)}
                  />
                  Include Low Confidence
                </label>
              </div>

              <div className="action-row">
                <button type="button" onClick={() => void runAsk()} disabled={loading}>Run Ask</button>
                <button type="button" onClick={() => void runAskElaboration()} disabled={loading}>Generate Elaboration</button>
                <button type="button" className="ghost" onClick={() => setAskQuery('Who can edit Opportunity.StageName?')}>Prompt: Permissions</button>
                <button type="button" className="ghost" onClick={() => setAskQuery('What automations update Opportunity.StageName?')}>Prompt: Automation</button>
              </div>

              {askElaboration ? (
                <div className="sub-card">
                  <h3>Elaboration</h3>
                  <p>{askElaboration}</p>
                </div>
              ) : null}
            </>
          )}

          {uiTab === 'connect' && (
            <>
              <h2>Connect Org</h2>
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
              </div>

              <div className="action-row">
                <button type="button" onClick={() => void runQuery('orgSession')} disabled={loading}>Check Session</button>
                <button type="button" onClick={() => void runQuery('orgStatus')} disabled={loading}>Check Tool Status</button>
                <button type="button" onClick={() => void runQuery('orgPreflight', { alias: orgAlias })} disabled={loading}>Preflight</button>
                <button type="button" onClick={() => void runQuery('orgSessionSwitch', { alias: orgAlias })} disabled={loading}>Switch Alias</button>
                <button type="button" onClick={() => void runQuery('orgConnect', { alias: orgAlias })} disabled={loading}>Connect Existing Alias</button>
                <button type="button" className="ghost" onClick={() => void runQuery('orgSessionDisconnect')} disabled={loading}>Disconnect</button>
              </div>
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
              <h2>Analyze</h2>
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
                        includeLowConfidence
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
                        includeLowConfidence
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
              <h2>Proofs &amp; Metrics</h2>
              <p className="section-lead">Inspect deterministic proof artifacts, replay tokens, and metrics export.</p>

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
                <button type="button" onClick={() => void runQuery('askProofsRecent', { limit: parseOptionalInt(limitRaw) ?? 20 })} disabled={loading}>List Recent Proofs</button>
                <button type="button" onClick={() => void runQuery('askProof', { proofId })} disabled={loading || !proofId.trim()}>Get Proof</button>
                <button type="button" onClick={() => void runQuery('askReplay', { replayToken, proofId })} disabled={loading || (!proofId.trim() && !replayToken.trim())}>Replay Proof</button>
                <button type="button" onClick={() => void runQuery('askMetrics')} disabled={loading}>Export Metrics</button>
              </div>
            </>
          )}

          {uiTab === 'system' && (
            <>
              <h2>System</h2>
              <p className="section-lead">Operational context, adaptation dry-run, and org runtime status.</p>
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
            <h2>Proof Rail</h2>
            <button type="button" onClick={() => void copyJson()} disabled={!responseText}>{copied ? 'Copied' : 'Copy JSON'}</button>
          </div>

          {errorText ? <p className="error-text">{errorText}</p> : null}

          <div className="sub-card">
            <h3>Deterministic Summary</h3>
            <p>{askPayload?.answer || askPayload?.deterministicAnswer || 'Run Ask to populate this panel.'}</p>
          </div>

          <div className="sub-card">
            <h3>Trust + Replay</h3>
            <p><strong>Trust:</strong> {askPayload?.trustLevel || 'n/a'}</p>
            <p><strong>Confidence:</strong> {typeof askPayload?.confidence === 'number' ? askPayload.confidence : 'n/a'}</p>
            <p><strong>Policy ID:</strong> {askPayload?.policy?.policyId || 'n/a'}</p>
            <p><strong>Proof ID:</strong> {askPayload?.proof?.proofId || 'n/a'}</p>
            <p><strong>Replay Token:</strong> {askPayload?.proof?.replayToken || 'n/a'}</p>
          </div>

          <div className="sub-card">
            <h3>Connection</h3>
            <p><strong>Session:</strong> {orgSession?.status || orgStatus?.session?.status || 'unknown'}</p>
            <p><strong>Alias:</strong> {orgSession?.activeAlias || orgStatus?.session?.activeAlias || orgAlias}</p>
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

          <details open>
            <summary>Raw JSON</summary>
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
