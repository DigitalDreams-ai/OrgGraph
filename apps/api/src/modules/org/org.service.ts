import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveSfManifestPath,
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

    return {
      integrationEnabled,
      authMode,
      alias,
      sf: {
        installed: sfProbe.exitCode === 0,
        message: sfProbe.exitCode === 0 ? 'sf CLI available' : 'sf CLI not found in PATH'
      },
      session: this.sessionStatus()
    };
  }

  async preflight(): Promise<OrgPreflightResponse> {
    const integrationEnabled = this.configService.sfIntegrationEnabled();
    const authMode = this.configService.sfAuthMode();
    const alias = this.resolveActiveAlias();
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    const manifestPath = resolveSfManifestPath(this.configService.sfManifestPath());
    const parsePath = resolveSfParsePath(this.configService.sfParsePath());
    const session = this.sessionStatus();

    const sfProbe = await this.probeCommand('sf', ['--version'], projectPath);
    const manifestPresent = fs.existsSync(manifestPath);
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
    if (!manifestPresent) {
      issues.push({
        code: 'MANIFEST_MISSING',
        severity: 'error',
        message: `Manifest not found at ${manifestPath}.`,
        remediation: 'Create/update manifest or migrate retrieve flow to explicit metadata selection.'
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
        sfInstalled: sfProbe.exitCode === 0,
        manifestPresent,
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
    const alias = this.resolveActiveAlias();
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    const manifestPath = resolveSfManifestPath(this.configService.sfManifestPath());
    const parsePath = resolveSfParsePath(this.configService.sfParsePath());
    const steps: OrgStepResult[] = [];

    if (!integrationEnabled) {
      throw new BadRequestException({
        message: 'Salesforce integration is disabled',
        details: {
          code: 'SF_INTEGRATION_DISABLED',
          hint: 'Set SF_INTEGRATION_ENABLED=true to enable org retrieve'
        }
      });
    }

    try {
      const validateStarted = Date.now();
      await this.ensureSfBinaryInstalled(projectPath);
      this.ensureProjectScaffold(projectPath);
      if (runRetrieve) {
        this.ensureManifestFile(manifestPath);
      }
      steps.push({
        step: 'validate',
        status: 'completed',
        message: 'integration prerequisites validated',
        elapsedMs: Date.now() - validateStarted,
        meta: { projectPath, manifestPath, parsePath }
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
        await this.runRetrieve(alias, projectPath, manifestPath);
        steps.push({
          step: 'retrieve',
          status: 'completed',
          message: 'metadata retrieve completed',
          elapsedMs: Date.now() - retrieveStarted,
          meta: { parsePath }
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
        manifestPath,
        parsePath,
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
        manifestPath,
        parsePath,
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
        manifestPath,
        parsePath,
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
          manifestPath,
          parsePath,
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
    manifestPath: string;
    parsePath: string;
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

  private ensureManifestFile(manifestPath: string): void {
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`manifest not found at ${manifestPath}`);
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

    const metadataArgs: string[] = [];
    for (const selection of input.selections) {
      const type = selection.type.trim();
      if (selection.members && selection.members.length > 0) {
        for (const member of selection.members) {
          metadataArgs.push(`${type}:${member}`);
        }
      } else {
        metadataArgs.push(type);
      }
    }
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

  private async runRetrieve(alias: string, projectPath: string, manifestPath: string): Promise<void> {
    const waitMinutes = this.configService.sfWaitMinutes();
    await this.runSfCommandWithRetry(
      [
        'project',
        'retrieve',
        'start',
        '--manifest',
        manifestPath,
        '--target-org',
        alias,
        '--wait',
        String(waitMinutes),
        '--json'
      ],
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
