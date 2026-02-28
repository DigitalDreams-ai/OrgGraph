import { Injectable } from '@nestjs/common';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  elapsedMs: number;
}

@Injectable()
export class CommandRunnerService {
  run(
    command: string,
    args: string[],
    options: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv; stdin?: string } = {}
  ): Promise<CommandResult> {
    const startedAt = Date.now();
    const baseEnv = options.env ?? process.env;
    const env =
      command === 'sf'
        ? {
            ...baseEnv,
            SF_DISABLE_TELEMETRY: baseEnv.SF_DISABLE_TELEMETRY ?? 'true',
            SFDX_DISABLE_TELEMETRY: baseEnv.SFDX_DISABLE_TELEMETRY ?? 'true',
            SF_HIDE_RELEASE_NOTES: baseEnv.SF_HIDE_RELEASE_NOTES ?? 'true'
          }
        : baseEnv;
    const resolved = this.resolveCommand(command, args, env);

    return new Promise((resolve, reject) => {
      const child = spawn(resolved.command, resolved.args, {
        cwd: options.cwd,
        env,
        shell: false,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      const timeoutMs = options.timeoutMs ?? 900_000;

      const timer = setTimeout(() => {
        child.kill('SIGTERM');
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      if (options.stdin !== undefined) {
        child.stdin.write(options.stdin);
      }
      child.stdin.end();

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      child.on('close', (exitCode) => {
        clearTimeout(timer);
        resolve({
          exitCode: exitCode ?? 1,
          stdout,
          stderr,
          elapsedMs: Date.now() - startedAt
        });
      });
    });
  }

  private resolveCommand(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv
  ): { command: string; args: string[] } {
    if (process.platform !== 'win32') {
      return { command, args };
    }

    const resolvedPath = this.resolveWindowsPath(command, env);
    if (!resolvedPath) {
      return { command, args };
    }

    const extension = path.extname(resolvedPath).toLowerCase();
    if (extension === '.cmd' || extension === '.bat') {
      return {
        command: 'cmd.exe',
        args: ['/d', '/s', '/c', resolvedPath, ...args]
      };
    }

    return {
      command: resolvedPath,
      args
    };
  }

  private resolveWindowsPath(command: string, env: NodeJS.ProcessEnv): string | undefined {
    if (command.includes('\\') || command.includes('/') || path.extname(command).length > 0) {
      return command;
    }

    const pathValue = env.PATH || process.env.PATH || '';
    const pathEntries = pathValue.split(';').map((entry) => entry.trim()).filter((entry) => entry.length > 0);
    const pathExts = (env.PATHEXT || process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD')
      .split(';')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);

    for (const directory of pathEntries) {
      for (const extension of pathExts) {
        const candidate = path.join(directory, `${command}${extension}`);
        if (existsSync(candidate)) {
          return candidate;
        }
      }

      const directCandidate = path.join(directory, command);
      if (existsSync(directCandidate)) {
        return directCandidate;
      }
    }

    return undefined;
  }
}
