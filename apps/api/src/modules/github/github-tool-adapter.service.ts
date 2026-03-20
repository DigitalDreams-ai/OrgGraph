import { Injectable } from '@nestjs/common';
import { CommandRunnerService, type CommandResult } from '../org/command-runner.service';

@Injectable()
export class GithubToolAdapterService {
  constructor(private readonly commandRunner: CommandRunnerService) {}

  async probeGh(cwd: string): Promise<CommandResult> {
    return this.runGh(['--version'], cwd, 30_000);
  }

  async authStatus(cwd: string, hostname = 'github.com'): Promise<CommandResult> {
    return this.runGh(['auth', 'status', '--hostname', hostname], cwd, 30_000);
  }

  async authToken(cwd: string, hostname = 'github.com'): Promise<CommandResult> {
    return this.runGh(['auth', 'token', '--hostname', hostname], cwd, 30_000);
  }

  async authLogin(cwd: string, hostname = 'github.com'): Promise<CommandResult> {
    return this.runGh(
      ['auth', 'login', '--hostname', hostname, '--web', '--git-protocol', 'https', '--scopes', 'repo,read:org'],
      cwd,
      600_000
    );
  }

  async gitRemoteGetUrl(cwd: string, remote = 'origin'): Promise<CommandResult> {
    try {
      return await this.commandRunner.run('git', ['remote', 'get-url', remote], {
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

  private async runGh(args: string[], cwd: string, timeoutMs: number): Promise<CommandResult> {
    try {
      return await this.commandRunner.run('gh', args, {
        cwd,
        timeoutMs
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
}
