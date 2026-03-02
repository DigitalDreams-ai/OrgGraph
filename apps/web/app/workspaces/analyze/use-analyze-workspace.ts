'use client';

import { useState } from 'react';
import type { QueryResponse } from '../../lib/ask-client';
import type {
  AnalyzeMode,
  AutomationResult,
  ImpactResult,
  PermissionAnalysisResult,
  PermissionDiagnosisResult,
  SystemPermissionResult
} from './types';

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
  const [permissionsResult, setPermissionsResult] = useState<PermissionAnalysisResult | null>(null);
  const [permissionDiagnosis, setPermissionDiagnosis] = useState<PermissionDiagnosisResult | null>(null);
  const [automationResult, setAutomationResult] = useState<AutomationResult | null>(null);
  const [impactResult, setImpactResult] = useState<ImpactResult | null>(null);
  const [systemPermissionResult, setSystemPermissionResult] = useState<SystemPermissionResult | null>(null);

  function resolvePayload<T>(response: QueryResponse | null): T | null {
    if (!response || response.ok === false || !response.payload) {
      return null;
    }
    return response.payload as T;
  }

  async function runPermissions(): Promise<QueryResponse | null> {
    const response = await options.runQuery('perms', {
      user,
      object: objectName,
      field: fieldName,
      limit: options.parseOptionalInt(options.limitRaw)
    });
    const payload = resolvePayload<PermissionAnalysisResult>(response);
    if (payload) {
      setPermissionsResult(payload);
    }
    return response;
  }

  async function diagnoseUserMapping(): Promise<QueryResponse | null> {
    const response = await options.runQuery('permsDiagnose', { user });
    const payload = resolvePayload<PermissionDiagnosisResult>(response);
    if (payload) {
      setPermissionDiagnosis(payload);
    }
    return response;
  }

  async function runAutomationAnalysis(): Promise<QueryResponse | null> {
    const response = await options.runQuery('automation', {
      object: objectName,
      limit: options.parseOptionalInt(options.limitRaw),
      strict: strictMode,
      explain: explainMode,
      includeLowConfidence: options.includeLowConfidence
    });
    const payload = resolvePayload<AutomationResult>(response);
    if (payload) {
      setAutomationResult(payload);
    }
    return response;
  }

  async function runImpactAnalysis(): Promise<QueryResponse | null> {
    const response = await options.runQuery('impact', {
      field: fieldName,
      limit: options.parseOptionalInt(options.limitRaw),
      strict: strictMode,
      explain: explainMode,
      debug: debugMode,
      includeLowConfidence: options.includeLowConfidence
    });
    const payload = resolvePayload<ImpactResult>(response);
    if (payload) {
      setImpactResult(payload);
    }
    return response;
  }

  async function runSystemPermissionCheck(): Promise<QueryResponse | null> {
    const response = await options.runQuery('permsSystem', {
      user,
      permission: systemPermission,
      limit: options.parseOptionalInt(options.limitRaw)
    });
    const payload = resolvePayload<SystemPermissionResult>(response);
    if (payload) {
      setSystemPermissionResult(payload);
    }
    return response;
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
    permissionsResult,
    permissionDiagnosis,
    automationResult,
    impactResult,
    systemPermissionResult,
    runPermissions,
    diagnoseUserMapping,
    runAutomationAnalysis,
    runImpactAnalysis,
    runSystemPermissionCheck
  };
}
