const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-project-memory-'));
  const workspaceRoot = path.join(root, 'workspace');
  fs.mkdirSync(workspaceRoot, { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n", 'utf8');

  const trackedFile = path.join(workspaceRoot, 'docs', 'planning', 'memory.md');
  fs.mkdirSync(path.dirname(trackedFile), { recursive: true });
  fs.writeFileSync(trackedFile, '# initial\n', 'utf8');
  const baselineTime = new Date('2026-02-28T00:00:00.000Z');
  fs.utimesSync(trackedFile, baselineTime, baselineTime);

  const storePath = path.join(workspaceRoot, 'data', 'project-memory', 'events.jsonl');
  const { ProjectMemoryStore } = require('../dist/store.js');
  const store = new ProjectMemoryStore(storePath, workspaceRoot);

  const createdAt = '2026-02-28T00:00:00.000Z';
  const recordId = store.createRecordId('work_item', 'Add project memory', createdAt);
  const workItem = store.putRecord({
    id: recordId,
    recordType: 'work_item',
    title: 'Add project memory',
    summary: 'Track project-wide implementation state.',
    createdAt,
    updatedAt: createdAt,
    createdBy: 'codex',
    sourceRefs: [{ kind: 'file', ref: 'docs/planning/memory.md' }],
    confidence: 'high',
    validity: 'verified',
    scope: {
      area: 'project-memory',
      paths: ['packages/project-memory-mcp'],
      tags: ['mcp', 'coordination']
    },
    tags: ['mcp', 'coordination'],
    status: 'in_progress',
    owner: 'codex',
    scopePaths: ['packages/project-memory-mcp'],
    relatedDocs: ['docs/planning/memory.md'],
    relatedIssues: []
  });
  assert.equal(workItem.id, recordId);
  assert.equal(workItem.effectiveValidity, 'verified');

  const noteCreatedAt = '2026-02-28T00:01:00.000Z';
  const updated = store.appendNote(recordId, {
    noteId: store.createNoteId(recordId, 'Started wiring the MCP tools.', noteCreatedAt),
    summary: 'Started wiring the MCP tools.',
    createdAt: noteCreatedAt,
    createdBy: 'codex',
    sourceRefs: [{ kind: 'doc', ref: 'docs/planning/memory.md' }]
  });
  assert.ok(updated);
  assert.equal(updated.notes.length, 1);

  const riskCreatedAt = '2026-02-28T00:02:00.000Z';
  const riskId = store.createRecordId('risk_item', 'Stale coordination records', riskCreatedAt);
  store.putRecord({
    id: riskId,
    recordType: 'risk_item',
    title: 'Stale coordination records',
    summary: 'Records can drift after source files change.',
    createdAt: riskCreatedAt,
    updatedAt: riskCreatedAt,
    createdBy: 'codex',
    sourceRefs: [{ kind: 'doc', ref: 'docs/planning/memory.md' }],
    confidence: 'medium',
    validity: 'advisory',
    scope: {
      area: 'project-memory',
      paths: ['packages/project-memory-mcp'],
      tags: ['risk']
    },
    tags: ['risk'],
    severity: 'high',
    status: 'open',
    trigger: 'Source files change after verification.',
    mitigation: 'Auto-degrade validity to stale.'
  });

  const linkCreatedAt = '2026-02-28T00:03:00.000Z';
  store.linkRecords({
    linkId: store.createLinkId(recordId, riskId, 'blocks', linkCreatedAt),
    relation: 'blocks',
    fromRecordId: recordId,
    toRecordId: riskId,
    createdAt: linkCreatedAt,
    createdBy: 'codex'
  });

  const summary = store.summarizeScope('project-memory', 10);
  assert.equal(summary.totalRecords, 2);
  assert.equal(summary.openRiskIds.length, 1);
  assert.equal(summary.pendingWorkIds.length, 1);

  fs.writeFileSync(trackedFile, '# changed\n', 'utf8');
  const modifiedTime = new Date('2026-02-28T00:05:00.000Z');
  fs.utimesSync(trackedFile, modifiedTime, modifiedTime);
  const stale = store.getRecord(recordId);
  assert.ok(stale);
  assert.equal(stale.effectiveValidity, 'stale');
  assert.match(stale.invalidationReasons[0], /source_modified:/);

  const expiringId = store.createRecordId('runtime_observation', 'Docker health', '2026-02-27T00:00:00.000Z');
  store.putRecord({
    id: expiringId,
    recordType: 'runtime_observation',
    title: 'Docker health',
    summary: 'Observed unhealthy docker discovery root.',
    createdAt: '2026-02-27T00:00:00.000Z',
    updatedAt: '2026-02-27T00:00:00.000Z',
    createdBy: 'codex',
    sourceRefs: [{ kind: 'service', ref: 'docker' }],
    confidence: 'medium',
    validity: 'advisory',
    scope: {
      area: 'project-memory',
      paths: ['docker'],
      tags: ['runtime']
    },
    tags: ['runtime'],
    service: 'docker',
    observation: 'Discovery root mismatch when cwd is not explicit.',
    ttlSeconds: 1
  });

  const pruned = store.pruneExpired('2026-02-28T00:10:00.000Z', 'system');
  assert.equal(pruned.length, 1);
  assert.equal(pruned[0].effectiveValidity, 'expired');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('project memory store test passed');
}

run();
