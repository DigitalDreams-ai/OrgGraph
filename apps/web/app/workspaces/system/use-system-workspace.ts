'use client';

import { useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';

interface UseSystemWorkspaceOptions {
  runQuery: (kind: 'metaContext' | 'metaAdapt', payload?: Record<string, unknown>) => Promise<QueryResponse | null>;
  loadOrgStatus: () => Promise<QueryResponse | null>;
}

export function useSystemWorkspace(options: UseSystemWorkspaceOptions) {
  const [metaDryRun, setMetaDryRun] = useState(true);

  function loadMetaContext(): Promise<QueryResponse | null> {
    return options.runQuery('metaContext');
  }

  function runMetaAdapt(): Promise<QueryResponse | null> {
    return options.runQuery('metaAdapt', { dryRun: metaDryRun });
  }

  function loadOrgStatus(): Promise<QueryResponse | null> {
    return options.loadOrgStatus();
  }

  return {
    metaDryRun,
    setMetaDryRun,
    loadMetaContext,
    runMetaAdapt,
    loadOrgStatus
  };
}
