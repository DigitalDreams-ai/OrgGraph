const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function run() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-project-memory-mcp-'));
  const workspaceRoot = path.join(root, 'workspace');
  fs.mkdirSync(workspaceRoot, { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, 'pnpm-workspace.yaml'), "packages:\n  - 'packages/*'\n", 'utf8');

  const sourceFile = path.join(workspaceRoot, 'docs', 'planning', 'memory-smoke.md');
  fs.mkdirSync(path.dirname(sourceFile), { recursive: true });
  fs.writeFileSync(sourceFile, '# smoke\n', 'utf8');
  const baselineTime = new Date('2026-02-28T00:00:00.000Z');
  fs.utimesSync(sourceFile, baselineTime, baselineTime);
  const v2Plan = path.join(workspaceRoot, 'docs', 'planning', 'v2', 'ORGUMENTED_V2_WAVES_100_PLAN.md');
  fs.mkdirSync(path.dirname(v2Plan), { recursive: true });
  fs.writeFileSync(
    v2Plan,
    [
      '# Orgumented v2 100% Completion Plan',
      '',
      '## Wave Progress Snapshot',
      '',
      '| Wave | Theme | Primary IDs | Status | Next Gate |',
      '|---|---|---|---|---|',
      '| wave1 | baseline lock and triage | B001 | Complete | Maintain drift-free docs |',
      '| wave2 | runtime convergence | B002 | In Progress | Runtime parity proof |',
      '| wave3 | sessions and toolchain reliability | B003 | Complete | Session restore proof |',
      '| wave4 | org browser explorer | B004 | Complete | Browser parity hold |',
      '| wave5 | retrieve -> refresh handoff | B005 | In Progress | Real-org handoff proof |',
      '| wave6 | ask planner/compiler depth | B006 | In Progress | Semantic-frame depth |',
      '',
      '## wave1 - Baseline Lock And Triage'
    ].join('\n'),
    'utf8'
  );
  fs.utimesSync(v2Plan, baselineTime, baselineTime);

  const env = {
    ...process.env,
    ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT: workspaceRoot,
    ORGUMENTED_PROJECT_MEMORY_PATH: 'data/project-memory/smoke-events.jsonl'
  };

  const client = new Client(
    { name: 'project-memory-smoke', version: '0.1.0' },
    { capabilities: {} }
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(__dirname, '..', '..', '..', 'scripts', 'project-memory-mcp.mjs')],
    cwd: path.join(__dirname, '..', '..', '..'),
    env,
    stderr: 'pipe'
  });

  await client.connect(transport);

  try {
    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'put_record'));
    assert.ok(tools.tools.some((tool) => tool.name === 'summarize_scope'));
    assert.ok(tools.tools.some((tool) => tool.name === 'seed_orgumented_baseline'));
    assert.ok(tools.tools.some((tool) => tool.name === 'summarize_orgumented_waves'));

    const put = await client.callTool({
      name: 'put_record',
      arguments: {
        record: {
          recordType: 'repo_map',
          title: 'Project memory MCP package',
          summary: 'Provides coordination memory tools over stdio.',
          createdAt: '2026-02-28T00:00:00.000Z',
          updatedAt: '2026-02-28T00:00:00.000Z',
          createdBy: 'codex',
          sourceRefs: [{ kind: 'doc', ref: 'docs/planning/memory-smoke.md' }],
          confidence: 'high',
          validity: 'verified',
          scope: {
            area: 'project-memory',
            paths: ['packages/project-memory-mcp'],
            tags: ['mcp']
          },
          tags: ['mcp'],
          subsystem: 'project-memory-mcp',
          entryPoints: ['src/index.ts'],
          keyPaths: ['src/store.ts'],
          dependencies: ['@modelcontextprotocol/sdk', 'zod'],
          verificationCommands: ['pnpm --filter @orgumented/project-memory-mcp test'],
          docRefs: ['docs/planning/memory-smoke.md']
        }
      }
    });
    assert.ok(!put.isError);
    assert.equal(put.structuredContent.recordType, 'repo_map');

    const summary = await client.callTool({
      name: 'summarize_scope',
      arguments: {
        scopeArea: 'project-memory',
        limit: 10
      }
    });
    assert.ok(!summary.isError);
    assert.equal(summary.structuredContent.scopeArea, 'project-memory');
    assert.equal(summary.structuredContent.totalRecords, 1);

    const seeded = await client.callTool({
      name: 'seed_orgumented_baseline',
      arguments: {
        createdBy: 'codex'
      }
    });
    assert.ok(!seeded.isError);
    assert.equal(seeded.structuredContent.total, 5);

    const waves = await client.callTool({
      name: 'summarize_orgumented_waves',
      arguments: {}
    });
    assert.ok(!waves.isError);
    assert.equal(waves.structuredContent.total, 6);
    assert.equal(waves.structuredContent.waves[0].wave, 'wave1');
    assert.equal(waves.structuredContent.waves[0].status, 'Complete');
    assert.equal(waves.structuredContent.waves[1].nextGate, 'Runtime parity proof');
  } finally {
    await client.close();
    fs.rmSync(root, { recursive: true, force: true });
  }

  console.log('project memory mcp smoke test passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
