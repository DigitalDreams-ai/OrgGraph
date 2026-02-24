import path from 'node:path';
import fs from 'node:fs';

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

export function resolveDbPath(databaseUrl?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = databaseUrl?.trim() || 'file:data/orggraph.db';
  const withoutPrefix = raw.startsWith('file:') ? raw.slice(5) : raw;
  return path.resolve(workspaceRoot, withoutPrefix);
}

export function resolveFixturesPath(fixturesPath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = fixturesPath?.trim() || 'fixtures/permissions';
  return path.resolve(workspaceRoot, raw);
}

export function resolveUserProfileMapPath(mapPath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = mapPath?.trim() || 'fixtures/permissions/user-profile-map.json';
  return path.resolve(workspaceRoot, raw);
}
