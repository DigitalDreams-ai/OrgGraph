import { Injectable, type LogLevel } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';

@Injectable()
export class AppConfigService {
  private static readonly CONFIG_PATH_KEYS = new Set([
    'DATABASE_URL',
    'PERMISSIONS_FIXTURES_PATH',
    'USER_PROFILE_MAP_PATH',
    'EVIDENCE_INDEX_PATH',
    'REFRESH_STATE_PATH',
    'REFRESH_AUDIT_PATH',
    'ONTOLOGY_REPORT_PATH',
    'ASK_PROOF_STORE_PATH',
    'ASK_METRICS_PATH',
    'META_CONTEXT_PATH',
    'SEMANTIC_SNAPSHOT_PATH',
    'SF_PROJECT_PATH',
    'SF_PARSE_PATH'
  ]);

  constructor() {
    this.applyConfigFileDefaults();

    this.validateOptionalString('ORGUMENTED_CONFIG_PATH');
    this.validateOptionalString('ORGUMENTED_APP_DATA_ROOT');
    this.validateOptionalString('DATABASE_URL');
    this.validateOptionalString('GRAPH_BACKEND');
    this.validateOptionalString('PERMISSIONS_FIXTURES_PATH');
    this.validateOptionalString('USER_PROFILE_MAP_PATH');
    this.validateOptionalString('EVIDENCE_INDEX_PATH');
    this.validateOptionalString('REFRESH_STATE_PATH');
    this.validateOptionalString('REFRESH_AUDIT_PATH');
    this.validateOptionalString('ONTOLOGY_REPORT_PATH');
    this.validateOptionalString('ASK_PROOF_STORE_PATH');
    this.validateOptionalString('ASK_METRICS_PATH');
    this.validateOptionalString('META_CONTEXT_PATH');
    this.validateOptionalString('ORGUMENTED_BOOTSTRAP_ON_STARTUP');
    this.validateOptionalString('ASK_GROUNDING_SCORE_THRESHOLD');
    this.validateOptionalString('ASK_CONSTRAINT_SATISFACTION_THRESHOLD');
    this.validateOptionalString('ASK_AMBIGUITY_MAX_THRESHOLD');
    this.validateOptionalString('SEMANTIC_SNAPSHOT_PATH');
    this.validateOptionalString('DRIFT_BUDGET_ENFORCE_ON_REFRESH');
    this.validateOptionalString('DRIFT_BUDGET_OBJECT_NODE_DELTA_MAX');
    this.validateOptionalString('DRIFT_BUDGET_FIELD_NODE_DELTA_MAX');
    this.validateOptionalString('DRIFT_BUDGET_RELATION_DELTA_MAX');
    this.validateOptionalString('DRIFT_BUDGET_POLICY_NODE_DELTA_MAX');
    this.validateOptionalString('DRIFT_BUDGET_AUTOMATION_NODE_DELTA_MAX');
    this.validateOptionalString('DRIFT_BUDGET_UI_NODE_DELTA_MAX');
    this.validateOptionalString('DRIFT_BUDGET_TOTAL_NODE_DELTA_MAX');
    this.validateOptionalString('DRIFT_BUDGET_TOTAL_EDGE_DELTA_MAX');
    this.validateOptionalString('DRIFT_ALLOWLIST_NODE_TYPES');
    this.validateOptionalString('DRIFT_ALLOWLIST_RELATIONS');
    this.validateOptionalString('SF_INTEGRATION_ENABLED');
    this.validateOptionalString('CCI_VERSION_PIN');
    this.validateOptionalString('SF_ALIAS');
    this.validateOptionalString('SF_BASE_URL');
    this.validateOptionalString('SF_PROJECT_PATH');
    this.validateOptionalString('SF_PARSE_PATH');
    this.validateOptionalString('SF_WAIT_MINUTES');
    this.validateOptionalString('SF_RETRY_COUNT');
    this.validateOptionalString('SF_RETRY_DELAY_MS');
    this.validateOptionalString('SF_TIMEOUT_SECONDS');
    this.validateOptionalString('SF_AUTO_REFRESH_AFTER_RETRIEVE');
    this.validateOptionalString('MIN_CONFIDENCE_DEFAULT');
    this.validateOptionalString('ASK_CONSISTENCY_CHECK_ENABLED');
    this.validateOptionalString('ASK_LLM_MAX_LATENCY_MS');
    this.validateOptionalString('ASK_LLM_COST_BUDGET_USD');
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
    this.validateOptionalString('ORGUMENTED_LOG_LEVEL');
    this.validateOptionalString('ORGUMENTED_HTTP_LOG_ENABLED');
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

  orgumentedAppDataRoot(): string | undefined {
    return process.env.ORGUMENTED_APP_DATA_ROOT;
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

  askProofStorePath(): string | undefined {
    return process.env.ASK_PROOF_STORE_PATH;
  }

  askMetricsPath(): string | undefined {
    return process.env.ASK_METRICS_PATH;
  }

  metaContextPath(): string | undefined {
    return process.env.META_CONTEXT_PATH;
  }

  runtimeBootstrapOnStartup(): boolean {
    return (process.env.ORGUMENTED_BOOTSTRAP_ON_STARTUP || 'false').trim().toLowerCase() === 'true';
  }

  askGroundingScoreThreshold(): number {
    return this.readFloatInRange('ASK_GROUNDING_SCORE_THRESHOLD', 0.65, 0, 1);
  }

  askConstraintSatisfactionThreshold(): number {
    return this.readFloatInRange('ASK_CONSTRAINT_SATISFACTION_THRESHOLD', 0.9, 0, 1);
  }

  askAmbiguityMaxThreshold(): number {
    return this.readFloatInRange('ASK_AMBIGUITY_MAX_THRESHOLD', 0.45, 0, 1);
  }

  semanticSnapshotPath(): string | undefined {
    return process.env.SEMANTIC_SNAPSHOT_PATH;
  }

  driftBudgetEnforceOnRefresh(): boolean {
    return (process.env.DRIFT_BUDGET_ENFORCE_ON_REFRESH || 'true').trim().toLowerCase() === 'true';
  }

  driftBudgetObjectNodeDeltaMax(): number {
    return this.readPositiveInt('DRIFT_BUDGET_OBJECT_NODE_DELTA_MAX', 25, 0, 1000000);
  }

  driftBudgetFieldNodeDeltaMax(): number {
    return this.readPositiveInt('DRIFT_BUDGET_FIELD_NODE_DELTA_MAX', 400, 0, 1000000);
  }

  driftBudgetRelationDeltaMax(): number {
    return this.readPositiveInt('DRIFT_BUDGET_RELATION_DELTA_MAX', 1200, 0, 1000000);
  }

  driftBudgetPolicyNodeDeltaMax(): number {
    return this.readPositiveInt('DRIFT_BUDGET_POLICY_NODE_DELTA_MAX', 300, 0, 1000000);
  }

  driftBudgetAutomationNodeDeltaMax(): number {
    return this.readPositiveInt('DRIFT_BUDGET_AUTOMATION_NODE_DELTA_MAX', 300, 0, 1000000);
  }

  driftBudgetUiNodeDeltaMax(): number {
    return this.readPositiveInt('DRIFT_BUDGET_UI_NODE_DELTA_MAX', 300, 0, 1000000);
  }

  driftBudgetTotalNodeDeltaMax(): number {
    return this.readPositiveInt('DRIFT_BUDGET_TOTAL_NODE_DELTA_MAX', 1600, 0, 1000000);
  }

  driftBudgetTotalEdgeDeltaMax(): number {
    return this.readPositiveInt('DRIFT_BUDGET_TOTAL_EDGE_DELTA_MAX', 6000, 0, 1000000);
  }

  driftAllowlistNodeTypes(): string[] {
    return (process.env.DRIFT_ALLOWLIST_NODE_TYPES || '')
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .sort((a, b) => a.localeCompare(b));
  }

  driftAllowlistRelations(): string[] {
    return (process.env.DRIFT_ALLOWLIST_RELATIONS || '')
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0)
      .sort((a, b) => a.localeCompare(b));
  }

  sfIntegrationEnabled(): boolean {
    return (process.env.SF_INTEGRATION_ENABLED || 'false').trim().toLowerCase() === 'true';
  }

  sfAuthMode(): 'sf_cli_keychain' {
    return 'sf_cli_keychain';
  }

  cciVersionPin(): string {
    return process.env.CCI_VERSION_PIN?.trim() || '4.5.0';
  }

  sfAlias(): string {
    return process.env.SF_ALIAS?.trim() || 'orgumented-sandbox';
  }

  sfBaseUrl(): string {
    return process.env.SF_BASE_URL?.trim() || 'https://test.salesforce.com';
  }

  sfProjectPath(): string | undefined {
    return process.env.SF_PROJECT_PATH;
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

  askLlmMaxLatencyMs(): number {
    return this.readPositiveInt('ASK_LLM_MAX_LATENCY_MS', 12000, 500, 120000);
  }

  askLlmCostBudgetUsd(): number {
    return this.readFloatInRange('ASK_LLM_COST_BUDGET_USD', 0.02, 0, 5);
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
    const raw = (process.env.ORGUMENTED_LOG_LEVEL || 'log,warn,error').trim().toLowerCase();
    const parsed = raw
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0) as LogLevel[];
    const allowed: ReadonlySet<string> = new Set(['log', 'error', 'warn', 'debug', 'verbose', 'fatal']);
    if (parsed.length === 0 || parsed.some((level) => !allowed.has(level))) {
      throw new Error(`Invalid ORGUMENTED_LOG_LEVEL: ${raw}`);
    }
    return parsed;
  }

  httpLogEnabled(): boolean {
    return (process.env.ORGUMENTED_HTTP_LOG_ENABLED || 'false').trim().toLowerCase() === 'true';
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

  private readFloatInRange(
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
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error(`Invalid ${name}: ${raw}`);
    }
    return value;
  }

  private validateOptionalString(name: string): void {
    const value = process.env[name];
    if (value === undefined) {
      return;
    }

    if (typeof value !== 'string') {
      throw new Error(`Invalid ${name}: expected string`);
    }
  }

  private applyConfigFileDefaults(): void {
    const configPathRaw = process.env.ORGUMENTED_CONFIG_PATH?.trim();
    if (!configPathRaw) {
      return;
    }

    const configPath = isAbsolute(configPathRaw) ? configPathRaw : resolve(process.cwd(), configPathRaw);
    if (!existsSync(configPath)) {
      throw new Error(`ORGUMENTED_CONFIG_PATH not found: ${configPath}`);
    }
    const configDir = dirname(configPath);

    const raw = readFileSync(configPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error(`ORGUMENTED_CONFIG_PATH must contain a JSON object: ${configPath}`);
    }

    const entries = Object.entries(parsed as Record<string, unknown>);
    for (const [key, value] of entries) {
      if (value === null || value === undefined) {
        continue;
      }
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        throw new Error(`Invalid config value type for ${key} in ${configPath}`);
      }

      const existing = process.env[key];
      if (existing === undefined || existing.trim() === '') {
        process.env[key] = this.resolveConfigValue(configDir, key, value);
      }
    }
  }

  private resolveConfigValue(configDir: string, key: string, value: string | number | boolean): string {
    const normalized = String(value);
    if (!AppConfigService.CONFIG_PATH_KEYS.has(key) || normalized.trim().length === 0) {
      return normalized;
    }

    if (key === 'DATABASE_URL') {
      if (!normalized.startsWith('file:')) {
        return normalized;
      }

      const databasePath = normalized.slice(5);
      if (databasePath.trim().length === 0 || isAbsolute(databasePath)) {
        return normalized;
      }
      return `file:${resolve(configDir, databasePath)}`;
    }

    if (isAbsolute(normalized)) {
      return normalized;
    }
    return resolve(configDir, normalized);
  }
}
