/* Source / packaged / live Learn-route verification. No camera or online AI. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { checkLibraryRoute } = require('../tests/library-route-browser.cjs');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', '__route__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3027').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_ROUTE_PACKAGED === '1';
const output = path.resolve(process.env.BIOLOGY_ROUTE_OUTPUT || path.join(root, 'docs/library-route-focus/browser'));
const report = { base, packaged, complete: false, checks: [], initialLoads: [], errors: [], cameraRequests: 0,
  limitations: 'Chromium CSS viewports and DOM focus; no physical mobile, screen-reader speech, educator or webcam validation.' };
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    if (packaged) {
      const context = await browser.newContext();
      try {
        const expected = path.resolve(process.env.BIOLOGY_DEPLOYED_ARTIFACT || path.join(root, 'dist/index.html'));
        const response = await context.request.get(base + '/', { timeout: 180000, headers: { 'Cache-Control': 'no-cache' } });
        assert.equal(response.status(), 200);
        const served = await response.body();
        assert.ok(served.equals(fs.readFileSync(expected)), 'Served page matches the independently verified artifact byte for byte');
        report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
      } finally { await context.close(); }
    }
    for (const width of [320, 390, 768, 1440]) for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      await context.exposeBinding('__recordRouteCamera', () => { report.cameraRequests++; });
      await context.addInitScript(() => {
        if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
          await window.__recordRouteCamera(); throw new Error('Camera forbidden during Learn-route checks');
        };
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      const getWorld = async () => {
        if (!packaged) return page;
        const shell = await (await page.locator('#bioq-workspace').elementHandle()).contentFrame();
        await shell.locator('#viewFrame.on').waitFor();
        const frame = await (await shell.locator('#viewFrame').elementHandle()).contentFrame();
        await frame.locator('#bioLibrary').waitFor();
        return frame;
      };
      const navigate = async hash => {
        // A hash-only page.goto would reuse the document and is itself a route
        // change. Start a fresh document for the initial-load assertions.
        await page.goto('about:blank');
        await page.goto(packaged ? base + '/#learn' + hash : base + '/learn.html#' + (hash ? hash.slice(1) : 'library'),
          { waitUntil: 'domcontentloaded', timeout: 120000 });
        const world = await getWorld();
        await world.locator(hash ? '#bl-topic-title' : '#bl-search').waitFor();
        return world;
      };
      const selectTheme = async world => {
        const owner = packaged ? world.parentFrame() : world;
        if (await owner.locator('html').getAttribute('data-theme') !== theme) {
          if (await owner.locator('#themeBtn').isVisible()) await owner.locator('#themeBtn').click();
          else {
            assert.ok(packaged, 'Standalone theme control remains visible');
            await owner.locator('#exploreBtn').click();
            await owner.locator('#exploreTheme').click();
            await owner.locator('#exploreClose').click();
          }
        }
        await owner.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
        await world.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
        await page.waitForTimeout(350); // Existing theme transition only.
      };
      // Direct navigation is not an in-app route change and must not seize focus.
      let world = await navigate('/topic/photosynthesis/visual');
      await selectTheme(world);
      world = await navigate('/topic/photosynthesis/visual');
      await world.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      assert.equal(await world.locator('#bl-topic-title').evaluate(el => el === document.activeElement), false,
        'Initial direct topic load does not autofocus its heading');
      world = await navigate('');
      await world.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      assert.equal(await world.locator('.bl-library-title').evaluate(el => el === document.activeElement), false,
        'Initial library load does not autofocus its heading');
      report.initialLoads.push({ width, theme, topicHeadingAutofocused: false, libraryHeadingAutofocused: false });
      await world.evaluate(() => localStorage.setItem('bioq.depth-study.v1.browser-route-preservation', JSON.stringify({ draft: 'Private draft survives navigation', rating: 'revisit' })));
      const behavior = await checkLibraryRoute(page, world, { getWorld, capture: async (step, activeWorld) => {
        assert.equal(await activeWorld.locator('html').getAttribute('data-theme'), theme, 'Theme survives route changes');
        assert.equal(await activeWorld.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No horizontal overflow at ' + step);
        await page.screenshot({ path: path.join(output, step + '-' + width + '-' + theme + '.png') });
      } });
      report.checks.push({ width, theme, behavior });
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    assert.equal(report.cameraRequests, 0);
    report.complete = true;
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
