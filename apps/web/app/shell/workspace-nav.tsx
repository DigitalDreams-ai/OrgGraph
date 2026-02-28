export type WorkspaceTab = 'ask' | 'connect' | 'browser' | 'refresh' | 'analyze' | 'proofs' | 'system';

const PRIMARY_TABS: Array<[WorkspaceTab, string, string]> = [
  ['ask', 'Ask', 'Decision packets, trust, and follow-up actions.'],
  ['connect', 'Org Sessions', 'Local Salesforce sessions backed by sf and cci.'],
  ['browser', 'Org Browser', 'Browse metadata types and retrieve selected members.'],
  ['refresh', 'Refresh & Build', 'Refresh semantic state and compare snapshot drift.'],
  ['analyze', 'Explain & Analyze', 'Readable analysis cards for permissions and automation.'],
  ['proofs', 'Proofs & History', 'Replay, inspect, and export proof artifacts.'],
  ['system', 'Settings & Diagnostics', 'Runtime health, tool versions, and diagnostics.']
];

type WorkspaceNavProps = {
  uiTab: WorkspaceTab;
  setUiTab: (tab: WorkspaceTab) => void;
};

export function WorkspaceNav(props: WorkspaceNavProps): JSX.Element {
  return (
    <aside className="left-nav panel">
      <h2>Workspace</h2>
      <nav className="tab-stack" role="tablist" aria-label="Primary navigation tabs">
        {PRIMARY_TABS.map(([id, label, caption]) => (
          <button
            key={id}
            role="tab"
            aria-selected={props.uiTab === id}
            type="button"
            className={props.uiTab === id ? 'tab-btn active' : 'tab-btn'}
            onClick={() => props.setUiTab(id)}
          >
            <span>{label}</span>
            <small>{caption}</small>
          </button>
        ))}
      </nav>

      <div className="hint-card">
        <h3>Launch Rule</h3>
        <p>Ask stays first. JSON and low-level payloads are still available, but only as secondary inspection surfaces.</p>
      </div>
    </aside>
  );
}
