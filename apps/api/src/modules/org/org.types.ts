export interface OrgRetrieveRequest {
  runAuth?: boolean;
  runRetrieve?: boolean;
  autoRefresh?: boolean;
}

export interface OrgStepResult {
  step: 'validate' | 'auth' | 'retrieve' | 'refresh';
  status: 'completed' | 'skipped' | 'failed';
  message: string;
  elapsedMs: number;
  meta?: Record<string, string | number | boolean | null>;
}

export interface OrgRetrieveResponse {
  status: 'completed' | 'failed';
  startedAt: string;
  completedAt: string;
  integrationEnabled: boolean;
  authMode: 'cci' | 'sfdx_url' | 'jwt' | 'oauth_refresh_token';
  alias: string;
  projectPath: string;
  manifestPath: string;
  parsePath: string;
  steps: OrgStepResult[];
}

export interface OrgStatusResponse {
  integrationEnabled: boolean;
  authMode: 'cci' | 'sfdx_url' | 'jwt' | 'oauth_refresh_token';
  alias: string;
  cci: {
    installed: boolean;
    version?: string;
    requiredVersion: string;
    versionPinned: boolean;
    message: string;
  };
  sf: {
    installed: boolean;
    message: string;
  };
  session?: OrgSessionStatusResponse;
}

export interface OrgMetadataMember {
  name: string;
}

export interface OrgMetadataTypeSummary {
  type: string;
  memberCount: number;
}

export interface OrgMetadataType extends OrgMetadataTypeSummary {
  members: OrgMetadataMember[];
}

export interface OrgMetadataCatalogResponse {
  source: 'local' | 'cache' | 'mixed';
  refreshedAt: string;
  search?: string;
  totalTypes: number;
  types: OrgMetadataTypeSummary[];
  warnings: string[];
}

export interface OrgMetadataMembersResponse {
  source: 'local' | 'cache' | 'mixed';
  refreshedAt: string;
  type: string;
  search?: string;
  totalMembers: number;
  members: OrgMetadataMember[];
  warnings: string[];
}

export interface OrgMetadataRetrieveRequest {
  selections: Array<{ type: string; members?: string[] }>;
  autoRefresh?: boolean;
}

export interface OrgMetadataRetrieveResponse {
  status: 'completed';
  startedAt: string;
  completedAt: string;
  alias: string;
  parsePath: string;
  metadataArgs: string[];
  autoRefresh: boolean;
  refresh?: {
    nodeCount: number;
    edgeCount: number;
    evidenceCount: number;
  };
}

export interface OrgSessionStatusResponse {
  status: 'connected' | 'disconnected';
  activeAlias: string;
  authMode: 'cci' | 'sfdx_url' | 'jwt' | 'oauth_refresh_token';
  connectedAt?: string;
  disconnectedAt?: string;
  lastError?: string;
}

export interface OrgSessionSwitchRequest {
  alias: string;
}

export interface OrgSessionSwitchResponse {
  status: 'connected';
  activeAlias: string;
  authMode: 'cci' | 'sfdx_url' | 'jwt' | 'oauth_refresh_token';
  switchedAt: string;
}

export interface OrgSessionDisconnectResponse {
  status: 'disconnected';
  activeAlias: string;
  authMode: 'cci' | 'sfdx_url' | 'jwt' | 'oauth_refresh_token';
  disconnectedAt: string;
}

export interface OrgPreflightIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  remediation: string;
}

export interface OrgPreflightResponse {
  ok: boolean;
  integrationEnabled: boolean;
  authMode: 'cci' | 'sfdx_url' | 'jwt' | 'oauth_refresh_token';
  alias: string;
  checks: {
    sfInstalled: boolean;
    cciInstalled: boolean;
    cciVersionPinned: boolean;
    manifestPresent: boolean;
    parsePathPresent: boolean;
    aliasAuthenticated: boolean;
    sessionConnected: boolean;
  };
  issues: OrgPreflightIssue[];
  session: OrgSessionStatusResponse;
}
