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
