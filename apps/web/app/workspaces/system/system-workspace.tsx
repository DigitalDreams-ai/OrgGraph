'use client';

import type { OrgStatusPayload } from '../connect/types';
import type { MetaAdaptPayload, MetaContextPayload } from './types';

interface SystemWorkspaceProps {
  metaDryRun: boolean;
  setMetaDryRun: (value: boolean) => void;
  healthStatus: string;
  readyStatus: string;
  readyDetails: string;
  orgStatus: OrgStatusPayload | null;
  metaContext: MetaContextPayload | null;
  metaAdaptResult: MetaAdaptPayload | null;
  loading: boolean;
  onLoadMetaContext: () => void;
  onRunMetaAdapt: () => void;
  onLoadOrgStatus: () => void;
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

export function SystemWorkspace(props: SystemWorkspaceProps): JSX.Element {
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
          <p>{props.readyDetails || 'No readiness detail available yet.'}</p>
        </article>

        <article className="sub-card">
          <p className="panel-caption">Tooling status</p>
          <h3>Org connectivity</h3>
          {props.orgStatus ? (
            <>
              <div className="decision-meta">
                <span className={props.orgStatus.integrationEnabled ? 'decision-badge good' : 'decision-badge bad'}>
                  Integration: {String(props.orgStatus.integrationEnabled)}
                </span>
                <span className="decision-badge muted">Auth: {props.orgStatus.authMode || 'n/a'}</span>
                <span className={props.orgStatus.session?.status === 'connected' ? 'decision-badge good' : 'decision-badge muted'}>
                  Session: {props.orgStatus.session?.status || 'unknown'}
                </span>
              </div>
              <div className="analysis-stat-grid">
                <div className="packet-stat">
                  <span>sf</span>
                  <strong>{props.orgStatus.sf?.installed ? 'installed' : 'missing'}</strong>
                </div>
                <div className="packet-stat">
                  <span>cci</span>
                  <strong>{props.orgStatus.cci?.installed ? 'installed' : 'missing'}</strong>
                </div>
                <div className="packet-stat">
                  <span>Alias</span>
                  <strong>{props.orgStatus.session?.activeAlias || props.orgStatus.alias || 'n/a'}</strong>
                </div>
              </div>
              <p>{props.orgStatus.sf?.message || props.orgStatus.cci?.message || 'Tooling messages look healthy.'}</p>
            </>
          ) : (
            <p className="muted">Load Org Status to inspect CLI readiness and current session state.</p>
          )}
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
            <p><strong>Context path:</strong> {props.metaAdaptResult.contextPath}</p>
            <p><strong>Audit artifact:</strong> {props.metaAdaptResult.auditArtifactPath}</p>
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
