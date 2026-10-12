/* Real Learn / Reason / Solve evidence flow. Synthetic input; never camera tracking,
 * clinical validation, significance testing, or a claim of educational efficacy. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', '__hardy_weinberg__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3027').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_HW_PACKAGED === '1';
const output = path.resolve(process.env.BIOLOGY_HW_OUTPUT || path.join(root, 'docs/hardy-weinberg/browser'));
const id = 'hardy-weinberg', key = 'bioq.depth-study.v1.' + id + '.investigation';
// Captured using git show origin/main at the verified commit below. Keep only the
// prior task's signature fields and its three unchanged checks; an inline fixture
// also works in shallow checkouts after origin/main advances. No historical source
// is injected into the browser or substituted for the served application.
const baselineRevision = 'add81f2a4b3bb151258cc03935f4bbbf9e4e4bb7';
const previousTask = {
  question: 'What are p and q, and how many heterozygotes does Hardy–Weinberg predict in a sample of this size?',
  answer: 'p = 0.70 and q = 0.30; the expected heterozygote count is 2 × 0.70 × 0.30 × 100 = 42.',
  rows: [['AA', '49', '98'], ['Aa', '42', '42'], ['aa', '9', '0']]
};
const signature = task => JSON.stringify([task.question, task.answer, task.rows || []]);
const previousSignature = signature(previousTask);
const previousQuestions = [
  { question: 'With p = 0.7 and q = 0.3, what heterozygote frequency does the model predict?', options: ['0.21', '0.42', '0.49'], answer: 1, explanation: 'The heterozygote expectation is 2pq = 2 × 0.7 × 0.3 = 0.42.' },
  { question: 'What does q² represent under the two-allele equilibrium model?', options: ['The total heterozygote frequency', 'The aa genotype frequency', 'The a allele frequency'], answer: 1, explanation: 'Squaring q gives the chance of two independently sampled a alleles forming aa.' },
  { question: 'Can allele frequency be counted directly without assuming equilibrium?', options: ['Yes, from genotype copy counts', 'No, p always equals the dominant phenotype fraction', 'Only if every individual is homozygous'], answer: 0, explanation: 'Counting two copies per diploid individual gives allele frequencies without assuming expected genotype proportions.' }
];
const expectedRows = [['AA', '58', '116'], ['Aa', '24', '24'], ['aa', '18', '0']];
const oldDraft = 'My saved earlier comparison: I counted 140 A copies and obtained p = 0.70. I need to examine the revised observations.';
const draft = 'The 58 AA and 24 Aa contribute 140 A copies out of 200: p = 0.70, q = 0.30. Expected counts are 49 AA, 42 Aa and 9 aa. Observed Aa is 24, a deficit of 18; this alone does not establish selection or statistical significance.';
const revisedDraft = draft + ' Reason follow-up: examine sampling locations and population structure before suggesting a cause.';
const transferDraft = 'Different mating patterns can rearrange allele combinations without necessarily changing the total allele-copy frequencies in one generation.';
const sentinelKey = 'bioq.hardy-weinberg.browser.unrelated', sentinelValue = 'Preserve unrelated saved work';
const report = { base, packaged, baselineRevision, previousSignatureSha256: crypto.createHash('sha256').update(previousSignature).digest('hex'), complete: false, checks: [], responsive: [], sharedComponent: [], errors: [], cameraRequests: 0 };
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    await context.exposeBinding('__recordHardyWeinbergCamera', () => { report.cameraRequests++; });
    await context.addInitScript(() => {
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
        await window.__recordHardyWeinbergCamera();
        throw new Error('Camera forbidden in learning evidence checks');
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(360000);
    page.on('pageerror', error => report.errors.push(error.message));

    async function mountedWorld(ready) {
      let world = page;
      if (packaged) {
        await page.locator('#bioq-workspace').waitFor();
        const shell = await (await page.locator('#bioq-workspace').elementHandle()).contentFrame();
        await shell.locator('#viewFrame.on').waitFor();
        world = await (await shell.locator('#viewFrame').elementHandle()).contentFrame();
      }
      await world.locator(ready).first().waitFor();
      return world;
    }
    async function open(section, topicId = id) {
      const route = (section === 'learn' ? 'topic/' : 'learn/') + topicId + '/advanced';
      await page.goto(packaged ? base + '/#' + section + '/' + route : base + '/' + section + '.html#' + route,
        { waitUntil: 'domcontentloaded', timeout: 360000 });
      return mountedWorld('[data-depth-topic="' + topicId + '"]');
    }
    async function follow(world, selector, section) {
      const route = (section === 'learn' ? 'topic/' : 'learn/') + id + '/advanced';
      await world.locator(selector).click();
      await page.waitForURL(url => packaged ? url.hash === '#' + section + '/' + route : url.pathname.endsWith('/' + section + '.html') && url.hash === '#' + route,
        { waitUntil: 'domcontentloaded', timeout: 360000 });
      return mountedWorld('.tp-heading');
    }
    async function assertTable(world) {
      const table = world.locator('[data-depth-task="investigation"] .bd-table-wrap');
      assert.equal(await table.getAttribute('role'), 'region');
      assert.equal(await table.getAttribute('aria-label'), 'Evidence table');
      assert.equal(await table.getAttribute('tabindex'), '0');
      assert.ok((await table.locator('caption').innerText()).trim().length > 0);
      assert.deepEqual(await table.locator('thead th').allTextContents(), ['Genotype', 'Observed individuals', 'A copies contributed']);
      assert.equal(await table.locator('thead th[scope="col"]').count(), 3);
      assert.equal(await table.locator('tbody th[scope="row"]').count(), 3);
      assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))), expectedRows);
      return table;
    }
    async function assertAnswer(exercise) {
      const answer = await exercise.locator('.bd-answer').innerText();
      assert.match(answer, /p = 0\.70/);
      assert.match(answer, /q = 0\.30/);
      assert.match(answer, /49, 42 and 9/);
      assert.match(answer, /18 fewer than expected|deficit of 18/);
      assert.match(answer, /does not establish natural selection/);
      const limits = await exercise.locator('.bd-limit').innerText();
      assert.match(limits, /not a statistical significance claim/);
      assert.match(limits, /No significance test is performed/);
      assert.match(limits, /cannot establish a cause or a change in allele frequencies over time/);
    }
    async function unchangedSentinel(world) {
      assert.equal(await world.evaluate(key => localStorage.getItem(key), sentinelKey), sentinelValue);
    }
    async function assertStudyGroup(world) {
      const group = world.getByRole('group', { name: 'Study notes and reference reading', exact: true });
      assert.equal(await group.count(), 1, 'The study actions have one named accessible group');
      await group.scrollIntoViewIfNeeded();
      assert.equal(await group.isVisible(), true, 'Embedded learning must not hide the study actions');
      const exportButton = group.getByRole('button', { name: 'Download my study notes', exact: true });
      assert.equal(await exportButton.isVisible(), true);
      assert.equal(await exportButton.isEnabled(), true);
      const links = group.locator('a');
      const count = await links.count();
      assert.ok(count > 0, 'Reference reading remains available');
      // Check actual native Tab order, not synthetic click dispatch or forced actions.
      await links.first().focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await exportButton.evaluate(el => el === document.activeElement), true, 'Export is reachable immediately before the reference links');
      for (let index = 0; index < count; index++) {
        await page.keyboard.press('Tab');
        const link = links.nth(index);
        assert.equal(await link.isVisible(), true);
        assert.equal(await link.evaluate(el => el === document.activeElement), true, 'Each reference link follows in keyboard order');
        assert.match(await link.getAttribute('href'), /^https:\/\//);
        assert.ok((await link.innerText()).trim().length > 0);
      }
      assert.ok(await group.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Study actions do not overflow on narrow screens');
      return { referenceLinks: count, exportKeyboardReachable: true, referencesKeyboardReachable: true };
    }

    if (packaged) {
      const expected = path.resolve(process.env.BIOLOGY_DEPLOYED_ARTIFACT || path.join(root, 'dist/index.html'));
      const response = await page.request.get(base + '/', { timeout: 360000, headers: { 'Cache-Control': 'no-cache' } });
      assert.equal(response.status(), 200);
      const served = await response.body();
      assert.ok(served.equals(fs.readFileSync(expected)), 'Served package must exactly match the supplied deployed artifact');
      report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    }

    let world = await open('learn');
    const currentTask = await world.evaluate(id => BIO_DEPTH[id].investigation, id);
    assert.notEqual(signature(currentTask), previousSignature, 'The evidence task genuinely changed from the baseline');
    // Seed only the established persisted record, using its historical task signature.
    // Reload through the public route so production cleaning/mounting handles migration.
    await world.evaluate(({ key, signature, draft, sentinelKey, sentinelValue }) => {
      localStorage.setItem(key, JSON.stringify({ draft, rating: 'explained', revealed: true, compared: true, signature }));
      localStorage.setItem(sentinelKey, sentinelValue);
    }, { key, signature: previousSignature, draft: oldDraft, sentinelKey, sentinelValue });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 360000 });
    world = await mountedWorld('[data-depth-topic="' + id + '"]');
    let exercise = world.locator('[data-depth-task="investigation"]');
    await assertTable(world);
    assert.equal(await exercise.locator('textarea').inputValue(), oldDraft, 'An old-task draft survives the changed evidence');
    assert.equal(await exercise.locator('.bd-answer').evaluate(el => el.open), false, 'A stale reveal does not disclose the new worked answer');
    assert.equal(await exercise.locator('[data-depth-rating][aria-pressed="true"]').count(), 0, 'Old self-review does not grade the revised task');
    assert.equal(await exercise.locator('[data-depth-rating="revisit"]').isDisabled(), true, 'The revised task requires comparison again');
    assert.match(await exercise.innerText(), /Synthetic sample of 100 diploid individuals/);
    assert.match(await exercise.locator('.bd-question').innerText(), /heterozygote difference.*natural selection/);
    await unchangedSentinel(world);
    report.checks.push('The real prior investigation signature preserves its draft but resets reveal and self-review; the synthetic 58/24/18 table has accessible headers.');

    await exercise.locator('textarea').fill(draft);
    await exercise.locator('.bd-hint summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await exercise.locator('.bd-hint').evaluate(el => el.open), true);
    assert.equal(await exercise.locator('.bd-answer').evaluate(el => el.open), false);
    assert.equal(await exercise.locator('[data-depth-rating="revisit"]').isDisabled(), true);
    await exercise.locator('.bd-answer summary').focus();
    await page.keyboard.press('Enter');
    assert.equal(await exercise.locator('.bd-answer').evaluate(el => el.open), true);
    assert.equal(await exercise.locator('.bd-answer summary').evaluate(el => el === document.activeElement), true);
    assert.equal(await exercise.locator('[data-depth-rating="revisit"]').isDisabled(), false);
    await assertAnswer(exercise);
    await exercise.locator('[data-depth-rating="revisit"]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await exercise.locator('[data-depth-rating="revisit"]').getAttribute('aria-pressed'), 'true');
    const saved = await world.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(saved.signature, signature(currentTask));
    assert.equal(saved.draft, draft);
    assert.equal(saved.rating, 'revisit');
    report.checks.push('Keyboard hint and answer disclosures remain separate; the worked comparison shows p=.70/q=.30, 49/42/9 expectations, an 18-individual deficit and explicit causal/statistical limits.');

    world = await follow(world, '[data-practice="reason"]', 'reason');
    exercise = world.locator('[data-depth-task="investigation"]');
    await exercise.waitFor();
    assert.equal(await exercise.locator('textarea').inputValue(), draft);
    assert.equal(await exercise.locator('[data-depth-rating="revisit"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await world.locator('.tp-scenario h2').innerText(), currentTask.question, 'Reason uses the revised evidence question');
    await assertTable(world);
    await assertAnswer(exercise);
    await exercise.locator('textarea').fill(revisedDraft);
    assert.equal(await exercise.locator('[data-depth-rating][aria-pressed="true"]').count(), 0, 'Editing a draft clears its prior self-review');
    await unchangedSentinel(world);
    world = await open('learn');
    assert.equal(await world.locator('[data-depth-task="investigation"] textarea').inputValue(), revisedDraft);
    report.checks.push('Actual Learn → Reason navigation retains the evidence draft and review; editing in Reason persists back to Learn without retaining stale self-review.');

    world = await follow(world, '[data-practice="solve"]', 'solve');
    await world.locator('[data-depth-task="transfer"]').waitFor();
    const questions = await world.evaluate(id => BioPractice.questionsFor(BIO_LIBRARY.topics.find(topic => topic.id === id)), id);
    assert.deepEqual(questions, previousQuestions, 'All three Solve questions, options, answers and explanations remain unchanged');
    assert.equal(await world.locator('.tp-dot').count(), 3);
    await world.locator('[data-depth-task="transfer"] textarea').fill(transferDraft);
    for (const [index, question] of previousQuestions.entries()) {
      await world.locator('.tp-dot').nth(index).click();
      assert.equal(await world.locator('#tpQuestion').innerText(), question.question);
      assert.deepEqual(await world.locator('.tp-option > span').allTextContents(), question.options);
      await world.locator('.tp-options input[value="' + question.answer + '"]').check();
      await world.locator('.tp-submit').click();
      assert.match(await world.locator('.tp-feedback > strong').innerText(), /That’s right/);
      assert.equal(await world.locator('.tp-feedback .be-options dl > div').count(), question.options.length);
      assert.ok((await world.locator('.tp-feedback .be-direct').innerText()).includes(question.options[question.answer]));
      assert.equal(await world.locator('[data-depth-task="transfer"] textarea').inputValue(), transferDraft);
    }
    assert.match(await world.locator('.tp-complete').innerText(), /3 of 3 correct/);
    await unchangedSentinel(world);
    await assertStudyGroup(world);
    await world.locator('[data-depth-export]').focus();
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 360000 }),
      page.keyboard.press('Enter')
    ]);
    assert.equal(download.suggestedFilename(), 'biology-hardy-weinberg-study-notes.md');
    const downloadPath = path.join(output, download.suggestedFilename());
    await download.saveAs(downloadPath);
    const exported = fs.readFileSync(downloadPath, 'utf8');
    assert.ok(exported.includes(revisedDraft));
    assert.ok(exported.includes(transferDraft));
    assert.match(exported, /\| AA \| 58 \| 116 \|/);
    assert.match(exported, /\| Aa \| 24 \| 24 \|/);
    assert.match(exported, /\| aa \| 18 \| 0 \|/);
    assert.match(exported, /49, 42 and 9/);
    assert.match(exported, /Evidence limits:.*not a statistical significance claim/);
    assert.match(exported, /Self-review: Not reviewed/);
    report.checks.push('All three unchanged Solve checks grade correctly with complete option feedback; a real downloaded Markdown file contains both drafts, the new table, worked comparison and evidence limits.');

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const section of ['learn', 'reason', 'solve']) {
        world = await open(section);
        for (const theme of ['dark', 'light']) {
          await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
          await world.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
          // Existing theme colors transition; wait for a settled visual capture.
          await page.waitForTimeout(350);
          const studyActions = await assertStudyGroup(world);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Outer document fits ' + width);
          assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), section + ' document fits ' + width);
          await page.screenshot({ path: path.join(output, section + '-study-actions-' + width + '-' + theme + '.png') });
          if (section === 'solve') {
            report.responsive.push({ width, section, theme, studyActions });
            continue;
          }
          const table = await assertTable(world);
          await table.scrollIntoViewIfNeeded();
          await table.focus();
          assert.equal(await table.evaluate(el => el === document.activeElement), true, 'Evidence table accepts keyboard focus');
          const beforeScroll = await table.evaluate(el => ({ left: el.scrollLeft, client: el.clientWidth, scroll: el.scrollWidth, overflow: getComputedStyle(el).overflowX }));
          if (beforeScroll.scroll > beforeScroll.client + 1) {
            assert.equal(beforeScroll.overflow, 'auto');
            const direction = beforeScroll.left < beforeScroll.scroll - beforeScroll.client - 1 ? 'ArrowRight' : 'ArrowLeft';
            await page.keyboard.press(direction);
            await world.waitForFunction(({ before, direction }) => {
              const left = document.querySelector('[data-depth-task="investigation"] .bd-table-wrap').scrollLeft;
              return direction === 'ArrowRight' ? left > before : left < before;
            }, { before: beforeScroll.left, direction }, { timeout: 5000 });
          }
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Outer document fits ' + width);
          assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), section + ' document fits ' + width);
          assert.ok(await world.locator('.bd-study').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Table overflow stays within its scrollable region');
          await page.screenshot({ path: path.join(output, section + '-' + width + '-' + theme + '.png') });
          report.responsive.push({ width, section, theme, studyActions, tableScrollWidth: beforeScroll.scroll, tableClientWidth: beforeScroll.client, keyboardScrollTested: beforeScroll.scroll > beforeScroll.client + 1 });
        }
      }
    }
    report.checks.push('Learn and Reason fit 320/390/768/1440px in both themes; captioned evidence tables keep row/column headers, keyboard focus and bounded horizontal scrolling under reduced motion.');
    report.checks.push('Learn, Reason and Solve expose visible study-note export and HTTPS reference links, with native keyboard order, at all four widths in both themes.');
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const section of ['learn', 'reason', 'solve']) {
        world = await open(section, 'photosynthesis');
        for (const theme of ['dark', 'light']) {
          await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
          await world.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
          await page.waitForTimeout(350);
          const studyActions = await assertStudyGroup(world);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await page.screenshot({ path: path.join(output, 'photosynthesis-' + section + '-study-actions-' + width + '-' + theme + '.png') });
          report.sharedComponent.push({ topic: 'photosynthesis', width, section, theme, studyActions });
        }
      }
    }
    report.checks.push('The original photosynthesis lesson shares the accessible notes/reference group on Learn, Reason and Solve at phone and desktop widths in both themes.');
    assert.equal(report.cameraRequests, 0);
    assert.deepEqual(report.errors, []);
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
