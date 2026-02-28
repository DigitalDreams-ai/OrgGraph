'use client';

interface SystemWorkspaceProps {
  metaDryRun: boolean;
  setMetaDryRun: (value: boolean) => void;
  loading: boolean;
  onLoadMetaContext: () => void;
  onRunMetaAdapt: () => void;
  onLoadOrgStatus: () => void;
}

export function SystemWorkspace(props: SystemWorkspaceProps): JSX.Element {
  return (
    <>
      <h2>Settings &amp; Diagnostics</h2>
      <p className="section-lead">Operational context, adaptation dry-run, runtime health, and local diagnostics.</p>
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
    </>
  );
}
