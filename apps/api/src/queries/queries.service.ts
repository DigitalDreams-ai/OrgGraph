import { Injectable } from '@nestjs/common';
import { GraphService } from '../graph/graph.service';

const USER_PROFILE_MAP: Record<string, string> = {
  'jane@example.com': 'Support'
};

@Injectable()
export class QueriesService {
  constructor(private readonly graphService: GraphService) {}

  perms(user: string, object: string): {
    user: string;
    object: string;
    principalsChecked: string[];
    paths: Array<{ principal: string; object: string; path: Array<{ from: string; rel: string; to: string }> }>;
    explanation: string;
  } {
    const principal = USER_PROFILE_MAP[user.toLowerCase()];
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
}
