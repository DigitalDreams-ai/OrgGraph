import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import { GraphService } from '../graph/graph.service';
import { resolveUserProfileMapPath } from '../common/path';

@Injectable()
export class QueriesService {
  private readonly userProfileMapPath = resolveUserProfileMapPath(process.env.USER_PROFILE_MAP_PATH);

  constructor(private readonly graphService: GraphService) {}

  perms(user: string, object: string, field?: string): {
    user: string;
    object: string;
    field?: string;
    principalsChecked: string[];
    paths: Array<{ principal: string; object: string; path: Array<{ from: string; rel: string; to: string }> }>;
    granted: boolean;
    objectGranted: boolean;
    fieldGranted?: boolean;
    explanation: string;
  } {
    const userProfileMap = this.readUserProfileMap();
    const principal = userProfileMap[user.toLowerCase()];
    const principalsChecked = principal ? [principal] : [];
    const objectPaths = this.graphService.findObjectPermPaths(principalsChecked, object);
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
          explanation: 'no object grant path found'
        };
      }

      return {
        user,
        object,
        principalsChecked,
        paths: objectPaths,
        granted: true,
        objectGranted: true,
        explanation: `${user} can edit ${object} via ${objectPaths[0].principal}`
      };
    }

    const fieldPaths = this.graphService.findFieldPermPaths(principalsChecked, object, field);
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
        explanation: `${user} has no object-level edit path to ${object}`
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
        explanation: `${user} has object access to ${object} but no field-level edit path to ${field}`
      };
    }

    return {
      user,
      object,
      field,
      principalsChecked,
      paths: fieldPaths,
      granted: true,
      objectGranted: true,
      fieldGranted: true,
      explanation: `${user} can edit ${field} via ${fieldPaths[0].principal}`
    };
  }

  private readUserProfileMap(): Record<string, string> {
    if (!fs.existsSync(this.userProfileMapPath)) {
      return {};
    }

    try {
      const raw = fs.readFileSync(this.userProfileMapPath, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const normalized: Record<string, string> = {};

      for (const [email, profile] of Object.entries(parsed)) {
        if (typeof profile !== 'string') {
          continue;
        }
        normalized[email.toLowerCase()] = profile;
      }
      return normalized;
    } catch {
      return {};
    }
  }
}
