export const SCU_TYPES = {
  PERMISSION: 'permission',
  OBJECT: 'object',
  FIELD: 'field',
  AUTOMATION: 'automation',
  POLICY: 'policy',
  RISK: 'risk',
  META: 'meta'
} as const;

export type ScuType = (typeof SCU_TYPES)[keyof typeof SCU_TYPES];

export const COMPOSITION_OPERATORS = {
  OVERLAY: 'overlay',
  INTERSECT: 'intersect',
  CONSTRAIN: 'constrain',
  SPECIALIZE: 'specialize',
  SUPERSEDE: 'supersede'
} as const;

export type CompositionOperator =
  (typeof COMPOSITION_OPERATORS)[keyof typeof COMPOSITION_OPERATORS];

export const DERIVATION_RELATIONS = {
  DERIVED_FROM: 'DERIVED_FROM',
  SUPPORTS: 'SUPPORTS',
  CONTRADICTS: 'CONTRADICTS',
  REQUIRES: 'REQUIRES',
  INVALIDATED_BY: 'INVALIDATED_BY',
  SUPERSEDES: 'SUPERSEDES'
} as const;

export type DerivationRelation =
  (typeof DERIVATION_RELATIONS)[keyof typeof DERIVATION_RELATIONS];

export interface ScuInvariant {
  code: string;
  description: string;
}

export interface ScuDependency {
  scuId: string;
  required: boolean;
}

export interface ScuProvenance {
  sourcePath?: string;
  parser?: string;
  parserVersion?: string;
  snapshotId?: string;
}

export interface ScuConfidencePolicy {
  groundingThreshold: number;
  constraintThreshold: number;
  ambiguityMaxThreshold: number;
}

export interface SemanticContextUnit {
  id: string;
  type: ScuType;
  payload: Record<string, unknown>;
  invariants: ScuInvariant[];
  dependencies: ScuDependency[];
  provenance: ScuProvenance;
  confidencePolicy: ScuConfidencePolicy;
}
