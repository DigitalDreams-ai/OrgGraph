export const NODE_TYPES = {
  OBJECT: 'Object',
  FIELD: 'Field',
  SYSTEM_PERMISSION: 'SystemPermission',
  PROFILE: 'Profile',
  PERMISSION_SET: 'PermissionSet',
  PERMISSION_SET_GROUP: 'PermissionSetGroup',
  CUSTOM_PERMISSION: 'CustomPermission',
  CONNECTED_APP: 'ConnectedApp',
  APEX_CLASS: 'ApexClass',
  APEX_TRIGGER: 'ApexTrigger',
  FLOW: 'Flow',
  APEX_PAGE: 'ApexPage',
  LIGHTNING_COMPONENT_BUNDLE: 'LightningComponentBundle',
  AURA_DEFINITION_BUNDLE: 'AuraDefinitionBundle',
  QUICK_ACTION: 'QuickAction',
  LAYOUT: 'Layout'
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];
