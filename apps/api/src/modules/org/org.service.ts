import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import {
  resolveSfAuthCodePath,
  resolveSfManifestPath,
  resolveSfParsePath,
  resolveSfProjectPath,
  resolveSfTokenStorePath
} from '../../common/path';
import { AppConfigService } from '../../config/app-config.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { CommandRunnerService } from './command-runner.service';
import type {
  OrgMetadataCatalogResponse,
  OrgMetadataMembersResponse,
  OrgMetadataRetrieveRequest,
  OrgMetadataRetrieveResponse,
  OrgRetrieveRequest,
  OrgRetrieveResponse,
  OrgStatusResponse,
  OrgStepResult
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
    const alias = this.configService.sfAlias();
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    const cciRequiredVersion = this.configService.cciVersionPin();

    const sfProbe = await this.probeCommand('sf', ['--version'], projectPath);
    const cciProbe = await this.probeCommand('cci', ['version'], projectPath);
    const cciVersion = this.extractCciVersion(cciProbe.stdout, cciProbe.stderr);
    const cciVersionPinned = cciProbe.exitCode === 0 && cciVersion === cciRequiredVersion;

    return {
      integrationEnabled,
      authMode,
      alias,
      sf: {
        installed: sfProbe.exitCode === 0,
        message: sfProbe.exitCode === 0 ? 'sf CLI available' : 'sf CLI not found in PATH'
      },
      cci: {
        installed: cciProbe.exitCode === 0,
        version: cciVersion,
        requiredVersion: cciRequiredVersion,
        versionPinned: cciVersionPinned,
        message:
          cciProbe.exitCode === 0
            ? cciVersionPinned
              ? 'cci available and version-pinned'
              : `cci available but version mismatch (expected ${cciRequiredVersion})`
            : 'cci not found in PATH'
      }
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
    const alias = this.configService.sfAlias();
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
      this.ensureManifestFile(manifestPath);
      steps.push({
        step: 'validate',
        status: 'completed',
        message: 'integration prerequisites validated',
        elapsedMs: Date.now() - validateStarted,
        meta: { projectPath, manifestPath, parsePath }
      });

      if (runAuth) {
        const authStarted = Date.now();
        await this.runAuth(authMode, alias, projectPath);
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
    authMode: 'cci' | 'sfdx_url' | 'jwt' | 'oauth_refresh_token';
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

  private async ensureCciBinaryInstalled(projectPath: string): Promise<void> {
    const result = await this.commandRunner.run('cci', ['version'], {
      cwd: projectPath,
      timeoutMs: 30_000
    });
    if (result.exitCode !== 0) {
      throw new Error('cci not found in PATH');
    }
    const version = this.extractCciVersion(result.stdout, result.stderr);
    const required = this.configService.cciVersionPin();
    if (version !== required) {
      throw new Error(`cci version mismatch: expected ${required}, received ${version || 'unknown'}`);
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

  private async runAuth(
    authMode: 'cci' | 'sfdx_url' | 'jwt' | 'oauth_refresh_token',
    alias: string,
    projectPath: string
  ): Promise<void> {
    if (authMode === 'cci') {
      await this.ensureCciBinaryInstalled(projectPath);
      const cciList = await this.commandRunner.run('cci', ['org', 'list', '--json'], {
        cwd: projectPath,
        timeoutMs: 60_000
      });
      if (cciList.exitCode !== 0) {
        throw new Error('cci org list failed; ensure CCI keychain is initialized for this environment');
      }
      const sfAliasCheck = await this.commandRunner.run(
        'sf',
        ['org', 'display', '--target-org', alias, '--json'],
        { cwd: projectPath, timeoutMs: 30_000 }
      );
      if (sfAliasCheck.exitCode !== 0) {
        throw new Error(
          `No authenticated org for alias ${alias}. Connect via cci first, then retry /org/retrieve.`
        );
      }
      return;
    }

    if (authMode === 'sfdx_url') {
      const authUrlPath = this.configService.sfAuthUrlPath();
      if (!authUrlPath) {
        throw new Error('SF_AUTH_URL_PATH is required for sfdx_url auth mode');
      }

      const absAuthUrlPath = path.resolve(authUrlPath);
      if (!fs.existsSync(absAuthUrlPath)) {
        throw new Error(`SFDX auth url file not found at ${absAuthUrlPath}`);
      }

      await this.runSfCommandWithRetry(
        [
          'org',
          'login',
          'sfdx-url',
          '--sfdx-url-file',
          absAuthUrlPath,
          '--alias',
          alias,
          '--set-default',
          '--json'
        ],
        projectPath
      );
      return;
    }

    if (authMode === 'oauth_refresh_token') {
      const clientId = this.configService.sfClientId();
      const clientSecret = this.configService.sfClientSecret();
      const redirectUri = this.configService.sfRedirectUri();
      const loginDomain = this.configService.sfBaseUrl();
      const authCodePath = resolveSfAuthCodePath(this.configService.sfAuthCodePath());
      const tokenStorePath = resolveSfTokenStorePath(this.configService.sfTokenStorePath());
      if (!clientId || !clientSecret || !redirectUri) {
        throw new Error(
          'SF_CLIENT_ID, SF_CLIENT_SECRET, and SF_REDIRECT_URI are required for oauth_refresh_token mode'
        );
      }

      const tokenResponse = await this.resolveOrRefreshOAuthToken({
        clientId,
        clientSecret,
        redirectUri,
        loginDomain,
        authCodePath,
        tokenStorePath
      });

      await this.runSfCommandWithRetry(
        [
          'org',
          'login',
          'access-token',
          '--instance-url',
          tokenResponse.instanceUrl,
          '--alias',
          alias,
          '--set-default',
          '--no-prompt',
          '--json'
        ],
        projectPath,
        { SF_ACCESS_TOKEN: tokenResponse.accessToken }
      );
      return;
    }

    const clientId = this.configService.sfClientId();
    const jwtKeyPath = this.configService.sfJwtKeyPath();
    const username = this.configService.sfUsername();
    const instanceUrl = this.configService.sfBaseUrl();
    if (!clientId || !jwtKeyPath || !username || !instanceUrl) {
      throw new Error(
        'SF_CLIENT_ID, SF_JWT_KEY_PATH, SF_USERNAME, and SF_BASE_URL are required for jwt auth mode'
      );
    }

    const absJwtPath = path.resolve(jwtKeyPath);
    if (!fs.existsSync(absJwtPath)) {
      throw new Error(`JWT key file not found at ${absJwtPath}`);
    }

    await this.runSfCommandWithRetry(
      [
        'org',
        'login',
        'jwt',
        '--client-id',
        clientId,
        '--jwt-key-file',
        absJwtPath,
        '--username',
        username,
        '--instance-url',
        instanceUrl,
        '--alias',
        alias,
        '--set-default',
        '--json'
      ],
      projectPath
    );
  }

  private extractCciVersion(stdout: string, stderr: string): string | undefined {
    const text = `${stdout}\n${stderr}`.trim();
    const match = text.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : undefined;
  }

  private async resolveOrRefreshOAuthToken(input: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    loginDomain: string;
    authCodePath: string;
    tokenStorePath: string;
  }): Promise<{ accessToken: string; refreshToken: string; instanceUrl: string }> {
    const existing = this.readOAuthTokenStore(input.tokenStorePath);
    if (existing?.refresh_token) {
      const refreshed = await this.exchangeOAuthToken(
        `${input.loginDomain}/services/oauth2/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: input.clientId,
          client_secret: input.clientSecret,
          refresh_token: existing.refresh_token
        })
      );
      const resolved = {
        accessToken: refreshed.access_token,
        refreshToken: existing.refresh_token,
        instanceUrl: refreshed.instance_url
      };
      this.writeOAuthTokenStore(input.tokenStorePath, {
        access_token: refreshed.access_token,
        refresh_token: existing.refresh_token,
        instance_url: refreshed.instance_url,
        issued_at: new Date().toISOString()
      });
      return resolved;
    }

    if (!fs.existsSync(input.authCodePath)) {
      throw new Error(
        `OAuth auth code file missing at ${input.authCodePath}. Complete external client app authorization first.`
      );
    }

    const authCode = fs.readFileSync(input.authCodePath, 'utf8').trim();
    if (!authCode) {
      throw new Error(`OAuth auth code file is empty at ${input.authCodePath}`);
    }

    const exchanged = await this.exchangeOAuthToken(
      `${input.loginDomain}/services/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        code: authCode
      })
    );

    if (!exchanged.refresh_token) {
      throw new Error(
        'OAuth token exchange did not return refresh_token. Ensure refresh_token scope is enabled.'
      );
    }

    this.writeOAuthTokenStore(input.tokenStorePath, {
      access_token: exchanged.access_token,
      refresh_token: exchanged.refresh_token,
      instance_url: exchanged.instance_url,
      issued_at: new Date().toISOString()
    });

    return {
      accessToken: exchanged.access_token,
      refreshToken: exchanged.refresh_token,
      instanceUrl: exchanged.instance_url
    };
  }

  private readOAuthTokenStore(
    tokenStorePath: string
  ): { access_token?: string; refresh_token?: string; instance_url?: string } | undefined {
    if (!fs.existsSync(tokenStorePath)) {
      return undefined;
    }
    try {
      const raw = fs.readFileSync(tokenStorePath, 'utf8');
      return JSON.parse(raw) as { access_token?: string; refresh_token?: string; instance_url?: string };
    } catch {
      return undefined;
    }
  }

  private writeOAuthTokenStore(
    tokenStorePath: string,
    payload: {
      access_token: string;
      refresh_token: string;
      instance_url: string;
      issued_at: string;
    }
  ): void {
    fs.mkdirSync(path.dirname(tokenStorePath), { recursive: true });
    fs.writeFileSync(tokenStorePath, JSON.stringify(payload, null, 2), 'utf8');
  }

  private async exchangeOAuthToken(
    tokenUrl: string,
    formData: URLSearchParams
  ): Promise<{ access_token: string; refresh_token?: string; instance_url: string }> {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const raw = await response.text();
    let parsed:
      | {
          access_token?: string;
          refresh_token?: string;
          instance_url?: string;
          error?: string;
          error_description?: string;
        }
      | undefined;
    try {
      parsed = JSON.parse(raw) as {
        access_token?: string;
        refresh_token?: string;
        instance_url?: string;
        error?: string;
        error_description?: string;
      };
    } catch {
      throw new Error('OAuth token endpoint returned non-JSON response');
    }

    if (!response.ok) {
      throw new Error(
        `OAuth token exchange failed: ${response.status} ${parsed.error || ''} ${
          parsed.error_description || ''
        }`.trim()
      );
    }

    if (parsed.error) {
      throw new Error(`OAuth token exchange failed: ${parsed.error} ${parsed.error_description || ''}`.trim());
    }
    if (!parsed.access_token || !parsed.instance_url) {
      throw new Error('OAuth token response missing access_token or instance_url');
    }
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      instance_url: parsed.instance_url
    };
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

    const alias = this.configService.sfAlias();
    const projectPath = resolveSfProjectPath(this.configService.sfProjectPath());
    const parsePath = resolveSfParsePath(this.configService.sfParsePath());
    const autoRefresh = input.autoRefresh ?? this.configService.sfAutoRefreshAfterRetrieve();
    const startedAt = new Date().toISOString();

    await this.ensureSfBinaryInstalled(projectPath);
    this.ensureParsePathWithinProject(projectPath, parsePath);
    if (this.configService.sfAuthMode() === 'cci') {
      await this.ensureCciBinaryInstalled(projectPath);
    }

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
