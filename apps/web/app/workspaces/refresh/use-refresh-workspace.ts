'use client';

import { useEffect, useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import { runOrgRetrieve } from '../../lib/org-client';
import { getRefreshDiff, runRefresh } from '../../lib/refresh-client';
import { assessRetrieveHandoff } from '../browser/retrieve-handoff';
import type {
  OrgRetrieveRunView,
  RefreshDiffView,
  RefreshRetrieveSelectionView,
  RefreshRetrieveHandoffView,
  RefreshRunView
} from './types';

const REFRESH_WORKFLOW_STORAGE_KEY = 'orgumented.refresh.workflow-state.v1';

interface UseRefreshWorkspaceOptions {
  orgAlias: string;
  retrieveHandoff: RefreshRetrieveHandoffView | null;
  retrieveSelections: RefreshRetrieveSelectionView[];
  presentResponse: (response: QueryResponse) => void;
  resolveErrorMessage: (response: QueryResponse) => string;
  setLoading: (loading: boolean) => void;
  setCopied: (copied: boolean) => void;
  setErrorText: (message: string) => void;
}

const MAX_REFRESH_SNAPSHOTS = 10;

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

function parseStoredRefreshWorkflowState(raw: string | null): {
  fromSnapshot?: string;
  toSnapshot?: string;
  refreshSnapshots?: string[];
  lastRefreshRun?: RefreshRunView | null;
  lastDiffRun?: RefreshDiffView | null;
  lastOrgRetrieveRun?: OrgRetrieveRunView | null;
} | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return {
      fromSnapshot: typeof parsed.fromSnapshot === 'string' ? parsed.fromSnapshot : undefined,
      toSnapshot: typeof parsed.toSnapshot === 'string' ? parsed.toSnapshot : undefined,
      refreshSnapshots: Array.isArray(parsed.refreshSnapshots)
        ? parsed.refreshSnapshots.filter((value): value is string => typeof value === 'string')
        : undefined,
      lastRefreshRun:
        parsed.lastRefreshRun && typeof parsed.lastRefreshRun === 'object' && !Array.isArray(parsed.lastRefreshRun)
          ? (parsed.lastRefreshRun as RefreshRunView)
          : null,
      lastDiffRun:
        parsed.lastDiffRun && typeof parsed.lastDiffRun === 'object' && !Array.isArray(parsed.lastDiffRun)
          ? (parsed.lastDiffRun as RefreshDiffView)
          : null,
      lastOrgRetrieveRun:
        parsed.lastOrgRetrieveRun &&
        typeof parsed.lastOrgRetrieveRun === 'object' &&
        !Array.isArray(parsed.lastOrgRetrieveRun)
          ? (parsed.lastOrgRetrieveRun as OrgRetrieveRunView)
          : null
    };
  } catch {
    return null;
  }
}

export function useRefreshWorkspace(options: UseRefreshWorkspaceOptions) {
  const [refreshMode, setRefreshMode] = useState<'incremental' | 'full'>('incremental');
  const [fromSnapshot, setFromSnapshot] = useState('');
  const [toSnapshot, setToSnapshot] = useState('');
  const [orgRunAuth, setOrgRunAuth] = useState(true);
  const [orgRunRetrieve, setOrgRunRetrieve] = useState(true);
  const [orgAutoRefresh, setOrgAutoRefresh] = useState(true);
  const [refreshSnapshots, setRefreshSnapshots] = useState<string[]>([]);
  const [lastRefreshRun, setLastRefreshRun] = useState<RefreshRunView | null>(null);
  const [lastDiffRun, setLastDiffRun] = useState<RefreshDiffView | null>(null);
  const [lastOrgRetrieveRun, setLastOrgRetrieveRun] = useState<OrgRetrieveRunView | null>(null);

  useEffect(() => {
    try {
      const stored = parseStoredRefreshWorkflowState(localStorage.getItem(REFRESH_WORKFLOW_STORAGE_KEY));
      if (!stored) {
        return;
      }
      if (stored.fromSnapshot !== undefined) {
        setFromSnapshot(stored.fromSnapshot);
      }
      if (stored.toSnapshot !== undefined) {
        setToSnapshot(stored.toSnapshot);
      }
      if (stored.refreshSnapshots !== undefined) {
        setRefreshSnapshots(stored.refreshSnapshots);
      }
      if (stored.lastRefreshRun !== undefined) {
        setLastRefreshRun(stored.lastRefreshRun);
      }
      if (stored.lastDiffRun !== undefined) {
        setLastDiffRun(stored.lastDiffRun);
      }
      if (stored.lastOrgRetrieveRun !== undefined) {
        setLastOrgRetrieveRun(stored.lastOrgRetrieveRun);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!options.retrieveHandoff) {
      return;
    }

    setOrgAutoRefresh(options.retrieveHandoff.autoRefresh);
  }, [options.retrieveHandoff]);

  useEffect(() => {
    try {
      localStorage.setItem(
        REFRESH_WORKFLOW_STORAGE_KEY,
        JSON.stringify({
          fromSnapshot,
          toSnapshot,
          refreshSnapshots,
          lastRefreshRun,
          lastDiffRun,
          lastOrgRetrieveRun
        })
      );
    } catch {
      // ignore
    }
  }, [fromSnapshot, toSnapshot, refreshSnapshots, lastRefreshRun, lastDiffRun, lastOrgRetrieveRun]);

  function rememberRefreshSnapshot(snapshotId: string): void {
    const normalized = snapshotId.trim();
    if (!normalized) {
      return;
    }

    setRefreshSnapshots((current) => {
      const next = [normalized, ...current.filter((value) => value !== normalized)].slice(
        0,
        MAX_REFRESH_SNAPSHOTS
      );

      if (next.length >= 2) {
        setToSnapshot(next[0]);
        setFromSnapshot(next[1]);
      } else {
        setToSnapshot(next[0] ?? '');
        setFromSnapshot('');
      }

      return next;
    });
  }

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
        const parsedRun = parseRefreshRun(result);
        setLastRefreshRun(parsedRun);
        if (parsedRun?.snapshotId) {
          rememberRefreshSnapshot(parsedRun.snapshotId);
        }
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

    const from = fromSnapshot.trim();
    const to = toSnapshot.trim();
    if (!from || !to) {
      const message =
        'Diff blocked until both snapshot IDs are set. Run Refresh to auto-fill latest snapshots, then run Diff.';
      const response: QueryResponse = {
        ok: false,
        statusCode: 400,
        error: {
          message
        }
      };
      options.presentResponse(response);
      options.setErrorText(message);
      setLastDiffRun(null);
      options.setLoading(false);
      return;
    }

    if (from === to) {
      const message =
        'Diff blocked because source and target snapshots are identical. Select two different snapshot IDs.';
      const response: QueryResponse = {
        ok: false,
        statusCode: 400,
        error: {
          message
        }
      };
      options.presentResponse(response);
      options.setErrorText(message);
      setLastDiffRun(null);
      options.setLoading(false);
      return;
    }

    try {
      const result = await getRefreshDiff(from, to);
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
    const retrieveHandoff = assessRetrieveHandoff(options.retrieveHandoff, options.orgAlias);

    if (orgRunRetrieve && retrieveHandoff.state !== 'ready') {
      const message = `Org retrieve blocked until Browser handoff is ready. ${retrieveHandoff.reasons[0] ?? 'Complete a Browser retrieve first.'}`;
      const response: QueryResponse = {
        ok: false,
        statusCode: 400,
        error: {
          message
        }
      };
      options.presentResponse(response);
      options.setErrorText(message);
      setLastOrgRetrieveRun(null);
      options.setLoading(false);
      return;
    }

    if (orgRunRetrieve && options.retrieveSelections.length === 0) {
      const message =
        'Org retrieve blocked because no staged metadata selections were found. In Org Browser, check items and run Retrieve Cart first.';
      const response: QueryResponse = {
        ok: false,
        statusCode: 400,
        error: {
          message
        }
      };
      options.presentResponse(response);
      options.setErrorText(message);
      setLastOrgRetrieveRun(null);
      options.setLoading(false);
      return;
    }

    try {
      const result = await runOrgRetrieve({
        alias: options.orgAlias,
        runAuth: orgRunAuth,
        runRetrieve: orgRunRetrieve,
        autoRefresh: orgAutoRefresh,
        selections: orgRunRetrieve ? options.retrieveSelections : undefined
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
