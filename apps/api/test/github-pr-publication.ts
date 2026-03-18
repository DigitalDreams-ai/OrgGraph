import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';

async function main(): Promise<void> {
  const tempDir = mkdtempSync(join(tmpdir(), 'orgumented-github-pr-'));
  const proofStorePath = join(tempDir, 'ask-proofs.jsonl');
  const previousEnv = {
    GITHUB_INTEGRATION_ENABLED: process.env.GITHUB_INTEGRATION_ENABLED,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_API_URL: process.env.GITHUB_API_URL,
    GITHUB_REPO_OWNER: process.env.GITHUB_REPO_OWNER,
    GITHUB_REPO_NAME: process.env.GITHUB_REPO_NAME,
    ASK_PROOF_STORE_PATH: process.env.ASK_PROOF_STORE_PATH
  };

  const comments = new Map<number, { id: number; body: string; html_url: string }>();
  let nextCommentId = 7000;

  const githubServer = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
      const bodyText = Buffer.concat(chunks).toString('utf8');
      const json = bodyText.length > 0 ? JSON.parse(bodyText) : undefined;

      assert.equal(req.headers.authorization, 'Bearer test-github-token');
      assert.equal(req.headers['user-agent'], 'Orgumented');

      if (req.method === 'GET' && url.pathname === '/repos/acme/demo/issues/42/comments') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify([...comments.values()]));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/repos/acme/demo/issues/42/comments') {
        const id = nextCommentId++;
        const comment = {
          id,
          body: json.body as string,
          html_url: `http://example.test/comments/${id}`
        };
        comments.set(id, comment);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(comment));
        return;
      }

      const patchMatch = req.method === 'PATCH' ? url.pathname.match(/^\/repos\/acme\/demo\/issues\/comments\/(\d+)$/) : null;
      if (patchMatch) {
        const id = Number(patchMatch[1]);
        const existing = comments.get(id);
        assert.ok(existing, `expected existing comment ${id}`);
        const updated = {
          id,
          body: json.body as string,
          html_url: existing.html_url
        };
        comments.set(id, updated);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(updated));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `${req.method} ${url.pathname}` }));
    });
  });

  try {
    await new Promise<void>((resolve) => githubServer.listen(0, '127.0.0.1', () => resolve()));
    const githubAddress = githubServer.address();
    if (!githubAddress || typeof githubAddress === 'string') {
      throw new Error('Failed to bind fake GitHub server');
    }

    process.env.GITHUB_INTEGRATION_ENABLED = 'true';
    process.env.GITHUB_TOKEN = 'test-github-token';
    process.env.GITHUB_API_URL = `http://127.0.0.1:${githubAddress.port}`;
    process.env.GITHUB_REPO_OWNER = 'acme';
    process.env.GITHUB_REPO_NAME = 'demo';
    process.env.ASK_PROOF_STORE_PATH = proofStorePath;

    writeFileSync(
      proofStorePath,
      `${JSON.stringify({
        proofId: 'proof-review-1',
        replayToken: 'trace-review-1',
        generatedAt: '2026-03-18T00:00:00.000Z',
        snapshotId: 'snapshot-review-1',
        policyId: 'policy-review-1',
        traceLevel: 'standard',
        request: {
          query: 'Should we approve changing Opportunity.StageName for jane@example.com?'
        },
        plan: {},
        operatorsExecuted: [],
        rejectedBranches: [],
        derivationEdges: [],
        citationIds: ['cit-1', 'cit-2'],
        trustLevel: 'conditional',
        metrics: {
          groundingScore: 0.95,
          constraintSatisfaction: 0.94,
          ambiguityScore: 0.12,
          stabilityScore: 0.91,
          deltaNovelty: 0.11,
          riskSurfaceScore: 0.82
        },
        responseSummary: {
          answer: 'Do not approve yet.',
          deterministicAnswer: 'Do not approve yet.',
          confidence: 0.94,
          mode: 'deterministic',
          corePayloadFingerprint: 'core-fingerprint-1',
          corePayloadJson: JSON.stringify({
            deterministicAnswer: 'Do not approve yet.',
            mode: 'deterministic',
            plan: {},
            policyId: 'policy-review-1',
            trustLevel: 'conditional',
            metrics: {
              groundingScore: 0.95,
              constraintSatisfaction: 0.94,
              ambiguityScore: 0.12,
              stabilityScore: 0.91,
              deltaNovelty: 0.11,
              riskSurfaceScore: 0.82
            },
            decisionPacket: {
              kind: 'high_risk_change_review',
              focus: 'approval_decision',
              targetLabel: 'Opportunity.StageName',
              targetType: 'field',
              summary: 'Review before approval.',
              recommendation: {
                verdict: 'do_not_approve_yet',
                summary:
                  'Do not approve yet. Resolve: jane@example.com has no deterministic permission grant path for Opportunity.StageName.'
              },
              riskScore: 84,
              riskLevel: 'high',
              evidenceCoverage: {
                citationCount: 2,
                hasPermissionPaths: false,
                hasAutomationCoverage: true,
                hasImpactPaths: true
              },
              topRiskDrivers: ['No deterministic permission grant path', 'Automation still updates Opportunity.StageName'],
              permissionImpact: {
                user: 'jane@example.com',
                summary: 'No deterministic grant path found.',
                granted: false,
                pathCount: 0,
                principalCount: 0,
                warnings: ['User mapping still unresolved']
              },
              automationImpact: {
                summary: '2 automations update Opportunity.StageName.',
                automationCount: 2,
                topAutomationNames: ['OpportunityStageSync', 'SalesCoachingGuard']
              },
              changeImpact: {
                summary: '3 impact paths remain active.',
                impactPathCount: 3,
                topImpactedSources: ['flows/OpportunityStageSync.flow-meta.xml']
              },
              topCitationSources: ['flows/OpportunityStageSync.flow-meta.xml', 'objects/Opportunity.object-meta.xml'],
              evidenceGaps: ['Resolve missing permission grant path for jane@example.com'],
              nextActions: [
                {
                  label: 'Diagnose user mapping',
                  rationale: 'Confirm the user-to-principal map before approval.'
                },
                {
                  label: 'Inspect citation sources',
                  rationale: 'Verify the flow and object evidence directly.'
                }
              ]
            }
          })
        }
      })}\n`,
      'utf8'
    );

    const app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') {
      throw new Error('Failed to bind API test server');
    }

    try {
      const createResponse = await fetch(`http://127.0.0.1:${address.port}/github/pr/comment-review-packet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pullNumber: 42,
          proofId: 'proof-review-1'
        })
      });
      assert.equal(createResponse.status, 201);
      const created = (await createResponse.json()) as {
        publicationMode: string;
        commentId: number;
        proofId: string;
        replayToken: string;
      };
      assert.equal(created.publicationMode, 'created');
      assert.equal(created.proofId, 'proof-review-1');
      assert.equal(created.replayToken, 'trace-review-1');

      const storedCreated = comments.get(created.commentId);
      assert.ok(storedCreated, 'expected created GitHub comment');
      assert.match(storedCreated.body, /Orgumented Decision Packet/);
      assert.match(storedCreated.body, /proof-review-1/);
      assert.match(storedCreated.body, /trace-review-1/);
      assert.match(storedCreated.body, /do_not_approve_yet/);

      const updateResponse = await fetch(`http://127.0.0.1:${address.port}/github/pr/comment-review-packet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pullNumber: 42,
          proofId: 'proof-review-1',
          replayToken: 'trace-review-1'
        })
      });
      assert.equal(updateResponse.status, 201);
      const updated = (await updateResponse.json()) as {
        publicationMode: string;
        commentId: number;
      };
      assert.equal(updated.publicationMode, 'updated');
      assert.equal(updated.commentId, created.commentId);
      assert.equal(comments.size, 1, 'expected idempotent single comment for the same proof');
    } finally {
      await app.close();
    }
  } finally {
    process.env.GITHUB_INTEGRATION_ENABLED = previousEnv.GITHUB_INTEGRATION_ENABLED;
    process.env.GITHUB_TOKEN = previousEnv.GITHUB_TOKEN;
    process.env.GITHUB_API_URL = previousEnv.GITHUB_API_URL;
    process.env.GITHUB_REPO_OWNER = previousEnv.GITHUB_REPO_OWNER;
    process.env.GITHUB_REPO_NAME = previousEnv.GITHUB_REPO_NAME;
    process.env.ASK_PROOF_STORE_PATH = previousEnv.ASK_PROOF_STORE_PATH;
    await new Promise<void>((resolve) => githubServer.close(() => resolve()));
    rmSync(tempDir, { recursive: true, force: true });
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
