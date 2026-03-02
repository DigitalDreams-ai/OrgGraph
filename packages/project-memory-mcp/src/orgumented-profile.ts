import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMemoryRecord, ProjectMemorySourceRef } from './types';

export interface WaveSummary {
  wave: string;
  title: string;
  path: string;
  taskCounts: {
    completed: number;
    pending: number;
  };
  exitGateCounts: {
    completed: number;
    pending: number;
  };
}

interface RepoSeedDefinition {
  title: string;
  summary: string;
  subsystem: string;
  scopePaths: string[];
  tags: string[];
  sourceRefs: ProjectMemorySourceRef[];
  entryPoints: string[];
  keyPaths: string[];
  dependencies: string[];
  verificationCommands: string[];
  docRefs: string[];
}

const ORGUMENTED_SEED_DEFINITIONS: RepoSeedDefinition[] = [
  {
    title: 'API runtime',
    summary: 'Nest API for Ask, graph, ingestion, org workflows, and observability.',
    subsystem: 'api-runtime',
    scopePaths: ['apps/api'],
    tags: ['api', 'runtime', 'nest'],
    sourceRefs: [
      { kind: 'file', ref: 'apps/api/src/app.module.ts' },
      { kind: 'doc', ref: 'docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md' }
    ],
    entryPoints: ['apps/api/src/main.ts', 'apps/api/src/app.module.ts'],
    keyPaths: ['apps/api/src/modules/ask', 'apps/api/src/modules/ingestion', 'apps/api/src/modules/org'],
    dependencies: ['packages/ontology', 'data/refresh', 'data/ask'],
    verificationCommands: [
      'npm exec --yes pnpm@9.12.3 -- --filter api test',
      'npm exec --yes pnpm@9.12.3 -- --filter api build'
    ],
    docRefs: ['docs/USAGE_GUIDE.md', 'docs/planning/WAVE_B_TASKLIST.md']
  },
  {
    title: 'Operator surfaces',
    summary: 'Next.js operator surfaces today and the fresh desktop-facing UX transition path for Ask, org sessions, retrieval, proofs, and diagnostics.',
    subsystem: 'operator-surfaces',
    scopePaths: ['apps/web'],
    tags: ['web', 'nextjs', 'operator-ui', 'desktop-transition'],
    sourceRefs: [
      { kind: 'file', ref: 'apps/web/app/page.tsx' },
      { kind: 'doc', ref: 'docs/planning/DESKTOP_UX_BLUEPRINT.md' }
    ],
    entryPoints: ['apps/web/app/page.tsx', 'apps/web/app/layout.tsx'],
    keyPaths: ['apps/web/app', 'docs/planning/WAVE_G_TASKLIST.md', 'docs/planning/DESKTOP_UX_BLUEPRINT.md'],
    dependencies: ['apps/api', 'docs/planning/WAVE_G_TASKLIST.md', 'docs/planning/DESKTOP_TRANSITION_PLAN.md'],
    verificationCommands: ['npm exec --yes pnpm@9.12.3 -- desktop:smoke:release'],
    docRefs: ['docs/planning/WAVE_G_TASKLIST.md', 'docs/planning/DESKTOP_UX_BLUEPRINT.md']
  },
  {
    title: 'Desktop transition architecture',
    summary: 'Desktop-native target architecture, local runtime boundaries, legacy removal, and migration sequencing for Tauri + Next.js + NestJS.',
    subsystem: 'desktop-transition',
    scopePaths: ['docs/planning'],
    tags: ['desktop', 'tauri', 'migration', 'runtime'],
    sourceRefs: [
      { kind: 'doc', ref: 'docs/planning/DESKTOP_ARCHITECTURE.md' },
      { kind: 'doc', ref: 'docs/planning/DESKTOP_TRANSITION_PLAN.md' }
    ],
    entryPoints: ['docs/planning/DESKTOP_ARCHITECTURE.md', 'docs/planning/DESKTOP_TRANSITION_PLAN.md'],
    keyPaths: [
      'docs/planning/LEGACY_REMOVAL_REGISTER.md',
      'docs/planning/REUSE_REFACTOR_DELETE_MATRIX.md',
      'docs/planning/WAVE_F_TASKLIST.md'
    ],
    dependencies: ['docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md', 'docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md'],
    verificationCommands: ['git diff -- docs/planning'],
    docRefs: [
      'docs/planning/DESKTOP_ARCHITECTURE.md',
      'docs/planning/DESKTOP_TRANSITION_PLAN.md',
      'docs/planning/WAVE_F_TASKLIST.md'
    ]
  },
  {
    title: 'Ontology package',
    summary: 'Canonical semantic runtime contracts, node types, relation types, and operator definitions.',
    subsystem: 'ontology',
    scopePaths: ['packages/ontology'],
    tags: ['ontology', 'semantic-runtime', 'contracts'],
    sourceRefs: [
      { kind: 'file', ref: 'packages/ontology/src/index.ts' },
      { kind: 'doc', ref: 'docs/planning/ORGUMENTED_LEXICON.md' }
    ],
    entryPoints: ['packages/ontology/src/index.ts'],
    keyPaths: ['packages/ontology/src/semantic-runtime.ts', 'packages/ontology/src/constraints.ts'],
    dependencies: ['docs/planning/ORGUMENTED_LEXICON.md', 'docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md'],
    verificationCommands: [
      'npm exec --yes pnpm@9.12.3 -- --filter @orgumented/ontology test',
      'npm exec --yes pnpm@9.12.3 -- --filter @orgumented/ontology typecheck'
    ],
    docRefs: ['docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md', 'docs/planning/ORGUMENTED_LEXICON.md']
  },
  {
    title: 'Planning and wave governance',
    summary: 'Blue-ocean execution docs, wave tasklists, and acceptance-gate planning artifacts.',
    subsystem: 'planning',
    scopePaths: ['docs/planning'],
    tags: ['planning', 'waves', 'governance'],
    sourceRefs: [
      { kind: 'doc', ref: 'docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md' },
      { kind: 'doc', ref: 'docs/planning/WAVE_A_TASKLIST.md' }
    ],
    entryPoints: ['docs/planning/BLUE_OCEAN_EXECUTION_PLAN.md', 'docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md'],
    keyPaths: [
      'docs/planning/WAVE_A_TASKLIST.md',
      'docs/planning/WAVE_B_TASKLIST.md',
      'docs/planning/WAVE_C_TASKLIST.md',
      'docs/planning/WAVE_F_TASKLIST.md',
      'docs/planning/WAVE_G_TASKLIST.md'
    ],
    dependencies: ['docs/planning/ORGUMENTED_LEXICON.md', 'docs/planning/DESKTOP_TRANSITION_PLAN.md'],
    verificationCommands: ['git diff -- docs/planning'],
    docRefs: [
      'docs/planning/BLUE_OCEAN_PHASE_ROADMAP.md',
      'docs/planning/WAVE_B_TASKLIST.md',
      'docs/planning/WAVE_F_TASKLIST.md',
      'docs/planning/WAVE_G_TASKLIST.md'
    ]
  }
];

export function createOrgumentedBaselineRecords(
  createdBy: string,
  createdAt: string,
  createRecordId: (recordType: 'repo_map', title: string, createdAt: string) => string
): ProjectMemoryRecord[] {
  return ORGUMENTED_SEED_DEFINITIONS.map((definition) => ({
    id: createRecordId('repo_map', definition.title, createdAt),
    recordType: 'repo_map',
    title: definition.title,
    summary: definition.summary,
    createdAt,
    updatedAt: createdAt,
    createdBy,
    sourceRefs: definition.sourceRefs,
    confidence: 'high',
    validity: 'advisory',
    scope: {
      area: definition.subsystem,
      paths: definition.scopePaths,
      tags: definition.tags
    },
    tags: definition.tags,
    subsystem: definition.subsystem,
    entryPoints: definition.entryPoints,
    keyPaths: definition.keyPaths,
    dependencies: definition.dependencies,
    verificationCommands: definition.verificationCommands,
    docRefs: definition.docRefs
  }));
}

export function summarizeOrgumentedWaves(workspaceRoot: string): WaveSummary[] {
  return ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((wave) => {
    const relativePath = `docs/planning/WAVE_${wave}_TASKLIST.md`;
    const absolutePath = path.join(workspaceRoot, relativePath);
    const raw = fs.readFileSync(absolutePath, 'utf8');
    const lines = raw.split('\n');

    let section: 'tasks' | 'exit' | undefined;
    let title = `Wave ${wave}`;
    let tasksCompleted = 0;
    let tasksPending = 0;
    let exitCompleted = 0;
    let exitPending = 0;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        title = line.replace(/^#\s*/, '').trim();
        continue;
      }
      if (line.trim() === '## Tasks') {
        section = 'tasks';
        continue;
      }
      if (line.trim() === '## Exit Gates') {
        section = 'exit';
        continue;
      }
      if (line.startsWith('## ')) {
        section = undefined;
        continue;
      }

      if (section === 'tasks') {
        if (line.trim().startsWith('- [x]')) {
          tasksCompleted += 1;
        }
        if (line.trim().startsWith('- [ ]')) {
          tasksPending += 1;
        }
      }

      if (section === 'exit') {
        if (line.trim().startsWith('- [x]')) {
          exitCompleted += 1;
        }
        if (line.trim().startsWith('- [ ]')) {
          exitPending += 1;
        }
      }
    }

    return {
      wave: `Wave ${wave}`,
      title,
      path: relativePath,
      taskCounts: {
        completed: tasksCompleted,
        pending: tasksPending
      },
      exitGateCounts: {
        completed: exitCompleted,
        pending: exitPending
      }
    };
  });
}
