'use client';

import type {
  MetadataCatalogPayload,
  MetadataMembersPayload,
  MetadataRetrieveResultView,
  MetadataSelection,
  MetadataSelectionSummary
} from './types';

interface BrowserWorkspaceProps {
  activeAlias: string;
  selectedAlias: string;
  metadataSearch: string;
  setMetadataSearch: (value: string) => void;
  metadataMemberSearch: string;
  setMetadataMemberSearch: (value: string) => void;
  metadataLimitRaw: string;
  setMetadataLimitRaw: (value: string) => void;
  metadataForceRefresh: boolean;
  setMetadataForceRefresh: (value: boolean) => void;
  metadataAutoRefresh: boolean;
  setMetadataAutoRefresh: (value: boolean) => void;
  metadataCatalog: MetadataCatalogPayload | null;
  metadataMembersByType: Record<string, MetadataMembersPayload>;
  metadataLoadingType: string;
  metadataSelectionsPreview: string;
  selectedMetadata: MetadataSelection[];
  selectionSummary: MetadataSelectionSummary;
  visibleCatalogTypes: string[];
  lastMetadataRetrieve: MetadataRetrieveResultView | null;
  loading: boolean;
  onAddVisibleTypes: () => void;
  onRefreshTypes: () => void;
  onClearFilters: () => void;
  onClearSelections: () => void;
  onLoadMembers: (type: string) => void;
  onToggleType: (type: string) => void;
  onToggleMember: (type: string, member: string) => void;
  onRemoveType: (type: string) => void;
  onRemoveMember: (type: string, member: string) => void;
  isTypeSelected: (type: string) => boolean;
  isMemberSelected: (type: string, member: string) => boolean;
  onRetrieveSelected: () => void;
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

export function BrowserWorkspace(props: BrowserWorkspaceProps): JSX.Element {
  return (
    <>
      <h2>Org Browser</h2>
      <p className="section-lead">Retrieve metadata from the active desktop session with a cart that stays visible as you move toward rebuild.</p>

      <div className="ops-grid">
        <article className="sub-card">
          <p className="panel-caption">Session handoff</p>
          <h3>Active retrieval context</h3>
          <div className="decision-meta">
            <span className="decision-badge good">Active alias: {props.activeAlias || 'n/a'}</span>
            <span className="decision-badge muted">Selected alias: {props.selectedAlias || 'n/a'}</span>
          </div>
          <p><strong>Catalog source:</strong> {props.metadataCatalog?.source || 'not loaded'}</p>
          <p><strong>Refreshed:</strong> {formatTimestamp(props.metadataCatalog?.refreshedAt)}</p>
          <p><strong>Total types:</strong> {props.metadataCatalog?.totalTypes ?? 0}</p>
        </article>

        <article className="sub-card">
          <p className="panel-caption">Retrieval cart</p>
          <h3>Selected metadata</h3>
          <div className="decision-meta">
            <span className="decision-badge muted">Types: {props.selectionSummary.typeCount}</span>
            <span className="decision-badge muted">Members: {props.selectionSummary.memberCount}</span>
            <span className="decision-badge muted">Visible types: {props.visibleCatalogTypes.length}</span>
            <span className={`decision-badge ${props.metadataAutoRefresh ? 'good' : 'muted'}`}>
              Auto refresh: {String(props.metadataAutoRefresh)}
            </span>
          </div>
          <p><strong>Force catalog refresh:</strong> {String(props.metadataForceRefresh)}</p>
          <p className="muted">Build the retrieve cart from the visible catalog, then continue to `Refresh & Build` for drift and snapshot review.</p>
        </article>
      </div>

      <div className="field-grid">
        <div>
          <label htmlFor="metadataSearch">Type Search</label>
          <input id="metadataSearch" value={props.metadataSearch} onChange={(e) => props.setMetadataSearch(e.target.value)} />
        </div>
        <div>
          <label htmlFor="metadataMemberSearch">Member Search</label>
          <input
            id="metadataMemberSearch"
            value={props.metadataMemberSearch}
            onChange={(e) => props.setMetadataMemberSearch(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="metadataLimit">Catalog Limit</label>
          <input id="metadataLimit" value={props.metadataLimitRaw} onChange={(e) => props.setMetadataLimitRaw(e.target.value)} />
        </div>
        <label className="check-row" htmlFor="forceRefresh">
          <input
            id="forceRefresh"
            type="checkbox"
            checked={props.metadataForceRefresh}
            onChange={(e) => props.setMetadataForceRefresh(e.target.checked)}
          />
          Force Refresh
        </label>
        <label className="check-row" htmlFor="metadataAutoRefresh">
          <input
            id="metadataAutoRefresh"
            type="checkbox"
            checked={props.metadataAutoRefresh}
            onChange={(e) => props.setMetadataAutoRefresh(e.target.checked)}
          />
          Auto Refresh After Retrieve
        </label>
      </div>

      <div className="action-row">
        <button type="button" onClick={props.onRefreshTypes} disabled={props.loading}>
          Refresh Types
        </button>
        <button type="button" onClick={props.onAddVisibleTypes} disabled={props.loading || props.visibleCatalogTypes.length === 0}>
          Add Visible Types
        </button>
        <button type="button" onClick={props.onRetrieveSelected} disabled={props.loading || props.selectionSummary.typeCount === 0}>
          Retrieve Selected
        </button>
        <button type="button" className="ghost" onClick={props.onOpenRefresh}>
          Open Refresh &amp; Build
        </button>
        <button type="button" className="ghost" onClick={props.onClearFilters}>
          Clear Filters
        </button>
        <button type="button" className="ghost" onClick={props.onClearSelections} disabled={props.selectionSummary.typeCount === 0}>
          Clear Cart
        </button>
      </div>

      <div className="org-browser-frame">
        {(props.metadataCatalog?.types || []).map((typeRow) => {
          const membersPayload = props.metadataMembersByType[typeRow.type];
          const members = membersPayload?.members || [];
          return (
            <details key={typeRow.type}>
              <summary>
                <span>{typeRow.type}</span>
                <span>{typeRow.memberCount}</span>
              </summary>
              <div className="type-actions">
                <button
                  type="button"
                  onClick={() => props.onLoadMembers(typeRow.type)}
                  disabled={props.loading || props.metadataLoadingType === typeRow.type}
                >
                  {props.metadataLoadingType === typeRow.type ? 'Loading...' : 'Load Members'}
                </button>
                <button type="button" className="ghost" onClick={() => props.onToggleType(typeRow.type)}>
                  {props.isTypeSelected(typeRow.type) ? 'Remove Type' : 'Add Type'}
                </button>
              </div>
              {members.length > 0 ? (
                <ul className="member-list">
                  {members.map((member) => (
                    <li key={`${typeRow.type}:${member.name}`}>
                      <span>{member.name}</span>
                      <button type="button" className="ghost" onClick={() => props.onToggleMember(typeRow.type, member.name)}>
                        {props.isMemberSelected(typeRow.type, member.name) ? 'Remove' : 'Add'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No members loaded.</p>
              )}
            </details>
          );
        })}
      </div>

      <div className="ops-grid">
        <article className="sub-card">
          <p className="panel-caption">Structured cart</p>
          <h3>Selected metadata</h3>
          {props.selectedMetadata.length > 0 ? (
            <ul className="selection-list">
              {props.selectedMetadata.map((selection) => (
                <li key={selection.type} className="selection-item">
                  <div className="ops-list-item">
                    <div>
                      <strong>{selection.type}</strong>
                      <p>
                        {selection.members && selection.members.length > 0
                          ? `${selection.members.length} member selection${selection.members.length === 1 ? '' : 's'}`
                          : 'Whole type selected'}
                      </p>
                    </div>
                    <div className="ops-list-actions">
                      <button type="button" className="ghost" onClick={() => props.onRemoveType(selection.type)}>
                        Remove Type
                      </button>
                    </div>
                  </div>
                  {selection.members && selection.members.length > 0 ? (
                    <div className="selection-members">
                      {selection.members.map((member) => (
                        <button
                          key={`${selection.type}:${member}`}
                          type="button"
                          className="ghost chip-btn"
                          onClick={() => props.onRemoveMember(selection.type, member)}
                        >
                          {member} ×
                        </button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Add visible types or individual members from the catalog to build the retrieve cart.</p>
          )}

          <details className="advanced-block">
            <summary>Advanced JSON preview</summary>
            <textarea rows={8} value={props.metadataSelectionsPreview} readOnly />
          </details>
        </article>

        <article className="sub-card">
          <p className="panel-caption">Last retrieve</p>
          <h3>Structured handoff to rebuild</h3>
          {props.lastMetadataRetrieve ? (
            <>
              <div className="decision-meta">
                <span className="decision-badge good">Status: {props.lastMetadataRetrieve.status}</span>
                <span className={`decision-badge ${props.lastMetadataRetrieve.autoRefresh ? 'good' : 'muted'}`}>
                  Auto refresh: {String(props.lastMetadataRetrieve.autoRefresh)}
                </span>
              </div>
              <p><strong>Alias:</strong> {props.lastMetadataRetrieve.alias}</p>
              <p><strong>Completed:</strong> {formatTimestamp(props.lastMetadataRetrieve.completedAt)}</p>
              <p><strong>Parse path:</strong> {props.lastMetadataRetrieve.parsePath}</p>
              <p><strong>Metadata args:</strong> {props.lastMetadataRetrieve.metadataArgs.join(' ') || 'n/a'}</p>
              {props.lastMetadataRetrieve.refresh ? (
                <p>
                  <strong>Refresh counts:</strong> {props.lastMetadataRetrieve.refresh.nodeCount} nodes,{' '}
                  {props.lastMetadataRetrieve.refresh.edgeCount} edges, {props.lastMetadataRetrieve.refresh.evidenceCount} evidence
                </p>
              ) : (
                <p className="muted">No refresh summary was returned with the retrieve response.</p>
              )}
            </>
          ) : (
            <p className="muted">Run a metadata retrieve to capture a structured handoff into `Refresh & Build`.</p>
          )}
        </article>
      </div>
    </>
  );
}
