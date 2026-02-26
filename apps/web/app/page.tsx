'use client';

import { useMemo, useState } from 'react';

type QueryKind =
  | 'refresh'
  | 'perms'
  | 'permsSystem'
  | 'automation'
  | 'impact'
  | 'ask'
  | 'orgStatus'
  | 'orgRetrieve'
  | 'metadataCatalog'
  | 'metadataRetrieve';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100';
const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev-local';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Page(): JSX.Element {
  const [kind, setKind] = useState<QueryKind>('ask');
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
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
  const [metadataAutoRefresh, setMetadataAutoRefresh] = useState(true);
  const [metadataSelectionsRaw, setMetadataSelectionsRaw] = useState(
    JSON.stringify([{ type: 'CustomObject', members: ['Account'] }], null, 2)
  );

  const endpointHint = useMemo(() => {
    if (kind === 'refresh') {
      return 'POST /refresh';
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

  async function runQuery(): Promise<void> {
    setLoading(true);
    setResponseText('');
    setErrorText('');
    setCopied(false);

    try {
      const limit = parseOptionalInt(limitRaw);
      const maxCitations = parseOptionalInt(maxCitationsRaw);
      const askContext = parseContext(askContextRaw);
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
          : kind === 'orgStatus'
            ? {}
            : kind === 'orgRetrieve'
              ? { runAuth: orgRunAuth, runRetrieve: orgRunRetrieve, autoRefresh: orgAutoRefresh }
              : kind === 'metadataCatalog'
                ? { q: metadataSearch, limit }
                : kind === 'metadataRetrieve'
                  ? { selections: metadataSelections, autoRefresh: metadataAutoRefresh }
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
              'ask',
              'refresh',
              'orgStatus',
              'orgRetrieve',
              'metadataCatalog',
              'metadataRetrieve',
              'perms',
              'permsSystem',
              'automation',
              'impact'
            ] as const
          ).map((value) => (
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

        <p className="endpoint-hint">Endpoint: {endpointHint}</p>

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
          <div className="row">
            <label htmlFor="metadataSearch">Keyword Search (optional)</label>
            <input
              id="metadataSearch"
              value={metadataSearch}
              onChange={(e) => setMetadataSearch(e.target.value)}
            />
          </div>
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

        <button type="button" onClick={runQuery} disabled={loading}>
          {loading ? 'Running...' : 'Run Query'}
        </button>
      </section>

      <section className="panel response-panel">
        <div className="response-header">
          <h2>Response</h2>
          <button type="button" onClick={copyResponse} disabled={!responseText}>
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
        {errorText ? <p className="error-text">{errorText}</p> : null}
        <details open>
          <summary>JSON Output</summary>
          <pre>{responseText || '{\n  "hint": "Run a query to view JSON response"\n}'}</pre>
        </details>
      </section>
    </main>
  );
}
