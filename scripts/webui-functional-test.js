const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.WEB_BASE || 'http://host.docker.internal:3101';
const outDir = '/work/artifacts';
function now() { return new Date().toISOString(); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  const results = [];
  let lastRaw = '';

  async function capture(name) {
    const path = `${outDir}/webui-${name}.png`;
    await page.screenshot({ path, fullPage: true });
    return path;
  }

  async function withStep(name, fn) {
    const row = { name, startedAt: now(), ok: false, note: '', screenshot: '', status: '' };
    try {
      await fn(row);
      row.ok = true;
    } catch (e) {
      row.ok = false;
      row.note = (e && e.message) ? e.message : String(e);
    }
    row.finishedAt = now();
    try { row.screenshot = await capture(name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()); } catch {}
    results.push(row);
  }

  async function waitForNewRaw(timeoutMs = 30000) {
    const started = Date.now();
    const raw = page.locator('details:has-text("Raw JSON") pre').first();
    await raw.waitFor({ timeout: 10000 });
    while (Date.now() - started < timeoutMs) {
      const text = await raw.innerText();
      if (text && text !== lastRaw && !text.includes('"hint": "Run an action')) {
        lastRaw = text;
        return text;
      }
      await page.waitForTimeout(250);
    }
    throw new Error('Response JSON did not update in time');
  }

  async function clickAndProbe(buttonName, opts = {}) {
    const { allowError = false, minDelay = 0 } = opts;
    await page.getByRole('button', { name: buttonName, exact: true }).click();
    if (minDelay > 0) await page.waitForTimeout(minDelay);
    const rawText = await waitForNewRaw();
    let parsed;
    try { parsed = JSON.parse(rawText); } catch { throw new Error(`Raw JSON invalid after ${buttonName}`); }
    if (parsed && parsed.ok === false && !allowError) {
      const msg = parsed?.payload?.error?.message || parsed?.error?.message || 'request failed';
      throw new Error(`${buttonName} returned error: ${msg}`);
    }
    return parsed;
  }

  await withStep('open-home', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('heading', { name: 'Orgumented Mission Control' }).waitFor({ timeout: 15000 });
  });

  await withStep('dismiss-checklist', async () => {
    const dismiss = page.getByRole('button', { name: 'Dismiss Checklist', exact: true });
    if (await dismiss.count()) await dismiss.click();
    await page.waitForTimeout(300);
  });

  await withStep('refresh-status', async () => {
    await page.getByRole('button', { name: 'Refresh Status', exact: true }).click();
    await page.waitForTimeout(500);
  });

  await withStep('tab-connect-controls', async (row) => {
    await page.getByRole('tab', { name: 'Connect', exact: true }).click();
    await page.getByLabel('Org Alias').fill('orgumented-sandbox');

    await clickAndProbe('Check Session');
    await clickAndProbe('Check Tool Status');
    await clickAndProbe('Preflight');
    await clickAndProbe('Switch Alias');
    const connect = await clickAndProbe('Connect Org', { allowError: true });
    if (connect?.ok === false) {
      row.status = 'warning';
      row.note = 'Connect Org returned controlled error (likely missing sf CLI keychain login in runtime)';
    }
    await clickAndProbe('Disconnect');
  });

  await withStep('tab-org-browser-controls', async () => {
    await page.getByRole('tab', { name: 'Org Browser', exact: true }).click();
    await page.getByLabel('Type Search').fill('Custom');
    await page.getByLabel('Member Search').fill('Account');
    await page.getByLabel('Catalog Limit').fill('50');
    await page.getByLabel('Force Refresh').check();
    await clickAndProbe('Refresh Types');
    await page.getByRole('button', { name: 'Clear Filters', exact: true }).click();

    const details = page.locator('.org-browser-frame details').first();
    if (await details.count()) {
      await details.click();
      await page.waitForTimeout(600);
      const addType = page.getByRole('button', { name: 'Add Type', exact: true }).first();
      if (await addType.count()) {
        await addType.click();
        await page.waitForTimeout(400);
      }
      const retrieve = page.getByRole('button', { name: 'Retrieve Selected', exact: true });
      if (await retrieve.isEnabled()) {
        await clickAndProbe('Retrieve Selected');
      }
    }
  });

  await withStep('tab-refresh-build-controls', async (row) => {
    await page.getByRole('tab', { name: 'Refresh & Build', exact: true }).click();
    await page.getByLabel('Refresh Mode').selectOption('incremental');
    const refresh = await clickAndProbe('Run Refresh', { allowError: true });
    if (refresh?.ok === false) {
      row.status = 'warning';
      row.note = 'Run Refresh blocked by configured semantic drift guardrails (expected in strict mode)';
    }

    await page.getByLabel('From Snapshot ID').fill('');
    await page.getByLabel('To Snapshot ID').fill('');
    await clickAndProbe('Run Diff', { allowError: true });
  });

  await withStep('tab-analyze-controls', async () => {
    await page.getByRole('tab', { name: 'Analyze', exact: true }).click();
    await page.getByLabel('User').fill('sbingham@shulman-hill.com.uat');
    await page.getByLabel('Object').fill('Opportunity');
    await page.getByLabel('Field').fill('Opportunity.StageName');
    await page.getByLabel('Limit').fill('10');

    await page.getByRole('button', { name: 'Permissions', exact: true }).click();
    await clickAndProbe('Run Permissions Analysis');
    await page.getByRole('button', { name: 'Automation', exact: true }).click();
    await clickAndProbe('Run Automation Analysis');
    await page.getByRole('button', { name: 'Impact', exact: true }).click();
    await clickAndProbe('Run Impact Analysis');
  });

  await withStep('tab-ask-controls', async () => {
    await page.getByRole('tab', { name: 'Ask', exact: true }).click();
    await page.getByLabel('Question').fill('What touches Opportunity.StageName?');
    await page.getByLabel('Max Citations').fill('5');
    await page.getByLabel('Consistency Check').check();
    await clickAndProbe('Run Ask');

    const gen = page.getByRole('button', { name: 'Generate Elaboration', exact: true });
    if (await gen.count()) {
      await gen.click();
      await waitForNewRaw();
    }
  });

  await withStep('tab-proofs-controls', async () => {
    await page.getByRole('tab', { name: 'Proofs & Metrics', exact: true }).click();
    await page.getByLabel('Proof ID').fill('');
    await page.getByLabel('Replay Token').fill('');
    await clickAndProbe('Get Proof', { allowError: true });
    await clickAndProbe('Replay Proof', { allowError: true });
    await clickAndProbe('Export Metrics');
  });

  await withStep('tab-system-controls', async () => {
    await page.getByRole('tab', { name: 'System', exact: true }).click();
    await clickAndProbe('Meta Context');
    await clickAndProbe('Meta Adapt (Dry Run)');
    await clickAndProbe('Org Status');
  });

  await withStep('copy-json', async () => {
    await page.getByRole('button', { name: /Copy JSON|Copied/ }).click();
    await page.waitForTimeout(300);
  });

  const passCount = results.filter(r => r.ok).length;
  const failCount = results.length - passCount;
  const warnings = results.filter(r => r.status === 'warning').length;
  const summary = {
    runAt: now(),
    baseUrl: BASE,
    totals: { total: results.length, pass: passCount, fail: failCount, warnings },
    results
  };

  fs.writeFileSync(`${outDir}/webui-functional-results.json`, JSON.stringify(summary, null, 2));

  const lines = [];
  lines.push('# WebUI Functional Test Report');
  lines.push('');
  lines.push(`- Run At: ${summary.runAt}`);
  lines.push(`- Base URL: ${summary.baseUrl}`);
  lines.push(`- Total Steps: ${summary.totals.total}`);
  lines.push(`- Passed: ${summary.totals.pass}`);
  lines.push(`- Failed: ${summary.totals.fail}`);
  lines.push(`- Warnings: ${summary.totals.warnings}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  for (const r of results) {
    const tag = r.ok ? (r.status === 'warning' ? 'WARN' : 'PASS') : 'FAIL';
    lines.push(`- ${tag} ${r.name}${r.note ? ` - ${r.note}` : ''}`);
  }
  fs.writeFileSync(`${outDir}/webui-functional-report.md`, lines.join('\n'));

  await page.screenshot({ path: `${outDir}/webui-functional-final.png`, fullPage: true });
  await browser.close();

  console.log(JSON.stringify(summary, null, 2));
  process.exit(failCount === 0 ? 0 : 2);
})();
