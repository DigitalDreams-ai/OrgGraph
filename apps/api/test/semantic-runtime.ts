import assert from 'node:assert/strict';
import {
  COMPOSITION_OPERATORS,
  SCU_CONFLICT_POLICIES,
  SCU_TYPES,
  composeScu,
  type SemanticContextUnit
} from '@orggraph/ontology';

function scu(
  id: string,
  payload: Record<string, unknown>,
  type: (typeof SCU_TYPES)[keyof typeof SCU_TYPES] = SCU_TYPES.FIELD
): SemanticContextUnit {
  return {
    id,
    type,
    payload,
    invariants: [{ code: 'inv.required', description: 'required invariant' }],
    dependencies: [],
    provenance: { sourcePath: 'fixtures/permissions', parser: 'test', snapshotId: 'snap_1' },
    confidencePolicy: {
      groundingThreshold: 0.7,
      constraintThreshold: 0.9,
      ambiguityMaxThreshold: 0.45
    }
  };
}

function run(): void {
  const a = scu('scu_a', { object: 'Opportunity', field: 'StageName', mode: 'rw' });
  const b = scu('scu_b', { object: 'Opportunity', field: 'StageName', mode: 'rw' });
  const c = scu('scu_c', { object: 'Opportunity', field: 'StageName', mode: 'r' });

  const run1 = composeScu(COMPOSITION_OPERATORS.INTERSECT, a, b, {
    conflictPolicy: SCU_CONFLICT_POLICIES.STRICT
  });
  const run2 = composeScu(COMPOSITION_OPERATORS.INTERSECT, a, b, {
    conflictPolicy: SCU_CONFLICT_POLICIES.STRICT
  });
  assert.equal(
    run1.deterministicContract.hash,
    run2.deterministicContract.hash,
    'same inputs must produce same deterministic contract hash'
  );

  const ab = composeScu(COMPOSITION_OPERATORS.INTERSECT, a, b, {
    conflictPolicy: SCU_CONFLICT_POLICIES.STRICT
  });
  const ba = composeScu(COMPOSITION_OPERATORS.INTERSECT, b, a, {
    conflictPolicy: SCU_CONFLICT_POLICIES.STRICT
  });
  assert.equal(
    JSON.stringify(ab.output.payload),
    JSON.stringify(ba.output.payload),
    'intersect should be commutative for equal-key payloads'
  );

  const assocLeft = composeScu(
    COMPOSITION_OPERATORS.INTERSECT,
    composeScu(COMPOSITION_OPERATORS.INTERSECT, a, b, {
      conflictPolicy: SCU_CONFLICT_POLICIES.STRICT
    }).output,
    c,
    { conflictPolicy: SCU_CONFLICT_POLICIES.STRICT }
  );
  const assocRight = composeScu(
    COMPOSITION_OPERATORS.INTERSECT,
    a,
    composeScu(COMPOSITION_OPERATORS.INTERSECT, b, c, {
      conflictPolicy: SCU_CONFLICT_POLICIES.STRICT
    }).output,
    { conflictPolicy: SCU_CONFLICT_POLICIES.STRICT }
  );
  assert.equal(
    JSON.stringify(assocLeft.output.payload),
    JSON.stringify(assocRight.output.payload),
    'intersect should be associative under matching types'
  );

  const conflictStrict = composeScu(COMPOSITION_OPERATORS.OVERLAY, a, c, {
    conflictPolicy: SCU_CONFLICT_POLICIES.STRICT
  });
  assert.equal(conflictStrict.conflicts.length > 0, true, 'strict conflict should emit conflict record');
  assert.equal(
    Object.prototype.hasOwnProperty.call(conflictStrict.output.payload, 'conflict'),
    true,
    'strict conflict policy should annotate conflict payload'
  );

  const conflictLexicographic = composeScu(COMPOSITION_OPERATORS.OVERLAY, c, a, {
    conflictPolicy: SCU_CONFLICT_POLICIES.PREFER_LEXICOGRAPHIC_ID
  });
  assert.equal(conflictLexicographic.output.id, 'scu_a', 'lexicographic policy should be deterministic');

  console.log('semantic runtime test passed');
}

run();
