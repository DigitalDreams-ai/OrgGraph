import assert from 'node:assert/strict';
import { NODE_TYPES, REL_CONSTRAINTS, REL_TYPES } from '@orgumented/ontology';

function run(): void {
  const grantsCustom = REL_CONSTRAINTS.find((item) => item.rel === REL_TYPES.GRANTS_CUSTOM_PERMISSION);
  assert.ok(grantsCustom, 'GRANTS_CUSTOM_PERMISSION constraint should exist');
  assert.ok(grantsCustom?.srcTypes.includes(NODE_TYPES.PROFILE));
  assert.ok(grantsCustom?.dstTypes.includes(NODE_TYPES.CUSTOM_PERMISSION));

  const includes = REL_CONSTRAINTS.find((item) => item.rel === REL_TYPES.INCLUDES_PERMISSION_SET);
  assert.ok(includes, 'INCLUDES_PERMISSION_SET constraint should exist');
  assert.ok(includes?.srcTypes.includes(NODE_TYPES.PERMISSION_SET_GROUP));

  const usesConnected = REL_CONSTRAINTS.find((item) => item.rel === REL_TYPES.USES_CONNECTED_APP);
  assert.ok(usesConnected, 'USES_CONNECTED_APP constraint should exist');
  assert.ok(usesConnected?.dstTypes.includes(NODE_TYPES.CONNECTED_APP));

  const hasField = REL_CONSTRAINTS.find((item) => item.rel === REL_TYPES.HAS_FIELD);
  assert.ok(hasField, 'HAS_FIELD constraint should exist');
  assert.ok(hasField?.srcTypes.includes(NODE_TYPES.OBJECT));
  assert.ok(hasField?.dstTypes.includes(NODE_TYPES.FIELD));

  console.log('ontology expanded constraints test passed');
}

run();
