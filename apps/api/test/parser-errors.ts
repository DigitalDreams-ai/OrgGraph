import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PermissionsParseError, PermissionsParserService } from '../src/modules/ingestion/permissions-parser.service';

function run(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'orgumented-parser-'));
  const profilesPath = path.join(root, 'profiles');
  fs.mkdirSync(profilesPath, { recursive: true });

  const malformedPath = path.join(profilesPath, 'Broken.profile-meta.xml');
  fs.writeFileSync(
    malformedPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<NotPermissionSet><objectPermissions><object>Case</object></objectPermissions></NotPermissionSet>`,
    'utf8'
  );

  const parser = new PermissionsParserService();

  let caught: unknown;
  try {
    parser.parseFromFixtures(root);
  } catch (error) {
    caught = error;
  }

  assert.ok(caught instanceof PermissionsParseError, 'Expected PermissionsParseError for malformed XML');
  const message = (caught as Error).message;
  assert.match(message, /Broken\.profile-meta\.xml/, 'error should include failing filename');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('parser error test passed');
}

run();
