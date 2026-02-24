import { BadRequestException, Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import { GraphService } from '../graph/graph.service';
import { resolveFixturesPath } from '../common/path';
import type { GraphPayload } from '../graph/graph.types';
import { ApexClassParseError, ApexClassParserService } from './apex-class-parser.service';
import { ApexTriggerParseError, ApexTriggerParserService } from './apex-trigger-parser.service';
import { FlowParseError, FlowParserService } from './flow-parser.service';
import { PermissionsParseError, PermissionsParserService } from './permissions-parser.service';

@Injectable()
export class IngestionService {
  constructor(
    private readonly configService: AppConfigService,
    private readonly graphService: GraphService,
    private readonly parserService: PermissionsParserService,
    private readonly triggerParserService: ApexTriggerParserService,
    private readonly classParserService: ApexClassParserService,
    private readonly flowParserService: FlowParserService
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

    return {
      ...counts,
      elapsedMs: Date.now() - start,
      sourcePath,
      databasePath: this.graphService.getDatabasePath()
    };
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
