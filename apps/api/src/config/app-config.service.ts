import { Injectable, type LogLevel } from '@nestjs/common';

@Injectable()
export class AppConfigService {
  constructor() {
    this.validateOptionalString('DATABASE_URL');
    this.validateOptionalString('GRAPH_BACKEND');
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
    this.validateOptionalString('MIN_CONFIDENCE_DEFAULT');
    this.validateOptionalString('ASK_CONSISTENCY_CHECK_ENABLED');
    this.validateOptionalString('ASK_DEFAULT_MODE');
    this.validateOptionalString('LLM_ENABLED');
    this.validateOptionalString('LLM_PROVIDER');
    this.validateOptionalString('LLM_ALLOW_PROVIDER_OVERRIDE');
    this.validateOptionalString('LLM_TIMEOUT_MS');
    this.validateOptionalString('LLM_MAX_OUTPUT_TOKENS');
    this.validateOptionalString('OPENAI_API_KEY');
    this.validateOptionalString('OPENAI_MODEL');
    this.validateOptionalString('OPENAI_BASE_URL');
    this.validateOptionalString('ANTHROPIC_API_KEY');
    this.validateOptionalString('ANTHROPIC_MODEL');
    this.validateOptionalString('ANTHROPIC_BASE_URL');
    this.validateOptionalString('INGEST_UI_METADATA_ENABLED');
    this.validateOptionalString('ORGGRAPH_LOG_LEVEL');
    this.validateOptionalString('ORGGRAPH_HTTP_LOG_ENABLED');
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

  graphBackend(): 'sqlite' | 'postgres' {
    const raw = (process.env.GRAPH_BACKEND || 'sqlite').trim().toLowerCase();
    if (raw !== 'sqlite' && raw !== 'postgres') {
      throw new Error(`Invalid GRAPH_BACKEND: ${raw}`);
    }
    return raw;
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

  minConfidenceDefault(): 'low' | 'medium' | 'high' {
    const raw = (process.env.MIN_CONFIDENCE_DEFAULT || 'medium').trim().toLowerCase();
    if (raw !== 'low' && raw !== 'medium' && raw !== 'high') {
      throw new Error(`Invalid MIN_CONFIDENCE_DEFAULT: ${raw}`);
    }
    return raw as 'low' | 'medium' | 'high';
  }

  askConsistencyCheckEnabled(): boolean {
    return (process.env.ASK_CONSISTENCY_CHECK_ENABLED || 'true').trim().toLowerCase() === 'true';
  }

  askDefaultMode(): 'deterministic' | 'llm_assist' {
    const raw = (process.env.ASK_DEFAULT_MODE || 'deterministic').trim().toLowerCase();
    if (raw !== 'deterministic' && raw !== 'llm_assist') {
      throw new Error(`Invalid ASK_DEFAULT_MODE: ${raw}`);
    }
    return raw;
  }

  llmEnabled(): boolean {
    return (process.env.LLM_ENABLED || 'false').trim().toLowerCase() === 'true';
  }

  llmProvider(): 'none' | 'openai' | 'anthropic' {
    const raw = (process.env.LLM_PROVIDER || 'none').trim().toLowerCase();
    if (raw !== 'none' && raw !== 'openai' && raw !== 'anthropic') {
      throw new Error(`Invalid LLM_PROVIDER: ${raw}`);
    }
    return raw;
  }

  llmAllowProviderOverride(): boolean {
    return (process.env.LLM_ALLOW_PROVIDER_OVERRIDE || 'true').trim().toLowerCase() === 'true';
  }

  llmTimeoutMs(): number {
    return this.readPositiveInt('LLM_TIMEOUT_MS', 12000, 500, 120000);
  }

  llmMaxOutputTokens(): number {
    return this.readPositiveInt('LLM_MAX_OUTPUT_TOKENS', 400, 32, 4096);
  }

  openaiApiKey(): string | undefined {
    return process.env.OPENAI_API_KEY;
  }

  openaiModel(): string {
    return process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
  }

  openaiBaseUrl(): string {
    return process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1/chat/completions';
  }

  anthropicApiKey(): string | undefined {
    return process.env.ANTHROPIC_API_KEY;
  }

  anthropicModel(): string {
    return process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-haiku-20241022';
  }

  anthropicBaseUrl(): string {
    return process.env.ANTHROPIC_BASE_URL?.trim() || 'https://api.anthropic.com/v1/messages';
  }

  ingestUiMetadataEnabled(): boolean {
    return (process.env.INGEST_UI_METADATA_ENABLED || 'false').trim().toLowerCase() === 'true';
  }

  nestLogLevels(): LogLevel[] {
    const raw = (process.env.ORGGRAPH_LOG_LEVEL || 'log,warn,error').trim().toLowerCase();
    const parsed = raw
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0) as LogLevel[];
    const allowed: ReadonlySet<string> = new Set(['log', 'error', 'warn', 'debug', 'verbose', 'fatal']);
    if (parsed.length === 0 || parsed.some((level) => !allowed.has(level))) {
      throw new Error(`Invalid ORGGRAPH_LOG_LEVEL: ${raw}`);
    }
    return parsed;
  }

  httpLogEnabled(): boolean {
    return (process.env.ORGGRAPH_HTTP_LOG_ENABLED || 'false').trim().toLowerCase() === 'true';
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
