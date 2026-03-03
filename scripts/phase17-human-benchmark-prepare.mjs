import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const repoRoot = path.resolve(import.meta.dirname, '..');
const defaultProxyArtifactPath = path.join(repoRoot, 'logs', 'high-risk-review-benchmark.json');
const defaultOutJson = path.join(repoRoot, 'logs', 'high-risk-review-human-capture-template.json');
const defaultOutMd = path.join(repoRoot, 'logs', 'high-risk-review-human-capture-template.md');
const defaultQuery = 'Should we approve changing Opportunity.StageName for jane@example.com?';

const helpText = `Usage:
  pnpm phase17:benchmark:human:prepare [options]

Optional:
  --operator "<name>"                Prefill operator name
  --date <YYYY-MM-DD>                Defaults to today in local time
  --query "<text>"                   Defaults to the benchmark scenario query
  --proxy-artifact <path>            Defaults to logs/high-risk-review-benchmark.json
  --out-json <path>                  Defaults to logs/high-risk-review-human-capture-template.json
  --out-md <path>                    Defaults to logs/high-risk-review-human-capture-template.md

Example:
  pnpm phase17:benchmark:human:prepare -- --operator "Sean"
`;

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
    if (key === 'help') {
      args.help = true;
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

function todayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function readJson(filePath) {
  const body = await fs.readFile(filePath, 'utf8');
  return JSON.parse(body);
}

async function sha256File(filePath) {
  const body = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(body).digest('hex');
}

function createTemplateSignature(template) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        query: template.query,
        proxyArtifactPath: template.proxyArtifactPath,
        proxyArtifactHash: template.proxyArtifactHash,
        baseline: template.baseline,
        reviewPacket: template.reviewPacket,
        proxyGuards: template.proxyGuards
      })
    )
    .digest('hex');
}

function buildMarkdown(template) {
  const thresholdLines = [
    `- repeated ask stable: ${template.thresholds.repeatedAskStableRequired ? 'required' : 'not required'}`,
    `- replay parity: ${template.thresholds.replayParityRequired ? 'required' : 'not required'}`,
    `- proof identity stable: ${template.thresholds.proofIdentityStableRequired ? 'required' : 'not required'}`,
    `- time improvement ratio target: >= ${template.thresholds.timeImprovementRatioTarget}`,
    `- evidence-step delta target: >= ${template.thresholds.evidenceStepDeltaTarget}`,
    `- workspace-switch delta target: >= ${template.thresholds.workspaceSwitchDeltaTarget}`,
    `- raw JSON eliminated: required`,
    `- confidence not worse than baseline: required`
  ].join('\n');

  return `# High-Risk Review Human Capture Template

Date:
- ${template.runDate}
Operator:
- ${template.operator ?? '<fill-in>'}

Scenario:
- \`${template.query}\`

Proxy artifact:
- \`${template.proxyArtifactPath}\`
- \`sha256:${template.proxyArtifactHash}\`

Capture template:
- version: \`${template.captureTemplateVersion}\`
- signature: \`${template.captureTemplateSignature}\`

Proof and replay anchors:
- baseline proofId: \`${template.baseline.proofId ?? ''}\`
- baseline replayToken: \`${template.baseline.replayToken ?? ''}\`
- review proofId: \`${template.reviewPacket.proofId ?? ''}\`
- review replayToken: \`${template.reviewPacket.replayToken ?? ''}\`

## What To Capture

Fill the following values while exercising the workflow manually in the grounded desktop app.

| Path | Time To Trusted Answer (ms) | Evidence Steps | Workspace Switches | Raw JSON Needed | Confidence 1-5 | Notes |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| baseline | <fill-in> | <fill-in> | <fill-in> | yes/no | <fill-in> | |
| review-packet | <fill-in> | <fill-in> | <fill-in> | yes/no | <fill-in> | |

## Pass Thresholds

${thresholdLines}

## Current Proxy Guard State

- repeated ask stable: ${template.proxyGuards.repeatedAskStable ? 'pass' : 'fail'}
- replay parity: ${template.proxyGuards.replayParity ? 'pass' : 'fail'}
- proof identity stable: ${template.proxyGuards.proofIdentityStable ? 'pass' : 'fail'}

## Submit With

\`\`\`powershell
pnpm phase17:benchmark:human -- --capture-template "${template.captureTemplatePath}" --operator "${template.operator ?? '<name>'}" --baseline-time-ms <ms> --baseline-evidence-steps <n> --baseline-workspace-switches <n> --baseline-raw-json yes --baseline-confidence <1-5> --review-time-ms <ms> --review-evidence-steps <n> --review-workspace-switches <n> --review-raw-json no --review-confidence <1-5> --notes "<observation>"
\`\`\`
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(helpText);
    return;
  }

  const proxyArtifactPath = path.resolve(args['proxy-artifact'] ?? defaultProxyArtifactPath);
  const outJsonPath = path.resolve(args['out-json'] ?? defaultOutJson);
  const outMdPath = path.resolve(args['out-md'] ?? defaultOutMd);
  const proxyArtifact = await readJson(proxyArtifactPath);
  const proxyArtifactHash = await sha256File(proxyArtifactPath);

  const template = {
    generatedAt: new Date().toISOString(),
    captureTemplateVersion: 1,
    runDate: args.date ?? todayIsoDate(),
    operator: args.operator ?? null,
    query: args.query ?? defaultQuery,
    captureTemplatePath: path.relative(repoRoot, outJsonPath).replaceAll('\\', '/'),
    proxyArtifactPath: path.relative(repoRoot, proxyArtifactPath).replaceAll('\\', '/'),
    proxyArtifactHash,
    baseline: {
      proofId: proxyArtifact?.baseline?.proofId ?? null,
      replayToken: proxyArtifact?.baseline?.askSummary?.replayToken ?? null
    },
    reviewPacket: {
      proofId: proxyArtifact?.reviewPacket?.ask?.proofId ?? null,
      replayToken: proxyArtifact?.reviewPacket?.ask?.replayToken ?? null
    },
    proxyGuards: {
      repeatedAskStable: Boolean(proxyArtifact?.reviewPacket?.repeatedAskStable),
      replayParity:
        Boolean(proxyArtifact?.reviewPacket?.replay?.matched) &&
        Boolean(proxyArtifact?.reviewPacket?.replay?.corePayloadMatched) &&
        Boolean(proxyArtifact?.reviewPacket?.replay?.metricsMatched),
      proofIdentityStable:
        proxyArtifact?.reviewPacket?.ask?.proofId === proxyArtifact?.reviewPacket?.proofLookup?.proofId &&
        proxyArtifact?.reviewPacket?.ask?.replayToken === proxyArtifact?.reviewPacket?.proofLookup?.replayToken
    },
    thresholds: {
      repeatedAskStableRequired: true,
      replayParityRequired: true,
      proofIdentityStableRequired: true,
      timeImprovementRatioTarget: 0.4,
      evidenceStepDeltaTarget: 2,
      workspaceSwitchDeltaTarget: 1,
      rawJsonEliminatedRequired: true,
      confidenceNotWorseRequired: true
    }
  };
  template.captureTemplateSignature = createTemplateSignature(template);

  await fs.mkdir(path.dirname(outJsonPath), { recursive: true });
  await fs.mkdir(path.dirname(outMdPath), { recursive: true });
  await fs.writeFile(outJsonPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  await fs.writeFile(outMdPath, buildMarkdown(template), 'utf8');
  process.stdout.write(`${JSON.stringify(template, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  console.error('');
  console.error(helpText);
  process.exit(1);
});
