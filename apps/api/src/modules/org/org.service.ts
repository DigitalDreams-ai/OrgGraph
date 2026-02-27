import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveSfParsePath,
  resolveSfProjectPath,
} from '../../common/path';
import { AppConfigService } from '../../config/app-config.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { CommandRunnerService } from './command-runner.service';
import type {
  OrgMetadataCatalogResponse,
  OrgMetadataMembersResponse,
  OrgMetadataRetrieveRequest,
  OrgMetadataRetrieveResponse,
  OrgPreflightResponse,
  OrgRetrieveRequest,
  OrgRetrieveResponse,
  OrgSessionDisconnectResponse,
  OrgSessionConnectRequest,
  OrgSessionConnectResponse,
  OrgSessionStatusResponse,
  OrgSessionSwitchResponse,
  OrgStatusResponse,
  OrgStepResult,
  OrgAuthMode
} from './org.types';

@Injectable()
export class OrgService {
  private readonly logger = new Logger(OrgService.name);

  constructor(
    private readonly configService: AppConfigService,
    private readonly ingestionService: IngestionService,
    private readonly commandRunner: CommandRunnerService
  ) {}

  async status(): Promise<OrgStatusResponse> {
    const integrationEnabled = this.configService.sfIntegrationEnabled();
    const authMode = this.configService.sfAuthMode();
    const alias = this.resolveActiveAlias();
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());

    const sfProbe = await this.probeCommand('sf', ['--version'], projectPath);
    const cciProbe = await this.probeCommand('cci', ['version'], projectPath);
    const cciVersion = this.extractCciVersion(cciProbe.stdout, cciProbe.stderr);
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
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    const parsePath = resolveSfParsePath(this.configService.sfParsePath());
    const session = this.sessionStatus();

    const sfProbe = await this.probeCommand('sf', ['--version'], projectPath);
    const cciProbe = await this.probeCommand('cci', ['version'], projectPath);
    const cciVersion = this.extractCciVersion(cciProbe.stdout, cciProbe.stderr);
    const cciRequiredVersion = this.configService.cciVersionPin();
    const cciVersionPinned = cciVersion !== undefined && cciVersion === cciRequiredVersion;
    const parsePathPresent = fs.existsSync(parsePath);

    let aliasAuthenticated = false;
    if (sfProbe.exitCode === 0) {
      const aliasCheck = await this.commandRunner.run(
        'sf',
        ['org', 'display', '--target-org', alias, '--json'],
        { cwd: projectPath, timeoutMs: 30_000 }
      );
      aliasAuthenticated = aliasCheck.exitCode === 0;
    }
    let cciAliasAvailable = false;
    if (cciProbe.exitCode === 0) {
      const cciAliasCheck = await this.commandRunner.run(
        'cci',
        ['org', 'info', alias],
        { cwd: projectPath, timeoutMs: 30_000 }
      );
      cciAliasAvailable = cciAliasCheck.exitCode === 0;
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
        message: 'sf CLI is not available in API runtime.',
        remediation: 'Install sf CLI in API runtime/image and restart.'
      });
    }
    if (cciProbe.exitCode !== 0) {
      issues.push({
        code: 'CCI_MISSING',
        severity: 'error',
        message: 'cci is not available in API runtime.',
        remediation: 'Install cci in API runtime/image and restart.'
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
        remediation: `Run 'sf org login web --alias ${alias} --instance-url ${this.configService.sfBaseUrl()} --set-default' in API runtime, then retry.`
      });
    }
    if (aliasAuthenticated && !cciAliasAvailable) {
      issues.push({
        code: 'CCI_ALIAS_NOT_CONNECTED',
        severity: 'warning',
        message: `Alias ${alias} not found in cci org registry.`,
        remediation: `Run 'cci org import ${alias} <sf-username>' in API runtime after sf keychain login.`
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
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    const alias = input.alias?.trim() || this.configService.sfAlias();
    await this.ensureSfBinaryInstalled(projectPath);
    await this.ensureCciBinaryInstalled(projectPath);

    const sfdxAuthUrl = input.sfdxAuthUrl?.trim();
    const accessToken = input.accessToken?.trim();
    const instanceUrl = input.instanceUrl?.trim();
    const frontdoorUrl = input.frontdoorUrl?.trim();

    let method: OrgSessionConnectResponse['method'] = 'existing';
    const mechanismsSelected =
      (sfdxAuthUrl ? 1 : 0) +
      (accessToken && instanceUrl ? 1 : 0) +
      (frontdoorUrl ? 1 : 0);
    if (mechanismsSelected > 1) {
      throw new BadRequestException('Provide only one auth mechanism: sfdxAuthUrl, accessToken+instanceUrl, or frontdoorUrl');
    }

    if (sfdxAuthUrl) {
      method = 'sfdx_url';
      const authFile = path.join(projectPath, '.orgumented-sfdx-auth-url.txt');
      fs.writeFileSync(authFile, `${sfdxAuthUrl}\n`, { encoding: 'utf8', mode: 0o600 });
      try {
        const login = await this.commandRunner.run(
          'sf',
          ['org', 'login', 'sfdx-url', '--sfdx-url-file', authFile, '--alias', alias, '--set-default', '--json'],
          { cwd: projectPath, timeoutMs: 120_000 }
        );
        if (login.exitCode !== 0) {
          const reason = this.sanitizeSfError(login.stderr || login.stdout, [sfdxAuthUrl]);
          throw new BadRequestException(`sf sfdx-url login failed: ${reason || 'unknown error'}`);
        }
      } finally {
        fs.rmSync(authFile, { force: true });
      }
    } else if (accessToken && instanceUrl) {
      method = 'access_token';
      const login = await this.commandRunner.run(
        'sf',
        ['org', 'login', 'access-token', '--instance-url', instanceUrl, '--alias', alias, '--set-default', '--no-prompt', '--json'],
        {
          cwd: projectPath,
          timeoutMs: 120_000,
          env: { ...process.env, SF_ACCESS_TOKEN: accessToken }
        }
      );
      if (login.exitCode !== 0) {
        const reason = this.sanitizeSfError(login.stderr || login.stdout, [accessToken]);
        throw new BadRequestException(`sf access-token login failed: ${reason || 'unknown error'}`);
      }
    } else if (frontdoorUrl) {
      method = 'frontdoor';
      const frontdoor = this.parseFrontdoorAuth(frontdoorUrl);
      const login = await this.commandRunner.run(
        'sf',
        [
          'org',
          'login',
          'access-token',
          '--instance-url',
          frontdoor.instanceUrl,
          '--alias',
          alias,
          '--set-default',
          '--no-prompt',
          '--json'
        ],
        {
          cwd: projectPath,
          timeoutMs: 120_000,
          env: { ...process.env, SF_ACCESS_TOKEN: frontdoor.accessToken }
        }
      );
      if (login.exitCode !== 0) {
        const reason = this.sanitizeSfError(login.stderr || login.stdout, [frontdoor.accessToken]);
        throw new BadRequestException(`sf frontdoor login failed: ${reason || 'unknown error'}`);
      }
    }

    if (method === 'existing') {
      const aliasCheck = await this.commandRunner.run(
        'sf',
        ['org', 'display', '--target-org', alias, '--json'],
        { cwd: projectPath, timeoutMs: 30_000 }
      );
      if (aliasCheck.exitCode !== 0) {
        throw new BadRequestException(
          `No authenticated org for alias ${alias}. Provide one auth mechanism or login in sf keychain first.`
        );
      }
    }

    await this.runAuth(alias, projectPath);
    const connectedAt = new Date().toISOString();
    this.writeSessionState({
      status: 'connected',
      activeAlias: alias,
      connectedAt
    });
    this.appendAuthAudit('connect', alias, authMode, `session connected via ${method}`);
    return {
      status: 'connected',
      activeAlias: alias,
      authMode,
      connectedAt,
      method
    };
  }

  async switchSessionAlias(alias: string): Promise<OrgSessionSwitchResponse> {
    const authMode = this.configService.sfAuthMode();
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    await this.ensureSfBinaryInstalled(projectPath);
    const aliasCheck = await this.commandRunner.run(
      'sf',
      ['org', 'display', '--target-org', alias, '--json'],
      { cwd: projectPath, timeoutMs: 30_000 }
    );
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
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    const parsePath = resolveSfParsePath(this.configService.sfParsePath());
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
      await this.ensureSfBinaryInstalled(projectPath);
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
    const auditPath = path.join(path.dirname(entry.projectPath), 'sf-retrieve-audit.log');
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    const line = JSON.stringify({
      ...entry,
      stepCount: entry.steps.length
    });
    fs.appendFileSync(auditPath, `${line}\n`, 'utf8');
  }

  private async ensureSfBinaryInstalled(projectPath: string): Promise<void> {
    const result = await this.commandRunner.run('sf', ['--version'], {
      cwd: projectPath,
      timeoutMs: 30_000
    });
    if (result.exitCode !== 0) {
      throw new Error('sf CLI not found in PATH');
    }
  }

  private async probeCommand(
    command: string,
    args: string[],
    cwd: string
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    try {
      const result = await this.commandRunner.run(command, args, {
        cwd,
        timeoutMs: 30_000
      });
      return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { exitCode: 1, stdout: '', stderr: message };
    }
  }

  private ensureProjectScaffold(projectPath: string): void {
    fs.mkdirSync(projectPath, { recursive: true });
    fs.mkdirSync(path.join(projectPath, 'force-app'), { recursive: true });
    const sfdxProjectPath = path.join(projectPath, 'sfdx-project.json');
    if (!fs.existsSync(sfdxProjectPath)) {
      const scaffold = {
        packageDirectories: [{ path: 'force-app', default: true }],
        namespace: '',
        sfdcLoginUrl: 'https://test.salesforce.com',
        sourceApiVersion: '61.0'
      };
      fs.writeFileSync(sfdxProjectPath, JSON.stringify(scaffold, null, 2), 'utf8');
    }
  }

  private async runAuth(alias: string, projectPath: string): Promise<void> {
    const sfAliasCheck = await this.commandRunner.run(
      'sf',
      ['org', 'display', '--target-org', alias, '--json'],
      { cwd: projectPath, timeoutMs: 30_000 }
    );
    if (sfAliasCheck.exitCode !== 0) {
      throw new Error(
        `No authenticated org for alias ${alias}. Use Salesforce CLI keychain login first: sf org login web --alias ${alias} --instance-url ${this.configService.sfBaseUrl()} --set-default`
      );
    }

    await this.ensureCciBinaryInstalled(projectPath);

    const cciAliasCheck = await this.commandRunner.run(
      'cci',
      ['org', 'info', alias],
      { cwd: projectPath, timeoutMs: 30_000 }
    );
    if (cciAliasCheck.exitCode === 0) {
      return;
    }

    const username = this.extractSfUsername(sfAliasCheck.stdout);
    if (!username) {
      throw new Error(
        `Unable to resolve Salesforce username for alias ${alias}. Run: sf org display --target-org ${alias} --json`
      );
    }

    const cciImport = await this.commandRunner.run(
      'cci',
      ['org', 'import', alias, username],
      { cwd: projectPath, timeoutMs: 60_000 }
    );
    if (cciImport.exitCode !== 0) {
      const err = (cciImport.stderr || cciImport.stdout || '').toLowerCase();
      if (!err.includes('already exists')) {
        throw new Error(
          `Failed to import alias ${alias} into cci org registry. Ensure cci is configured in runtime and retry.`
        );
      }
    }

    const cciAliasRecheck = await this.commandRunner.run(
      'cci',
      ['org', 'info', alias],
      { cwd: projectPath, timeoutMs: 30_000 }
    );
    if (cciAliasRecheck.exitCode !== 0) {
      throw new Error(
        `sf keychain login found, but cci alias ${alias} is still unavailable. Run: cci org import ${alias} ${username}`
      );
    }
  }

  async metadataCatalog(input: {
    search?: string;
    limit?: number;
    refresh?: boolean;
  }): Promise<OrgMetadataCatalogResponse> {
    const parsePath = resolveSfParsePath(this.configService.sfParsePath());
    const refresh = input.refresh === true;
    const search = input.search?.trim().toLowerCase();
    const limit = input.limit ?? 200;
    const warnings: string[] = [];
    const index = this.loadMetadataIndex(parsePath, refresh);
    warnings.push(...index.warnings);
    let types = Array.from(index.typeMembers.entries())
      .map(([type, members]) => ({
        type,
        memberCount: members.length
      }))
      .sort((a, b) => a.type.localeCompare(b.type));

    if (search) {
      types = types.filter((item) => {
        if (item.type.toLowerCase().includes(search)) {
          return true;
        }
        const members = index.typeMembers.get(item.type) ?? [];
        return members.some((member) => member.toLowerCase().includes(search));
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
    const parsePath = resolveSfParsePath(this.configService.sfParsePath());
    const index = this.loadMetadataIndex(parsePath, input.refresh === true);
    const warnings: string[] = [...index.warnings];
    const search = input.search?.trim().toLowerCase();
    const limit = input.limit ?? 1000;
    const selectedType = input.type.trim();
    const rawMembers = index.typeMembers.get(selectedType) ?? [];
    if (rawMembers.length === 0 && !index.typeMembers.has(selectedType)) {
      warnings.push(`type not found in catalog: ${selectedType}`);
    }
    let members = rawMembers;
    if (search) {
      members = members.filter((member) => member.toLowerCase().includes(search));
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
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    const parsePath = resolveSfParsePath(this.configService.sfParsePath());
    const autoRefresh = input.autoRefresh ?? this.configService.sfAutoRefreshAfterRetrieve();
    const startedAt = new Date().toISOString();

    await this.ensureSfBinaryInstalled(projectPath);
    this.ensureParsePathWithinProject(projectPath, parsePath);

    const metadataArgs = this.buildMetadataArgs(input.selections);
    if (metadataArgs.length === 0) {
      throw new BadRequestException('no valid metadata selections supplied');
    }

    const waitMinutes = this.configService.sfWaitMinutes();
    const args = [
      'project',
      'retrieve',
      'start',
      '--target-org',
      alias,
      '--wait',
      String(waitMinutes),
      '--json'
    ];
    for (const metadataArg of metadataArgs) {
      args.push('--metadata', metadataArg);
    }
    try {
      await this.runSfCommandWithRetry(args, projectPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const category = this.classifyMetadataRetrieveFailure(message);
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
        const type = this.inferMetadataType(parts[0], entry.name);
        const member = entry.name.replace(/\.[^.]+(?:\.[^.]+)?$/, '');
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

  private async ensureCciBinaryInstalled(projectPath: string): Promise<void> {
    const result = await this.commandRunner.run('cci', ['version'], {
      cwd: projectPath,
      timeoutMs: 30_000
    });
    if (result.exitCode !== 0) {
      throw new Error('cci not found in PATH');
    }
  }

  private extractSfUsername(stdout: string): string | undefined {
    try {
      const parsed = JSON.parse(stdout) as { result?: { username?: string } };
      const username = parsed?.result?.username?.trim();
      return username && username.length > 0 ? username : undefined;
    } catch {
      return undefined;
    }
  }

  private extractCciVersion(stdout: string, stderr: string): string | undefined {
    const combined = `${stdout}\n${stderr}`;
    const match = combined.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : undefined;
  }

  private parseFrontdoorAuth(frontdoorUrl: string): { accessToken: string; instanceUrl: string } {
    let parsed: URL;
    try {
      parsed = new URL(frontdoorUrl);
    } catch {
      throw new BadRequestException('frontdoorUrl must be a valid URL');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException('frontdoorUrl must use http or https');
    }
    const accessToken = parsed.searchParams.get('sid')?.trim();
    if (!accessToken) {
      throw new BadRequestException('frontdoorUrl must include sid query parameter');
    }
    return {
      accessToken,
      instanceUrl: `${parsed.protocol}//${parsed.host}`
    };
  }

  private redactSecrets(text: string, secrets: string[]): string {
    let result = text;
    for (const secret of secrets) {
      if (!secret) continue;
      result = result.split(secret).join('[REDACTED]');
    }
    return result;
  }

  private sanitizeSfError(raw: string, secrets: string[]): string {
    const redacted = this.redactSecrets(raw, secrets);
    const parsed = this.extractSfErrorMessage(redacted);
    return this.normalizeWhitespace(parsed).slice(0, 1200);
  }

  private extractSfErrorMessage(raw: string): string {
    const text = raw.trim();
    if (!text) return '';
    try {
      const parsed = JSON.parse(text) as { message?: string; code?: string };
      if (typeof parsed.message === 'string' && parsed.message.trim().length > 0) {
        return parsed.message.trim();
      }
      if (typeof parsed.code === 'string' && parsed.code.trim().length > 0) {
        return parsed.code.trim();
      }
    } catch {
      // non-json output
    }
    return text;
  }

  private normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private resolveActiveAlias(): string {
    const session = this.readSessionState();
    if (session && session.status === 'connected' && session.activeAlias.trim().length > 0) {
      return session.activeAlias;
    }
    return this.configService.sfAlias();
  }

  private getSessionStatePath(): string {
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    return path.join(path.dirname(projectPath), 'org-session-state.json');
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
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    const auditPath = path.join(path.dirname(projectPath), 'auth-session-audit.log');
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
    const waitMinutes = this.configService.sfWaitMinutes();
    const args = [
      'project',
      'retrieve',
      'start',
      '--target-org',
      alias,
      '--wait',
      String(waitMinutes),
      '--json'
    ];
    for (const metadataArg of metadataArgs) {
      args.push('--metadata', metadataArg);
    }
    await this.runSfCommandWithRetry(
      args,
      projectPath
    );
  }

  private async runSfCommandWithRetry(
    args: string[],
    cwd: string,
    env?: NodeJS.ProcessEnv
  ): Promise<void> {
    const retries = this.configService.sfRetryCount();
    const retryDelayMs = this.configService.sfRetryDelayMs();
    const timeoutMs = this.configService.sfTimeoutSeconds() * 1000;

    let lastError = '';
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const result = await this.commandRunner.run('sf', args, {
        cwd,
        timeoutMs,
        env: env ? { ...process.env, ...env } : process.env
      });
      if (result.exitCode === 0) {
        return;
      }

      lastError = result.stderr || result.stdout || `sf command failed with exit code ${result.exitCode}`;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    throw new Error(lastError);
  }
}
