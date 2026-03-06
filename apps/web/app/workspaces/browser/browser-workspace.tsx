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
  metadataWarnings: string[];
  metadataSelectionsPreview: string;
  selectedMetadata: MetadataSelection[];
  selectionSummary: MetadataSelectionSummary;
  visibleCatalogTypes: string[];
  lastMetadataRetrieve: MetadataRetrieveResultView | null;
  metadataCatalogRequested: boolean;
  loading: boolean;
  onRefreshTypes: () => void;
  onRefreshExplorer: () => void;
  onLoadVisibleMembers: () => void;
  onClearFilters: () => void;
  onClearSelections: () => void;
  onLoadMembers: (type: string) => void;
  getTypeSelectionState: (type: string) => 'none' | 'partial' | 'all';
  isMemberSelected: (type: string, member: string) => boolean;
  onSetTypeSelected: (type: string, selected: boolean) => void;
  onSetMemberSelected: (type: string, member: string, selected: boolean) => void;
  onSetMembersSelected: (type: string, members: string[], selected: boolean) => void;
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

interface MemberTreeNode {
  key: string;
  label: string;
  memberNames: string[];
  children: MemberTreeNode[];
  isLeaf: boolean;
}

interface MutableMemberTreeNode {
  key: string;
  label: string;
  memberNames: Set<string>;
  children: Map<string, MutableMemberTreeNode>;
  isLeaf: boolean;
}

function splitMemberPath(member: string): string[] {
  if (member.includes('/')) {
    return member.split('/').filter((part) => part.length > 0);
  }
  if (member.includes('.')) {
    return member.split('.').filter((part) => part.length > 0);
  }
  return [member];
}

function buildMemberTree(memberNames: string[]): MemberTreeNode[] {
  const root = new Map<string, MutableMemberTreeNode>();

  for (const memberName of memberNames) {
    const segments = splitMemberPath(memberName);
    if (segments.length === 0) {
      continue;
    }
    let current = root;
    const pathParts: string[] = [];
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      pathParts.push(segment);
      const nodeKey = pathParts.join('/');
      let node = current.get(segment);
      if (!node) {
        node = {
          key: nodeKey,
          label: segment,
          memberNames: new Set<string>(),
          children: new Map<string, MutableMemberTreeNode>(),
          isLeaf: false
        };
        current.set(segment, node);
      }
      node.memberNames.add(memberName);
      if (index === segments.length - 1) {
        node.isLeaf = true;
      }
      current = node.children;
    }
  }

  const finalize = (nodes: Map<string, MutableMemberTreeNode>): MemberTreeNode[] =>
    Array.from(nodes.values())
      .sort((left, right) => left.label.localeCompare(right.label))
      .map((node) => ({
        key: node.key,
        label: node.label,
        memberNames: Array.from(node.memberNames).sort((left, right) => left.localeCompare(right)),
        children: finalize(node.children),
        isLeaf: node.isLeaf
      }));

  return finalize(root);
}

export function BrowserWorkspace(props: BrowserWorkspaceProps): JSX.Element {
  const expectedAlias = props.activeAlias || props.selectedAlias;
  const retrieveHandoff = assessRetrieveHandoff(props.lastMetadataRetrieve, expectedAlias);
  const groupedSearchResults = groupSearchResults(props.metadataSearchResults);
  const nodeSelectionState = (
    type: string,
    memberNames: string[]
  ): 'none' | 'partial' | 'all' => {
    if (memberNames.length === 0) {
      return 'none';
    }
    const selectedCount = memberNames.reduce(
      (total, memberName) => total + (props.isMemberSelected(type, memberName) ? 1 : 0),
      0
    );
    if (selectedCount === 0) {
      return 'none';
    }
    if (selectedCount === memberNames.length) {
      return 'all';
    }
    return 'partial';
  };
  const renderMemberTreeNodes = (
    type: string,
    nodes: MemberTreeNode[],
    typeSelectionState: 'none' | 'partial' | 'all'
  ): JSX.Element[] =>
    nodes.map((node) => {
      const selectionState = nodeSelectionState(type, node.memberNames);
      return (
        <li key={`${type}:${node.key}`}>
          <SelectionCheckbox
            checked={selectionState === 'all'}
            indeterminate={selectionState === 'partial'}
            disabled={typeSelectionState === 'all'}
            label={node.label}
            hint={
              typeSelectionState === 'all'
                ? 'included via family selection'
                : node.isLeaf
                  ? 'select this single item'
                  : `${node.memberNames.length} nested item(s) • check to include this folder`
            }
            onChange={(checked) =>
              node.isLeaf && node.memberNames.length === 1
                ? props.onSetMemberSelected(type, node.memberNames[0], checked)
                : props.onSetMembersSelected(type, node.memberNames, checked)
            }
          />
          {node.children.length > 0 ? (
            <ul className="member-list member-tree-children">
              {renderMemberTreeNodes(type, node.children, typeSelectionState)}
            </ul>
          ) : null}
        </li>
      );
    });

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
            <span className="decision-badge muted">Families: {props.selectionSummary.typeCount}</span>
            <span className="decision-badge muted">Items: {props.selectionSummary.memberCount}</span>
            <span className="decision-badge muted">Visible families: {props.visibleCatalogTypes.length}</span>
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
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                props.onRefreshTypes();
              }
            }}
          />
          <p className="muted input-hint">Search by the item you know first. Press Enter or click Search to load matches grouped by metadata family.</p>
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
        <button
          type="button"
          onClick={props.onRefreshTypes}
          disabled={props.loading || props.metadataSearch.trim().length === 0}
        >
          Search
        </button>
        <button
          type="button"
          className="ghost"
          onClick={props.onRefreshExplorer}
          disabled={props.loading}
        >
          Browse All
        </button>
        <button
          type="button"
          className="ghost"
          onClick={props.onLoadVisibleMembers}
          disabled={props.loading || props.visibleCatalogTypes.length === 0}
        >
          Load Visible Items
        </button>
        <button type="button" onClick={props.onRetrieveSelected} disabled={props.loading || props.selectionSummary.typeCount === 0}>
          Retrieve Cart
        </button>
        <button type="button" className="ghost" onClick={props.onOpenRefresh}>
          Open Refresh &amp; Build
        </button>
        <button type="button" className="ghost" onClick={props.onClearFilters}>
          Clear Filters
        </button>
        <button type="button" className="ghost" onClick={props.onClearSelections} disabled={props.selectionSummary.typeCount === 0}>
          Clear Selection
        </button>
      </div>
      <article className="sub-card">
        <p className="panel-caption">Quick workflow</p>
        <ol className="workflow-step-list">
          <li>Search by name or click Browse All to load every family.</li>
          <li>Check any row you want in the retrieve cart (family, folder, or single item).</li>
          <li>Run <strong>Retrieve Cart</strong>, then continue in <strong>Refresh &amp; Build</strong>.</li>
        </ol>
      </article>
      <p className="muted"><strong>Cart rule:</strong> every checked row is already in the cart.</p>
      <p className="muted">Check a family to include everything nested under it. Check an individual item to include only that item.</p>
      <p className="muted">Use <strong>Load Visible Items</strong> to preload member trees for the visible families without opening each one manually.</p>
      {props.metadataWarnings.length > 0 ? (
        <article className="sub-card">
          <p className="panel-caption">Discovery warnings</p>
          <h3>Why results may be incomplete</h3>
          <ul className="citation-list">
            {props.metadataWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </article>
      ) : null}

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
                      hint={`${group.results.length} match${group.results.length === 1 ? '' : 'es'} • check to include this family`}
                      onChange={(checked) => props.onSetTypeSelected(group.type, checked)}
                    />
                    <span>{group.results.length} match{group.results.length === 1 ? '' : 'es'}</span>
                  </summary>
                  <ul className="member-list explorer-list">
                    {group.results.map((result) => (
                      <li key={`${result.kind}:${result.type}:${result.name}`} className="explorer-item">
                        <SelectionCheckbox
                          checked={result.kind === 'member' ? props.isMemberSelected(result.type, result.name) : props.getTypeSelectionState(result.type) === 'all'}
                          disabled={result.kind === 'member' && props.getTypeSelectionState(result.type) === 'all'}
                          label={result.name}
                          hint={
                            result.kind === 'member'
                              ? `${group.type} • matched ${result.matchField} • check for only this item`
                              : `${group.type} • check to include all nested items`
                          }
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
            <div>
              <p className="muted">No metadata names matched this search yet. Try `Opportunity`, `layout`, a field API name, or an Apex class name.</p>
              <div className="action-row">
                <button type="button" className="ghost" onClick={props.onRefreshExplorer} disabled={props.loading}>
                  Browse All Families
                </button>
              </div>
            </div>
          )}
        </article>
      ) : null}

      <p className="panel-caption">Browse by metadata family</p>
      <div className="org-browser-frame">
        {(props.metadataCatalog?.types || []).map((typeRow) => {
          const membersPayload = props.metadataMembersByType[typeRow.type];
          const members = membersPayload?.members || [];
          const memberTree = buildMemberTree(members.map((member) => member.name));
          const typeSelectionState = props.getTypeSelectionState(typeRow.type);
          const membersLoaded = Boolean(membersPayload);
          const shouldAutoLoadMembers = typeRow.memberCount > 0 && !membersLoaded && props.metadataLoadingType !== typeRow.type && !props.loading;
          return (
            <details
              key={typeRow.type}
              onToggle={(event) => {
                const detailsElement = event.currentTarget;
                if (detailsElement.open && shouldAutoLoadMembers) {
                  props.onLoadMembers(typeRow.type);
                }
              }}
            >
              <summary>
                <SelectionCheckbox
                  checked={typeSelectionState === 'all'}
                  indeterminate={typeSelectionState === 'partial'}
                  label={typeRow.type}
                  hint={`${typeRow.memberCount} discoverable item${typeRow.memberCount === 1 ? '' : 's'} • check to include this family`}
                  onChange={(checked) => props.onSetTypeSelected(typeRow.type, checked)}
                />
                <span>{typeRow.memberCount}</span>
              </summary>
              {props.metadataLoadingType === typeRow.type ? <p className="muted">Loading family items...</p> : null}
              {members.length > 0 ? (
                <ul className="member-list member-tree-root">
                  {renderMemberTreeNodes(typeRow.type, memberTree, typeSelectionState)}
                </ul>
              ) : membersLoaded ? (
                <p className="muted">No members returned for this family.</p>
              ) : (
                <p className="muted">Expand this family to load nested items.</p>
              )}
            </details>
          );
        })}
        {props.metadataCatalogRequested && (props.metadataCatalog?.types || []).length === 0 ? (
          <p className="muted">No metadata families were returned yet. Try `Browse All` again with `Force Refresh` enabled.</p>
        ) : null}
        {!props.metadataCatalogRequested ? (
          <p className="muted">Click `Browse All` to load live metadata families before retrieving anything.</p>
        ) : null}
      </div>

      <div className="ops-grid">
        <article className="sub-card">
          <p className="panel-caption">Selection cart</p>
          <h3>Selected metadata</h3>
          <p className="muted">Checked rows from search and browse appear here automatically.</p>
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
                        Uncheck Family
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
