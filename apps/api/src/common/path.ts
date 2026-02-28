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

export function resolveWorkspaceRoot(startDir = process.cwd()): string {
  return findWorkspaceRoot(startDir);
}

export function resolveOrgumentedAppDataRoot(
  appDataRoot?: string,
  workspaceRoot = resolveWorkspaceRoot()
): string {
  const raw = appDataRoot?.trim() || 'data';
  return path.resolve(workspaceRoot, raw);
}

export function resolveDbPath(
  databaseUrl?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = databaseUrl?.trim() || `file:${path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'orgumented.db')}`;
  const withoutPrefix = raw.startsWith('file:') ? raw.slice(5) : raw;
  return path.resolve(workspaceRoot, withoutPrefix);
}

export function resolveFixturesPath(fixturesPath?: string, workspaceRoot = resolveWorkspaceRoot()): string {
  const raw = fixturesPath?.trim() || 'fixtures/permissions';
  return path.resolve(workspaceRoot, raw);
}

export function resolveUserProfileMapPath(
  mapPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = mapPath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'sf-user-principals.json');
  return path.resolve(workspaceRoot, raw);
}

export function resolveEvidenceIndexPath(
  indexPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = indexPath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'evidence', 'index.json');
  return path.resolve(workspaceRoot, raw);
}

export function resolveRefreshStatePath(
  statePath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = statePath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'refresh', 'state.json');
  return path.resolve(workspaceRoot, raw);
}

export function resolveRefreshAuditPath(
  auditPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = auditPath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'refresh', 'audit.jsonl');
  return path.resolve(workspaceRoot, raw);
}

export function resolveOntologyReportPath(
  reportPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = reportPath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'refresh', 'ontology-report.json');
  return path.resolve(workspaceRoot, raw);
}

export function resolveAskProofStorePath(
  storePath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = storePath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'ask', 'proofs.jsonl');
  return path.resolve(workspaceRoot, raw);
}

export function resolveAskMetricsPath(
  metricsPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = metricsPath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'ask', 'metrics.jsonl');
  return path.resolve(workspaceRoot, raw);
}

export function resolveSemanticSnapshotPath(
  snapshotPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = snapshotPath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'refresh', 'semantic-snapshot.json');
  return path.resolve(workspaceRoot, raw);
}

export function resolveSemanticSnapshotHistoryDir(
  snapshotPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  return path.join(path.dirname(resolveSemanticSnapshotPath(snapshotPath, workspaceRoot, appDataRoot)), 'semantic-snapshots');
}

export function resolveSemanticDiffArtifactsDir(
  snapshotPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  return path.join(path.dirname(resolveSemanticSnapshotPath(snapshotPath, workspaceRoot, appDataRoot)), 'semantic-diffs');
}

export function resolveMetaContextPath(
  metaContextPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = metaContextPath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'meta', 'context.json');
  return path.resolve(workspaceRoot, raw);
}

export function resolveMetaAuditDir(
  metaContextPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  return path.join(path.dirname(resolveMetaContextPath(metaContextPath, workspaceRoot, appDataRoot)), 'audit');
}

export function resolveSfProjectPath(
  projectPath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw = projectPath?.trim() || path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'sf-project');
  return path.resolve(workspaceRoot, raw);
}

export function resolveSfParsePath(
  parsePath?: string,
  workspaceRoot = resolveWorkspaceRoot(),
  appDataRoot?: string
): string {
  const raw =
    parsePath?.trim() ||
    path.join(resolveOrgumentedAppDataRoot(appDataRoot, workspaceRoot), 'sf-project', 'force-app', 'main', 'default');
  return path.resolve(workspaceRoot, raw);
}
