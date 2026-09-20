/* Real module smoke: native buttons, mode isolation and focus. No camera/AI calls. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules'), '__feature_smoke__.cjs'))('playwright');
const base = process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3006';
const output = path.resolve(root, process.env.BIOLOGY_FEATURE_OUTPUT || 'docs/lab-feature-buttons/preview');
const report = { base, complete: false, errors: [], checks: [], cameraRequests: 0 };
fs.mkdirSync(output, { recursive: true });
async function usable(page, selector) {
  const info = await page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height, bounds: r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      hit: el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
      obstruction: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.outerHTML.slice(0, 160) };
  });
  assert.ok(info.width >= 44 && info.height >= 44 && info.bounds && info.hit, selector + JSON.stringify(info));
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: 'reduce' });
    await context.route('https://unpkg.com/**', route => route.abort());
    await context.addInitScript(() => {
      window.__cameraRequests = 0;
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = () => { window.__cameraRequests++; throw Error('Camera forbidden in smoke'); };
    });
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', error => report.errors.push(error.message));
    const response = await page.request.get(base + '/lab.html?release=feature-buttons');
    assert.equal(response.status(), 200);
    assert.ok((await response.body()).equals(fs.readFileSync(path.join(root, 'lab.html'))), 'exact deployed lab artifact');
    await page.goto(base + '/lab.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LAB?.ready && __LAB.dissection, null, { timeout: 90000 });
    await page.evaluate(() => __LAB.intro()?.skip());
    await page.locator('#histologybtn').tap({ trial: true });
    if (await page.locator('#structclose').isVisible()) await page.locator('#structclose').tap();
    for (const selector of ['#histologybtn', '#scalebtn', '#labmodesbtn']) await usable(page, selector);
    await page.screenshot({ path: path.join(output, 'phone-controls.png') });
    await page.locator('#histologybtn').tap();
    assert.equal(await page.locator('#featureitems .feature-choice').count(), 23);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.choice), await page.locator('#featureitems button').last().getAttribute('data-choice'));
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'featureclose');
    await page.screenshot({ path: path.join(output, 'phone-histology-library.png') });
    await page.locator('[data-choice="liver"]').tap();
    await page.waitForFunction(() => __LAB.histology().isOpen());
    assert.match(await page.locator('#hisName').textContent(), /liver/i);
    assert.match(await page.locator('#hisSub').textContent(), /Rana/i);
    await usable(page, '#hisClose');
    const originalTool = await page.evaluate(() => {
      window.__realUpdate = __LAB.dissection.update; window.__underlyingUpdates = 0;
      __LAB.dissection.update = (...args) => { window.__underlyingUpdates++; return window.__realUpdate(...args); };
      return __LAB.tool;
    });
    await page.locator('#hisTurret button').nth(1).tap();
    await page.keyboard.press('v');
    await page.keyboard.press('3');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => __LAB.tool), originalTool);
    assert.equal(await page.locator('#viva').isVisible(), false);
    assert.equal(await page.evaluate(() => window.__underlyingUpdates), 0, 'real frame loop pauses dissection in microscope');
    await page.evaluate(() => { __LAB.dissection.update = window.__realUpdate; });
    await page.locator('#hisClose').tap();
    await page.waitForFunction(() => !__LAB.histology().isOpen() && document.activeElement.id === 'histologybtn');
    report.checks.push('23 reference slides; real microscope magnification, isolated shortcuts/input, X and focus return');

    await page.locator('#scalebtn').tap();
    await page.waitForFunction(() => __LAB.zoomverse().isOpen());
    await usable(page, '#zoomverse .zv-x');
    await page.keyboard.press('v'); assert.equal(await page.locator('#viva').isVisible(), false);
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => !!document.activeElement.closest('#zoomverse')), true);
    await page.locator('#zoomverse .zv-x').tap();
    await page.waitForFunction(() => !__LAB.zoomverse().isOpen() && document.activeElement.id === 'scalebtn');
    report.checks.push('real scale journey; no underlying Viva shortcut; X and focus return');

    await page.locator('#labmodesbtn').tap(); await page.locator('[data-choice="imaging"]').tap();
    await page.locator('#imgseg [data-id="xray"]').tap();
    assert.equal(await page.evaluate(() => __LAB.imaging().mode()), 'xray');
    await page.locator('#imgseg [data-id="mri"]').tap();
    assert.equal(await page.evaluate(() => __LAB.imaging().mode()), 'mri');
    assert.match(await page.locator('#imgweightingbtn').textContent(), /T1/);
    await page.locator('#imgweightingbtn').tap();
    assert.equal(await page.evaluate(() => __LAB.imaging().weighting), 't2');
    assert.match(await page.locator('#imgweightingbtn').textContent(), /T2/);
    const oldWindow = await page.evaluate(() => __LAB.imaging().window);
    await page.locator('#imgwindowbtn').tap();
    assert.notDeepEqual(await page.evaluate(() => __LAB.imaging().window), oldWindow);
    await page.keyboard.press('r');
    assert.match(await page.locator('#imgweightingbtn').textContent(), /T1/);
    await page.locator('#imagingclose').tap();
    assert.equal(await page.evaluate(() => __LAB.imaging().mode()), 'off');
    await page.locator('#consoleclose').tap();
    await page.locator('#labmodesbtn').tap(); await page.locator('[data-choice="record"]').tap();
    assert.equal(await page.locator('#rec').isVisible(), true); await page.locator('#recclose').tap();
    await page.locator('#labmodesbtn').tap(); await page.locator('[data-choice="viva"]').tap();
    assert.equal(await page.locator('#viva').isVisible(), true); await page.locator('#vivaclose').tap();
    report.checks.push('real X-ray/MRI/off, window/MRI weighting sync, record and Viva via buttons');
    for (const viewport of [{ width: 320, height: 640 }, { width: 1440, height: 1000 }]) {
      await page.setViewportSize(viewport);
      for (const selector of ['#histologybtn', '#scalebtn', '#labmodesbtn']) await usable(page, selector);
      await page.locator('#labmodesbtn').tap(); await usable(page, '#featureclose'); await page.locator('#featureclose').tap();
      await page.screenshot({ path: path.join(output, 'controls-' + viewport.width + '.png') });
    }
    report.checks.push('390/320/1440 real lab layouts and mode-sheet X');
    report.cameraRequests = await page.evaluate(() => __cameraRequests);
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []); report.complete = true;
    console.log(JSON.stringify(report, null, 2));
  } finally { fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
