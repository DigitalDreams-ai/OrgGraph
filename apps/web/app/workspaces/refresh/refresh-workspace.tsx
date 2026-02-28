'use client';

interface RefreshWorkspaceProps {
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
  loading: boolean;
  onRunRefresh: () => void;
  onRunDiff: () => void;
  onRunOrgRetrieve: () => void;
}

export function RefreshWorkspace(props: RefreshWorkspaceProps): JSX.Element {
  return (
    <>
      <h2>Refresh &amp; Build</h2>
      <p className="section-lead">Rebuild semantic state and compare snapshot drift with deterministic outputs.</p>

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
        <button type="button" onClick={props.onRunRefresh} disabled={props.loading}>
          Run Refresh
        </button>
      </div>

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
        <button type="button" onClick={props.onRunDiff} disabled={props.loading}>
          Run Diff
        </button>
      </div>

      <h3>Org Retrieve Pipeline</h3>
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
        <button type="button" onClick={props.onRunOrgRetrieve} disabled={props.loading}>
          Run Org Retrieve
        </button>
      </div>
    </>
  );
}
