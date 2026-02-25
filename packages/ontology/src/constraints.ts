import type { NodeType, RelType } from './index';
import { NODE_TYPES } from './node-types';
import { REL_TYPES } from './rel-types';

export interface RelConstraint {
  rel: RelType;
  srcTypes: NodeType[];
  dstTypes: NodeType[];
}

export const REL_CONSTRAINTS: RelConstraint[] = [
  {
    rel: REL_TYPES.GRANTS_OBJECT,
    srcTypes: [NODE_TYPES.PROFILE, NODE_TYPES.PERMISSION_SET],
    dstTypes: [NODE_TYPES.OBJECT]
  },
  {
    rel: REL_TYPES.GRANTS_FIELD,
    srcTypes: [NODE_TYPES.PROFILE, NODE_TYPES.PERMISSION_SET],
    dstTypes: [NODE_TYPES.FIELD]
  },
  {
    rel: REL_TYPES.GRANTS_SYSTEM_PERMISSION,
    srcTypes: [NODE_TYPES.PROFILE, NODE_TYPES.PERMISSION_SET],
    dstTypes: [NODE_TYPES.SYSTEM_PERMISSION]
  },
  {
    rel: REL_TYPES.TRIGGERS_ON,
    srcTypes: [NODE_TYPES.APEX_TRIGGER, NODE_TYPES.FLOW],
    dstTypes: [NODE_TYPES.OBJECT]
  },
  {
    rel: REL_TYPES.REFERENCES,
    srcTypes: [NODE_TYPES.APEX_TRIGGER, NODE_TYPES.APEX_CLASS, NODE_TYPES.FLOW],
    dstTypes: [NODE_TYPES.OBJECT, NODE_TYPES.FIELD]
  },
  {
    rel: REL_TYPES.QUERIES,
    srcTypes: [NODE_TYPES.APEX_TRIGGER, NODE_TYPES.APEX_CLASS, NODE_TYPES.FLOW],
    dstTypes: [NODE_TYPES.OBJECT, NODE_TYPES.FIELD]
  },
  {
    rel: REL_TYPES.WRITES,
    srcTypes: [NODE_TYPES.APEX_TRIGGER, NODE_TYPES.APEX_CLASS, NODE_TYPES.FLOW],
    dstTypes: [NODE_TYPES.OBJECT, NODE_TYPES.FIELD]
  }
];
