export type OrgSessionPayload = {
  status?: string;
  activeAlias?: string;
  authMode?: string;
  connectedAt?: string;
  disconnectedAt?: string;
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

export type OrgPreflightPayload = {
  ok?: boolean;
  checks?: {
    cciInstalled?: boolean;
    cciVersionPinned?: boolean;
    cciAliasAvailable?: boolean;
    sfInstalled?: boolean;
    parsePathPresent?: boolean;
    aliasAuthenticated?: boolean;
    sessionConnected?: boolean;
  };
  issues?: Array<{ code?: string; severity?: string; message?: string; remediation?: string }>;
};
