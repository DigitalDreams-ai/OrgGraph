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
