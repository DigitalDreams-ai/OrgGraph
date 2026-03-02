'use client';

import type {
  OrgRetrieveRunView,
  RefreshDiffView,
  RefreshRetrieveHandoffView,
  RefreshRunView
} from './types';

interface RefreshWorkspaceProps {
  activeAlias: string;
  selectedAlias: string;
  retrieveHandoff: RefreshRetrieveHandoffView | null;
  refreshMode: 'incremental' | 'full';
  setRefreshMode: (value: 'incremental' | 'full') => void;
  fromSnapshot: string;
  setFromSnapshot: (value: string) => void;
  toSnapshot: string;
  setToSnapshot: (value: string) => void;
  orgRunAuth: boolean;
  setOrgRunAuth: (value: boolean) => void;
  orgRunRetrieve: boolean;
  setOrgRunRetrieve: (value: boolean) => void;
  orgAutoRefresh: boolean;
  setOrgAutoRefresh: (value: boolean) => void;
  lastRefreshRun: RefreshRunView | null;
  lastDiffRun: RefreshDiffView | null;
  lastOrgRetrieveRun: OrgRetrieveRunView | null;
  loading: boolean;
  onRunRefresh: () => void;
  onRunDiff: () => void;
  onRunOrgRetrieve: () => void;
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return 'n/a';
  }

  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString();
}

export function RefreshWorkspace(props: RefreshWorkspaceProps): JSX.Element {
  return (
    <>
      <h2>Refresh &amp; Build</h2>
      <p className="section-lead">Rebuild semantic state, review drift, and keep the retrieve-to-refresh handoff visible instead of treating rebuild as a separate backend step.</p>

      <div className="ops-grid">
        <article className="sub-card">
          <p className="panel-caption">Session handoff</p>
          <h3>Current rebuild context</h3>
          <div className="decision-meta">
            <span className="decision-badge good">Active alias: {props.activeAlias || 'n/a'}</span>
            <span className="decision-badge muted">Selected alias: {props.selectedAlias || 'n/a'}</span>
          </div>
          <p><strong>Refresh mode:</strong> {props.refreshMode}</p>
          <p><strong>Org retrieve auth:</strong> {String(props.orgRunAuth)}</p>
          <p><strong>Org retrieve metadata:</strong> {String(props.orgRunRetrieve)}</p>
          <p><strong>Auto refresh:</strong> {String(props.orgAutoRefresh)}</p>
        </article>

        <article className="sub-card">
          <p className="panel-caption">Browser handoff</p>
          <h3>Latest retrieve context</h3>
          {props.retrieveHandoff ? (
            <>
              <div className="decision-meta">
                <span className="decision-badge good">Status: {props.retrieveHandoff.status}</span>
                <span className={`decision-badge ${props.retrieveHandoff.autoRefresh ? 'good' : 'muted'}`}>
                  Auto refresh: {String(props.retrieveHandoff.autoRefresh)}
                </span>
              </div>
              <p><strong>Alias:</strong> {props.retrieveHandoff.alias}</p>
              <p><strong>Completed:</strong> {formatTimestamp(props.retrieveHandoff.completedAt)}</p>
              <p><strong>Parse path:</strong> {props.retrieveHandoff.parsePath}</p>
              <p><strong>Metadata args:</strong> {props.retrieveHandoff.metadataArgs.join(' ') || 'n/a'}</p>
              {props.retrieveHandoff.refresh ? (
                <p>
                  <strong>Retrieve refresh counts:</strong> {props.retrieveHandoff.refresh.nodeCount} nodes,{' '}
                  {props.retrieveHandoff.refresh.edgeCount} edges, {props.retrieveHandoff.refresh.evidenceCount} evidence
                </p>
              ) : (
                <p className="muted">The latest browser retrieve did not include an automatic refresh summary.</p>
              )}
            </>
          ) : (
            <p className="muted">Use `Org Browser` first to stage a selective retrieve handoff into this workspace.</p>
          )}
        </article>

        <article className="sub-card">
          <p className="panel-caption">Latest refresh</p>
          <h3>Semantic rebuild summary</h3>
          {props.lastRefreshRun ? (
            <>
              <div className="decision-meta">
                <span className={`decision-badge ${props.lastRefreshRun.driftWithinBudget ? 'good' : 'bad'}`}>
                  Drift within budget: {String(props.lastRefreshRun.driftWithinBudget)}
                </span>
                <span className={`decision-badge ${props.lastRefreshRun.skipped ? 'muted' : 'good'}`}>
                  Skipped: {String(props.lastRefreshRun.skipped)}
                </span>
              </div>
              <p><strong>Snapshot:</strong> {props.lastRefreshRun.snapshotId}</p>
              <p><strong>Counts:</strong> {props.lastRefreshRun.nodeCount} nodes, {props.lastRefreshRun.edgeCount} edges, {props.lastRefreshRun.evidenceCount} evidence</p>
              <p><strong>Meaning change:</strong> {props.lastRefreshRun.meaningChangeSummary || 'n/a'}</p>
              <p><strong>Drift summary:</strong> {props.lastRefreshRun.driftSummary || 'n/a'}</p>
            </>
          ) : (
            <p className="muted">Run Refresh to capture the latest semantic rebuild summary.</p>
          )}
        </article>
      </div>

      <article className="sub-card">
        <p className="panel-caption">Workflow state</p>
        <h3>Current rebuild chain</h3>
        <ul className="issue-list">
          <li>
            <div className="decision-meta">
              <span className={`decision-badge ${props.retrieveHandoff ? 'good' : 'muted'}`}>Browser retrieve</span>
              <span className="decision-badge muted">
                {props.retrieveHandoff ? formatTimestamp(props.retrieveHandoff.completedAt) : 'waiting'}
              </span>
            </div>
            <p>
              {props.retrieveHandoff
                ? `Latest retrieve staged ${props.retrieveHandoff.metadataArgs.length} metadata argument${props.retrieveHandoff.metadataArgs.length === 1 ? '' : 's'} for rebuild review.`
                : 'No browser retrieve handoff captured yet.'}
            </p>
          </li>
          <li>
            <div className="decision-meta">
              <span className={`decision-badge ${props.lastRefreshRun ? 'good' : 'muted'}`}>Refresh</span>
              <span className="decision-badge muted">
                {props.lastRefreshRun ? props.lastRefreshRun.snapshotId : 'waiting'}
              </span>
            </div>
            <p>
              {props.lastRefreshRun
                ? `${props.lastRefreshRun.mode} rebuild captured ${props.lastRefreshRun.nodeCount} nodes and ${props.lastRefreshRun.edgeCount} edges.`
                : 'Run Refresh to capture the next grounded snapshot.'}
            </p>
          </li>
          <li>
            <div className="decision-meta">
              <span className={`decision-badge ${props.lastDiffRun ? 'good' : 'muted'}`}>Diff</span>
              <span className="decision-badge muted">
                {props.lastDiffRun ? `${props.lastDiffRun.fromSnapshotId} → ${props.lastDiffRun.toSnapshotId}` : 'waiting'}
              </span>
            </div>
            <p>
              {props.lastDiffRun
                ? `${props.lastDiffRun.meaningChangeSummary || 'Diff captured.'} Structure changed: ${String(props.lastDiffRun.structureDigestChanged)}.`
                : 'Run Diff after two snapshots are available.'}
            </p>
          </li>
          <li>
            <div className="decision-meta">
              <span className={`decision-badge ${props.lastOrgRetrieveRun ? 'good' : 'muted'}`}>Org retrieve</span>
              <span className="decision-badge muted">
                {props.lastOrgRetrieveRun ? formatTimestamp(props.lastOrgRetrieveRun.completedAt) : 'waiting'}
              </span>
            </div>
            <p>
              {props.lastOrgRetrieveRun
                ? `Latest pipeline ran ${props.lastOrgRetrieveRun.stepSummary.length} staged step${props.lastOrgRetrieveRun.stepSummary.length === 1 ? '' : 's'}.`
                : 'Run Org Retrieve when the rebuild path should include auth and metadata retrieval from this workspace.'}
            </p>
          </li>
        </ul>
      </article>

      <label htmlFor="refreshMode">Refresh Mode</label>
      <select
        id="refreshMode"
        value={props.refreshMode}
        onChange={(e) => props.setRefreshMode(e.target.value as 'incremental' | 'full')}
      >
        <option value="incremental">incremental</option>
        <option value="full">full</option>
      </select>

      <div className="action-row">
        <button type="button" onClick={props.onRunRefresh} disabled={props.loading}>
          Run Refresh
        </button>
      </div>

      <div className="field-grid">
        <div>
          <label htmlFor="fromSnapshot">From Snapshot ID</label>
          <input id="fromSnapshot" value={props.fromSnapshot} onChange={(e) => props.setFromSnapshot(e.target.value)} />
        </div>
        <div>
          <label htmlFor="toSnapshot">To Snapshot ID</label>
          <input id="toSnapshot" value={props.toSnapshot} onChange={(e) => props.setToSnapshot(e.target.value)} />
        </div>
      </div>

      <div className="action-row">
        <button type="button" onClick={props.onRunDiff} disabled={props.loading}>
          Run Diff
        </button>
      </div>

      {props.lastDiffRun ? (
        <article className="sub-card">
          <p className="panel-caption">Latest diff</p>
          <h3>Snapshot drift summary</h3>
          <div className="decision-meta">
            <span className={`decision-badge ${props.lastDiffRun.driftWithinBudget ? 'good' : 'bad'}`}>
              Drift within budget: {String(props.lastDiffRun.driftWithinBudget)}
            </span>
            <span className={`decision-badge ${props.lastDiffRun.structureDigestChanged ? 'bad' : 'muted'}`}>
              Structure changed: {String(props.lastDiffRun.structureDigestChanged)}
            </span>
          </div>
          <p><strong>From:</strong> {props.lastDiffRun.fromSnapshotId}</p>
          <p><strong>To:</strong> {props.lastDiffRun.toSnapshotId}</p>
          <p><strong>Meaning change:</strong> {props.lastDiffRun.meaningChangeSummary || 'n/a'}</p>
          <p><strong>Node delta:</strong> +{props.lastDiffRun.addedNodeCount} / -{props.lastDiffRun.removedNodeCount}</p>
          <p><strong>Edge delta:</strong> +{props.lastDiffRun.addedEdgeCount} / -{props.lastDiffRun.removedEdgeCount}</p>
          <p><strong>Drift summary:</strong> {props.lastDiffRun.driftSummary || 'n/a'}</p>
        </article>
      ) : null}

      <h3>Org Retrieve Pipeline</h3>
      <div className="field-grid">
        <label className="check-row" htmlFor="orgRunAuth">
          <input id="orgRunAuth" type="checkbox" checked={props.orgRunAuth} onChange={(e) => props.setOrgRunAuth(e.target.checked)} />
          Run Auth
        </label>
        <label className="check-row" htmlFor="orgRunRetrieve">
          <input
            id="orgRunRetrieve"
            type="checkbox"
            checked={props.orgRunRetrieve}
            onChange={(e) => props.setOrgRunRetrieve(e.target.checked)}
          />
          Run Retrieve
        </label>
        <label className="check-row" htmlFor="orgAutoRefresh">
          <input
            id="orgAutoRefresh"
            type="checkbox"
            checked={props.orgAutoRefresh}
            onChange={(e) => props.setOrgAutoRefresh(e.target.checked)}
          />
          Auto Refresh
        </label>
      </div>
      <div className="action-row">
        <button type="button" onClick={props.onRunOrgRetrieve} disabled={props.loading}>
          Run Org Retrieve
        </button>
      </div>

      {props.lastOrgRetrieveRun ? (
        <article className="sub-card">
          <p className="panel-caption">Latest org retrieve</p>
          <h3>Retrieve pipeline summary</h3>
          <div className="decision-meta">
            <span className="decision-badge good">Status: {props.lastOrgRetrieveRun.status}</span>
            <span className="decision-badge muted">Alias: {props.lastOrgRetrieveRun.alias}</span>
          </div>
          <p><strong>Completed:</strong> {formatTimestamp(props.lastOrgRetrieveRun.completedAt)}</p>
          <p><strong>Project path:</strong> {props.lastOrgRetrieveRun.projectPath}</p>
          <p><strong>Parse path:</strong> {props.lastOrgRetrieveRun.parsePath}</p>
          <p><strong>Metadata args:</strong> {props.lastOrgRetrieveRun.metadataArgs.join(' ') || 'n/a'}</p>
          <ul className="issue-list">
            {props.lastOrgRetrieveRun.stepSummary.map((step) => (
              <li key={`${step.step}-${step.status}`}>
                <div className="decision-meta">
                  <span className={`decision-badge ${step.status === 'completed' ? 'good' : step.status === 'failed' ? 'bad' : 'muted'}`}>
                    {step.step}
                  </span>
                  <span className="decision-badge muted">{step.elapsedMs} ms</span>
                </div>
                <p><strong>{step.status}</strong></p>
                <p>{step.message}</p>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </>
  );
}
