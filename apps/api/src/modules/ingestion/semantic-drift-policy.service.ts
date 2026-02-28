import { Injectable } from '@nestjs/common';
import { NODE_TYPES } from '@orgumented/ontology';
import { AppConfigService } from '../../config/app-config.service';

export interface SemanticSnapshotRecord {
  snapshotId: string;
  fingerprint: string;
  generatedAt: string;
  sourcePath?: string;
  nodeCount: number;
  edgeCount: number;
  nodeDigest: string;
  edgeDigest: string;
  nodeTypeCounts: Record<string, number>;
  relationCounts: Record<string, number>;
}

export interface SemanticDiffSummary {
  addedNodeCount: number;
  removedNodeCount: number;
  addedEdgeCount: number;
  removedEdgeCount: number;
  structureDigestChanged: boolean;
  changedNodeTypeCounts: Record<string, number>;
  changedRelationCounts: Record<string, number>;
}

export interface DriftBudgetPolicy {
  policyId: string;
  generatedAt: string;
  enforceOnRefresh: boolean;
  domainBudgets: {
    objectNodeDeltaMax: number;
    fieldNodeDeltaMax: number;
    relationDeltaMax: number;
    policyNodeDeltaMax: number;
    automationNodeDeltaMax: number;
    uiNodeDeltaMax: number;
    totalNodeDeltaMax: number;
    totalEdgeDeltaMax: number;
  };
  benignAllowlist: {
    nodeTypes: string[];
    relations: string[];
  };
}

export interface DriftBudgetEvaluation {
  withinBudget: boolean;
  isBootstrap: boolean;
  summary: string;
  observed: {
    objectNodeDelta: number;
    fieldNodeDelta: number;
    relationDelta: number;
    policyNodeDelta: number;
    automationNodeDelta: number;
    uiNodeDelta: number;
    totalNodeDelta: number;
    totalEdgeDelta: number;
  };
  ignored: {
    nodeTypeDeltas: Record<string, number>;
    relationDeltas: Record<string, number>;
  };
  violations: Array<{
    domain: string;
    metric: string;
    value: number;
    threshold: number;
  }>;
}

export interface SemanticDriftReportTemplate {
  templateVersion: 'phase14-v1';
  generatedAt: string;
  snapshots: {
    fromSnapshotId?: string;
    toSnapshotId: string;
  };
  meaningChangeSummary: string;
  topChangedScus: Array<{
    kind: 'nodeType' | 'relation';
    key: string;
    delta: number;
    absoluteDelta: number;
  }>;
  impactedPaths: Array<{
    path: string;
    reason: string;
  }>;
}

const POLICY_NODE_TYPES = new Set<string>([
  NODE_TYPES.PROFILE,
  NODE_TYPES.PERMISSION_SET,
  NODE_TYPES.PERMISSION_SET_GROUP,
  NODE_TYPES.SYSTEM_PERMISSION,
  NODE_TYPES.CUSTOM_PERMISSION,
  NODE_TYPES.CONNECTED_APP
]);

const AUTOMATION_NODE_TYPES = new Set<string>([
  NODE_TYPES.APEX_CLASS,
  NODE_TYPES.APEX_TRIGGER,
  NODE_TYPES.FLOW
]);

const UI_NODE_TYPES = new Set<string>([
  NODE_TYPES.APEX_PAGE,
  NODE_TYPES.LIGHTNING_COMPONENT_BUNDLE,
  NODE_TYPES.AURA_DEFINITION_BUNDLE,
  NODE_TYPES.QUICK_ACTION,
  NODE_TYPES.LAYOUT
]);

@Injectable()
export class SemanticDriftPolicyService {
  constructor(private readonly configService: AppConfigService) {}

  buildPolicy(): DriftBudgetPolicy {
    return {
      policyId: 'drift-policy-v1',
      generatedAt: new Date().toISOString(),
      enforceOnRefresh: this.configService.driftBudgetEnforceOnRefresh(),
      domainBudgets: {
        objectNodeDeltaMax: this.configService.driftBudgetObjectNodeDeltaMax(),
        fieldNodeDeltaMax: this.configService.driftBudgetFieldNodeDeltaMax(),
        relationDeltaMax: this.configService.driftBudgetRelationDeltaMax(),
        policyNodeDeltaMax: this.configService.driftBudgetPolicyNodeDeltaMax(),
        automationNodeDeltaMax: this.configService.driftBudgetAutomationNodeDeltaMax(),
        uiNodeDeltaMax: this.configService.driftBudgetUiNodeDeltaMax(),
        totalNodeDeltaMax: this.configService.driftBudgetTotalNodeDeltaMax(),
        totalEdgeDeltaMax: this.configService.driftBudgetTotalEdgeDeltaMax()
      },
      benignAllowlist: {
        nodeTypes: this.configService.driftAllowlistNodeTypes(),
        relations: this.configService.driftAllowlistRelations()
      }
    };
  }

  evaluate(
    policy: DriftBudgetPolicy,
    diff: SemanticDiffSummary,
    previous: SemanticSnapshotRecord | undefined
  ): DriftBudgetEvaluation {
    if (!previous) {
      return {
        withinBudget: true,
        isBootstrap: true,
        summary: 'bootstrap snapshot: drift budget not enforced',
        observed: {
          objectNodeDelta: 0,
          fieldNodeDelta: 0,
          relationDelta: 0,
          policyNodeDelta: 0,
          automationNodeDelta: 0,
          uiNodeDelta: 0,
          totalNodeDelta: 0,
          totalEdgeDelta: 0
        },
        ignored: {
          nodeTypeDeltas: {},
          relationDeltas: {}
        },
        violations: []
      };
    }

    const ignoredNodeTypeDeltas: Record<string, number> = {};
    const ignoredRelationDeltas: Record<string, number> = {};
    const nodeDeltas: Record<string, number> = {};
    const relationDeltas: Record<string, number> = {};

    for (const [nodeType, delta] of Object.entries(diff.changedNodeTypeCounts)) {
      if (policy.benignAllowlist.nodeTypes.includes(nodeType)) {
        ignoredNodeTypeDeltas[nodeType] = delta;
        continue;
      }
      nodeDeltas[nodeType] = delta;
    }
    for (const [relation, delta] of Object.entries(diff.changedRelationCounts)) {
      if (policy.benignAllowlist.relations.includes(relation)) {
        ignoredRelationDeltas[relation] = delta;
        continue;
      }
      relationDeltas[relation] = delta;
    }

    const absNodeDelta = (nodeType: string): number => Math.abs(nodeDeltas[nodeType] ?? 0);
    const observed = {
      objectNodeDelta: absNodeDelta(NODE_TYPES.OBJECT),
      fieldNodeDelta: absNodeDelta(NODE_TYPES.FIELD),
      relationDelta: this.sumAbsoluteDeltas(relationDeltas),
      policyNodeDelta: this.sumAbsoluteForSet(nodeDeltas, POLICY_NODE_TYPES),
      automationNodeDelta: this.sumAbsoluteForSet(nodeDeltas, AUTOMATION_NODE_TYPES),
      uiNodeDelta: this.sumAbsoluteForSet(nodeDeltas, UI_NODE_TYPES),
      totalNodeDelta: Math.abs(diff.addedNodeCount) + Math.abs(diff.removedNodeCount),
      totalEdgeDelta: Math.abs(diff.addedEdgeCount) + Math.abs(diff.removedEdgeCount)
    };

    const violations: DriftBudgetEvaluation['violations'] = [];
    const check = (
      domain: string,
      metric: string,
      value: number,
      threshold: number
    ): void => {
      if (value > threshold) {
        violations.push({ domain, metric, value, threshold });
      }
    };

    check('object', 'objectNodeDelta', observed.objectNodeDelta, policy.domainBudgets.objectNodeDeltaMax);
    check('field', 'fieldNodeDelta', observed.fieldNodeDelta, policy.domainBudgets.fieldNodeDeltaMax);
    check('relation', 'relationDelta', observed.relationDelta, policy.domainBudgets.relationDeltaMax);
    check('policy', 'policyNodeDelta', observed.policyNodeDelta, policy.domainBudgets.policyNodeDeltaMax);
    check(
      'automation',
      'automationNodeDelta',
      observed.automationNodeDelta,
      policy.domainBudgets.automationNodeDeltaMax
    );
    check('ui', 'uiNodeDelta', observed.uiNodeDelta, policy.domainBudgets.uiNodeDeltaMax);
    check(
      'aggregate',
      'totalNodeDelta',
      observed.totalNodeDelta,
      policy.domainBudgets.totalNodeDeltaMax
    );
    check(
      'aggregate',
      'totalEdgeDelta',
      observed.totalEdgeDelta,
      policy.domainBudgets.totalEdgeDeltaMax
    );

    if (violations.length === 0) {
      return {
        withinBudget: true,
        isBootstrap: false,
        summary: 'semantic drift is within configured budget',
        observed,
        ignored: {
          nodeTypeDeltas: ignoredNodeTypeDeltas,
          relationDeltas: ignoredRelationDeltas
        },
        violations
      };
    }

    const summary = `semantic drift exceeds budget: ${violations
      .map((item) => `${item.metric}=${item.value} > ${item.threshold}`)
      .join('; ')}`;
    return {
      withinBudget: false,
      isBootstrap: false,
      summary,
      observed,
      ignored: {
        nodeTypeDeltas: ignoredNodeTypeDeltas,
        relationDeltas: ignoredRelationDeltas
      },
      violations
    };
  }

  buildDriftReportTemplate(input: {
    fromSnapshotId?: string;
    toSnapshotId: string;
    meaningChangeSummary: string;
    diff: SemanticDiffSummary;
  }): SemanticDriftReportTemplate {
    const combinedTop = [
      ...Object.entries(input.diff.changedNodeTypeCounts).map(([key, delta]) => ({
        kind: 'nodeType' as const,
        key,
        delta
      })),
      ...Object.entries(input.diff.changedRelationCounts).map(([key, delta]) => ({
        kind: 'relation' as const,
        key,
        delta
      }))
    ]
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.key.localeCompare(b.key))
      .slice(0, 10)
      .map((item) => ({
        ...item,
        absoluteDelta: Math.abs(item.delta)
      }));

    const impactedPaths = [
      ...Object.keys(input.diff.changedRelationCounts).map((relation) => ({
        path: `/analysis/${relation.toLowerCase()}`,
        reason: `relation delta on ${relation}`
      })),
      ...Object.keys(input.diff.changedNodeTypeCounts).map((nodeType) => ({
        path: `/scu/${nodeType.toLowerCase()}`,
        reason: `node-type delta on ${nodeType}`
      }))
    ].slice(0, 12);

    return {
      templateVersion: 'phase14-v1',
      generatedAt: new Date().toISOString(),
      snapshots: {
        fromSnapshotId: input.fromSnapshotId,
        toSnapshotId: input.toSnapshotId
      },
      meaningChangeSummary: input.meaningChangeSummary,
      topChangedScus: combinedTop,
      impactedPaths
    };
  }

  private sumAbsoluteDeltas(deltas: Record<string, number>): number {
    return Object.values(deltas).reduce((sum, delta) => sum + Math.abs(delta), 0);
  }

  private sumAbsoluteForSet(deltas: Record<string, number>, types: Set<string>): number {
    let sum = 0;
    for (const [key, delta] of Object.entries(deltas)) {
      if (types.has(key)) {
        sum += Math.abs(delta);
      }
    }
    return sum;
  }
}
