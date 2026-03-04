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

  constructor(
    private readonly configService: AppConfigService,
    private readonly runtimePaths: RuntimePathsService,
    private readonly graphService: GraphService,
    private readonly ingestionService: IngestionService
  ) {}

  async ensureRuntimeReady(): Promise<void> {
    if (!this.configService.runtimeBootstrapOnStartup()) {
      return;
    }

    const fixturesPath = resolveFixturesPath(
      this.configService.permissionsFixturesPath(),
      this.runtimePaths.workspaceRoot()
    );
    if (!fs.existsSync(fixturesPath)) {
      throw new Error(
        `runtime bootstrap enabled but fixtures path is missing at ${fixturesPath}`
      );
    }

    this.seedFixtureUserPrincipalMap(fixturesPath);

    if (await this.hasGroundedRuntimeData()) {
      return;
    }

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

    this.logger.log(
      `runtime bootstrap ready snapshot=${refreshed.snapshotId} nodes=${refreshed.nodeCount} edges=${refreshed.edgeCount} evidence=${refreshed.evidenceCount}`
    );
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
