import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import fs from 'node:fs';
import { resolveFixturesPath, resolveRefreshStatePath } from '../../common/path';
import { AppConfigService } from '../../config/app-config.service';
import { RuntimeBootstrapService } from '../../config/runtime-bootstrap.service';
import { EvidenceStoreService } from '../evidence/evidence-store.service';
import { GraphService } from '../graph/graph.service';

@Controller()
export class HealthController {
  constructor(
    private readonly configService: AppConfigService,
    private readonly graphService: GraphService,
    private readonly evidenceStore: EvidenceStoreService
  ) {}

  @Get('/health')
  health(): { status: 'ok'; service: 'api' } {
    return { status: 'ok', service: 'api' };
  }

  @Get('/ready')
  async ready(): Promise<{
    status: 'ready';
    checks: {
      bootstrap: {
        ok: boolean;
        status: string;
        message?: string;
        updatedAt: string;
      };
      db: { ok: boolean; backend: string; storageRef: string; nodeCount: number; edgeCount: number };
      fixtures: { ok: boolean; sourcePath: string };
      evidence: { ok: boolean; indexPath: string };
    };
  }> {
    try {
      const dbCounts = await this.graphService.getCounts();
      const fixturesPath = this.resolveReportedFixturesPath();
      const evidencePath = this.evidenceStore.getIndexPath();
      const evidenceDocumentCount = this.evidenceStore.getDocumentCount();
      const bootstrapState = RuntimeBootstrapService.readBootstrapState();
      const checks = {
        bootstrap: {
          ok: bootstrapState.status !== 'failed',
          status: bootstrapState.status,
          message: bootstrapState.message,
          updatedAt: bootstrapState.updatedAt
        },
        db: {
          ok: dbCounts.nodeCount > 0 && dbCounts.edgeCount > 0,
          backend: this.graphService.backend(),
          storageRef: this.graphService.getDatabasePath(),
          nodeCount: dbCounts.nodeCount,
          edgeCount: dbCounts.edgeCount
        },
        fixtures: { ok: fs.existsSync(fixturesPath), sourcePath: fixturesPath },
        evidence: {
          ok: fs.existsSync(evidencePath) && evidenceDocumentCount > 0,
          indexPath: evidencePath
        }
      };

      if (!checks.bootstrap.ok || !checks.db.ok || !checks.fixtures.ok || !checks.evidence.ok) {
        throw new ServiceUnavailableException({
          message: checks.bootstrap.ok ? 'runtime not grounded' : 'runtime bootstrap failed',
          checks
        });
      }

      return {
        status: 'ready',
        checks
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException({
        message: error instanceof Error ? error.message : 'readiness check failed'
      });
    }
  }

  private resolveReportedFixturesPath(): string {
    const configuredPath = resolveFixturesPath(this.configService.permissionsFixturesPath());
    const statePath = resolveRefreshStatePath(this.configService.refreshStatePath());

    if (!fs.existsSync(statePath)) {
      return configuredPath;
    }

    try {
      const raw = fs.readFileSync(statePath, 'utf8');
      const parsed = JSON.parse(raw) as { sourcePath?: string };
      if (typeof parsed.sourcePath === 'string' && parsed.sourcePath.trim().length > 0) {
        const runtimeStatePath = parsed.sourcePath.trim();
        // Refresh state can be generated from a different runtime context (host vs container).
        // Only trust the stored source path when it exists in the current runtime.
        if (fs.existsSync(runtimeStatePath)) {
          return runtimeStatePath;
        }
      }
      return configuredPath;
    } catch {
      return configuredPath;
    }
  }
}
