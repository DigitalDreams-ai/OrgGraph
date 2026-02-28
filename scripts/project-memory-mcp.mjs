#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), '..');
const mcpEntry = path.join(rootDir, 'packages', 'project-memory-mcp', 'dist', 'index.js');

if (!existsSync(mcpEntry)) {
  process.stderr.write(`project-memory MCP error: build artifact missing at ${mcpEntry}\n`);
  process.stderr.write('Run: pnpm --filter @orgumented/project-memory-mcp build\n');
  process.exit(1);
}

if (!process.env.ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT?.trim()) {
  process.env.ORGUMENTED_PROJECT_MEMORY_WORKSPACE_ROOT = rootDir;
}

await import(pathToFileURL(mcpEntry).href);
