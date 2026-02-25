import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import fs from 'node:fs';
import path from 'node:path';
import { NODE_TYPES, REL_TYPES } from '@orggraph/ontology';
import { stableId } from '../common/ids';
import type { GraphEdge, GraphNode, GraphPayload } from '../graph/graph.types';
import type { ParserStats } from './parser-stats';

interface PermissionEntity {
  objectPermissions?: unknown;
  fieldPermissions?: unknown;
}

interface ParsedPermissionFile {
  PermissionSet?: PermissionEntity;
  Profile?: PermissionEntity;
}

export class PermissionsParseError extends Error {
  constructor(
    readonly filePath: string,
    readonly reason: string
  ) {
    super(`Failed to parse permissions XML at ${filePath}: ${reason}`);
    this.name = 'PermissionsParseError';
  }
}

@Injectable()
export class PermissionsParserService {
  private lastStats: ParserStats = {
    parser: 'permissions',
    filesDiscovered: 0,
    filesParsed: 0,
    filesSkipped: 0,
    warnings: []
  };

  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true
  });

  parseFromFixtures(rootPath: string): GraphPayload {
    const nodesById = new Map<string, GraphNode>();
    const edgesById = new Map<string, GraphEdge>();
    this.lastStats = {
      parser: 'permissions',
      filesDiscovered: 0,
      filesParsed: 0,
      filesSkipped: 0,
      warnings: []
    };

    this.parseEntityDir({
      dirPath: this.resolveEntityDir(rootPath, ['profiles']),
      entityType: NODE_TYPES.PROFILE,
      nodesById,
      edgesById
    });

    this.parseEntityDir({
      dirPath: this.resolveEntityDir(rootPath, ['permission-sets', 'permissionsets']),
      entityType: NODE_TYPES.PERMISSION_SET,
      nodesById,
      edgesById
    });

    const nodes = [...nodesById.values()].sort(
      (a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name)
    );
    const edges = [...edgesById.values()].sort(
      (a, b) =>
        a.srcId.localeCompare(b.srcId) ||
        a.dstId.localeCompare(b.dstId) ||
        a.rel.localeCompare(b.rel) ||
        a.id.localeCompare(b.id)
    );

    return {
      nodes,
      edges
    };
  }

  getLastStats(): ParserStats {
    return this.lastStats;
  }

  private resolveEntityDir(rootPath: string, candidates: string[]): string {
    for (const name of candidates) {
      const dirPath = path.join(rootPath, name);
      if (fs.existsSync(dirPath)) {
        return dirPath;
      }
    }
    return path.join(rootPath, candidates[0]);
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
    this.lastStats.filesDiscovered += files.length;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const entityName = this.entityNameFromFilename(file);
      const xml = fs.readFileSync(filePath, 'utf8');
      const parsed = this.parsePermissionFile(xml, filePath);
      const body =
        entityType === NODE_TYPES.PROFILE
          ? parsed.Profile ?? parsed.PermissionSet ?? {}
          : parsed.PermissionSet ?? parsed.Profile ?? {};

      const principal = this.upsertNode(nodesById, {
        type: entityType,
        name: entityName,
        meta: JSON.stringify({ source: file })
      });
      this.lastStats.filesParsed += 1;

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
          meta: JSON.stringify({ source: file, parser: 'permissions', confidence: 'high' })
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
          meta: JSON.stringify({ source: file, parser: 'permissions', confidence: 'high' })
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
    const raw = file.replace(/\.(profile-meta|permissionset-meta)?\.xml$/i, '').replace(/\.xml$/i, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
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

  private parsePermissionFile(xml: string, filePath: string): ParsedPermissionFile {
    try {
      const parsed = this.parser.parse(xml) as ParsedPermissionFile;
      if (!parsed || typeof parsed !== 'object') {
        throw new PermissionsParseError(filePath, 'parsed XML is not an object');
      }
      if (!parsed.PermissionSet && !parsed.Profile) {
        throw new PermissionsParseError(filePath, 'missing PermissionSet or Profile root element');
      }
      return parsed;
    } catch (error) {
      if (error instanceof PermissionsParseError) {
        throw error;
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new PermissionsParseError(filePath, reason);
    }
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
