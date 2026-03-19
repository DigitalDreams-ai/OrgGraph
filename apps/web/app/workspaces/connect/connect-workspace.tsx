'use client';

import {
  describeInstalledSurfaceStatus,
  describeRuntimeAwareBinaryLabel,
  describeSessionSurfaceStatus,
  describeToolStatusSource,
  type ToolStatusSource
} from '../../shell/org-status-surface';
import type {
  GithubBranchSummary,
  GithubWorkflowCatalogPayload,
  GithubWorkflowRunSummary,
  GithubWorkflowRunsPayload,
  GithubWorkflowSummary,
  GithubPullRequestFileScopePayload,
  GithubPullRequestFileSummary,
  GithubPullRequestScopeSummary,
  GithubPullRequestSummary,
  GithubRepoContextPayload,
  GithubRepoSummary,
  GithubSessionIssue,
  GithubSessionPayload,
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
  githubRepoOwner: string;
  setGithubRepoOwner: (value: string) => void;
  githubRepoName: string;
  setGithubRepoName: (value: string) => void;
  githubRepoDescription: string;
  setGithubRepoDescription: (value: string) => void;
  githubRepoPrivate: boolean;
  setGithubRepoPrivate: (value: boolean) => void;
  githubPullNumber: string;
  setGithubPullNumber: (value: string) => void;
  githubWorkflowKey: string;
  setGithubWorkflowKey: (value: string) => void;
  githubWorkflowRef: string;
  setGithubWorkflowRef: (value: string) => void;
  activeAlias: string;
  sessionStatus: string;
  orgStatus: OrgStatusPayload | null;
  orgPreflight: OrgPreflightPayload | null;
  orgAliases: OrgSessionAliasesPayload | null;
  orgSessionHistory: OrgSessionHistoryPayload | null;
  orgSession: OrgSessionPayload | null;
  githubSession: GithubSessionPayload | null;
  githubRepoContext: GithubRepoContextPayload | null;
  githubPullRequestFiles: GithubPullRequestFileScopePayload | null;
  githubWorkflowCatalog: GithubWorkflowCatalogPayload | null;
  githubWorkflowRuns: GithubWorkflowRunsPayload | null;
  aliasInventory: OrgAliasSummary[];
  githubAccessibleRepos: GithubRepoSummary[];
  githubSelectedRepo: GithubRepoSummary | null;
  recentSessionEvents: OrgSessionAuditEntry[];
  githubIssues: GithubSessionIssue[];
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
  onRefreshGithubStatus: () => void;
  onAuthorizeGithub: () => void;
  onLoadGithubRepos: () => void;
  onLoadGithubRepoContext: () => void;
  onLoadGithubPullRequestFiles: () => void;
  onLoadGithubWorkflowCatalog: () => void;
  onLoadGithubWorkflowRuns: () => void;
  onDispatchGithubWorkflow: () => void;
  onCreateGithubRepo: () => void;
  onSelectGithubRepo: (owner: string, repo: string) => void;
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
  const githubStatus = props.githubSession?.status || 'unauthenticated';
  const githubViewer = props.githubSession?.viewer;
  const githubSelectedRepo = props.githubSelectedRepo;
  const githubContextRepo = props.githubRepoContext?.repo || githubSelectedRepo;
  const githubContextBranches = (props.githubRepoContext?.branches ?? []) as GithubBranchSummary[];
  const githubContextPullRequests = (props.githubRepoContext?.pullRequests ?? []) as GithubPullRequestSummary[];
  const githubPullRequestScope = props.githubPullRequestFiles?.pullRequest as GithubPullRequestScopeSummary | undefined;
  const githubPullRequestFileRepo = props.githubPullRequestFiles?.repo || githubContextRepo;
  const githubPullRequestFileList = (props.githubPullRequestFiles?.files ?? []) as GithubPullRequestFileSummary[];
  const githubWorkflowCatalogRepo = props.githubWorkflowCatalog?.repo || githubContextRepo;
  const githubWorkflowList = (props.githubWorkflowCatalog?.workflows ?? []) as GithubWorkflowSummary[];
  const githubWorkflowRuns = (props.githubWorkflowRuns?.runs ?? []) as GithubWorkflowRunSummary[];
  const githubSelectedWorkflow = props.githubWorkflowRuns?.workflow || githubWorkflowList.find((workflow) => workflow.key === props.githubWorkflowKey);
  const githubCliLabel = props.githubSession?.cliInstalled ? 'installed' : 'missing';
  const githubAuthSource =
    props.githubSession?.authSource === 'env_token'
      ? 'env token'
      : props.githubSession?.authSource === 'gh_cli'
        ? 'gh cli'
        : 'none';

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

        <article className="sub-card">
          <p className="panel-caption">GitHub support plane</p>
          <h3>Auth and selected repo</h3>
          <div className="decision-meta">
            <span className={`decision-badge ${githubStatus === 'authenticated' ? 'good' : 'muted'}`}>
              GitHub: {githubStatus}
            </span>
            <span className={`decision-badge ${props.githubSession?.cliInstalled ? 'good' : 'bad'}`}>
              gh: {githubCliLabel}
            </span>
            <span className="decision-badge muted">Source: {githubAuthSource}</span>
          </div>
          <p><strong>Viewer:</strong> <span className="path-value">{githubViewer?.login || 'n/a'}</span></p>
          <p><strong>Name:</strong> <span className="path-value">{githubViewer?.name || 'n/a'}</span></p>
          <p><strong>Selected repo:</strong> <span className="path-value">{githubSelectedRepo?.fullName || 'n/a'}</span></p>
          <p><strong>Visibility:</strong> {githubSelectedRepo?.visibility || 'n/a'}</p>
          <p><strong>Default branch:</strong> <span className="path-value">{githubSelectedRepo?.defaultBranch || 'n/a'}</span></p>
          <p className="muted">
            Orgumented uses local <code>gh</code> for GitHub sign-in and keeps one explicit selected repo binding for future repo-backed workflows.
          </p>
          <div className="action-row">
            <button type="button" onClick={props.onRefreshGithubStatus} disabled={props.loading}>Refresh GitHub</button>
            <button type="button" onClick={props.onAuthorizeGithub} disabled={props.loading}>Authorize GitHub</button>
            <button type="button" className="ghost" onClick={props.onLoadGithubRepos} disabled={props.loading}>Load Repos</button>
          </div>
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

        <article className="sub-card" role="status" aria-live="polite">
          <p className="panel-caption">GitHub readiness</p>
          <h3>Issues and repo tools</h3>
          {props.githubIssues.length > 0 ? (
            <ul className="issue-list">
              {props.githubIssues.map((issue) => (
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
            <p className="muted">No current GitHub auth issues are recorded.</p>
          )}

          <div className="ops-grid compact-grid">
            <label>
              GitHub repo owner
              <input value={props.githubRepoOwner} onChange={(e) => props.setGithubRepoOwner(e.target.value)} placeholder="owner or org" />
            </label>
            <label>
              GitHub repo name
              <input value={props.githubRepoName} onChange={(e) => props.setGithubRepoName(e.target.value)} placeholder="orgumented-runtime" />
            </label>
          </div>
          <label>
            Description
            <input
              value={props.githubRepoDescription}
              onChange={(e) => props.setGithubRepoDescription(e.target.value)}
              placeholder="Optional repo description"
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={props.githubRepoPrivate}
              onChange={(e) => props.setGithubRepoPrivate(e.target.checked)}
            />
            Create as private repo
          </label>
          <div className="action-row">
            <button type="button" onClick={props.onCreateGithubRepo} disabled={props.loading}>Create Repo</button>
            <button type="button" className="ghost" onClick={props.onLoadGithubRepoContext} disabled={props.loading}>
              Load Repo Context
            </button>
            <button type="button" className="ghost" onClick={props.onLoadGithubWorkflowCatalog} disabled={props.loading}>
              Load Workflows
            </button>
          </div>
          <div className="ops-grid compact-grid">
            <label>
              Pull request number
              <input value={props.githubPullNumber} onChange={(e) => props.setGithubPullNumber(e.target.value)} placeholder="296" />
            </label>
          </div>
          <div className="action-row">
            <button type="button" className="ghost" onClick={props.onLoadGithubPullRequestFiles} disabled={props.loading}>
              Load PR Files
            </button>
          </div>
        </article>
      </div>

      <details className="debug-details">
        <summary>Advanced session tools</summary>
        <p className="muted">
          Use `Bridge CCI Alias` first. Expand this section only when you need explicit alias/session probes or the manual bridge fallback.
        </p>
        <div className="action-row">
          <button type="button" className="ghost" onClick={props.onLoadAliases} disabled={props.loading}>Load Aliases</button>
          <button type="button" className="ghost" onClick={props.onCheckSession} disabled={props.loading}>Check Session</button>
          <button type="button" className="ghost" onClick={props.onLoadSessionHistory} disabled={props.loading}>Session History</button>
          <button type="button" className="ghost" onClick={props.onCheckToolStatus} disabled={props.loading}>Check Tool Status</button>
          <button type="button" className="ghost" onClick={props.onPreflight} disabled={props.loading}>Preflight Selected</button>
          <button type="button" className="ghost" onClick={() => props.onBridgeAlias()} disabled={props.loading}>Bridge CCI Alias</button>
        </div>
        <pre className="diagnostic-code-block">{`# 1) Authenticate in sf keychain
sf org login web --alias ${props.orgAlias} --instance-url https://test.salesforce.com --set-default

# 2) Bridge alias into CCI registry
# run from the local Orgumented sf project path
cd "%APPDATA%\\Orgumented\\sf-project"
cci org import ${props.orgAlias} ${props.orgAlias}
cci org info ${props.orgAlias}`}</pre>
        <p><strong>Restore alias:</strong> <span className="path-value">{props.restoreAlias || props.orgSessionHistory?.restoreAlias || 'n/a'}</span></p>
      </details>

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

      {props.githubAccessibleRepos.length > 0 ? (
        <div className="sub-card">
          <p className="panel-caption">Accessible repos</p>
          <h3>Available GitHub bindings</h3>
          <ul className="ops-list">
            {props.githubAccessibleRepos.map((repo) => (
              <li key={repo.fullName} className="ops-list-item">
                <div>
                  <div className="decision-meta">
                    <span className={`decision-badge ${repo.selected ? 'good' : 'muted'}`}>
                      {repo.selected ? 'selected' : repo.visibility}
                    </span>
                    <span className="decision-badge muted">{repo.defaultBranch || 'no default branch'}</span>
                  </div>
                  <p><strong><span className="path-value">{repo.fullName}</span></strong></p>
                  <p>{repo.description || 'No description provided.'}</p>
                  <p><strong>URL:</strong> <span className="path-value">{repo.url || 'n/a'}</span></p>
                </div>
                <div className="ops-list-actions">
                  <button type="button" onClick={() => props.onSelectGithubRepo(repo.owner, repo.name)}>
                    Use Repo
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {githubContextRepo ? (
        <div className="sub-card" role="status" aria-live="polite">
          <p className="panel-caption">Selected repo context</p>
          <h3>Branches and open pull requests</h3>
          <div className="decision-meta">
            <span className="decision-badge muted">Repo: {githubContextRepo.fullName}</span>
            <span className="decision-badge muted">Branches: {githubContextBranches.length}</span>
            <span className="decision-badge muted">Open PRs: {githubContextPullRequests.length}</span>
          </div>
          <p><strong>Default branch:</strong> <span className="path-value">{githubContextRepo.defaultBranch || 'n/a'}</span></p>
          <p><strong>URL:</strong> <span className="path-value">{githubContextRepo.url || 'n/a'}</span></p>
          <p className="muted">
            This remains a read-only support-plane view. It is intended to scope future repo-backed workflows without changing local decision determinism.
          </p>

          {githubContextBranches.length > 0 ? (
            <>
              <p><strong>Recent branches</strong></p>
              <ul className="issue-list">
                {githubContextBranches.map((branch) => (
                  <li key={branch.name}>
                    <div className="decision-meta">
                      <span className={`decision-badge ${branch.protected ? 'good' : 'muted'}`}>
                        {branch.protected ? 'protected' : 'branch'}
                      </span>
                      {branch.lastCommitSha ? <span className="decision-badge muted">{branch.lastCommitSha.slice(0, 7)}</span> : null}
                    </div>
                    <p><strong><span className="path-value">{branch.name}</span></strong></p>
                    <p><strong>Last commit:</strong> <span className="path-value">{branch.lastCommitUrl || branch.url || 'n/a'}</span></p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">No branch context is loaded yet.</p>
          )}

          {githubContextPullRequests.length > 0 ? (
            <>
              <p><strong>Open pull requests</strong></p>
              <ul className="issue-list">
                {githubContextPullRequests.map((pullRequest) => (
                  <li key={pullRequest.number}>
                    <div className="decision-meta">
                      <span className={`decision-badge ${pullRequest.draft ? 'muted' : 'good'}`}>
                        {pullRequest.draft ? 'draft' : 'open'}
                      </span>
                      <span className="decision-badge muted">#{pullRequest.number}</span>
                      {pullRequest.baseRef ? <span className="decision-badge muted">{pullRequest.baseRef}</span> : null}
                    </div>
                    <p><strong><span className="path-value">{pullRequest.title}</span></strong></p>
                    <p><strong>Head:</strong> <span className="path-value">{pullRequest.headRef || 'n/a'}</span></p>
                    <p><strong>Author:</strong> <span className="path-value">{pullRequest.author || 'n/a'}</span></p>
                    <p><strong>Updated:</strong> <span className="path-value">{formatTimestamp(pullRequest.updatedAt)}</span></p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="muted">No open pull requests are loaded for the selected repo.</p>
          )}
        </div>
      ) : null}

      {githubWorkflowCatalogRepo && githubWorkflowList.length > 0 ? (
        <div className="sub-card" role="status" aria-live="polite">
          <p className="panel-caption">GitHub Actions</p>
          <h3>Allowlisted workflow dispatch</h3>
          <div className="decision-meta">
            <span className="decision-badge muted">Repo: {githubWorkflowCatalogRepo.fullName}</span>
            <span className="decision-badge muted">Allowlisted: {githubWorkflowList.length}</span>
            {githubSelectedWorkflow ? <span className="decision-badge muted">Selected: {githubSelectedWorkflow.name}</span> : null}
          </div>
          <p><strong>Default branch:</strong> <span className="path-value">{githubWorkflowCatalogRepo.defaultBranch || 'n/a'}</span></p>
          <p className="muted">
            This support-plane lane is allowlisted and typed. Orgumented can dispatch only the workflows explicitly exposed by the engine and can
            read back recent workflow-dispatch runs without widening local semantic execution.
          </p>
          <div className="ops-grid compact-grid">
            <label>
              Workflow
              <select value={props.githubWorkflowKey} onChange={(e) => props.setGithubWorkflowKey(e.target.value)}>
                {githubWorkflowList.map((workflow) => (
                  <option key={workflow.key} value={workflow.key}>
                    {workflow.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ref
              <input
                value={props.githubWorkflowRef}
                onChange={(e) => props.setGithubWorkflowRef(e.target.value)}
                placeholder={githubWorkflowCatalogRepo.defaultBranch || 'main'}
              />
            </label>
          </div>
          {githubSelectedWorkflow ? (
            <>
              <p><strong>Workflow file:</strong> <span className="path-value">{githubSelectedWorkflow.workflowFile}</span></p>
              <p>{githubSelectedWorkflow.description}</p>
            </>
          ) : null}
          <div className="action-row">
            <button type="button" onClick={props.onDispatchGithubWorkflow} disabled={props.loading}>
              Dispatch Workflow
            </button>
            <button type="button" className="ghost" onClick={props.onLoadGithubWorkflowRuns} disabled={props.loading}>
              Load Workflow Runs
            </button>
          </div>

          {githubWorkflowRuns.length > 0 ? (
            <ul className="issue-list">
              {githubWorkflowRuns.map((run) => (
                <li key={run.runId}>
                  <div className="decision-meta">
                    <span
                      className={`decision-badge ${
                        run.conclusion === 'success'
                          ? 'good'
                          : run.conclusion === 'failure' || run.conclusion === 'cancelled'
                            ? 'bad'
                            : 'muted'
                      }`}
                    >
                      {run.conclusion || run.status}
                    </span>
                    {run.runNumber ? <span className="decision-badge muted">run #{run.runNumber}</span> : null}
                    {run.event ? <span className="decision-badge muted">{run.event}</span> : null}
                  </div>
                  <p><strong><span className="path-value">{run.title || run.branch || `Run ${run.runId}`}</span></strong></p>
                  <p><strong>Branch:</strong> <span className="path-value">{run.branch || 'n/a'}</span></p>
                  <p><strong>Actor:</strong> <span className="path-value">{run.actor || 'n/a'}</span></p>
                  <p><strong>Updated:</strong> <span className="path-value">{formatTimestamp(run.updatedAt)}</span></p>
                  <p><strong>URL:</strong> <span className="path-value">{run.url || 'n/a'}</span></p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No recent workflow-dispatch runs are loaded for the selected allowlisted workflow.</p>
          )}
        </div>
      ) : null}

      {githubPullRequestScope && githubPullRequestFileRepo ? (
        <div className="sub-card" role="status" aria-live="polite">
          <p className="panel-caption">Pull request file scope</p>
          <h3>Changed files for review context</h3>
          <div className="decision-meta">
            <span className={`decision-badge ${githubPullRequestScope.draft ? 'muted' : 'good'}`}>
              {githubPullRequestScope.draft ? 'draft' : githubPullRequestScope.state}
            </span>
            <span className="decision-badge muted">#{githubPullRequestScope.number}</span>
            <span className="decision-badge muted">Files: {props.githubPullRequestFiles?.totalCount ?? githubPullRequestFileList.length}</span>
            {props.githubPullRequestFiles?.truncated ? <span className="decision-badge bad">truncated</span> : null}
          </div>
          <p><strong>Repo:</strong> <span className="path-value">{githubPullRequestFileRepo.fullName}</span></p>
          <p><strong>Title:</strong> <span className="path-value">{githubPullRequestScope.title}</span></p>
          <p><strong>Head:</strong> <span className="path-value">{githubPullRequestScope.headRef || 'n/a'}</span></p>
          <p><strong>Base:</strong> <span className="path-value">{githubPullRequestScope.baseRef || 'n/a'}</span></p>
          <p className="muted">
            This is file-path scope only. It is intended to ground later repo-backed review flows without pulling GitHub diff interpretation into the UI.
          </p>

          {githubPullRequestFileList.length > 0 ? (
            <ul className="issue-list">
              {githubPullRequestFileList.map((file) => (
                <li key={`${file.filename}-${file.status}`}>
                  <div className="decision-meta">
                    <span
                      className={`decision-badge ${
                        file.status === 'removed' ? 'bad' : file.status === 'renamed' ? 'muted' : 'good'
                      }`}
                    >
                      {file.status}
                    </span>
                    <span className="decision-badge muted">+{file.additions} / -{file.deletions}</span>
                    {file.patchTruncated ? <span className="decision-badge muted">metadata only</span> : null}
                  </div>
                  <p><strong><span className="path-value">{file.filename}</span></strong></p>
                  {file.previousFilename ? (
                    <p><strong>Previous path:</strong> <span className="path-value">{file.previousFilename}</span></p>
                  ) : null}
                  <p><strong>Blob URL:</strong> <span className="path-value">{file.blobUrl || file.rawUrl || 'n/a'}</span></p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No changed files are loaded for the selected pull request.</p>
          )}
        </div>
      ) : null}
    </>
  );
}
