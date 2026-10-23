/* Actual Tellurium computation through Biology's nested portable Labs route.
 * Usage: node scripts/check-host-kinetics.cjs [path/to/biology-host]
 * Start the verified Biology companion on 127.0.0.1:8932 before running.
 * The HTTP server exposes only dist/index.html. No source fallback or mocks.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const assert = require('assert/strict');

const suite = path.resolve(__dirname, '..');
const host = path.resolve(process.argv[2] || process.env.BIOLOGY_HOST_DIR || path.join(suite, 'work/hosts/biology'));
const entry = path.join(host, 'dist/index.html');
const evidence = path.join(host, 'docs/learning-tools');
const modules = process.env.CODEX_NODE_MODULES || process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(modules, 'playwright'));
const companion = 'http://127.0.0.1:8932';
const timeout = Number(process.env.PORTABLE_KINETICS_TIMEOUT_MS || 180000);
const parameters = { substrate: 6, enzyme: 1, kcat: 0.4, duration: 18 };
if (!fs.existsSync(entry)) throw new Error('Build the Biology portable application first: ' + entry);
fs.mkdirSync(evidence, { recursive: true });

const report = {
  checkedAt: new Date().toISOString(), host, status: 'running', checks: [],
  pageErrors: [], expectedFontRequests: [], deniedRequests: [], serverRequests: [],
  companionRequests: [], computation: null,
};
const check = (name, condition = true) => { assert.ok(condition, name); report.checks.push(name); console.log('PASS ' + name); };
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  report.serverRequests.push(pathname);
  if (pathname !== '/dist/index.html') { res.writeHead(404).end('Portable-only verification: source assets are unavailable.'); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const stream = fs.createReadStream(entry);
  stream.on('error', error => { if (!res.headersSent) res.writeHead(500); res.end(error.message); });
  res.on('close', () => stream.destroy());
  stream.pipe(res);
});

async function findKineticsFrame(page) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const candidate of page.frames()) {
      const labs = await candidate.evaluate(() => !!window.BiologyLearningTools && (window.BioqContext?.page || location.pathname).endsWith('labs.html')).catch(() => false);
      if (!labs) continue;
      const handle = await candidate.locator('.bql-frame').elementHandle().catch(() => null);
      const frame = handle && await handle.contentFrame();
      if (frame && await frame.locator('#biology-next [data-view="kinetics"]').count()) return frame;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Biology Labs → Biochemical dynamics did not mount. Frames: ' + page.frames().map(frame => frame.url()).join(', '));
}

(async () => {
  let browser, context, page;
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: true });
    await context.route('**/*', route => {
      const request = route.request(), raw = request.url(), url = new URL(raw);
      if (raw.split('#')[0] === base + '/dist/index.html') return route.continue();
      if (url.protocol === 'blob:' || url.protocol === 'data:') return route.continue();
      if (url.origin === companion && ['/api/health', '/api/simulate'].includes(url.pathname) && ['GET', 'POST', 'OPTIONS'].includes(request.method())) {
        const item = { url: url.origin + url.pathname, method: request.method() };
        if (request.method() === 'POST') item.parameters = request.postDataJSON();
        report.companionRequests.push(item);
        // Pass the actual loopback request through, retaining real CORS checks.
        return route.continue();
      }
      if (request.method() === 'GET' && url.protocol === 'https:' &&
          ((url.hostname === 'fonts.googleapis.com' && /^\/css(?:2)?$/.test(url.pathname)) ||
           (url.hostname === 'fonts.gstatic.com' && /\.(?:woff2?|ttf|otf)$/.test(url.pathname)))) {
        report.expectedFontRequests.push({ url: url.origin + url.pathname, blocked: true });
        return route.abort('blockedbyclient');
      }
      report.deniedRequests.push({ url: url.origin + url.pathname, method: request.method() });
      return route.abort('blockedbyclient');
    });
    page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => report.pageErrors.push(error.message));
    await page.goto(base + '/dist/index.html#labs/learning-kinetics', { waitUntil: 'domcontentloaded', timeout });
    const frame = await findKineticsFrame(page);
    const skip = page.getByRole('button', { name: 'Skip for now', exact: true });
    if (await skip.isVisible()) await skip.click();
    await frame.getByRole('heading', { name: 'Where does the substrate go?', exact: true }).waitFor();
    check('Portable Biology Labs opens the actual kinetics tool with its package bridge', await frame.evaluate(() => !!window.BioqPackage));
    assert.equal(await frame.locator('[data-view="kinetics"]').isVisible(), true);
    assert.match(await frame.locator('[data-status="kinetics"]').innerText(), /not been contacted/);
    assert.deepEqual(report.companionRequests, []);
    assert.equal(await frame.locator('[data-export="csv"]').isDisabled(), true);
    assert.equal(await frame.locator('.chart').count(), 0);
    check('No computation or companion request occurs before the explicit Run action');

    for (const [name, value] of Object.entries(parameters)) {
      const input = frame.locator('[name="' + name + '"]');
      await input.fill(String(value));
      await input.dispatchEvent('input');
    }
    assert.match(await frame.locator('[data-output="substrate"]').innerText(), /6 µM/);
    assert.match(await frame.locator('[data-output="enzyme"]').innerText(), /1 µM/);
    assert.match(await frame.locator('[data-output="kcat"]').innerText(), /0\.4 s⁻¹/);
    assert.match(await frame.locator('[data-output="duration"]').innerText(), /18 s/);
    const healthPromise = page.waitForResponse(response => response.url() === companion + '/api/health' && response.request().method() === 'GET');
    const resultPromise = page.waitForResponse(response => response.url() === companion + '/api/simulate' && response.request().method() === 'POST');
    await frame.getByRole('button', { name: 'Run experiment', exact: true }).click();
    const [healthResponse, response] = await Promise.all([healthPromise, resultPromise]);
    assert.equal(healthResponse.status(), 200);
    const health = await healthResponse.json();
    assert.equal(health.engine, 'Tellurium');
    assert.equal(health.version, '2.2.13.1');
    assert.equal(typeof health.token, 'string');
    check('The tool performs a real local Tellurium connection handshake');

    assert.equal(response.status(), 200);
    const result = await response.json();
    assert.deepEqual(response.request().postDataJSON(), parameters);
    assert.deepEqual(result.parameters, parameters);
    assert.equal(result.engine, 'Tellurium / libRoadRunner CVODE');
    assert.equal(result.version, '2.2.13.1');
    assert.deepEqual(result.columns, ['time_s', 'substrate_uM', 'enzyme_uM', 'complex_uM', 'product_uM']);
    assert.deepEqual(result.units, { time: 's', concentration: 'µM', kon: 'µM⁻¹ s⁻¹', koff: 's⁻¹', kcat: 's⁻¹' });
    assert.deepEqual(result.fixedRates, { kon: 2, koff: 1 });
    assert.equal(result.rows.length, 201);
    assert.ok(result.rows.every(row => row.length === 5 && row.every(Number.isFinite)));
    assert.deepEqual(result.rows[0], [0, parameters.substrate, parameters.enzyme, 0, 0]);
    assert.equal(result.rows.at(-1)[0], parameters.duration);
    assert.ok(result.rows.at(-1)[4] > 0 && result.rows.at(-1)[1] < parameters.substrate);
    const substrateDrift = Math.max(...result.rows.map(row => Math.abs(row[1] + row[3] + row[4] - parameters.substrate)));
    const enzymeDrift = Math.max(...result.rows.map(row => Math.abs(row[2] + row[3] - parameters.enzyme)));
    assert.ok(substrateDrift < 1e-7 && enzymeDrift < 1e-7);
    assert.match(result.sbml, /timeUnits="second"/);
    check('Actual CVODE response contains 201 finite concentration samples, explicit units and conserved moieties');

    await frame.waitForFunction(() => document.querySelector('[data-status="kinetics"]')?.textContent.includes('conservation passed'));
    assert.equal(await frame.locator('.chart').count(), 1);
    const last = result.rows.at(-1), maximum = Math.max(0.1, ...result.rows.flatMap(row => [row[1], row[3], row[4]]));
    const endpoint = 'L605.00,' + (235 - last[4] / maximum * 195).toFixed(2);
    assert.ok((await frame.locator('.chart .product').getAttribute('d')).endsWith(endpoint));
    assert.match(await frame.locator('[data-summary]').innerText(), new RegExp('product ' + last[4].toFixed(3).replace('.', '\\.') + ' µM'));
    assert.equal(await frame.locator('[data-export="csv"]').isEnabled(), true);
    assert.equal(await frame.locator('[data-export="sbml"]').isEnabled(), true);
    check('The visible plot and result summary use the actual response, and scientific exports become available');

    const downloadPromise = page.waitForEvent('download');
    await frame.getByRole('button', { name: 'CSV', exact: true }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'enzyme-kinetics.csv');
    const csv = fs.readFileSync(await download.path(), 'utf8');
    const lines = csv.trim().split(/\r?\n/);
    assert.equal(lines[0], result.columns.join(','));
    assert.deepEqual(lines.slice(1).map(line => line.split(',').map(Number)), result.rows);
    check('Downloaded CSV contains all 201 real response rows with unit-bearing column names');
    report.computation = {
      engine: result.engine, version: result.version, parameters: result.parameters,
      units: result.units, fixedRates: result.fixedRates, columns: result.columns,
      samples: result.rows.length, firstRow: result.rows[0], finalRow: last,
      conservation: result.conservation, recalculatedDrift_uM: { substrate: substrateDrift, enzyme: enzymeDrift },
      csvSha256: crypto.createHash('sha256').update(csv).digest('hex'), assumptions: result.assumptions,
    };
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.deniedRequests, []);
    assert.ok(report.serverRequests.every(name => name === '/dist/index.html'));
    assert.equal(report.companionRequests.filter(item => item.method === 'POST').length, 1);
    check('The run uses only the portable artifact and explicit loopback companion, with no source fallback or page errors');
    await page.screenshot({ path: path.join(evidence, 'portable-kinetics-result.png'), fullPage: true });
    report.status = 'passed';
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    report.status = 'failed'; report.error = error.stack || String(error);
    if (page) {
      report.frames = page.frames().map(frame => frame.url());
      await page.screenshot({ path: path.join(evidence, 'portable-kinetics-failure.png'), fullPage: true }).catch(() => {});
    }
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(evidence, 'portable-kinetics-checks.json'), JSON.stringify(report, null, 2) + '\n');
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
