'use client';

export type AnalyzeMode = 'perms' | 'automation' | 'impact' | 'system';

export type MappingStatus = 'resolved' | 'unmapped_user' | 'map_missing';

export interface GraphStep {
  from: string;
  rel: string;
  to: string;
}

export interface PermissionPath {
  principal: string;
  object: string;
  path: GraphStep[];
}

export interface SystemPermissionPath {
  principal: string;
  permission: string;
  path: GraphStep[];
}

export interface PermissionAnalysisResult {
  user: string;
  object: string;
  field?: string;
  principalsChecked: string[];
  paths: PermissionPath[];
  granted: boolean;
  objectGranted: boolean;
  fieldGranted?: boolean;
  totalPaths: number;
  truncated: boolean;
  explanation: string;
  mappingStatus: MappingStatus;
  warnings: string[];
}

export interface PermissionDiagnosisResult {
  user: string;
  mapPath: string;
  mapExists: boolean;
  mapModifiedAt?: string;
  mapAgeHours?: number;
  staleThresholdHours: number;
  stale: boolean;
  principals: string[];
  mappingStatus: MappingStatus;
  warnings: string[];
}

export interface SystemPermissionResult {
  user: string;
  permission: string;
  principalsChecked: string[];
  paths: SystemPermissionPath[];
  granted: boolean;
  totalPaths: number;
  truncated: boolean;
  explanation: string;
  mappingStatus: MappingStatus;
  warnings: string[];
}

export interface AutomationResult {
  object: string;
  relationsChecked: string[];
  automations: Array<{
    type: string;
    name: string;
    rel: string;
    confidence: 'high' | 'medium' | 'low';
    score: number;
  }>;
  totalAutomations: number;
  truncated: boolean;
  explanation: string;
  strictMode: boolean;
  minConfidenceApplied: 'low' | 'medium' | 'high';
  explainMode: boolean;
  status: 'scaffold' | 'implemented';
}

export interface ImpactResult {
  field: string;
  relationsChecked: string[];
  paths: Array<{
    from: string;
    rel: string;
    to: string;
    confidence: 'high' | 'medium' | 'low';
    score: number;
  }>;
  totalPaths: number;
  truncated: boolean;
  explanation: string;
  strictMode: boolean;
  minConfidenceApplied: 'low' | 'medium' | 'high';
  explainMode: boolean;
  status: 'implemented';
}
