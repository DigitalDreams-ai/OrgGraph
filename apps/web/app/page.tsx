'use client';

import { useMemo, useState } from 'react';

type QueryKind =
  | 'refresh'
  | 'orgConnect'
  | 'perms'
  | 'permsSystem'
  | 'automation'
  | 'impact'
  | 'ask'
  | 'orgStatus'
  | 'orgRetrieve'
  | 'metadataCatalog'
  | 'metadataRetrieve'
  | 'refreshDiff'
  | 'askArchitecture'
  | 'askProof'
  | 'askReplay'
  | 'askMetrics'
  | 'metaContext'
  | 'metaAdapt';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100';
const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev-local';

type MetadataCatalogMember = { name: string };
type MetadataCatalogType = { type: string; memberCount: number; members: MetadataCatalogMember[] };
type MetadataCatalogPayload = {
  source: 'local' | 'source_api' | 'metadata_api' | 'cache';
  refreshedAt: string;
  search?: string;
  totalTypes: number;
  types: MetadataCatalogType[];
  warnings?: string[];
};

type AskPayload = {
  answer?: string;
  plan?: unknown;
  citations?: Array<{ sourcePath?: string; score?: number }>;
  confidence?: number;
  status?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Page(): JSX.Element {
  const [kind, setKind] = useState<QueryKind>('ask');
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseObject, setResponseObject] = useState<Record<string, unknown> | null>(null);
  const [errorText, setErrorText] = useState('');
  const [copied, setCopied] = useState(false);
  const [healthStatus, setHealthStatus] = useState('unknown');
  const [readyStatus, setReadyStatus] = useState('unknown');
  const [readyDetails, setReadyDetails] = useState('');

  const [refreshMode, setRefreshMode] = useState<'full' | 'incremental'>('incremental');
  const [user, setUser] = useState('jane@example.com');
  const [objectName, setObjectName] = useState('Opportunity');
  const [fieldName, setFieldName] = useState('Opportunity.StageName');
  const [systemPermission, setSystemPermission] = useState('ApproveUninstalledConnectedApps');
  const [askQuery, setAskQuery] = useState('What touches Opportunity.StageName?');
  const [limitRaw, setLimitRaw] = useState('25');
  const [strictMode, setStrictMode] = useState(true);
  const [explainMode, setExplainMode] = useState(false);
  const [includeLowConfidence, setIncludeLowConfidence] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [maxCitationsRaw, setMaxCitationsRaw] = useState('5');
  const [consistencyCheck, setConsistencyCheck] = useState(true);
  const [askContextRaw, setAskContextRaw] = useState('{}');
  const [orgRunAuth, setOrgRunAuth] = useState(true);
  const [orgRunRetrieve, setOrgRunRetrieve] = useState(true);
  const [orgAutoRefresh, setOrgAutoRefresh] = useState(true);
  const [metadataSearch, setMetadataSearch] = useState('');
  const [metadataLimitRaw, setMetadataLimitRaw] = useState('200');
  const [metadataAutoRefresh, setMetadataAutoRefresh] = useState(true);
  const [metadataCatalog, setMetadataCatalog] = useState<MetadataCatalogPayload | null>(null);
  const [metadataSelected, setMetadataSelected] = useState<Array<{ type: string; members?: string[] }>>([]);
  const [metadataSelectionsRaw, setMetadataSelectionsRaw] = useState(
    JSON.stringify([{ type: 'CustomObject', members: ['Account'] }], null, 2)
  );
  const [fromSnapshot, setFromSnapshot] = useState('');
  const [toSnapshot, setToSnapshot] = useState('');
  const [archUser, setArchUser] = useState('jane@example.com');
  const [archObject, setArchObject] = useState('Opportunity');
  const [archField, setArchField] = useState('Opportunity.StageName');
  const [archMaxPathsRaw, setArchMaxPathsRaw] = useState('10');
  const [proofId, setProofId] = useState('');
  const [replayToken, setReplayToken] = useState('');
  const [metaDryRun, setMetaDryRun] = useState(true);
  const [askElaboration, setAskElaboration] = useState('');
  const [askElaborationLoading, setAskElaborationLoading] = useState(false);

  const askPayload = useMemo(() => {
    if (kind !== 'ask' || !responseObject || typeof responseObject.payload !== 'object' || responseObject.payload === null) {
      return null;
    }
    return responseObject.payload as AskPayload;
  }, [kind, responseObject]);

  const endpointHint = useMemo(() => {
    if (kind === 'refresh') {
      return 'POST /refresh';
    }
    if (kind === 'orgConnect') {
      return 'POST /org/retrieve (runAuth=true, runRetrieve=false, autoRefresh=false)';
    }
    if (kind === 'perms') {
      return 'GET /perms?user=...&object=...&field=...&limit=...';
    }
    if (kind === 'permsSystem') {
      return 'GET /perms/system?user=...&permission=...&limit=...';
    }
    if (kind === 'automation') {
      return 'GET /automation?object=...&limit=...&strict=...&explain=...&includeLowConfidence=...';
    }
    if (kind === 'impact') {
      return 'GET /impact?field=...&limit=...&strict=...&debug=...&explain=...&includeLowConfidence=...';
    }
    if (kind === 'orgStatus') {
      return 'GET /org/status';
    }
    if (kind === 'orgRetrieve') {
      return 'POST /org/retrieve';
    }
    if (kind === 'metadataCatalog') {
      return 'GET /org/metadata/catalog?q=...&limit=...';
    }
    if (kind === 'metadataRetrieve') {
      return 'POST /org/metadata/retrieve';
    }
    if (kind === 'refreshDiff') {
      return 'GET /refresh/diff/:from/:to';
    }
    if (kind === 'askArchitecture') {
      return 'POST /ask/architecture';
    }
    if (kind === 'askProof') {
      return 'GET /ask/proof/:proofId';
    }
    if (kind === 'askReplay') {
      return 'POST /ask/replay';
    }
    if (kind === 'askMetrics') {
      return 'GET /ask/metrics/export';
    }
    if (kind === 'metaContext') {
      return 'GET /meta/context';
    }
    if (kind === 'metaAdapt') {
      return 'POST /meta/adapt';
    }
    return 'POST /ask';
  }, [kind]);

  async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
    let lastError: Error | undefined;
    for (let i = 0; i < attempts; i += 1) {
      try {
        const res = await fetch(url, init);
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          if (i < attempts - 1) {
            await sleep(200 * (i + 1));
            continue;
          }
        }
        return res;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('unknown request error');
        if (i < attempts - 1) {
          await sleep(200 * (i + 1));
          continue;
        }
      }
    }
    throw lastError ?? new Error('request failed after retries');
  }

  async function refreshStatuses(): Promise<void> {
    try {
      const health = await fetch('/api/health', { cache: 'no-store' });
      setHealthStatus(health.ok ? 'ok' : `http_${health.status}`);
    } catch {
      setHealthStatus('unreachable');
    }

    try {
      const ready = await fetch('/api/ready', { cache: 'no-store' });
      const readyPayload = (await ready.json()) as { upstreamApi?: { payload?: unknown } };
      if (ready.ok) {
        setReadyStatus('ready');
      } else {
        setReadyStatus(`http_${ready.status}`);
      }
      setReadyDetails(JSON.stringify(readyPayload, null, 2));
    } catch {
      setReadyStatus('unreachable');
      setReadyDetails('');
    }
  }

  function parseOptionalInt(raw: string): number | undefined {
    if (raw.trim().length === 0) {
      return undefined;
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : undefined;
  }

  function parseContext(raw: string): Record<string, unknown> | undefined {
    if (raw.trim().length === 0) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  function syncSelectionsRaw(next: Array<{ type: string; members?: string[] }>): void {
    setMetadataSelectionsRaw(JSON.stringify(next, null, 2));
  }

  function addTypeSelection(type: string): void {
    setMetadataSelected((current) => {
      if (current.some((entry) => entry.type === type)) {
        return current;
      }
      const next = [...current, { type }];
      syncSelectionsRaw(next);
      return next;
    });
  }

  function removeTypeSelection(type: string): void {
    setMetadataSelected((current) => {
      const next = current.filter((entry) => entry.type !== type);
      syncSelectionsRaw(next);
      return next;
    });
  }

  function toggleMemberSelection(type: string, member: string): void {
    setMetadataSelected((current) => {
      const idx = current.findIndex((entry) => entry.type === type);
      if (idx === -1) {
        const next = [...current, { type, members: [member] }];
        syncSelectionsRaw(next);
        return next;
      }

      const existing = current[idx];
      const existingMembers = Array.isArray(existing.members) ? existing.members : [];
      const has = existingMembers.includes(member);
      const members = has
        ? existingMembers.filter((value) => value !== member)
        : [...existingMembers, member].sort((a, b) => a.localeCompare(b));
      const nextEntry = members.length > 0 ? { type, members } : { type };
      const next = [...current];
      next[idx] = nextEntry;
      syncSelectionsRaw(next);
      return next;
    });
  }

  function isTypeSelected(type: string): boolean {
    return metadataSelected.some((entry) => entry.type === type);
  }

  function isMemberSelected(type: string, member: string): boolean {
    const entry = metadataSelected.find((candidate) => candidate.type === type);
    if (!entry || !Array.isArray(entry.members)) {
      return false;
    }
    return entry.members.includes(member);
  }

  function metadataAgeLabel(refreshedAt: string): string {
    const refreshedMs = Date.parse(refreshedAt);
    if (Number.isNaN(refreshedMs)) {
      return 'unknown';
    }
    const ageSeconds = Math.max(0, Math.floor((Date.now() - refreshedMs) / 1000));
    if (ageSeconds < 60) {
      return `${ageSeconds}s ago`;
    }
    const ageMinutes = Math.floor(ageSeconds / 60);
    if (ageMinutes < 60) {
      return `${ageMinutes}m ago`;
    }
    const ageHours = Math.floor(ageMinutes / 60);
    return `${ageHours}h ago`;
  }

  async function runQuery(): Promise<void> {
    setLoading(true);
    setResponseText('');
    setResponseObject(null);
    setErrorText('');
    setCopied(false);
    if (kind === 'ask') {
      setAskElaboration('');
    }

    try {
      const limit = parseOptionalInt(limitRaw);
      const metadataLimit = parseOptionalInt(metadataLimitRaw);
      const maxCitations = parseOptionalInt(maxCitationsRaw);
      const askContext = parseContext(askContextRaw);
      const archMaxPaths = parseOptionalInt(archMaxPathsRaw);
      let metadataSelections: Array<{ type: string; members?: string[] }> = [];
      if (kind === 'metadataRetrieve') {
        const parsed = JSON.parse(metadataSelectionsRaw) as unknown;
        if (Array.isArray(parsed)) {
          metadataSelections = parsed as Array<{ type: string; members?: string[] }>;
        }
      }

      const payload =
        kind === 'refresh'
          ? { mode: refreshMode }
          : kind === 'orgConnect'
            ? {}
          : kind === 'orgStatus'
            ? {}
            : kind === 'orgRetrieve'
              ? { runAuth: orgRunAuth, runRetrieve: orgRunRetrieve, autoRefresh: orgAutoRefresh }
              : kind === 'metadataCatalog'
                ? { q: metadataSearch, limit: metadataLimit }
                : kind === 'metadataRetrieve'
                  ? { selections: metadataSelections, autoRefresh: metadataAutoRefresh }
                  : kind === 'refreshDiff'
                    ? { fromSnapshot, toSnapshot }
                    : kind === 'askArchitecture'
                      ? { user: archUser, object: archObject, field: archField, maxPaths: archMaxPaths }
                      : kind === 'askProof'
                        ? { proofId }
                        : kind === 'askReplay'
                          ? { replayToken, proofId }
                          : kind === 'askMetrics'
                            ? {}
                            : kind === 'metaContext'
                              ? {}
                              : kind === 'metaAdapt'
                                ? { dryRun: metaDryRun }
          : kind === 'perms'
            ? { user, object: objectName, field: fieldName, limit }
            : kind === 'permsSystem'
              ? { user, permission: systemPermission, limit }
              : kind === 'automation'
                ? { object: objectName, limit, strict: strictMode, explain: explainMode, includeLowConfidence }
                : kind === 'impact'
                  ? {
                      field: fieldName,
                      limit,
                      strict: strictMode,
                      explain: explainMode,
                      includeLowConfidence,
                      debug: debugMode
                    }
                  : {
                      query: askQuery,
                      maxCitations: typeof maxCitations === 'number' ? maxCitations : 5,
                      includeLowConfidence,
                      consistencyCheck,
                      context: askContext
                    };

      const response = await fetchWithRetry('/api/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, payload })
      });

      const wrapped = await response.json();
      setResponseText(JSON.stringify(wrapped, null, 2));
      if (wrapped && typeof wrapped === 'object') {
        setResponseObject(wrapped as Record<string, unknown>);
      }
      if (kind === 'metadataCatalog' && wrapped?.payload && typeof wrapped.payload === 'object') {
        const payload = wrapped.payload as Partial<MetadataCatalogPayload>;
        if (typeof payload.source === 'string' && Array.isArray(payload.types)) {
          setMetadataCatalog({
            source: payload.source as MetadataCatalogPayload['source'],
            refreshedAt: typeof payload.refreshedAt === 'string' ? payload.refreshedAt : new Date().toISOString(),
            search: typeof payload.search === 'string' ? payload.search : undefined,
            totalTypes: typeof payload.totalTypes === 'number' ? payload.totalTypes : payload.types.length,
            types: payload.types as MetadataCatalogType[],
            warnings: Array.isArray(payload.warnings) ? payload.warnings : []
          });
        }
      }

      if (!response.ok) {
        setErrorText(
          'Request failed. Check API readiness, query format, and container health. Use /api/ready and /metrics for diagnosis.'
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown request error';
      setResponseText(JSON.stringify({ ok: false, error: message }, null, 2));
      setErrorText('Network request failed after retries. Check container health and retry in a few seconds.');
    } finally {
      setLoading(false);
    }
  }

  async function runAskElaboration(): Promise<void> {
    if (!askPayload?.answer || askElaborationLoading) {
      return;
    }
    setAskElaborationLoading(true);
    setAskElaboration('');
    try {
      const response = await fetchWithRetry('/api/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'ask',
          payload: {
            query: `Explain this deterministically-derived answer in plain English for an admin: ${askPayload.answer}`,
            maxCitations: 3,
            includeLowConfidence: false,
            consistencyCheck: true,
            context: { source: 'ui-elaboration', originalQuery: askQuery }
          }
        })
      });
      const wrapped = (await response.json()) as { payload?: AskPayload };
      if (!response.ok) {
        setAskElaboration('Elaboration request failed. Check response JSON for details.');
      } else {
        setAskElaboration(
          wrapped?.payload?.answer?.trim() || 'No elaboration text returned; inspect raw response JSON.'
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown elaboration error';
      setAskElaboration(`Elaboration request failed: ${message}`);
    } finally {
      setAskElaborationLoading(false);
    }
  }

  async function copyResponse(): Promise<void> {
    if (!responseText) {
      return;
    }
    await navigator.clipboard.writeText(responseText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="hero-kicker">Operator Console</p>
        <h1>Orgumented Operator Workbench</h1>
        <p>
          Run deterministic graph and evidence queries directly against the API. This UI is a thin operator surface,
          not a new source of truth.
        </p>
        <p className="endpoint-hint">UI Build: {BUILD_VERSION}</p>
      </section>

      <section className="panel">
        <h2>Environment Status</h2>
        <p className="endpoint-hint">API Base: {API_BASE}</p>
        <p className="endpoint-hint">Web Health: {healthStatus}</p>
        <p className="endpoint-hint">Web Readiness (with API): {readyStatus}</p>
        <button type="button" onClick={refreshStatuses}>
          Refresh Status
        </button>
        {readyDetails ? (
          <details>
            <summary>Ready Details</summary>
            <pre>{readyDetails}</pre>
          </details>
        ) : null}
      </section>

      <section className="panel">
        <div className="tab-row">
          {(
            [
              { label: 'Connect', values: ['orgConnect', 'orgStatus'] as const },
              { label: 'Retrieve', values: ['orgRetrieve', 'metadataCatalog', 'metadataRetrieve'] as const },
              { label: 'Refresh', values: ['refresh', 'refreshDiff'] as const },
              { label: 'Analyze', values: ['perms', 'permsSystem', 'automation', 'impact', 'ask', 'askArchitecture'] as const },
              { label: 'Proofs', values: ['askProof', 'askReplay', 'askMetrics'] as const },
              { label: 'Meta', values: ['metaContext', 'metaAdapt'] as const }
            ] as const
          ).map((group) => (
            <div key={group.label}>
              <p className="endpoint-hint">{group.label}</p>
              {group.values.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={value === kind ? 'tab active' : 'tab'}
                  onClick={() => setKind(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          ))}
        </div>

        <p className="endpoint-hint">Endpoint: {endpointHint}</p>

        {kind === 'orgConnect' ? (
          <p className="endpoint-hint">
            CCI Connect Workflow: ensure `cci` is authenticated in this runtime, then run this action to validate
            org auth/session through the API path.
          </p>
        ) : null}

        {kind === 'refresh' ? (
          <div className="row">
            <label htmlFor="refreshMode">Refresh Mode</label>
            <select
              id="refreshMode"
              value={refreshMode}
              onChange={(e) => setRefreshMode(e.target.value as 'full' | 'incremental')}
            >
              <option value="incremental">incremental</option>
              <option value="full">full</option>
            </select>
          </div>
        ) : null}

        {kind === 'refreshDiff' ? (
          <>
            <div className="row">
              <label htmlFor="fromSnapshot">From Snapshot ID</label>
              <input id="fromSnapshot" value={fromSnapshot} onChange={(e) => setFromSnapshot(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="toSnapshot">To Snapshot ID</label>
              <input id="toSnapshot" value={toSnapshot} onChange={(e) => setToSnapshot(e.target.value)} />
            </div>
          </>
        ) : null}

        {kind === 'askArchitecture' ? (
          <>
            <div className="row">
              <label htmlFor="archUser">User</label>
              <input id="archUser" value={archUser} onChange={(e) => setArchUser(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="archObject">Object</label>
              <input id="archObject" value={archObject} onChange={(e) => setArchObject(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="archField">Field</label>
              <input id="archField" value={archField} onChange={(e) => setArchField(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="archMaxPaths">Max Paths</label>
              <input
                id="archMaxPaths"
                value={archMaxPathsRaw}
                onChange={(e) => setArchMaxPathsRaw(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {kind === 'askProof' ? (
          <div className="row">
            <label htmlFor="proofId">Proof ID</label>
            <input id="proofId" value={proofId} onChange={(e) => setProofId(e.target.value)} />
          </div>
        ) : null}

        {kind === 'askReplay' ? (
          <>
            <div className="row">
              <label htmlFor="replayProofId">Proof ID (optional)</label>
              <input id="replayProofId" value={proofId} onChange={(e) => setProofId(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="replayToken">Replay Token (optional)</label>
              <input id="replayToken" value={replayToken} onChange={(e) => setReplayToken(e.target.value)} />
            </div>
          </>
        ) : null}

        {kind === 'metaAdapt' ? (
          <div className="row checkbox-row">
            <label htmlFor="metaDryRun">Dry Run</label>
            <input id="metaDryRun" type="checkbox" checked={metaDryRun} onChange={(e) => setMetaDryRun(e.target.checked)} />
          </div>
        ) : null}

        {kind === 'orgRetrieve' ? (
          <>
            <div className="row checkbox-row">
              <label htmlFor="orgRunAuth">Run Auth Validation</label>
              <input
                id="orgRunAuth"
                type="checkbox"
                checked={orgRunAuth}
                onChange={(e) => setOrgRunAuth(e.target.checked)}
              />
            </div>
            <div className="row checkbox-row">
              <label htmlFor="orgRunRetrieve">Run Metadata Retrieve</label>
              <input
                id="orgRunRetrieve"
                type="checkbox"
                checked={orgRunRetrieve}
                onChange={(e) => setOrgRunRetrieve(e.target.checked)}
              />
            </div>
            <div className="row checkbox-row">
              <label htmlFor="orgAutoRefresh">Auto Refresh Graph</label>
              <input
                id="orgAutoRefresh"
                type="checkbox"
                checked={orgAutoRefresh}
                onChange={(e) => setOrgAutoRefresh(e.target.checked)}
              />
            </div>
          </>
        ) : null}

        {kind === 'metadataCatalog' ? (
          <>
            <div className="row">
              <label htmlFor="metadataSearch">Keyword Search (optional)</label>
              <input
                id="metadataSearch"
                value={metadataSearch}
                onChange={(e) => setMetadataSearch(e.target.value)}
              />
            </div>
            <div className="row">
              <label htmlFor="metadataLimit">Catalog Limit</label>
              <input
                id="metadataLimit"
                value={metadataLimitRaw}
                onChange={(e) => setMetadataLimitRaw(e.target.value)}
              />
            </div>
            <div className="row">
              <button type="button" onClick={runQuery} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh Types'}
              </button>
            </div>
            {metadataCatalog ? (
              <details open>
                <summary>
                  Catalog ({metadataCatalog.totalTypes} type{metadataCatalog.totalTypes === 1 ? '' : 's'}) | source:{' '}
                  {metadataCatalog.source} | refreshed {metadataAgeLabel(metadataCatalog.refreshedAt)}
                </summary>
                {metadataCatalog.warnings && metadataCatalog.warnings.length > 0 ? (
                  <ul>
                    {metadataCatalog.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                {metadataCatalog.totalTypes === 0 ? (
                  <p className="endpoint-hint">
                    No metadata discovered in parse path. Fallback: run `orgRetrieve` first, then refresh this catalog.
                  </p>
                ) : (
                  metadataCatalog.types.map((item) => (
                    <details key={item.type}>
                      <summary>
                        {item.type} ({item.memberCount})
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            addTypeSelection(item.type);
                          }}
                        >
                          Add Type
                        </button>
                        {isTypeSelected(item.type) ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              removeTypeSelection(item.type);
                            }}
                          >
                            Remove
                          </button>
                        ) : null}
                      </summary>
                      <ul>
                        {item.members.map((member) => (
                          <li key={`${item.type}.${member.name}`}>
                            {member.name}
                            <button type="button" onClick={() => toggleMemberSelection(item.type, member.name)}>
                              {isMemberSelected(item.type, member.name) ? 'Remove Member' : 'Add Member'}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))
                )}
              </details>
            ) : null}
          </>
        ) : null}

        {kind === 'metadataRetrieve' ? (
          <>
            <div className="row checkbox-row">
              <label htmlFor="metadataAutoRefresh">Auto Refresh Graph</label>
              <input
                id="metadataAutoRefresh"
                type="checkbox"
                checked={metadataAutoRefresh}
                onChange={(e) => setMetadataAutoRefresh(e.target.checked)}
              />
            </div>
            <div className="row">
              <label htmlFor="metadataSelections">Selections JSON</label>
              <textarea
                id="metadataSelections"
                value={metadataSelectionsRaw}
                onChange={(e) => setMetadataSelectionsRaw(e.target.value)}
                rows={6}
              />
            </div>
          </>
        ) : null}

        {kind === 'ask' ? (
          <>
            <div className="row">
              <label htmlFor="askQuery">Ask Query</label>
              <textarea id="askQuery" value={askQuery} onChange={(e) => setAskQuery(e.target.value)} rows={4} />
            </div>
            <div className="row">
              <label htmlFor="maxCitations">Max Citations</label>
              <input id="maxCitations" value={maxCitationsRaw} onChange={(e) => setMaxCitationsRaw(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="consistencyCheck">Consistency Check</label>
              <input
                id="consistencyCheck"
                type="checkbox"
                checked={consistencyCheck}
                onChange={(e) => setConsistencyCheck(e.target.checked)}
              />
            </div>
            <div className="row">
              <label htmlFor="askContext">Context JSON (optional)</label>
              <textarea id="askContext" value={askContextRaw} onChange={(e) => setAskContextRaw(e.target.value)} rows={3} />
            </div>
          </>
        ) : null}

        {kind === 'perms' ? (
          <>
            <div className="row">
              <label htmlFor="user">User</label>
              <input id="user" value={user} onChange={(e) => setUser(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="object">Object</label>
              <input id="object" value={objectName} onChange={(e) => setObjectName(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="field">Field (optional)</label>
              <input id="field" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="limitPerms">Limit (optional)</label>
              <input id="limitPerms" value={limitRaw} onChange={(e) => setLimitRaw(e.target.value)} />
            </div>
          </>
        ) : null}

        {kind === 'permsSystem' ? (
          <>
            <div className="row">
              <label htmlFor="systemUser">User</label>
              <input id="systemUser" value={user} onChange={(e) => setUser(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="systemPermission">System Permission</label>
              <input
                id="systemPermission"
                value={systemPermission}
                onChange={(e) => setSystemPermission(e.target.value)}
              />
            </div>
            <div className="row">
              <label htmlFor="limitSystem">Limit (optional)</label>
              <input id="limitSystem" value={limitRaw} onChange={(e) => setLimitRaw(e.target.value)} />
            </div>
          </>
        ) : null}

        {kind === 'automation' ? (
          <div className="row">
            <label htmlFor="objectAutomation">Object</label>
            <input id="objectAutomation" value={objectName} onChange={(e) => setObjectName(e.target.value)} />
          </div>
        ) : null}

        {kind === 'impact' ? (
          <div className="row">
            <label htmlFor="impactField">Field</label>
            <input id="impactField" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
          </div>
        ) : null}

        {(kind === 'automation' || kind === 'impact') ? (
          <>
            <div className="row">
              <label htmlFor="limitAnalysis">Limit (optional)</label>
              <input id="limitAnalysis" value={limitRaw} onChange={(e) => setLimitRaw(e.target.value)} />
            </div>
            <div className="row">
              <label htmlFor="strictMode">Strict Mode</label>
              <input id="strictMode" type="checkbox" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} />
            </div>
            <div className="row">
              <label htmlFor="explainMode">Explain Mode</label>
              <input id="explainMode" type="checkbox" checked={explainMode} onChange={(e) => setExplainMode(e.target.checked)} />
            </div>
            <div className="row">
              <label htmlFor="includeLowConfidence">Include Low Confidence</label>
              <input
                id="includeLowConfidence"
                type="checkbox"
                checked={includeLowConfidence}
                onChange={(e) => setIncludeLowConfidence(e.target.checked)}
              />
            </div>
            {kind === 'impact' ? (
              <div className="row">
                <label htmlFor="debugMode">Debug Mode</label>
                <input id="debugMode" type="checkbox" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} />
              </div>
            ) : null}
          </>
        ) : null}

        {kind === 'ask' ? (
          <div className="row">
            <label htmlFor="askIncludeLowConfidence">Include Low Confidence</label>
            <input
              id="askIncludeLowConfidence"
              type="checkbox"
              checked={includeLowConfidence}
              onChange={(e) => setIncludeLowConfidence(e.target.checked)}
            />
          </div>
        ) : null}

        {kind !== 'metadataCatalog' ? (
          <button type="button" onClick={runQuery} disabled={loading}>
            {loading ? 'Running...' : 'Run Query'}
          </button>
        ) : null}
      </section>

      <section className="panel response-panel">
        <div className="response-header">
          <h2>Response</h2>
          <button type="button" onClick={copyResponse} disabled={!responseText}>
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
        {errorText ? <p className="error-text">{errorText}</p> : null}
        {kind === 'ask' && askPayload ? (
          <details open>
            <summary>Ask Layer 1: Deterministic Evidence Summary</summary>
            <p>{askPayload.answer || 'No deterministic summary returned.'}</p>
            <p className="endpoint-hint">
              confidence: {typeof askPayload.confidence === 'number' ? askPayload.confidence : 'n/a'} | citations:{' '}
              {Array.isArray(askPayload.citations) ? askPayload.citations.length : 0}
            </p>
            {Array.isArray(askPayload.citations) && askPayload.citations.length > 0 ? (
              <ul>
                {askPayload.citations.slice(0, 5).map((citation, idx) => (
                  <li key={`${citation.sourcePath ?? 'citation'}-${idx}`}>
                    {citation.sourcePath || 'unknown source'} (score {citation.score ?? 'n/a'})
                  </li>
                ))}
              </ul>
            ) : null}
          </details>
        ) : null}
        {kind === 'ask' && askPayload ? (
          <details>
            <summary>Ask Layer 2: Optional Conversational Elaboration</summary>
            <button type="button" onClick={runAskElaboration} disabled={askElaborationLoading}>
              {askElaborationLoading ? 'Generating...' : 'Generate Elaboration'}
            </button>
            {askElaboration ? <pre>{askElaboration}</pre> : null}
          </details>
        ) : null}
        <details open>
          <summary>JSON Output</summary>
          <pre>{responseText || '{\n  "hint": "Run a query to view JSON response"\n}'}</pre>
        </details>
      </section>
    </main>
  );
}
