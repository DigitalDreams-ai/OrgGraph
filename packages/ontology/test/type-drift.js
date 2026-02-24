const assert = require('node:assert/strict');
const { NODE_TYPES, REL_TYPES } = require('../dist');

assert.deepEqual(Object.keys(NODE_TYPES).sort(), [
  'APEX_CLASS',
  'APEX_TRIGGER',
  'FIELD',
  'FLOW',
  'OBJECT',
  'PERMISSION_SET',
  'PROFILE'
]);
assert.deepEqual(Object.values(NODE_TYPES).sort(), [
  'ApexClass',
  'ApexTrigger',
  'Field',
  'Flow',
  'Object',
  'PermissionSet',
  'Profile'
]);

assert.deepEqual(Object.keys(REL_TYPES).sort(), [
  'GRANTS_FIELD',
  'GRANTS_OBJECT',
  'QUERIES',
  'REFERENCES',
  'TRIGGERS_ON',
  'WRITES'
]);
assert.deepEqual(Object.values(REL_TYPES).sort(), [
  'GRANTS_FIELD',
  'GRANTS_OBJECT',
  'QUERIES',
  'REFERENCES',
  'TRIGGERS_ON',
  'WRITES'
]);

console.log('ontology type drift test passed');
