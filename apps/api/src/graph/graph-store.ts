import type { AutomationHit, GraphPayload, ImpactHit, PermPath } from './graph.types';

export type GraphBackend = 'sqlite' | 'postgres';

export interface GraphStore {
  backend: GraphBackend;
  storageRef: string;

  close(): Promise<void>;
  getCounts(): Promise<{ nodeCount: number; edgeCount: number }>;
  getLowConfidenceSummary(limit?: number): Promise<Array<{ source: string; count: number }>>;
  fullRebuild(payload: GraphPayload): Promise<{ nodeCount: number; edgeCount: number }>;
  findObjectPermPaths(principals: string[], objectName: string): Promise<PermPath[]>;
  findFieldPermPaths(principals: string[], objectName: string, fieldName: string): Promise<PermPath[]>;
  findSystemPermissionPaths(principals: string[], permissionName: string): Promise<PermPath[]>;
  findAutomationsForObject(objectName: string): Promise<AutomationHit[]>;
  findImpactForField(fieldName: string): Promise<ImpactHit[]>;
}
