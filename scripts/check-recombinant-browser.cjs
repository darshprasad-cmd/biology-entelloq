/* Real educational evidence flow, not wet-lab, biosafety or screen-reader speech
 * validation. No application source, responses or authored answers are mocked. */
'use strict';
const { waitForPortableRoute } = require('../tests/portable-route-browser-helper.cjs');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', '__recombinant__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3036').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_RECOMBINANT_PACKAGED === '1';
const output = path.resolve(process.env.BIOLOGY_RECOMBINANT_OUTPUT || path.join(root, 'docs/recombinant-evidence/browser'));
const id = 'recombinant-dna', key = 'bioq.depth-study.v1.' + id + '.investigation';
const transferKey = 'bioq.depth-study.v1.' + id + '.transfer';
// Captured from git show of this exact accepted revision, not synthesized from
// the updated task. Inline fixtures keep this runner usable in shallow CI clones.
const baselineRevision = '0aea0f3f60ee10627a8160698cccdc099a73cff1';
const previousTask = {
  question: 'Which candidate fits the expected insert size, and why does that pattern still not establish an error-free insert sequence?',
  answer: 'Candidate A fits the expected 3 kb backbone plus 1 kb insert, but identical fragment lengths can still conceal sequence substitutions or other errors.',
  rows: [['A', 'Yes', '3 and 1'], ['B', 'Yes', '3'], ['C', 'No', 'No recoverable plasmid']]
};
const previousTransfer = {
  question: 'Why could a correctly inserted coding sequence fail to produce protein in a chosen host?',
  hint: 'Ask what is needed beyond preserving the DNA itself.',
  answer: 'The host may not recognize the promoter, process the transcript correctly or translate the intended reading frame. Expression conditions, regulatory compatibility and product stability matter in addition to the presence of the DNA sequence.'
};
const previousQuestions = [
  { question: 'What does selection for a plasmid marker establish most directly?', options: ['Every insert base is correct', 'Candidate cells possess the selected marker under the assay conditions', 'The encoded protein must be active'], answer: 1, explanation: 'Selection identifies the marker phenotype; it does not fully verify insert sequence or expression.' },
  { question: 'What is the main role of a plasmid origin of replication?', options: ['Specifying every amino acid in the insert', 'Guaranteeing the absence of mutations', 'Supporting replication in a compatible host'], answer: 2, explanation: 'A compatible origin supports DNA replication but does not verify the insert or its expression.' },
  { question: 'Which check directly examines nucleotide order?', options: ['Counting surviving colonies alone', 'DNA sequencing', 'Only measuring total culture volume'], answer: 1, explanation: 'Sequencing evaluates nucleotide order, whereas colony survival and volume cannot establish the insert sequence.' }
];
const signature = task => JSON.stringify([task.question, task.answer, task.rows || []]);
const previousSignature = signature(previousTask);
const expectedColumns = ['Construct', 'Flanking fragments (kb)', 'Offset fragments (kb)'];
const expectedRows = [['Design prediction (not a measurement)', '3 and 1', '0.7 and 3.3'], ['Candidate A (synthetic)', '3 and 1', '1.3 and 2.7'], ['Candidate B (synthetic)', '3 and 1', '0.7 and 3.3']];
const referenceUrls = ['https://www.genome.gov/genetics-glossary/Recombinant-DNA-Technology', 'https://www.addgene.org/protocols/diagnostic-digest/'];
const oldDraft = 'My earlier size comparison chose A because its fragments were 3 kb and 1 kb; I noted that length did not verify the sequence.';
const draft = 'Both flanking digests total 4 kb and show a 1 kb insert. Intended offset distances give 0.5 + 0.2 = 0.7 kb and a remaining 3.3 kb. B matches this; A gives 1.3 and 2.7 kb, consistent with reversal under the stated model. Neither pattern proves sequence or protein function.';
const revisedDraft = draft + ' I would separate sequence and junction evidence from evidence of protein expression and activity.';
const transferDraft = 'A correctly inserted coding sequence may fail to produce protein if the host cannot recognize its promoter; DNA presence is not evidence of protein activity.';
const transferRecord = { draft: transferDraft, rating: 'explained', revealed: true, compared: true, signature: signature(previousTransfer) };
const sentinelKey = 'bioq.recombinant.browser.unrelated', sentinelValue = 'Preserve unrelated learning work';
const report = { base, packaged, baselineRevision, previousSignatureSha256: crypto.createHash('sha256').update(previousSignature).digest('hex'), complete: false, checks: [], responsive: [], errors: [], cameraRequests: 0 };
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    await context.exposeBinding('__recordRecombinantCamera', () => { report.cameraRequests++; });
    await context.addInitScript(() => {
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
        await window.__recordRecombinantCamera();
        throw new Error('Camera forbidden during evidence checks');
      };
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(360000);
    page.on('pageerror', error => report.errors.push(error.message));
    async function mountedWorld(ready = '[data-depth-topic="' + id + '"]') {
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
    const route = section => (section === 'learn' ? 'topic/' : 'learn/') + id + '/advanced';
    async function open(section) {
      await page.goto(packaged ? base + '/#' + section + '/' + route(section) : base + '/' + section + '.html#' + route(section), { waitUntil: 'domcontentloaded', timeout: 360000 });
      return mountedWorld();
    }
    async function follow(world, section) {
      await world.locator('[data-practice="' + section + '"]').click();
      if (packaged) await waitForPortableRoute(page, '#' + section + '/' + route(section), {timeout:360000});
      else await page.waitForURL(url => url.pathname.endsWith('/' + section + '.html') && url.hash === '#' + route(section), { waitUntil: 'domcontentloaded', timeout: 360000 });
      return mountedWorld('.tp-heading');
    }
    async function selectTheme(world, theme) {
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
      await page.waitForTimeout(350); // Settle the existing theme transition.
    }
    async function assertTable(world) {
      const table = world.locator('[data-depth-task="investigation"] .bd-table-wrap');
      assert.equal(await table.getAttribute('role'), 'region');
      assert.equal(await table.getAttribute('aria-label'), 'Evidence table');
      assert.equal(await table.getAttribute('tabindex'), '0');
      assert.equal(await table.locator('caption').innerText(), 'Same size, different orientation');
      assert.deepEqual(await table.locator('thead th').allTextContents(), expectedColumns);
      assert.equal(await table.locator('thead th[scope="col"]').count(), 3);
      assert.equal(await table.locator('tbody th[scope="row"]').count(), 3);
      assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))), expectedRows);
      return table;
    }
    async function assertAnswer(exercise) {
      const answer = await exercise.locator('.bd-answer').innerText();
      for (const pattern of [/0\.5 \+ 0\.2 = 0\.7/, /4 − 0\.7 = 3\.3/, /0\.5 \+ 0\.8 = 1\.3/, /leaving 2\.7/, /Candidate B matches the intended/, /A fits the reversed arrangement/, /Sequencing checks nucleotide order and junctions/, /protein expression and function need separate evidence/]) assert.match(answer, pattern);
      const limits = await exercise.locator('.bd-limit').innerText();
      for (const pattern of [/synthetic sizes/, /complete cutting/, /Partial cutting/, /unresolved bands/, /unexpected sites/, /do not establish exact sequence identity/, /not a laboratory protocol or a measured experiment/]) assert.match(limits, pattern);
    }
    async function preserved(world) {
      const state = await world.evaluate(({ sentinelKey, transferKey }) => ({ sentinel: localStorage.getItem(sentinelKey), transfer: JSON.parse(localStorage.getItem(transferKey)) }), { sentinelKey, transferKey });
      assert.equal(state.sentinel, sentinelValue);
      assert.deepEqual(state.transfer, transferRecord, 'The unchanged transfer keeps its draft, reveal and self-review');
    }
    async function assertOldDraftReset(world) {
      const exercise = world.locator('[data-depth-task="investigation"]');
      await assertTable(world);
      assert.equal(await exercise.locator('textarea').inputValue(), oldDraft);
      assert.equal(await exercise.locator('.bd-answer').evaluate(el => el.open), false);
      assert.equal(await exercise.locator('[data-depth-rating][aria-pressed="true"]').count(), 0);
      assert.equal(await exercise.locator('[data-depth-rating="revisit"]').isDisabled(), true);
      await preserved(world);
      return exercise;
    }
    async function assertStudyActions(world) {
      const group = world.getByRole('group', { name: 'Study notes and reference reading', exact: true });
      await group.scrollIntoViewIfNeeded();
      assert.equal(await group.isVisible(), true);
      const button = group.getByRole('button', { name: 'Download my study notes', exact: true });
      assert.equal(await button.isVisible(), true);
      assert.equal(await button.isEnabled(), true);
      const links = group.locator('a');
      assert.deepEqual(await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), referenceUrls);
      await links.first().focus();
      await page.keyboard.press('Shift+Tab');
      assert.equal(await button.evaluate(el => el === document.activeElement), true);
      for (const link of await links.all()) {
        await page.keyboard.press('Tab');
        assert.equal(await link.evaluate(el => el === document.activeElement), true);
        assert.equal(await link.isVisible(), true);
      }
      assert.ok(await group.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    }

    if (packaged) {
      const expected = path.resolve(process.env.BIOLOGY_DEPLOYED_ARTIFACT || path.join(root, 'dist/index.html'));
      const response = await page.request.get(base + '/', { timeout: 360000, headers: { 'Cache-Control': 'no-cache' } });
      assert.equal(response.status(), 200);
      const served = await response.body();
      assert.ok(served.equals(fs.readFileSync(expected)), 'Served package must match the specified deployment artifact byte for byte');
      report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    }
    let world = await open('learn');
    const currentTask = await world.evaluate(id => BIO_DEPTH[id].investigation, id);
    assert.notEqual(signature(currentTask), previousSignature);
    assert.deepEqual(await world.evaluate(id => BIO_DEPTH[id].transfer, id), previousTransfer);
    // Seed only established private records. A genuine reload lets production
    // cleaning/mounting interpret the historical signature without source hacks.
    await world.evaluate(({ key, previousSignature, oldDraft, transferKey, transferRecord, sentinelKey, sentinelValue }) => {
      localStorage.setItem(key, JSON.stringify({ draft: oldDraft, rating: 'explained', revealed: true, compared: true, signature: previousSignature }));
      localStorage.setItem(transferKey, JSON.stringify(transferRecord));
      localStorage.setItem(sentinelKey, sentinelValue);
    }, { key, previousSignature, oldDraft, transferKey, transferRecord, sentinelKey, sentinelValue });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 360000 });
    world = await mountedWorld();
    await assertOldDraftReset(world);
    world = await follow(world, 'reason');
    let exercise = await assertOldDraftReset(world);
    assert.equal(await world.locator('.tp-scenario h2').innerText(), currentTask.question);
    assert.match(await exercise.innerText(), /The two digests are separate/);
    assert.match(await exercise.innerText(), /Assume complete cutting with no additional cuts/);
    report.checks.push('The genuine previous investigation draft survives in Learn and Reason, but obsolete review/reveal reset; the unchanged transfer record and unrelated storage remain intact.');

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
    await assertAnswer(exercise);
    await exercise.locator('[data-depth-rating="revisit"]').focus();
    await page.keyboard.press('Enter');
    const saved = await world.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(saved.signature, signature(currentTask));
    assert.equal(saved.rating, 'revisit');
    assert.equal(saved.draft, draft);
    world = await open('learn');
    exercise = world.locator('[data-depth-task="investigation"]');
    assert.equal(await exercise.locator('textarea').inputValue(), draft);
    assert.equal(await exercise.locator('[data-depth-rating="revisit"]').getAttribute('aria-pressed'), 'true');
    await exercise.locator('textarea').fill(revisedDraft);
    assert.equal(await exercise.locator('[data-depth-rating][aria-pressed="true"]').count(), 0);
    world = await follow(world, 'reason');
    exercise = world.locator('[data-depth-task="investigation"]');
    assert.equal(await exercise.locator('textarea').inputValue(), revisedDraft);
    assert.equal(await exercise.locator('[data-depth-rating][aria-pressed="true"]').count(), 0);
    await assertAnswer(exercise);
    await preserved(world);
    report.checks.push('Native keyboard disclosures keep hint and worked comparison separate; revised reasoning and self-review persist across Learn/Reason, while editing clears stale review.');

    world = await open('learn');
    world = await follow(world, 'solve');
    const transfer = world.locator('[data-depth-task="transfer"]');
    await transfer.waitFor();
    assert.equal(await transfer.locator('textarea').inputValue(), transferDraft);
    assert.equal(await transfer.locator('[data-depth-rating="explained"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await transfer.locator('.bd-answer').evaluate(el => el.open), true);
    assert.equal(await transfer.locator('.bd-question').innerText(), previousTransfer.question);
    assert.ok((await transfer.locator('.bd-answer').innerText()).includes(previousTransfer.answer));
    const questions = await world.evaluate(id => BioPractice.questionsFor(BIO_LIBRARY.topics.find(topic => topic.id === id)), id);
    assert.deepEqual(questions, previousQuestions, 'All original Solve questions/options/keys/explanations remain unchanged');
    assert.equal(await world.locator('.tp-dot').count(), 3);
    for (const [index, question] of previousQuestions.entries()) {
      await world.locator('.tp-dot').nth(index).click();
      assert.equal(await world.locator('#tpQuestion').innerText(), question.question);
      assert.deepEqual(await world.locator('.tp-option > span').allTextContents(), question.options);
      await world.locator('.tp-options input[value="' + question.answer + '"]').check();
      await world.locator('.tp-submit').click();
      assert.match(await world.locator('.tp-feedback > strong').innerText(), /That’s right/);
      assert.equal(await world.locator('.tp-feedback .be-options dl > div').count(), question.options.length);
      assert.ok((await world.locator('.tp-feedback .be-direct').innerText()).includes(question.options[question.answer]));
      assert.equal(await transfer.locator('textarea').inputValue(), transferDraft);
    }
    assert.match(await world.locator('.tp-complete').innerText(), /3 of 3 correct/);
    await preserved(world);
    await assertStudyActions(world);
    await world.locator('[data-depth-export]').focus();
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 360000 }), page.keyboard.press('Enter')]);
    assert.equal(download.suggestedFilename(), 'biology-recombinant-dna-study-notes.md');
    const downloadPath = path.join(output, download.suggestedFilename());
    await download.saveAs(downloadPath);
    const notes = fs.readFileSync(downloadPath, 'utf8');
    for (const text of [revisedDraft, transferDraft, currentTask.answer, currentTask.limitation, ...currentTask.reasoning, ...referenceUrls]) assert.ok(notes.includes(text), 'Downloaded notes contain: ' + text);
    for (const row of expectedRows) assert.ok(notes.includes('| ' + row.join(' | ') + ' |'));
    assert.match(notes, /Self-review: Not reviewed/);
    assert.match(notes, /Self-review: I can explain it/);
    report.checks.push('The unchanged transfer and all three Solve checks retain correct grading and option feedback; real keyboard-exported notes include drafts, new table/reasoning/limits and both references.');

    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const section of ['learn', 'reason', 'solve']) {
        world = await open(section);
        for (const theme of ['dark', 'light']) {
          await selectTheme(world, theme);
          await assertStudyActions(world);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Outer page fits ' + width);
          assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), section + ' fits ' + width);
          await page.screenshot({ path: path.join(output, section + '-actions-' + width + '-' + theme + '.png') });
          if (section === 'solve') { report.responsive.push({ width, section, theme, accessibleStudyActions: true }); continue; }
          const table = await assertTable(world);
          await table.scrollIntoViewIfNeeded();
          await table.focus();
          assert.equal(await table.evaluate(el => el === document.activeElement), true);
          const dimensions = await table.evaluate(el => ({ left: el.scrollLeft, client: el.clientWidth, scroll: el.scrollWidth, overflow: getComputedStyle(el).overflowX }));
          if (dimensions.scroll > dimensions.client + 1) {
            assert.equal(dimensions.overflow, 'auto');
            // Verify both ends via native key events. Merely moving a few pixels
            // would not prove that the decisive offset column can be read.
            const presses = Math.ceil(dimensions.scroll / 20);
            for (let step = 0; step < presses; step++) await page.keyboard.press('ArrowLeft');
            await world.waitForFunction(() => document.querySelector('[data-depth-task="investigation"] .bd-table-wrap').scrollLeft <= 1, null, { timeout: 5000 });
            await page.screenshot({ path: path.join(output, section + '-table-left-' + width + '-' + theme + '.png') });
            for (let step = 0; step < presses; step++) await page.keyboard.press('ArrowRight');
            await world.waitForFunction(() => {
              const el = document.querySelector('[data-depth-task="investigation"] .bd-table-wrap');
              return el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
            }, null, { timeout: 5000 });
          }
          assert.ok(await table.evaluate(el => {
            const region = el.getBoundingClientRect();
            return [...el.querySelectorAll('tr > :last-child')].every(cell => {
              const box = cell.getBoundingClientRect();
              return box.left >= region.left - 1 && box.right <= region.right + 1;
            });
          }), 'The decisive offset header and every offset value are fully visible');
          assert.ok(await world.locator('.bd-study').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
          await page.screenshot({ path: path.join(output, section + '-table-' + width + '-' + theme + '.png') });
          report.responsive.push({ width, section, theme, accessibleStudyActions: true, tableClientWidth: dimensions.client, tableScrollWidth: dimensions.scroll, keyboardScrollTested: dimensions.scroll > dimensions.client + 1, offsetColumnFullyVisible: true });
        }
      }
    }
    report.checks.push('Learn/Reason/Solve fit four widths in genuine dark/light themes; the evidence table has row/column headers, native focus and bounded keyboard scrolling, and notes/references remain keyboard reachable.');
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
