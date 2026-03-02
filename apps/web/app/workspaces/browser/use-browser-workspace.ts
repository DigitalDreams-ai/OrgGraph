'use client';

import { useMemo, useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import {
  getOrgMetadataCatalog,
  getOrgMetadataMembers,
  retrieveOrgMetadata
} from '../../lib/org-client';
import type {
  MetadataCatalogPayload,
  MetadataMembersPayload,
  MetadataRetrieveResultView,
  MetadataSelection,
  MetadataSelectionSummary
} from './types';

interface UseBrowserWorkspaceOptions {
  presentResponse: (response: QueryResponse) => void;
  resolveErrorMessage: (response: QueryResponse) => string;
  setLoading: (loading: boolean) => void;
  setCopied: (copied: boolean) => void;
  setErrorText: (message: string) => void;
}

function parseOptionalInt(raw: string): number | undefined {
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeSelections(input: MetadataSelection[]): MetadataSelection[] {
  return input
    .filter((entry) => entry && typeof entry.type === 'string' && entry.type.trim().length > 0)
    .map((entry) => ({
      type: entry.type.trim(),
      members: Array.isArray(entry.members)
        ? entry.members.map((member) => member.trim()).filter((member) => member.length > 0)
        : undefined
    }));
}

function buildSelectionSummary(selections: MetadataSelection[]): MetadataSelectionSummary {
  return {
    typeCount: selections.length,
    memberCount: selections.reduce((total, entry) => total + (entry.members?.length ?? 0), 0)
  };
}

function parseMetadataRetrieve(response: QueryResponse): MetadataRetrieveResultView | null {
  if (!response.payload || typeof response.payload !== 'object' || Array.isArray(response.payload)) {
    return null;
  }

  const payload = response.payload as Record<string, unknown>;
  const refresh =
    payload.refresh && typeof payload.refresh === 'object' && !Array.isArray(payload.refresh)
      ? (payload.refresh as Record<string, unknown>)
      : null;

  return {
    alias: String(payload.alias ?? ''),
    status: String(payload.status ?? ''),
    parsePath: String(payload.parsePath ?? ''),
    metadataArgs: Array.isArray(payload.metadataArgs) ? payload.metadataArgs.map((item) => String(item)) : [],
    autoRefresh: payload.autoRefresh === true,
    completedAt: String(payload.completedAt ?? ''),
    refresh: refresh
      ? {
          nodeCount: Number(refresh.nodeCount ?? 0),
          edgeCount: Number(refresh.edgeCount ?? 0),
          evidenceCount: Number(refresh.evidenceCount ?? 0)
        }
      : undefined
  };
}

export function useBrowserWorkspace(options: UseBrowserWorkspaceOptions) {
  const [metadataSearch, setMetadataSearch] = useState('');
  const [metadataMemberSearch, setMetadataMemberSearch] = useState('');
  const [metadataLimitRaw, setMetadataLimitRaw] = useState('200');
  const [metadataForceRefresh, setMetadataForceRefresh] = useState(false);
  const [metadataAutoRefresh, setMetadataAutoRefresh] = useState(true);
  const [metadataCatalog, setMetadataCatalog] = useState<MetadataCatalogPayload | null>(null);
  const [metadataMembersByType, setMetadataMembersByType] = useState<Record<string, MetadataMembersPayload>>({});
  const [metadataLoadingType, setMetadataLoadingType] = useState('');
  const [metadataSelected, setMetadataSelected] = useState<MetadataSelection[]>([]);
  const [lastMetadataRetrieve, setLastMetadataRetrieve] = useState<MetadataRetrieveResultView | null>(null);

  const metadataSelectionsPreview = useMemo(() => JSON.stringify(metadataSelected, null, 2), [metadataSelected]);
  const selectionSummary = useMemo(() => buildSelectionSummary(metadataSelected), [metadataSelected]);
  const visibleCatalogTypes = useMemo(
    () => (metadataCatalog?.types ?? []).map((entry) => entry.type),
    [metadataCatalog]
  );

  function clearFilters(): void {
    setMetadataSearch('');
    setMetadataMemberSearch('');
    setMetadataForceRefresh(false);
  }

  function toggleTypeSelection(type: string): void {
    setMetadataSelected((current) => {
      const idx = current.findIndex((entry) => entry.type === type);
      if (idx >= 0) {
        return current.filter((entry) => entry.type !== type);
      }
      return [...current, { type }];
    });
  }

  function toggleMemberSelection(type: string, member: string): void {
    setMetadataSelected((current) => {
      const idx = current.findIndex((entry) => entry.type === type);
      if (idx < 0) {
        return [...current, { type, members: [member] }];
      }

      const existing = current[idx];
      const members = Array.isArray(existing.members) ? [...existing.members] : [];
      const exists = members.includes(member);
      const nextMembers = exists
        ? members.filter((value) => value !== member)
        : [...members, member].sort((a, b) => a.localeCompare(b));
      const replacement = nextMembers.length > 0 ? { type, members: nextMembers } : { type };
      const next = [...current];
      next[idx] = replacement;
      return next;
    });
  }

  function isTypeSelected(type: string): boolean {
    return metadataSelected.some((entry) => entry.type === type);
  }

  function isMemberSelected(type: string, member: string): boolean {
    const typeEntry = metadataSelected.find((entry) => entry.type === type);
    if (!typeEntry || !Array.isArray(typeEntry.members)) return false;
    return typeEntry.members.includes(member);
  }

  function addVisibleTypesToSelection(): void {
    setMetadataSelected((current) => {
      const knownTypes = new Set(current.map((entry) => entry.type));
      const additions = visibleCatalogTypes
        .filter((type) => !knownTypes.has(type))
        .map((type) => ({ type }));
      return additions.length > 0 ? [...current, ...additions] : current;
    });
  }

  function clearSelections(): void {
    setMetadataSelected([]);
  }

  function removeTypeSelection(type: string): void {
    setMetadataSelected((current) => current.filter((entry) => entry.type !== type));
  }

  function removeMemberSelection(type: string, member: string): void {
    setMetadataSelected((current) =>
      current.flatMap((entry) => {
        if (entry.type !== type) {
          return [entry];
        }

        const remainingMembers = (entry.members ?? []).filter((value) => value !== member);
        if (remainingMembers.length === 0) {
          return [];
        }

        return [{ type, members: remainingMembers }];
      })
    );
  }

  async function refreshTypes(): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await getOrgMetadataCatalog({
        q: metadataSearch,
        limit: parseOptionalInt(metadataLimitRaw) ?? 200,
        refresh: metadataForceRefresh
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        return;
      }
      if (result.payload) {
        setMetadataCatalog(result.payload as MetadataCatalogPayload);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected metadata catalog failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Metadata catalog request failed. Check API readiness and local runtime health.');
    } finally {
      options.setLoading(false);
    }
  }

  async function loadMembers(type: string): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');
    setMetadataLoadingType(type);

    try {
      const result = await getOrgMetadataMembers({
        type,
        q: metadataMemberSearch,
        limit: parseOptionalInt(metadataLimitRaw) ?? 1000,
        refresh: metadataForceRefresh
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        return;
      }
      if (result.payload) {
        setMetadataMembersByType((current) => ({
          ...current,
          [type]: result.payload as MetadataMembersPayload
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected metadata members failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Metadata members request failed. Check API readiness and local runtime health.');
    } finally {
      setMetadataLoadingType('');
      options.setLoading(false);
    }
  }

  async function retrieveSelected(): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await retrieveOrgMetadata({
        selections: metadataSelected,
        autoRefresh: metadataAutoRefresh
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
      } else {
        setLastMetadataRetrieve(parseMetadataRetrieve(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected metadata retrieve failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Metadata retrieve request failed. Check API readiness and local runtime health.');
      setLastMetadataRetrieve(null);
    } finally {
      options.setLoading(false);
    }
  }

  return {
    metadataSearch,
    setMetadataSearch,
    metadataMemberSearch,
    setMetadataMemberSearch,
    metadataLimitRaw,
    setMetadataLimitRaw,
    metadataForceRefresh,
    setMetadataForceRefresh,
    metadataAutoRefresh,
    setMetadataAutoRefresh,
    metadataCatalog,
    metadataMembersByType,
    metadataLoadingType,
    metadataSelectionsPreview,
    selectedMetadata: metadataSelected,
    selectionSummary,
    visibleCatalogTypes,
    lastMetadataRetrieve,
    clearFilters,
    addVisibleTypesToSelection,
    clearSelections,
    refreshTypes,
    loadMembers,
    toggleTypeSelection,
    toggleMemberSelection,
    removeTypeSelection,
    removeMemberSelection,
    isTypeSelected,
    isMemberSelected,
    retrieveSelected
  };
}
