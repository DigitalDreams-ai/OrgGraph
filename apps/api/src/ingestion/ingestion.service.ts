import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AppConfigService } from '../config/app-config.service';
import { EvidenceStoreService } from '../evidence/evidence-store.service';
import { GraphService } from '../graph/graph.service';
import { resolveFixturesPath, resolveRefreshAuditPath, resolveRefreshStatePath } from '../common/path';
import type { GraphPayload } from '../graph/graph.types';
import { ApexClassParseError, ApexClassParserService } from './apex-class-parser.service';
import { ApexTriggerParseError, ApexTriggerParserService } from './apex-trigger-parser.service';
import { FlowParseError, FlowParserService } from './flow-parser.service';
import type { ParserStats } from './parser-stats';
import { PermissionsParseError, PermissionsParserService } from './permissions-parser.service';

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
}

interface RefreshOptions {
  fixturesPath?: string;
  mode?: RefreshMode;
}

@Injectable()
export class IngestionService {
  constructor(
    private readonly configService: AppConfigService,
    private readonly graphService: GraphService,
    private readonly evidenceStore: EvidenceStoreService,
    private readonly parserService: PermissionsParserService,
    private readonly triggerParserService: ApexTriggerParserService,
    private readonly classParserService: ApexClassParserService,
    private readonly flowParserService: FlowParserService
  ) {}

  refresh(options: RefreshOptions = {}): {
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
  } {
    const mode: RefreshMode = options.mode ?? 'full';
    const sourcePath = resolveFixturesPath(
      options.fixturesPath ?? this.configService.permissionsFixturesPath()
    );
    const statePath = resolveRefreshStatePath(this.configService.refreshStatePath());
    const auditPath = resolveRefreshAuditPath(this.configService.refreshAuditPath());
    const start = Date.now();
    const fingerprint = this.buildFixtureFingerprint(sourcePath);

    if (mode === 'incremental' && this.canSkipRefresh(sourcePath, statePath, fingerprint)) {
      const counts = this.graphService.getCounts();
      const parserStats = this.readState(statePath)?.parserStats ?? [];
      this.appendAuditEntry(auditPath, {
        sourcePath,
        fingerprint,
        refreshedAt: new Date().toISOString(),
        parserStats,
        nodeCount: counts.nodeCount,
        edgeCount: counts.edgeCount,
        evidenceCount: this.evidenceStore.getDocumentCount(),
        mode
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
        parserStats
      };
    }

    let payload: GraphPayload;
    try {
      const permissionsPayload = this.parserService.parseFromFixtures(sourcePath);
      const triggerPayload = this.triggerParserService.parseFromFixtures(sourcePath);
      const classPayload = this.classParserService.parseFromFixtures(sourcePath);
      const flowPayload = this.flowParserService.parseFromFixtures(sourcePath);
      payload = this.mergePayloads(permissionsPayload, triggerPayload, classPayload, flowPayload);
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
    const counts = this.graphService.fullRebuild(payload);
    const evidence = this.evidenceStore.reindexFromFixtures(sourcePath);
    const parserStats = [
      this.parserService.getLastStats(),
      this.triggerParserService.getLastStats(),
      this.classParserService.getLastStats(),
      this.flowParserService.getLastStats()
    ];
    const state: RefreshState = {
      sourcePath,
      fingerprint,
      refreshedAt: new Date().toISOString(),
      parserStats,
      nodeCount: counts.nodeCount,
      edgeCount: counts.edgeCount,
      evidenceCount: evidence.documentCount,
      mode
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
      parserStats
    };
  }

  getLatestIngestSummary(): {
    latest?: RefreshState;
    lowConfidenceSources: Array<{ source: string; count: number }>;
    auditPath: string;
  } {
    const statePath = resolveRefreshStatePath(this.configService.refreshStatePath());
    const auditPath = resolveRefreshAuditPath(this.configService.refreshAuditPath());
    return {
      latest: this.readState(statePath),
      lowConfidenceSources: this.graphService.getLowConfidenceSummary(10),
      auditPath
    };
  }

  private canSkipRefresh(sourcePath: string, statePath: string, fingerprint: string): boolean {
    const previous = this.readState(statePath);
    if (!previous) {
      return false;
    }

    if (previous.sourcePath !== sourcePath || previous.fingerprint !== fingerprint) {
      return false;
    }

    if (!fs.existsSync(this.graphService.getDatabasePath())) {
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
        mode: parsed.mode === 'incremental' ? 'incremental' : 'full'
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

  private buildFixtureFingerprint(sourcePath: string): string {
    const targetDirs = [
      'profiles',
      'permission-sets',
      'apex-triggers',
      'apex-classes',
      'flows'
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
