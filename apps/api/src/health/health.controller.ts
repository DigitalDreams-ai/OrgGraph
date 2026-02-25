import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import fs from 'node:fs';
import { resolveFixturesPath } from '../common/path';
import { AppConfigService } from '../config/app-config.service';
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
  ready(): {
    status: 'ready';
    checks: {
      db: { ok: boolean; nodeCount: number; edgeCount: number };
      fixtures: { ok: boolean; sourcePath: string };
      evidence: { ok: boolean; indexPath: string };
    };
  } {
    try {
      const dbCounts = this.graphService.getCounts();
      const fixturesPath = resolveFixturesPath(this.configService.permissionsFixturesPath());
      const evidencePath = this.evidenceStore.getIndexPath();

      const checks = {
        db: { ok: true, nodeCount: dbCounts.nodeCount, edgeCount: dbCounts.edgeCount },
        fixtures: { ok: fs.existsSync(fixturesPath), sourcePath: fixturesPath },
        evidence: { ok: fs.existsSync(evidencePath), indexPath: evidencePath }
      };

      return {
        status: 'ready',
        checks
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        message: error instanceof Error ? error.message : 'readiness check failed'
      });
    }
  }
}

