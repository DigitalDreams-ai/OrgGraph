'use client';

import type {
  OrgPreflightPayload,
  OrgSessionAliasesPayload,
  OrgSessionPayload,
  OrgStatusPayload
} from './types';

interface ConnectWorkspaceProps {
  orgAlias: string;
  setOrgAlias: (value: string) => void;
  orgStatus: OrgStatusPayload | null;
  orgPreflight: OrgPreflightPayload | null;
  orgAliases: OrgSessionAliasesPayload | null;
  orgSession: OrgSessionPayload | null;
  loading: boolean;
  onLoadAliases: () => void;
  onCheckSession: () => void;
  onCheckToolStatus: () => void;
  onPreflight: () => void;
  onSwitchAlias: () => void;
  onConnectExistingAlias: () => void;
  onDisconnect: () => void;
  onInspectAlias: (alias: string) => void;
}

export function ConnectWorkspace(props: ConnectWorkspaceProps): JSX.Element {
  return (
    <>
      <h2>Org Sessions</h2>
      <p className="section-lead">
        Login uses Salesforce CLI keychain first, then CCI registry import for deterministic org tooling.
      </p>

      <div className="sub-card">
        <h3>Runtime Commands</h3>
        <pre>{`# 1) Authenticate in sf keychain
sf org login web --alias ${props.orgAlias} --instance-url https://test.salesforce.com --set-default

# 2) Bridge alias into CCI registry
cci org import ${props.orgAlias} <sf-username>`}</pre>
      </div>

      <label htmlFor="orgAlias">Org Alias</label>
      <input id="orgAlias" value={props.orgAlias} onChange={(e) => props.setOrgAlias(e.target.value)} />

      <div className="field-grid">
        <div className="sub-card">
          <h3>sf CLI</h3>
          <p><strong>Installed:</strong> {props.orgStatus?.sf?.installed ? 'yes' : 'no'}</p>
          <p>{props.orgStatus?.sf?.message || 'Run Check Tool Status'}</p>
        </div>
        <div className="sub-card">
          <h3>CCI</h3>
          <p><strong>Installed:</strong> {props.orgStatus?.cci?.installed ? 'yes' : 'no'}</p>
          <p><strong>Version:</strong> {props.orgStatus?.cci?.version || 'n/a'}</p>
          <p>{props.orgStatus?.cci?.message || 'Run Check Tool Status'}</p>
        </div>
        <div className="sub-card">
          <h3>Preflight</h3>
          <p><strong>Alias Authenticated:</strong> {props.orgPreflight?.checks?.aliasAuthenticated ? 'yes' : 'no'}</p>
          <p><strong>CCI Alias Available:</strong> {props.orgPreflight?.checks?.cciAliasAvailable ? 'yes' : 'no'}</p>
        </div>
        <div className="sub-card">
          <h3>Alias Inventory</h3>
          <p><strong>Loaded:</strong> {props.orgAliases?.aliases?.length ?? 0}</p>
          <p><strong>Active:</strong> {props.orgAliases?.activeAlias || props.orgSession?.activeAlias || props.orgAlias}</p>
        </div>
      </div>

      <div className="action-row">
        <button type="button" onClick={props.onLoadAliases} disabled={props.loading}>Load Aliases</button>
        <button type="button" onClick={props.onCheckSession} disabled={props.loading}>Check Session</button>
        <button type="button" onClick={props.onCheckToolStatus} disabled={props.loading}>Check Tool Status</button>
        <button type="button" onClick={props.onPreflight} disabled={props.loading}>Preflight</button>
        <button type="button" onClick={props.onSwitchAlias} disabled={props.loading}>Switch Alias</button>
        <button type="button" onClick={props.onConnectExistingAlias} disabled={props.loading}>Connect Existing Alias</button>
        <button type="button" className="ghost" onClick={props.onDisconnect} disabled={props.loading}>Disconnect</button>
      </div>

      {props.orgAliases?.aliases && props.orgAliases.aliases.length > 0 ? (
        <div className="sub-card">
          <h3>Discovered Aliases</h3>
          <ul className="member-list">
            {props.orgAliases.aliases.map((entry) => (
              <li key={entry.alias}>
                <span>
                  <strong>{entry.alias}</strong>
                  {entry.isDefault ? ' default' : ''}
                  {entry.username ? ` | ${entry.username}` : ''}
                </span>
                <button type="button" className="ghost" onClick={() => props.onInspectAlias(entry.alias)}>
                  Inspect
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
