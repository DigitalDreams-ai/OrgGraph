export const NODE_TYPES = {
  OBJECT: 'Object',
  FIELD: 'Field',
  PROFILE: 'Profile',
  PERMISSION_SET: 'PermissionSet'
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];
