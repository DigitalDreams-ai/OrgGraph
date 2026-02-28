import fs from 'node:fs';
import path from 'node:path';

function findWorkspaceRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
}

export function resolveWorkspaceRoot(): string {
  const configured = process.env.ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return findWorkspaceRoot(process.cwd());
}

export function resolveProjectMemoryStorePath(): string {
  const workspaceRoot = resolveWorkspaceRoot();
  const raw = process.env.ORGUMENTED_PROJECT_MEMORY_PATH?.trim() || 'data/project-memory/events.jsonl';
  return path.resolve(workspaceRoot, raw);
}
