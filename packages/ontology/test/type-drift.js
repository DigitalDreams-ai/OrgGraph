const assert = require('node:assert/strict');
const { NODE_TYPES, REL_TYPES } = require('../dist');

assert.deepEqual(Object.keys(NODE_TYPES).sort(), ['FIELD', 'OBJECT', 'PERMISSION_SET', 'PROFILE']);
assert.deepEqual(Object.values(NODE_TYPES).sort(), ['Field', 'Object', 'PermissionSet', 'Profile']);

assert.deepEqual(Object.keys(REL_TYPES).sort(), ['GRANTS_FIELD', 'GRANTS_OBJECT']);
assert.deepEqual(Object.values(REL_TYPES).sort(), ['GRANTS_FIELD', 'GRANTS_OBJECT']);

console.log('ontology type drift test passed');
