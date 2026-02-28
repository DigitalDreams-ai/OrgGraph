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
  rebaseline?: unknown;
  summaryOnly?: unknown;
}

type RefreshResult = Awaited<ReturnType<IngestionService['refresh']>>;

@Controller()
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('/refresh')
  async refresh(@Body() body: RefreshBody = {}): Promise<Record<string, unknown>> {
    if (body.fixturesPath !== undefined && typeof body.fixturesPath !== 'string') {
      throw new BadRequestException('fixturesPath must be a string');
    }
    if (typeof body.fixturesPath === 'string' && body.fixturesPath.trim().length === 0) {
      throw new BadRequestException('fixturesPath must be a non-empty string');
    }
    if (body.mode !== undefined && body.mode !== 'full' && body.mode !== 'incremental') {
      throw new BadRequestException('mode must be one of: full, incremental');
    }
    if (body.rebaseline !== undefined && typeof body.rebaseline !== 'boolean') {
      throw new BadRequestException('rebaseline must be a boolean');
    }
    if (body.summaryOnly !== undefined && typeof body.summaryOnly !== 'boolean') {
      throw new BadRequestException('summaryOnly must be a boolean');
    }

    const result = await this.ingestionService.refresh({
      fixturesPath: body.fixturesPath as string | undefined,
      mode: body.mode as RefreshMode | undefined,
      rebaseline: body.rebaseline as boolean | undefined
    });
    return body.summaryOnly === true ? this.summarizeRefreshResult(result) : result;
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

  private summarizeRefreshResult(result: RefreshResult): Record<string, unknown> {
    return {
      snapshotId: result.snapshotId,
      mode: result.mode,
      rebaselineApplied: result.rebaselineApplied,
      skipped: result.skipped,
      skipReason: result.skipReason,
      nodeCount: result.nodeCount,
      edgeCount: result.edgeCount,
      evidenceCount: result.evidenceCount,
      elapsedMs: result.elapsedMs,
      sourcePath: result.sourcePath,
      databasePath: result.databasePath,
      evidenceIndexPath: result.evidenceIndexPath,
      meaningChangeSummary: result.meaningChangeSummary,
      parserCount: result.parserStats.length,
      parserNames: result.parserStats.map((entry) => entry.parser),
      ontology: {
        violationCount: result.ontology.violationCount,
        warningCount: result.ontology.warningCount
      },
      driftPolicy: {
        policyId: result.driftPolicy.policyId,
        enforceOnRefresh: result.driftPolicy.enforceOnRefresh
      },
      driftEvaluation: {
        withinBudget: result.driftEvaluation.withinBudget,
        isBootstrap: result.driftEvaluation.isBootstrap,
        summary: result.driftEvaluation.summary,
        violationCount: result.driftEvaluation.violations.length
      },
      driftReportPath: result.driftReportPath
    };
  }
}
