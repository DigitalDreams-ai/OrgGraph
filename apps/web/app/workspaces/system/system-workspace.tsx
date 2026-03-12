'use client';

import { describeToolStatusSource, type ToolStatusSource } from '../../shell/org-status-surface';
import type { ReadyPayload } from '../../shell/use-shell-runtime';
import type { OrgPreflightIssue, OrgPreflightPayload, OrgStatusPayload } from '../connect/types';
import type { AskTrustDashboardPayload, MetaAdaptPayload, MetaContextPayload } from './types';
import {
  buildStructuredSnapshot,
  deriveRuntimeIssues
} from './runtime-status';
import type { RuntimeIssue } from './runtime-status';
import type { StructuredRuntimeActionId } from './runtime-status';
import type { RuntimeGateState } from '../../shell/runtime-gate';

interface SystemWorkspaceProps {
  metaDryRun: boolean;
  setMetaDryRun: (value: boolean) => void;
  healthStatus: string;
  readyStatus: string;
  readyDetails: string;
  readyPayload: ReadyPayload | null;
  orgStatus: OrgStatusPayload | null;
  orgPreflight: OrgPreflightPayload | null;
  runtimeUnavailable: boolean;
  runtimeBlocked: boolean;
  toolStatusSource: ToolStatusSource;
  metaContext: MetaContextPayload | null;
  metaAdaptResult: MetaAdaptPayload | null;
  askTrustDashboard: AskTrustDashboardPayload | null;
  loading: boolean;
  onLoadMetaContext: () => void;
  onRunMetaAdapt: () => void;
  onLoadOrgStatus: () => void;
  onLoadAskTrustDashboard: () => void;
  onRunPreflight: () => void;
  onRefreshStatus: () => void;
  onOpenConnect: () => void;
  onOpenRefresh: () => void;
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

function renderIntentBreakdown(title: string, values: Record<string, number>): JSX.Element {
  const entries = Object.entries(values);

  return (
    <article className="sub-card">
      <p className="panel-caption">{title}</p>
      <ul className="analysis-chip-list">
        {entries.length > 0 ? (
          entries.map(([intent, count]) => <li key={`${title}-${intent}`}>{intent}: {count}</li>)
        ) : (
          <li>No intent samples recorded.</li>
        )}
      </ul>
    </article>
  );
}

function renderRuntimeActionChecklist(issues: RuntimeIssue[]): JSX.Element {
  const actions = Array.from(new Set(issues.map((issue) => issue.remediation)));
  return (
    <article className="sub-card">
      <p className="panel-caption">Triage actions</p>
      <h3>Operator recovery checklist</h3>
      <ul className="analysis-list">
        {actions.length > 0 ? (
          actions.map((action) => <li key={action}>{action}</li>)
        ) : (
          <li>Runtime checks are healthy. No recovery action needed.</li>
        )}
      </ul>
    </article>
  );
}

function renderPreflightActionChecklist(preflight: OrgPreflightPayload | null): JSX.Element {
  const actions = Array.from(
    new Set(
      (preflight?.issues ?? [])
        .map((issue) => issue.remediation?.trim() ?? '')
        .filter((value) => value.length > 0)
    )
  );
  return (
    <article className="sub-card">
      <p className="panel-caption">Tooling triage actions</p>
      <h3>Session/toolchain recovery checklist</h3>
      <ul className="analysis-list">
        {actions.length > 0 ? (
          actions.map((action) => <li key={action}>{action}</li>)
        ) : (
          <li>Preflight did not report remediation items for the selected alias.</li>
        )}
      </ul>
    </article>
  );
}

function renderRelationMultipliers(payload: MetaContextPayload | null): JSX.Element {
  const multipliers = payload?.context.relationMultipliers ?? {};
  const entries = Object.entries(multipliers);

  return (
    <article className="sub-card">
      <p className="panel-caption">Relation weights</p>
      <h3>Current semantic multipliers</h3>
      <ul className="analysis-chip-list">
        {entries.length > 0 ? (
          entries.map(([relation, value]) => <li key={relation}>{relation}: {value}</li>)
        ) : (
          <li>Load Meta Context to inspect relation multipliers.</li>
        )}
      </ul>
    </article>
  );
}

function renderAskTrustTelemetry(payload: AskTrustDashboardPayload | null): JSX.Element {
  return (
    <article className="sub-card">
      <p className="panel-caption">Ask trust telemetry</p>
      <h3>Proof and replay health</h3>
      {payload ? (
        <>
          <div className="decision-meta">
            <span className="decision-badge good">Replay pass: {(payload.replayPassRate * 100).toFixed(0)}%</span>
            <span className="decision-badge good">Proof coverage: {(payload.proofCoverageRate * 100).toFixed(0)}%</span>
            <span className="decision-badge muted">Generated: {formatTimestamp(payload.generatedAt)}</span>
          </div>
          <div className="analysis-stat-grid">
            <div className="packet-stat">
              <span>Ask records</span>
              <strong>{payload.totals.askRecords}</strong>
            </div>
            <div className="packet-stat">
              <span>Proof artifacts</span>
              <strong>{payload.totals.proofArtifacts}</strong>
            </div>
            <div className="packet-stat">
              <span>Trusted</span>
              <strong>{payload.totals.trusted}</strong>
            </div>
            <div className="packet-stat">
              <span>Conditional/refused</span>
              <strong>{payload.totals.conditional + payload.totals.refused}</strong>
            </div>
          </div>
          <p>
            <strong>Snapshot trend:</strong>{' '}
            <span className="path-value">
              {payload.driftTrend.snapshotCount} snapshots
              {payload.driftTrend.latestSnapshotId ? `, latest ${payload.driftTrend.latestSnapshotId}` : ''}
              {payload.driftTrend.previousSnapshotId ? `, previous ${payload.driftTrend.previousSnapshotId}` : ''}
            </span>
          </p>
          <ul className="analysis-chip-list">
            {payload.failureClasses.map((item) => (
              <li key={item.class}>
                {item.class}: {item.count}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">Load Ask Trust to inspect replay rate, proof coverage, and recent failure classes.</p>
      )}
    </article>
  );
}

function renderQuickActions(
  title: string,
  actions: Array<{
    id: StructuredRuntimeActionId;
    label: string;
  }>,
  loading: boolean,
  onRun: (actionId: StructuredRuntimeActionId) => void
): JSX.Element {
  return (
    <div className="action-row" aria-label={title}>
      {actions.map((action) => (
        <button
          key={`${title}-${action.id}`}
          type="button"
          className="ghost"
          onClick={() => onRun(action.id)}
          disabled={loading}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

export function SystemWorkspace(props: SystemWorkspaceProps): JSX.Element {
  const runtimeIssues = deriveRuntimeIssues(props.healthStatus, props.readyStatus, props.readyPayload);
  const readyChecks = props.readyPayload?.checks;
  const preflightIssues = props.orgPreflight?.issues ?? [];
  const preflightChecks = props.orgPreflight?.checks;
  const runtimeGateState: RuntimeGateState = props.runtimeUnavailable
    ? 'unreachable'
    : props.runtimeBlocked
      ? 'blocked'
      : props.readyStatus === 'unknown'
        ? 'unknown'
        : 'ready';
  const structuredSnapshot = buildStructuredSnapshot({
    runtimeGateState,
    healthStatus: props.healthStatus,
    readyStatus: props.readyStatus,
    runtimeIssues,
    orgStatus: props.orgStatus,
    preflightIssues: preflightIssues as OrgPreflightIssue[],
    preflightChecks
  });
  const sfState =
    props.runtimeUnavailable ? 'unavailable' : props.orgStatus ? (props.orgStatus.sf?.installed ? 'installed' : 'missing') : 'unknown';
  const cciState =
    props.runtimeUnavailable ? 'unavailable' : props.orgStatus ? (props.orgStatus.cci?.installed ? 'installed' : 'missing') : 'unknown';
  const toolSourceLabel = describeToolStatusSource(props.toolStatusSource);
  const toolingMessage = props.runtimeUnavailable
    ? 'Runtime is currently unreachable. Relaunch Orgumented desktop, then run Refresh Status before checking toolchain state.'
    : props.runtimeBlocked
      ? 'Runtime readiness is fail-closed. Tool and session values below are still live diagnostics, but deterministic workflows remain blocked until readiness returns to ready.'
      : props.orgStatus?.sf?.message || props.orgStatus?.cci?.message || 'Tooling messages look healthy.';

  function handleStructuredAction(actionId: StructuredRuntimeActionId): void {
    if (actionId === 'refresh-status') {
      props.onRefreshStatus();
      return;
    }
    if (actionId === 'load-org-status') {
      props.onLoadOrgStatus();
      return;
    }
    if (actionId === 'run-preflight') {
      props.onRunPreflight();
      return;
    }
    if (actionId === 'open-connect') {
      props.onOpenConnect();
      return;
    }
    props.onOpenRefresh();
  }

  return (
    <>
      <h2>Settings &amp; Diagnostics</h2>
      <p className="section-lead">Operational context, adaptation dry-run, runtime health, and local diagnostics.</p>

      <div className="ops-grid">
        <article className="sub-card">
          <p className="panel-caption">Runtime health</p>
          <h3>Desktop engine status</h3>
          <div className="decision-meta">
            <span className={props.healthStatus === 'ok' ? 'decision-badge good' : 'decision-badge bad'}>
              Health: {props.healthStatus}
            </span>
            <span className={props.readyStatus === 'ready' ? 'decision-badge good' : 'decision-badge bad'}>
              Ready: {props.readyStatus}
            </span>
          </div>
          <div className="analysis-stat-grid">
            <div className="packet-stat">
              <span>Bootstrap</span>
              <strong>{readyChecks?.bootstrap?.ok === true ? 'ok' : readyChecks?.bootstrap?.ok === false ? 'failed' : 'unknown'}</strong>
              {readyChecks?.bootstrap?.status ? <p>{readyChecks.bootstrap.status}</p> : null}
            </div>
            <div className="packet-stat">
              <span>Graph store</span>
              <strong>{readyChecks?.db?.ok === true ? 'grounded' : readyChecks?.db?.ok === false ? 'empty' : 'unknown'}</strong>
              {typeof readyChecks?.db?.nodeCount === 'number' && typeof readyChecks?.db?.edgeCount === 'number' ? (
                <p>
                  {readyChecks.db.nodeCount} nodes, {readyChecks.db.edgeCount} edges
                </p>
              ) : null}
            </div>
            <div className="packet-stat">
              <span>Fixtures</span>
              <strong>{readyChecks?.fixtures?.ok === true ? 'present' : readyChecks?.fixtures?.ok === false ? 'missing' : 'unknown'}</strong>
            </div>
            <div className="packet-stat">
              <span>Evidence</span>
              <strong>{readyChecks?.evidence?.ok === true ? 'present' : readyChecks?.evidence?.ok === false ? 'missing' : 'unknown'}</strong>
            </div>
          </div>
          {runtimeIssues.length > 0 ? (
            <ul className="issue-list">
              {runtimeIssues.map((issue) => (
                <li key={issue.code}>
                  <strong>{issue.severity.toUpperCase()}:</strong> {issue.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">All runtime readiness checks passed. Structured diagnostics are healthy.</p>
          )}
          {renderQuickActions(
            'Runtime health quick actions',
            [
              { id: 'refresh-status', label: 'Refresh Status' },
              { id: 'open-refresh', label: 'Open Refresh & Build' }
            ],
            props.loading,
            handleStructuredAction
          )}
          {props.readyDetails ? (
            <details className="debug-details">
              <summary>Raw readiness JSON</summary>
              <p className="muted">Use this only for deep debugging. Primary triage is captured in the structured snapshot below.</p>
              <pre className="diagnostic-code-block">{props.readyDetails}</pre>
            </details>
          ) : null}
        </article>

        <article className="sub-card">
          <p className="panel-caption">Tooling status</p>
          <h3>Org connectivity</h3>
          {props.orgStatus || props.runtimeUnavailable ? (
            <>
              <div className="decision-meta">
                <span
                  className={
                    props.runtimeUnavailable
                      ? 'decision-badge bad'
                      : props.orgStatus?.integrationEnabled
                        ? 'decision-badge good'
                        : 'decision-badge bad'
                  }
                >
                  Integration: {props.runtimeUnavailable ? 'unavailable' : String(props.orgStatus?.integrationEnabled)}
                </span>
                <span className="decision-badge muted">Auth: {props.runtimeUnavailable ? 'unavailable' : props.orgStatus?.authMode || 'n/a'}</span>
                <span className="decision-badge muted">Source: {toolSourceLabel}</span>
                <span
                  className={
                    props.runtimeUnavailable
                      ? 'decision-badge bad'
                      : props.orgStatus?.session?.status === 'connected'
                        ? 'decision-badge good'
                        : 'decision-badge muted'
                  }
                >
                  Session: {props.runtimeUnavailable ? 'runtime unavailable' : props.orgStatus?.session?.status || 'unknown'}
                </span>
              </div>
              {props.runtimeUnavailable ? (
                <p className="muted">
                  Runtime-unavailable status blocks tool checks. `sf` and `cci` are shown as unavailable, not missing.
                </p>
              ) : props.runtimeBlocked ? (
                <p className="muted">
                  Runtime is reachable but fail-closed. Tool and session values remain live, but deterministic workflows stay blocked until
                  readiness returns to `ready`.
                </p>
              ) : null}
              <div className="analysis-stat-grid">
                <div className="packet-stat">
                  <span>sf</span>
                  <strong>{sfState}</strong>
                </div>
                <div className="packet-stat">
                  <span>cci</span>
                  <strong>{cciState}</strong>
                </div>
                <div className="packet-stat">
                  <span>Alias</span>
                  <strong>{props.runtimeUnavailable ? 'n/a' : props.orgStatus?.session?.activeAlias || props.orgStatus?.alias || 'n/a'}</strong>
                </div>
              </div>
              <div className="analysis-stat-grid">
                <div className="packet-stat">
                  <span>Alias auth</span>
                  <strong>
                    {props.runtimeUnavailable
                      ? 'unavailable'
                      : preflightChecks?.aliasAuthenticated === true
                        ? 'yes'
                        : preflightChecks?.aliasAuthenticated === false
                          ? 'no'
                          : 'unknown'}
                  </strong>
                </div>
                <div className="packet-stat">
                  <span>CCI alias</span>
                  <strong>
                    {props.runtimeUnavailable
                      ? 'unavailable'
                      : preflightChecks?.cciAliasAvailable === true
                        ? 'yes'
                        : preflightChecks?.cciAliasAvailable === false
                          ? 'no'
                          : 'unknown'}
                  </strong>
                </div>
                <div className="packet-stat">
                  <span>Parse path</span>
                  <strong>
                    {props.runtimeUnavailable
                      ? 'unavailable'
                      : preflightChecks?.parsePathPresent === true
                        ? 'present'
                        : preflightChecks?.parsePathPresent === false
                          ? 'missing'
                          : 'unknown'}
                  </strong>
                </div>
              </div>
              <p>{toolingMessage}</p>
              {preflightIssues.length > 0 ? (
                <ul className="issue-list">
                  {preflightIssues.map((issue, index) => (
                    <li key={`${issue.code ?? 'issue'}-${index}`}>
                      <strong>{(issue.severity || 'warning').toUpperCase()}:</strong> {issue.message || 'preflight issue reported'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No preflight issues reported for the selected alias.</p>
              )}
              {renderQuickActions(
                'Toolchain quick actions',
                [
                  { id: 'load-org-status', label: 'Load Org Status' },
                  { id: 'run-preflight', label: 'Run Preflight' },
                  { id: 'open-connect', label: 'Open Org Sessions' }
                ],
                props.loading,
                handleStructuredAction
              )}
            </>
          ) : (
            <p className="muted">Load Org Status to inspect CLI readiness and current session state.</p>
          )}
        </article>
      </div>

      <div className="analysis-grid">
        <article className="sub-card" role="status" aria-live="polite">
          <p className="panel-caption">Structured diagnostics</p>
          <h3>Operator triage snapshot</h3>
          <ul className="analysis-list">
            {structuredSnapshot.map((item) => (
              <li key={item.id}>
                <div className="decision-meta">
                  <span
                    className={`decision-badge ${
                      item.status === 'good' ? 'good' : item.status === 'warning' ? 'muted' : 'bad'
                    }`}
                  >
                    {item.title}
                  </span>
                </div>
                <p>{item.detail}</p>
                <p>
                  <strong>Next action:</strong> {item.nextAction}
                </p>
                {item.actions.length > 0 ? (
                  <div className="action-row">
                    {item.actions.map((action) => (
                      <button
                        key={`${item.id}-${action.id}`}
                        type="button"
                        className="ghost"
                        onClick={() => handleStructuredAction(action.id)}
                        disabled={props.loading}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </article>
        {renderRuntimeActionChecklist(runtimeIssues)}
        {renderPreflightActionChecklist(props.orgPreflight)}
      </div>

      <label className="check-row" htmlFor="metaDryRun">
        <input id="metaDryRun" type="checkbox" checked={props.metaDryRun} onChange={(e) => props.setMetaDryRun(e.target.checked)} />
        Meta Adapt Dry Run
      </label>
      <div className="action-row">
        <button type="button" onClick={props.onLoadMetaContext} disabled={props.loading}>
          Meta Context
        </button>
        <button type="button" onClick={props.onRunMetaAdapt} disabled={props.loading}>
          Meta Adapt (Dry Run)
        </button>
        <button type="button" onClick={props.onLoadAskTrustDashboard} disabled={props.loading}>
          Ask Trust
        </button>
        <button type="button" onClick={props.onLoadOrgStatus} disabled={props.loading}>
          Org Status
        </button>
        <button type="button" onClick={props.onRunPreflight} disabled={props.loading}>
          Preflight
        </button>
      </div>

      <div className="analysis-grid">
        <article className="sub-card">
          <p className="panel-caption">Meta context</p>
          <h3>Current adaptation state</h3>
          {props.metaContext ? (
            <>
              <div className="decision-meta">
                <span className="decision-badge good">Status: {props.metaContext.status}</span>
                <span className="decision-badge muted">Version: {props.metaContext.context.version}</span>
                <span className="decision-badge muted">
                  Formula: {props.metaContext.context.provenance.formulaVersion}
                </span>
              </div>
              <div className="analysis-stat-grid">
                <div className="packet-stat">
                  <span>Updated</span>
                  <strong>{formatTimestamp(props.metaContext.context.updatedAt)}</strong>
                </div>
                <div className="packet-stat">
                  <span>Samples</span>
                  <strong>{props.metaContext.context.provenance.metricsSampleSize}</strong>
                </div>
                <div className="packet-stat">
                  <span>Relations</span>
                  <strong>{Object.keys(props.metaContext.context.relationMultipliers).length}</strong>
                </div>
              </div>
            </>
          ) : (
            <p className="muted">Load Meta Context to inspect semantic weighting and provenance.</p>
          )}
        </article>

        {renderRelationMultipliers(props.metaContext)}

        {props.metaContext ? renderIntentBreakdown('Trusted by intent', props.metaContext.context.provenance.trustedByIntent) : null}

        {props.metaContext ? renderIntentBreakdown('Refused by intent', props.metaContext.context.provenance.refusedByIntent) : null}

        {renderAskTrustTelemetry(props.askTrustDashboard)}
      </div>

      {props.metaAdaptResult ? (
        <div className="analysis-grid">
          <article className="sub-card analysis-grid-full">
            <p className="panel-caption">Latest meta adapt</p>
            <h3>Adaptation result</h3>
            <div className="decision-meta">
              <span className="decision-badge good">Status: {props.metaAdaptResult.status}</span>
              <span className={props.metaAdaptResult.dryRun ? 'decision-badge muted' : 'decision-badge good'}>
                Dry run: {String(props.metaAdaptResult.dryRun)}
              </span>
              <span className={props.metaAdaptResult.changed ? 'decision-badge good' : 'decision-badge muted'}>
                Changed: {String(props.metaAdaptResult.changed)}
              </span>
            </div>
            <p>
              <strong>Context path:</strong>{' '}
              <span className="path-value">{props.metaAdaptResult.contextPath}</span>
            </p>
            <p>
              <strong>Audit artifact:</strong>{' '}
              <span className="path-value">{props.metaAdaptResult.auditArtifactPath}</span>
            </p>
          </article>

          <article className="sub-card">
            <p className="panel-caption">Before</p>
            <h3>Relation multipliers</h3>
            <ul className="analysis-chip-list">
              {Object.entries(props.metaAdaptResult.before.relationMultipliers).map(([relation, value]) => (
                <li key={`before-${relation}`}>{relation}: {value}</li>
              ))}
            </ul>
          </article>

          <article className="sub-card">
            <p className="panel-caption">After</p>
            <h3>Relation multipliers</h3>
            <ul className="analysis-chip-list">
              {Object.entries(props.metaAdaptResult.after.relationMultipliers).map(([relation, value]) => (
                <li key={`after-${relation}`}>{relation}: {value}</li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}
    </>
  );
}
