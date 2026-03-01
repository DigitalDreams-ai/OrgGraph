'use client';

import { useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import type { AnalyzeMode } from './analyze-workspace';

interface UseAnalyzeWorkspaceOptions {
  runQuery: (kind: 'perms' | 'permsDiagnose' | 'automation' | 'impact' | 'permsSystem', payload?: Record<string, unknown>) => Promise<QueryResponse | null>;
  parseOptionalInt: (raw: string) => number | undefined;
  limitRaw: string;
  includeLowConfidence: boolean;
}

export function useAnalyzeWorkspace(options: UseAnalyzeWorkspaceOptions) {
  const [analyzeMode, setAnalyzeMode] = useState<AnalyzeMode>('perms');
  const [user, setUser] = useState('sbingham@shulman-hill.com.uat');
  const [objectName, setObjectName] = useState('Opportunity');
  const [fieldName, setFieldName] = useState('Opportunity.StageName');
  const [systemPermission, setSystemPermission] = useState('ApproveUninstalledConnectedApps');
  const [strictMode, setStrictMode] = useState(true);
  const [explainMode, setExplainMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  function runPermissions(): Promise<QueryResponse | null> {
    return options.runQuery('perms', {
      user,
      object: objectName,
      field: fieldName,
      limit: options.parseOptionalInt(options.limitRaw)
    });
  }

  function diagnoseUserMapping(): Promise<QueryResponse | null> {
    return options.runQuery('permsDiagnose', { user });
  }

  function runAutomationAnalysis(): Promise<QueryResponse | null> {
    return options.runQuery('automation', {
      object: objectName,
      limit: options.parseOptionalInt(options.limitRaw),
      strict: strictMode,
      explain: explainMode,
      includeLowConfidence: options.includeLowConfidence
    });
  }

  function runImpactAnalysis(): Promise<QueryResponse | null> {
    return options.runQuery('impact', {
      field: fieldName,
      limit: options.parseOptionalInt(options.limitRaw),
      strict: strictMode,
      explain: explainMode,
      debug: debugMode,
      includeLowConfidence: options.includeLowConfidence
    });
  }

  function runSystemPermissionCheck(): Promise<QueryResponse | null> {
    return options.runQuery('permsSystem', {
      user,
      permission: systemPermission,
      limit: options.parseOptionalInt(options.limitRaw)
    });
  }

  return {
    analyzeMode,
    setAnalyzeMode,
    user,
    setUser,
    objectName,
    setObjectName,
    fieldName,
    setFieldName,
    systemPermission,
    setSystemPermission,
    strictMode,
    setStrictMode,
    explainMode,
    setExplainMode,
    debugMode,
    setDebugMode,
    runPermissions,
    diagnoseUserMapping,
    runAutomationAnalysis,
    runImpactAnalysis,
    runSystemPermissionCheck
  };
}
