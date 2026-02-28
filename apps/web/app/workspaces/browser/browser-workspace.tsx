'use client';

import type {
  MetadataCatalogPayload,
  MetadataMembersPayload,
  MetadataSelection
} from './types';

interface BrowserWorkspaceProps {
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
  metadataSelectionsRaw: string;
  setMetadataSelectionsRaw: (value: string) => void;
  loading: boolean;
  onRefreshTypes: () => void;
  onClearFilters: () => void;
  onLoadMembers: (type: string) => void;
  onToggleType: (type: string) => void;
  onToggleMember: (type: string, member: string) => void;
  isTypeSelected: (type: string) => boolean;
  isMemberSelected: (type: string, member: string) => boolean;
  onRetrieveSelected: () => void;
}

export function BrowserWorkspace(props: BrowserWorkspaceProps): JSX.Element {
  return (
    <>
      <h2>Org Browser</h2>
      <p className="section-lead">Org-wide selective metadata retrieval with searchable type/member navigation.</p>

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
        <button type="button" className="ghost" onClick={props.onClearFilters}>
          Clear Filters
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

      <h3>Retrieval Cart</h3>
      <textarea
        rows={8}
        value={props.metadataSelectionsRaw}
        onChange={(e) => props.setMetadataSelectionsRaw(e.target.value)}
        placeholder='[{"type":"CustomObject","members":["Account"]}]'
      />
      <div className="action-row">
        <button type="button" onClick={props.onRetrieveSelected} disabled={props.loading}>
          Retrieve Selected
        </button>
      </div>
    </>
  );
}
