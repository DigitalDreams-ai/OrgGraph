'use client';

import {
  describeInstalledSurfaceStatus,
  describeSessionSurfaceStatus,
  describeToolStatusSource,
  type ToolStatusSource
} from '../../shell/org-status-surface';
import { describeReadySurfaceStatus } from '../../shell/runtime-gate';
import type { ReadyPayload } from '../../shell/use-shell-runtime';
import type { OrgPreflightIssue, OrgPreflightPayload, OrgStatusPayload } from '../connect/types';
import type { AskTrustDashboardPayload, MetaAdaptPayload, MetaContextPayload, RuntimeMetricsPayload } from './types';
import {
  buildStructuredSnapshot,
  deriveRuntimeIssues
} from './runtime-status';
import type { StructuredRuntimeActionId } from './runtime-status';
import type { StructuredSummary } from './runtime-status';
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
  runtimeMetrics: RuntimeMetricsPayload | null;
  loading: boolean;
  onLoadMetaContext: () => void;
  onRunMetaAdapt: () => void;
  onLoadOrgStatus: () => void;
  onLoadAskTrustDashboard: () => void;
  onLoadRuntimeMetrics: () => void;
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

function buildMetaAdaptSummary(payload: MetaAdaptPayload): {
  relationChanges: number;
  addedRelations: string[];
  removedRelations: string[];
  changedRelations: string[];
  sampleDelta: number;
  formulaChanged: boolean;
} {
  const before = payload.before.relationMultipliers;
  const after = payload.after.relationMultipliers;
  const beforeSampleSize = payload.before.provenance?.metricsSampleSize ?? 0;
  const afterSampleSize = payload.after.provenance?.metricsSampleSize ?? 0;
  const beforeFormulaVersion = payload.before.provenance?.formulaVersion ?? '';
  const afterFormulaVersion = payload.after.provenance?.formulaVersion ?? '';
  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
  const allKeys = Array.from(new Set([...beforeKeys, ...afterKeys])).sort();

  const addedRelations = allKeys.filter((key) => !beforeKeys.has(key));
  const removedRelations = allKeys.filter((key) => !afterKeys.has(key));
  const changedRelations = allKeys.filter((key) => before[key] !== undefined && after[key] !== undefined && before[key] !== after[key]);

  return {
    relationChanges: addedRelations.length + removedRelations.length + changedRelations.length,
    addedRelations,
    removedRelations,
    changedRelations,
    sampleDelta: afterSampleSize - beforeSampleSize,
    formulaChanged: beforeFormulaVersion !== afterFormulaVersion
  };
}

function renderAskTrustTelemetry(
  payload: AskTrustDashboardPayload | null,
  _loading: boolean,
  _onLoadAskTrustDashboard: () => void,
  _onLoadRuntimeMetrics: () => void
): JSX.Element {
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
                <span className="path-value">{item.class}</span>: {item.count}
              </li>
            ))}
          </ul>
          <p className="muted">Use the triage snapshot or primary controls above to refresh trust or load related telemetry.</p>
        </>
      ) : (
        <>
          <p className="muted">Load Ask Trust from the primary controls or triage snapshot to inspect replay rate, proof coverage, and recent failure classes.</p>
        </>
      )}
    </article>
  );
}

function renderRuntimeTelemetry(
  payload: RuntimeMetricsPayload | null,
  _loading: boolean,
  _onLoadRuntimeMetrics: () => void,
  _onRefreshStatus: () => void
): JSX.Element {
  if (!payload) {
    return (
      <article className="sub-card">
        <p className="panel-caption">Runtime telemetry</p>
        <h3>Route timings and failure signatures</h3>
        <p className="muted">Load Runtime Telemetry from the primary controls or triage snapshot to inspect request volume, busiest routes, and recent non-200 signatures.</p>
      </article>
    );
  }

  const routesByTraffic = [...payload.byRoute].sort((left, right) => right.requestCount - left.requestCount || left.path.localeCompare(right.path));
  const routesByLatency = [...payload.byRoute].sort((left, right) => right.avgElapsedMs - left.avgElapsedMs || left.path.localeCompare(right.path));
  const routesByRecency = [...payload.byRoute].sort((left, right) => Date.parse(right.lastSeenAt) - Date.parse(left.lastSeenAt));
  const failureRoutes = routesByRecency.filter((route) => route.lastStatusCode >= 400);
  const hottestRoute = routesByTraffic[0];
  const slowestRoute = routesByLatency[0];
  const latestRoute = routesByRecency[0];

  function describeRoute(route?: RuntimeMetricsPayload['byRoute'][number]): JSX.Element {
    if (!route) {
      return <span className="muted">n/a</span>;
    }
    return (
      <span className="path-value">
        {route.method} {route.path}
      </span>
    );
  }

  return (
    <article className="sub-card">
      <p className="panel-caption">Runtime telemetry</p>
      <h3>Route timings and failure signatures</h3>
      <div className="decision-meta">
        <span className="decision-badge good">Requests: {payload.totalRequests}</span>
        <span className="decision-badge muted">Routes: {payload.byRoute.length}</span>
        <span className="decision-badge muted">DB: {payload.dbBackend}</span>
        <span className={failureRoutes.length > 0 ? 'decision-badge bad' : 'decision-badge good'}>
          Failure routes: {failureRoutes.length}
        </span>
      </div>
      <div className="analysis-stat-grid">
        <div className="packet-stat">
          <span>Hottest route</span>
          <strong>{hottestRoute ? hottestRoute.requestCount : 'n/a'}</strong>
          <p>{describeRoute(hottestRoute)}</p>
        </div>
        <div className="packet-stat">
          <span>Slowest route</span>
          <strong>{slowestRoute ? `${slowestRoute.avgElapsedMs} ms` : 'n/a'}</strong>
          <p>{describeRoute(slowestRoute)}</p>
        </div>
        <div className="packet-stat">
          <span>Latest route</span>
          <strong>{latestRoute ? formatTimestamp(latestRoute.lastSeenAt) : 'n/a'}</strong>
          <p>{describeRoute(latestRoute)}</p>
        </div>
      </div>
      <ul className="analysis-list">
        {failureRoutes.length > 0 ? (
          failureRoutes.slice(0, 3).map((route) => (
            <li key={`${route.method}-${route.path}`}>
              <strong>Failure signature:</strong>{' '}
              <span className="path-value">
                {route.method} {route.path}
              </span>{' '}
              last status {route.lastStatusCode}, average {route.avgElapsedMs} ms, seen {formatTimestamp(route.lastSeenAt)}
            </li>
          ))
        ) : (
          <li>No non-200 route signatures recorded in the current runtime window.</li>
        )}
      </ul>
      <p className="muted">Use the triage snapshot or primary controls above to refresh telemetry or runtime status.</p>
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

function buildAskTrustSummary(payload: AskTrustDashboardPayload | null): StructuredSummary {
  if (!payload) {
    return {
      id: 'ask-trust',
      title: 'Ask trust snapshot',
      status: 'warning',
      detail: 'Ask trust telemetry is not loaded yet, so replay rate and proof coverage are not visible in the primary diagnostics snapshot.',
      nextAction: 'Load Ask Trust to inspect replay pass rate, proof coverage, and recent failure classes.',
      actions: [
        { id: 'load-ask-trust', label: 'Load Ask Trust' },
        { id: 'load-runtime-metrics', label: 'Open Runtime Telemetry' }
      ]
    };
  }

  const hasFailures = payload.failureClasses.some((item) => item.class !== 'none' && item.count > 0);
  const status: StructuredSummary['status'] =
    payload.replayPassRate < 0.8 || payload.proofCoverageRate < 0.8
      ? 'bad'
      : hasFailures
        ? 'warning'
        : 'good';

  return {
    id: 'ask-trust',
    title: 'Ask trust snapshot',
    status,
    detail: `Replay ${(payload.replayPassRate * 100).toFixed(0)}%, proof coverage ${(payload.proofCoverageRate * 100).toFixed(0)}%, failure classes ${payload.failureClasses.filter((item) => item.count > 0 && item.class !== 'none').length}.`,
    nextAction:
      status === 'bad'
        ? 'Refresh Ask Trust and inspect failure classes before relying on recent Ask packets.'
        : hasFailures
          ? 'Review Ask trust failure classes and correlate with runtime telemetry if quality drift persists.'
          : 'Ask trust telemetry is healthy.',
    actions: [
      { id: 'load-ask-trust', label: 'Refresh Ask Trust' },
      { id: 'load-runtime-metrics', label: 'Open Runtime Telemetry' }
    ]
  };
}

function buildRuntimeTelemetrySummary(payload: RuntimeMetricsPayload | null): StructuredSummary {
  if (!payload) {
    return {
      id: 'runtime-telemetry',
      title: 'Runtime telemetry snapshot',
      status: 'warning',
      detail: 'Runtime telemetry is not loaded yet, so route timings and failure signatures are not visible in the primary diagnostics snapshot.',
      nextAction: 'Load Runtime Telemetry to inspect route volume, latency, and recent non-200 signatures.',
      actions: [
        { id: 'load-runtime-metrics', label: 'Load Runtime Telemetry' },
        { id: 'refresh-status', label: 'Refresh Status' }
      ]
    };
  }

  const failureRoutes = payload.byRoute.filter((route) => route.lastStatusCode >= 400);
  const slowRoute = [...payload.byRoute].sort((left, right) => right.avgElapsedMs - left.avgElapsedMs)[0];
  const status: StructuredSummary['status'] =
    failureRoutes.length > 0 ? 'warning' : 'good';

  return {
    id: 'runtime-telemetry',
    title: 'Runtime telemetry snapshot',
    status,
    detail: `${payload.totalRequests} requests across ${payload.byRoute.length} routes${slowRoute ? `; slowest ${slowRoute.method} ${slowRoute.path} at ${slowRoute.avgElapsedMs} ms` : ''}.`,
    nextAction:
      failureRoutes.length > 0
        ? 'Refresh Runtime Telemetry and inspect recent failure signatures before treating diagnostics as stable.'
        : 'Runtime telemetry is stable; refresh if operator conditions change.',
    actions: [
      { id: 'load-runtime-metrics', label: 'Refresh Runtime Telemetry' },
      { id: 'refresh-status', label: 'Refresh Status' }
    ]
  };
}

export function SystemWorkspace(props: SystemWorkspaceProps): JSX.Element {
  const readySurfaceStatus = describeReadySurfaceStatus(props.readyStatus);
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
  const structuredDiagnostics = [
    ...structuredSnapshot,
    buildAskTrustSummary(props.askTrustDashboard),
    buildRuntimeTelemetrySummary(props.runtimeMetrics)
  ];
  const sfState = describeInstalledSurfaceStatus({
    runtimeUnavailable: props.runtimeUnavailable,
    installed: props.orgStatus?.sf?.installed,
    hasLiveStatus: Boolean(props.orgStatus),
    installedLabel: 'installed',
    missingLabel: 'missing'
  });
  const cciState = describeInstalledSurfaceStatus({
    runtimeUnavailable: props.runtimeUnavailable,
    installed: props.orgStatus?.cci?.installed,
    hasLiveStatus: Boolean(props.orgStatus),
    installedLabel: 'installed',
    missingLabel: 'missing'
  });
  const toolSourceLabel = describeToolStatusSource(props.toolStatusSource);
  const sessionLabel = describeSessionSurfaceStatus(props.runtimeUnavailable, props.orgStatus?.session?.status);
  const toolingMessage = props.runtimeUnavailable
    ? 'Runtime is currently unreachable. Relaunch Orgumented desktop, then run Refresh Status before checking toolchain state.'
    : props.runtimeBlocked
      ? 'Runtime readiness is fail-closed. Tool and session values below are still live diagnostics, but deterministic workflows remain blocked until readiness returns to ready.'
      : props.orgStatus?.sf?.message || props.orgStatus?.cci?.message || 'Tooling messages look healthy.';
  const metaAdaptSummary = props.metaAdaptResult ? buildMetaAdaptSummary(props.metaAdaptResult) : null;

  function handleStructuredAction(actionId: StructuredRuntimeActionId): void {
    if (actionId === 'refresh-status') {
      props.onRefreshStatus();
      return;
    }
    if (actionId === 'load-meta-context') {
      props.onLoadMetaContext();
      return;
    }
    if (actionId === 'run-meta-adapt') {
      props.onRunMetaAdapt();
      return;
    }
    if (actionId === 'load-ask-trust') {
      props.onLoadAskTrustDashboard();
      return;
    }
    if (actionId === 'load-runtime-metrics') {
      props.onLoadRuntimeMetrics();
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
            <span className={readySurfaceStatus === 'ready' ? 'decision-badge good' : readySurfaceStatus === 'unknown' ? 'decision-badge muted' : 'decision-badge bad'}>
              Ready: {readySurfaceStatus}
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
                  Session: {sessionLabel}
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
            {structuredDiagnostics.map((item) => (
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
        <button type="button" onClick={props.onLoadRuntimeMetrics} disabled={props.loading}>
          Runtime Telemetry
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

        {renderAskTrustTelemetry(props.askTrustDashboard, props.loading, props.onLoadAskTrustDashboard, props.onLoadRuntimeMetrics)}

        {renderRuntimeTelemetry(props.runtimeMetrics, props.loading, props.onLoadRuntimeMetrics, props.onRefreshStatus)}
      </div>

      <div className="analysis-grid">
        <article className="sub-card analysis-grid-full">
          <p className="panel-caption">Latest meta adapt</p>
          <h3>Adaptation result</h3>
          {props.metaAdaptResult ? (
            <>
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
            </>
          ) : (
            <p className="muted">Run Meta Adapt to inspect deterministic before/after deltas.</p>
          )}
        </article>

        <article className="sub-card">
          <p className="panel-caption">Adaptation delta</p>
          <h3>Structured change summary</h3>
          {metaAdaptSummary ? (
            <>
              <div className="analysis-stat-grid">
                <div className="packet-stat">
                  <span>Relation changes</span>
                  <strong>{metaAdaptSummary.relationChanges}</strong>
                </div>
                <div className="packet-stat">
                  <span>Sample delta</span>
                  <strong>{metaAdaptSummary.sampleDelta >= 0 ? `+${metaAdaptSummary.sampleDelta}` : metaAdaptSummary.sampleDelta}</strong>
                </div>
                <div className="packet-stat">
                  <span>Formula version</span>
                  <strong>{metaAdaptSummary.formulaChanged ? 'changed' : 'unchanged'}</strong>
                </div>
              </div>
              <ul className="analysis-list">
                <li>
                  <strong>Added relations</strong>
                  <p>{metaAdaptSummary.addedRelations.length > 0 ? metaAdaptSummary.addedRelations.join(', ') : 'none'}</p>
                </li>
                <li>
                  <strong>Removed relations</strong>
                  <p>{metaAdaptSummary.removedRelations.length > 0 ? metaAdaptSummary.removedRelations.join(', ') : 'none'}</p>
                </li>
                <li>
                  <strong>Updated multipliers</strong>
                  <p>{metaAdaptSummary.changedRelations.length > 0 ? metaAdaptSummary.changedRelations.join(', ') : 'none'}</p>
                </li>
              </ul>
            </>
          ) : (
            <p className="muted">Run Meta Adapt to inspect deterministic before/after deltas.</p>
          )}
        </article>

        {props.metaAdaptResult ? (
          <>
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
          </>
        ) : null}
      </div>
    </>
  );
}
