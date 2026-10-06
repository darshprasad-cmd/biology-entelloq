/* Real source / single-file / deployed learning UI; synthetic browser input, no camera. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const { chromium } = createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules', '__expansion__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3027').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_EXPANSION_PACKAGED === '1';
const output = path.resolve(process.env.BIOLOGY_EXPANSION_OUTPUT || path.join(root, 'docs/library-expansion/browser'));
fs.mkdirSync(output, { recursive: true });
const report = { base, packaged, complete: false, checks: [], errors: [], cameraRequests: 0 };
const ids = 'water carbohydrates lipids proteins gene-regulation sex-linked-inheritance pedigrees hardy-weinberg speciation phylogenetic-trees biodiversity conservation fungi microbiome recombinant-dna dna-sequencing bioinformatics surface-area-volume digestive-system nutrient-absorption endocrine-system insulin-glucagon kidney nephron osmoregulation muscle-contraction reproductive-anatomy gametogenesis fertilization innate-immunity plant-tissues plant-hormones tropisms plant-reproduction pollination seed-germination'.split(' ');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => report.errors.push(error.message));
    // Count in Node, not in a document that navigation can discard. This catches
    // an accidental request even if the application catches the denied promise.
    await context.exposeBinding('__recordExpansionCameraRequest', () => { report.cameraRequests++; });
    await context.addInitScript(() => {
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
        await window.__recordExpansionCameraRequest();
        throw new Error('Camera forbidden in learning checks');
      };
    });
    async function open(section, route, ready) {
      const url = packaged ? base + '/#' + section + (route ? '/' + route : '') : base + '/' + section + '.html#' + route;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      let world = page;
      if (packaged) {
        const shell = await (await page.locator('#bioq-workspace').elementHandle()).contentFrame();
        await shell.locator('#viewFrame.on').waitFor();
        world = await (await shell.locator('#viewFrame').elementHandle()).contentFrame();
      }
      await world.locator(ready).first().waitFor();
      return world;
    }
    if (packaged) {
      const expected = path.resolve(process.env.BIOLOGY_DEPLOYED_ARTIFACT || path.join(root, 'dist/index.html'));
      const response = await page.request.get(base + '/', { timeout: 180000, headers: { 'Cache-Control': 'no-cache' } });
      assert.equal(response.status(), 200);
      const served = await response.body();
      assert.ok(served.equals(fs.readFileSync(expected)), 'served page must match the independently verified artifact byte for byte');
      report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    }
    let world = await open('learn', 'library', '#bl-search');
    assert.equal(await world.evaluate(() => BIO_LIBRARY.topics.length), 109);
    assert.equal(await world.locator('[data-learning-path]').count(), 3);
    assert.equal(await world.locator('[data-learning-path][open]').count(), 0);
    assert.equal(await world.locator('[data-learning-path] a').count(), 12);
    const pathTargets = await world.locator('[data-learning-path] a').evaluateAll(nodes => nodes.map(n => n.hash.split('/')[1]));
    assert.ok(await world.evaluate(ids => ids.every(id => BIO_LIBRARY.topics.some(t => t.id === id)), pathTargets));
    await world.locator('[data-learning-path] summary').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await world.locator('[data-learning-path][open]').count(), 1);
    await world.locator('#bl-curriculum').selectOption('neet');
    await world.locator('#bl-search').fill('kidney');
    await world.locator('[data-preview-topic="kidney"]').waitFor();
    assert.ok(await world.locator('[data-preview-topic="kidney"]').innerText().then(t => t.includes('Kidney') || t.includes('kidney')));
    await world.locator('#bl-clear').click();
    await world.locator('[data-scope="all"]').click();
    assert.equal(await world.locator('.bl-topicrow').count(), 109);
    assert.equal(await world.locator('.bl-topicgroup').count(), 13);
    report.checks.push('All 109 concepts are browsable in 13 fields; NEET and search discover the new kidney lesson.');
    await page.screenshot({ path: path.join(output, 'catalog-desktop.png') });
    for (const id of ids) {
      // Packaged srcdoc frames use virtual locations rewritten at build time.
      // Exercise the public outer route, not srcdoc's unrelated native fragment.
      if (packaged) await page.evaluate(id => { location.hash = 'learn/topic/' + id + '/scientific'; }, id);
      else await world.evaluate(id => { location.hash = 'topic/' + id + '/scientific'; }, id);
      await world.locator('[data-depth-topic="' + id + '"]').waitFor();
      assert.equal(await world.locator('.bd-mechanism details').count(), 3, id);
      assert.equal(await world.locator('[data-depth-task]').count(), 2, id);
      assert.equal(await world.locator('.bl-modes [role="tab"]').count(), 6, id);
      assert.ok(await world.locator('.bl-diagram svg').count(), id + ' has a rendered conceptual diagram');
      for (const mode of ['layman', 'intuition', 'visual', 'scientific', 'advanced', 'realWorld']) {
        await world.locator('[data-mode="' + mode + '"]').click();
        await world.locator('[data-mode="' + mode + '"][aria-selected="true"]').waitFor();
        assert.ok((await world.locator('.bl-prose').textContent()).trim().length > 80, id + ': ' + mode);
      }
    }
    report.checks.push('All 36 additions render six usable explanation modes, conceptual diagrams, mechanisms and both evidence tasks.');
    world = await open('learn', 'topic/nephron/advanced', '[data-depth-topic="nephron"]');
    const beforeJump = await (packaged ? page : world).evaluate(() => location.hash);
    for (const id of ['bl-visual', 'bd-title', 'bl-check-title', 'bl-terms-title']) {
      await world.locator('[data-lesson-section="' + id + '"]').click();
      assert.equal(await world.locator('#' + id).evaluate(el => el === document.activeElement), true, id + ' receives focus');
      assert.equal(await (packaged ? page : world).evaluate(() => location.hash), beforeJump, 'section jump preserves the concept/mode route');
    }
    assert.equal(await world.locator('.bl-terms').evaluate(el => el.open), true);
    report.checks.push('Three suggested paths resolve to completed concepts; keyboard disclosure and all four lesson jumps preserve routing and focus.');
    const draft = 'Filtration and selective reabsorption are different processes; compare the quantities before making a claim.';
    await world.locator('[data-depth-task="investigation"] textarea').fill(draft);
    await world.locator('[data-depth-task="investigation"] .bd-answer summary').click();
    await world.locator('[data-depth-rating="revisit"]').first().click();
    world = await open('reason', 'learn/nephron/advanced', '[data-depth-topic="nephron"]');
    assert.equal(await world.locator('[data-depth-task="investigation"] textarea').inputValue(), draft);
    world = await open('solve', 'learn/nephron/advanced', '[data-depth-topic="nephron"]');
    assert.equal(await world.locator('.tp-dot').count(), 3);
    await world.locator('.tp-options input').first().check();
    await world.locator('.tp-submit').click();
    await world.locator('.tp-next').waitFor();
    assert.equal(await world.locator('[data-depth-task="transfer"]').count(), 1);
    report.checks.push('A new topic keeps its evidence draft across Learn/Reason and has three graded checks plus transfer practice in Solve.');
    for (const id of ids) {
      if (packaged) await page.evaluate(id => { location.hash = 'solve/learn/' + id + '/advanced'; }, id);
      else await world.evaluate(id => { location.hash = 'learn/' + id + '/advanced'; }, id);
      await world.locator('[data-depth-topic="' + id + '"]').waitFor();
      const questions = await world.evaluate(id => BioPractice.questionsFor(BIO_LIBRARY.topics.find(t => t.id === id)), id);
      for (let index = 0; index < questions.length; index++) {
        await world.locator('.tp-dot').nth(index).click();
        if (await world.locator('.tp-submit').count()) {
          await world.locator('.tp-options input').first().check();
          await world.locator('.tp-submit').click();
        }
        const explanation = world.locator('.tp-feedback .bioq-exam-answer');
        await explanation.waitFor();
        assert.equal(await explanation.locator('.be-options dl > div').count(), questions[index].options.length, id + ': every option has its own rationale');
        assert.ok((await explanation.locator('.be-direct').innerText()).includes(questions[index].options[questions[index].answer]), id + ': feedback matches the actual answer');
      }
    }
    report.checks.push('All 108 new questions display graded feedback and a distinct authored rationale for each option inside the real Solve flow.');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      for (const route of ['library', 'topic/nephron/advanced']) {
        world = await open('learn', route, route === 'library' ? '#bl-search' : '[data-depth-topic="nephron"]');
        assert.ok(await world.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + ': ' + route + ' must not overflow');
        const target = route === 'library' ? world.locator('#bl-search') : world.locator('[data-mode="scientific"]');
        await target.focus();
        assert.equal(await target.evaluate(el => el === document.activeElement), true);
        const duplicateIds = await world.locator('#bioLibrary').evaluate(el => {
          const values = [...el.querySelectorAll('[id]')].map(n => n.id);
          return values.filter((id, i) => values.indexOf(id) !== i);
        });
        assert.deepEqual(duplicateIds, []);
        if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, (route === 'library' ? 'catalog' : 'lesson') + '-' + width + '.png') });
      }
    }
    await world.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    await page.screenshot({ path: path.join(output, 'lesson-light.png') });
    report.checks.push('Catalog and new lesson retain keyboard access and unique IDs at 320/390/768/1440 px without horizontal overflow; light theme captured.');
    assert.equal(report.cameraRequests, 0);
    assert.deepEqual(report.errors, []);
    report.complete = true;
    console.log(JSON.stringify(report, null, 2));
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
