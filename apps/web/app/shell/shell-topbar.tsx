'use client';

interface ShellTopbarProps {
  loading: boolean;
  onRefreshStatus: () => void;
  onRunPreflight: () => void;
  onConnectOrg: () => void;
}

export function ShellTopbar(props: ShellTopbarProps): JSX.Element {
  return (
    <header className="og-topbar">
      <div className="brand-block">
        <p className="brand-kicker">Deterministic Semantic Runtime</p>
        <h1>Orgumented Desktop</h1>
        <p className="brand-sub">Ask-first architecture operations with a local desktop shell, trusted evidence, and replayable proof.</p>
      </div>
      <div className="topbar-actions">
        <button type="button" onClick={props.onRefreshStatus} disabled={props.loading}>Refresh Status</button>
        <button type="button" onClick={props.onRunPreflight} disabled={props.loading}>Preflight</button>
        <button type="button" onClick={props.onConnectOrg} disabled={props.loading}>Connect Org</button>
      </div>
    </header>
  );
}
