'use client';

import { useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import type { AskTrustDashboardPayload, MetaAdaptPayload, MetaContextPayload, RuntimeMetricsPayload } from './types';

interface UseSystemWorkspaceOptions {
  runQuery: (kind: 'metaContext' | 'metaAdapt' | 'askTrustDashboard' | 'runtimeMetrics', payload?: Record<string, unknown>) => Promise<QueryResponse | null>;
  loadOrgStatus: () => Promise<QueryResponse | null>;
}

export function useSystemWorkspace(options: UseSystemWorkspaceOptions) {
  const [metaDryRun, setMetaDryRun] = useState(true);
  const [metaContext, setMetaContext] = useState<MetaContextPayload | null>(null);
  const [metaAdaptResult, setMetaAdaptResult] = useState<MetaAdaptPayload | null>(null);
  const [askTrustDashboard, setAskTrustDashboard] = useState<AskTrustDashboardPayload | null>(null);
  const [runtimeMetrics, setRuntimeMetrics] = useState<RuntimeMetricsPayload | null>(null);

  async function loadMetaContext(): Promise<QueryResponse | null> {
    const response = await options.runQuery('metaContext');
    if (response?.ok !== false && response?.payload) {
      setMetaContext(response.payload as unknown as MetaContextPayload);
    }
    return response;
  }

  async function runMetaAdapt(): Promise<QueryResponse | null> {
    const response = await options.runQuery('metaAdapt', { dryRun: metaDryRun });
    if (response?.ok !== false && response?.payload) {
      const payload = response.payload as unknown as MetaAdaptPayload;
      setMetaAdaptResult(payload);
      setMetaContext({
        status: 'implemented',
        context: payload.after
      });
    }
    return response;
  }

  function loadOrgStatus(): Promise<QueryResponse | null> {
    return options.loadOrgStatus();
  }

  async function loadAskTrustDashboard(): Promise<QueryResponse | null> {
    const response = await options.runQuery('askTrustDashboard');
    if (response?.ok !== false && response?.payload) {
      setAskTrustDashboard(response.payload as unknown as AskTrustDashboardPayload);
    }
    return response;
  }

  async function loadRuntimeMetrics(): Promise<QueryResponse | null> {
    const response = await options.runQuery('runtimeMetrics');
    if (response?.ok !== false && response?.payload) {
      setRuntimeMetrics(response.payload as unknown as RuntimeMetricsPayload);
    }
    return response;
  }

  return {
    metaDryRun,
    setMetaDryRun,
    metaContext,
    metaAdaptResult,
    askTrustDashboard,
    runtimeMetrics,
    loadMetaContext,
    runMetaAdapt,
    loadOrgStatus,
    loadAskTrustDashboard,
    loadRuntimeMetrics
  };
}
