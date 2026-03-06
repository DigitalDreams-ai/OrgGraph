export type OrgAuthMode = 'sf_cli_keychain';

export interface OrgRetrieveRequest {
  alias?: string;
  runAuth?: boolean;
  runRetrieve?: boolean;
  autoRefresh?: boolean;
  selections?: Array<{ type: string; members?: string[] }>;
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
  authMode: OrgAuthMode;
  alias: string;
  projectPath: string;
  parsePath: string;
  metadataArgs?: string[];
  steps: OrgStepResult[];
}

export interface OrgStatusResponse {
  integrationEnabled: boolean;
  authMode: OrgAuthMode;
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
  source: 'local' | 'cache' | 'metadata_api' | 'mixed';
  refreshedAt: string;
  search?: string;
  totalTypes: number;
  types: OrgMetadataTypeSummary[];
  warnings: string[];
}

export interface OrgMetadataMembersResponse {
  source: 'local' | 'cache' | 'metadata_api' | 'mixed';
  refreshedAt: string;
  type: string;
  search?: string;
  totalMembers: number;
  members: OrgMetadataMember[];
  warnings: string[];
}

export interface OrgMetadataSearchResult {
  kind: 'type' | 'member';
  type: string;
  name: string;
  matchField: 'type' | 'member';
}

export interface OrgMetadataSearchResponse {
  source: 'local' | 'cache' | 'metadata_api' | 'mixed';
  refreshedAt: string;
  search: string;
  totalResults: number;
  results: OrgMetadataSearchResult[];
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
  authMode: OrgAuthMode;
  connectedAt?: string;
  disconnectedAt?: string;
  lastError?: string;
}

export interface OrgAliasSummary {
  alias: string;
  username?: string;
  orgId?: string;
  instanceUrl?: string;
  isDefault: boolean;
  source: 'sf_cli_keychain';
}

export interface OrgSessionAliasesResponse {
  authMode: OrgAuthMode;
  activeAlias: string;
  aliases: OrgAliasSummary[];
}

export interface OrgSessionAuditEntry {
  action: 'connect' | 'switch' | 'disconnect' | 'switch_failed';
  alias: string;
  authMode: OrgAuthMode;
  message: string;
  timestamp: string;
}

export interface OrgSessionHistoryResponse {
  authMode: OrgAuthMode;
  activeAlias: string;
  restoreAlias?: string;
  entries: OrgSessionAuditEntry[];
}

export interface OrgSessionAliasValidationResponse {
  alias: string;
  authMode: OrgAuthMode;
  sessionConnected: boolean;
  sfAccessible: boolean;
  cciAvailable: boolean;
  username?: string;
  orgId?: string;
  instanceUrl?: string;
  issues: OrgPreflightIssue[];
}

export interface OrgSessionSwitchRequest {
  alias: string;
}

export interface OrgSessionConnectRequest {
  alias?: string;
}

export interface OrgSessionBridgeRequest {
  alias?: string;
}

export interface OrgSessionConnectResponse {
  status: 'connected';
  activeAlias: string;
  authMode: OrgAuthMode;
  connectedAt: string;
  method: 'sf_cli_keychain';
}

export interface OrgSessionSwitchResponse {
  status: 'connected';
  activeAlias: string;
  authMode: OrgAuthMode;
  switchedAt: string;
}

export interface OrgSessionDisconnectResponse {
  status: 'disconnected';
  activeAlias: string;
  authMode: OrgAuthMode;
  disconnectedAt: string;
}

export interface OrgSessionBridgeResponse {
  status: 'connected' | 'already_connected';
  alias: string;
  authMode: OrgAuthMode;
  bridgedAt: string;
  message: string;
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
  authMode: OrgAuthMode;
  alias: string;
  checks: {
    cciInstalled: boolean;
    cciVersionPinned: boolean;
    cciAliasAvailable: boolean;
    sfInstalled: boolean;
    parsePathPresent: boolean;
    aliasAuthenticated: boolean;
    sessionConnected: boolean;
  };
  issues: OrgPreflightIssue[];
  session: OrgSessionStatusResponse;
}
