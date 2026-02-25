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
  const raw = mapPath?.trim() || 'data/sf-user-principals.json';
  return path.resolve(workspaceRoot, raw);
}

export function resolveEvidenceIndexPath(indexPath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = indexPath?.trim() || 'data/evidence/index.json';
  return path.resolve(workspaceRoot, raw);
}

export function resolveRefreshStatePath(statePath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = statePath?.trim() || 'data/refresh/state.json';
  return path.resolve(workspaceRoot, raw);
}

export function resolveRefreshAuditPath(auditPath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = auditPath?.trim() || 'data/refresh/audit.jsonl';
  return path.resolve(workspaceRoot, raw);
}

export function resolveOntologyReportPath(reportPath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = reportPath?.trim() || 'data/refresh/ontology-report.json';
  return path.resolve(workspaceRoot, raw);
}

export function resolveSfProjectPath(projectPath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = projectPath?.trim() || 'data/sf-project';
  return path.resolve(workspaceRoot, raw);
}

export function resolveSfManifestPath(manifestPath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = manifestPath?.trim() || 'manifest/package.xml';
  return path.resolve(workspaceRoot, raw);
}

export function resolveSfParsePath(parsePath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = parsePath?.trim() || 'data/sf-project/force-app/main/default';
  return path.resolve(workspaceRoot, raw);
}

export function resolveSfAuthCodePath(authCodePath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = authCodePath?.trim() || '.secrets/sf-auth-code.txt';
  return path.resolve(workspaceRoot, raw);
}

export function resolveSfTokenStorePath(tokenStorePath?: string): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const raw = tokenStorePath?.trim() || '.secrets/sf-oauth-token.json';
  return path.resolve(workspaceRoot, raw);
}
