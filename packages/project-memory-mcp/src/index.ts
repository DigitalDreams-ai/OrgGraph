#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createOrgumentedBaselineRecords, summarizeOrgumentedWaves } from './orgumented-profile';
import { resolveWorkspaceRoot } from './path';
import { ProjectMemoryStore } from './store';
import type { ProjectMemoryRecord, ProjectMemoryRecordType, ProjectMemoryValidity } from './types';

const sourceRefSchema = z.object({
  kind: z.enum([
    'file',
    'doc',
    'commit',
    'issue',
    'pull_request',
    'proof',
    'snapshot',
    'policy',
    'command',
    'artifact',
    'service'
  ]),
  ref: z.string().min(1),
  label: z.string().min(1).optional(),
  observedAt: z.string().datetime().optional()
});

const scopeSchema = z.object({
  area: z.string().min(1),
  paths: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([])
});

const baseRecordSchema = z.object({
  id: z.string().min(1).optional(),
  title: z.string().min(1),
  summary: z.string().min(1),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  createdBy: z.string().min(1).default('codex'),
  sourceRefs: z.array(sourceRefSchema).min(1),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  validity: z.enum(['advisory', 'verified', 'stale', 'superseded', 'expired']).default('advisory'),
  scope: scopeSchema,
  tags: z.array(z.string().min(1)).default([]),
  expiresAt: z.string().datetime().optional()
});

const workItemSchema = baseRecordSchema.extend({
  recordType: z.literal('work_item'),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done']),
  owner: z.string().min(1).optional(),
  scopePaths: z.array(z.string().min(1)).default([]),
  relatedDocs: z.array(z.string().min(1)).default([]),
  relatedIssues: z.array(z.string().min(1)).default([])
});

const decisionNoteSchema = baseRecordSchema.extend({
  recordType: z.literal('decision_note'),
  rationale: z.string().min(1),
  alternativesRejected: z.array(z.string().min(1)).default([]),
  commitSha: z.string().min(7).max(40).optional(),
  docRefs: z.array(z.string().min(1)).default([]),
  supersededBy: z.string().min(1).optional()
});

const repoMapSchema = baseRecordSchema.extend({
  recordType: z.literal('repo_map'),
  subsystem: z.string().min(1),
  entryPoints: z.array(z.string().min(1)).default([]),
  keyPaths: z.array(z.string().min(1)).default([]),
  dependencies: z.array(z.string().min(1)).default([]),
  verificationCommands: z.array(z.string().min(1)).default([]),
  docRefs: z.array(z.string().min(1)).default([])
});

const verificationResultSchema = baseRecordSchema.extend({
  recordType: z.literal('verification_result'),
  subject: z.string().min(1),
  command: z.string().min(1),
  result: z.enum(['pass', 'warn', 'fail']),
  commitSha: z.string().min(7).max(40).optional(),
  artifactRefs: z.array(z.string().min(1)).default([]),
  serviceRefs: z.array(z.string().min(1)).default([])
});

const riskItemSchema = baseRecordSchema.extend({
  recordType: z.literal('risk_item'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['open', 'mitigated', 'accepted', 'closed']),
  trigger: z.string().min(1),
  mitigation: z.string().min(1)
});

const handoffNoteSchema = baseRecordSchema.extend({
  recordType: z.literal('handoff_note'),
  taskContext: z.string().min(1),
  currentState: z.string().min(1),
  nextChecks: z.array(z.string().min(1)).default([]),
  blockedBy: z.array(z.string().min(1)).default([]),
  commitSha: z.string().min(7).max(40).optional()
});

const runtimeObservationSchema = baseRecordSchema.extend({
  recordType: z.literal('runtime_observation'),
  service: z.string().min(1),
  observation: z.string().min(1),
  ttlSeconds: z.number().int().min(1).max(604800)
});

const recordSchema = z.discriminatedUnion('recordType', [
  workItemSchema,
  decisionNoteSchema,
  repoMapSchema,
  verificationResultSchema,
  riskItemSchema,
  handoffNoteSchema,
  runtimeObservationSchema
]);

const recordTypeSchema = z.array(
  z.enum([
    'work_item',
    'decision_note',
    'repo_map',
    'verification_result',
    'risk_item',
    'handoff_note',
    'runtime_observation'
  ])
);

const validitySchema = z.array(z.enum(['advisory', 'verified', 'stale', 'superseded', 'expired']));

function nowIso(): string {
  return new Date().toISOString();
}

function structured<T>(value: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function ensureRecordDefaults(
  input: z.infer<typeof recordSchema>,
  store: ProjectMemoryStore
): ProjectMemoryRecord {
  const createdAt = input.createdAt ?? nowIso();
  const updatedAt = input.updatedAt ?? createdAt;
  const id = input.id ?? store.createRecordId(input.recordType, input.title, createdAt);

  return {
    ...input,
    id,
    createdAt,
    updatedAt
  } as ProjectMemoryRecord;
}

async function main(): Promise<void> {
  const store = new ProjectMemoryStore();
  const workspaceRoot = resolveWorkspaceRoot();
  const server = new McpServer({
    name: 'orgumented-project-memory',
    version: '0.1.0'
  });

  server.tool(
    'put_record',
    'Create or replace a typed coordination-memory record. This is advisory project memory only; sourceRefs are required.',
    {
      record: recordSchema
    },
    async ({ record }) => {
      const saved = store.putRecord(ensureRecordDefaults(record, store));
      return {
        content: [
          {
            type: 'text',
            text: `stored ${saved.recordType} ${saved.id} with validity ${saved.effectiveValidity}`
          }
        ],
        structuredContent: structured(saved)
      };
    }
  );

  server.tool(
    'append_event',
    'Append a note to an existing record. Use this for handoff breadcrumbs, verification follow-ups, and traceable working notes.',
    {
      recordId: z.string().min(1),
      summary: z.string().min(1),
      createdBy: z.string().min(1).default('codex'),
      sourceRefs: z.array(sourceRefSchema).default([])
    },
    async ({ recordId, summary, createdBy, sourceRefs }) => {
      const createdAt = nowIso();
      const note = {
        noteId: store.createNoteId(recordId, summary, createdAt),
        summary,
        createdAt,
        createdBy,
        sourceRefs
      };
      const updated = store.appendNote(recordId, note);
      if (!updated) {
        throw new Error(`record not found: ${recordId}`);
      }
      return {
        content: [
          {
            type: 'text',
            text: `appended note ${note.noteId} to ${recordId}`
          }
        ],
        structuredContent: structured(updated)
      };
    }
  );

  server.tool(
    'get_record',
    'Fetch a single materialized record by ID, including notes, links, and effective validity.',
    {
      recordId: z.string().min(1)
    },
    async ({ recordId }) => {
      const record = store.getRecord(recordId);
      if (!record) {
        throw new Error(`record not found: ${recordId}`);
      }
      return {
        content: [
          {
            type: 'text',
            text: `${record.id} ${record.recordType} validity=${record.effectiveValidity}`
          }
        ],
        structuredContent: structured(record)
      };
    }
  );

  server.tool(
    'list_records',
    'List materialized records with deterministic filters over record type, validity, scope, tags, and text.',
    {
      recordTypes: recordTypeSchema.optional(),
      validity: validitySchema.optional(),
      scopeArea: z.string().min(1).optional(),
      scopePath: z.string().min(1).optional(),
      tag: z.string().min(1).optional(),
      text: z.string().min(1).optional(),
      limit: z.number().int().min(1).max(200).default(20)
    },
    async ({ recordTypes, validity, scopeArea, scopePath, tag, text, limit }) => {
      const records = store.listRecords({
        recordTypes: recordTypes as ProjectMemoryRecordType[] | undefined,
        validity: validity as ProjectMemoryValidity[] | undefined,
        scopeArea,
        scopePath,
        tag,
        text,
        limit
      });
      return {
        content: [
          {
            type: 'text',
            text: `listed ${records.length} records`
          }
        ],
        structuredContent: structured({
          total: records.length,
          records
        })
      };
    }
  );

  server.tool(
    'mark_stale',
    'Persist a stale, superseded, expired, verified, or advisory validity override for a record.',
    {
      recordId: z.string().min(1),
      validity: z.enum(['advisory', 'verified', 'stale', 'superseded', 'expired']),
      reason: z.string().min(1),
      createdBy: z.string().min(1).default('codex')
    },
    async ({ recordId, validity, reason, createdBy }) => {
      const updated = store.markValidity(recordId, validity, reason, createdBy, nowIso());
      if (!updated) {
        throw new Error(`record not found: ${recordId}`);
      }
      return {
        content: [
          {
            type: 'text',
            text: `marked ${recordId} as ${updated.effectiveValidity}`
          }
        ],
        structuredContent: structured(updated)
      };
    }
  );

  server.tool(
    'link_records',
    'Create a typed relation between two records so work, decisions, verification, and risks stay connected.',
    {
      fromRecordId: z.string().min(1),
      toRecordId: z.string().min(1),
      relation: z.enum(['depends_on', 'implements', 'blocks', 'verifies', 'supersedes', 'relates_to']),
      createdBy: z.string().min(1).default('codex')
    },
    async ({ fromRecordId, toRecordId, relation, createdBy }) => {
      const createdAt = nowIso();
      const state = store.linkRecords({
        linkId: store.createLinkId(fromRecordId, toRecordId, relation, createdAt),
        relation,
        fromRecordId,
        toRecordId,
        createdAt,
        createdBy
      });
      return {
        content: [
          {
            type: 'text',
            text: `linked ${fromRecordId} ${relation} ${toRecordId}`
          }
        ],
        structuredContent: structured({
          totalRecords: state.records.length,
          totalLinks: state.links.length,
          link: state.links[0]
        })
      };
    }
  );

  server.tool(
    'summarize_scope',
    'Summarize one scope area with counts, stale records, pending work, and open risks.',
    {
      scopeArea: z.string().min(1),
      limit: z.number().int().min(1).max(50).default(10)
    },
    async ({ scopeArea, limit }) => {
      const summary = store.summarizeScope(scopeArea, limit);
      return {
        content: [
          {
            type: 'text',
            text: `scope ${scopeArea} has ${summary.totalRecords} records`
          }
        ],
        structuredContent: structured(summary)
      };
    }
  );

  server.tool(
    'prune_expired',
    'Persist expired validity for records whose TTL has elapsed.',
    {
      createdBy: z.string().min(1).default('system')
    },
    async ({ createdBy }) => {
      const expired = store.pruneExpired(nowIso(), createdBy);
      return {
        content: [
          {
            type: 'text',
            text: `expired ${expired.length} records`
          }
        ],
        structuredContent: structured({
          total: expired.length,
          records: expired
        })
      };
    }
  );

  server.tool(
    'seed_orgumented_baseline',
    'Seed Orgumented-specific repo-map records for the current core subsystems: API runtime, operator surfaces, desktop transition architecture, ontology, and planning governance.',
    {
      createdBy: z.string().min(1).default('codex')
    },
    async ({ createdBy }) => {
      const createdAt = nowIso();
      const records = createOrgumentedBaselineRecords(createdBy, createdAt, (recordType, title, timestamp) =>
        store.createRecordId(recordType, title, timestamp)
      ).map((record) => store.putRecord(record));

      return {
        content: [
          {
            type: 'text',
            text: `seeded ${records.length} Orgumented baseline records`
          }
        ],
        structuredContent: structured({
          total: records.length,
          records
        })
      };
    }
  );

  server.tool(
    'summarize_orgumented_waves',
    'Read Orgumented Wave A-G tasklists from docs/planning and return deterministic completion counts for tasks and exit gates.',
    {},
    async () => {
      const waves = summarizeOrgumentedWaves(workspaceRoot);
      return {
        content: [
          {
            type: 'text',
            text: `summarized ${waves.length} Orgumented waves`
          }
        ],
        structuredContent: structured({
          total: waves.length,
          waves
        })
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
