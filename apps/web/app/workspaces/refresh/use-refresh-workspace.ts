'use client';

import { useEffect, useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import { runOrgRetrieve } from '../../lib/org-client';
import { getRefreshDiff, runRefresh } from '../../lib/refresh-client';
import type {
  OrgRetrieveRunView,
  RefreshDiffView,
  RefreshRetrieveHandoffView,
  RefreshRunView
} from './types';

interface UseRefreshWorkspaceOptions {
  orgAlias: string;
  retrieveHandoff: RefreshRetrieveHandoffView | null;
  presentResponse: (response: QueryResponse) => void;
  resolveErrorMessage: (response: QueryResponse) => string;
  setLoading: (loading: boolean) => void;
  setCopied: (copied: boolean) => void;
  setErrorText: (message: string) => void;
}

function payloadAsRecord(response: QueryResponse): Record<string, unknown> | null {
  if (!response.payload || typeof response.payload !== 'object' || Array.isArray(response.payload)) {
    return null;
  }
  return response.payload as Record<string, unknown>;
}

function parseRefreshRun(response: QueryResponse): RefreshRunView | null {
  const payload = payloadAsRecord(response);
  const driftEvaluation =
    payload?.driftEvaluation && typeof payload.driftEvaluation === 'object' && !Array.isArray(payload.driftEvaluation)
      ? (payload.driftEvaluation as Record<string, unknown>)
      : {};

  if (!payload) {
    return null;
  }

  return {
    snapshotId: String(payload.snapshotId ?? ''),
    mode: String(payload.mode ?? ''),
    skipped: payload.skipped === true,
    nodeCount: Number(payload.nodeCount ?? 0),
    edgeCount: Number(payload.edgeCount ?? 0),
    evidenceCount: Number(payload.evidenceCount ?? 0),
    meaningChangeSummary: String(payload.meaningChangeSummary ?? ''),
    driftWithinBudget: driftEvaluation.withinBudget !== false,
    driftSummary: String(driftEvaluation.summary ?? ''),
    driftViolationCount: Number(driftEvaluation.violationCount ?? 0)
  };
}

function parseRefreshDiff(response: QueryResponse): RefreshDiffView | null {
  const payload = payloadAsRecord(response);
  if (!payload) {
    return null;
  }

  const snapshots =
    payload.snapshots && typeof payload.snapshots === 'object' && !Array.isArray(payload.snapshots)
      ? (payload.snapshots as Record<string, unknown>)
      : {};
  const fromSnapshot =
    snapshots.from && typeof snapshots.from === 'object' && !Array.isArray(snapshots.from)
      ? (snapshots.from as Record<string, unknown>)
      : {};
  const toSnapshot =
    snapshots.to && typeof snapshots.to === 'object' && !Array.isArray(snapshots.to)
      ? (snapshots.to as Record<string, unknown>)
      : {};
  const semanticDiff =
    payload.semanticDiff && typeof payload.semanticDiff === 'object' && !Array.isArray(payload.semanticDiff)
      ? (payload.semanticDiff as Record<string, unknown>)
      : {};
  const driftEvaluation =
    payload.driftEvaluation && typeof payload.driftEvaluation === 'object' && !Array.isArray(payload.driftEvaluation)
      ? (payload.driftEvaluation as Record<string, unknown>)
      : {};

  return {
    fromSnapshotId: String(fromSnapshot.snapshotId ?? ''),
    toSnapshotId: String(toSnapshot.snapshotId ?? ''),
    meaningChangeSummary: String(payload.meaningChangeSummary ?? ''),
    addedNodeCount: Number(semanticDiff.addedNodeCount ?? 0),
    removedNodeCount: Number(semanticDiff.removedNodeCount ?? 0),
    addedEdgeCount: Number(semanticDiff.addedEdgeCount ?? 0),
    removedEdgeCount: Number(semanticDiff.removedEdgeCount ?? 0),
    structureDigestChanged: semanticDiff.structureDigestChanged === true,
    driftWithinBudget: driftEvaluation.withinBudget !== false,
    driftSummary: String(driftEvaluation.summary ?? '')
  };
}

function parseOrgRetrieveRun(response: QueryResponse): OrgRetrieveRunView | null {
  const payload = payloadAsRecord(response);
  if (!payload) {
    return null;
  }

  return {
    status: String(payload.status ?? ''),
    alias: String(payload.alias ?? ''),
    completedAt: String(payload.completedAt ?? ''),
    parsePath: String(payload.parsePath ?? ''),
    projectPath: String(payload.projectPath ?? ''),
    metadataArgs: Array.isArray(payload.metadataArgs) ? payload.metadataArgs.map((item) => String(item)) : [],
    stepSummary: Array.isArray(payload.steps)
      ? payload.steps.map((entry) => {
          const step = entry as Record<string, unknown>;
          return {
            step: String(step.step ?? ''),
            status: String(step.status ?? ''),
            message: String(step.message ?? ''),
            elapsedMs: Number(step.elapsedMs ?? 0)
          };
        })
      : []
  };
}

export function useRefreshWorkspace(options: UseRefreshWorkspaceOptions) {
  const [refreshMode, setRefreshMode] = useState<'incremental' | 'full'>('incremental');
  const [fromSnapshot, setFromSnapshot] = useState('');
  const [toSnapshot, setToSnapshot] = useState('');
  const [orgRunAuth, setOrgRunAuth] = useState(true);
  const [orgRunRetrieve, setOrgRunRetrieve] = useState(true);
  const [orgAutoRefresh, setOrgAutoRefresh] = useState(true);
  const [lastRefreshRun, setLastRefreshRun] = useState<RefreshRunView | null>(null);
  const [lastDiffRun, setLastDiffRun] = useState<RefreshDiffView | null>(null);
  const [lastOrgRetrieveRun, setLastOrgRetrieveRun] = useState<OrgRetrieveRunView | null>(null);

  useEffect(() => {
    if (!options.retrieveHandoff) {
      return;
    }

    setOrgAutoRefresh(options.retrieveHandoff.autoRefresh);
  }, [options.retrieveHandoff]);

  async function runRefreshNow(): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await runRefresh({ mode: refreshMode });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        setLastRefreshRun(null);
      } else {
        setLastRefreshRun(parseRefreshRun(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected refresh query failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Refresh request failed. Check API readiness and local runtime health.');
      setLastRefreshRun(null);
    } finally {
      options.setLoading(false);
    }
  }

  async function runDiff(): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await getRefreshDiff(fromSnapshot, toSnapshot);
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        setLastDiffRun(null);
      } else {
        setLastDiffRun(parseRefreshDiff(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected refresh diff failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Refresh diff request failed. Check API readiness and local runtime health.');
      setLastDiffRun(null);
    } finally {
      options.setLoading(false);
    }
  }

  async function runOrgRetrieveNow(): Promise<void> {
    options.setLoading(true);
    options.setCopied(false);
    options.setErrorText('');

    try {
      const result = await runOrgRetrieve({
        alias: options.orgAlias,
        runAuth: orgRunAuth,
        runRetrieve: orgRunRetrieve,
        autoRefresh: orgAutoRefresh
      });
      options.presentResponse(result);
      if (result.ok === false) {
        options.setErrorText(options.resolveErrorMessage(result));
        setLastOrgRetrieveRun(null);
      } else {
        setLastOrgRetrieveRun(parseOrgRetrieveRun(result));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected org retrieve failure';
      const fallback: QueryResponse = { ok: false, error: { message } };
      options.presentResponse(fallback);
      options.setErrorText('Org retrieve request failed. Check API readiness and local runtime health.');
      setLastOrgRetrieveRun(null);
    } finally {
      options.setLoading(false);
    }
  }

  return {
    refreshMode,
    setRefreshMode,
    fromSnapshot,
    setFromSnapshot,
    toSnapshot,
    setToSnapshot,
    orgRunAuth,
    setOrgRunAuth,
    orgRunRetrieve,
    setOrgRunRetrieve,
    orgAutoRefresh,
    setOrgAutoRefresh,
    lastRefreshRun,
    lastDiffRun,
    lastOrgRetrieveRun,
    runRefreshNow,
    runDiff,
    runOrgRetrieveNow
  };
}
