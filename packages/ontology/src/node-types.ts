export const NODE_TYPES = {
  OBJECT: 'Object',
  FIELD: 'Field',
  SYSTEM_PERMISSION: 'SystemPermission',
  PROFILE: 'Profile',
  PERMISSION_SET: 'PermissionSet',
  APEX_CLASS: 'ApexClass',
  APEX_TRIGGER: 'ApexTrigger',
  FLOW: 'Flow'
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];
