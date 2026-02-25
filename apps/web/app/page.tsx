'use client';

import { useMemo, useState } from 'react';

type QueryKind = 'refresh' | 'perms' | 'automation' | 'impact' | 'ask';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100';

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

  const [refreshMode, setRefreshMode] = useState<'full' | 'incremental'>('incremental');
  const [user, setUser] = useState('jane@example.com');
  const [objectName, setObjectName] = useState('Opportunity');
  const [fieldName, setFieldName] = useState('Opportunity.StageName');
  const [askQuery, setAskQuery] = useState('What touches Opportunity.StageName?');

  const endpointHint = useMemo(() => {
    if (kind === 'refresh') {
      return 'POST /refresh';
    }
    if (kind === 'perms') {
      return 'GET /perms?user=...&object=...&field=...';
    }
    if (kind === 'automation') {
      return 'GET /automation?object=...';
    }
    if (kind === 'impact') {
      return 'GET /impact?field=...';
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
      setReadyStatus(ready.ok ? 'ready' : `http_${ready.status}`);
    } catch {
      setReadyStatus('unreachable');
    }
  }

  async function runQuery(): Promise<void> {
    setLoading(true);
    setResponseText('');
    setErrorText('');
    setCopied(false);

    try {
      const payload =
        kind === 'refresh'
          ? { mode: refreshMode }
          : kind === 'perms'
            ? { user, object: objectName, field: fieldName }
            : kind === 'automation'
              ? { object: objectName }
              : kind === 'impact'
                ? { field: fieldName }
                : { query: askQuery, maxCitations: 5 };

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
        <p className="hero-kicker">Phase 4 Console</p>
        <h1>OrgGraph Operator Workbench</h1>
        <p>
          Run deterministic graph and evidence queries directly against the API. This UI is a thin operator surface,
          not a new source of truth.
        </p>
      </section>

      <section className="panel">
        <h2>Environment Status</h2>
        <p className="endpoint-hint">API Base: {API_BASE}</p>
        <p className="endpoint-hint">Web Health: {healthStatus}</p>
        <p className="endpoint-hint">Web Readiness (with API): {readyStatus}</p>
        <button type="button" onClick={refreshStatuses}>
          Refresh Status
        </button>
      </section>

      <section className="panel">
        <div className="tab-row">
          {(['ask', 'refresh', 'perms', 'automation', 'impact'] as const).map((value) => (
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

        {kind === 'ask' ? (
          <div className="row">
            <label htmlFor="askQuery">Ask Query</label>
            <textarea id="askQuery" value={askQuery} onChange={(e) => setAskQuery(e.target.value)} rows={4} />
          </div>
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
