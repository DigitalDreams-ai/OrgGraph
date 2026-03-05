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
      const refreshed = await this.ingestionService.refresh({
        fixturesPath,
        mode: 'full',
        // Runtime bootstrap starts from an ungrounded state, so stale snapshot history must not
        // block recovery with drift-budget enforcement against an obsolete baseline.
        rebaseline: true
      });

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
}
