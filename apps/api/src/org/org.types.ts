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
  authMode: 'sfdx_url' | 'jwt' | 'oauth_refresh_token';
  alias: string;
  projectPath: string;
  manifestPath: string;
  parsePath: string;
  steps: OrgStepResult[];
}
