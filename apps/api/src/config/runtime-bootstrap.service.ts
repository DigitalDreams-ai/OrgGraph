import { Injectable, Logger } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { resolveFixturesPath } from '../common/path';
import { GraphService } from '../modules/graph/graph.service';
import { IngestionService } from '../modules/ingestion/ingestion.service';
import { AppConfigService } from './app-config.service';
import { RuntimePathsService } from './runtime-paths.service';

@Injectable()
export class RuntimeBootstrapService {
  private readonly logger = new Logger(RuntimeBootstrapService.name);
  private static bootstrapState: {
    status: 'pending' | 'disabled' | 'ready' | 'failed';
    message?: string;
    updatedAt: string;
  } = {
    status: 'pending',
    updatedAt: new Date(0).toISOString()
  };

  constructor(
    private readonly configService: AppConfigService,
    private readonly runtimePaths: RuntimePathsService,
    private readonly graphService: GraphService,
    private readonly ingestionService: IngestionService
  ) {}

  async ensureRuntimeReady(): Promise<boolean> {
    RuntimeBootstrapService.bootstrapState = {
      status: 'pending',
      updatedAt: new Date().toISOString()
    };

    if (!this.configService.runtimeBootstrapOnStartup()) {
      RuntimeBootstrapService.bootstrapState = {
        status: 'disabled',
        updatedAt: new Date().toISOString(),
        message: 'runtime bootstrap disabled by configuration'
      };
      return true;
    }

    const fixturesPath = resolveFixturesPath(
      this.configService.permissionsFixturesPath(),
      this.runtimePaths.workspaceRoot()
    );
    if (!fs.existsSync(fixturesPath)) {
      const message = `runtime bootstrap enabled but fixtures path is missing at ${fixturesPath}`;
      RuntimeBootstrapService.bootstrapState = {
        status: 'failed',
        message,
        updatedAt: new Date().toISOString()
      };
      this.logger.error(message);
      return false;
    }

    this.seedFixtureUserPrincipalMap(fixturesPath);

    if (await this.hasGroundedRuntimeData()) {
      RuntimeBootstrapService.bootstrapState = {
        status: 'ready',
        updatedAt: new Date().toISOString(),
        message: 'runtime already grounded'
      };
      return true;
    }

    try {
      this.logger.log(`bootstrapping runtime from fixtures at ${fixturesPath}`);
      const refreshRequest = {
        fixturesPath,
        mode: 'full' as const,
        // Runtime bootstrap starts from an ungrounded state, so stale snapshot history must not
        // block recovery with drift-budget enforcement against an obsolete baseline.
        rebaseline: true
      };
      let refreshed;
      try {
        refreshed = await this.ingestionService.refresh(refreshRequest);
      } catch (error) {
        if (!this.isRecoverableSemanticBootstrapError(error)) {
          throw error;
        }
        this.logger.warn(
          'bootstrap refresh hit recoverable semantic drift guard; clearing stale semantic state and retrying once with rebaseline'
        );
        this.clearStaleSemanticStateArtifacts();
        refreshed = await this.ingestionService.refresh(refreshRequest);
      }

      if (refreshed.nodeCount <= 0 || refreshed.edgeCount <= 0 || refreshed.evidenceCount <= 0) {
        throw new Error(
          'runtime bootstrap completed without grounded graph/evidence state'
        );
      }

      const message = `runtime bootstrap ready snapshot=${refreshed.snapshotId} nodes=${refreshed.nodeCount} edges=${refreshed.edgeCount} evidence=${refreshed.evidenceCount}`;
      RuntimeBootstrapService.bootstrapState = {
        status: 'ready',
        message,
        updatedAt: new Date().toISOString()
      };
      this.logger.log(message);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'runtime bootstrap failed with unknown error';
      RuntimeBootstrapService.bootstrapState = {
        status: 'failed',
        message,
        updatedAt: new Date().toISOString()
      };
      this.logger.error(`runtime bootstrap failed: ${message}`);
      return false;
    }
  }

  getBootstrapState(): {
    status: 'pending' | 'disabled' | 'ready' | 'failed';
    message?: string;
    updatedAt: string;
  } {
    return RuntimeBootstrapService.bootstrapState;
  }

  static readBootstrapState(): {
    status: 'pending' | 'disabled' | 'ready' | 'failed';
    message?: string;
    updatedAt: string;
  } {
    return RuntimeBootstrapService.bootstrapState;
  }

  private async hasGroundedRuntimeData(): Promise<boolean> {
    const counts = await this.graphService.getCounts();
    if (counts.nodeCount <= 0 || counts.edgeCount <= 0) {
      return false;
    }

    const evidencePath = this.runtimePaths.evidenceIndexPath();
    const refreshStatePath = this.runtimePaths.refreshStatePath();
    if (!fs.existsSync(evidencePath) || !fs.existsSync(refreshStatePath)) {
      return false;
    }

    return this.countEvidenceDocuments(evidencePath) > 0;
  }

  private seedFixtureUserPrincipalMap(fixturesPath: string): void {
    const destinationPath = this.runtimePaths.userProfileMapPath();
    if (fs.existsSync(destinationPath)) {
      return;
    }

    const sourcePath = path.join(fixturesPath, 'user-profile-map.json');
    if (!fs.existsSync(sourcePath)) {
      return;
    }

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.copyFileSync(sourcePath, destinationPath);
    this.logger.log(`seeded user principal map from fixture baseline: ${destinationPath}`);
  }

  private countEvidenceDocuments(evidencePath: string): number {
    if (!fs.existsSync(evidencePath)) {
      return 0;
    }

    const raw = fs.readFileSync(evidencePath, 'utf8').trim();
    if (raw.length === 0) {
      return 0;
    }

    if (raw.startsWith('{') && raw.includes('"documents"')) {
      try {
        const parsed = JSON.parse(raw) as { documents?: unknown[] };
        return Array.isArray(parsed.documents) ? parsed.documents.length : 0;
      } catch {
        return 0;
      }
    }

    return raw.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  }

  private isRecoverableSemanticBootstrapError(error: unknown): boolean {
    const recoverableTokens = [
      'semantic drift budget exceeded',
      'semantic drift exceeds budget',
      'semantic drift regression detected'
    ];
    const messages = this.collectErrorMessages(error).map((entry) => entry.toLowerCase());
    return messages.some((entry) => recoverableTokens.some((token) => entry.includes(token)));
  }

  private collectErrorMessages(error: unknown): string[] {
    const messages: string[] = [];
    if (error instanceof Error && typeof error.message === 'string') {
      messages.push(error.message);
    }

    if (error && typeof error === 'object') {
      const response = (error as { response?: unknown }).response;
      if (typeof response === 'string') {
        messages.push(response);
      } else if (response && typeof response === 'object') {
        const responseMessage = (response as { message?: unknown }).message;
        if (typeof responseMessage === 'string') {
          messages.push(responseMessage);
        } else if (Array.isArray(responseMessage)) {
          for (const entry of responseMessage) {
            if (typeof entry === 'string') {
              messages.push(entry);
            }
          }
        }
      }
    }

    return [...new Set(messages.map((entry) => entry.trim()).filter((entry) => entry.length > 0))];
  }

  private clearStaleSemanticStateArtifacts(): void {
    const removablePaths = [
      this.runtimePaths.refreshStatePath(),
      this.runtimePaths.semanticSnapshotPath(),
      this.runtimePaths.semanticSnapshotHistoryDir(),
      this.runtimePaths.semanticDiffArtifactsDir()
    ];

    for (const targetPath of removablePaths) {
      try {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'unknown stale-state cleanup failure';
        this.logger.warn(`failed to clear stale semantic state artifact at ${targetPath}: ${message}`);
      }
    }
  }
}
