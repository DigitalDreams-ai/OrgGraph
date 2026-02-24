import { Body, Controller, Post } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

interface RefreshBody {
  fixturesPath?: string;
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
    return this.ingestionService.refresh(body.fixturesPath);
  }
}
