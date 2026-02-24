import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

interface RefreshBody {
  fixturesPath?: unknown;
}

@Controller()
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('/refresh')
  refresh(@Body() body: RefreshBody = {}): {
    nodeCount: number;
    edgeCount: number;
    elapsedMs: number;
    sourcePath: string;
    databasePath: string;
  } {
    if (body.fixturesPath !== undefined && typeof body.fixturesPath !== 'string') {
      throw new BadRequestException('fixturesPath must be a string');
    }
    return this.ingestionService.refresh(body.fixturesPath);
  }
}
