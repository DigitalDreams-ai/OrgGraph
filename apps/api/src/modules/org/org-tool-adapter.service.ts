import { BadRequestException, Injectable } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { CommandRunnerService, type CommandResult } from './command-runner.service';

@Injectable()
export class OrgToolAdapterService {
  constructor(
    private readonly configService: AppConfigService,
    private readonly commandRunner: CommandRunnerService
  ) {}

  async probeSf(cwd: string): Promise<CommandResult> {
    return this.probe('sf', ['--version'], cwd);
  }

  async probeCci(cwd: string): Promise<CommandResult> {
    return this.probe('cci', ['version'], cwd);
  }

  async ensureSfInstalled(cwd: string): Promise<void> {
    const result = await this.commandRunner.run('sf', ['--version'], {
      cwd,
      timeoutMs: 30_000
    });
    if (result.exitCode !== 0) {
      throw new Error('sf CLI not found in PATH');
    }
  }

  async ensureCciInstalled(cwd: string): Promise<void> {
    const result = await this.commandRunner.run('cci', ['version'], {
      cwd,
      timeoutMs: 30_000
    });
    if (result.exitCode !== 0) {
      throw new Error('cci not found in PATH');
    }
  }

  async displayOrg(alias: string, cwd: string): Promise<CommandResult> {
    return this.commandRunner.run('sf', ['org', 'display', '--target-org', alias, '--json'], {
      cwd,
      timeoutMs: 30_000
    });
  }

  async cciOrgInfo(alias: string, cwd: string): Promise<CommandResult> {
    return this.commandRunner.run('cci', ['org', 'info', alias], {
      cwd,
      timeoutMs: 30_000
    });
  }

  async importAliasIntoCci(alias: string, username: string, cwd: string): Promise<CommandResult> {
    return this.commandRunner.run('cci', ['org', 'import', alias, username], {
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
    try {
      const parsed = JSON.parse(stdout) as { result?: { username?: string } };
      const username = parsed?.result?.username?.trim();
      return username && username.length > 0 ? username : undefined;
    } catch {
      return undefined;
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
      const result = await this.commandRunner.run('sf', args, {
        cwd,
        timeoutMs,
        env: process.env
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
