export type OrgSessionPayload = {
  status?: string;
  activeAlias?: string;
  authMode?: string;
  connectedAt?: string;
  switchedAt?: string;
  disconnectedAt?: string;
  method?: string;
  lastError?: string;
};

export type OrgAliasSummary = {
  alias: string;
  username?: string;
  orgId?: string;
  instanceUrl?: string;
  isDefault: boolean;
  source: 'sf_cli_keychain';
};

export type OrgSessionAliasesPayload = {
  authMode?: string;
  activeAlias?: string;
  aliases?: OrgAliasSummary[];
};

export type OrgSessionAuditEntry = {
  action?: 'connect' | 'switch' | 'disconnect' | 'switch_failed';
  alias?: string;
  authMode?: string;
  message?: string;
  timestamp?: string;
};

export type OrgSessionHistoryPayload = {
  authMode?: string;
  activeAlias?: string;
  restoreAlias?: string;
  entries?: OrgSessionAuditEntry[];
};

export type OrgStatusPayload = {
  integrationEnabled?: boolean;
  alias?: string;
  authMode?: string;
  cci?: {
    installed?: boolean;
    version?: string;
    requiredVersion?: string;
    versionPinned?: boolean;
    message?: string;
  };
  sf?: { installed?: boolean; message?: string };
  session?: OrgSessionPayload;
};

export type OrgPreflightIssue = {
  code?: string;
  severity?: string;
  message?: string;
  remediation?: string;
};

export type OrgPreflightPayload = {
  ok?: boolean;
  integrationEnabled?: boolean;
  alias?: string;
  authMode?: string;
  checks?: {
    cciInstalled?: boolean;
    cciVersionPinned?: boolean;
    cciAliasAvailable?: boolean;
    sfInstalled?: boolean;
    parsePathPresent?: boolean;
    aliasAuthenticated?: boolean;
    sessionConnected?: boolean;
  };
  issues?: OrgPreflightIssue[];
  session?: OrgSessionPayload;
};

export type GithubSessionIssue = {
  code?: string;
  severity?: 'error' | 'warning';
  message?: string;
  remediation?: string;
};

export type GithubViewerSummary = {
  login: string;
  name?: string;
  url?: string;
};

export type GithubRepoSummary = {
  owner: string;
  name: string;
  fullName: string;
  description?: string;
  visibility: 'public' | 'private' | 'internal';
  private: boolean;
  url?: string;
  cloneUrl?: string;
  defaultBranch?: string;
  selected?: boolean;
};

export type GithubSelectedRepo = GithubRepoSummary & {
  selectedAt?: string;
};

export type GithubBranchSummary = {
  name: string;
  protected: boolean;
  url?: string;
  lastCommitSha?: string;
  lastCommitUrl?: string;
};

export type GithubPullRequestSummary = {
  number: number;
  title: string;
  state: 'open';
  url?: string;
  author?: string;
  draft: boolean;
  headRef?: string;
  baseRef?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type GithubPullRequestScopeSummary = {
  number: number;
  title: string;
  state: 'open' | 'closed';
  url?: string;
  author?: string;
  draft: boolean;
  headRef?: string;
  baseRef?: string;
  createdAt?: string;
  updatedAt?: string;
  changedFileCount?: number;
};

export type GithubPullRequestFileSummary = {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied' | 'changed';
  additions: number;
  deletions: number;
  changes: number;
  previousFilename?: string;
  blobUrl?: string;
  rawUrl?: string;
  patchTruncated?: boolean;
};

export type GithubSessionPayload = {
  status?: 'authenticated' | 'unauthenticated';
  hostname?: string;
  cliInstalled?: boolean;
  authSource?: 'env_token' | 'gh_cli' | 'none';
  viewer?: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepo;
  issues?: GithubSessionIssue[];
};

export type GithubRepoListPayload = {
  status?: 'loaded';
  hostname?: string;
  viewer?: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepo;
  repos?: GithubRepoSummary[];
};

export type GithubRepoContextPayload = {
  status?: 'loaded';
  hostname?: string;
  viewer?: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepo;
  repo?: GithubRepoSummary;
  branches?: GithubBranchSummary[];
  pullRequests?: GithubPullRequestSummary[];
};

export type GithubPullRequestFileScopePayload = {
  status?: 'loaded';
  hostname?: string;
  viewer?: GithubViewerSummary;
  selectedRepo?: GithubSelectedRepo;
  repo?: GithubRepoSummary;
  pullRequest?: GithubPullRequestScopeSummary;
  files?: GithubPullRequestFileSummary[];
  totalCount?: number;
  truncated?: boolean;
};
