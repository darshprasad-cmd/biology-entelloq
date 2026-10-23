/* Real Transformers.js inference through Biology's nested portable document.
 * Usage: node scripts/check-portable-semantic.cjs [path/to/biology-host]
 * Or set BIOLOGY_HOST_DIR. No source server fallback or mocked model responses.
 * This check starts one browser and closes its browser/server in finally.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const assert = require('assert/strict');

const suite = path.resolve(__dirname, '..');
const host = path.resolve(process.argv[2] || process.env.BIOLOGY_HOST_DIR || path.join(suite, 'work/hosts/biology'));
const entry = path.join(host, 'dist/index.html');
const evidence = path.join(host, 'docs/learning-tools');
const modules = process.env.CODEX_NODE_MODULES || process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(modules, 'playwright'));
const timeout = Number(process.env.PORTABLE_SEMANTIC_TIMEOUT_MS || 180000);
const expectedRevision = '751bff37182d3f1213fa05d7196b954e230abad9';
const expectedModel = 'Xenova/all-MiniLM-L6-v2';
if (!fs.existsSync(entry)) throw new Error('Build the Biology portable application first: ' + entry);
fs.mkdirSync(evidence, { recursive: true });

const report = {
  checkedAt: new Date().toISOString(), host, status: 'running',
  checks: [], pageErrors: [], expectedFontRequests: [], deniedRequests: [], externalRequests: [], serverRequests: [], workers: [],
  inference: null,
};
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  report.serverRequests.push(pathname);
  // Deliberately serve only the portable artifact: no JS/MJS/WASM fallback.
  if (pathname !== '/dist/index.html') { res.writeHead(404).end('Portable-only verification: source assets are unavailable.'); return; }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const stream = fs.createReadStream(entry);
  stream.on('error', error => { if (!res.headersSent) res.writeHead(500); res.end(error.message); });
  res.on('close', () => stream.destroy());
  stream.pipe(res);
});

function modelHost(hostname) {
  return hostname === 'huggingface.co' || hostname.endsWith('.huggingface.co') || hostname === 'hf.co' || hostname.endsWith('.hf.co');
}
function safeURL(value) {
  // Presigned model CDN query strings are not useful evidence and may expire.
  try { const url = new URL(value); return url.protocol === 'blob:' ? value : url.origin + url.pathname; } catch { return String(value); }
}

async function findLearningFrame(page) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const candidate of page.frames()) {
      const isHost = await candidate.evaluate(() => !!window.BiologyLearningTools && (window.BioqContext?.page || location.pathname).endsWith('learn.html')).catch(() => false);
      if (!isHost) continue;
      const handle = await candidate.locator('.bql-frame').elementHandle().catch(() => null);
      const frame = handle && await handle.contentFrame();
      if (frame && await frame.locator('[data-learning-entry] .entelloq-learning').count()) return frame;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('The portable Biology Learn → Concept search frame did not mount. Frames: ' + page.frames().map(frame => frame.url()).join(', '));
}

async function instrument(frame) {
  // Observe real calls without replacing responses, inference or scheduling.
  await frame.evaluate(() => {
    const trace = window.__portableSemanticTrace = { preparations: [], fetches: [], blobs: [], workers: [], ready: [], results: [] };
    const prepare = window.ENTELLOQ_LEARNING_PREPARE_ASSETS;
    if (typeof prepare !== 'function') throw new Error('Portable prepareAssets callback is missing.');
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); trace.blobs.push({ url, type: blob.type, size: blob.size, revoked: false }); return url; };
    URL.revokeObjectURL = url => { for (const blob of trace.blobs) if (blob.url === url) blob.revoked = true; return revoke(url); };
    const nativeFetch = window.fetch.bind(window), signals = new WeakMap();
    window.fetch = async (input, options) => {
      const record = { url: typeof input === 'string' ? input : input.url, aborted: false };
      trace.fetches.push(record);
      if (options?.signal) {
        let preparation = signals.get(options.signal);
        if (!preparation) {
          preparation = { aborted: options.signal.aborted, fetches: 0 };
          signals.set(options.signal, preparation); trace.preparations.push(preparation);
          options.signal.addEventListener('abort', () => { preparation.aborted = true; }, { once: true });
        }
        preparation.fetches++;
      }
      try { const response = await nativeFetch(input, options); record.status = response.status; record.type = response.headers.get('Content-Type'); return response; }
      catch (error) { record.aborted = error.name === 'AbortError'; record.error = error.name; throw error; }
    };
    const NativeWorker = window.Worker;
    window.Worker = class ObservedWorker extends NativeWorker {
      constructor(url, options) {
        super(url, options);
        const record = { url: String(url), terminated: false, load: null };
        trace.workers.push(record);
        const post = this.postMessage.bind(this), terminate = this.terminate.bind(this);
        this.postMessage = (data, ...rest) => { if (data?.type === 'load') record.load = { assets: data.assets, documents: data.documents?.length }; return post(data, ...rest); };
        this.terminate = () => { record.terminated = true; return terminate(); };
        this.addEventListener('message', event => {
          if (event.data?.type === 'ready') trace.ready.push(event.data);
          if (event.data?.type === 'results') trace.results.push(event.data);
        });
      }
    };
    // The mounted callback resolves global fetch/URL/Worker dynamically. These
    // observers retain the actual host route, callback, package and model calls.
  });
}

async function trace(frame) { return frame.evaluate(() => window.__portableSemanticTrace); }
async function assertStopped(frame, label) {
  await frame.getByText('Semantic search stopped.', { exact: false }).waitFor();
  await frame.waitForFunction(() => window.__portableSemanticTrace.workers.every(worker => worker.terminated));
  // The host's lazy callback must release Blob URLs when the signal is aborted.
  await frame.waitForFunction(() => window.__portableSemanticTrace.blobs.every(blob => blob.revoked), {}, { timeout: 10000 });
  assert.ok((await trace(frame)).preparations.some(preparation => preparation.aborted), 'Cancel did not abort the actual asset preparation signal.');
  assert.equal(await frame.getByRole('button', { name: 'Enable semantic search', exact: true }).isEnabled(), true);
  assert.equal(await frame.getByRole('button', { name: 'Search concepts', exact: true }).isEnabled(), true);
  report.checks.push(label);
}

(async () => {
  let browser, context, page;
  let optIn = false;
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
    context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const request = route.request(), raw = request.url(), url = new URL(raw);
      if (raw.split('#')[0] === base + '/dist/index.html') return route.continue();
      if (url.protocol === 'blob:' || url.protocol === 'data:') return route.continue();
      // Existing host typography may request Google Fonts. Keep it blocked and
      // separately visible; it is unrelated to model/runtime hydration.
      if (request.method() === 'GET' && url.protocol === 'https:' &&
          ((url.hostname === 'fonts.googleapis.com' && /^\/css(?:2)?$/.test(url.pathname)) ||
           (url.hostname === 'fonts.gstatic.com' && /\.(?:woff2?|ttf|otf)$/.test(url.pathname)))) {
        report.expectedFontRequests.push({ url: safeURL(raw), beforeEnable: !optIn, blocked: true });
        return route.abort('blockedbyclient');
      }
      if (optIn && url.protocol === 'https:' && modelHost(url.hostname)) {
        report.externalRequests.push({ url: safeURL(raw), afterEnable: true, method: request.method() });
        return route.continue();
      }
      report.deniedRequests.push({ url: safeURL(raw), beforeEnable: !optIn, method: request.method() });
      return route.abort('blockedbyclient');
    });
    page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => report.pageErrors.push(error.message));
    page.on('worker', worker => report.workers.push(safeURL(worker.url())));
    await page.goto(base + '/dist/index.html#learn/learning-search', { waitUntil: 'domcontentloaded', timeout });
    const frame = await findLearningFrame(page);
    const skip = page.getByRole('button', { name: 'Skip for now', exact: true });
    if (await skip.isVisible()) await skip.click();
    await frame.getByRole('heading', { name: 'Find a concept by its meaning', exact: true }).waitFor();
    assert.equal(await frame.locator('.entelloq-learning').getAttribute('data-subject'), 'biology');
    assert.equal(await frame.evaluate(() => !!window.BioqPackage), true);
    assert.equal(await frame.evaluate(() => typeof window.ENTELLOQ_LEARNING_PREPARE_ASSETS), 'function');
    await frame.getByLabel('Question or concept', { exact: true }).fill('enzyme');
    await frame.getByRole('button', { name: 'Search concepts', exact: true }).click();
    await frame.locator('.learning-result').first().waitFor();
    assert.deepEqual(report.externalRequests, []);
    assert.deepEqual(report.deniedRequests, []);
    report.checks.push('Portable Biology Concept search mounts through Learn and keyword search makes no model/runtime network requests');

    await instrument(frame);
    await frame.getByText('Optional: semantic search on this device', { exact: true }).click();
    optIn = true;
    await frame.getByRole('button', { name: 'Enable semantic search', exact: true }).click();
    await frame.getByRole('button', { name: 'Cancel download', exact: true }).click();
    await assertStopped(frame, 'Cancel during real asset/model loading terminates workers, releases prepared Blob URLs and restores keyword mode');
    const cancelled = await trace(frame);
    report.cancelledAttempt = cancelled;

    const started = Date.now();
    await frame.getByRole('button', { name: 'Enable semantic search', exact: true }).click();
    await frame.waitForFunction(() => {
      const status = document.querySelector('.learning-status')?.textContent || '';
      return status.includes('Semantic search ready.') || /could not|unavailable/i.test(status);
    }, {}, { timeout });
    const status = await frame.locator('.learning-status').innerText();
    assert.match(status, /Semantic search ready\./, 'Real portable semantic setup failed: ' + status);
    const loaded = await trace(frame), ready = loaded.ready.at(-1), worker = loaded.workers.at(-1);
    assert.ok(ready, 'The actual Worker did not emit a ready result.');
    assert.equal(ready.model, expectedModel); assert.equal(ready.revision, expectedRevision);
    assert.equal(ready.dimensions, 384); assert.equal(ready.count, 8);
    assert.ok(worker.url.startsWith('blob:'), 'The worker must come from the portable package.');
    for (const name of ['mjs', 'wasm']) assert.ok(worker.load.assets[name].startsWith('blob:'), name + ' must be hydrated into a Blob URL.');
    for (const [name, suffix] of [['worker', 'semantic-worker.js'], ['mjs', '.jsep.mjs'], ['wasm', '.jsep.wasm']]) {
      const url = name === 'worker' ? worker.url : worker.load.assets[name];
      const blob = loaded.blobs.find(item => item.url === url);
      assert.ok(blob && blob.size > 0, 'Missing observed hydrated ' + name + ' Blob.');
      assert.match(blob.type, name === 'wasm' ? /application\/wasm/i : /(?:text|application)\/javascript/i, 'Incorrect ' + name + ' Blob MIME.');
      assert.ok(loaded.fetches.some(item => item.url.includes('/__single__/assets/learning-tools/learning/') && item.url.endsWith(suffix) && item.status === 200), 'Runtime asset was not read through the package fetch bridge: ' + name);
    }
    assert.ok(report.externalRequests.length > 0, 'No real model download was observed in the fresh browser context.');
    assert.ok(report.externalRequests.some(item => item.url.includes(expectedRevision)), 'Pinned model revision was not present in model requests.');
    assert.deepEqual(report.deniedRequests, [], 'Unexpected source/CDN requests bypassed package hydration.');
    assert.ok(report.serverRequests.every(name => name === '/dist/index.html'), 'The test server served a source dependency.');
    report.checks.push('Actual pinned q8 MiniLM starts in a Blob worker with package-hydrated MJS/WASM and emits 384-dimensional embeddings');

    const query = 'Why does the rate plateau when I keep increasing substrate but use the same amount of enzyme?';
    await frame.getByLabel('Question or concept', { exact: true }).fill(query);
    await frame.getByRole('button', { name: 'Search concepts', exact: true }).click();
    await frame.getByText('Ranked by local semantic similarity.', { exact: false }).waitFor({ timeout });
    const after = await trace(frame), result = after.results.at(-1);
    assert.ok(result?.results?.length > 0, 'Worker did not emit actual similarity results.');
    assert.ok(result.results.every(item => Number.isFinite(item.score) && item.score >= -1.001 && item.score <= 1.001));
    assert.ok(result.results.slice(0, 3).some(item => item.id === 'enzyme'), 'Expected enzyme-saturation concept among the first three real semantic results.');
    const titles = await frame.locator('.learning-result h3').allTextContents();
    report.inference = { query, status, ready, scores: result.results, titles, elapsedMs: Date.now() - started };
    report.checks.push('A new Biology question runs through actual local inference and retrieves enzyme saturation among its first three results');
    await page.screenshot({ path: path.join(evidence, 'portable-semantic-inference.png'), fullPage: true });

    await frame.getByRole('button', { name: 'Turn off semantic search', exact: true }).click();
    await assertStopped(frame, 'Turning semantic search off after inference releases worker and runtime Blob URLs');
    report.runtimeTrace = await trace(frame);
    assert.deepEqual(report.pageErrors, []);
    report.status = 'passed';
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    report.status = 'failed'; report.error = error.stack || String(error);
    if (page) {
      report.frames = page.frames().map(frame => frame.url());
      report.visibleText = (await page.locator('body').innerText().catch(() => '')).slice(0, 2500);
      await page.screenshot({ path: path.join(evidence, 'portable-semantic-failure.png'), fullPage: true }).catch(() => {});
    }
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(evidence, 'portable-semantic-checks.json'), JSON.stringify(report, null, 2) + '\n');
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
