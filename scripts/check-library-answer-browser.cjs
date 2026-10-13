/* Real quick-check keyboard flow and replay regression, not screen-reader speech
 * validation. Browser storage denial is an explicit fault-injection scenario. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { checkLibraryAnswer } = require('../tests/library-answer-browser.cjs');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', '__library_answer__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3035').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_ANSWER_PACKAGED === '1';
const output = path.resolve(process.env.BIOLOGY_ANSWER_OUTPUT || path.join(root, 'docs/learn-answer-focus/browser'));
const report = { base, packaged, complete: false, checks: [], responsive: [], replay: [], blockedStorage: [], errors: [], cameraRequests: 0 };
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    async function monitoredContext(blocked = false) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      await context.exposeBinding('__recordLibraryAnswerCamera', () => { report.cameraRequests++; });
      await context.addInitScript(() => {
        if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
          await window.__recordLibraryAnswerCamera();
          throw new Error('Camera forbidden during Learn answer checks');
        };
      });
      if (blocked) await context.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied for this regression scenario', 'SecurityError'); } });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(45000);
      page.setDefaultNavigationTimeout(360000);
      page.on('pageerror', error => report.errors.push({ blockedStorage: blocked, message: error.message }));
      return { context, page };
    }
    async function mountedWorld(page, topicId) {
      let world = page;
      if (packaged) {
        await page.locator('#bioq-workspace').waitFor();
        const shell = await (await page.locator('#bioq-workspace').elementHandle()).contentFrame();
        await shell.locator('#viewFrame.on').waitFor();
        world = await (await shell.locator('#viewFrame').elementHandle()).contentFrame();
      }
      await world.locator('[data-depth-topic="' + topicId + '"]').waitFor();
      await world.locator('.bl-quiz [data-answer]').first().waitFor();
      return world;
    }
    async function open(page, topicId) {
      const route = 'topic/' + topicId + '/advanced';
      await page.goto(packaged ? base + '/#learn/' + route : base + '/learn.html#' + route,
        { waitUntil: 'domcontentloaded', timeout: 360000 });
      return mountedWorld(page, topicId);
    }
    async function selectTheme(page, world, theme) {
      const owner = packaged ? world.parentFrame() : world;
      if (await owner.locator('html').getAttribute('data-theme') !== theme) {
        if (await owner.locator('#themeBtn').isVisible()) await owner.locator('#themeBtn').click();
        else {
          assert.ok(packaged, 'Standalone theme control must remain visible');
          await owner.locator('#exploreBtn').click();
          await owner.locator('#exploreTheme').click();
          await owner.locator('#exploreClose').click();
        }
      }
      await owner.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      await world.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      await page.waitForTimeout(350); // Existing theme transition, not an application timer.
    }
    async function assertFits(page, world, width) {
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Outer document fits ' + width);
      assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Lesson document fits ' + width);
      assert.ok(await world.locator('.bl-quiz').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Quick check contains its content');
    }
    async function checkModeReplay(page, world, questionIndex) {
      const feedback = world.locator('[data-feedback="' + questionIndex + '"]');
      const textBefore = await feedback.innerText();
      const current = await world.locator('.bl-mode[aria-selected="true"]').getAttribute('data-mode');
      const next = current === 'scientific' ? 'advanced' : 'scientific';
      await world.locator('[data-mode="' + next + '"]').focus();
      await page.keyboard.press('Enter');
      await world.locator('#bl-mode-' + next + '[aria-selected="true"]').waitFor();
      assert.equal(await world.locator('#bl-mode-' + next).evaluate(el => el === document.activeElement), true, 'Replayed feedback must not steal mode-tab focus');
      assert.equal(await feedback.innerText(), textBefore, 'Mode changes retain the saved explanation');
      assert.ok(await world.locator('[data-check="' + questionIndex + '"]').evaluateAll(buttons => buttons.every(button => button.disabled)));
      return { mode: next, modeFocusPreserved: true };
    }
    async function checkReload(page, world, topicId, result) {
      // A reload from the lesson start must not be pulled back down to a saved answer.
      await world.locator('#bl-topic-title').focus();
      await page.keyboard.press('Control+Home');
      const before = await world.locator('.bl-quiz').evaluate(el => ({ top: el.getBoundingClientRect().top, viewport: innerHeight }));
      assert.ok(before.top > before.viewport, 'Reload precondition: quick check is below the current viewport');
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 360000 });
      world = await mountedWorld(page, topicId);
      const feedback = world.locator('[data-feedback="' + result.questionIndex + '"]');
      assert.equal(await feedback.isVisible(), true, 'Saved feedback is restored');
      assert.equal(await feedback.evaluate(el => el.contains(document.activeElement)), false, 'Reloaded feedback never autofocuses');
      assert.ok((await feedback.innerText()).includes(result.explanation));
      assert.equal(await world.locator('[data-check="' + result.questionIndex + '"][data-answer="' + result.correctIndex + '"]').isDisabled(), true);
      const after = await world.locator('.bl-quiz').evaluate(el => ({ top: el.getBoundingClientRect().top, viewport: innerHeight }));
      assert.ok(after.top > after.viewport, 'Saved-answer replay must not scroll to the quick check');
      return { world, evidence: { topicId, quizTop: after.top, viewportHeight: after.viewport, feedbackRestored: true, noFeedbackAutofocus: true, noQuizJump: true } };
    }

    const { context, page } = await monitoredContext();
    if (packaged) {
      const expected = path.resolve(process.env.BIOLOGY_DEPLOYED_ARTIFACT || path.join(root, 'dist/index.html'));
      const response = await page.request.get(base + '/', { timeout: 360000, headers: { 'Cache-Control': 'no-cache' } });
      assert.equal(response.status(), 200);
      const served = await response.body();
      assert.ok(served.equals(fs.readFileSync(expected)), 'Served HTML must exactly match the supplied deployment artifact');
      report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    }
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const topicId of ['photosynthesis', 'recombinant-dna']) {
        let world = await open(page, topicId);
        for (const theme of ['dark', 'light']) {
          await selectTheme(page, world, theme);
          const result = await checkLibraryAnswer(page, world);
          await assertFits(page, world, width);
          await page.screenshot({ path: path.join(output, topicId + '-' + width + '-' + theme + '.png') });
          const modeReplay = await checkModeReplay(page, world, result.questionIndex);
          report.responsive.push({ width, theme, ...result, modeReplay });
          // Representative phone/desktop reloads avoid repeatedly downloading a
          // large live artifact for every otherwise equivalent viewport/theme.
          if ((width === 390 && theme === 'dark') || (width === 1440 && theme === 'light')) {
            const restored = await checkReload(page, world, topicId, result);
            world = restored.world;
            report.replay.push({ width, theme, ...restored.evidence });
          }
        }
      }
    }
    report.checks.push('Both original and added concepts complete the shared keyboard/pointer quick-check helper at 320/390/768/1440px in genuine dark/light themes, without page overflow.');
    report.checks.push('Saved answers retain mode-tab focus and restore on reload without focusing feedback or scrolling down to the quiz.');
    await context.close();

    const denied = await monitoredContext(true);
    await denied.page.setViewportSize({ width: 390, height: 1000 });
    for (const topicId of ['photosynthesis', 'recombinant-dna']) {
      const world = await open(denied.page, topicId);
      const check = await world.evaluate(id => BIO_LIBRARY.topics.find(topic => topic.id === id).quickCheck[0], topicId);
      const option = world.locator('[data-check="0"][data-answer="' + check.answer + '"]');
      await option.focus();
      await denied.page.keyboard.press('Enter');
      const feedback = world.locator('[data-feedback="0"]');
      assert.equal(await feedback.isVisible(), true);
      assert.ok((await feedback.innerText()).includes(check.explanation));
      assert.equal(await feedback.evaluate(el => el.contains(document.activeElement) && document.activeElement.getAttribute('tabindex') === '-1'), true);
      await denied.page.keyboard.press('Tab');
      assert.equal(await feedback.getByRole('button', { name: 'Try this check again', exact: true }).evaluate(el => el === document.activeElement), true);
      await denied.page.keyboard.press('Enter');
      assert.equal(await world.locator('[data-check="0"]').first().evaluate(el => el === document.activeElement), true);
      assert.equal(await feedback.isVisible(), false);
      await denied.page.keyboard.press('Space');
      assert.equal(await feedback.evaluate(el => el.contains(document.activeElement)), true);
      const modeReplay = await checkModeReplay(denied.page, world, 0);
      assert.match(await world.locator('.bl-understand').innerText(), /Saved for this visit; browser storage is unavailable/);
      await assertFits(denied.page, world, 390);
      report.blockedStorage.push({ topicId, answerAndRetryOperable: true, modeReplay, sessionOnlyMessage: true });
    }
    await denied.context.close();
    report.checks.push('With localStorage access explicitly denied, answer/retry remains operable and mode changes preserve session feedback while reporting visit-only storage.');
    assert.deepEqual(report.errors, []);
    assert.equal(report.cameraRequests, 0);
    report.complete = true;
  } catch (error) {
    report.failure = error.stack;
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
