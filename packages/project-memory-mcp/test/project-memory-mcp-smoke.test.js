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
  for (const wave of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
    const tasklist = path.join(workspaceRoot, 'docs', 'planning', `WAVE_${wave}_TASKLIST.md`);
    fs.writeFileSync(
      tasklist,
      `# Wave ${wave} Tasklist\n\n## Tasks\n- [x] baseline\n- [ ] remaining\n\n## Exit Gates\n- [ ] pending\n`,
      'utf8'
    );
    fs.utimesSync(tasklist, baselineTime, baselineTime);
  }

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
    command: path.join(__dirname, '..', '..', '..', 'scripts', 'project-memory-mcp.sh'),
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
    assert.equal(waves.structuredContent.total, 7);
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
