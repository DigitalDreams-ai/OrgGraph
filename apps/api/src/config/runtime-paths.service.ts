import { Injectable } from '@nestjs/common';
import path from 'node:path';
import {
  resolveAskMetricsPath,
  resolveAskProofStorePath,
  resolveDbPath,
  resolveEvidenceIndexPath,
  resolveMetaAuditDir,
  resolveMetaContextPath,
  resolveOntologyReportPath,
  resolveOrgumentedAppDataRoot,
  resolveRefreshAuditPath,
  resolveRefreshStatePath,
  resolveSemanticDiffArtifactsDir,
  resolveSemanticSnapshotHistoryDir,
  resolveSemanticSnapshotPath,
  resolveSfParsePath,
  resolveSfProjectPath,
  resolveUserProfileMapPath,
  resolveWorkspaceRoot
} from '../common/path';
import { AppConfigService } from './app-config.service';

@Injectable()
export class RuntimePathsService {
  constructor(private readonly configService: AppConfigService) {}

  workspaceRoot(): string {
    return resolveWorkspaceRoot();
  }

  appDataRoot(): string {
    return resolveOrgumentedAppDataRoot(this.configService.orgumentedAppDataRoot(), this.workspaceRoot());
  }

  databasePath(): string {
    return resolveDbPath(this.configService.databaseUrl(), this.workspaceRoot(), this.configService.orgumentedAppDataRoot());
  }

  userProfileMapPath(): string {
    return resolveUserProfileMapPath(
      this.configService.userProfileMapPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  evidenceIndexPath(): string {
    return resolveEvidenceIndexPath(
      this.configService.evidenceIndexPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  refreshStatePath(): string {
    return resolveRefreshStatePath(
      this.configService.refreshStatePath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  refreshAuditPath(): string {
    return resolveRefreshAuditPath(
      this.configService.refreshAuditPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  ontologyReportPath(): string {
    return resolveOntologyReportPath(
      this.configService.ontologyReportPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  askProofStorePath(): string {
    return resolveAskProofStorePath(
      this.configService.askProofStorePath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  askMetricsPath(): string {
    return resolveAskMetricsPath(
      this.configService.askMetricsPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  semanticSnapshotPath(): string {
    return resolveSemanticSnapshotPath(
      this.configService.semanticSnapshotPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  semanticSnapshotHistoryDir(): string {
    return resolveSemanticSnapshotHistoryDir(
      this.configService.semanticSnapshotPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  semanticDiffArtifactsDir(): string {
    return resolveSemanticDiffArtifactsDir(
      this.configService.semanticSnapshotPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  metaContextPath(): string {
    return resolveMetaContextPath(
      this.configService.metaContextPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  metaAuditDir(): string {
    return resolveMetaAuditDir(
      this.configService.metaContextPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  sfProjectPath(): string {
    return resolveSfProjectPath(
      this.configService.sfProjectPath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  sfParsePath(): string {
    return resolveSfParsePath(
      this.configService.sfParsePath(),
      this.workspaceRoot(),
      this.configService.orgumentedAppDataRoot()
    );
  }

  logsDir(): string {
    return path.join(this.appDataRoot(), 'logs');
  }

  historyDir(): string {
    return path.join(this.appDataRoot(), 'history');
  }

  orgSessionStatePath(): string {
    return path.join(this.appDataRoot(), 'org', 'session-state.json');
  }

  orgAuthAuditPath(): string {
    return path.join(this.appDataRoot(), 'org', 'auth-session-audit.log');
  }

  orgRetrieveAuditPath(): string {
    return path.join(this.appDataRoot(), 'org', 'sf-retrieve-audit.log');
  }

  githubSelectedRepoPath(): string {
    return path.join(this.appDataRoot(), 'github', 'selected-repo.json');
  }
}
