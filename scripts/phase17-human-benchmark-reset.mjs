import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const defaultLogsDir = path.join(repoRoot, 'logs');
const defaultArchiveRoot = path.join(defaultLogsDir, 'archive', 'phase17-human-benchmark');

const helpText = `Usage:
  pnpm phase17:benchmark:human:reset [options]

Optional:
  --logs-dir <path>                 Defaults to logs/
  --archive-dir <path>              Defaults to logs/archive/phase17-human-benchmark/<timestamp>
  --preserve-proxy                  Leave logs/high-risk-review-benchmark.json in place
  --dry-run                         Report what would be archived without moving files
  --help

What it does:
  - archives existing Phase 17 benchmark artifacts before a real human run
  - prevents synthetic or test artifacts from being mixed into the first canonical human capture
  - leaves unrelated log files untouched
`;

const archivePrefixes = [
  'high-risk-review-benchmark',
  'high-risk-review-human-benchmark',
  'high-risk-review-human-capture-template'
];

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--') {
      continue;
    }
    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const key = token.slice(2);
    if (key === 'help' || key === 'dry-run' || key === 'preserve-proxy') {
      args[key] = true;
      continue;
    }

    const value = argv[index + 1];
    if (typeof value === 'undefined' || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    args[key] = value;
    index += 1;
  }

  return args;
}

function timestampToken() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  const hour = `${now.getHours()}`.padStart(2, '0');
  const minute = `${now.getMinutes()}`.padStart(2, '0');
  const second = `${now.getSeconds()}`.padStart(2, '0');
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function relativePath(filePath) {
  return path.relative(repoRoot, filePath).replaceAll('\\', '/');
}

function shouldArchive(name, preserveProxy) {
  if (preserveProxy && name === 'high-risk-review-benchmark.json') {
    return false;
  }
  return archivePrefixes.some((prefix) => name.startsWith(prefix));
}

async function listPhase17Artifacts(logsDir, preserveProxy) {
  const entries = await fs.readdir(logsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && shouldArchive(entry.name, preserveProxy))
    .map((entry) => path.join(logsDir, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function archiveFiles(files, archiveDir, dryRun) {
  const archived = [];

  for (const filePath of files) {
    const destinationPath = path.join(archiveDir, path.basename(filePath));
    archived.push({
      from: relativePath(filePath),
      to: relativePath(destinationPath)
    });

    if (!dryRun) {
      await fs.rename(filePath, destinationPath);
    }
  }

  return archived;
}

function buildSummary({ logsDir, archiveDir, archived, dryRun, preserveProxy }) {
  return {
    logsDir: relativePath(logsDir),
    archiveDir: relativePath(archiveDir),
    dryRun,
    preserveProxy,
    archivedCount: archived.length,
    archived
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(helpText);
    return;
  }

  const logsDir = path.resolve(args['logs-dir'] ?? defaultLogsDir);
  const archiveDir = path.resolve(
    args['archive-dir'] ?? path.join(defaultArchiveRoot, timestampToken())
  );
  const dryRun = Boolean(args['dry-run']);
  const preserveProxy = Boolean(args['preserve-proxy']);

  const files = await listPhase17Artifacts(logsDir, preserveProxy);
  if (files.length === 0) {
    process.stdout.write(
      `${JSON.stringify(
        buildSummary({
          logsDir,
          archiveDir,
          dryRun,
          preserveProxy,
          archived: []
        }),
        null,
        2
      )}\n`
    );
    process.stdout.write('\nNo Phase 17 benchmark artifacts needed archiving.\n');
    return;
  }

  if (!dryRun) {
    await ensureDirectory(archiveDir);
  }

  const archived = await archiveFiles(files, archiveDir, dryRun);
  process.stdout.write(
    `${JSON.stringify(
      buildSummary({
        logsDir,
        archiveDir,
        dryRun,
        preserveProxy,
        archived
      }),
      null,
      2
    )}\n`
  );

  process.stdout.write('\n');
  process.stdout.write(
    dryRun
      ? 'Dry run only. Re-run without --dry-run to archive these artifacts before the real human capture.\n'
      : 'Phase 17 artifacts archived. Start the next real capture with:\n'
  );
  if (!dryRun) {
    process.stdout.write('\n');
    process.stdout.write('pnpm phase17:benchmark:human:session -- --operator "<name>"\n');
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(helpText);
  process.exit(1);
});
