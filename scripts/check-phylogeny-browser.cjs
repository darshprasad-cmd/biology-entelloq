/* Actual learning UI and SVG branch geometry. These conceptual, unscaled trees
 * are not reconstructed biological evidence. No camera or screen-reader speech
 * validation is claimed. No app source, authored answers or responses are mocked;
 * a separate failure scenario explicitly denies localStorage access. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto'), { createRequire } = require('node:module');
const { checkPhylogeny } = require('../tests/phylogeny-browser.cjs');
const { checkEvidenceTable } = require('../tests/evidence-tables-browser.cjs');
const { waitForPortableRoute } = require('../tests/portable-route-browser-helper.cjs');
// Captured from the accepted commit, not reconstructed from the revised lesson.
const baseline = require('../tests/fixtures/phylogeny-evidence-e34914e.json');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', '__phylogeny__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3046').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_PHYLOGENY_PACKAGED === '1';
const output = path.resolve(process.env.BIOLOGY_PHYLOGENY_OUTPUT || path.join(root, 'docs/phylogeny-evidence/browser'));
const id = 'phylogenetic-trees', key = 'bioq.depth-study.v1.' + id + '.investigation', transferKey = 'bioq.depth-study.v1.' + id + '.transfer';
const signature = task => JSON.stringify([task.question, task.answer, task.rows || []]);
const previousTask = baseline.depth.investigation, previousTransfer = baseline.depth.transfer;
const previousQuestions = [...baseline.topic.quickCheck, ...baseline.enrichment.checkpoints];
const oldDraft = 'My earlier answer traced A with C and D to the same root and noted that this tree has no dates.';
const draft = 'T1 and T2 have AB and CD clades despite different tip order. T3 has AC and BD. In T1, A is equally related to C and D through the root; A+C alone excludes other descendants and is not a clade. No split dates are supplied.';
const revisedDraft = draft + ' These invented hypotheses are not measured evidence about a real lineage.';
const transferDraft = 'Wings can evolve independently under similar selection; a useful similarity is not necessarily evidence of recent shared ancestry.';
const transferRecord = { draft: transferDraft, rating: 'explained', revealed: true, compared: true, signature: signature(previousTransfer) };
const sentinelKey = 'bioq.phylogeny.browser.unrelated', sentinelValue = 'Preserve unrelated learning work';
const expectedRows = [['T1', '((A,B),(C,D))'], ['T2', '((D,C),(B,A))'], ['T3', '((A,C),(B,D))']];
const referenceUrls = ['https://openstax.org/books/biology-2e/pages/20-1-organizing-life-on-earth', 'https://evolution.berkeley.edu/evolution-101/the-history-of-life-looking-at-the-patterns/understanding-phylogenies/'];
const report = { base, packaged, baselineRevision: baseline.provenance.commit, complete: false, checks: [], responsive: [], errors: [], cameraRequests: 0 };
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    await context.exposeBinding('__recordPhylogenyCamera', () => { report.cameraRequests++; });
    await context.addInitScript(() => {
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
        await window.__recordPhylogenyCamera(); throw new Error('Camera forbidden during learning checks');
      };
    });
    page = await context.newPage();
    page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(360000);
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
    const route = section => (section === 'learn' ? 'topic/' : 'learn/') + id + '/visual';
    async function open(section) {
      await page.goto(packaged ? base + '/#' + section + '/' + route(section) : base + '/' + section + '.html#' + route(section), { waitUntil: 'domcontentloaded' });
      return mountedWorld();
    }
    async function follow(world, section) {
      await world.locator('[data-practice="' + section + '"]').click();
      if (packaged) await waitForPortableRoute(page, '#' + section + '/' + route(section));
      else await page.waitForURL(url => url.pathname.endsWith('/' + section + '.html') && url.hash === '#' + route(section), { waitUntil: 'domcontentloaded' });
      return mountedWorld('.tp-heading');
    }
    async function selectTheme(world, theme) {
      const owner = packaged ? world.parentFrame() : world;
      if (await owner.locator('html').getAttribute('data-theme') !== theme) {
        if (await owner.locator('#themeBtn').isVisible()) await owner.locator('#themeBtn').click();
        else {
          assert.ok(packaged);
          await owner.locator('#exploreBtn').click(); await owner.locator('#exploreTheme').click(); await owner.locator('#exploreClose').click();
        }
      }
      await owner.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      await world.waitForFunction(theme => document.documentElement.dataset.theme === theme, theme);
      await page.waitForTimeout(350);
    }
    async function preserved(world) {
      const state = await world.evaluate(({ sentinelKey, transferKey }) => ({ sentinel: localStorage.getItem(sentinelKey), transfer: JSON.parse(localStorage.getItem(transferKey)) }), { sentinelKey, transferKey });
      assert.equal(state.sentinel, sentinelValue); assert.deepEqual(state.transfer, transferRecord);
    }
    async function assertTable(world) {
      const table = world.locator('[data-depth-task="investigation"] .bd-table-wrap');
      assert.equal(await table.locator('caption').innerText(), 'Same ancestry, different drawing');
      assert.deepEqual(await table.locator('thead th').allTextContents(), ['Drawing', 'Nested grouping']);
      assert.deepEqual(await table.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.cells].map(cell => cell.textContent.trim()))), expectedRows);
      return checkEvidenceTable(page, world);
    }
    async function assertOldDraftReset(world) {
      const exercise = world.locator('[data-depth-task="investigation"]');
      assert.equal(await exercise.locator('textarea').inputValue(), oldDraft);
      assert.equal(await exercise.locator('.bd-answer').evaluate(el => el.open), false);
      assert.equal(await exercise.locator('[data-depth-rating][aria-pressed="true"]').count(), 0);
      assert.equal(await exercise.locator('[data-depth-rating="revisit"]').isDisabled(), true);
      await preserved(world); return exercise;
    }
    async function assertAnswer(exercise, task) {
      assert.deepEqual(await exercise.locator('.bd-answer ol li').allTextContents(), task.reasoning);
      assert.ok((await exercise.locator('.bd-answer').innerText()).includes(task.answer));
      const answer = await exercise.locator('.bd-answer').innerText();
      for (const pattern of [/T2 preserves T1’s clades AB and CD/, /T3 instead groups AC and BD/, /A is equally related to C and D/, /A\+C alone is not a clade/, /no split can be dated/, /not measured evolutionary evidence/, /No sequence data, character analysis or statistical support/, /Branch lengths are unscaled/]) assert.match(answer, pattern);
    }
    async function assertStudyActions(world) {
      const group = world.getByRole('group', { name: 'Study notes and reference reading', exact: true });
      await group.scrollIntoViewIfNeeded(); assert.equal(await group.isVisible(), true);
      const button = group.getByRole('button', { name: 'Download my study notes', exact: true }), links = group.locator('a');
      assert.deepEqual(await links.evaluateAll(nodes => nodes.map(node => node.getAttribute('href'))), referenceUrls);
      await links.first().focus(); await page.keyboard.press('Shift+Tab');
      assert.equal(await button.evaluate(el => el === document.activeElement), true);
      for (const link of await links.all()) {
        await page.keyboard.press('Tab'); assert.equal(await link.evaluate(el => el === document.activeElement), true); assert.equal(await link.isVisible(), true);
      }
      assert.ok(await group.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    }
    if (packaged) {
      const artifact = path.resolve(process.env.BIOLOGY_DEPLOYED_ARTIFACT || path.join(root, 'dist/index.html'));
      const response = await page.request.get(base + '/', { timeout: 360000, headers: { 'Cache-Control': 'no-cache' } });
      assert.equal(response.status(), 200); const served = await response.body();
      assert.ok(served.equals(fs.readFileSync(artifact)), 'Live/package bytes equal the specified deployment artifact');
      report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    }
    let world = await open('learn');
    const currentTask = await world.evaluate(id => BIO_DEPTH[id].investigation, id);
    assert.notEqual(signature(currentTask), signature(previousTask));
    assert.deepEqual(await world.evaluate(id => BIO_DEPTH[id].transfer, id), previousTransfer);
    await world.evaluate(({ key, oldDraft, previousSignature, transferKey, transferRecord, sentinelKey, sentinelValue }) => {
      localStorage.setItem(key, JSON.stringify({ draft: oldDraft, rating: 'explained', revealed: true, compared: true, signature: previousSignature }));
      localStorage.setItem(transferKey, JSON.stringify(transferRecord)); localStorage.setItem(sentinelKey, sentinelValue);
    }, { key, oldDraft, previousSignature: signature(previousTask), transferKey, transferRecord, sentinelKey, sentinelValue });
    await page.reload({ waitUntil: 'domcontentloaded' }); world = await mountedWorld();
    await assertOldDraftReset(world); await assertTable(world);
    world = await follow(world, 'reason'); let exercise = await assertOldDraftReset(world);
    assert.equal(await world.locator('.tp-scenario h2').innerText(), currentTask.question);
    await exercise.locator('textarea').fill(draft);
    await exercise.locator('.bd-hint summary').focus(); await page.keyboard.press('Enter');
    assert.equal(await exercise.locator('.bd-hint').evaluate(el => el.open), true);
    assert.equal(await exercise.locator('.bd-answer').evaluate(el => el.open), false);
    assert.equal(await exercise.locator('[data-depth-rating="revisit"]').isDisabled(), true);
    await exercise.locator('.bd-answer summary').focus(); await page.keyboard.press('Enter');
    assert.equal(await exercise.locator('.bd-answer summary').evaluate(el => el === document.activeElement), true);
    await assertAnswer(exercise, currentTask);
    await exercise.locator('[data-depth-rating="revisit"]').focus(); await page.keyboard.press('Enter');
    assert.equal((await world.evaluate(key => JSON.parse(localStorage.getItem(key)), key)).signature, signature(currentTask));
    world = await open('learn'); exercise = world.locator('[data-depth-task="investigation"]');
    assert.equal(await exercise.locator('textarea').inputValue(), draft);
    assert.equal(await exercise.locator('[data-depth-rating="revisit"]').getAttribute('aria-pressed'), 'true');
    await exercise.locator('textarea').fill(revisedDraft);
    assert.equal(await exercise.locator('[data-depth-rating][aria-pressed="true"]').count(), 0);
    world = await follow(world, 'reason'); exercise = world.locator('[data-depth-task="investigation"]');
    assert.equal(await exercise.locator('textarea').inputValue(), revisedDraft);
    assert.equal(await exercise.locator('[data-depth-rating][aria-pressed="true"]').count(), 0);
    await assertAnswer(exercise, currentTask); await preserved(world);
    report.checks.push('Historical draft survives in Learn and Reason while obsolete reveal/review reset; native keyboard hint/compare and edited private notes preserve the unchanged transfer and unrelated storage.');
    world = await open('learn'); world = await follow(world, 'solve');
    const transfer = world.locator('[data-depth-task="transfer"]'); await transfer.waitFor();
    assert.equal(await transfer.locator('textarea').inputValue(), transferDraft);
    assert.equal(await transfer.locator('[data-depth-rating="explained"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await transfer.locator('.bd-answer').evaluate(el => el.open), true);
    const questions = await world.evaluate(id => BioPractice.questionsFor(BIO_LIBRARY.topics.find(topic => topic.id === id)), id);
    assert.deepEqual(questions, previousQuestions); assert.equal(await world.locator('.tp-dot').count(), 3);
    for (const [index, question] of previousQuestions.entries()) {
      await world.locator('.tp-dot').nth(index).click(); assert.equal(await world.locator('#tpQuestion').innerText(), question.question);
      assert.deepEqual(await world.locator('.tp-option > span').allTextContents(), question.options);
      await world.locator('.tp-options input[value="' + question.answer + '"]').check(); await world.locator('.tp-submit').click();
      assert.match(await world.locator('.tp-feedback > strong').innerText(), /That’s right/);
      assert.equal(await world.locator('.tp-feedback .be-options dl > div').count(), question.options.length);
    }
    assert.match(await world.locator('.tp-complete').innerText(), /3 of 3 correct/); await preserved(world);
    await assertStudyActions(world); await world.locator('[data-depth-export]').focus();
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 360000 }), page.keyboard.press('Enter')]);
    assert.equal(download.suggestedFilename(), 'biology-' + id + '-study-notes.md');
    const notesPath = path.join(output, download.suggestedFilename()); await download.saveAs(notesPath);
    const notes = fs.readFileSync(notesPath, 'utf8');
    for (const text of [revisedDraft, transferDraft, currentTask.answer, currentTask.limitation, ...currentTask.reasoning, ...referenceUrls]) assert.ok(notes.includes(text), 'Export includes ' + text);
    for (const row of expectedRows) assert.ok(notes.includes('| ' + row.join(' | ') + ' |'));
    assert.match(notes, /Self-review: Not reviewed/); assert.match(notes, /Self-review: I can explain it/);
    report.checks.push('All three unchanged Solve checks grade correctly; the real keyboard-triggered download contains revised reasoning, table, private drafts, limits and both references.');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const section of ['learn', 'reason', 'solve']) {
        world = await open(section);
        for (const theme of ['dark', 'light']) {
          await selectTheme(world, theme);
          const item = { width, section, theme };
          if (section === 'learn') item.diagram = await checkPhylogeny(page, world, { captureView: view => page.screenshot({ path: path.join(output, 'tree-' + view + '-' + width + '-' + theme + '.png') }) });
          if (section !== 'solve') {
            item.evidence = await assertTable(world);
            await page.screenshot({ path: path.join(output, section + '-table-' + width + '-' + theme + '.png') });
          }
          await assertStudyActions(world);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
          await preserved(world); report.responsive.push(item);
          console.log(section + ' ' + width + ' ' + theme + ': passed');
        }
      }
    }
    report.checks.push('All three actual SVG topologies and keyboard boundaries pass at four widths in both genuine themes; all three learning surfaces fit, keep evidence accessible and retain notes/references.');
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto(packaged ? base + '/#learn' : base + '/learn.html', { waitUntil: 'domcontentloaded' });
    world = await mountedWorld('#bl-search');
    await world.locator('#bl-search').fill('phylogenetic trees');
    const preview = world.locator('[data-preview-topic="' + id + '"] .bl-preview'); await preview.waitFor();
    assert.equal(await preview.locator('[data-phylogeny-view="0"][data-tree-id="T1"]').count(), 1);
    assert.equal(await preview.locator('[data-phylogeny-edge]').count(), 6);
    assert.equal(await preview.locator('[data-visual-action]').count(), 0);
    await preview.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, 'catalog-preview-390.png') });
    report.checks.push('The actual searchable catalog preview uses the original T1 graph rather than a generic process placeholder.');
    await context.close();
    const denied = await browser.newContext({ viewport: { width: 390, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
    await denied.exposeBinding('__recordPhylogenyCamera', () => { report.cameraRequests++; });
    await denied.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied for this regression scenario', 'SecurityError'); } });
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
        await window.__recordPhylogenyCamera(); throw new Error('Camera forbidden during learning checks');
      };
    });
    page = await denied.newPage(); page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(360000);
    page.on('pageerror', error => report.errors.push(error.message));
    world = await open('learn'); exercise = world.locator('[data-depth-task="investigation"]');
    assert.equal(await world.evaluate(() => { try { void localStorage; return false; } catch (error) { return error.name === 'SecurityError'; } }), true);
    await exercise.locator('textarea').fill(draft);
    await exercise.locator('.bd-answer summary').focus(); await page.keyboard.press('Enter');
    await exercise.locator('[data-depth-rating="revisit"]').focus(); await page.keyboard.press('Enter');
    assert.match(await exercise.locator('.bd-save').innerText(), /Browser storage is unavailable; kept for this visit/);
    await world.locator('[data-mode="advanced"]').focus(); await page.keyboard.press('Enter');
    await world.locator('#bl-mode-advanced[aria-selected="true"]').waitFor();
    assert.equal(await exercise.locator('textarea').inputValue(), draft);
    assert.equal(await exercise.locator('[data-depth-rating="revisit"]').getAttribute('aria-pressed'), 'true');
    await checkPhylogeny(page, world);
    await assertStudyActions(world); await world.locator('[data-depth-export]').focus();
    const [sessionDownload] = await Promise.all([page.waitForEvent('download', { timeout: 360000 }), page.keyboard.press('Enter')]);
    const sessionPath = path.join(output, 'storage-denied-study-notes.md'); await sessionDownload.saveAs(sessionPath);
    const sessionNotes = fs.readFileSync(sessionPath, 'utf8');
    for (const text of [draft, currentTask.answer, currentTask.limitation, ...referenceUrls]) assert.ok(sessionNotes.includes(text));
    await page.screenshot({ path: path.join(output, 'storage-denied-390.png') });
    await denied.close();
    report.checks.push('When localStorage access is explicitly denied, diagrams and self-review remain operable, a mode change preserves visit-only notes, the UI reports the limit, and a real download retains the draft.');
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []); report.complete = true;
  } catch (error) {
    report.failure = error.stack;
    if (page) { report.url = page.url(); await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); }
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close();
  }
  console.log(JSON.stringify({ complete: report.complete, cases: report.responsive.length, errors: report.errors, cameraRequests: report.cameraRequests, artifactSha256: report.artifactSha256 }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
