'use client';

import { useEffect, useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import {
  getOrgMetadataCatalog,
  getOrgMetadataMembers,
  retrieveOrgMetadata
} from '../../lib/org-client';
import type {
  MetadataCatalogPayload,
  MetadataMembersPayload,
  MetadataSelection
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
  const [metadataSelectionsRaw, setMetadataSelectionsRaw] = useState('[]');

  useEffect(() => {
    setMetadataSelectionsRaw(JSON.stringify(metadataSelected, null, 2));
  }, [metadataSelected]);

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
      const nextMembers = exists ? members.filter((value) => value !== member) : [...members, member].sort((a, b) => a.localeCompare(b));
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
      let selections: MetadataSelection[] = metadataSelected;
      try {
        const parsed = JSON.parse(metadataSelectionsRaw) as MetadataSelection[];
        if (Array.isArray(parsed)) {
          selections = parsed;
        }
      } catch {
        // keep structured selection
      }

      const result = await retrieveOrgMetadata({
        selections,
        autoRefresh: metadataAutoRefresh
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected metadata retrieve failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Metadata retrieve request failed. Check API readiness and local runtime health.');
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
    metadataSelectionsRaw,
    setMetadataSelectionsRaw,
    clearFilters,
    refreshTypes,
    loadMembers,
    toggleTypeSelection,
    toggleMemberSelection,
    isTypeSelected,
    isMemberSelected,
    retrieveSelected
  };
}
