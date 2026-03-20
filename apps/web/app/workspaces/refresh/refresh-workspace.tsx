'use client';

import type {
  OrgRetrieveRunView,
  RefreshDiffView,
  RefreshRetrieveSelectionView,
  RefreshRetrieveHandoffView,
  RefreshRunView
} from './types';
import { assessRetrieveHandoff } from '../browser/retrieve-handoff';
import {
  assessDiffRunLineage,
  assessOrgRetrieveRunLineage,
  assessRefreshRunLineage,
  type WorkflowLineageAssessment
} from './workflow-lineage';
import { buildRefreshWorkflowStages, type RefreshWorkflowStage } from './refresh-workflow-state';

interface RefreshWorkspaceProps {
  activeAlias: string;
  selectedAlias: string;
  retrieveHandoff: RefreshRetrieveHandoffView | null;
  retrieveSelections: RefreshRetrieveSelectionView[];
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
  refreshNeedsRebaseline: boolean;
  loading: boolean;
  onRunRefresh: () => void;
  onRunRefreshWithRebaseline: () => void;
  onRunDiff: () => void;
  onRunOrgRetrieve: () => void;
  onOpenBrowser: () => void;
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

function lineageTone(assessment: WorkflowLineageAssessment): 'good' | 'muted' | 'bad' {
  if (assessment.state === 'current') {
    return 'good';
  }
  if (assessment.state === 'missing') {
    return 'muted';
  }
  return 'bad';
}

function stageTone(stage: RefreshWorkflowStage): 'good' | 'muted' | 'bad' {
  if (stage.state === 'complete') {
    return 'good';
  }
  if (stage.state === 'ready' || stage.state === 'waiting') {
    return 'muted';
  }
  return 'bad';
}

export function RefreshWorkspace(props: RefreshWorkspaceProps): JSX.Element {
  const expectedAlias = props.activeAlias || props.selectedAlias;
  const retrieveHandoff = assessRetrieveHandoff(props.retrieveHandoff, expectedAlias);
  const refreshLineage = assessRefreshRunLineage(
    props.lastRefreshRun,
    props.retrieveHandoff,
    props.retrieveSelections,
    expectedAlias
  );
  const diffLineage = assessDiffRunLineage(
    props.lastDiffRun,
    props.retrieveHandoff,
    props.retrieveSelections,
    expectedAlias,
    props.lastRefreshRun
  );
  const orgRetrieveLineage = assessOrgRetrieveRunLineage(
    props.lastOrgRetrieveRun,
    props.retrieveHandoff,
    props.retrieveSelections,
    expectedAlias
  );
  const stagedSelectionCount = props.retrieveSelections.length;
  const refreshBlocked = retrieveHandoff.state !== 'ready' || stagedSelectionCount === 0;
  const orgRetrieveBlocked =
    props.orgRunRetrieve && (retrieveHandoff.state !== 'ready' || stagedSelectionCount === 0);
  const stagedSelectionPreview = props.retrieveSelections.slice(0, 6);
  const stagedSelectionOverflow = Math.max(stagedSelectionCount - stagedSelectionPreview.length, 0);
  const diffBlockedByRefreshLineage = refreshLineage.state !== 'current';
  const workflowStages = buildRefreshWorkflowStages({
    retrieveHandoff: props.retrieveHandoff,
    retrieveAssessment: retrieveHandoff,
    retrieveSelections: props.retrieveSelections,
    refreshLineage,
    diffLineage,
    orgRetrieveLineage,
    lastRefreshRun: props.lastRefreshRun,
    lastDiffRun: props.lastDiffRun,
    lastOrgRetrieveRun: props.lastOrgRetrieveRun,
    fromSnapshot: props.fromSnapshot,
    toSnapshot: props.toSnapshot,
    orgRunRetrieve: props.orgRunRetrieve
  });
  const nextStage = workflowStages.find((stage) => stage.state !== 'complete');

  return (
    <>
      <h2>Refresh &amp; Build</h2>
      <p className="section-lead">Rebuild semantic state, review drift, and keep the retrieve-to-refresh handoff visible instead of treating rebuild as a separate backend step. Refresh now fails closed until Browser handoff is ready.</p>

      <article className="sub-card">
        <p className="panel-caption">Staged workflow</p>
        <h3>Operator sequence</h3>
        <p className="muted">
          This workspace is a four-step operator flow: retrieve the right metadata, rebuild semantic state,
          compare drift, then optionally run the end-to-end org pipeline.
        </p>
        <div className="refresh-stage-grid">
          {workflowStages.map((stage) => (
            <article key={stage.id} className="refresh-stage-card">
              <div className="decision-meta">
                <span className={`decision-badge ${stageTone(stage)}`}>{stage.label}</span>
                <span className={`decision-badge ${stageTone(stage)}`}>State: {stage.state}</span>
              </div>
              <p><strong>{stage.summary}</strong></p>
              <p>{stage.detail}</p>
            </article>
          ))}
        </div>
        {nextStage ? (
          <div className="refresh-next-action" role="status" aria-live="polite">
            <span className={`decision-badge ${stageTone(nextStage)}`}>Next action</span>
            <p>
              <strong>{nextStage.label}</strong> {nextStage.action}
            </p>
          </div>
        ) : (
          <div className="refresh-next-action" role="status" aria-live="polite">
            <span className="decision-badge good">Workflow current</span>
            <p><strong>All four stages are current.</strong> You can review the latest summaries below without opening raw JSON.</p>
          </div>
        )}
      </article>

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
          <p><strong>Staged metadata selections:</strong> {stagedSelectionCount}</p>
        </article>

        <article className="sub-card">
          <p className="panel-caption">Browser handoff</p>
          <h3>Latest retrieve context</h3>
          {props.retrieveHandoff ? (
            <>
              <div className="decision-meta">
                <span className="decision-badge good">Status: {props.retrieveHandoff.status}</span>
                <span className={`decision-badge ${retrieveHandoff.state === 'ready' ? 'good' : 'bad'}`}>
                  Handoff: {retrieveHandoff.state === 'ready' ? 'ready' : 'blocked'}
                </span>
                <span className={`decision-badge ${props.retrieveHandoff.autoRefresh ? 'good' : 'muted'}`}>
                  Auto refresh: {String(props.retrieveHandoff.autoRefresh)}
                </span>
              </div>
              <p><strong>Alias:</strong> {props.retrieveHandoff.alias}</p>
              <p><strong>Completed:</strong> {formatTimestamp(props.retrieveHandoff.completedAt)}</p>
              <p><strong>Parse path:</strong> <span className="path-value">{props.retrieveHandoff.parsePath}</span></p>
              <p><strong>Metadata args:</strong> <span className="path-value">{props.retrieveHandoff.metadataArgs.join(' ') || 'n/a'}</span></p>
              <p><strong>Staged selections:</strong> {stagedSelectionCount}</p>
              {stagedSelectionCount > 0 ? (
                <>
                  <ul className="issue-list">
                    {stagedSelectionPreview.map((selection, index) => {
                      const memberCount = Array.isArray(selection.members) ? selection.members.length : null;
                      const previewMembers = memberCount ? selection.members!.slice(0, 3) : [];
                      const remainingMembers = memberCount ? Math.max(memberCount - previewMembers.length, 0) : 0;
                      return (
                        <li key={`${selection.type}-${index}`}>
                          <div className="decision-meta">
                            <span className="decision-badge good">{selection.type}</span>
                            <span className="decision-badge muted">
                              {memberCount === null ? 'all members' : `${memberCount} member${memberCount === 1 ? '' : 's'}`}
                            </span>
                          </div>
                          {memberCount === null ? (
                            <p>Entire metadata family is staged in the handoff cart.</p>
                          ) : (
                            <p>
                              {previewMembers.join(', ')}
                              {remainingMembers > 0 ? ` + ${remainingMembers} more` : ''}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {stagedSelectionOverflow > 0 ? (
                    <p className="muted">Showing first {stagedSelectionPreview.length} selections. Open Org Browser for full cart details.</p>
                  ) : null}
                </>
              ) : (
                <p className="muted">No staged selections were captured with this handoff yet.</p>
              )}
              {retrieveHandoff.state === 'blocked' ? (
                <ul className="issue-list">
                  {retrieveHandoff.reasons.map((reason) => (
                    <li key={reason}>
                      <strong>Fail closed.</strong> {reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">This retrieve is ready to seed rebuild review in `Refresh & Build`.</p>
              )}
              {retrieveHandoff.state !== 'ready' || stagedSelectionCount === 0 ? (
                <div className="action-row">
                  <button type="button" className="ghost" onClick={props.onOpenBrowser}>
                    Open Org Browser
                  </button>
                </div>
              ) : null}
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
                <span className={`decision-badge ${lineageTone(refreshLineage)}`}>
                  Lineage: {refreshLineage.state}
                </span>
              </div>
              <p><strong>Snapshot:</strong> <span className="path-value">{props.lastRefreshRun.snapshotId}</span></p>
              <p><strong>Source path:</strong> <span className="path-value">{props.lastRefreshRun.sourcePath || 'n/a'}</span></p>
              <p><strong>Counts:</strong> {props.lastRefreshRun.nodeCount} nodes, {props.lastRefreshRun.edgeCount} edges, {props.lastRefreshRun.evidenceCount} evidence</p>
              <p><strong>Meaning change:</strong> {props.lastRefreshRun.meaningChangeSummary || 'n/a'}</p>
              <p><strong>Drift summary:</strong> {props.lastRefreshRun.driftSummary || 'n/a'}</p>
              <p><strong>Rebaseline applied:</strong> {String(props.lastRefreshRun.rebaselineApplied)}</p>
              {refreshLineage.state !== 'current' ? (
                <ul className="issue-list">
                  {refreshLineage.reasons.map((reason) => (
                    <li key={reason}>
                      <strong>Refresh lineage stale.</strong> {reason}
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          ) : (
            <p className="muted">Run Refresh Semantic State to capture the latest semantic rebuild summary.</p>
          )}
        </article>
      </div>

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
        <button type="button" onClick={props.onRunRefresh} disabled={props.loading || refreshBlocked}>
          Refresh Semantic State
        </button>
        {props.refreshNeedsRebaseline ? (
          <button
            type="button"
            className="ghost"
            onClick={props.onRunRefreshWithRebaseline}
            disabled={props.loading || refreshBlocked}
          >
            Rebaseline Semantic State
          </button>
        ) : null}
      </div>
      {refreshBlocked ? (
        <ul className="issue-list">
          {retrieveHandoff.state !== 'ready' ? (
            <li>
              <strong>Fail closed.</strong> Browser handoff is not ready. {retrieveHandoff.reasons[0]}
            </li>
          ) : null}
          {stagedSelectionCount === 0 ? (
            <li>
              <strong>Fail closed.</strong> No staged metadata selections found. Go to `Org Browser`, check items, and
              run `Retrieve Cart`.
            </li>
          ) : null}
        </ul>
      ) : null}
      {props.refreshNeedsRebaseline ? (
        <ul className="issue-list">
          <li>
            <strong>Recovery available.</strong> The current Browser handoff exceeds the existing semantic drift budget.
            Use <strong>Rebaseline Semantic State</strong> to accept this retrieved-org handoff as the new baseline.
          </li>
        </ul>
      ) : null}

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
        <button
          type="button"
          onClick={props.onRunDiff}
          disabled={
            props.loading ||
            diffBlockedByRefreshLineage ||
            props.fromSnapshot.trim().length === 0 ||
            props.toSnapshot.trim().length === 0 ||
            props.fromSnapshot.trim() === props.toSnapshot.trim()
          }
        >
          Compare Snapshot Drift
        </button>
      </div>
      <p className="muted">
        Refresh Semantic State auto-fills the latest snapshot pair for diff. Compare Snapshot Drift stays fail-closed
        until both snapshot IDs are present, distinct, and still belong to the current Browser handoff.
      </p>
      {diffBlockedByRefreshLineage ? (
        <ul className="issue-list">
          <li>
            <strong>Fail closed.</strong> {refreshLineage.reasons[0] ?? 'Latest Refresh no longer belongs to the current Browser handoff. Re-run Retrieve Cart and Refresh Semantic State before diff.'}
          </li>
        </ul>
      ) : null}

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
            <span className={`decision-badge ${lineageTone(diffLineage)}`}>
              Lineage: {diffLineage.state}
            </span>
          </div>
          <p><strong>From:</strong> {props.lastDiffRun.fromSnapshotId}</p>
          <p><strong>To:</strong> {props.lastDiffRun.toSnapshotId}</p>
          <p><strong>Meaning change:</strong> {props.lastDiffRun.meaningChangeSummary || 'n/a'}</p>
          <p><strong>Node delta:</strong> +{props.lastDiffRun.addedNodeCount} / -{props.lastDiffRun.removedNodeCount}</p>
          <p><strong>Edge delta:</strong> +{props.lastDiffRun.addedEdgeCount} / -{props.lastDiffRun.removedEdgeCount}</p>
          <p><strong>Drift summary:</strong> {props.lastDiffRun.driftSummary || 'n/a'}</p>
          {diffLineage.state !== 'current' ? (
            <ul className="issue-list">
              {diffLineage.reasons.map((reason) => (
                <li key={reason}>
                  <strong>Diff lineage stale.</strong> {reason}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}

      <h3>Org Retrieve Pipeline</h3>
      <p className="muted">
        This action now runs against the checked metadata selections staged in `Org Browser`. If no staged selections
        exist, the action fails closed before sending a request.
      </p>
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
        <button type="button" onClick={props.onRunOrgRetrieve} disabled={props.loading || orgRetrieveBlocked}>
          Run Org Pipeline
        </button>
      </div>
      {orgRetrieveBlocked ? (
        <ul className="issue-list">
          {retrieveHandoff.state !== 'ready' ? (
            <li>
              <strong>Fail closed.</strong> Browser handoff is not ready. {retrieveHandoff.reasons[0]}
            </li>
          ) : null}
          {stagedSelectionCount === 0 ? (
            <li>
              <strong>Fail closed.</strong> No staged metadata selections found. Go to `Org Browser`, check items, and
              run `Retrieve Cart`.
            </li>
          ) : null}
        </ul>
      ) : null}

      {props.lastOrgRetrieveRun ? (
        <article className="sub-card">
          <p className="panel-caption">Latest org retrieve</p>
          <h3>Retrieve pipeline summary</h3>
          <div className="decision-meta">
            <span className="decision-badge good">Status: {props.lastOrgRetrieveRun.status}</span>
            <span className="decision-badge muted">Alias: {props.lastOrgRetrieveRun.alias}</span>
            <span className={`decision-badge ${lineageTone(orgRetrieveLineage)}`}>
              Lineage: {orgRetrieveLineage.state}
            </span>
          </div>
          <p><strong>Completed:</strong> {formatTimestamp(props.lastOrgRetrieveRun.completedAt)}</p>
          <p><strong>Project path:</strong> <span className="path-value">{props.lastOrgRetrieveRun.projectPath}</span></p>
          <p><strong>Parse path:</strong> <span className="path-value">{props.lastOrgRetrieveRun.parsePath}</span></p>
          <p><strong>Metadata args:</strong> <span className="path-value">{props.lastOrgRetrieveRun.metadataArgs.join(' ') || 'n/a'}</span></p>
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
          {orgRetrieveLineage.state !== 'current' ? (
            <ul className="issue-list">
              {orgRetrieveLineage.reasons.map((reason) => (
                <li key={reason}>
                  <strong>Org Retrieve lineage stale.</strong> {reason}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}
    </>
  );
}
