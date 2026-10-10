/* Focused source / deployed browser check; never enables camera or online AI. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { checkLibrarySearch } = require('../tests/library-search-browser.cjs');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', '__search__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3027').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_SEARCH_PACKAGED === '1';
const output = path.resolve(process.env.BIOLOGY_SEARCH_OUTPUT || path.join(root, 'docs/library-search/browser'));
const report = { base, packaged, complete: false, checks: [], errors: [], cameraRequests: 0 };
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.exposeBinding('__recordSearchCamera', () => { report.cameraRequests++; });
    await context.addInitScript(() => {
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
        await window.__recordSearchCamera();
        throw new Error('Camera forbidden during library checks');
      };
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(packaged ? base + '/#learn' : base + '/learn.html#library', { waitUntil: 'domcontentloaded', timeout: 120000 });
      let world = page;
      if (packaged) {
        const shell = await (await page.locator('#bioq-workspace').elementHandle()).contentFrame();
        await shell.locator('#viewFrame.on').waitFor();
        world = await (await shell.locator('#viewFrame').elementHandle()).contentFrame();
      }
      await world.locator('#bl-search').waitFor();
      for (const theme of ['dark', 'light']) {
        await world.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
        report.checks.push({ width, theme, behavior: await checkLibrarySearch(page, world) });
        for (const selector of ['#bl-show-results', '#bl-clear']) {
          const box = await world.locator(selector).boundingBox();
          assert.ok(box.height >= 44, selector + ': touch target');
        }
        await world.locator('#bl-search').fill('zzzxqv-no-biology-match');
        await world.locator('#bl-show-results').click();
        assert.ok((await world.locator('#bl-empty-reset').boundingBox()).height >= 44);
        assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + ': no page overflow');
        assert.ok(await world.locator('#bioLibrary').evaluate(el => el.scrollWidth <= el.clientWidth + 1), width + ': no library overflow');
        await page.screenshot({ path: path.join(output, 'empty-' + width + '-' + theme + '.png') });
        await world.locator('#bl-empty-reset').click();
        await page.screenshot({ path: path.join(output, 'search-' + width + '-' + theme + '.png') });
      }
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
