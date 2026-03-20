import fs from 'node:fs';
import path from 'node:path';
import type { ProjectMemoryRecord, ProjectMemorySourceRef } from './types';

export interface WaveSummary {
  wave: string;
  order: number;
  theme: string;
  primaryIds: string;
  status: string;
  nextGate: string;
  path: string;
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
      { kind: 'doc', ref: 'docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md' }
    ],
    entryPoints: ['apps/api/src/main.ts', 'apps/api/src/app.module.ts'],
    keyPaths: ['apps/api/src/modules/ask', 'apps/api/src/modules/ingestion', 'apps/api/src/modules/org'],
    dependencies: ['packages/ontology', 'data/refresh', 'data/ask'],
    verificationCommands: [
      'npm exec --yes pnpm@9.12.3 -- --filter api test',
      'npm exec --yes pnpm@9.12.3 -- --filter api build'
    ],
    docRefs: ['docs/getting-started/USAGE_GUIDE.md', 'docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md']
  },
  {
    title: 'Operator surfaces',
    summary: 'Next.js operator surfaces for Ask, org sessions, retrieval, proofs, and diagnostics inside the desktop shell.',
    subsystem: 'operator-surfaces',
    scopePaths: ['apps/web'],
    tags: ['web', 'nextjs', 'operator-ui', 'desktop'],
    sourceRefs: [
      { kind: 'file', ref: 'apps/web/app/page.tsx' },
      { kind: 'doc', ref: 'docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md' }
    ],
    entryPoints: ['apps/web/app/page.tsx', 'apps/web/app/layout.tsx'],
    keyPaths: ['apps/web/app', 'apps/web/test', 'docs/architecture/ORGUMENTED_LIFECYCLE.md'],
    dependencies: ['apps/api', 'apps/desktop', 'docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md'],
    verificationCommands: ['npm exec --yes pnpm@9.12.3 -- desktop:smoke:release'],
    docRefs: ['docs/architecture/ORGUMENTED_LIFECYCLE.md', 'docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md']
  },
  {
    title: 'Desktop runtime architecture',
    summary: 'Windows-native desktop runtime boundaries for Tauri + embedded Next.js UI + local Nest engine.',
    subsystem: 'desktop-runtime',
    scopePaths: ['apps/desktop', 'docs/planning/v2'],
    tags: ['desktop', 'tauri', 'runtime', 'windows'],
    sourceRefs: [
      { kind: 'doc', ref: 'docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md' },
      { kind: 'doc', ref: 'docs/architecture/ORGUMENTED_LIFECYCLE.md' }
    ],
    entryPoints: ['apps/desktop/src-tauri/src/main.rs', 'apps/desktop/scripts/dev-runtime.mjs'],
    keyPaths: [
      'apps/desktop/src-tauri',
      'apps/desktop/scripts',
      'docs/runbooks/DESKTOP_DEV_RUNTIME.md'
    ],
    dependencies: ['apps/web', 'apps/api', 'docs/planning/v2/ORGUMENTED_V2_EXECUTION.md'],
    verificationCommands: ['pnpm desktop:build', 'pnpm desktop:smoke:release'],
    docRefs: [
      'docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md',
      'docs/architecture/ORGUMENTED_LIFECYCLE.md',
      'docs/runbooks/DESKTOP_DEV_RUNTIME.md'
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
      { kind: 'doc', ref: 'docs/planning/v2/ORGUMENTED_V2_LEXICON.md' }
    ],
    entryPoints: ['packages/ontology/src/index.ts'],
    keyPaths: ['packages/ontology/src/semantic-runtime.ts', 'packages/ontology/src/constraints.ts'],
    dependencies: ['docs/planning/v2/ORGUMENTED_V2_LEXICON.md', 'docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md'],
    verificationCommands: [
      'npm exec --yes pnpm@9.12.3 -- --filter @orgumented/ontology test',
      'npm exec --yes pnpm@9.12.3 -- --filter @orgumented/ontology typecheck'
    ],
    docRefs: ['docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md', 'docs/planning/v2/ORGUMENTED_V2_LEXICON.md']
  },
  {
    title: 'v2 planning and wave governance',
    summary: 'Current v2 execution docs, numbered wave plan, and acceptance-gate governance artifacts.',
    subsystem: 'planning',
    scopePaths: ['docs/planning/v2'],
    tags: ['planning', 'waves', 'governance'],
    sourceRefs: [
      { kind: 'doc', ref: 'docs/planning/v2/README.md' },
      { kind: 'doc', ref: 'docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md' }
    ],
    entryPoints: ['docs/planning/v2/README.md', 'docs/planning/v2/ORGUMENTED_V2_EXECUTION.md'],
    keyPaths: [
      'docs/planning/v2/ORGUMENTED_V2_ROADMAP.md',
      'docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md',
      'docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md',
      'docs/planning/v2/WAVE1_BACKLOG.md'
    ],
    dependencies: ['docs/planning/v2/ORGUMENTED_V2_ARCHITECTURE.md', 'docs/planning/v2/ORGUMENTED_V2_PIVOT_LOCK.md'],
    verificationCommands: ['git diff -- docs/planning'],
    docRefs: [
      'docs/planning/v2/README.md',
      'docs/planning/v2/ORGUMENTED_V2_EXECUTION.md',
      'docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md',
      'docs/planning/v2/ORGUMENTED_V2_GOVERNANCE.md'
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
  const relativePath = 'docs/planning/v2/ORGUMENTED_V2_WAVES_100_PLAN.md';
  const absolutePath = path.join(workspaceRoot, relativePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const lines = raw.split('\n');
  const summaries: WaveSummary[] = [];
  let insideSnapshot = false;

  for (const line of lines) {
    if (line.trim() === '## Wave Progress Snapshot') {
      insideSnapshot = true;
      continue;
    }

    if (!insideSnapshot) {
      continue;
    }

    if (line.startsWith('## ') && line.trim() !== '## Wave Progress Snapshot') {
      break;
    }

    if (!line.trim().startsWith('| wave')) {
      continue;
    }

    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());

    if (cells.length !== 5) {
      continue;
    }

    const [wave, theme, primaryIds, status, nextGate] = cells;
    const order = Number.parseInt(wave.replace(/^wave/i, ''), 10);

    summaries.push({
      wave,
      order: Number.isFinite(order) ? order : summaries.length + 1,
      theme,
      primaryIds,
      status,
      nextGate,
      path: relativePath
    });
  }

  return summaries;
}
