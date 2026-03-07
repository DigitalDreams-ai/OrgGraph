'use client';

export type MetadataCatalogType = {
  type: string;
  memberCount: number;
  directoryName?: string;
  inFolder?: boolean;
  metaFile?: boolean;
  suffix?: string;
  childXmlNames?: string[];
  childFamilyCount?: number;
};
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

export type MetadataSearchResult = {
  kind: 'type' | 'member';
  type: string;
  name: string;
  matchField: 'type' | 'member';
};

export type MetadataSearchPayload = {
  source: 'local' | 'source_api' | 'metadata_api' | 'cache' | 'mixed';
  refreshedAt: string;
  search: string;
  totalResults: number;
  results: MetadataSearchResult[];
  warnings?: string[];
};

export type MetadataSelection = {
  type: string;
  members?: string[];
};

export type MetadataSelectionSummary = {
  typeCount: number;
  memberCount: number;
};

export type MetadataRetrieveResultView = {
  alias: string;
  status: string;
  parsePath: string;
  metadataArgs: string[];
  autoRefresh: boolean;
  completedAt: string;
  refresh?: {
    nodeCount: number;
    edgeCount: number;
    evidenceCount: number;
  };
};
