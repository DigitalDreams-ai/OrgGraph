import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { stableId } from '../common/ids';
import type { GraphEdge, GraphNode, GraphPayload } from '../graph/graph.types';

interface PermissionEntity {
  objectPermissions?: unknown;
  fieldPermissions?: unknown;
}

@Injectable()
export class PermissionsParserService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true
  });

  parseFromFixtures(rootPath: string): GraphPayload {
    const nodesById = new Map<string, GraphNode>();
    const edgesById = new Map<string, GraphEdge>();

    this.parseEntityDir({
      dirPath: path.join(rootPath, 'profiles'),
      entityType: NODE_TYPES.PROFILE,
      nodesById,
      edgesById
    });

    this.parseEntityDir({
      dirPath: path.join(rootPath, 'permission-sets'),
      entityType: NODE_TYPES.PERMISSION_SET,
      nodesById,
      edgesById
    });

    return {
      nodes: [...nodesById.values()],
      edges: [...edgesById.values()]
    };
  }

  private parseEntityDir(params: {
    dirPath: string;
    entityType: typeof NODE_TYPES.PROFILE | typeof NODE_TYPES.PERMISSION_SET;
    nodesById: Map<string, GraphNode>;
    edgesById: Map<string, GraphEdge>;
  }): void {
    const { dirPath, entityType, nodesById, edgesById } = params;

    if (!fs.existsSync(dirPath)) {
      return;
    }

    const files = fs
      .readdirSync(dirPath)
      .filter((name) => name.endsWith('.xml') || name.endsWith('.profile-meta.xml') || name.endsWith('.permissionset-meta.xml'));

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const entityName = this.entityNameFromFilename(file);
      const xml = fs.readFileSync(filePath, 'utf8');
      const parsed = this.parser.parse(xml) as { PermissionSet?: PermissionEntity };
      const body = parsed.PermissionSet ?? {};

      const principal = this.upsertNode(nodesById, {
        type: entityType,
        name: entityName,
        meta: JSON.stringify({ source: file })
      });

      for (const objectPerm of this.toArray<Record<string, unknown>>(body.objectPermissions)) {
        const objectName = this.asString(objectPerm.object);
        if (!objectName || !this.canEditObject(objectPerm)) {
          continue;
        }

        const objectNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.OBJECT,
          name: objectName
        });

        this.upsertEdge(edgesById, {
          srcId: principal.id,
          dstId: objectNode.id,
          rel: REL_TYPES.GRANTS_OBJECT,
          meta: JSON.stringify({ source: file })
        });
      }

      for (const fieldPerm of this.toArray<Record<string, unknown>>(body.fieldPermissions)) {
        const fieldName = this.normalizeField(this.asString(fieldPerm.field));
        if (!fieldName || !this.isTruthy(fieldPerm.editable)) {
          continue;
        }

        const fieldNode = this.upsertNode(nodesById, {
          type: NODE_TYPES.FIELD,
          name: fieldName
        });

        this.upsertEdge(edgesById, {
          srcId: principal.id,
          dstId: fieldNode.id,
          rel: REL_TYPES.GRANTS_FIELD,
          meta: JSON.stringify({ source: file })
        });
      }
    }
  }

  private canEditObject(objectPerm: Record<string, unknown>): boolean {
    return (
      this.isTruthy(objectPerm.allowEdit) ||
      this.isTruthy(objectPerm.modifyAllRecords) ||
      this.isTruthy(objectPerm.viewAllRecords)
    );
  }

  private isTruthy(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    return typeof value === 'string' && value.toLowerCase() === 'true';
  }

  private entityNameFromFilename(file: string): string {
    return file.replace(/\.(profile-meta|permissionset-meta)?\.xml$/i, '').replace(/\.xml$/i, '');
  }

  private normalizeField(fieldName?: string): string | undefined {
    if (!fieldName) {
      return undefined;
    }

    const trimmed = fieldName.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }

  private toArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }

    return value ? [value as T] : [];
  }

  private upsertNode(
    nodesById: Map<string, GraphNode>,
    params: { type: GraphNode['type']; name: string; meta?: string }
  ): GraphNode {
    const id = stableId('node', params.type, params.name);
    const node: GraphNode = {
      id,
      type: params.type,
      name: params.name,
      meta: params.meta
    };

    nodesById.set(id, nodesById.get(id) ?? node);
    return nodesById.get(id) as GraphNode;
  }

  private upsertEdge(
    edgesById: Map<string, GraphEdge>,
    params: { srcId: string; dstId: string; rel: GraphEdge['rel']; meta?: string }
  ): GraphEdge {
    const id = stableId('edge', params.srcId, params.dstId, params.rel);
    const edge: GraphEdge = {
      id,
      srcId: params.srcId,
      dstId: params.dstId,
      rel: params.rel,
      meta: params.meta
    };

    edgesById.set(id, edgesById.get(id) ?? edge);
    return edgesById.get(id) as GraphEdge;
  }
}
