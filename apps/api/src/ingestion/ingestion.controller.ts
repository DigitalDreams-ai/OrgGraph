import { BadRequestException, Body, Controller, Get, Post } from '@nestjs/common';
import { IngestionService, type RefreshMode } from './ingestion.service';
import type { OntologyConstraintReport } from './ontology-constraints.service';
import type { ParserStats } from './parser-stats';

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
    parserStats: ParserStats[];
    ontology: OntologyConstraintReport;
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

  @Get('/ingest/latest')
  latestIngest(): {
    latest?: unknown;
    lowConfidenceSources: Array<{ source: string; count: number }>;
    auditPath: string;
    ontologyReportPath: string;
    ontology: OntologyConstraintReport;
  } {
    return this.ingestionService.getLatestIngestSummary();
  }
}
