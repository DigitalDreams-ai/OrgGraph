import { Injectable } from '@nestjs/common';
import { REL_CONSTRAINTS, REL_TYPES } from '@orgumented/ontology';
import type { GraphPayload } from '../graph/graph.types';

export interface ConstraintViolation {
  code: 'INVALID_RELATION_TYPE' | 'INVALID_EDGE_ENDPOINT_TYPES';
  severity: 'error';
  edgeId: string;
  rel: string;
  srcType?: string;
  dstType?: string;
  message: string;
}

export interface ConstraintWarning {
  code: 'FIELD_GRANT_WITHOUT_OBJECT_GRANT';
  severity: 'warning';
  principal: string;
  field: string;
  message: string;
}

export interface OntologyConstraintReport {
  validatedAt: string;
  nodeCount: number;
  edgeCount: number;
  violationCount: number;
  warningCount: number;
  violations: ConstraintViolation[];
  warnings: ConstraintWarning[];
}

@Injectable()
export class OntologyConstraintsService {
  validate(payload: GraphPayload): OntologyConstraintReport {
    const nodesById = new Map(payload.nodes.map((node) => [node.id, node]));
    const violations: ConstraintViolation[] = [];
    const warnings: ConstraintWarning[] = [];

    const relationConstraints = new Map(REL_CONSTRAINTS.map((item) => [item.rel, item]));

    for (const edge of payload.edges) {
      const src = nodesById.get(edge.srcId);
      const dst = nodesById.get(edge.dstId);
      const constraint = relationConstraints.get(edge.rel);

      if (!constraint) {
        violations.push({
          code: 'INVALID_RELATION_TYPE',
          severity: 'error',
          edgeId: edge.id,
          rel: edge.rel,
          srcType: src?.type,
          dstType: dst?.type,
          message: `edge ${edge.id} uses unsupported relation ${edge.rel}`
        });
        continue;
      }

      const srcAllowed = src ? constraint.srcTypes.includes(src.type) : false;
      const dstAllowed = dst ? constraint.dstTypes.includes(dst.type) : false;
      if (!srcAllowed || !dstAllowed) {
        violations.push({
          code: 'INVALID_EDGE_ENDPOINT_TYPES',
          severity: 'error',
          edgeId: edge.id,
          rel: edge.rel,
          srcType: src?.type,
          dstType: dst?.type,
          message: `edge ${edge.id} (${edge.rel}) has invalid endpoint types src=${src?.type ?? 'missing'} dst=${dst?.type ?? 'missing'}`
        });
      }
    }

    const objectGrantsByPrincipal = new Map<string, Set<string>>();
    for (const edge of payload.edges) {
      if (edge.rel !== REL_TYPES.GRANTS_OBJECT) {
        continue;
      }
      const principal = nodesById.get(edge.srcId);
      const objectNode = nodesById.get(edge.dstId);
      if (!principal || !objectNode) {
        continue;
      }
      if (!objectGrantsByPrincipal.has(principal.name)) {
        objectGrantsByPrincipal.set(principal.name, new Set<string>());
      }
      objectGrantsByPrincipal.get(principal.name)?.add(objectNode.name);
    }

    for (const edge of payload.edges) {
      if (edge.rel !== REL_TYPES.GRANTS_FIELD) {
        continue;
      }
      const principal = nodesById.get(edge.srcId);
      const fieldNode = nodesById.get(edge.dstId);
      if (!principal || !fieldNode) {
        continue;
      }
      const objectName = fieldNode.name.split('.')[0];
      const objectGrants = objectGrantsByPrincipal.get(principal.name);
      if (!objectGrants?.has(objectName)) {
        warnings.push({
          code: 'FIELD_GRANT_WITHOUT_OBJECT_GRANT',
          severity: 'warning',
          principal: principal.name,
          field: fieldNode.name,
          message: `${principal.name} has field grant ${fieldNode.name} but no object grant on ${objectName}`
        });
      }
    }

    return {
      validatedAt: new Date().toISOString(),
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
      violationCount: violations.length,
      warningCount: warnings.length,
      violations,
      warnings
    };
  }
}

