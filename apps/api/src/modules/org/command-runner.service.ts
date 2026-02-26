import { Injectable } from '@nestjs/common';
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
    options: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}
  ): Promise<CommandResult> {
    const startedAt = Date.now();
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env ?? process.env,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe']
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
}
