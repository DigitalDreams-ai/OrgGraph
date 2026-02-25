'use client';

import { useMemo, useState } from 'react';

type QueryKind = 'refresh' | 'perms' | 'automation' | 'impact' | 'ask';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100';

export default function Page(): JSX.Element {
  const [kind, setKind] = useState<QueryKind>('ask');
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState('');

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

  async function runQuery(): Promise<void> {
    setLoading(true);
    setResponseText('');

    try {
      let response: Response;
      if (kind === 'refresh') {
        response = await fetch(`${API_BASE}/refresh`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ mode: refreshMode })
        });
      } else if (kind === 'perms') {
        const params = new URLSearchParams({ user, object: objectName });
        if (fieldName.trim().length > 0) {
          params.set('field', fieldName);
        }
        response = await fetch(`${API_BASE}/perms?${params.toString()}`);
      } else if (kind === 'automation') {
        const params = new URLSearchParams({ object: objectName });
        response = await fetch(`${API_BASE}/automation?${params.toString()}`);
      } else if (kind === 'impact') {
        const params = new URLSearchParams({ field: fieldName });
        response = await fetch(`${API_BASE}/impact?${params.toString()}`);
      } else {
        response = await fetch(`${API_BASE}/ask`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ query: askQuery, maxCitations: 5 })
        });
      }

      const payload = await response.json();
      const wrapped = {
        statusCode: response.status,
        ok: response.ok,
        payload
      };
      setResponseText(JSON.stringify(wrapped, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown request error';
      setResponseText(JSON.stringify({ ok: false, error: message }, null, 2));
    } finally {
      setLoading(false);
    }
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
        <div className="row">
          <label htmlFor="kind">Query Type</label>
          <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as QueryKind)}>
            <option value="ask">Ask</option>
            <option value="refresh">Refresh</option>
            <option value="perms">Permissions</option>
            <option value="automation">Automation</option>
            <option value="impact">Impact</option>
          </select>
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
        <h2>Response</h2>
        <pre>{responseText || '{\n  "hint": "Run a query to view JSON response"\n}'}</pre>
      </section>
    </main>
  );
}
