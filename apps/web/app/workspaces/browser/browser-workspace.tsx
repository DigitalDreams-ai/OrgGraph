'use client';

import type {
  MetadataCatalogPayload,
  MetadataMembersPayload,
  MetadataRetrieveResultView,
  MetadataSearchResult,
  MetadataSelection,
  MetadataSelectionSummary
} from './types';
import { assessRetrieveHandoff } from './retrieve-handoff';

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
  metadataSearchResults: MetadataSearchResult[];
  metadataMembersByType: Record<string, MetadataMembersPayload>;
  metadataLoadingType: string;
  metadataSelectionsPreview: string;
  selectedMetadata: MetadataSelection[];
  selectionSummary: MetadataSelectionSummary;
  visibleCatalogTypes: string[];
  lastMetadataRetrieve: MetadataRetrieveResultView | null;
  metadataCatalogRequested: boolean;
  loading: boolean;
  onRefreshTypes: () => void;
  onClearFilters: () => void;
  onClearSelections: () => void;
  onLoadMembers: (type: string) => void;
  getTypeSelectionState: (type: string) => 'none' | 'partial' | 'all';
  isMemberSelected: (type: string, member: string) => boolean;
  onSetTypeSelected: (type: string, selected: boolean) => void;
  onSetMemberSelected: (type: string, member: string, selected: boolean) => void;
  onRemoveType: (type: string) => void;
  onRemoveMember: (type: string, member: string) => void;
  onRetrieveSelected: () => void;
  onOpenRefresh: () => void;
}

interface SelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  hint?: string;
  onChange: (checked: boolean) => void;
}

function SelectionCheckbox(props: SelectionCheckboxProps): JSX.Element {
  return (
    <label className={`selection-toggle ${props.disabled ? 'is-disabled' : ''}`}>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        ref={(element) => {
          if (element) {
            element.indeterminate = Boolean(props.indeterminate);
          }
        }}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span className="selection-toggle-copy">
        <strong>{props.label}</strong>
        {props.hint ? <small>{props.hint}</small> : null}
      </span>
    </label>
  );
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

function groupSearchResults(results: MetadataSearchResult[]): Array<{
  type: string;
  results: MetadataSearchResult[];
}> {
  const groups = new Map<string, MetadataSearchResult[]>();

  for (const result of results) {
    const current = groups.get(result.type) ?? [];
    current.push(result);
    groups.set(result.type, current);
  }

  return Array.from(groups.entries())
    .map(([type, groupedResults]) => ({
      type,
      results: groupedResults.sort((left, right) => {
        if (left.kind !== right.kind) {
          return left.kind === 'type' ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      })
    }))
    .sort((left, right) => left.type.localeCompare(right.type));
}

export function BrowserWorkspace(props: BrowserWorkspaceProps): JSX.Element {
  const retrieveHandoff = assessRetrieveHandoff(props.lastMetadataRetrieve);
  const groupedSearchResults = groupSearchResults(props.metadataSearchResults);

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
          <label htmlFor="metadataSearch">Search Org Files And Metadata</label>
          <input
            id="metadataSearch"
            placeholder="Opportunity, Opportunity Layout, class name, tab, flow..."
            value={props.metadataSearch}
            onChange={(e) => props.setMetadataSearch(e.target.value)}
          />
          <p className="muted input-hint">Search by the item you know first. Results are grouped by metadata family and every row can be selected with a checkbox.</p>
        </div>
        <div>
          <label htmlFor="metadataMemberSearch">Filter Loaded Members</label>
          <input
            id="metadataMemberSearch"
            placeholder="Filter members inside a loaded type"
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
          {props.metadataSearch.trim().length > 0 ? 'Search Metadata' : 'Load Explorer'}
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

      {props.metadataSearch.trim().length > 0 ? (
        <article className="sub-card">
          <p className="panel-caption">Explorer search</p>
          <h3>Matching metadata items</h3>
          <p className="muted">
            Search by the actual item name first. Results are grouped by metadata family so you can browse nearby matches instead of thinking in type-first API terms.
          </p>
          {groupedSearchResults.length > 0 ? (
            <div className="org-browser-frame org-browser-frame-search">
              {groupedSearchResults.map((group) => (
                <details key={group.type} open>
                  <summary>
                    <SelectionCheckbox
                      checked={props.getTypeSelectionState(group.type) === 'all'}
                      indeterminate={props.getTypeSelectionState(group.type) === 'partial'}
                      label={group.type}
                      hint={`${group.results.length} match${group.results.length === 1 ? '' : 'es'}`}
                      onChange={(checked) => props.onSetTypeSelected(group.type, checked)}
                    />
                    <span>{group.results.length} match{group.results.length === 1 ? '' : 'es'}</span>
                  </summary>
                  <div className="type-actions">
                    <button type="button" onClick={() => props.onLoadMembers(group.type)}>
                      Load Family
                    </button>
                  </div>
                  <ul className="member-list explorer-list">
                    {group.results.map((result) => (
                      <li key={`${result.kind}:${result.type}:${result.name}`} className="explorer-item">
                        <SelectionCheckbox
                          checked={result.kind === 'member' ? props.isMemberSelected(result.type, result.name) : props.getTypeSelectionState(result.type) === 'all'}
                          disabled={result.kind === 'member' && props.getTypeSelectionState(result.type) === 'all'}
                          label={result.name}
                          hint={`${group.type} • matched ${result.matchField}`}
                          onChange={(checked) =>
                            result.kind === 'member'
                              ? props.onSetMemberSelected(result.type, result.name, checked)
                              : props.onSetTypeSelected(result.type, checked)
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          ) : (
            <p className="muted">No metadata names matched this search yet. Try a broader item name like `Opportunity`, `layout`, or an Apex class name.</p>
          )}
        </article>
      ) : null}

      <p className="panel-caption">Browse by metadata family</p>
      <div className="org-browser-frame">
        {(props.metadataCatalog?.types || []).map((typeRow) => {
          const membersPayload = props.metadataMembersByType[typeRow.type];
          const members = membersPayload?.members || [];
          const typeSelectionState = props.getTypeSelectionState(typeRow.type);
          return (
            <details key={typeRow.type}>
              <summary>
                <SelectionCheckbox
                  checked={typeSelectionState === 'all'}
                  indeterminate={typeSelectionState === 'partial'}
                  label={typeRow.type}
                  hint={`${typeRow.memberCount} discoverable item${typeRow.memberCount === 1 ? '' : 's'}`}
                  onChange={(checked) => props.onSetTypeSelected(typeRow.type, checked)}
                />
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
              </div>
              {members.length > 0 ? (
                <ul className="member-list">
                  {members.map((member) => (
                    <li key={`${typeRow.type}:${member.name}`}>
                      <SelectionCheckbox
                        checked={props.isMemberSelected(typeRow.type, member.name)}
                        disabled={typeSelectionState === 'all'}
                        label={member.name}
                        hint={typeSelectionState === 'all' ? 'included via family selection' : 'select this single item'}
                        onChange={(checked) => props.onSetMemberSelected(typeRow.type, member.name, checked)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No members loaded.</p>
              )}
            </details>
          );
        })}
        {props.metadataCatalogRequested && (props.metadataCatalog?.types || []).length === 0 ? (
          <p className="muted">No metadata families were returned yet. Try `Load Explorer` again with `Force Refresh` enabled.</p>
        ) : null}
        {!props.metadataCatalogRequested ? (
          <p className="muted">Click `Load Explorer` to browse live org metadata families before retrieving anything.</p>
        ) : null}
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
            <p className="muted">Check families or individual items from search and browse results to build the retrieve cart.</p>
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
                <span className={`decision-badge ${retrieveHandoff.state === 'ready' ? 'good' : 'bad'}`}>
                  Handoff: {retrieveHandoff.state === 'ready' ? 'ready' : 'blocked'}
                </span>
                <span className={`decision-badge ${props.lastMetadataRetrieve.autoRefresh ? 'good' : 'muted'}`}>
                  Auto refresh: {String(props.lastMetadataRetrieve.autoRefresh)}
                </span>
              </div>
              <p><strong>Alias:</strong> {props.lastMetadataRetrieve.alias}</p>
              <p><strong>Completed:</strong> {formatTimestamp(props.lastMetadataRetrieve.completedAt)}</p>
              <p><strong>Parse path:</strong> {props.lastMetadataRetrieve.parsePath}</p>
              <p><strong>Metadata args:</strong> {props.lastMetadataRetrieve.metadataArgs.join(' ') || 'n/a'}</p>
              {retrieveHandoff.state === 'blocked' ? (
                <ul className="issue-list">
                  {retrieveHandoff.reasons.map((reason) => (
                    <li key={reason}>
                      <strong>Retrieve handoff blocked.</strong> {reason}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">This retrieve is ready to seed `Refresh & Build` without opening raw JSON.</p>
              )}
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
