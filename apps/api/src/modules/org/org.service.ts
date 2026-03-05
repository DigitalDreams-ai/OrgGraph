import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { AppConfigService } from '../../config/app-config.service';
import { RuntimePathsService } from '../../config/runtime-paths.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { OrgToolAdapterService } from './org-tool-adapter.service';
import type {
  OrgMetadataCatalogResponse,
  OrgMetadataMembersResponse,
  OrgMetadataSearchResponse,
  OrgMetadataRetrieveRequest,
  OrgMetadataRetrieveResponse,
  OrgPreflightResponse,
  OrgRetrieveRequest,
  OrgRetrieveResponse,
  OrgSessionAliasValidationResponse,
  OrgSessionAliasesResponse,
  OrgSessionAuditEntry,
  OrgSessionDisconnectResponse,
  OrgSessionConnectRequest,
  OrgSessionConnectResponse,
  OrgSessionHistoryResponse,
  OrgSessionStatusResponse,
  OrgSessionSwitchResponse,
  OrgStatusResponse,
  OrgStepResult,
  OrgAuthMode
} from './org.types';

@Injectable()
export class OrgService {
  private readonly logger = new Logger(OrgService.name);
  private static readonly LIVE_METADATA_CATALOG_TYPES = [
    'CustomObject',
    'Layout',
    'ApexClass',
    'ApexTrigger',
    'Flow',
    'CustomTab',
    'RecordType',
    'FlexiPage'
  ];
  private static readonly LIVE_METADATA_SEARCH_ONLY_TYPES = ['CustomField'];

  constructor(
    private readonly configService: AppConfigService,
    private readonly runtimePaths: RuntimePathsService,
    private readonly ingestionService: IngestionService,
    private readonly orgToolAdapter: OrgToolAdapterService
  ) {}

  async status(): Promise<OrgStatusResponse> {
    const integrationEnabled = this.configService.sfIntegrationEnabled();
    const authMode = this.configService.sfAuthMode();
    const alias = this.resolveActiveAlias();
    const projectPath = this.runtimePaths.sfProjectPath();
    this.ensureProjectScaffold(projectPath);

    const sfProbe = await this.orgToolAdapter.probeSf(projectPath);
    const cciProbe = await this.orgToolAdapter.probeCci(projectPath);
    const cciVersion = this.orgToolAdapter.extractCciVersion(cciProbe.stdout, cciProbe.stderr);
    const cciRequiredVersion = this.configService.cciVersionPin();
    const cciVersionPinned = cciVersion !== undefined && cciVersion === cciRequiredVersion;

    return {
      integrationEnabled,
      authMode,
      alias,
      cci: {
        installed: cciProbe.exitCode === 0,
        version: cciVersion,
        requiredVersion: cciRequiredVersion,
        versionPinned: cciVersionPinned,
        message:
          cciProbe.exitCode === 0
            ? cciVersionPinned
              ? `cci available and version-pinned (${cciRequiredVersion})`
              : `cci available but version mismatch (found ${cciVersion ?? 'unknown'}, expected ${cciRequiredVersion})`
            : 'cci not found in PATH'
      },
      sf: {
        installed: sfProbe.exitCode === 0,
        message: sfProbe.exitCode === 0 ? 'sf CLI available' : 'sf CLI not found in PATH'
      },
      session: this.sessionStatus()
    };
  }

  async preflight(aliasOverride?: string): Promise<OrgPreflightResponse> {
    const integrationEnabled = this.configService.sfIntegrationEnabled();
    const authMode = this.configService.sfAuthMode();
    const alias = aliasOverride?.trim() || this.resolveActiveAlias();
    const projectPath = this.runtimePaths.sfProjectPath();
    const parsePath = this.runtimePaths.sfParsePath();
    this.ensureProjectScaffold(projectPath);
    const session = this.sessionStatus();

    const sfProbe = await this.orgToolAdapter.probeSf(projectPath);
    const cciProbe = await this.orgToolAdapter.probeCci(projectPath);
    const cciVersion = this.orgToolAdapter.extractCciVersion(cciProbe.stdout, cciProbe.stderr);
    const cciRequiredVersion = this.configService.cciVersionPin();
    const cciVersionPinned = cciVersion !== undefined && cciVersion === cciRequiredVersion;
    const parsePathPresent = fs.existsSync(parsePath);

    let aliasAuthenticated = false;
    if (sfProbe.exitCode === 0) {
      const aliasCheck = await this.orgToolAdapter.displayOrg(alias, projectPath);
      aliasAuthenticated = aliasCheck.exitCode === 0;
    }
    let cciAliasAvailable = false;
    if (cciProbe.exitCode === 0) {
      const cciAliasCheck = await this.orgToolAdapter.cciOrgInfo(alias, projectPath);
      cciAliasAvailable = cciAliasCheck.exitCode === 0;
      if (aliasAuthenticated && !cciAliasAvailable) {
        await this.runAuth(alias, projectPath);
        const cciAliasRetry = await this.orgToolAdapter.cciOrgInfo(alias, projectPath);
        cciAliasAvailable = cciAliasRetry.exitCode === 0;
      }
    }

    const issues: OrgPreflightResponse['issues'] = [];
    if (!integrationEnabled) {
      issues.push({
        code: 'SF_INTEGRATION_DISABLED',
        severity: 'error',
        message: 'Salesforce integration is disabled.',
        remediation: 'Set SF_INTEGRATION_ENABLED=true and restart API.'
      });
    }
    if (sfProbe.exitCode !== 0) {
      issues.push({
        code: 'SF_CLI_MISSING',
        severity: 'error',
        message: 'sf CLI is not available in local runtime.',
        remediation: 'Install sf CLI locally and restart Orgumented.'
      });
    }
    if (cciProbe.exitCode !== 0) {
      issues.push({
        code: 'CCI_MISSING',
        severity: 'error',
        message: 'cci is not available in local runtime.',
        remediation: 'Install cci locally and restart Orgumented.'
      });
    } else if (!cciVersionPinned) {
      issues.push({
        code: 'CCI_VERSION_MISMATCH',
        severity: 'warning',
        message: `cci version is not pinned to ${cciRequiredVersion} (found ${cciVersion ?? 'unknown'}).`,
        remediation: `Pin cci to ${cciRequiredVersion} in runtime image for deterministic org tooling behavior.`
      });
    }
    if (!parsePathPresent) {
      issues.push({
        code: 'PARSE_PATH_MISSING',
        severity: 'warning',
        message: `Parse path not present at ${parsePath}.`,
        remediation: 'Run retrieve once to create parse tree, then refresh graph.'
      });
    }
    if (!aliasAuthenticated) {
      issues.push({
        code: 'ALIAS_NOT_AUTHENTICATED',
        severity: 'error',
        message: `No authenticated org for alias ${alias}.`,
        remediation: `Run 'sf org login web --alias ${alias} --instance-url ${this.configService.sfBaseUrl()} --set-default' locally, then retry.`
      });
    }
    if (aliasAuthenticated && !cciAliasAvailable) {
      issues.push({
        code: 'CCI_ALIAS_NOT_CONNECTED',
        severity: 'warning',
        message: `Alias ${alias} not found in cci org registry.`,
        remediation: this.buildCciAliasRemediation(alias, projectPath)
      });
    }
    if (session.status !== 'connected') {
      issues.push({
        code: 'SESSION_DISCONNECTED',
        severity: 'warning',
        message: 'Org session is currently disconnected.',
        remediation: 'Use Check Session/Connect Org after authentication succeeds.'
      });
    }

    return {
      ok: issues.every((issue) => issue.severity !== 'error'),
      integrationEnabled,
      authMode,
      alias,
      checks: {
        cciInstalled: cciProbe.exitCode === 0,
        cciVersionPinned,
        cciAliasAvailable,
        sfInstalled: sfProbe.exitCode === 0,
        parsePathPresent,
        aliasAuthenticated,
        sessionConnected: session.status === 'connected'
      },
      issues,
      session
    };
  }

  async listSessionAliases(): Promise<OrgSessionAliasesResponse> {
    const authMode = this.configService.sfAuthMode();
    const projectPath = this.runtimePaths.sfProjectPath();
    this.ensureProjectScaffold(projectPath);
    const activeAlias = this.resolveActiveAlias();
    const sfProbe = await this.orgToolAdapter.probeSf(projectPath);
    if (sfProbe.exitCode !== 0) {
      return {
        authMode,
        activeAlias,
        aliases: []
      };
    }

    const listResult = await this.orgToolAdapter.listAliases(projectPath);
    return {
      authMode,
      activeAlias,
      aliases: listResult.exitCode === 0 ? this.orgToolAdapter.parseAliasList(listResult.stdout) : []
    };
  }

  sessionHistory(limit = 10): OrgSessionHistoryResponse {
    const authMode = this.configService.sfAuthMode();
    const session = this.sessionStatus();
    const activeAlias = session.activeAlias || this.resolveActiveAlias();
    const entries = this.readSessionAuditEntries(limit);
    const lastConnectedAlias = entries.find((entry) => entry.action === 'connect' || entry.action === 'switch')?.alias;
    const restoreAlias = session.status === 'disconnected' ? lastConnectedAlias || activeAlias : undefined;

    return {
      authMode,
      activeAlias,
      restoreAlias: restoreAlias?.trim() || undefined,
      entries
    };
  }

  async validateSessionAlias(aliasRaw: string): Promise<OrgSessionAliasValidationResponse> {
    const authMode = this.configService.sfAuthMode();
    const alias = aliasRaw.trim();
    const projectPath = this.runtimePaths.sfProjectPath();
    this.ensureProjectScaffold(projectPath);
    const session = this.sessionStatus();
    const issues: OrgSessionAliasValidationResponse['issues'] = [];

    const sfProbe = await this.orgToolAdapter.probeSf(projectPath);
    const cciProbe = await this.orgToolAdapter.probeCci(projectPath);

    let sfAccessible = false;
    let cciAvailable = false;
    let username: string | undefined;
    let orgId: string | undefined;
    let instanceUrl: string | undefined;

    if (sfProbe.exitCode !== 0) {
      issues.push({
        code: 'SF_CLI_MISSING',
        severity: 'error',
        message: 'sf CLI is not available in local runtime.',
        remediation: 'Install sf CLI locally and retry.'
      });
    } else {
      const orgDisplay = await this.orgToolAdapter.displayOrg(alias, projectPath);
      sfAccessible = orgDisplay.exitCode === 0;
      const parsed = this.orgToolAdapter.parseDisplayedOrg(orgDisplay.stdout);
      username = parsed?.username;
      orgId = parsed?.orgId;
      instanceUrl = parsed?.instanceUrl;
      if (!sfAccessible) {
        issues.push({
          code: 'ALIAS_NOT_AUTHENTICATED',
          severity: 'error',
          message: `No authenticated org for alias ${alias}.`,
          remediation: `Run 'sf org login web --alias ${alias} --instance-url ${this.configService.sfBaseUrl()} --set-default' locally, then retry.`
        });
      }
    }

    if (cciProbe.exitCode !== 0) {
      issues.push({
        code: 'CCI_MISSING',
        severity: 'warning',
        message: 'cci is not available in local runtime.',
        remediation: 'Install cci locally to enable alias import and validation.'
      });
    } else {
      const cciInfo = await this.orgToolAdapter.cciOrgInfo(alias, projectPath);
      cciAvailable = cciInfo.exitCode === 0;
      if (sfAccessible && !cciAvailable) {
        await this.runAuth(alias, projectPath);
        const cciInfoRetry = await this.orgToolAdapter.cciOrgInfo(alias, projectPath);
        cciAvailable = cciInfoRetry.exitCode === 0;
      }
      if (sfAccessible && !cciAvailable) {
        issues.push({
          code: 'CCI_ALIAS_NOT_CONNECTED',
          severity: 'warning',
          message: `Alias ${alias} is not present in the cci org registry.`,
          remediation: this.buildCciAliasRemediation(alias, projectPath)
        });
      }
    }

    if (session.status !== 'connected' || session.activeAlias !== alias) {
      issues.push({
        code: 'SESSION_DISCONNECTED',
        severity: 'warning',
        message: `Orgumented session is not currently attached to alias ${alias}.`,
        remediation: 'Use the session attach flow after validating the alias.'
      });
    }

    return {
      alias,
      authMode,
      sessionConnected: session.status === 'connected' && session.activeAlias === alias,
      sfAccessible,
      cciAvailable,
      username,
      orgId,
      instanceUrl,
      issues
    };
  }

  sessionStatus(): OrgSessionStatusResponse {
    const authMode = this.configService.sfAuthMode();
    const session = this.readSessionState();
    if (!session || session.status !== 'connected') {
      return {
        status: 'disconnected',
        activeAlias: this.configService.sfAlias(),
        authMode,
        disconnectedAt: session?.disconnectedAt,
        lastError: session?.lastError
      };
    }
    return {
      status: 'connected',
      activeAlias: session.activeAlias,
      authMode,
      connectedAt: session.connectedAt,
      lastError: session.lastError
    };
  }

  async connectSession(input: OrgSessionConnectRequest = {}): Promise<OrgSessionConnectResponse> {
    if (!this.configService.sfIntegrationEnabled()) {
      throw new BadRequestException({
        message: 'Salesforce integration is disabled',
        details: {
          code: 'SF_INTEGRATION_DISABLED',
          hint: 'Set SF_INTEGRATION_ENABLED=true and restart API.'
        }
      });
    }

    const authMode = this.configService.sfAuthMode();
    const projectPath = this.runtimePaths.sfProjectPath();
    this.ensureProjectScaffold(projectPath);
    const alias = input.alias?.trim() || this.configService.sfAlias();
    await this.orgToolAdapter.ensureSfInstalled(projectPath);
    await this.orgToolAdapter.ensureCciInstalled(projectPath);

    const aliasCheck = await this.orgToolAdapter.displayOrg(alias, projectPath);
    if (aliasCheck.exitCode !== 0) {
      throw new BadRequestException({
        message: `No authenticated org for alias ${alias}.`,
        details: {
          code: 'ALIAS_NOT_AUTHENTICATED',
          hint: `Run 'sf org login web --alias ${alias} --instance-url ${this.configService.sfBaseUrl()} --set-default' locally, then retry.`
        }
      });
    }

    await this.runAuth(alias, projectPath);
    const connectedAt = new Date().toISOString();
    this.writeSessionState({
      status: 'connected',
      activeAlias: alias,
      connectedAt
    });
    this.appendAuthAudit('connect', alias, authMode, 'session connected via sf_cli_keychain');
    return {
      status: 'connected',
      activeAlias: alias,
      authMode,
      connectedAt,
      method: 'sf_cli_keychain'
    };
  }

  async switchSessionAlias(alias: string): Promise<OrgSessionSwitchResponse> {
    const authMode = this.configService.sfAuthMode();
    const projectPath = this.runtimePaths.sfProjectPath();
    this.ensureProjectScaffold(projectPath);
    await this.orgToolAdapter.ensureSfInstalled(projectPath);
    const aliasCheck = await this.orgToolAdapter.displayOrg(alias, projectPath);
    if (aliasCheck.exitCode !== 0) {
      this.writeSessionState({
        status: 'disconnected',
        activeAlias: this.configService.sfAlias(),
        disconnectedAt: new Date().toISOString(),
        lastError: `org alias not accessible: ${alias}`
      });
      this.appendAuthAudit('switch_failed', alias, authMode, 'org alias not accessible');
      throw new BadRequestException({
        message: `org alias not accessible: ${alias}`,
        details: { code: 'SF_SESSION_SWITCH_DENIED' }
      });
    }
    const switchedAt = new Date().toISOString();
    this.writeSessionState({
      status: 'connected',
      activeAlias: alias,
      connectedAt: switchedAt
    });
    this.appendAuthAudit('switch', alias, authMode, 'active alias switched');
    return {
      status: 'connected',
      activeAlias: alias,
      authMode,
      switchedAt
    };
  }

  disconnectSession(): OrgSessionDisconnectResponse {
    const authMode = this.configService.sfAuthMode();
    const activeAlias = this.resolveActiveAlias();
    const disconnectedAt = new Date().toISOString();
    this.writeSessionState({
      status: 'disconnected',
      activeAlias,
      disconnectedAt
    });
    this.appendAuthAudit('disconnect', activeAlias, authMode, 'session disconnected by operator');
    return {
      status: 'disconnected',
      activeAlias,
      authMode,
      disconnectedAt
    };
  }

  async retrieveAndRefresh(input: OrgRetrieveRequest = {}): Promise<OrgRetrieveResponse> {
    const startedAtIso = new Date().toISOString();
    const startedAtMs = Date.now();
    const runAuth = input.runAuth ?? true;
    const runRetrieve = input.runRetrieve ?? true;
    const autoRefresh = input.autoRefresh ?? this.configService.sfAutoRefreshAfterRetrieve();

    const integrationEnabled = this.configService.sfIntegrationEnabled();
    const authMode = this.configService.sfAuthMode();
    const alias = input.alias?.trim() || this.resolveActiveAlias();
    const projectPath = this.runtimePaths.sfProjectPath();
    const parsePath = this.runtimePaths.sfParsePath();
    const steps: OrgStepResult[] = [];
    const metadataArgs = runRetrieve ? this.buildMetadataArgs(input.selections ?? []) : [];

    if (!integrationEnabled) {
      throw new BadRequestException({
        message: 'Salesforce integration is disabled',
        details: {
          code: 'SF_INTEGRATION_DISABLED',
          hint: 'Set SF_INTEGRATION_ENABLED=true to enable org retrieve'
        }
      });
    }
    if (runRetrieve && metadataArgs.length === 0) {
      throw new BadRequestException({
        message: 'metadata selections are required for /org/retrieve when runRetrieve=true',
        details: {
          code: 'SF_METADATA_SELECTIONS_REQUIRED',
          hint: 'Use /org/metadata/catalog to discover types/members, then pass selections to /org/retrieve or call /org/metadata/retrieve.'
        }
      });
    }

    try {
      const validateStarted = Date.now();
      await this.orgToolAdapter.ensureSfInstalled(projectPath);
      this.ensureProjectScaffold(projectPath);
      steps.push({
        step: 'validate',
        status: 'completed',
        message: 'integration prerequisites validated',
        elapsedMs: Date.now() - validateStarted,
        meta: { projectPath, parsePath, metadataSelectionCount: metadataArgs.length }
      });

      if (runAuth) {
        const authStarted = Date.now();
        await this.runAuth(alias, projectPath);
        this.writeSessionState({
          status: 'connected',
          activeAlias: alias,
          connectedAt: new Date().toISOString()
        });
        this.appendAuthAudit('connect', alias, authMode, 'session connected via org/retrieve');
        steps.push({
          step: 'auth',
          status: 'completed',
          message: `authenticated sandbox alias ${alias}`,
          elapsedMs: Date.now() - authStarted
        });
      } else {
        steps.push({
          step: 'auth',
          status: 'skipped',
          message: 'auth explicitly skipped for this run',
          elapsedMs: 0
        });
      }

      if (runRetrieve) {
        const retrieveStarted = Date.now();
        await this.runRetrieve(alias, projectPath, metadataArgs);
        steps.push({
          step: 'retrieve',
          status: 'completed',
          message: 'metadata retrieve completed',
          elapsedMs: Date.now() - retrieveStarted,
          meta: { parsePath, metadataSelectionCount: metadataArgs.length }
        });
      } else {
        steps.push({
          step: 'retrieve',
          status: 'skipped',
          message: 'retrieve explicitly skipped for this run',
          elapsedMs: 0
        });
      }

      if (autoRefresh) {
        const refreshStarted = Date.now();
        const refreshResult = await this.ingestionService.refresh({
          fixturesPath: parsePath,
          mode: 'full'
        });
        steps.push({
          step: 'refresh',
          status: 'completed',
          message: 'graph/evidence refresh completed using retrieved metadata',
          elapsedMs: Date.now() - refreshStarted,
          meta: {
            nodeCount: refreshResult.nodeCount,
            edgeCount: refreshResult.edgeCount,
            evidenceCount: refreshResult.evidenceCount
          }
        });
      } else {
        steps.push({
          step: 'refresh',
          status: 'skipped',
          message: 'refresh skipped (autoRefresh=false)',
          elapsedMs: 0
        });
      }

      this.appendAuditEntry({
        status: 'completed',
        alias,
        authMode,
        projectPath,
        parsePath,
        metadataArgs,
        startedAt: startedAtIso,
        completedAt: new Date().toISOString(),
        steps
      });

      return {
        status: 'completed',
        startedAt: startedAtIso,
        completedAt: new Date().toISOString(),
        integrationEnabled,
        authMode,
        alias,
        projectPath,
        parsePath,
        metadataArgs: runRetrieve ? metadataArgs : undefined,
        steps
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown org integration error';
      this.logger.error(`retrieveAndRefresh failed: ${message}`);

      steps.push({
        step: 'refresh',
        status: 'failed',
        message,
        elapsedMs: Date.now() - startedAtMs
      });

      this.appendAuditEntry({
        status: 'failed',
        alias,
        authMode,
        projectPath,
        parsePath,
        metadataArgs,
        startedAt: startedAtIso,
        completedAt: new Date().toISOString(),
        steps
      });

      const actionable = this.orgToolAdapter.toActionableBadRequest(error, alias);
      if (actionable) {
        throw actionable;
      }

      throw new InternalServerErrorException({
        message: 'salesforce retrieve pipeline failed',
        details: {
          code: 'SF_RETRIEVE_FAILED',
          alias,
          authMode,
          projectPath,
          parsePath,
          metadataArgs,
          reason: message,
          steps
        }
      });
    }
  }

  private appendAuditEntry(entry: {
    status: 'completed' | 'failed';
    alias: string;
    authMode: OrgAuthMode;
    projectPath: string;
    parsePath: string;
    metadataArgs: string[];
    startedAt: string;
    completedAt: string;
    steps: OrgStepResult[];
  }): void {
    const auditPath = this.runtimePaths.orgRetrieveAuditPath();
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    const line = JSON.stringify({
      ...entry,
      stepCount: entry.steps.length
    });
    fs.appendFileSync(auditPath, `${line}\n`, 'utf8');
  }

  private ensureProjectScaffold(projectPath: string): void {
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'force-app'), { recursive: true });
    const sfdxProjectPath = path.join(projectPath, 'sfdx-project.json');
    if (!fs.existsSync(sfdxProjectPath)) {
      const scaffold = {
        packageDirectories: [{ path: 'force-app', default: true }],
        namespace: '',
        sfdcLoginUrl: this.configService.sfBaseUrl(),
        sourceApiVersion: '61.0'
      };
      fs.writeFileSync(sfdxProjectPath, JSON.stringify(scaffold, null, 2), 'utf8');
    }
  }

  private async runAuth(alias: string, projectPath: string): Promise<void> {
    const sfAliasCheck = await this.orgToolAdapter.displayOrg(alias, projectPath);
    if (sfAliasCheck.exitCode !== 0) {
      throw new BadRequestException({
        message: `No authenticated org for alias ${alias}.`,
        details: {
          code: 'ALIAS_NOT_AUTHENTICATED',
          hint: `Run 'sf org login web --alias ${alias} --instance-url ${this.configService.sfBaseUrl()} --set-default' locally, then retry.`
        }
      });
    }
    try {
      await this.orgToolAdapter.ensureCciInstalled(projectPath);
    } catch {
      this.logger.warn(`cci not available; continuing with sf-only auth for alias ${alias}`);
      return;
    }

    try {
      await this.orgToolAdapter.ensureCciProjectScaffold(projectPath);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `cci scaffold unavailable for alias ${alias}: ${reason}. ${this.buildCciAliasRemediation(alias, projectPath)}`
      );
      return;
    }

    const cciAliasCheck = await this.orgToolAdapter.cciOrgInfo(alias, projectPath);
    if (cciAliasCheck.exitCode === 0) {
      return;
    }

    const username = this.orgToolAdapter.extractSfUsername(sfAliasCheck.stdout) ?? alias;

    const cciImport = await this.orgToolAdapter.importAliasIntoCci(alias, username, projectPath);
    if (cciImport.exitCode !== 0) {
      const err = (cciImport.stderr || cciImport.stdout || '').toLowerCase();
      if (!err.includes('already exists')) {
        this.logger.warn(
          `cci import skipped for alias ${alias}: ${cciImport.stderr || cciImport.stdout || 'unknown cci import failure'}. ${this.buildCciAliasRemediation(alias, projectPath)}`
        );
        return;
      }
    }
  }

  private buildCciAliasRemediation(alias: string, projectPath: string): string {
    return `Run from '${projectPath}': cci org import ${alias} ${alias}; then verify with 'cci org info ${alias}' and click Refresh Overview.`;
  }

  async metadataCatalog(input: {
    search?: string;
    limit?: number;
    refresh?: boolean;
  }): Promise<OrgMetadataCatalogResponse> {
    const index = await this.loadDiscoveryMetadataIndex({
      refresh: input.refresh === true,
      includeSearchOnlyTypes: false
    });
    const search = input.search?.trim().toLowerCase();
    const normalizedSearch = this.normalizeMetadataSearchValue(search ?? '');
    const limit = input.limit ?? 200;
    const warnings: string[] = [...index.warnings];
    let types = Array.from(index.typeMembers.entries())
      .map(([type, members]) => ({
        type,
        memberCount: members.length
      }))
      .sort((a, b) => a.type.localeCompare(b.type));

    if (search) {
      types = types.filter((item) => {
        if (this.matchesMetadataSearch(item.type, search, normalizedSearch)) {
          return true;
        }
        const members = index.typeMembers.get(item.type) ?? [];
        return members.some((member) => this.matchesMetadataSearch(member, search, normalizedSearch));
      });
    }

    const limited = types.slice(0, limit);
    if (types.length > limit) {
      warnings.push(`result truncated to limit=${limit}`);
    }

    return {
      source: index.source,
      refreshedAt: index.refreshedAt,
      search: input.search,
      totalTypes: types.length,
      types: limited,
      warnings
    };
  }

  async metadataMembers(input: {
    type: string;
    search?: string;
    limit?: number;
    refresh?: boolean;
  }): Promise<OrgMetadataMembersResponse> {
    const index = await this.loadDiscoveryMetadataIndex({
      refresh: input.refresh === true,
      includeSearchOnlyTypes: true
    });
    const warnings: string[] = [...index.warnings];
    const search = input.search?.trim().toLowerCase();
    const normalizedSearch = this.normalizeMetadataSearchValue(search ?? '');
    const limit = input.limit ?? 1000;
    const selectedType = input.type.trim();
    const rawMembers = index.typeMembers.get(selectedType) ?? [];
    if (rawMembers.length === 0 && !index.typeMembers.has(selectedType)) {
      warnings.push(`type not found in catalog: ${selectedType}`);
    }
    let members = rawMembers;
    if (search) {
      members = members.filter((member) => this.matchesMetadataSearch(member, search, normalizedSearch));
    }
    const limited = members.slice(0, limit).map((name) => ({ name }));
    if (members.length > limit) {
      warnings.push(`member result truncated to limit=${limit}`);
    }
    return {
      source: index.source,
      refreshedAt: index.refreshedAt,
      type: selectedType,
      search: input.search,
      totalMembers: members.length,
      members: limited,
      warnings
    };
  }

  async metadataSearch(input: {
    search: string;
    limit?: number;
    refresh?: boolean;
  }): Promise<OrgMetadataSearchResponse> {
    const index = await this.loadDiscoveryMetadataIndex({
      refresh: input.refresh === true,
      includeSearchOnlyTypes: true
    });
    const warnings: string[] = [...index.warnings];
    const search = input.search.trim().toLowerCase();
    const normalizedSearch = this.normalizeMetadataSearchValue(search);
    const limit = input.limit ?? 200;
    const results: Array<{
      kind: 'type' | 'member';
      type: string;
      name: string;
      matchField: 'type' | 'member';
      score: number;
    }> = [];

    for (const [type, members] of index.typeMembers.entries()) {
      const typeScore = this.computeMetadataSearchScore(type, search, normalizedSearch);
      if (typeScore !== null) {
        results.push({
          kind: 'type',
          type,
          name: type,
          matchField: 'type',
          score: typeScore
        });
      }

      for (const member of members) {
        const memberScore = this.computeMetadataSearchScore(member, search, normalizedSearch);
        if (memberScore === null) {
          continue;
        }
        results.push({
          kind: 'member',
          type,
          name: member,
          matchField: 'member',
          score: memberScore
        });
      }
    }

    results.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      if (a.name !== b.name) {
        return a.name.localeCompare(b.name);
      }
      if (a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }
      if (a.kind !== b.kind) {
        return a.kind.localeCompare(b.kind);
      }
      return 0;
    });

    const limited = results.slice(0, limit).map(({ score, ...item }) => item);
    if (results.length > limit) {
      warnings.push(`search result truncated to limit=${limit}`);
    }

    return {
      source: index.source,
      refreshedAt: index.refreshedAt,
      search: input.search,
      totalResults: results.length,
      results: limited,
      warnings
    };
  }

  async retrieveSelectedMetadata(input: OrgMetadataRetrieveRequest): Promise<OrgMetadataRetrieveResponse> {
    if (!this.configService.sfIntegrationEnabled()) {
      throw new BadRequestException({
        message: 'Salesforce integration is disabled',
        details: {
          code: 'SF_INTEGRATION_DISABLED',
          hint: 'Set SF_INTEGRATION_ENABLED=true to enable selective metadata retrieve'
        }
      });
    }

    const alias = this.resolveActiveAlias();
    const projectPath = this.runtimePaths.sfProjectPath();
    const parsePath = this.runtimePaths.sfParsePath();
    const autoRefresh = input.autoRefresh ?? this.configService.sfAutoRefreshAfterRetrieve();
    const startedAt = new Date().toISOString();

    await this.orgToolAdapter.ensureSfInstalled(projectPath);
    this.ensureParsePathWithinProject(projectPath, parsePath);

    const metadataArgs = this.buildMetadataArgs(input.selections);
    if (metadataArgs.length === 0) {
      throw new BadRequestException('no valid metadata selections supplied');
    }

    try {
      await this.orgToolAdapter.retrieveMetadata(alias, metadataArgs, projectPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const category = this.classifyMetadataRetrieveFailure(message);
      if (category === 'auth_or_session_error') {
        throw new BadRequestException({
          message: 'metadata retrieve requires an authenticated org session',
          details: {
            code: 'ALIAS_NOT_AUTHENTICATED',
            hint: `Run 'sf org login web --alias ${alias} --instance-url ${this.configService.sfBaseUrl()} --set-default' locally, then retry metadata retrieve.`
          }
        });
      }
      if (category === 'metadata_resolution_error') {
        throw new BadRequestException({
          message: 'metadata retrieve failed due to invalid selector values',
          details: {
            code: 'SF_METADATA_SELECTOR_INVALID',
            hint: 'Use /org/metadata/catalog and /org/metadata/members to build valid selections.'
          }
        });
      }
      throw new InternalServerErrorException({
        message: 'metadata retrieve failed',
        details: {
          code: 'SF_METADATA_RETRIEVE_FAILED',
          category,
          reason: message
        }
      });
    }

    const response: OrgMetadataRetrieveResponse = {
      status: 'completed',
      startedAt,
      completedAt: new Date().toISOString(),
      alias,
      parsePath,
      metadataArgs,
      autoRefresh
    };

    if (autoRefresh) {
      const refreshed = await this.ingestionService.refresh({
        fixturesPath: parsePath,
        mode: 'full'
      });
      response.refresh = {
        nodeCount: refreshed.nodeCount,
        edgeCount: refreshed.edgeCount,
        evidenceCount: refreshed.evidenceCount
      };
    }
    return response;
  }

  private async loadDiscoveryMetadataIndex(input: {
    refresh: boolean;
    includeSearchOnlyTypes: boolean;
  }): Promise<{
    source: 'local' | 'cache' | 'metadata_api' | 'mixed';
    refreshedAt: string;
    typeMembers: Map<string, string[]>;
    warnings: string[];
  }> {
    const parsePath = this.runtimePaths.sfParsePath();
    const projectPath = this.runtimePaths.sfProjectPath();
    const alias = this.resolveActiveAlias();
    const liveIndex = this.configService.sfIntegrationEnabled()
      ? await this.loadLiveMetadataIndex(
          alias,
          projectPath,
          parsePath,
          input.refresh,
          input.includeSearchOnlyTypes
        )
      : {
          source: 'metadata_api' as const,
          refreshedAt: new Date().toISOString(),
          typeMembers: new Map<string, string[]>(),
          warnings: []
        };
    const liveMemberCount = this.countMetadataMembers(liveIndex.typeMembers);

    if (liveMemberCount > 0) {
      return liveIndex;
    }

    const localIndex = this.loadMetadataIndex(parsePath, input.refresh);
    if (localIndex.typeMembers.size > 0) {
      return {
        source: liveIndex.warnings.length > 0 ? 'mixed' : localIndex.source,
        refreshedAt: localIndex.refreshedAt,
        typeMembers: localIndex.typeMembers,
        warnings: [...liveIndex.warnings, ...localIndex.warnings]
      };
    }

    return {
      source: liveIndex.source,
      refreshedAt: liveIndex.refreshedAt,
      typeMembers: liveIndex.typeMembers,
      warnings: [...liveIndex.warnings, ...localIndex.warnings]
    };
  }

  private countMetadataMembers(typeMembers: Map<string, string[]>): number {
    let total = 0;
    for (const members of typeMembers.values()) {
      total += members.length;
    }
    return total;
  }

  private async loadLiveMetadataIndex(
    alias: string,
    projectPath: string,
    parsePath: string,
    refresh: boolean,
    includeSearchOnlyTypes: boolean
  ): Promise<{
    source: 'metadata_api';
    refreshedAt: string;
    typeMembers: Map<string, string[]>;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const refreshedAt = new Date().toISOString();
    const cachePath = path.join(
      path.dirname(parsePath),
      includeSearchOnlyTypes ? 'metadata-live-search-cache.json' : 'metadata-live-catalog-cache.json'
    );

    if (!refresh && fs.existsSync(cachePath)) {
      try {
        const raw = fs.readFileSync(cachePath, 'utf8');
        const parsed = JSON.parse(raw) as {
          refreshedAt?: string;
          types?: Array<{ type: string; members: string[] }>;
        };
        if (Array.isArray(parsed.types)) {
          const typeMembers = new Map<string, string[]>();
          for (const item of parsed.types) {
            if (!item || typeof item.type !== 'string' || !Array.isArray(item.members)) {
              continue;
            }
            typeMembers.set(
              item.type,
              item.members
                .map((member) => String(member).trim())
                .filter((member) => member.length > 0)
                .sort((a, b) => a.localeCompare(b))
            );
          }
          if (typeMembers.size === 0 && this.countMetadataMembers(typeMembers) === 0) {
            warnings.push(`live metadata cache was empty; refreshing from org: ${cachePath}`);
          } else {
            return {
              source: 'metadata_api',
              refreshedAt: parsed.refreshedAt ?? refreshedAt,
              typeMembers,
              warnings
            };
          }
        }
      } catch {
        warnings.push(`live metadata cache unreadable: ${cachePath}`);
      }
    }

    try {
      await this.orgToolAdapter.ensureSfInstalled(projectPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`sf CLI unavailable for live metadata discovery: ${message}`);
      return {
        source: 'metadata_api',
        refreshedAt,
        typeMembers: new Map(),
        warnings
      };
    }

    const typeMembers = new Map<string, string[]>();
    const metadataTypes = [
      ...OrgService.LIVE_METADATA_CATALOG_TYPES,
      ...(includeSearchOnlyTypes ? OrgService.LIVE_METADATA_SEARCH_ONLY_TYPES : [])
    ];

    for (const metadataType of metadataTypes) {
      const result = await this.orgToolAdapter.listMetadata(alias, metadataType, projectPath);
      if (result.exitCode !== 0) {
        const reason = (result.stderr || result.stdout || 'unknown error').trim();
        warnings.push(`live metadata discovery failed for ${metadataType}: ${reason}`);
        continue;
      }

      const discovered = this.orgToolAdapter.parseMetadataList(result.stdout);
      const members = Array.from(
        new Set(
          discovered
            .map((item) => item.fullName.trim())
            .filter((name) => name.length > 0)
        )
      ).sort((a, b) => a.localeCompare(b));

      typeMembers.set(metadataType, members);
    }

    if (typeMembers.size === 0 && this.countMetadataMembers(typeMembers) === 0) {
      warnings.push('live metadata discovery returned no entries; cache not updated');
    } else {
      try {
        fs.writeFileSync(
          cachePath,
          JSON.stringify(
            {
              refreshedAt,
              types: Array.from(typeMembers.entries())
                .map(([type, members]) => ({ type, members }))
                .sort((a, b) => a.type.localeCompare(b.type))
            },
            null,
            2
          ),
          'utf8'
        );
      } catch {
        warnings.push(`live metadata cache write failed: ${cachePath}`);
      }
    }

    return {
      source: 'metadata_api',
      refreshedAt,
      typeMembers,
      warnings
    };
  }

  private loadMetadataIndex(
    parsePath: string,
    refresh: boolean
  ): {
    source: 'local' | 'cache' | 'mixed';
    refreshedAt: string;
    typeMembers: Map<string, string[]>;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const cachePath = path.join(path.dirname(parsePath), 'metadata-catalog-cache.json');
    if (!refresh && fs.existsSync(cachePath)) {
      try {
        const raw = fs.readFileSync(cachePath, 'utf8');
        const parsed = JSON.parse(raw) as {
          refreshedAt?: string;
          types?: Array<{ type: string; members: string[] }>;
        };
        if (Array.isArray(parsed.types)) {
          const typeMembers = new Map<string, string[]>();
          for (const item of parsed.types) {
            if (!item || typeof item.type !== 'string' || !Array.isArray(item.members)) {
              continue;
            }
            typeMembers.set(
              item.type,
              item.members
                .map((member) => String(member).trim())
                .filter((member) => member.length > 0)
                .sort((a, b) => a.localeCompare(b))
            );
          }
          return {
            source: 'cache',
            refreshedAt: parsed.refreshedAt ?? new Date().toISOString(),
            typeMembers,
            warnings
          };
        }
      } catch {
        warnings.push(`metadata cache unreadable: ${cachePath}`);
      }
    }

    if (!fs.existsSync(parsePath)) {
      warnings.push(`parse path not found: ${parsePath}`);
      return {
        source: 'local',
        refreshedAt: new Date().toISOString(),
        typeMembers: new Map(),
        warnings
      };
    }

    const typeMembers = new Map<string, Set<string>>();
    const walk = (dir: string): void => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === '@eaDir') {
          continue;
        }
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
          continue;
        }
        const rel = path.relative(parsePath, fullPath);
        const parts = rel.split(path.sep);
        if (parts.length < 2) {
          continue;
        }
        const resolved = this.resolveMetadataIndexEntry(parts, entry.name);
        if (!resolved) {
          continue;
        }
        const { type, member } = resolved;
        if (!typeMembers.has(type)) {
          typeMembers.set(type, new Set());
        }
        typeMembers.get(type)?.add(member);
      }
    };
    walk(parsePath);

    const normalized = Array.from(typeMembers.entries())
      .map(([type, members]) => ({
        type,
        members: Array.from(members).sort((a, b) => a.localeCompare(b))
      }))
      .sort((a, b) => a.type.localeCompare(b.type));

    const normalizedMap = new Map<string, string[]>();
    for (const item of normalized) {
      normalizedMap.set(item.type, item.members);
    }
    try {
      fs.writeFileSync(
        cachePath,
        JSON.stringify(
          {
            refreshedAt: new Date().toISOString(),
            types: normalized
          },
          null,
          2
        ),
        'utf8'
      );
    } catch {
      warnings.push(`metadata cache write failed: ${cachePath}`);
    }
    return {
      source: 'local',
      refreshedAt: new Date().toISOString(),
      typeMembers: normalizedMap,
      warnings
    };
  }

  private ensureParsePathWithinProject(projectPath: string, parsePath: string): void {
    const rel = path.relative(projectPath, parsePath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      throw new Error(
        `SF_PARSE_PATH (${parsePath}) must be inside SF_PROJECT_PATH (${projectPath})`
      );
    }
  }

  private classifyMetadataRetrieveFailure(message: string): string {
    const normalized = message.toLowerCase();
    if (normalized.includes('not authenticated') || normalized.includes('target-org') || normalized.includes('auth')) {
      return 'auth_or_session_error';
    }
    if (normalized.includes('metadata') && normalized.includes('not found')) {
      return 'metadata_resolution_error';
    }
    if (normalized.includes('source') && normalized.includes('api')) {
      return 'source_api_error';
    }
    return 'retrieve_command_error';
  }

  private normalizeMetadataSearchValue(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private matchesMetadataSearch(value: string, search: string, normalizedSearch: string): boolean {
    return this.computeMetadataSearchScore(value, search, normalizedSearch) !== null;
  }

  private computeMetadataSearchScore(
    value: string,
    search: string,
    normalizedSearch: string
  ): number | null {
    const valueLower = value.toLowerCase();
    let score: number | null = null;

    if (valueLower === search) {
      score = 0;
    } else if (valueLower.startsWith(search)) {
      score = 1;
    } else if (valueLower.includes(search)) {
      score = 2;
    }

    if (normalizedSearch.length < 2) {
      return score;
    }

    const normalizedValue = this.normalizeMetadataSearchValue(valueLower);
    if (normalizedValue.length === 0) {
      return score;
    }

    if (normalizedValue === normalizedSearch) {
      return score === null ? 0.5 : Math.min(score, 0.5);
    }
    if (normalizedValue.startsWith(normalizedSearch)) {
      return score === null ? 1.5 : Math.min(score, 1.5);
    }
    if (normalizedValue.includes(normalizedSearch)) {
      return score === null ? 2.5 : Math.min(score, 2.5);
    }

    return score;
  }

  private resolveActiveAlias(): string {
    const session = this.readSessionState();
    if (session && session.status === 'connected' && session.activeAlias.trim().length > 0) {
      return session.activeAlias;
    }
    return this.configService.sfAlias();
  }

  private getSessionStatePath(): string {
    return this.runtimePaths.orgSessionStatePath();
  }

  private readSessionState():
    | {
        status: 'connected' | 'disconnected';
        activeAlias: string;
        connectedAt?: string;
        disconnectedAt?: string;
        lastError?: string;
      }
    | undefined {
    const sessionPath = this.getSessionStatePath();
    if (!fs.existsSync(sessionPath)) {
      return undefined;
    }
    try {
      const raw = fs.readFileSync(sessionPath, 'utf8');
      return JSON.parse(raw) as {
        status: 'connected' | 'disconnected';
        activeAlias: string;
        connectedAt?: string;
        disconnectedAt?: string;
        lastError?: string;
      };
    } catch {
      return undefined;
    }
  }

  private writeSessionState(state: {
    status: 'connected' | 'disconnected';
    activeAlias: string;
    connectedAt?: string;
    disconnectedAt?: string;
    lastError?: string;
  }): void {
    const sessionPath = this.getSessionStatePath();
    fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify(state, null, 2), 'utf8');
  }

  private appendAuthAudit(
    action: 'connect' | 'switch' | 'disconnect' | 'switch_failed',
    alias: string,
    authMode: OrgAuthMode,
    message: string
  ): void {
    const auditPath = this.runtimePaths.orgAuthAuditPath();
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    fs.appendFileSync(
      auditPath,
      `${JSON.stringify({
        action,
        alias,
        authMode,
        message,
        timestamp: new Date().toISOString()
      })}\n`,
      'utf8'
    );
  }

  private readSessionAuditEntries(limit: number): OrgSessionAuditEntry[] {
    const auditPath = this.runtimePaths.orgAuthAuditPath();
    if (!fs.existsSync(auditPath)) {
      return [];
    }

    const lines = fs
      .readFileSync(auditPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const entries: OrgSessionAuditEntry[] = [];
    for (let index = lines.length - 1; index >= 0 && entries.length < limit; index -= 1) {
      try {
        const parsed = JSON.parse(lines[index]) as Partial<OrgSessionAuditEntry>;
        if (
          (parsed.action === 'connect' ||
            parsed.action === 'switch' ||
            parsed.action === 'disconnect' ||
            parsed.action === 'switch_failed') &&
          typeof parsed.alias === 'string' &&
          parsed.alias.trim().length > 0 &&
          typeof parsed.authMode === 'string' &&
          typeof parsed.message === 'string' &&
          typeof parsed.timestamp === 'string'
        ) {
          entries.push({
            action: parsed.action,
            alias: parsed.alias.trim(),
            authMode: parsed.authMode as OrgAuthMode,
            message: parsed.message,
            timestamp: parsed.timestamp
          });
        }
      } catch {
        continue;
      }
    }

    return entries;
  }

  private inferMetadataType(folderName: string, fileName: string): string {
    const normalizedFolder = folderName.toLowerCase();
    if (normalizedFolder === 'objects') return 'CustomObject';
    if (normalizedFolder === 'flows') return 'Flow';
    if (normalizedFolder === 'classes') return 'ApexClass';
    if (normalizedFolder === 'triggers') return 'ApexTrigger';
    if (normalizedFolder === 'permissionsets') return 'PermissionSet';
    if (normalizedFolder === 'profiles') return 'Profile';
    if (normalizedFolder === 'permissionsetgroups') return 'PermissionSetGroup';
    if (normalizedFolder === 'connectedapps') return 'ConnectedApp';
    if (normalizedFolder === 'custompermissions') return 'CustomPermission';

    if (fileName.includes('.flow-meta.xml')) return 'Flow';
    if (fileName.includes('.cls')) return 'ApexClass';
    if (fileName.includes('.trigger')) return 'ApexTrigger';
    if (fileName.includes('.object-meta.xml')) return 'CustomObject';
    return folderName;
  }

  private resolveMetadataIndexEntry(
    relativeParts: string[],
    fileName: string
  ): { type: string; member: string } | undefined {
    const topLevelFolder = relativeParts[0];
    const normalizedFolder = topLevelFolder.toLowerCase();
    const type = this.inferMetadataType(topLevelFolder, fileName);

    if (normalizedFolder === 'objects' && relativeParts.length >= 2) {
      const objectName = relativeParts[1]?.trim();
      if (!objectName) {
        return undefined;
      }
      return {
        type,
        member: objectName
      };
    }

    const member = fileName.replace(/\.[^.]+(?:\.[^.]+)?$/, '').trim();
    if (!member) {
      return undefined;
    }
    return {
      type,
      member
    };
  }

  private buildMetadataArgs(selections: Array<{ type: string; members?: string[] }>): string[] {
    const metadataArgs: string[] = [];
    for (const selection of selections) {
      const type = selection.type.trim();
      if (!type) {
        continue;
      }
      if (selection.members && selection.members.length > 0) {
        for (const member of selection.members) {
          const trimmed = member.trim();
          if (trimmed) {
            metadataArgs.push(`${type}:${trimmed}`);
          }
        }
      } else {
        metadataArgs.push(type);
      }
    }
    return metadataArgs;
  }

  private async runRetrieve(alias: string, projectPath: string, metadataArgs: string[]): Promise<void> {
    await this.orgToolAdapter.retrieveMetadata(alias, metadataArgs, projectPath);
  }
}
