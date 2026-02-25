import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import { AppConfigService } from '../config/app-config.service';
import { GraphService } from '../graph/graph.service';
import { resolveUserProfileMapPath } from '../common/path';

@Injectable()
export class QueriesService {
  private static readonly DEFAULT_LIMIT = 25;

  private readonly userProfileMapPath: string;

  constructor(
    private readonly configService: AppConfigService,
    private readonly graphService: GraphService
  ) {
    this.userProfileMapPath = resolveUserProfileMapPath(this.configService.userProfileMapPath());
  }

  async perms(
    user: string,
    object: string,
    field?: string,
    limit = QueriesService.DEFAULT_LIMIT
  ): Promise<{
    user: string;
    object: string;
    field?: string;
    principalsChecked: string[];
    paths: Array<{ principal: string; object: string; path: Array<{ from: string; rel: string; to: string }> }>;
    granted: boolean;
    objectGranted: boolean;
    fieldGranted?: boolean;
    totalPaths: number;
    truncated: boolean;
    explanation: string;
    mappingStatus: 'resolved' | 'unmapped_user' | 'map_missing';
    warnings: string[];
  }> {
    const mapResult = this.readUserProfileMap();
    const principalsChecked = mapResult.map[user.toLowerCase()] ?? [];
    const mappingStatus = mapResult.exists
      ? principalsChecked.length > 0
        ? 'resolved'
        : 'unmapped_user'
      : 'map_missing';
    const warnings = this.buildWarnings(mappingStatus, user);
    const objectPaths = await this.graphService.findObjectPermPaths(principalsChecked, object);
    const objectGranted = objectPaths.length > 0;

    if (!field) {
      if (!objectGranted) {
        return {
          user,
          object,
          principalsChecked,
          paths: [],
          granted: false,
          objectGranted: false,
          totalPaths: 0,
          truncated: false,
          explanation: 'no object grant path found',
          mappingStatus,
          warnings
        };
      }

      const sliced = objectPaths.slice(0, limit);

      return {
        user,
        object,
        principalsChecked,
        paths: sliced,
        granted: true,
        objectGranted: true,
        totalPaths: objectPaths.length,
        truncated: objectPaths.length > sliced.length,
        explanation: `${user} can edit ${object} via ${objectPaths[0].principal}`,
        mappingStatus,
        warnings
      };
    }

    const fieldPaths = await this.graphService.findFieldPermPaths(principalsChecked, object, field);
    const fieldGranted = fieldPaths.length > 0;
    if (!objectGranted) {
      return {
        user,
        object,
        field,
        principalsChecked,
        paths: [],
        granted: false,
        objectGranted: false,
        fieldGranted: false,
        totalPaths: 0,
        truncated: false,
        explanation: `${user} has no object-level edit path to ${object}`,
        mappingStatus,
        warnings
      };
    }

    if (!fieldGranted) {
      return {
        user,
        object,
        field,
        principalsChecked,
        paths: [],
        granted: false,
        objectGranted: true,
        fieldGranted: false,
        totalPaths: 0,
        truncated: false,
        explanation: `${user} has object access to ${object} but no field-level edit path to ${field}`,
        mappingStatus,
        warnings
      };
    }

    const sliced = fieldPaths.slice(0, limit);

    return {
      user,
      object,
      field,
      principalsChecked,
      paths: sliced,
      granted: true,
      objectGranted: true,
      fieldGranted: true,
      totalPaths: fieldPaths.length,
      truncated: fieldPaths.length > sliced.length,
      explanation: `${user} can edit ${field} via ${fieldPaths[0].principal}`,
      mappingStatus,
      warnings
    };
  }

  async systemPermission(
    user: string,
    permission: string,
    limit = QueriesService.DEFAULT_LIMIT
  ): Promise<{
    user: string;
    permission: string;
    principalsChecked: string[];
    paths: Array<{ principal: string; permission: string; path: Array<{ from: string; rel: string; to: string }> }>;
    granted: boolean;
    totalPaths: number;
    truncated: boolean;
    explanation: string;
    mappingStatus: 'resolved' | 'unmapped_user' | 'map_missing';
    warnings: string[];
  }> {
    const mapResult = this.readUserProfileMap();
    const principalsChecked = mapResult.map[user.toLowerCase()] ?? [];
    const mappingStatus = mapResult.exists
      ? principalsChecked.length > 0
        ? 'resolved'
        : 'unmapped_user'
      : 'map_missing';
    const warnings = this.buildWarnings(mappingStatus, user);
    const paths = await this.graphService.findSystemPermissionPaths(principalsChecked, permission);
    const sliced = paths.slice(0, limit);
    const granted = paths.length > 0;

    return {
      user,
      permission,
      principalsChecked,
      paths: sliced.map((item) => ({
        principal: item.principal,
        permission: item.object,
        path: item.path
      })),
      granted,
      totalPaths: paths.length,
      truncated: paths.length > sliced.length,
      explanation: granted
        ? `${user} has ${permission} via ${paths[0].principal}`
        : `${user} does not have ${permission}`,
      mappingStatus,
      warnings
    };
  }

  private readUserProfileMap(): { exists: boolean; map: Record<string, string[]> } {
    if (!fs.existsSync(this.userProfileMapPath)) {
      return { exists: false, map: {} };
    }

    try {
      const raw = fs.readFileSync(this.userProfileMapPath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const normalized: Record<string, string[]> = {};

      for (const [email, principalValue] of Object.entries(parsed)) {
        const principals = this.normalizePrincipals(principalValue);
        if (principals.length === 0) {
          continue;
        }
        normalized[email.toLowerCase()] = principals;
      }
      return { exists: true, map: normalized };
    } catch {
      return { exists: true, map: {} };
    }
  }

  private normalizePrincipals(value: unknown): string[] {
    if (typeof value === 'string') {
      return value.trim().length > 0 ? [value.trim()] : [];
    }

    if (!Array.isArray(value)) {
      return [];
    }

    const output: string[] = [];
    for (const item of value) {
      if (typeof item !== 'string') {
        continue;
      }
      const principal = item.trim();
      if (principal.length === 0 || output.includes(principal)) {
        continue;
      }
      output.push(principal);
    }

    return output;
  }

  private buildWarnings(
    mappingStatus: 'resolved' | 'unmapped_user' | 'map_missing',
    user: string
  ): string[] {
    if (mappingStatus === 'resolved') {
      return [];
    }

    if (mappingStatus === 'map_missing') {
      return [
        `user principal map not found at ${this.userProfileMapPath}; /perms cannot resolve user profile/permission-set assignments`
      ];
    }

    return [`no principals found for ${user} in user principal map`];
  }
}
