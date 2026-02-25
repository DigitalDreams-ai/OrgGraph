import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AppConfigService } from '../config/app-config.service';
import { EvidenceStoreService } from '../evidence/evidence-store.service';
import { GraphService } from '../graph/graph.service';
import {
  resolveFixturesPath,
  resolveOntologyReportPath,
  resolveRefreshAuditPath,
  resolveRefreshStatePath
} from '../common/path';
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
import { StagedUiMetadataParserService } from './staged-ui-metadata-parser.service';

export type RefreshMode = 'full' | 'incremental';

interface RefreshState {
  sourcePath: string;
  fingerprint: string;
  refreshedAt: string;
  parserStats: ParserStats[];
  nodeCount: number;
  edgeCount: number;
  evidenceCount: number;
  mode: RefreshMode;
  ontology: OntologyConstraintReport;
}

interface RefreshOptions {
  fixturesPath?: string;
  mode?: RefreshMode;
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
    private readonly constraintsService: OntologyConstraintsService
  ) {}

  async refresh(options: RefreshOptions = {}): Promise<{
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
      const start = Date.now();
      const fingerprint = this.buildFixtureFingerprint(sourcePath);

      if (mode === 'incremental' && (await this.canSkipRefresh(sourcePath, statePath, fingerprint))) {
        const counts = await this.graphService.getCounts();
        const parserStats = this.readState(statePath)?.parserStats ?? [];
        const ontology = this.readOntologyReport(ontologyReportPath);
        this.appendAuditEntry(auditPath, {
          sourcePath,
          fingerprint,
          refreshedAt: new Date().toISOString(),
          parserStats,
          nodeCount: counts.nodeCount,
          edgeCount: counts.edgeCount,
          evidenceCount: this.evidenceStore.getDocumentCount(),
          mode,
          ontology
        });
        return {
          mode,
          skipped: true,
          skipReason: 'no_changes_detected',
          ...counts,
          evidenceCount: this.evidenceStore.getDocumentCount(),
          elapsedMs: Date.now() - start,
          sourcePath,
          databasePath: this.graphService.getDatabasePath(),
          evidenceIndexPath: this.evidenceStore.getIndexPath(),
          parserStats,
          ontology
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
        sourcePath,
        fingerprint,
        refreshedAt: new Date().toISOString(),
        parserStats,
        nodeCount: counts.nodeCount,
        edgeCount: counts.edgeCount,
        evidenceCount: evidence.documentCount,
        mode,
        ontology
      };
      this.writeState(statePath, state);
      this.appendAuditEntry(auditPath, state);

      return {
        mode,
        skipped: false,
        ...counts,
        evidenceCount: evidence.documentCount,
        elapsedMs: Date.now() - start,
        sourcePath,
        databasePath: this.graphService.getDatabasePath(),
        evidenceIndexPath: evidence.sourcePath,
        parserStats,
        ontology
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
      if (typeof parsed.sourcePath !== 'string' || typeof parsed.fingerprint !== 'string' || typeof parsed.refreshedAt !== 'string') {
        return undefined;
      }
      return {
        sourcePath: parsed.sourcePath,
        fingerprint: parsed.fingerprint,
        refreshedAt: parsed.refreshedAt,
        parserStats: Array.isArray(parsed.parserStats) ? (parsed.parserStats as ParserStats[]) : [],
        nodeCount: typeof parsed.nodeCount === 'number' ? parsed.nodeCount : 0,
        edgeCount: typeof parsed.edgeCount === 'number' ? parsed.edgeCount : 0,
        evidenceCount: typeof parsed.evidenceCount === 'number' ? parsed.evidenceCount : 0,
        mode: parsed.mode === 'incremental' ? 'incremental' : 'full',
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
    return createHash('sha256').update(fingerprintRows.join('\n')).digest('hex');
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
