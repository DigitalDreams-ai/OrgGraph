'use client';

import {
  describeInstalledSurfaceStatus,
  describeRuntimeAwareBinaryLabel,
  describeSessionSurfaceStatus,
  describeToolStatusSource,
  type ToolStatusSource
} from '../../shell/org-status-surface';
import type {
  OrgAliasSummary,
  OrgPreflightIssue,
  OrgPreflightPayload,
  OrgSessionAuditEntry,
  OrgSessionAliasesPayload,
  OrgSessionHistoryPayload,
  OrgSessionPayload,
  OrgStatusPayload
} from './types';

interface ConnectWorkspaceProps {
  orgAlias: string;
  setOrgAlias: (value: string) => void;
  activeAlias: string;
  sessionStatus: string;
  orgStatus: OrgStatusPayload | null;
  orgPreflight: OrgPreflightPayload | null;
  orgAliases: OrgSessionAliasesPayload | null;
  orgSessionHistory: OrgSessionHistoryPayload | null;
  orgSession: OrgSessionPayload | null;
  aliasInventory: OrgAliasSummary[];
  recentSessionEvents: OrgSessionAuditEntry[];
  selectedAlias: OrgAliasSummary | null;
  preflightIssues: OrgPreflightIssue[];
  toolingReady: boolean;
  toolStatusSource: ToolStatusSource;
  browserSeeded: boolean;
  selectedAliasReady: boolean;
  runtimeUnavailable: boolean;
  runtimeBlocked: boolean;
  restoreAlias: string;
  loading: boolean;
  onRefreshOverview: () => void;
  onLoadAliases: () => void;
  onCheckSession: () => void;
  onLoadSessionHistory: () => void;
  onCheckToolStatus: () => void;
  onPreflight: () => void;
  onBridgeAlias: (alias?: string) => void;
  onSwitchAlias: (alias?: string) => void;
  onConnectExistingAlias: (alias?: string) => void;
  onDisconnect: () => void;
  onRestoreLastSession: () => void;
  onSelectAlias: (alias: string) => void;
  onInspectAlias: (alias: string) => void;
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

export function ConnectWorkspace(props: ConnectWorkspaceProps): JSX.Element {
  const sessionLabel = describeSessionSurfaceStatus(props.runtimeUnavailable, props.sessionStatus);
  const toolingLabel = props.runtimeUnavailable ? 'unavailable' : props.toolingReady ? 'ready' : 'degraded';
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
  const cciVersion = props.runtimeUnavailable ? 'unavailable' : props.orgStatus?.cci?.version || 'n/a';
  const toolStatusSourceLabel = describeToolStatusSource(props.toolStatusSource);
  const sfMessage =
    props.runtimeUnavailable
      ? 'Refresh Overview could not reach the local desktop runtime. Relaunch Orgumented or restore the packaged API before checking sf access again.'
      : props.orgStatus?.sf?.message || 'Refresh the overview to validate local sf access.';
  const cciMessage =
    props.runtimeUnavailable
      ? 'Refresh Overview could not reach the local desktop runtime. Relaunch Orgumented or restore the packaged API before checking CCI again.'
      : props.orgStatus?.cci?.message || 'Refresh the overview to validate local cci access.';
  const readinessLabel = describeRuntimeAwareBinaryLabel(props.runtimeUnavailable, props.selectedAliasReady, {
    trueLabel: 'ready',
    falseLabel: 'not ready'
  });
  const browserSeededLabel = describeRuntimeAwareBinaryLabel(props.runtimeUnavailable, props.browserSeeded, {
    trueLabel: 'yes',
    falseLabel: 'no'
  });
  const sessionConnectedLabel = describeRuntimeAwareBinaryLabel(
    props.runtimeUnavailable,
    props.orgPreflight?.checks?.sessionConnected,
    {
      trueLabel: 'yes',
      falseLabel: 'no'
    }
  );
  const authenticatedLabel = describeRuntimeAwareBinaryLabel(
    props.runtimeUnavailable,
    props.orgPreflight?.checks?.aliasAuthenticated,
    {
      trueLabel: 'yes',
      falseLabel: 'no'
    }
  );
  const cciAliasLabel = describeRuntimeAwareBinaryLabel(
    props.runtimeUnavailable,
    props.orgPreflight?.checks?.cciAliasAvailable,
    {
      trueLabel: 'yes',
      falseLabel: 'no'
    }
  );
  const parsePathLabel = describeRuntimeAwareBinaryLabel(
    props.runtimeUnavailable,
    props.orgPreflight?.checks?.parsePathPresent,
    {
      trueLabel: 'yes',
      falseLabel: 'no'
    }
  );

  return (
    <>
      <h2>Org Sessions</h2>
      <p className="section-lead">
        Manage the active Salesforce alias as an operator workflow: toolchain health, alias readiness, and session state should be visible
        before you retrieve or ask.
      </p>

      <label htmlFor="orgAlias">Selected Alias</label>
      <input id="orgAlias" value={props.orgAlias} onChange={(e) => props.setOrgAlias(e.target.value)} />

      {props.runtimeBlocked && !props.runtimeUnavailable ? (
        <article className="sub-card warn">
          <p className="panel-caption">Runtime gate</p>
          <h3>Desktop API is reachable but not ready</h3>
          <p>
            Tool and session values below are still live diagnostics, but Ask, Refresh, and rebuild workflows remain blocked until readiness
            returns to <strong>ready</strong>.
          </p>
        </article>
      ) : null}

      <div className="ops-grid">
        <article className="sub-card">
          <p className="panel-caption">Current session</p>
          <h3>Desktop auth state</h3>
          <div className="decision-meta">
            <span className={`decision-badge ${sessionLabel === 'connected' ? 'good' : sessionLabel === 'unknown' ? 'muted' : 'bad'}`}>
              Session: {sessionLabel}
            </span>
            <span className="decision-badge muted">Active: {props.activeAlias || 'n/a'}</span>
          </div>
          <p><strong>Connected:</strong> <span className="path-value">{formatTimestamp(props.orgSession?.connectedAt || props.orgStatus?.session?.connectedAt)}</span></p>
          <p><strong>Last switch:</strong> <span className="path-value">{formatTimestamp(props.orgSession?.switchedAt)}</span></p>
          <p><strong>Disconnected:</strong> <span className="path-value">{formatTimestamp(props.orgSession?.disconnectedAt || props.orgStatus?.session?.disconnectedAt)}</span></p>
          <p><strong>Auth mode:</strong> {props.orgSession?.authMode || props.orgStatus?.authMode || 'n/a'}</p>
          <p><strong>Attach method:</strong> {props.orgSession?.method || 'sf_cli_keychain'}</p>
        </article>

        <article className="sub-card">
          <p className="panel-caption">Toolchain health</p>
          <h3>Local operator dependencies</h3>
          <div className="decision-meta">
            <span className={`decision-badge ${toolingLabel === 'ready' ? 'good' : toolingLabel === 'degraded' ? 'bad' : 'muted'}`}>
              Tooling status: {toolingLabel}
            </span>
            <span className={`decision-badge ${props.orgStatus?.cci?.versionPinned ? 'good' : 'muted'}`}>
              CCI pinned: {String(props.orgStatus?.cci?.versionPinned ?? false)}
            </span>
            <span className="decision-badge muted">
              Source: {toolStatusSourceLabel}
            </span>
          </div>
          {props.runtimeUnavailable ? (
            <p className="muted">
              Runtime is unavailable, so tool checks are blocked. This state is not treated as missing `sf` or `cci`.
            </p>
          ) : null}
          <p><strong>sf CLI:</strong> {sfState}</p>
          <p>{sfMessage}</p>
          <p><strong>CCI:</strong> {cciState}</p>
          <p><strong>Version:</strong> {cciVersion}</p>
          <p>{cciMessage}</p>
        </article>

        <article className="sub-card">
          <p className="panel-caption">Selected alias</p>
          <h3>Readiness for attach</h3>
          <div className="decision-meta">
            <span
              className={`decision-badge ${
                props.selectedAliasReady && !props.runtimeUnavailable ? 'good' : readinessLabel === 'unknown' ? 'muted' : 'bad'
              }`}
            >
              Ready to connect: {readinessLabel}
            </span>
            <span className={`decision-badge ${props.browserSeeded ? 'good' : 'muted'}`}>
              Browser seeded: {browserSeededLabel}
            </span>
            <span className={`decision-badge ${props.orgPreflight?.checks?.sessionConnected ? 'good' : 'muted'}`}>
              Session connected: {sessionConnectedLabel}
            </span>
          </div>
          <p><strong>Alias:</strong> <span className="path-value">{props.selectedAlias?.alias || props.orgPreflight?.alias || props.orgAlias}</span></p>
          <p><strong>Username:</strong> <span className="path-value">{props.selectedAlias?.username || 'n/a'}</span></p>
          <p><strong>Org ID:</strong> <span className="path-value">{props.selectedAlias?.orgId || 'n/a'}</span></p>
          <p><strong>Instance URL:</strong> <span className="path-value">{props.selectedAlias?.instanceUrl || 'n/a'}</span></p>
          <p><strong>Authenticated in sf:</strong> {authenticatedLabel}</p>
          <p><strong>CCI alias available:</strong> {cciAliasLabel}</p>
          <p><strong>Parse path present:</strong> {parsePathLabel}</p>
          <p className="muted">A missing parse path is a browser/retrieve warning, not a connect blocker on first contact.</p>
        </article>

        <article className="sub-card">
          <p className="panel-caption">Alias inventory</p>
          <h3>Known org sessions</h3>
          <div className="decision-meta">
            <span className="decision-badge muted">Loaded: {props.aliasInventory.length}</span>
            <span className="decision-badge muted">Default: {props.aliasInventory.find((entry) => entry.isDefault)?.alias || 'n/a'}</span>
          </div>
          <p><strong>Active alias:</strong> <span className="path-value">{props.orgAliases?.activeAlias || props.activeAlias || 'n/a'}</span></p>
          <p><strong>Selected alias:</strong> <span className="path-value">{props.orgAlias}</span></p>
          <p><strong>Inventory source:</strong> sf CLI keychain</p>
          <p className="muted">Use Refresh Overview to re-sync status, aliases, and preflight in one pass.</p>
        </article>
      </div>

      <div className="action-row">
        <button type="button" onClick={props.onRefreshOverview} disabled={props.loading}>Refresh Overview</button>
        <button type="button" onClick={() => props.onConnectExistingAlias()} disabled={props.loading}>Attach Selected Alias</button>
        <button type="button" onClick={() => props.onSwitchAlias()} disabled={props.loading}>Switch Active Alias</button>
        <button type="button" onClick={props.onRestoreLastSession} disabled={props.loading || !props.restoreAlias}>
          Restore Last Session
        </button>
        <button type="button" className="ghost" onClick={props.onDisconnect} disabled={props.loading}>Disconnect</button>
      </div>
      <p className="muted">
        `Attach Active Alias` in the top bar runs the same attach action against the currently selected alias. Use the buttons here when you need explicit connect/switch control.
      </p>

      <div className="action-row">
        <button type="button" className="ghost" onClick={props.onLoadAliases} disabled={props.loading}>Load Aliases</button>
        <button type="button" className="ghost" onClick={props.onCheckSession} disabled={props.loading}>Check Session</button>
        <button type="button" className="ghost" onClick={props.onLoadSessionHistory} disabled={props.loading}>Session History</button>
        <button type="button" className="ghost" onClick={props.onCheckToolStatus} disabled={props.loading}>Check Tool Status</button>
        <button type="button" className="ghost" onClick={props.onPreflight} disabled={props.loading}>Preflight Selected</button>
        <button type="button" className="ghost" onClick={() => props.onBridgeAlias()} disabled={props.loading}>Bridge CCI Alias</button>
      </div>

      <div className="ops-grid">
        <article className="sub-card" role="status" aria-live="polite">
          <p className="panel-caption">Preflight issues</p>
          <h3>Readiness blockers and warnings</h3>
          {props.preflightIssues.length > 0 ? (
            <ul className="issue-list">
              {props.preflightIssues.map((issue) => (
                <li key={`${issue.code || 'issue'}-${issue.message || 'message'}`}>
                  <div className="decision-meta">
                    <span className={`decision-badge ${issue.severity === 'error' ? 'bad' : 'muted'}`}>
                      {issue.severity || 'warning'}
                    </span>
                    <span className="decision-badge muted">{issue.code || 'issue'}</span>
                  </div>
                  <p><strong>{issue.message || 'Unknown issue'}</strong></p>
                  <p>{issue.remediation || 'No remediation provided.'}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No current preflight issues for the selected alias.</p>
          )}
        </article>

        <article className="sub-card">
          <p className="panel-caption">Operator commands</p>
          <h3>Manual auth bridge</h3>
          <p className="muted">
            Use `Bridge CCI Alias` first. Run these commands only when the automatic bridge path reports a blocking error.
          </p>
          <pre className="diagnostic-code-block">{`# 1) Authenticate in sf keychain
sf org login web --alias ${props.orgAlias} --instance-url https://test.salesforce.com --set-default

# 2) Bridge alias into CCI registry
# run from the local Orgumented sf project path
cd "%APPDATA%\\Orgumented\\sf-project"
cci org import ${props.orgAlias} ${props.orgAlias}
cci org info ${props.orgAlias}`}</pre>
          <p><strong>Restore alias:</strong> <span className="path-value">{props.restoreAlias || props.orgSessionHistory?.restoreAlias || 'n/a'}</span></p>
        </article>

        <article className="sub-card">
          <p className="panel-caption">Recent auth events</p>
          <h3>Session history</h3>
          {props.recentSessionEvents.length > 0 ? (
            <ul className="issue-list">
              {props.recentSessionEvents.map((entry, index) => (
                <li key={`${entry.timestamp || 'event'}-${entry.alias || 'alias'}-${index}`}>
                  <div className="decision-meta">
                    <span className={`decision-badge ${entry.action === 'switch_failed' ? 'bad' : 'good'}`}>
                      {entry.action || 'event'}
                    </span>
                    <span className="decision-badge muted">{entry.alias || 'n/a'}</span>
                  </div>
                  <p><strong>{formatTimestamp(entry.timestamp)}</strong></p>
                  <p>{entry.message || 'No message recorded.'}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No recent auth/session events have been recorded yet.</p>
          )}
        </article>
      </div>

      {props.aliasInventory.length > 0 ? (
        <div className="sub-card">
          <p className="panel-caption">Discovered aliases</p>
          <h3>Known sf keychain sessions</h3>
          <ul className="ops-list">
            {props.aliasInventory.map((entry) => {
              const isSelected = entry.alias === props.orgAlias;
              const isActive = entry.alias === props.activeAlias;
              return (
                <li key={entry.alias} className="ops-list-item">
                  <div>
                    <div className="decision-meta">
                      <span className={`decision-badge ${isActive ? 'good' : 'muted'}`}>
                        {isActive ? 'active' : 'available'}
                      </span>
                      {entry.isDefault ? <span className="decision-badge muted">default</span> : null}
                      {isSelected ? <span className="decision-badge muted">selected</span> : null}
                    </div>
                    <p><strong><span className="path-value">{entry.alias}</span></strong></p>
                    <p><strong>Username:</strong> <span className="path-value">{entry.username || 'n/a'}</span></p>
                    <p><strong>Org ID:</strong> <span className="path-value">{entry.orgId || 'n/a'}</span></p>
                    <p><strong>Instance URL:</strong> <span className="path-value">{entry.instanceUrl || 'n/a'}</span></p>
                  </div>
                  <div className="ops-list-actions">
                    <button type="button" className="ghost" onClick={() => props.onSelectAlias(entry.alias)}>
                      Use
                    </button>
                    <button type="button" className="ghost" onClick={() => props.onInspectAlias(entry.alias)}>
                      Inspect
                    </button>
                    <button type="button" onClick={() => props.onConnectExistingAlias(entry.alias)}>
                      Attach
                    </button>
                    <button type="button" className="ghost" onClick={() => props.onSwitchAlias(entry.alias)}>
                      Switch
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </>
  );
}
