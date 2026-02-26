import {
  COMPOSITION_OPERATORS,
  type CompositionOperator,
  type SemanticContextUnit
} from './semantic-runtime';

export const SCU_CONFLICT_POLICIES = {
  STRICT: 'strict',
  PREFER_HIGHER_GROUNDING: 'prefer_higher_grounding',
  PREFER_LEXICOGRAPHIC_ID: 'prefer_lexicographic_id',
  MERGE_IF_COMPATIBLE: 'merge_if_compatible'
} as const;

export type ScuConflictPolicy =
  (typeof SCU_CONFLICT_POLICIES)[keyof typeof SCU_CONFLICT_POLICIES];

export interface CompositionContext {
  conflictPolicy: ScuConflictPolicy;
}

export interface CompositionResult {
  output: SemanticContextUnit;
  deterministicContract: {
    stable: boolean;
    operator: CompositionOperator;
    hash: string;
  };
  conflicts: Array<{ leftId: string; rightId: string; reason: string }>;
}

export function composeScu(
  operator: CompositionOperator,
  left: SemanticContextUnit,
  right: SemanticContextUnit,
  context: CompositionContext
): CompositionResult {
  const conflicts: CompositionResult['conflicts'] = [];
  let output: SemanticContextUnit;

  switch (operator) {
    case COMPOSITION_OPERATORS.OVERLAY:
      output = resolveConflict(left, right, context, conflicts);
      break;
    case COMPOSITION_OPERATORS.INTERSECT:
      output = intersectScu(left, right, conflicts);
      break;
    case COMPOSITION_OPERATORS.CONSTRAIN:
      output = constrainScu(left, right, conflicts);
      break;
    case COMPOSITION_OPERATORS.SPECIALIZE:
      output = specializeScu(left, right);
      break;
    case COMPOSITION_OPERATORS.SUPERSEDE:
      output = supersedeScu(left, right, conflicts);
      break;
    default:
      output = left;
  }

  const canonicalHash = deterministicHash({
    operator,
    output,
    conflictPolicy: context.conflictPolicy,
    conflicts
  });
  return {
    output,
    deterministicContract: {
      stable: true,
      operator,
      hash: canonicalHash
    },
    conflicts
  };
}

function resolveConflict(
  left: SemanticContextUnit,
  right: SemanticContextUnit,
  context: CompositionContext,
  conflicts: CompositionResult['conflicts']
): SemanticContextUnit {
  const payloadEqual = deterministicHash(left.payload) === deterministicHash(right.payload);
  if (payloadEqual) {
    return specializeScu(left, right);
  }

  conflicts.push({
    leftId: left.id,
    rightId: right.id,
    reason: 'overlay payload mismatch'
  });

  switch (context.conflictPolicy) {
    case SCU_CONFLICT_POLICIES.STRICT:
      return {
        ...left,
        payload: {
          conflict: true,
          reason: 'strict conflict policy',
          left: left.payload,
          right: right.payload
        }
      };
    case SCU_CONFLICT_POLICIES.PREFER_HIGHER_GROUNDING:
      return chooseByGrounding(left, right);
    case SCU_CONFLICT_POLICIES.MERGE_IF_COMPATIBLE:
      return {
        ...left,
        payload: {
          ...left.payload,
          ...right.payload
        }
      };
    case SCU_CONFLICT_POLICIES.PREFER_LEXICOGRAPHIC_ID:
    default:
      return left.id.localeCompare(right.id) <= 0 ? left : right;
  }
}

function chooseByGrounding(left: SemanticContextUnit, right: SemanticContextUnit): SemanticContextUnit {
  const leftGrounding = left.confidencePolicy.groundingThreshold;
  const rightGrounding = right.confidencePolicy.groundingThreshold;
  if (leftGrounding !== rightGrounding) {
    return leftGrounding > rightGrounding ? left : right;
  }
  return left.id.localeCompare(right.id) <= 0 ? left : right;
}

function intersectScu(
  left: SemanticContextUnit,
  right: SemanticContextUnit,
  conflicts: CompositionResult['conflicts']
): SemanticContextUnit {
  if (left.type !== right.type) {
    conflicts.push({
      leftId: left.id,
      rightId: right.id,
      reason: 'type mismatch in intersect'
    });
    return {
      ...left,
      payload: {}
    };
  }

  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(left.payload)) {
    if (Object.prototype.hasOwnProperty.call(right.payload, key) && right.payload[key] === value) {
      payload[key] = value;
    }
  }
  return {
    ...left,
    payload
  };
}

function constrainScu(
  left: SemanticContextUnit,
  right: SemanticContextUnit,
  conflicts: CompositionResult['conflicts']
): SemanticContextUnit {
  const requiredKeys = Object.keys(right.payload);
  const payload: Record<string, unknown> = {};
  for (const key of requiredKeys) {
    if (Object.prototype.hasOwnProperty.call(left.payload, key)) {
      payload[key] = left.payload[key];
    } else {
      conflicts.push({
        leftId: left.id,
        rightId: right.id,
        reason: `missing constrained key: ${key}`
      });
    }
  }
  return {
    ...left,
    payload
  };
}

function specializeScu(left: SemanticContextUnit, right: SemanticContextUnit): SemanticContextUnit {
  return {
    ...left,
    dependencies: [...left.dependencies, ...right.dependencies],
    provenance: {
      ...left.provenance,
      ...right.provenance
    },
    payload: {
      ...left.payload,
      ...right.payload
    }
  };
}

function supersedeScu(
  left: SemanticContextUnit,
  right: SemanticContextUnit,
  conflicts: CompositionResult['conflicts']
): SemanticContextUnit {
  conflicts.push({
    leftId: left.id,
    rightId: right.id,
    reason: 'superseded by newer SCU'
  });
  return right;
}

function deterministicHash(value: unknown): string {
  const canonical = canonicalize(value);
  let hash = 2166136261;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a_${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function canonicalize(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value);
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(obj[key])}`).join(',')}}`;
}
