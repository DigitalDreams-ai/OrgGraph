export const REL_TYPES = {
  GRANTS_OBJECT: 'GRANTS_OBJECT',
  GRANTS_FIELD: 'GRANTS_FIELD'
} as const;

export type RelType = (typeof REL_TYPES)[keyof typeof REL_TYPES];
