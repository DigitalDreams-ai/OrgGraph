import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import { GraphService } from '../graph/graph.service';
import { resolveUserProfileMapPath } from '../common/path';

@Injectable()
export class QueriesService {
  private readonly userProfileMapPath = resolveUserProfileMapPath(process.env.USER_PROFILE_MAP_PATH);

  constructor(private readonly graphService: GraphService) {}

  perms(user: string, object: string): {
    user: string;
    object: string;
    principalsChecked: string[];
    paths: Array<{ principal: string; object: string; path: Array<{ from: string; rel: string; to: string }> }>;
    explanation: string;
  } {
    const userProfileMap = this.readUserProfileMap();
    const principal = userProfileMap[user.toLowerCase()];
    const principalsChecked = principal ? [principal] : [];
    const paths = this.graphService.findPermPaths(principalsChecked, object);

    if (paths.length === 0) {
      return {
        user,
        object,
        principalsChecked,
        paths,
        explanation: 'no path found'
      };
    }

    return {
      user,
      object,
      principalsChecked,
      paths,
      explanation: `${user} can edit ${object} via ${paths[0].principal}`
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
