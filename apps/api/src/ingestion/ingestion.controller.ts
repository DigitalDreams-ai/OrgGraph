import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { IngestionService, type RefreshMode } from './ingestion.service';

interface RefreshBody {
  fixturesPath?: unknown;
  mode?: unknown;
}

@Controller()
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('/refresh')
  refresh(@Body() body: RefreshBody = {}): {
    mode: RefreshMode;
    skipped: boolean;
    skipReason?: 'no_changes_detected';
    nodeCount: number;
    edgeCount: number;
    evidenceCount: number;
    elapsedMs: number;
    sourcePath: string;
    databasePath: string;
    evidenceIndexPath: string;
  } {
    if (body.fixturesPath !== undefined && typeof body.fixturesPath !== 'string') {
      throw new BadRequestException('fixturesPath must be a string');
    }
    if (typeof body.fixturesPath === 'string' && body.fixturesPath.trim().length === 0) {
      throw new BadRequestException('fixturesPath must be a non-empty string');
    }
    if (body.mode !== undefined && body.mode !== 'full' && body.mode !== 'incremental') {
      throw new BadRequestException('mode must be one of: full, incremental');
    }

    return this.ingestionService.refresh({
      fixturesPath: body.fixturesPath as string | undefined,
      mode: body.mode as RefreshMode | undefined
    });
  }
}
