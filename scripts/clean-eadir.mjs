#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

walk(rootDir);

function walk(dir) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (!entry.isDirectory()) {
      continue;
    }

    if (entry.name === '@eaDir') {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
      } catch {
        // Ignore unreadable paths so cleanup never blocks desktop builds.
      }
      continue;
    }

    walk(fullPath);
  }
}
