'use client';

import type { ReadyPayload } from '../../shell/use-shell-runtime';
import type { OrgStatusPayload } from '../connect/types';
import type { MetaAdaptPayload, MetaContextPayload } from './types';

interface SystemWorkspaceProps {
  metaDryRun: boolean;
  setMetaDryRun: (value: boolean) => void;
  healthStatus: string;
  readyStatus: string;
  readyDetails: string;
  readyPayload: ReadyPayload | null;
  orgStatus: OrgStatusPayload | null;
  runtimeUnavailable: boolean;
  metaContext: MetaContextPayload | null;
  metaAdaptResult: MetaAdaptPayload | null;
  loading: boolean;
  onLoadMetaContext: () => void;
  onRunMetaAdapt: () => void;
  onLoadOrgStatus: () => void;
}

type RuntimeIssue = {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  remediation: string;
};

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

function deriveRuntimeIssues(
  healthStatus: string,
  readyStatus: string,
  readyPayload: ReadyPayload | null
): RuntimeIssue[] {
  const issues: RuntimeIssue[] = [];

  if (healthStatus === 'unreachable') {
    issues.push({
      code: 'HEALTH_UNREACHABLE',
      severity: 'error',
      message: 'Desktop API health endpoint is unreachable.',
      remediation: 'Relaunch Orgumented desktop and run Refresh Status once the API process is back.'
    });
  }

  if (readyStatus === 'unreachable') {
    issues.push({
      code: 'READY_UNREACHABLE',
      severity: 'error',
      message: 'Desktop API readiness endpoint is unreachable.',
      remediation: 'Restart Orgumented desktop to restore packaged API readiness checks.'
    });
  } else if (readyStatus.startsWith('http_')) {
    issues.push({
      code: 'READY_HTTP_FAILURE',
      severity: 'error',
      message: `Readiness returned ${readyStatus}.`,
      remediation: 'Use Refresh & Build to rebuild semantic state, then rerun Refresh Status.'
    });
  }

  const checks = readyPayload?.checks;
  const bootstrap = checks?.bootstrap;
  const db = checks?.db;
  const fixtures = checks?.fixtures;
  const evidence = checks?.evidence;

  if (bootstrap?.ok === false) {
    issues.push({
      code: 'BOOTSTRAP_FAILED',
      severity: 'error',
      message: bootstrap.message || `Runtime bootstrap state is ${bootstrap.status || 'failed'}.`,
      remediation: 'Open Refresh & Build and run Refresh Semantic State to reground runtime bootstrap.'
    });
  }

  if (db?.ok === false) {
    issues.push({
      code: 'GRAPH_NOT_GROUNDED',
      severity: 'error',
      message: `Graph store is not grounded (nodes ${db.nodeCount ?? 0}, edges ${db.edgeCount ?? 0}).`,
      remediation: 'Run Refresh Semantic State after a successful metadata retrieve to repopulate the graph.'
    });
  }

  if (fixtures?.ok === false) {
    issues.push({
      code: 'FIXTURES_MISSING',
      severity: 'warning',
      message: `Fixtures source path is not present (${fixtures.sourcePath || 'n/a'}).`,
      remediation: 'Run Org Browser retrieve, then Refresh Semantic State to regenerate the parse tree.'
    });
  }

  if (evidence?.ok === false) {
    issues.push({
      code: 'EVIDENCE_MISSING',
      severity: 'warning',
      message: `Evidence index path is missing or empty (${evidence.indexPath || 'n/a'}).`,
      remediation: 'Run Refresh Semantic State and Ask once to regenerate deterministic evidence artifacts.'
    });
  }

  if (!checks && readyPayload?.message) {
    issues.push({
      code: 'READY_MESSAGE_ONLY',
      severity: 'warning',
      message: readyPayload.message,
      remediation: 'Rerun Refresh Status and inspect runtime logs if the issue persists.'
    });
  }

  return issues;
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

export function SystemWorkspace(props: SystemWorkspaceProps): JSX.Element {
  const runtimeIssues = deriveRuntimeIssues(props.healthStatus, props.readyStatus, props.readyPayload);
  const readyChecks = props.readyPayload?.checks;
  const sfState = props.runtimeUnavailable ? 'unavailable' : props.orgStatus?.sf?.installed ? 'installed' : 'missing';
  const cciState = props.runtimeUnavailable ? 'unavailable' : props.orgStatus?.cci?.installed ? 'installed' : 'missing';
  const toolingMessage = props.runtimeUnavailable
    ? 'Runtime is currently unreachable. Relaunch Orgumented desktop, then run Refresh Status before checking toolchain state.'
    : props.orgStatus?.sf?.message || props.orgStatus?.cci?.message || 'Tooling messages look healthy.';

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
          {props.readyDetails ? (
            <details>
              <summary>Raw readiness JSON</summary>
              <pre>{props.readyDetails}</pre>
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
              <p>{toolingMessage}</p>
            </>
          ) : (
            <p className="muted">Load Org Status to inspect CLI readiness and current session state.</p>
          )}
        </article>
      </div>

      {renderRuntimeActionChecklist(runtimeIssues)}

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
        <button type="button" onClick={props.onLoadOrgStatus} disabled={props.loading}>
          Org Status
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
