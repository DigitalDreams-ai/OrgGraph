import { BadRequestException, Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IngestionService, type RefreshMode } from './ingestion.service';
import type { OntologyConstraintReport } from './ontology-constraints.service';
import type { ParserStats } from './parser-stats';
import type {
  DriftBudgetEvaluation,
  DriftBudgetPolicy,
  SemanticDriftReportTemplate
} from './semantic-drift-policy.service';

interface RefreshBody {
  fixturesPath?: unknown;
  mode?: unknown;
}

@Controller()
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('/refresh')
  async refresh(@Body() body: RefreshBody = {}): Promise<{
    snapshotId: string;
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
    semanticDiff: {
      addedNodeCount: number;
      removedNodeCount: number;
      addedEdgeCount: number;
      removedEdgeCount: number;
      changedNodeTypeCounts: Record<string, number>;
      changedRelationCounts: Record<string, number>;
    };
    meaningChangeSummary: string;
    driftPolicy: DriftBudgetPolicy;
    driftEvaluation: DriftBudgetEvaluation;
    driftReportPath: string;
  }> {
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

  @Get('/refresh/diff/:snapshotA/:snapshotB')
  refreshDiff(
    @Param('snapshotA') snapshotA: string,
    @Param('snapshotB') snapshotB: string
  ): {
    snapshots: {
      from: {
        snapshotId: string;
        generatedAt: string;
      };
      to: {
        snapshotId: string;
        generatedAt: string;
      };
    };
    semanticDiff: {
      addedNodeCount: number;
      removedNodeCount: number;
      addedEdgeCount: number;
      removedEdgeCount: number;
      changedNodeTypeCounts: Record<string, number>;
      changedRelationCounts: Record<string, number>;
      structureDigestChanged: boolean;
    };
    meaningChangeSummary: string;
    driftPolicy: DriftBudgetPolicy;
    driftEvaluation: DriftBudgetEvaluation;
    reportTemplate: SemanticDriftReportTemplate;
  } {
    return this.ingestionService.getRefreshDiffBySnapshots(snapshotA, snapshotB);
  }

  @Get('/ingest/latest')
  async latestIngest(): Promise<{
    latest?: unknown;
    lowConfidenceSources: Array<{ source: string; count: number }>;
    auditPath: string;
    ontologyReportPath: string;
    ontology: OntologyConstraintReport;
  }> {
    return this.ingestionService.getLatestIngestSummary();
  }
}
