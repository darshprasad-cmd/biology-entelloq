/* Focus visibility in source, portable or published practice. Never uses camera. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { checkPracticeFocus } = require('../tests/practice-focus-browser.cjs');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', '__practice_focus__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3046').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_PRACTICE_FOCUS_PACKAGED === '1';
const output = path.resolve(process.env.BIOLOGY_PRACTICE_FOCUS_OUTPUT || path.join(root, 'docs/practice-focus/source'));
const report = { base, packaged, complete: false, checks: [], initialLoads: [], replay: [], errors: [], cameraRequests: 0,
  limitations: 'Chromium CSS viewport, DOM focus and synthetic keyboard checks; not physical-device, screen-reader speech, educator or webcam validation.' };
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    if (packaged) {
      const context = await browser.newContext();
      try {
        const expected = path.resolve(process.env.BIOLOGY_DEPLOYED_ARTIFACT || path.join(root, 'dist/index.html'));
        const response = await context.request.get(base + '/', { timeout: 360000, headers: { 'Cache-Control': 'no-cache' } });
        assert.equal(response.status(), 200);
        const bytes = await response.body();
        assert.ok(bytes.equals(fs.readFileSync(expected)), 'Served HTML matches the independently verified artifact exactly');
        report.artifactSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
      } finally { await context.close(); }
    }
    for (const [width, height] of [[320, 640], [390, 844], [768, 900], [1440, 900]]) for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await context.exposeBinding('__recordPracticeCamera', () => { report.cameraRequests++; });
      await context.addInitScript(() => {
        if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
          await window.__recordPracticeCamera(); throw new Error('Camera forbidden during practice checks');
        };
      });
      const page = await context.newPage();
      page.setDefaultNavigationTimeout(360000);
      page.on('pageerror', error => report.errors.push(error.message));
      const getWorld = async () => {
        if (!packaged) return page;
        const shell = await (await page.locator('#bioq-workspace').elementHandle()).contentFrame();
        await shell.locator('#viewFrame.on').waitFor();
        const world = await (await shell.locator('#viewFrame').elementHandle()).contentFrame();
        await world.locator('#bioPractice').waitFor();
        return world;
      };
      const open = async section => {
        await page.goto('about:blank');
        await page.goto(packaged ? base + '/#' + section + '/learn/photosynthesis/visual' : base + '/' + section + '.html?instant=1#learn/photosynthesis/visual',
          { waitUntil: 'domcontentloaded' });
        const world = await getWorld();
        await world.locator(section === 'solve' ? '.tp-question' : '#tpDraft').waitFor();
        return world;
      };
      const selectTheme = async world => {
        const owner = packaged ? world.parentFrame() : world;
        if (await owner.locator('html').getAttribute('data-theme') !== theme) {
          if (await owner.locator('#themeBtn').isVisible()) await owner.locator('#themeBtn').click();
          else {
            assert.ok(packaged);
            await owner.locator('#exploreBtn').click();
            await owner.locator('#exploreTheme').click();
            await owner.locator('#exploreClose').click();
          }
        }
        await owner.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
        await world.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
        await page.waitForTimeout(350); // Existing theme transition only.
      };
      let world = await open('solve');
      await selectTheme(world);
      for (const section of ['reason', 'solve']) {
        world = await open(section);
        await world.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
        assert.equal(await world.locator('#bioPractice').evaluate(el => el.contains(document.activeElement)), false,
          section + ': fresh direct load does not autofocus the practice content');
        report.initialLoads.push({ width, height, theme, section, noAutofocus: true });
      }
      await world.evaluate(() => {
        localStorage.setItem('bioq.practice-focus.unrelated', 'Unrelated saved record');
        const unit = BioDepth.unitFor('photosynthesis');
        BioDepth.write('photosynthesis', 'investigation', unit.investigation,
          { draft: 'Existing private evidence draft must survive practice actions.', compared: false, revealed: false, rating: '' });
      });
      const result = await checkPracticeFocus(page, world, { getWorld, capture: async (action, activeWorld) => {
        assert.equal(await activeWorld.locator('html').getAttribute('data-theme'), theme, 'Selected theme persists');
        if (['Solve check incorrect answer', 'Solve retry question', 'Reason hide worked answer'].includes(action))
          await page.screenshot({ path: path.join(output, action.toLowerCase().replaceAll(' ', '-') + '-' + width + '-' + theme + '.png') });
      } });
      report.checks.push({ width, height, theme, ...result });
      // Restore, do not rewrite, the same real private records after reload.
      world = await open('reason');
      assert.equal(await world.locator('#tpDraft').inputValue(), result.reasonDraft);
      assert.equal(await world.locator('#bioPractice').evaluate(el => el.contains(document.activeElement)), false, 'Saved Reason draft does not autofocus');
      world = await open('solve');
      assert.equal(await world.locator('.tp-feedback').isVisible(), true, 'Graded question is restored');
      assert.equal(await world.locator('.tp-feedback').evaluate(el => el.contains(document.activeElement)), false, 'Saved feedback does not autofocus');
      assert.equal(await world.locator('input[name="tpAnswer"]').first().isDisabled(), true);
      report.replay.push({ width, theme, draftRestored: true, answersRestored: true, noAutofocus: true });
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
