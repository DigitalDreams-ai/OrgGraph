import { BadRequestException, Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { GraphService } from '../graph/graph.service';
import { resolveFixturesPath } from '../common/path';
import { PermissionsParseError, PermissionsParserService } from './permissions-parser.service';

@Injectable()
export class IngestionService {
  constructor(
    private readonly configService: AppConfigService,
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
    const sourcePath = resolveFixturesPath(
      fixturesPathFromRequest ?? this.configService.permissionsFixturesPath()
    );
    const start = Date.now();
    let payload;
    try {
      payload = this.parserService.parseFromFixtures(sourcePath);
    } catch (error) {
      if (error instanceof PermissionsParseError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
    const counts = this.graphService.fullRebuild(payload);

    return {
      ...counts,
      elapsedMs: Date.now() - start,
      sourcePath,
      databasePath: this.graphService.getDatabasePath()
    };
  }
}
