import { Injectable } from '@nestjs/common';
import { GraphService } from '../graph/graph.service';
import { resolveFixturesPath } from '../common/path';
import { PermissionsParserService } from './permissions-parser.service';

@Injectable()
export class IngestionService {
  constructor(
    private readonly graphService: GraphService,
    private readonly parserService: PermissionsParserService
  ) {}

  refresh(fixturesPathFromRequest?: string): {
    nodeCount: number;
    edgeCount: number;
    elapsedMs: number;
    sourcePath: string;
    databasePath: string;
  } {
    const sourcePath = resolveFixturesPath(fixturesPathFromRequest ?? process.env.PERMISSIONS_FIXTURES_PATH);
    const start = Date.now();
    const payload = this.parserService.parseFromFixtures(sourcePath);
    const counts = this.graphService.fullRebuild(payload);

    return {
      ...counts,
      elapsedMs: Date.now() - start,
      sourcePath,
      databasePath: this.graphService.getDatabasePath()
    };
  }
}
