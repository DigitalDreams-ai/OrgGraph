'use client';

import type { MetadataCatalogPayload } from './types';

export interface MemberTreeNode {
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

export interface MetadataCatalogCoverage {
  state: 'full' | 'limited' | 'unavailable';
  summary: string;
  reasons: string[];
}

export interface MetadataCatalogCoveragePanel extends MetadataCatalogCoverage {
  badgeLabel: string;
  sourceLabel: string;
  countsLabel: string;
  nextStep: string;
}

function normalizeMetadataFilterValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
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

export function buildMemberTree(memberNames: string[]): MemberTreeNode[] {
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

export function filterMetadataCatalogTypes(
  types: MetadataCatalogPayload['types'],
  filterValue: string
): MetadataCatalogPayload['types'] {
  const trimmed = filterValue.trim();
  if (trimmed.length === 0) {
    return types;
  }

  const normalizedFilter = normalizeMetadataFilterValue(trimmed);

  return types.filter((typeRow) => {
    const candidates = [
      typeRow.type,
      typeRow.directoryName ?? '',
      typeRow.suffix ?? '',
      ...(typeRow.childXmlNames ?? [])
    ];

    return candidates.some((candidate) => {
      const lowered = candidate.toLowerCase();
      if (lowered.includes(trimmed.toLowerCase())) {
        return true;
      }
      return normalizeMetadataFilterValue(candidate).includes(normalizedFilter);
    });
  });
}

function addCoverageReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) {
    reasons.push(reason);
  }
}

export function assessMetadataCatalogCoverage(
  catalog: MetadataCatalogPayload | null,
  warnings: string[]
): MetadataCatalogCoverage {
  const reasons: string[] = [];
  const normalizedWarnings = warnings.map((warning) => warning.trim()).filter((warning) => warning.length > 0);

  if (!catalog) {
    return {
      state: 'unavailable',
      summary: 'Metadata family catalog is not loaded yet.',
      reasons: ['Run Browse All to load the current metadata family catalog.']
    };
  }

  if (catalog.source === 'local') {
    addCoverageReason(reasons, 'Showing only metadata discovered from the local parse path.');
  }

  if (catalog.source === 'cache') {
    addCoverageReason(reasons, 'Showing metadata families from cached discovery output.');
  }

  if (catalog.source === 'mixed') {
    addCoverageReason(reasons, 'Catalog coverage includes a mixture of live org discovery and local/cache fallback data.');
  }

  for (const warning of normalizedWarnings) {
    if (/live metadata family discovery unavailable/i.test(warning)) {
      addCoverageReason(reasons, 'Live family discovery fell back from org metadata-type discovery.');
    }
    if (/live metadata type discovery failed/i.test(warning)) {
      addCoverageReason(reasons, 'Org metadata-type discovery failed and the family catalog may be incomplete.');
    }
    if (/sf cli unavailable for live metadata discovery/i.test(warning)) {
      addCoverageReason(reasons, 'sf CLI is unavailable for live family discovery in the API runtime.');
    }
    if (/result truncated to limit=/i.test(warning)) {
      addCoverageReason(reasons, 'The current Search/Member Limit is truncating the visible family list.');
    }
  }

  if (catalog.totalTypes > catalog.types.length) {
    addCoverageReason(
      reasons,
      `Only ${catalog.types.length} of ${catalog.totalTypes} metadata families are visible in the current catalog result.`
    );
  }

  if (reasons.length === 0) {
    return {
      state: 'full',
      summary: 'Live metadata family coverage is available for the current catalog.',
      reasons: []
    };
  }

  return {
    state: 'limited',
    summary: reasons[0],
    reasons
  };
}

function describeCatalogSource(catalog: MetadataCatalogPayload | null): string {
  if (!catalog) {
    return 'no catalog loaded';
  }

  switch (catalog.source) {
    case 'metadata_api':
      return 'live org metadata discovery';
    case 'source_api':
      return 'source API metadata discovery';
    case 'local':
      return 'local parse-path catalog';
    case 'cache':
      return 'cached metadata catalog';
    case 'mixed':
      return 'mixed live and fallback catalog';
    default:
      return catalog.source;
  }
}

export function describeMetadataCatalogCoverage(
  catalog: MetadataCatalogPayload | null,
  warnings: string[]
): MetadataCatalogCoveragePanel {
  const coverage = assessMetadataCatalogCoverage(catalog, warnings);
  const visibleTypes = catalog?.types.length ?? 0;
  const totalTypes = catalog?.totalTypes ?? 0;

  if (!catalog) {
    return {
      ...coverage,
      badgeLabel: 'Not loaded',
      sourceLabel: describeCatalogSource(catalog),
      countsLabel: '0 visible families',
      nextStep: 'Click Load Full Family Catalog to pull the current org metadata family catalog.'
    };
  }

  if (coverage.state === 'full') {
    return {
      ...coverage,
      badgeLabel: 'Live coverage',
      sourceLabel: describeCatalogSource(catalog),
      countsLabel: `${visibleTypes} of ${totalTypes} families visible`,
      nextStep: 'Search by metadata name or expand any family row to inspect child items.'
    };
  }

  const countsLabel =
    totalTypes > visibleTypes
      ? `${visibleTypes} of ${totalTypes} families visible`
      : `${visibleTypes} visible families`;
  const nextStep = coverage.reasons.some((reason) => /truncating the visible family list/i.test(reason))
    ? 'Increase Search/Member Limit, then run Load Full Family Catalog again.'
    : coverage.reasons.some((reason) => /failed/i.test(reason) || /sf CLI is unavailable/i.test(reason))
      ? 'Run Force Refresh, then verify sf CLI metadata-type discovery for the active alias.'
      : 'Run Load Full Family Catalog with Force Refresh enabled before treating this as full org inventory.';

  return {
    ...coverage,
    badgeLabel: 'Coverage limited',
    sourceLabel: describeCatalogSource(catalog),
    countsLabel,
    nextStep
  };
}
