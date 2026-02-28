'use client';

export type MetadataCatalogType = { type: string; memberCount: number };
export type MetadataMember = { name: string };

export type MetadataCatalogPayload = {
  source: 'local' | 'source_api' | 'metadata_api' | 'cache' | 'mixed';
  refreshedAt: string;
  totalTypes: number;
  types: MetadataCatalogType[];
  warnings?: string[];
};

export type MetadataMembersPayload = {
  source: 'local' | 'source_api' | 'metadata_api' | 'cache' | 'mixed';
  refreshedAt: string;
  type: string;
  totalMembers: number;
  members: MetadataMember[];
  warnings?: string[];
};

export type MetadataSelection = {
  type: string;
  members?: string[];
};
