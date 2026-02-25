import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service';
import type { AutomationHit, GraphPayload, ImpactHit, PermPath } from './graph.types';
import type { GraphBackend, GraphStore } from './graph-store';
import { PostgresGraphStore } from './postgres-graph.store';
import { SqliteGraphStore } from './sqlite-graph.store';

@Injectable()
export class GraphService implements OnModuleDestroy {
  private readonly store: GraphStore;

  constructor(private readonly configService: AppConfigService) {
    this.store =
      this.configService.graphBackend() === 'postgres'
        ? new PostgresGraphStore(this.configService)
        : new SqliteGraphStore(this.configService);
  }

  async onModuleDestroy(): Promise<void> {
    await this.store.close();
  }

  backend(): GraphBackend {
    return this.store.backend;
  }

  getDatabasePath(): string {
    return this.store.storageRef;
  }

  async getCounts(): Promise<{ nodeCount: number; edgeCount: number }> {
    return this.store.getCounts();
  }

  async canServeQueries(): Promise<boolean> {
    try {
      await this.store.getCounts();
      return true;
    } catch {
      return false;
    }
  }

  async getLowConfidenceSummary(limit = 10): Promise<Array<{ source: string; count: number }>> {
    return this.store.getLowConfidenceSummary(limit);
  }

  async fullRebuild(payload: GraphPayload): Promise<{ nodeCount: number; edgeCount: number }> {
    return this.store.fullRebuild(payload);
  }

  async findObjectPermPaths(principals: string[], objectName: string): Promise<PermPath[]> {
    return this.store.findObjectPermPaths(principals, objectName);
  }

  async findFieldPermPaths(
    principals: string[],
    objectName: string,
    fieldName: string
  ): Promise<PermPath[]> {
    return this.store.findFieldPermPaths(principals, objectName, fieldName);
  }

  async findSystemPermissionPaths(
    principals: string[],
    permissionName: string
  ): Promise<PermPath[]> {
    return this.store.findSystemPermissionPaths(principals, permissionName);
  }

  async findAutomationsForObject(objectName: string): Promise<AutomationHit[]> {
    return this.store.findAutomationsForObject(objectName);
  }

  async findImpactForField(fieldName: string): Promise<ImpactHit[]> {
    return this.store.findImpactForField(fieldName);
  }
}
