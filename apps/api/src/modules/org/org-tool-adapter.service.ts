import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AppConfigService } from '../../config/app-config.service';
import { CommandRunnerService, type CommandResult } from './command-runner.service';
import type { OrgAliasSummary } from './org.types';

@Injectable()
export class OrgToolAdapterService {
  constructor(
    private readonly configService: AppConfigService,
    private readonly commandRunner: CommandRunnerService
  ) {}

  async probeSf(cwd: string): Promise<CommandResult> {
    return this.runSf(['--version'], cwd, 30_000);
  }

  async probeCci(cwd: string): Promise<CommandResult> {
    return this.probe(this.cciCommand(), ['version'], cwd);
  }

  async ensureSfInstalled(cwd: string): Promise<void> {
    const result = await this.runSf(['--version'], cwd, 30_000);
    if (result.exitCode !== 0) {
      throw new Error('sf CLI not found in PATH');
    }
  }

  async ensureCciInstalled(cwd: string): Promise<void> {
    const result = await this.commandRunner.run(this.cciCommand(), ['version'], {
      cwd,
      timeoutMs: 30_000
    });
    if (result.exitCode !== 0) {
      throw new Error('cci not found in PATH');
    }
  }

  async displayOrg(alias: string, cwd: string): Promise<CommandResult> {
    return this.runSf(['org', 'display', '--target-org', alias, '--json'], cwd, 30_000);
  }

  async listAliases(cwd: string): Promise<CommandResult> {
    return this.runSf(['org', 'list', '--json'], cwd, 30_000);
  }

  async cciOrgInfo(alias: string, cwd: string): Promise<CommandResult> {
    return this.commandRunner.run(this.cciCommand(), ['org', 'info', alias], {
      cwd,
      timeoutMs: 30_000
    });
  }

  async importAliasIntoCci(alias: string, username: string, cwd: string): Promise<CommandResult> {
    return this.commandRunner.run(this.cciCommand(), ['org', 'import', alias, username], {
      cwd,
      timeoutMs: 60_000
    });
  }

  async retrieveMetadata(alias: string, metadataArgs: string[], cwd: string): Promise<void> {
    const args = [
      'project',
      'retrieve',
      'start',
      '--target-org',
      alias,
      '--wait',
      String(this.configService.sfWaitMinutes()),
      '--json'
    ];
    for (const metadataArg of metadataArgs) {
      args.push('--metadata', metadataArg);
    }
    await this.runSfCommandWithRetry(args, cwd);
  }

  async probe(command: string, args: string[], cwd: string): Promise<CommandResult> {
    try {
      return await this.commandRunner.run(command, args, {
        cwd,
        timeoutMs: 30_000
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        exitCode: 1,
        stdout: '',
        stderr: message,
        elapsedMs: 0
      };
    }
  }

  extractSfUsername(stdout: string): string | undefined {
    return this.parseDisplayedOrg(stdout)?.username;
  }

  parseDisplayedOrg(stdout: string): { username?: string; orgId?: string; instanceUrl?: string } | undefined {
    try {
      const parsed = JSON.parse(stdout) as { result?: { username?: string } };
      const result = parsed?.result;
      if (!result || typeof result !== 'object') {
        return undefined;
      }
      const username = typeof result.username === 'string' ? result.username.trim() : undefined;
      const orgId = typeof (result as { id?: string }).id === 'string' ? (result as { id?: string }).id?.trim() : undefined;
      const instanceUrl =
        typeof (result as { instanceUrl?: string }).instanceUrl === 'string'
          ? (result as { instanceUrl?: string }).instanceUrl?.trim()
          : undefined;
      return {
        username: username && username.length > 0 ? username : undefined,
        orgId: orgId && orgId.length > 0 ? orgId : undefined,
        instanceUrl: instanceUrl && instanceUrl.length > 0 ? instanceUrl : undefined
      };
    } catch {
      return undefined;
    }
  }

  parseAliasList(stdout: string): OrgAliasSummary[] {
    try {
      const parsed = JSON.parse(stdout) as {
        result?: {
          nonScratchOrgs?: Array<Record<string, unknown>>;
          scratchOrgs?: Array<Record<string, unknown>>;
        };
      };
      const orgs = [
        ...(Array.isArray(parsed?.result?.nonScratchOrgs) ? parsed.result.nonScratchOrgs : []),
        ...(Array.isArray(parsed?.result?.scratchOrgs) ? parsed.result.scratchOrgs : [])
      ];
      const deduped = new Map<string, OrgAliasSummary>();
      for (const org of orgs) {
        const alias = typeof org.alias === 'string' ? org.alias.trim() : '';
        if (!alias) {
          continue;
        }
        deduped.set(alias, {
          alias,
          username: typeof org.username === 'string' ? org.username.trim() || undefined : undefined,
          orgId: typeof org.orgId === 'string' ? org.orgId.trim() || undefined : undefined,
          instanceUrl: typeof org.instanceUrl === 'string' ? org.instanceUrl.trim() || undefined : undefined,
          isDefault: Boolean(org.isDefaultUsername) || Boolean(org.isDefaultDevHubUsername),
          source: 'sf_cli_keychain'
        });
      }
      return Array.from(deduped.values()).sort((left, right) => left.alias.localeCompare(right.alias));
    } catch {
      return [];
    }
  }

  extractCciVersion(stdout: string, stderr: string): string | undefined {
    const combined = `${stdout}\n${stderr}`;
    const match = combined.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : undefined;
  }

  toActionableBadRequest(error: unknown, alias: string): BadRequestException | undefined {
    if (error instanceof BadRequestException) {
      return error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();
    if (normalized.includes('sf cli not found')) {
      return new BadRequestException({
        message: 'sf CLI is not available in API runtime.',
        details: {
          code: 'SF_CLI_MISSING',
          hint: 'Install sf CLI in the API runtime and restart the service.'
        }
      });
    }
    if (normalized.includes('cci not found')) {
      return new BadRequestException({
        message: 'cci is not available in API runtime.',
        details: {
          code: 'CCI_MISSING',
          hint: 'Install cci in the API runtime and restart the service.'
        }
      });
    }
    if (normalized.includes('no authenticated org for alias')) {
      return new BadRequestException({
        message: `No authenticated org for alias ${alias}.`,
        details: {
          code: 'ALIAS_NOT_AUTHENTICATED',
          hint: `Run 'sf org login web --alias ${alias} --instance-url ${this.configService.sfBaseUrl()} --set-default' locally, then retry.`
        }
      });
    }
    return undefined;
  }

  private async runSfCommandWithRetry(args: string[], cwd: string): Promise<void> {
    const retries = this.configService.sfRetryCount();
    const retryDelayMs = this.configService.sfRetryDelayMs();
    const timeoutMs = this.configService.sfTimeoutSeconds() * 1000;

    let lastError = '';
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const result = await this.runSf(args, cwd, timeoutMs);
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

  private cciCommand(): string {
    if (process.platform !== 'win32') {
      return 'cci';
    }

    const candidate = path.join(os.homedir(), '.local', 'bin', 'cci.exe');
    return existsSync(candidate) ? candidate : 'cci';
  }

  private runSf(args: string[], cwd: string, timeoutMs: number): Promise<CommandResult> {
    const sfRunner = this.sfRunner();
    return this.commandRunner.run(sfRunner.command, sfRunner.args.concat(args), {
      cwd,
      timeoutMs
    });
  }

  private sfRunner(): { command: string; args: string[] } {
    if (process.platform !== 'win32') {
      return { command: 'sf', args: [] };
    }

    const scriptPath = path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'npm',
      'node_modules',
      '@salesforce',
      'cli',
      'bin',
      'run.js'
    );
    if (existsSync(scriptPath)) {
      return {
        command: process.execPath,
        args: ['--no-deprecation', scriptPath]
      };
    }

    const fallback = path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'sf.cmd');
    return {
      command: existsSync(fallback) ? fallback : 'sf',
      args: []
    };
  }
}
