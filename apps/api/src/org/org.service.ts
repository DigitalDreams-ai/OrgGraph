import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { resolveSfManifestPath, resolveSfParsePath, resolveSfProjectPath } from '../common/path';
import { AppConfigService } from '../config/app-config.service';
import { IngestionService } from '../ingestion/ingestion.service';
import { CommandRunnerService } from './command-runner.service';
import type { OrgRetrieveRequest, OrgRetrieveResponse, OrgStepResult } from './org.types';

@Injectable()
export class OrgService {
  private readonly logger = new Logger(OrgService.name);

  constructor(
    private readonly configService: AppConfigService,
    private readonly ingestionService: IngestionService,
    private readonly commandRunner: CommandRunnerService
  ) {}

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
        const refreshResult = this.ingestionService.refresh({
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
    authMode: 'sfdx_url' | 'jwt';
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

  private ensureProjectScaffold(projectPath: string): void {
    fs.mkdirSync(projectPath, { recursive: true });
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

  private async runAuth(authMode: 'sfdx_url' | 'jwt', alias: string, projectPath: string): Promise<void> {
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

    const clientId = this.configService.sfClientId();
    const jwtKeyPath = this.configService.sfJwtKeyPath();
    const username = this.configService.sfUsername();
    const instanceUrl = this.configService.sfInstanceUrl();
    if (!clientId || !jwtKeyPath || !username || !instanceUrl) {
      throw new Error(
        'SF_CLIENT_ID, SF_JWT_KEY_PATH, SF_USERNAME, and SF_INSTANCE_URL are required for jwt auth mode'
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

  private async runSfCommandWithRetry(args: string[], cwd: string): Promise<void> {
    const retries = this.configService.sfRetryCount();
    const retryDelayMs = this.configService.sfRetryDelayMs();
    const timeoutMs = this.configService.sfTimeoutSeconds() * 1000;

    let lastError = '';
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const result = await this.commandRunner.run('sf', args, { cwd, timeoutMs });
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
