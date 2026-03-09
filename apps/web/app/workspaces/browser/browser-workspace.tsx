'use client';

import { useMemo, useState } from 'react';
import {
  assessMetadataCatalogCoverage,
  describeMetadataCatalogCoverage,
  buildMemberTree,
  filterMetadataCatalogTypes,
  type MemberTreeNode
} from './browser-explorer';
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
  metadataFamilySearch: string;
  setMetadataFamilySearch: (value: string) => void;
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
  onLoadVisibleMembers: (types?: string[]) => void;
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

function formatFamilyDescriptor(typeRow: MetadataCatalogPayload['types'][number]): string[] {
  const descriptors: string[] = [];
  if (typeRow.directoryName) {
    descriptors.push(`folder ${typeRow.directoryName}`);
  }
  if (typeRow.suffix) {
    descriptors.push(`suffix .${typeRow.suffix}`);
  }
  descriptors.push(typeRow.inFolder ? 'foldered' : 'top-level');
  descriptors.push(typeRow.metaFile ? 'meta file' : 'bundle');
  if ((typeRow.childFamilyCount ?? 0) > 0) {
    descriptors.push(`${typeRow.childFamilyCount} child family${typeRow.childFamilyCount === 1 ? '' : 'ies'}`);
  }
  return descriptors;
}

export function BrowserWorkspace(props: BrowserWorkspaceProps): JSX.Element {
  const expectedAlias = props.activeAlias || props.selectedAlias;
  const retrieveHandoff = assessRetrieveHandoff(props.lastMetadataRetrieve, expectedAlias);
  const catalogCoverage = useMemo(
    () => assessMetadataCatalogCoverage(props.metadataCatalog, props.metadataWarnings),
    [props.metadataCatalog, props.metadataWarnings]
  );
  const catalogCoveragePanel = useMemo(
    () => describeMetadataCatalogCoverage(props.metadataCatalog, props.metadataWarnings),
    [props.metadataCatalog, props.metadataWarnings]
  );
  const groupedSearchResults = groupSearchResults(props.metadataSearchResults);
  const filteredCatalogTypes = useMemo(
    () => filterMetadataCatalogTypes(props.metadataCatalog?.types ?? [], props.metadataFamilySearch),
    [props.metadataCatalog, props.metadataFamilySearch]
  );
  const familyDescriptors = useMemo(
    () =>
      new Map(
        (props.metadataCatalog?.types ?? []).map((typeRow) => [typeRow.type, formatFamilyDescriptor(typeRow)])
      ),
    [props.metadataCatalog]
  );
  const [expandedBrowseFamilies, setExpandedBrowseFamilies] = useState<Record<string, boolean>>({});
  const [expandedSearchFamilies, setExpandedSearchFamilies] = useState<Record<string, boolean>>({});
  const [expandedMemberNodes, setExpandedMemberNodes] = useState<Record<string, boolean>>({});
  const toggleBrowseFamily = (type: string, shouldLoadMembers: boolean): void => {
    const nextOpen = !Boolean(expandedBrowseFamilies[type]);
    setExpandedBrowseFamilies((current) => ({
      ...current,
      [type]: nextOpen
    }));
    if (nextOpen && shouldLoadMembers) {
      props.onLoadMembers(type);
    }
  };
  const toggleSearchFamily = (type: string, shouldLoadMembers: boolean): void => {
    const nextOpen = !Boolean(expandedSearchFamilies[type]);
    setExpandedSearchFamilies((current) => ({
      ...current,
      [type]: nextOpen
    }));
    if (nextOpen && shouldLoadMembers) {
      props.onLoadMembers(type);
    }
  };
  const toggleMemberNode = (type: string, nodeKey: string): void => {
    const key = `${type}:${nodeKey}`;
    setExpandedMemberNodes((current) => ({
      ...current,
      [key]: !Boolean(current[key])
    }));
  };
  const isMemberNodeExpanded = (type: string, nodeKey: string): boolean =>
    Boolean(expandedMemberNodes[`${type}:${nodeKey}`]);
  const toggleFamilyExplicitly = (
    mode: 'browse' | 'search',
    type: string,
    isExpanded: boolean,
    shouldLoadMembers: boolean
  ): void => {
    if (mode === 'browse') {
      if (isExpanded) {
        setExpandedBrowseFamilies((current) => ({
          ...current,
          [type]: false
        }));
        return;
      }
      toggleBrowseFamily(type, shouldLoadMembers);
      return;
    }

    if (isExpanded) {
      setExpandedSearchFamilies((current) => ({
        ...current,
        [type]: false
      }));
      return;
    }
    toggleSearchFamily(type, shouldLoadMembers);
  };
  const visibleTypeCount = props.metadataCatalog?.types.length ?? 0;
  const totalTypeCount = props.metadataCatalog?.totalTypes ?? 0;
  const filteredTypeCount = filteredCatalogTypes.length;
  const catalogIsTruncated = totalTypeCount > visibleTypeCount;
  const loadedFamilyCount = useMemo(
    () => Object.keys(props.metadataMembersByType).length,
    [props.metadataMembersByType]
  );
  const expandVisibleBrowseFamilies = (): void => {
    setExpandedBrowseFamilies((current) => ({
      ...current,
      ...Object.fromEntries(filteredCatalogTypes.map((typeRow) => [typeRow.type, true]))
    }));
  };
  const collapseVisibleBrowseFamilies = (): void => {
    setExpandedBrowseFamilies((current) => ({
      ...current,
      ...Object.fromEntries(filteredCatalogTypes.map((typeRow) => [typeRow.type, false]))
    }));
  };
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
    typeSelectionState: 'none' | 'partial' | 'all',
    searchMatchedMembers?: ReadonlySet<string>
  ): JSX.Element[] =>
    nodes.map((node) => {
      const selectionState = nodeSelectionState(type, node.memberNames);
      const hasChildren = node.children.length > 0;
      const nodeExpanded = hasChildren ? isMemberNodeExpanded(type, node.key) : false;
      const matchedLeafCount = searchMatchedMembers
        ? node.memberNames.filter((memberName) => searchMatchedMembers.has(memberName)).length
        : 0;
      const hasSearchMatch = matchedLeafCount > 0;
      return (
        <li key={`${type}:${node.key}`}>
          <div className="member-tree-row">
            {hasChildren ? (
              <button
                type="button"
                className="member-tree-toggle"
                aria-expanded={nodeExpanded}
                aria-label={`${nodeExpanded ? 'Collapse' : 'Expand'} ${node.label}`}
                onClick={() => toggleMemberNode(type, node.key)}
              >
                <span aria-hidden>{nodeExpanded ? '▾' : '▸'}</span>
              </button>
            ) : (
              <span className="member-tree-toggle-spacer" aria-hidden />
            )}
            <SelectionCheckbox
              checked={selectionState === 'all'}
              indeterminate={selectionState === 'partial'}
              disabled={typeSelectionState === 'all'}
              label={node.label}
              hint={
                typeSelectionState === 'all'
                  ? 'included via family selection'
                  : node.isLeaf
                    ? hasSearchMatch
                      ? 'matched by search • check for only this item'
                      : 'select this single item'
                    : hasSearchMatch
                      ? `${matchedLeafCount} matched descendant(s) • check to include this folder`
                      : `${node.memberNames.length} nested item(s) • check to include this folder`
              }
              onChange={(checked) =>
                node.isLeaf && node.memberNames.length === 1
                  ? props.onSetMemberSelected(type, node.memberNames[0], checked)
                  : props.onSetMembersSelected(type, node.memberNames, checked)
              }
            />
          </div>
          {hasChildren && nodeExpanded ? (
            <ul className="member-list member-tree-children">
              {renderMemberTreeNodes(type, node.children, typeSelectionState, searchMatchedMembers)}
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
            <span className={`decision-badge ${catalogCoverage.state === 'full' ? 'good' : 'bad'}`}>
              Catalog coverage: {catalogCoverage.state}
            </span>
          </div>
          <p><strong>Catalog source:</strong> {props.metadataCatalog?.source || 'not loaded'}</p>
          <p><strong>Refreshed:</strong> {formatTimestamp(props.metadataCatalog?.refreshedAt)}</p>
          <p><strong>Total types:</strong> {props.metadataCatalog?.totalTypes ?? 0}</p>
          <p className="muted">{catalogCoverage.summary}</p>
          {catalogCoverage.reasons.length > 1 ? (
            <ul className="issue-list">
              {catalogCoverage.reasons.slice(1).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          ) : null}
        </article>

        <article className="sub-card">
          <p className="panel-caption">Retrieval cart</p>
          <h3>Selected metadata</h3>
          <div className="decision-meta">
            <span className="decision-badge muted">Families: {props.selectionSummary.typeCount}</span>
            <span className="decision-badge muted">Items: {props.selectionSummary.memberCount}</span>
            <span className="decision-badge muted">Visible families: {filteredTypeCount}</span>
            <span className="decision-badge muted">Discovered families: {totalTypeCount}</span>
            <span className="decision-badge muted">Loaded trees: {Object.keys(props.metadataMembersByType).length}</span>
            <span className={`decision-badge ${props.metadataAutoRefresh ? 'good' : 'muted'}`}>
              Auto refresh: {String(props.metadataAutoRefresh)}
            </span>
          </div>
          <p><strong>Force catalog refresh:</strong> {String(props.metadataForceRefresh)}</p>
          <p className="muted">Build the retrieve cart from the visible explorer, then continue to `Refresh & Build` for drift and snapshot review.</p>
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
          <label htmlFor="metadataFamilySearch">Filter Metadata Families</label>
          <input
            id="metadataFamilySearch"
            placeholder="ApexClass, Layout, object, validation rule..."
            value={props.metadataFamilySearch}
            onChange={(e) => props.setMetadataFamilySearch(e.target.value)}
          />
          <p className="muted input-hint">Filter the family explorer without changing the current name search or retrieve cart.</p>
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
          <label htmlFor="metadataLimit">Search/Member Limit</label>
          <input id="metadataLimit" value={props.metadataLimitRaw} onChange={(e) => props.setMetadataLimitRaw(e.target.value)} />
          <p className="muted input-hint">
            `Load Full Family Catalog` always loads up to 5000 families for full coverage. This limit applies to Search and member listings.
          </p>
          {catalogIsTruncated ? (
            <p className="muted input-hint">
              Showing {visibleTypeCount} of {totalTypeCount} metadata families. Increase Search/Member Limit, then click `Load Full Family Catalog`.
            </p>
          ) : null}
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

      <article className="sub-card org-browser-coverage-card">
        <p className="panel-caption">Catalog coverage</p>
        <h3>{catalogCoveragePanel.summary}</h3>
        <div className="decision-meta">
          <span className={`decision-badge ${catalogCoveragePanel.state === 'full' ? 'good' : catalogCoveragePanel.state === 'limited' ? 'bad' : 'muted'}`}>
            {catalogCoveragePanel.badgeLabel}
          </span>
          <span className="decision-badge muted">{catalogCoveragePanel.sourceLabel}</span>
          <span className="decision-badge muted">{catalogCoveragePanel.countsLabel}</span>
          <span className="decision-badge muted">{loadedFamilyCount} loaded tree{loadedFamilyCount === 1 ? '' : 's'}</span>
        </div>
        <p className="muted">{catalogCoveragePanel.nextStep}</p>
        {catalogCoveragePanel.reasons.length > 0 ? (
          <ul className="citation-list compact-list">
            {catalogCoveragePanel.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </article>

      {catalogCoverage.state !== 'full' ? (
        <article className="sub-card org-browser-coverage-card">
          <p className="panel-caption">Coverage warning</p>
          <h3>Do not treat this as full org inventory yet</h3>
          <ol className="workflow-step-list">
            <li>Click <strong>Load Full Family Catalog</strong>.</li>
            <li>If coverage still says limited, turn on <strong>Force Refresh</strong> and run <strong>Load Full Family Catalog</strong> again.</li>
            <li>Use the triangle on a family row to open children. Use the checkbox on that row to add the whole family to the retrieve cart.</li>
            <li>Only treat the family browser as full inventory when the badge above says <strong>Live coverage</strong>.</li>
          </ol>
        </article>
      ) : null}

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
          Load Full Family Catalog
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => props.onLoadVisibleMembers(filteredCatalogTypes.map((typeRow) => typeRow.type))}
          disabled={props.loading || filteredTypeCount === 0}
        >
          Load Visible Children
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
          <li>Search by name or click Load Full Family Catalog to load the current family catalog.</li>
          <li>Use the triangle on a family row to open children. Use the checkbox on that row to add the family or item to the cart.</li>
          <li>Run <strong>Retrieve Cart</strong>, then continue in <strong>Refresh &amp; Build</strong>.</li>
        </ol>
      </article>
      <p className="muted"><strong>Cart rule:</strong> every checked row is already in the cart.</p>
      <p className="muted">Check a family to include everything nested under it. Check an individual item to include only that item.</p>
      <p className="muted">Use <strong>Load Visible Children</strong> to preload child items for the visible families without opening each row manually.</p>
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
              {groupedSearchResults.map((group) => {
                const isExpanded = Boolean(expandedSearchFamilies[group.type]);
                const descriptors = familyDescriptors.get(group.type) ?? [];
                const membersPayload = props.metadataMembersByType[group.type];
                const members = membersPayload?.members || [];
                const memberTree = buildMemberTree(members.map((member) => member.name));
                const typeSelectionState = props.getTypeSelectionState(group.type);
                const membersLoaded = Boolean(membersPayload);
                const shouldAutoLoadMembers =
                  !membersLoaded && props.metadataLoadingType !== group.type && !props.loading;
                const matchedMemberNames = new Set(
                  group.results
                    .filter((result) => result.kind === 'member')
                    .map((result) => result.name)
                );
                return (
                  <section key={group.type} className={`metadata-family metadata-family-search ${isExpanded ? 'is-open' : ''}`}>
                    <div className="metadata-family-head">
                      <button
                        type="button"
                        className="metadata-family-chevron"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${group.type} search results`}
                        onClick={() => toggleSearchFamily(group.type, shouldAutoLoadMembers)}
                      >
                        <span aria-hidden>{isExpanded ? '▾' : '▸'}</span>
                      </button>
                      <div className="metadata-family-main">
                        <SelectionCheckbox
                          checked={props.getTypeSelectionState(group.type) === 'all'}
                          indeterminate={props.getTypeSelectionState(group.type) === 'partial'}
                          label={group.type}
                          hint={`${group.results.length} match${group.results.length === 1 ? '' : 'es'} • check to include this family`}
                          onChange={(checked) => props.onSetTypeSelected(group.type, checked)}
                        />
                        {descriptors.length > 0 ? (
                          <div className="metadata-family-descriptor-list">
                            {descriptors.map((descriptor) => (
                              <span key={`${group.type}:search:${descriptor}`} className="decision-badge muted">
                                {descriptor}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="metadata-family-actions">
                        <button
                          type="button"
                          className="ghost metadata-family-action-btn"
                          onClick={() => toggleFamilyExplicitly('search', group.type, isExpanded, shouldAutoLoadMembers)}
                        >
                          {isExpanded ? 'Collapse' : membersLoaded ? 'Expand' : 'Load & Expand'}
                        </button>
                      </div>
                      <span className="metadata-family-count">
                        {group.results.length} match{group.results.length === 1 ? '' : 'es'}
                      </span>
                    </div>
                    {isExpanded ? (
                      <>
                        <p className="muted">
                          {matchedMemberNames.size > 0
                            ? `${matchedMemberNames.size} matched item${matchedMemberNames.size === 1 ? '' : 's'} in this family. Expand folders below to inspect the full loaded tree.`
                            : 'No direct member match was returned. Expand the family tree below to inspect available child items.'}
                        </p>
                        {props.metadataLoadingType === group.type ? <p className="muted">Loading family items...</p> : null}
                        {members.length > 0 ? (
                          <ul className="member-list member-tree-root">
                            {renderMemberTreeNodes(group.type, memberTree, typeSelectionState, matchedMemberNames)}
                          </ul>
                        ) : membersLoaded ? (
                          <p className="muted">
                            No child items were returned for this family. It may still be valid metadata with zero discoverable child items in the current org.
                          </p>
                        ) : (
                          <p className="muted">Loading child items. If this remains empty, run Force Refresh and try again.</p>
                        )}
                      </>
                    ) : (
                      <p className="muted metadata-family-collapsed-hint">Use Load &amp; Expand or the triangle to open child items in this family.</p>
                    )}
                  </section>
                );
              })}
            </div>
          ) : (
            <div>
              <p className="muted">No metadata names matched this search yet. Try `Opportunity`, `layout`, a field API name, or an Apex class name.</p>
              <div className="action-row">
                <button type="button" className="ghost" onClick={props.onRefreshExplorer} disabled={props.loading}>
                  Load Full Family Catalog
                </button>
              </div>
            </div>
          )}
        </article>
      ) : null}

      <p className="panel-caption">Browse by metadata family</p>
      <div className="browser-family-toolbar">
        <p className="muted">
          Showing {filteredTypeCount} visible family row{filteredTypeCount === 1 ? '' : 's'} from {totalTypeCount} discovered families.
          Triangle = open children. Checkbox = add that family or item to the retrieve cart.
        </p>
        <div className="action-row compact-action-row">
          <button type="button" className="ghost" onClick={expandVisibleBrowseFamilies} disabled={filteredTypeCount === 0}>
            Expand Visible Families
          </button>
          <button type="button" className="ghost" onClick={collapseVisibleBrowseFamilies} disabled={filteredTypeCount === 0}>
            Collapse Visible Families
          </button>
        </div>
      </div>
      {catalogCoverage.state !== 'full' ? (
        <p className="muted">Catalog coverage is limited. Review the coverage warning and discovery notes above before treating this as full org inventory.</p>
      ) : null}
      <div className="org-browser-frame">
        {filteredCatalogTypes.map((typeRow) => {
          const membersPayload = props.metadataMembersByType[typeRow.type];
          const members = membersPayload?.members || [];
          const memberTree = buildMemberTree(members.map((member) => member.name));
          const typeSelectionState = props.getTypeSelectionState(typeRow.type);
          const membersLoaded = Boolean(membersPayload);
          const shouldAutoLoadMembers = !membersLoaded && props.metadataLoadingType !== typeRow.type && !props.loading;
          const isExpanded = Boolean(expandedBrowseFamilies[typeRow.type]);
          return (
            <section key={typeRow.type} className={`metadata-family ${isExpanded ? 'is-open' : ''}`}>
              <div className="metadata-family-head">
                <button
                  type="button"
                  className="metadata-family-chevron"
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${typeRow.type}`}
                  onClick={() => toggleBrowseFamily(typeRow.type, shouldAutoLoadMembers)}
                >
                  <span aria-hidden>{isExpanded ? '▾' : '▸'}</span>
                </button>
                <div className="metadata-family-main">
                  <SelectionCheckbox
                    checked={typeSelectionState === 'all'}
                    indeterminate={typeSelectionState === 'partial'}
                    label={typeRow.type}
                    hint={`${typeRow.memberCount} discoverable item${typeRow.memberCount === 1 ? '' : 's'} • check to include this family`}
                    onChange={(checked) => props.onSetTypeSelected(typeRow.type, checked)}
                  />
                  <div className="metadata-family-descriptor-list">
                    {formatFamilyDescriptor(typeRow).map((descriptor) => (
                      <span key={`${typeRow.type}:${descriptor}`} className="decision-badge muted">
                        {descriptor}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="metadata-family-actions">
                  <button
                    type="button"
                    className="ghost metadata-family-action-btn"
                    onClick={() => toggleFamilyExplicitly('browse', typeRow.type, isExpanded, shouldAutoLoadMembers)}
                  >
                    {isExpanded ? 'Collapse' : membersLoaded ? 'Expand' : 'Load & Expand'}
                  </button>
                </div>
                <span className="metadata-family-count">
                  {membersLoaded ? 'loaded' : 'not loaded'} • {typeRow.memberCount}
                </span>
              </div>
              {isExpanded ? (
                <>
                  {props.metadataLoadingType === typeRow.type ? <p className="muted">Loading family items...</p> : null}
                  {members.length > 0 ? (
                    <ul className="member-list member-tree-root">
                      {renderMemberTreeNodes(typeRow.type, memberTree, typeSelectionState)}
                    </ul>
                  ) : membersLoaded ? (
                    <p className="muted">
                      No members returned for this family. It may still be valid metadata with zero discoverable child items in the current org.
                    </p>
                  ) : (
                    <p className="muted">Loading child items. If this remains empty, run Force Refresh and try again.</p>
                  )}
                </>
              ) : (
                <p className="muted">Use Load &amp; Expand or the triangle to open child items for this family.</p>
              )}
            </section>
          );
        })}
        {props.metadataCatalogRequested && filteredCatalogTypes.length === 0 ? (
          props.metadataCatalog?.types?.length ? (
            <p className="muted">No family rows match the current family filter. Clear Filters or broaden the family filter text.</p>
          ) : (
            <p className="muted">No metadata families were returned yet. Try `Load Full Family Catalog` again with `Force Refresh` enabled.</p>
          )
        ) : null}
        {!props.metadataCatalogRequested ? (
          <p className="muted">Click `Load Full Family Catalog` to load live metadata families before retrieving anything.</p>
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
