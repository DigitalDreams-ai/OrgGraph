import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AppConfigService } from '../../config/app-config.service';
import { EvidenceStoreService } from '../evidence/evidence-store.service';
import { GraphService } from '../graph/graph.service';
import {
  resolveFixturesPath,
  resolveSemanticDiffArtifactsDir,
  resolveSemanticSnapshotHistoryDir,
  resolveSemanticSnapshotPath,
  resolveOntologyReportPath,
  resolveRefreshAuditPath,
  resolveRefreshStatePath
} from '../../common/path';
import type { GraphPayload } from '../graph/graph.types';
import { ApexClassParseError, ApexClassParserService } from './apex-class-parser.service';
import { ApexTriggerParseError, ApexTriggerParserService } from './apex-trigger-parser.service';
import { ConnectedAppParserService } from './connected-app-parser.service';
import { CustomObjectParserService } from './custom-object-parser.service';
import { CustomPermissionParserService } from './custom-permission-parser.service';
import { FlowParseError, FlowParserService } from './flow-parser.service';
import type { OntologyConstraintReport } from './ontology-constraints.service';
import { OntologyConstraintsService } from './ontology-constraints.service';
import type { ParserStats } from './parser-stats';
import { PermissionSetGroupParserService } from './permission-set-group-parser.service';
import { PermissionsParseError, PermissionsParserService } from './permissions-parser.service';
import {
  SemanticDriftPolicyService,
  type DriftBudgetEvaluation,
  type DriftBudgetPolicy,
  type SemanticDiffSummary,
  type SemanticDriftReportTemplate,
  type SemanticSnapshotRecord
} from './semantic-drift-policy.service';
import { StagedUiMetadataParserService } from './staged-ui-metadata-parser.service';

export type RefreshMode = 'full' | 'incremental';

interface RefreshState {
  snapshotId: string;
  sourcePath: string;
  fingerprint: string;
  refreshedAt: string;
  parserStats: ParserStats[];
  nodeCount: number;
  edgeCount: number;
  evidenceCount: number;
  mode: RefreshMode;
  ontology: OntologyConstraintReport;
  semanticDiff: SemanticDiffSummary;
  meaningChangeSummary: string;
  rebaselineApplied: boolean;
}

interface RefreshOptions {
  fixturesPath?: string;
  mode?: RefreshMode;
  rebaseline?: boolean;
}

@Injectable()
export class IngestionService {
  private refreshInProgress = false;

  constructor(
    private readonly configService: AppConfigService,
    private readonly graphService: GraphService,
    private readonly evidenceStore: EvidenceStoreService,
    private readonly parserService: PermissionsParserService,
    private readonly triggerParserService: ApexTriggerParserService,
    private readonly classParserService: ApexClassParserService,
    private readonly flowParserService: FlowParserService,
    private readonly customObjectParserService: CustomObjectParserService,
    private readonly permissionSetGroupParserService: PermissionSetGroupParserService,
    private readonly customPermissionParserService: CustomPermissionParserService,
    private readonly connectedAppParserService: ConnectedAppParserService,
    private readonly stagedUiMetadataParserService: StagedUiMetadataParserService,
    private readonly constraintsService: OntologyConstraintsService,
    private readonly driftPolicyService: SemanticDriftPolicyService
  ) {}

  async refresh(options: RefreshOptions = {}): Promise<{
    snapshotId: string;
    mode: RefreshMode;
    rebaselineApplied: boolean;
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
    semanticDiff: SemanticDiffSummary;
    meaningChangeSummary: string;
    driftPolicy: DriftBudgetPolicy;
    driftEvaluation: DriftBudgetEvaluation;
    driftReportPath: string;
  }> {
    if (this.refreshInProgress) {
      throw new ConflictException('refresh already in progress');
    }
    this.refreshInProgress = true;

    try {
      const mode: RefreshMode = options.mode ?? 'full';
      const sourcePath = resolveFixturesPath(
        options.fixturesPath ?? this.configService.permissionsFixturesPath()
      );
      const statePath = resolveRefreshStatePath(this.configService.refreshStatePath());
      const auditPath = resolveRefreshAuditPath(this.configService.refreshAuditPath());
      const ontologyReportPath = resolveOntologyReportPath(this.configService.ontologyReportPath());
      const semanticSnapshotPath = resolveSemanticSnapshotPath(
        this.configService.semanticSnapshotPath()
      );
      const semanticSnapshotHistoryDir = resolveSemanticSnapshotHistoryDir(
        this.configService.semanticSnapshotPath()
      );
      const semanticDiffArtifactsDir = resolveSemanticDiffArtifactsDir(
        this.configService.semanticSnapshotPath()
      );
      const driftPolicy = this.driftPolicyService.buildPolicy();
      const start = Date.now();
      const fingerprint = this.buildFixtureFingerprint(sourcePath);
      const requestedRebaseline = options.rebaseline === true;

      if (mode === 'incremental' && (await this.canSkipRefresh(sourcePath, statePath, fingerprint))) {
        const counts = await this.graphService.getCounts();
        const previousState = this.readState(statePath);
        const parserStats = previousState?.parserStats ?? [];
        const ontology = this.readOntologyReport(ontologyReportPath);
        const semanticDiff: SemanticDiffSummary = {
          addedNodeCount: 0,
          removedNodeCount: 0,
          addedEdgeCount: 0,
          removedEdgeCount: 0,
          structureDigestChanged: false,
          changedNodeTypeCounts: {},
          changedRelationCounts: {}
        };
        const meaningChangeSummary =
          'no semantic changes detected (incremental skip, unchanged fingerprint)';
        const driftEvaluation = this.driftPolicyService.evaluate(
          driftPolicy,
          semanticDiff,
          previousState ? this.readSnapshotById(previousState.snapshotId, semanticSnapshotHistoryDir) : undefined
        );
        const driftReport = this.driftPolicyService.buildDriftReportTemplate({
          fromSnapshotId: previousState?.snapshotId,
          toSnapshotId: previousState?.snapshotId ?? 'unknown',
          meaningChangeSummary,
          diff: semanticDiff
        });
        const driftReportPath = this.writeSemanticDiffArtifact(semanticDiffArtifactsDir, {
          sourcePath,
          fromSnapshotId: previousState?.snapshotId,
          toSnapshotId: previousState?.snapshotId ?? 'unknown',
          fingerprint,
          semanticDiff,
          meaningChangeSummary,
          driftPolicy,
          driftEvaluation,
          reportTemplate: driftReport
        });
        this.appendAuditEntry(auditPath, {
          snapshotId: previousState?.snapshotId ?? 'unknown',
          sourcePath,
          fingerprint,
          refreshedAt: new Date().toISOString(),
          parserStats,
          nodeCount: counts.nodeCount,
          edgeCount: counts.edgeCount,
          evidenceCount: this.evidenceStore.getDocumentCount(),
          mode,
          ontology,
          semanticDiff,
          meaningChangeSummary,
          rebaselineApplied: false
        });
        return {
          snapshotId: previousState?.snapshotId ?? 'unknown',
          mode,
          rebaselineApplied: false,
          skipped: true,
          skipReason: 'no_changes_detected',
          ...counts,
          evidenceCount: this.evidenceStore.getDocumentCount(),
          elapsedMs: Date.now() - start,
          sourcePath,
          databasePath: this.graphService.getDatabasePath(),
          evidenceIndexPath: this.evidenceStore.getIndexPath(),
          parserStats,
          ontology,
          semanticDiff,
          meaningChangeSummary,
          driftPolicy,
          driftEvaluation,
          driftReportPath
        };
      }

      let payload: GraphPayload;
      try {
        const permissionsPayload = this.parserService.parseFromFixtures(sourcePath);
        const triggerPayload = this.triggerParserService.parseFromFixtures(sourcePath);
        const classPayload = this.classParserService.parseFromFixtures(sourcePath);
        const flowPayload = this.flowParserService.parseFromFixtures(sourcePath);
        const customObjectPayload = this.customObjectParserService.parseFromFixtures(sourcePath);
        const permissionSetGroupPayload =
          this.permissionSetGroupParserService.parseFromFixtures(sourcePath);
        const customPermissionPayload = this.customPermissionParserService.parseFromFixtures(sourcePath);
        const connectedAppPayload = this.connectedAppParserService.parseFromFixtures(sourcePath);
        const uiMetadataPayload = this.configService.ingestUiMetadataEnabled()
          ? this.stagedUiMetadataParserService.parseFromFixtures(sourcePath)
          : { nodes: [], edges: [] };
        payload = this.mergePayloads(
          permissionsPayload,
          triggerPayload,
          classPayload,
          flowPayload,
          customObjectPayload,
          permissionSetGroupPayload,
          customPermissionPayload,
          connectedAppPayload,
          uiMetadataPayload
        );
      } catch (error) {
        if (
          error instanceof PermissionsParseError ||
          error instanceof ApexTriggerParseError ||
          error instanceof ApexClassParseError ||
          error instanceof FlowParseError
        ) {
          throw new BadRequestException(error.message);
        }
        throw error;
      }

      const previousState = this.readState(statePath);
      const previousSemantic = this.readSemanticSnapshot(semanticSnapshotPath);
      const sourceTransitionBootstrap = this.shouldBootstrapForSourceTransition(
        previousSemantic?.sourcePath ?? previousState?.sourcePath,
        sourcePath
      );
      const rebaselineApplied = requestedRebaseline || sourceTransitionBootstrap;
      const currentSemantic = this.buildSemanticSnapshot(fingerprint, payload, sourcePath);
      const semanticDiff = this.computeSemanticDiff(previousSemantic, currentSemantic);
      const meaningChangeSummary = this.describeMeaningChange(
        semanticDiff,
        rebaselineApplied ? 'rebaseline applied before drift evaluation' : undefined
      );
      const driftEvaluation = this.driftPolicyService.evaluate(
        driftPolicy,
        semanticDiff,
        rebaselineApplied ? undefined : previousSemantic
      );
      if (
        !rebaselineApplied &&
        previousSemantic &&
        previousSemantic.fingerprint === fingerprint &&
        this.hasSemanticChanges(semanticDiff)
      ) {
        throw new BadRequestException(
          'Semantic drift regression detected: unchanged fingerprint produced semantic diff'
        );
      }
      if (
        driftPolicy.enforceOnRefresh &&
        !driftEvaluation.isBootstrap &&
        !driftEvaluation.withinBudget
      ) {
        throw new BadRequestException(`Semantic drift budget exceeded: ${driftEvaluation.summary}`);
      }
      const ontology = this.constraintsService.validate(payload);
      if (ontology.violationCount > 0) {
        const first = ontology.violations[0];
        throw new BadRequestException(
          `Ontology constraint violation: ${first.message}`
        );
      }
      this.writeOntologyReport(ontologyReportPath, ontology);
      const counts = await this.graphService.fullRebuild(payload);
      const evidence = this.evidenceStore.reindexFromFixtures(sourcePath);
      const parserStats = [
        this.parserService.getLastStats(),
        this.triggerParserService.getLastStats(),
        this.classParserService.getLastStats(),
        this.flowParserService.getLastStats(),
        this.customObjectParserService.getLastStats(),
        this.permissionSetGroupParserService.getLastStats(),
        this.customPermissionParserService.getLastStats(),
        this.connectedAppParserService.getLastStats(),
        ...(this.configService.ingestUiMetadataEnabled()
          ? [this.stagedUiMetadataParserService.getLastStats()]
          : [])
      ];
      const state: RefreshState = {
        snapshotId: currentSemantic.snapshotId,
        sourcePath,
        fingerprint,
        refreshedAt: new Date().toISOString(),
        parserStats,
        nodeCount: counts.nodeCount,
        edgeCount: counts.edgeCount,
        evidenceCount: evidence.documentCount,
        mode,
        ontology,
        semanticDiff,
        meaningChangeSummary,
        rebaselineApplied
      };
      this.writeState(statePath, state);
      this.appendAuditEntry(auditPath, state);
      this.writeSemanticSnapshot(semanticSnapshotPath, currentSemantic);
      this.writeSemanticSnapshotHistory(semanticSnapshotHistoryDir, currentSemantic);
      const driftReport = this.driftPolicyService.buildDriftReportTemplate({
        fromSnapshotId: previousSemantic?.snapshotId,
        toSnapshotId: currentSemantic.snapshotId,
        meaningChangeSummary,
        diff: semanticDiff
      });
      const driftReportPath = this.writeSemanticDiffArtifact(semanticDiffArtifactsDir, {
        sourcePath,
        fromSnapshotId: previousSemantic?.snapshotId,
        toSnapshotId: currentSemantic.snapshotId,
        fingerprint,
        semanticDiff,
        meaningChangeSummary,
        driftPolicy,
        driftEvaluation,
        reportTemplate: driftReport
      });

      return {
        snapshotId: currentSemantic.snapshotId,
        mode,
        rebaselineApplied,
        skipped: false,
        ...counts,
        evidenceCount: evidence.documentCount,
        elapsedMs: Date.now() - start,
        sourcePath,
        databasePath: this.graphService.getDatabasePath(),
        evidenceIndexPath: evidence.sourcePath,
        parserStats,
        ontology,
        semanticDiff,
        meaningChangeSummary,
        driftPolicy,
        driftEvaluation,
        driftReportPath
      };
    } finally {
      this.refreshInProgress = false;
    }
  }

  async getLatestIngestSummary(): Promise<{
    latest?: RefreshState;
    lowConfidenceSources: Array<{ source: string; count: number }>;
    auditPath: string;
    ontologyReportPath: string;
    ontology: OntologyConstraintReport;
  }> {
    const statePath = resolveRefreshStatePath(this.configService.refreshStatePath());
    const auditPath = resolveRefreshAuditPath(this.configService.refreshAuditPath());
    const ontologyReportPath = resolveOntologyReportPath(this.configService.ontologyReportPath());
    return {
      latest: this.readState(statePath),
      lowConfidenceSources: await this.graphService.getLowConfidenceSummary(10),
      auditPath,
      ontologyReportPath,
      ontology: this.readOntologyReport(ontologyReportPath)
    };
  }

  getRefreshDiffBySnapshots(
    snapshotARef: string,
    snapshotBRef: string
  ): {
    snapshots: {
      from: SemanticSnapshotRecord;
      to: SemanticSnapshotRecord;
    };
    semanticDiff: SemanticDiffSummary;
    meaningChangeSummary: string;
    driftPolicy: DriftBudgetPolicy;
    driftEvaluation: DriftBudgetEvaluation;
    reportTemplate: SemanticDriftReportTemplate;
  } {
    const semanticSnapshotPath = resolveSemanticSnapshotPath(this.configService.semanticSnapshotPath());
    const semanticSnapshotHistoryDir = resolveSemanticSnapshotHistoryDir(
      this.configService.semanticSnapshotPath()
    );
    const fromSnapshot = this.resolveSnapshotRef(
      snapshotARef,
      semanticSnapshotPath,
      semanticSnapshotHistoryDir
    );
    const toSnapshot = this.resolveSnapshotRef(
      snapshotBRef,
      semanticSnapshotPath,
      semanticSnapshotHistoryDir
    );
    if (!fromSnapshot) {
      throw new BadRequestException(`Unknown snapshot reference: ${snapshotARef}`);
    }
    if (!toSnapshot) {
      throw new BadRequestException(`Unknown snapshot reference: ${snapshotBRef}`);
    }

    const semanticDiff = this.computeSemanticDiff(fromSnapshot, toSnapshot);
    const meaningChangeSummary = this.describeMeaningChange(semanticDiff);
    const driftPolicy = this.driftPolicyService.buildPolicy();
    const driftEvaluation = this.driftPolicyService.evaluate(driftPolicy, semanticDiff, fromSnapshot);
    const reportTemplate = this.driftPolicyService.buildDriftReportTemplate({
      fromSnapshotId: fromSnapshot.snapshotId,
      toSnapshotId: toSnapshot.snapshotId,
      meaningChangeSummary,
      diff: semanticDiff
    });

    return {
      snapshots: {
        from: fromSnapshot,
        to: toSnapshot
      },
      semanticDiff,
      meaningChangeSummary,
      driftPolicy,
      driftEvaluation,
      reportTemplate
    };
  }

  private async canSkipRefresh(sourcePath: string, statePath: string, fingerprint: string): Promise<boolean> {
    const previous = this.readState(statePath);
    if (!previous) {
      return false;
    }

    if (previous.sourcePath !== sourcePath || previous.fingerprint !== fingerprint) {
      return false;
    }

    if (!(await this.graphService.canServeQueries())) {
      return false;
    }

    if (!fs.existsSync(this.evidenceStore.getIndexPath())) {
      return false;
    }

    return true;
  }

  private readState(statePath: string): RefreshState | undefined {
    if (!fs.existsSync(statePath)) {
      return undefined;
    }

    try {
      const raw = fs.readFileSync(statePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<RefreshState>;
      if (
        typeof parsed.sourcePath !== 'string' ||
        typeof parsed.fingerprint !== 'string' ||
        typeof parsed.refreshedAt !== 'string'
      ) {
        return undefined;
      }
      return {
        snapshotId:
          typeof parsed.snapshotId === 'string' && parsed.snapshotId.length > 0
            ? parsed.snapshotId
            : 'unknown',
        sourcePath: parsed.sourcePath,
        fingerprint: parsed.fingerprint,
        refreshedAt: parsed.refreshedAt,
        parserStats: Array.isArray(parsed.parserStats) ? (parsed.parserStats as ParserStats[]) : [],
        nodeCount: typeof parsed.nodeCount === 'number' ? parsed.nodeCount : 0,
        edgeCount: typeof parsed.edgeCount === 'number' ? parsed.edgeCount : 0,
        evidenceCount: typeof parsed.evidenceCount === 'number' ? parsed.evidenceCount : 0,
        mode: parsed.mode === 'incremental' ? 'incremental' : 'full',
        rebaselineApplied: parsed.rebaselineApplied === true,
        semanticDiff:
          typeof parsed.semanticDiff === 'object' && parsed.semanticDiff !== null
            ? (parsed.semanticDiff as SemanticDiffSummary)
            : {
                addedNodeCount: 0,
                removedNodeCount: 0,
                addedEdgeCount: 0,
                removedEdgeCount: 0,
                structureDigestChanged: false,
                changedNodeTypeCounts: {},
                changedRelationCounts: {}
              },
        meaningChangeSummary:
          typeof parsed.meaningChangeSummary === 'string'
            ? parsed.meaningChangeSummary
            : 'meaning change summary unavailable',
        ontology:
          typeof parsed.ontology === 'object' && parsed.ontology !== null
            ? (parsed.ontology as OntologyConstraintReport)
            : {
                validatedAt: new Date(0).toISOString(),
                nodeCount: 0,
                edgeCount: 0,
                violationCount: 0,
                warningCount: 0,
                violations: [],
                warnings: []
              }
      };
    } catch {
      return undefined;
    }
  }

  private writeState(statePath: string, state: RefreshState): void {
    fs.mkdirSync(path.dirname(statePath), { recursive: true });
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
  }

  private appendAuditEntry(auditPath: string, state: RefreshState): void {
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    fs.appendFileSync(auditPath, `${JSON.stringify(state)}\n`, 'utf8');
  }

  private writeOntologyReport(reportPath: string, report: OntologyConstraintReport): void {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  }

  private readOntologyReport(reportPath: string): OntologyConstraintReport {
    if (!fs.existsSync(reportPath)) {
      return {
        validatedAt: new Date(0).toISOString(),
        nodeCount: 0,
        edgeCount: 0,
        violationCount: 0,
        warningCount: 0,
        violations: [],
        warnings: []
      };
    }

    try {
      return JSON.parse(fs.readFileSync(reportPath, 'utf8')) as OntologyConstraintReport;
    } catch {
      return {
        validatedAt: new Date(0).toISOString(),
        nodeCount: 0,
        edgeCount: 0,
        violationCount: 0,
        warningCount: 0,
        violations: [],
        warnings: []
      };
    }
  }

  private buildFixtureFingerprint(sourcePath: string): string {
    const targetDirs = [
      'profiles',
      'permission-sets',
      'permission-set-groups',
      'custom-permissions',
      'connectedApps',
      'externalClientApplications',
      'objects',
      'apex-triggers',
      'apex-classes',
      'flows',
      'pages',
      'lwc',
      'aura',
      'quickActions',
      'layouts'
    ];

    const fingerprintRows: string[] = [];
    for (const dirName of targetDirs) {
      const dirPath = path.join(sourcePath, dirName);
      if (!fs.existsSync(dirPath)) {
        continue;
      }

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) {
          continue;
        }

        const filePath = path.join(dirPath, entry.name);
        const stat = fs.statSync(filePath);
        fingerprintRows.push(
          `${dirName}/${entry.name}|${stat.size}|${Math.trunc(stat.mtimeMs)}|${Math.trunc(stat.ctimeMs)}`
        );
      }
    }

    fingerprintRows.sort((a, b) => a.localeCompare(b));
    const hash = createHash('sha256');
    for (const row of fingerprintRows) {
      hash.update(row).update('\n');
    }
    return hash.digest('hex');
  }

  private readSemanticSnapshot(snapshotPath: string): SemanticSnapshotRecord | undefined {
    if (!fs.existsSync(snapshotPath)) {
      return undefined;
    }
    try {
      return JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as SemanticSnapshotRecord;
    } catch {
      return undefined;
    }
  }

  private writeSemanticSnapshot(snapshotPath: string, snapshot: SemanticSnapshotRecord): void {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
  }

  private writeSemanticSnapshotHistory(
    historyDir: string,
    snapshot: SemanticSnapshotRecord
  ): void {
    fs.mkdirSync(historyDir, { recursive: true });
    const targetPath = path.join(historyDir, `${snapshot.snapshotId}.json`);
    fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2), 'utf8');
  }

  private readSnapshotById(
    snapshotId: string,
    historyDir: string
  ): SemanticSnapshotRecord | undefined {
    const targetPath = path.join(historyDir, `${snapshotId}.json`);
    if (!fs.existsSync(targetPath)) {
      return undefined;
    }
    try {
      return JSON.parse(fs.readFileSync(targetPath, 'utf8')) as SemanticSnapshotRecord;
    } catch {
      return undefined;
    }
  }

  private resolveSnapshotRef(
    snapshotRef: string,
    latestSnapshotPath: string,
    historyDir: string
  ): SemanticSnapshotRecord | undefined {
    if (snapshotRef.trim().toLowerCase() === 'latest') {
      return this.readSemanticSnapshot(latestSnapshotPath);
    }
    return this.readSnapshotById(snapshotRef.trim(), historyDir);
  }

  private writeSemanticDiffArtifact(
    artifactsDir: string,
    artifact: {
      sourcePath: string;
      fromSnapshotId?: string;
      toSnapshotId: string;
      fingerprint: string;
      semanticDiff: SemanticDiffSummary;
      meaningChangeSummary: string;
      driftPolicy: DriftBudgetPolicy;
      driftEvaluation: DriftBudgetEvaluation;
      reportTemplate: SemanticDriftReportTemplate;
    }
  ): string {
    fs.mkdirSync(artifactsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fromPart = artifact.fromSnapshotId ?? 'bootstrap';
    const fileName = `${stamp}--${fromPart}--${artifact.toSnapshotId}.json`;
    const artifactPath = path.join(artifactsDir, fileName);
    fs.writeFileSync(
      artifactPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          ...artifact
        },
        null,
        2
      ),
      'utf8'
    );
    return artifactPath;
  }

  private buildSemanticSnapshot(
    fingerprint: string,
    payload: GraphPayload,
    sourcePath: string
  ): SemanticSnapshotRecord {
    const nodeTypeCounts: Record<string, number> = {};
    for (const node of payload.nodes) {
      nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] ?? 0) + 1;
    }
    const relationCounts: Record<string, number> = {};
    for (const edge of payload.edges) {
      relationCounts[edge.rel] = (relationCounts[edge.rel] ?? 0) + 1;
    }

    const sortedNodeIds = payload.nodes.map((node) => node.id).sort();
    const sortedEdgeIds = payload.edges.map((edge) => edge.id).sort();
    const nodeDigest = createHash('sha256');
    const edgeDigest = createHash('sha256');
    for (const id of sortedNodeIds) {
      nodeDigest.update(id).update('\n');
    }
    for (const id of sortedEdgeIds) {
      edgeDigest.update(id).update('\n');
    }

    const nodeDigestValue = nodeDigest.digest('hex');
    const edgeDigestValue = edgeDigest.digest('hex');
    const snapshotId = createHash('sha256')
      .update(fingerprint)
      .update('|')
      .update(nodeDigestValue)
      .update('|')
      .update(edgeDigestValue)
      .digest('hex')
      .slice(0, 24);

    return {
      snapshotId,
      fingerprint,
      generatedAt: new Date().toISOString(),
      sourcePath,
      nodeCount: sortedNodeIds.length,
      edgeCount: sortedEdgeIds.length,
      nodeDigest: nodeDigestValue,
      edgeDigest: edgeDigestValue,
      nodeTypeCounts,
      relationCounts
    };
  }

  private computeSemanticDiff(
    previous: SemanticSnapshotRecord | undefined,
    current: SemanticSnapshotRecord
  ): SemanticDiffSummary {
    if (!previous) {
      return {
        addedNodeCount: current.nodeCount,
        removedNodeCount: 0,
        addedEdgeCount: current.edgeCount,
        removedEdgeCount: 0,
        structureDigestChanged: true,
        changedNodeTypeCounts: { ...current.nodeTypeCounts },
        changedRelationCounts: { ...current.relationCounts }
      };
    }

    const nodeDelta = current.nodeCount - previous.nodeCount;
    const edgeDelta = current.edgeCount - previous.edgeCount;
    const addedNodeCount = Math.max(0, nodeDelta);
    const removedNodeCount = Math.max(0, -nodeDelta);
    const addedEdgeCount = Math.max(0, edgeDelta);
    const removedEdgeCount = Math.max(0, -edgeDelta);

    const changedNodeTypeCounts = this.diffCounts(previous.nodeTypeCounts, current.nodeTypeCounts);
    const changedRelationCounts = this.diffCounts(previous.relationCounts, current.relationCounts);

    return {
      addedNodeCount,
      removedNodeCount,
      addedEdgeCount,
      removedEdgeCount,
      structureDigestChanged:
        previous.nodeDigest !== current.nodeDigest || previous.edgeDigest !== current.edgeDigest,
      changedNodeTypeCounts,
      changedRelationCounts
    };
  }

  private diffCounts(
    before: Record<string, number>,
    after: Record<string, number>
  ): Record<string, number> {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changed: Record<string, number> = {};
    for (const key of keys) {
      const delta = (after[key] ?? 0) - (before[key] ?? 0);
      if (delta !== 0) {
        changed[key] = delta;
      }
    }
    return changed;
  }

  private hasSemanticChanges(diff: SemanticDiffSummary): boolean {
    return (
      diff.addedNodeCount !== 0 ||
      diff.removedNodeCount !== 0 ||
      diff.addedEdgeCount !== 0 ||
      diff.removedEdgeCount !== 0 ||
      diff.structureDigestChanged ||
      Object.keys(diff.changedNodeTypeCounts).length > 0 ||
      Object.keys(diff.changedRelationCounts).length > 0
    );
  }

  private describeMeaningChange(diff: SemanticDiffSummary, prefix?: string): string {
    if (!this.hasSemanticChanges(diff)) {
      return prefix ? `${prefix}; no semantic changes detected` : 'no semantic changes detected';
    }
    const nodePart = `nodes +${diff.addedNodeCount}/-${diff.removedNodeCount}`;
    const edgePart = `edges +${diff.addedEdgeCount}/-${diff.removedEdgeCount}`;
    const relPart =
      Object.keys(diff.changedRelationCounts).length > 0
        ? `relation deltas: ${Object.entries(diff.changedRelationCounts)
            .map(([rel, delta]) => `${rel}:${delta > 0 ? '+' : ''}${delta}`)
            .join(', ')}`
        : 'no relation count deltas';
    return prefix ? `${prefix}; ${nodePart}; ${edgePart}; ${relPart}` : `${nodePart}; ${edgePart}; ${relPart}`;
  }

  private shouldBootstrapForSourceTransition(
    previousSourcePath: string | undefined,
    currentSourcePath: string
  ): boolean {
    if (!previousSourcePath || previousSourcePath === currentSourcePath) {
      return false;
    }

    return (
      this.classifySourcePath(previousSourcePath) === 'fixtures' &&
      this.classifySourcePath(currentSourcePath) === 'retrieved_org'
    );
  }

  private classifySourcePath(sourcePath: string): 'fixtures' | 'retrieved_org' | 'custom' {
    const normalized = sourcePath.replace(/\\/g, '/');
    if (normalized.includes('/fixtures/')) {
      return 'fixtures';
    }
    if (
      normalized.includes('/data/sf-project/') ||
      normalized.endsWith('/force-app/main/default') ||
      normalized.includes('/force-app/main/default/')
    ) {
      return 'retrieved_org';
    }
    return 'custom';
  }

  private mergePayloads(...payloads: GraphPayload[]): GraphPayload {
    const nodesById = new Map<string, GraphPayload['nodes'][number]>();
    const edgesById = new Map<string, GraphPayload['edges'][number]>();

    for (const payload of payloads) {
      for (const node of payload.nodes) {
        nodesById.set(node.id, node);
      }
      for (const edge of payload.edges) {
        edgesById.set(edge.id, edge);
      }
    }

    return {
      nodes: [...nodesById.values()].sort(
        (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
      ),
      edges: [...edgesById.values()].sort(
        (a, b) =>
          a.srcId.localeCompare(b.srcId) ||
          a.dstId.localeCompare(b.dstId) ||
          a.rel.localeCompare(b.rel) ||
          a.id.localeCompare(b.id)
      )
    };
  }
}
