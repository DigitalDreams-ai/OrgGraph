import { Injectable } from '@nestjs/common';

@Injectable()
export class AppConfigService {
  constructor() {
    this.validateOptionalString('DATABASE_URL');
    this.validateOptionalString('PERMISSIONS_FIXTURES_PATH');
    this.validateOptionalString('USER_PROFILE_MAP_PATH');
    this.validateOptionalString('EVIDENCE_INDEX_PATH');
    this.validateOptionalString('REFRESH_STATE_PATH');
    this.validateOptionalString('REFRESH_AUDIT_PATH');
    this.validateOptionalString('ONTOLOGY_REPORT_PATH');
    this.validateOptionalString('SF_INTEGRATION_ENABLED');
    this.validateOptionalString('SF_AUTH_MODE');
    this.validateOptionalString('SF_AUTH_URL_PATH');
    this.validateOptionalString('SF_ALIAS');
    this.validateOptionalString('SF_CLIENT_ID');
    this.validateOptionalString('SF_JWT_KEY_PATH');
    this.validateOptionalString('SF_USERNAME');
    this.validateOptionalString('SF_BASE_URL');
    this.validateOptionalString('SF_CLIENT_SECRET');
    this.validateOptionalString('SF_REDIRECT_URI');
    this.validateOptionalString('SF_AUTH_CODE_PATH');
    this.validateOptionalString('SF_TOKEN_STORE_PATH');
    this.validateOptionalString('SF_PROJECT_PATH');
    this.validateOptionalString('SF_MANIFEST_PATH');
    this.validateOptionalString('SF_PARSE_PATH');
    this.validateOptionalString('SF_WAIT_MINUTES');
    this.validateOptionalString('SF_RETRY_COUNT');
    this.validateOptionalString('SF_RETRY_DELAY_MS');
    this.validateOptionalString('SF_TIMEOUT_SECONDS');
    this.validateOptionalString('SF_AUTO_REFRESH_AFTER_RETRIEVE');
    this.validateOptionalString('PORT');
  }

  port(): number {
    const raw = process.env.PORT;
    if (!raw) {
      return 3000;
    }

    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
      throw new Error(`Invalid PORT: ${raw}`);
    }

    return value;
  }

  databaseUrl(): string | undefined {
    return process.env.DATABASE_URL;
  }

  permissionsFixturesPath(): string | undefined {
    return process.env.PERMISSIONS_FIXTURES_PATH;
  }

  userProfileMapPath(): string | undefined {
    return process.env.USER_PROFILE_MAP_PATH;
  }

  evidenceIndexPath(): string | undefined {
    return process.env.EVIDENCE_INDEX_PATH;
  }

  refreshStatePath(): string | undefined {
    return process.env.REFRESH_STATE_PATH;
  }

  refreshAuditPath(): string | undefined {
    return process.env.REFRESH_AUDIT_PATH;
  }

  ontologyReportPath(): string | undefined {
    return process.env.ONTOLOGY_REPORT_PATH;
  }

  sfIntegrationEnabled(): boolean {
    return (process.env.SF_INTEGRATION_ENABLED || 'false').trim().toLowerCase() === 'true';
  }

  sfAuthMode(): 'sfdx_url' | 'jwt' | 'oauth_refresh_token' {
    const mode = (process.env.SF_AUTH_MODE || 'oauth_refresh_token').trim().toLowerCase();
    if (mode !== 'sfdx_url' && mode !== 'jwt' && mode !== 'oauth_refresh_token') {
      throw new Error(`Invalid SF_AUTH_MODE: ${mode}`);
    }
    return mode as 'sfdx_url' | 'jwt' | 'oauth_refresh_token';
  }

  sfAuthUrlPath(): string | undefined {
    return process.env.SF_AUTH_URL_PATH;
  }

  sfAlias(): string {
    return process.env.SF_ALIAS?.trim() || 'orggraph-sandbox';
  }

  sfClientId(): string | undefined {
    return process.env.SF_CLIENT_ID;
  }

  sfJwtKeyPath(): string | undefined {
    return process.env.SF_JWT_KEY_PATH;
  }

  sfUsername(): string | undefined {
    return process.env.SF_USERNAME;
  }

  sfBaseUrl(): string {
    return process.env.SF_BASE_URL?.trim() || 'https://test.salesforce.com';
  }

  sfClientSecret(): string | undefined {
    return process.env.SF_CLIENT_SECRET;
  }

  sfRedirectUri(): string | undefined {
    return process.env.SF_REDIRECT_URI;
  }

  sfAuthCodePath(): string | undefined {
    return process.env.SF_AUTH_CODE_PATH;
  }

  sfTokenStorePath(): string | undefined {
    return process.env.SF_TOKEN_STORE_PATH;
  }

  sfProjectPath(): string | undefined {
    return process.env.SF_PROJECT_PATH;
  }

  sfManifestPath(): string | undefined {
    return process.env.SF_MANIFEST_PATH;
  }

  sfParsePath(): string | undefined {
    return process.env.SF_PARSE_PATH;
  }

  sfWaitMinutes(): number {
    return this.readPositiveInt('SF_WAIT_MINUTES', 15, 1, 120);
  }

  sfRetryCount(): number {
    return this.readPositiveInt('SF_RETRY_COUNT', 2, 0, 5);
  }

  sfRetryDelayMs(): number {
    return this.readPositiveInt('SF_RETRY_DELAY_MS', 1500, 100, 60000);
  }

  sfTimeoutSeconds(): number {
    return this.readPositiveInt('SF_TIMEOUT_SECONDS', 900, 30, 7200);
  }

  sfAutoRefreshAfterRetrieve(): boolean {
    return (process.env.SF_AUTO_REFRESH_AFTER_RETRIEVE || 'true').trim().toLowerCase() === 'true';
  }

  private readPositiveInt(
    name: string,
    fallback: number,
    min: number,
    max: number
  ): number {
    const raw = process.env[name];
    if (!raw) {
      return fallback;
    }

    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`Invalid ${name}: ${raw}`);
    }
    return value;
  }

  private validateOptionalString(name: string): void {
    const value = process.env[name];
    if (value === undefined) {
      return;
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`Invalid ${name}: expected non-empty string`);
    }
  }
}
