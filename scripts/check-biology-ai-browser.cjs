/* Optional UI regression. Serves only this checkout; AI is mocked and no key is used.
   BIOLOGY_PLAYWRIGHT_MODULES points at an existing node_modules with Playwright.
   BIOLOGY_AI_EVIDENCE optionally saves screenshots outside the repository. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.join(root, 'node_modules');
const { chromium } = createRequire(path.join(modules, '__biology_ai_check__.cjs'))('playwright');
const evidence = process.env.BIOLOGY_AI_EVIDENCE;
const report = { checks: [], errors: [], providerRequests: 0, limitation: 'Mocked AI boundary; no live credential, camera, hardware or scientific-result verification.' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    const ext = path.extname(file);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.glb': 'model/gltf-binary' })[ext] || 'application/octet-stream');
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1365, height: 900 }, reducedMotion: 'reduce' });
    let mode = 'success', captured = [], release = null;
    await context.route('**/*', async route => {
      if (route.request().url().startsWith('https://groq-proxy.physicsedge.workers.dev/')) {
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' } }); return;
        }
        ++report.providerRequests; captured.push(route.request().postDataJSON());
        if (mode === 'pending') await new Promise(resolve => { release = resolve; });
        const content = '<img src=x onerror=window.aiInjected=true> A membrane controls exchange.';
        await route.fulfill({ status: mode === 'error' ? 503 : 200,
          headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json',
          body: JSON.stringify(mode === 'error' ? { error: 'unavailable' } : { choices: [{ message: { content }, finish_reason: 'stop' }] }) }).catch(() => {});
      } else if (route.request().url().startsWith(base)) await route.continue();
      else await route.abort();
    });
    let page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(base + '/app.html#lessons', { waitUntil: 'domcontentloaded' });
    await page.locator('#viewFrame.on').waitFor();
    await page.locator('#bioq-ai-launch').click();
    await page.locator('#bioq-ai-question').fill('How does a cell membrane work?');
    await page.locator('#bioq-ai-send').click();
    await page.waitForFunction(() => document.querySelector('#bioq-ai-status').textContent === 'AI explanation');
    assert.match(await page.locator('#bioq-ai-log').innerText(), /<img src=x/);
    assert.equal(await page.locator('#bioq-ai-log img').count(), 0);
    assert.equal(await page.evaluate(() => !!window.aiInjected), false);
    assert.ok(captured[0].messages.some(m => m.content.includes('#lessons')));
    report.checks.push('App sends current topic and displays model output as inert text.');

    for (const viewport of [{ width: 1365, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      const box = await page.locator('#bioq-ai-panel').boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= viewport.width + 1 && box.y >= 0 && box.y + box.height <= viewport.height, JSON.stringify(box));
      if (evidence) { fs.mkdirSync(evidence, { recursive: true }); await page.screenshot({ path: path.join(evidence, 'app-ai-' + viewport.width + '.png') }); }
    }
    await page.locator('#bioq-ai-question').press('Escape');
    assert.equal(await page.locator('#bioq-ai-panel').isVisible(), false);
    assert.equal(await page.locator('#bioq-ai-launch').evaluate(el => document.activeElement === el), true);
    report.checks.push('Desktop, tablet and mobile panel bounds; Escape closes and restores focus.');

    await page.locator('#bioq-ai-launch').click(); mode = 'pending';
    await page.locator('#bioq-ai-question').fill('Explain osmosis'); await page.locator('#bioq-ai-send').click();
    await page.waitForFunction(() => document.querySelector('#bioq-ai-send').textContent === 'Stop');
    await page.locator('#bioq-ai-send').click();
    assert.match(await page.locator('#bioq-ai-status').innerText(), /Request stopped/);
    if (release) release(); release = null;
    report.checks.push('Stop cancels pending chat without appending a stale answer.');

    mode = 'error';
    await page.locator('#bioq-ai-question').fill('What is mitosis?'); await page.locator('#bioq-ai-send').click();
    await page.waitForFunction(() => document.querySelector('#bioq-ai-status').textContent.includes('unavailable'));
    assert.equal(await page.locator('#bioq-ai-question').inputValue(), 'What is mitosis?');
    report.checks.push('Service error preserves the question for retry without inventing an answer.');

    await page.goto(base + '/about.html#/home', { waitUntil: 'domcontentloaded' });
    await page.locator('.ai-prompt').first().click();
    await page.waitForFunction(() => document.querySelector('#aiOut').textContent.includes('Showing an offline example'));
    mode = 'success'; await page.locator('.ai-prompt').nth(1).click();
    await page.waitForFunction(() => document.querySelector('#aiOut').textContent.includes('AI explanation'));
    assert.equal(await page.locator('#aiOut img').count(), 0);
    report.checks.push('About questions use live AI and explicitly label authored fallback.');

    await page.setViewportSize({ width: 1365, height: 900 });
    await page.goto(base + '/universe.html#cell', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__UNI, null, { timeout: 45000 });
    await page.locator('.u-mark').first().click();
    await page.locator('.askbtn').click();
    await page.waitForFunction(() => document.querySelector('#uAns').textContent.includes('AI explanation'));
    assert.equal(await page.locator('#uAns img').count(), 0);
    mode = 'error'; await page.locator('.askbtn').click();
    await page.waitForFunction(() => document.querySelector('#uAns').textContent.includes('Showing an offline example'));
    report.checks.push('Universe topic request is live, text-safe and retains the labeled offline knowledge.');

    // Release the Universe's WebGL resources before opening the separate lab.
    await page.close(); page = await context.newPage();
    page.setDefaultTimeout(15000); page.on('pageerror', e => report.errors.push(e.message));
    mode = 'success';
    await page.goto(base + '/lab.html?instant=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LAB && window.__LAB.ready && window.__LAB.tutor, null, { timeout: 45000 });
    const grade = await page.evaluate(() => window.__LAB.tutor().grade());
    await page.locator('#bioq-ai-launch').click();
    await page.locator('#bioq-ai-question').fill('What connects the heart to the lungs?'); await page.locator('#bioq-ai-send').click();
    await page.waitForFunction(() => document.querySelector('#bioq-ai-status').textContent === 'AI explanation');
    assert.deepEqual(await page.evaluate(() => window.__LAB.tutor().grade()), grade);
    assert.ok(captured.at(-1).messages.some(m => m.content.includes('Specimen: frog')));
    assert.equal(await page.evaluate(() => window.__LAB.tool), 'probe', 'typing cannot trigger lab tool shortcuts');
    report.checks.push('Standalone lab includes specimen context; typing leaves tools and tutor grade unchanged.');
    assert.deepEqual(report.errors, []);
    report.completed = true;
    console.log(JSON.stringify(report, null, 2));
  } catch (error) { report.failure = error.message; throw error; }
  finally {
    if (evidence) { fs.mkdirSync(evidence, { recursive: true }); fs.writeFileSync(path.join(evidence, 'browser.json'), JSON.stringify(report, null, 2)); }
    await browser.close(); server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
