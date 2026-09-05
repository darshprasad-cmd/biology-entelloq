/* Bounded non-lab smoke. No product writes, accounts, deployment operations,
   or lab rendering. Reuses an existing Playwright installation. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '..', 'biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__usability_test__.cjs'))('playwright');
const storageTabs = process.argv.includes('--storage-tabs');
const followup = process.argv.includes('--followup') || storageTabs;
const base = process.env.BIOLOGY_PREVIEW_URL || (followup ? 'http://127.0.0.1:3002' : 'https://biology.entelloq.com');
const commit = process.env.BIOLOGY_EXPECTED_COMMIT || '50bcfb0ea089199f74a51472105e6c3f16d557d4';
const phase = process.env.BIOLOGY_QA_PHASE || (storageTabs ? 'local-storage-tabs' : followup ? 'local-followup' : 'production-pr6');
assert.match(phase, /^[a-z0-9-]+$/);
const output = path.join(root, 'docs/usability-followup');
fs.mkdirSync(output, { recursive: true });
const report = { base, ...(followup ? { baseCommit: commit } : { commit }), phase, timestamp: new Date().toISOString(), complete: false, http: [], checks: [], errors: [], blockedLabRequests: 0 };
const blobHash = bytes => crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');

async function frameFor(page, view, ready) {
  await page.goto(base + '/app.html#' + view, { waitUntil: 'domcontentloaded', timeout: 20000 });
  const element = await page.locator('#viewFrame').elementHandle();
  const frame = await element.contentFrame();
  await frame.locator(ready).waitFor({ timeout: 15000 });
  return frame;
}

async function checkFollowup(page, context, browser) {
  await page.goto(base + '/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('#landingSkip').waitFor({ state: 'attached' });
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('#landingSkip').evaluate(el => el === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#main-content').evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('main').count(), 1);
  const summary = page.locator('.faq details summary').first();
  await summary.focus(); await summary.press('Enter');
  assert.equal(await summary.evaluate(el => el.parentElement.open), true);
  await summary.press('Enter');
  assert.equal(await summary.evaluate(el => el.parentElement.open), false);
  await page.setViewportSize({ width: 390, height: 844 });
  await summary.scrollIntoViewIfNeeded(); await summary.click();
  await page.screenshot({ path: path.join(output, phase + '-faq-mobile.png'), timeout: 20000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  report.checks.push('Landing: first keyboard stop skips to one main landmark; native FAQ opens/closes by keyboard and fits mobile.');

  await page.setViewportSize({ width: 1440, height: 1000 });
  let frame = await frameFor(page, 'lessons', '#lesson-search');
  const search = frame.locator('#lesson-search');
  await search.fill('osmosis'); await search.focus();
  await search.press('Control+k');
  await page.locator('#cmdk.on').waitFor();
  assert.equal(await page.locator('#cmdkInput').evaluate(el => el === document.activeElement), true);
  await page.locator('#cmdkInput').press('Escape');
  assert.equal(await search.evaluate(el => el === document.activeElement), true);
  assert.equal(await search.inputValue(), 'osmosis');
  await search.press('Meta+k');
  await page.locator('#cmdk.on').waitFor();
  await page.locator('#cmdkInput').press('Escape');
  assert.equal(await search.evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator('#launcher.on').count(), 0);
  report.checks.push('Embedded shortcut: Ctrl+K and Meta+K open only parent search and Escape restores the exact lesson input and its text.');

  frame = await frameFor(page, 'lessons/diffusion', '#lesson-tab-predict');
  await frame.locator('#lesson-tab-predict').click();
  await frame.locator('.les-opt[data-i="0"]').click();
  assert.equal(await frame.locator('#why').evaluate(el => el === document.activeElement), true);
  assert.match(await frame.locator('.les-opt[data-i="0"]').textContent(), /Your choice/);
  assert.match(await frame.locator('.les-opt[data-i="1"]').textContent(), /Correct answer/);
  await frame.locator('#lesson-tab-visual').click();
  await page.goto(base + '/app.html#home', { waitUntil: 'domcontentloaded' });
  frame = await frameFor(page, 'lessons/diffusion', '#lesson-tab-visual');
  assert.equal(await frame.locator('#lesson-tab-visual').getAttribute('aria-selected'), 'true');
  await page.reload({ waitUntil: 'domcontentloaded' });
  frame = await (await page.locator('#viewFrame').elementHandle()).contentFrame();
  await frame.locator('#lesson-tab-visual').waitFor();
  assert.equal(await frame.locator('#lesson-tab-visual').getAttribute('aria-selected'), 'true');
  await frame.locator('#lesson-tab-predict').click();
  assert.equal(await frame.locator('.les-opt:disabled').count(), 4);
  assert.match(await frame.locator('.les-opt[data-i="0"]').textContent(), /Your choice/);
  assert.match(await frame.locator('#lesson-save-status').textContent(), /last lens and prediction only/);
  await page.screenshot({ path: path.join(output, phase + '-resumed-prediction-desktop.png'), timeout: 20000 });
  await frame.getByRole('button', { name: 'Try prediction again', exact: true }).click();
  assert.equal(await frame.locator('.les-opt:disabled').count(), 0);
  assert.equal(await frame.locator('.les-opt[data-i="0"]').evaluate(el => el === document.activeElement), true);
  await frame.locator('.les-opt[data-i="1"]').click();
  assert.match(await frame.locator('.les-opt[data-i="1"]').textContent(), /Correct answer.*Your choice/);
  frame = await frameFor(page, 'lessons/enzyme', '#lesson-tab-experience');
  assert.equal(await frame.locator('#lesson-tab-experience').getAttribute('aria-selected'), 'true');
  await frame.locator('#lesson-tab-predict').click();
  assert.equal(await frame.locator('.les-opt:disabled').count(), 0);
  await page.evaluate(() => localStorage.setItem('bioq_lessons_v1', '{broken json'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  frame = await (await page.locator('#viewFrame').elementHandle()).contentFrame();
  await frame.locator('#lesson-tab-experience').waitFor();
  assert.equal(await frame.locator('#lesson-tab-experience').getAttribute('aria-selected'), 'true');
  await page.evaluate(() => localStorage.setItem('bioq_lessons_v1', JSON.stringify({ version: 1, lessons: { enzyme: { lens: 'predict', prediction: 3, signature: 'old-question' } } })));
  await page.reload({ waitUntil: 'domcontentloaded' });
  frame = await (await page.locator('#viewFrame').elementHandle()).contentFrame();
  await frame.locator('#lesson-tab-predict').waitFor();
  assert.equal(await frame.locator('#lesson-tab-predict').getAttribute('aria-selected'), 'true');
  assert.equal(await frame.locator('.les-opt:disabled').count(), 0, 'A stale question signature cannot restore an obsolete answer');
  report.checks.push('Lesson resume: exact last lens and prediction survive return/reload, textual feedback and explicit retake work, lessons remain independent, malformed/stale data recovers.');
  await context.close();

  // A separate isolated context models denied browser storage; never mutate the
  // real user's browser profile or test against an authenticated account.
  const denied = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await denied.route('**/lab.html*', route => { report.blockedLabRequests++; return route.abort('blockedbyclient'); });
  await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Storage disabled for test', 'SecurityError'); } }));
  const deniedPage = await denied.newPage();
  deniedPage.setDefaultTimeout(15000);
  deniedPage.on('pageerror', error => report.errors.push(error.message));
  frame = await frameFor(deniedPage, 'lessons/diffusion', '#lesson-save-status');
  assert.match(await frame.locator('#lesson-save-status').textContent(), /This visit only.*storage is unavailable/);
  await frame.locator('#lesson-tab-predict').click();
  await frame.locator('.les-opt[data-i="1"]').click();
  assert.equal(await frame.locator('.les-opt:disabled').count(), 4);
  await frame.locator('#lesson-save-status').scrollIntoViewIfNeeded();
  await deniedPage.screenshot({ path: path.join(output, phase + '-storage-unavailable-mobile.png'), timeout: 20000 });
  assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  report.checks.push('Denied storage: mobile lesson remains usable and labels progress as this visit only; no false saved-state claim.');
  await denied.close();
}

async function checkStorageTabs(pageA, context) {
  report.navigation = [];
  for (const width of [320, 390]) {
    await pageA.setViewportSize({ width, height: 844 });
    await pageA.goto(base + '/index.html', { waitUntil: 'domcontentloaded' });
    await pageA.locator('#nav .bq-acct').waitFor();
    const nav = await pageA.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width, height: r.height }; };
      return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1,
        brand: rect('#nav .brand'), signIn: rect('#nav .bq-acct'), cta: rect('#nav .nav-cta>.btn'),
        ctaWhiteSpace: getComputedStyle(document.querySelector('#nav .nav-cta>.btn')).whiteSpace };
    });
    report.navigation.push(nav);
    assert.equal(nav.overflow, false);
    assert.equal(nav.ctaWhiteSpace, 'nowrap');
    assert.ok(nav.cta.height >= 42 && nav.cta.height <= 50, 'Compact CTA touch height at ' + width);
    assert.ok(nav.brand.left >= 0 && nav.cta.right <= width + 1);
    assert.ok(nav.brand.right <= nav.signIn.left + 1 && nav.signIn.right <= nav.cta.left + 1, 'No nav overlap at ' + width);
  }
  const summary = pageA.locator('.faq details summary').first();
  await summary.scrollIntoViewIfNeeded(); await summary.click();
  await pageA.screenshot({ path: path.join(output, phase + '-faq-mobile.png'), timeout: 20000 });
  report.checks.push('Final landing header: single-line 44-pixel entry CTA, no brand/sign-in overlap or horizontal overflow at 320 and 390 pixels.');
  await pageA.setViewportSize({ width: 1440, height: 1000 });
  const pageB = await context.newPage();
  pageB.setDefaultTimeout(15000);
  pageB.on('pageerror', error => report.errors.push(error.message));
  let frameA = await frameFor(pageA, 'lessons/diffusion', '#lesson-tab-predict');
  let frameB = await frameFor(pageB, 'lessons/enzyme', '#lesson-tab-math');
  // Both documents have loaded their in-memory state before either change.
  await frameA.locator('#lesson-tab-predict').click();
  await frameA.locator('.les-opt[data-i="1"]').click();
  await frameB.locator('#lesson-tab-math').click();
  await pageA.reload({ waitUntil: 'domcontentloaded' });
  frameA = await (await pageA.locator('#viewFrame').elementHandle()).contentFrame();
  await frameA.locator('#lesson-tab-predict').waitFor();
  assert.equal(await frameA.locator('#lesson-tab-predict').getAttribute('aria-selected'), 'true');
  assert.equal(await frameA.locator('.les-opt:disabled').count(), 4);
  assert.match(await frameA.locator('.les-opt[data-i="1"]').textContent(), /Correct answer.*Your choice/);
  report.checks.push('Two preloaded pages: Enzyme Math change preserves the other page\'s saved Diffusion prediction.');

  frameA = await frameFor(pageA, 'lessons/population', '#lesson-tab-predict');
  frameB = await frameFor(pageB, 'lessons/population', '#lesson-tab-math');
  await frameA.locator('#lesson-tab-predict').click();
  await frameA.locator('.les-opt[data-i="1"]').click();
  await frameB.locator('#lesson-tab-math').click();
  await pageA.reload({ waitUntil: 'domcontentloaded' });
  frameA = await (await pageA.locator('#viewFrame').elementHandle()).contentFrame();
  await frameA.locator('#lesson-tab-math').waitFor();
  assert.equal(await frameA.locator('#lesson-tab-math').getAttribute('aria-selected'), 'true');
  await frameA.locator('#lesson-tab-predict').click();
  assert.equal(await frameA.locator('.les-opt:disabled').count(), 4);
  assert.match(await frameA.locator('.les-opt[data-i="1"]').textContent(), /Correct answer.*Your choice/);
  await pageA.screenshot({ path: path.join(output, phase + '-preserved-prediction.png'), timeout: 20000 });
  report.checks.push('Two preloaded pages on one lesson: a stale lens-only change preserves the other page\'s newer prediction while saving the new lens.');

  frameA = await frameFor(pageA, 'lessons/respiration', '#lesson-tab-predict');
  frameB = await frameFor(pageB, 'lessons/respiration', '#lesson-tab-predict');
  await frameA.locator('#lesson-tab-predict').click();
  await frameB.locator('#lesson-tab-predict').click();
  await frameA.locator('.les-opt[data-i="0"]').click();
  await frameB.locator('.les-opt[data-i="1"]').click();
  assert.equal(await frameB.locator('.les-opt:disabled').count(), 4);
  assert.match(await frameB.locator('.les-opt[data-i="0"]').textContent(), /Your choice/);
  await frameB.getByRole('button', { name: 'Try prediction again', exact: true }).click();
  await frameB.locator('.les-opt[data-i="1"]').click();
  assert.match(await frameB.locator('.les-opt[data-i="1"]').textContent(), /Correct answer.*Your choice/);
  await pageA.reload({ waitUntil: 'domcontentloaded' });
  frameA = await (await pageA.locator('#viewFrame').elementHandle()).contentFrame();
  await frameA.locator('#lesson-tab-predict').waitFor();
  assert.match(await frameA.locator('.les-opt[data-i="1"]').textContent(), /Correct answer.*Your choice/);
  report.checks.push('Stale answer attempt shows the retained first prediction; explicit retake saves a new prediction visible after the other page reloads.');
  await context.close();
}

(async () => {
  let browser;
  try {
    for (const file of (followup ? [] : ['app.html', 'lessons.html', 'solve.html', 'lab.html'])) {
      const response = await fetch(base + '/' + file, { signal: AbortSignal.timeout(15000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      const actual = blobHash(bytes);
      const expected = execFileSync('git', ['rev-parse', commit + ':' + file], { cwd: root, encoding: 'utf8' }).trim();
      report.http.push({ file, status: response.status, bytes: bytes.length, gitBlob: actual, expected, matches: actual === expected });
      assert.equal(response.status, 200, file + ' HTTP response');
      assert.equal(actual, expected, file + ' must match the requested deployment commit');
    }
    if (!followup) report.checks.push('Four HTTPS artifacts match the requested Git commit, including the unchanged lab fetched as bytes only.');
    if (!followup && base.startsWith('https://biology.entelloq.com')) {
      const response = await fetch('https://api.github.com/repos/darshprasad-cmd/biology-entelloq/actions/runs?head_sha=' + commit + '&per_page=20', { signal: AbortSignal.timeout(15000) });
      const data = await response.json();
      report.workflows = (data.workflow_runs || []).map(run => ({ id: run.id, name: run.name, status: run.status, conclusion: run.conclusion, url: run.html_url }));
    }
    browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'dark' });
    await context.route('**/lab.html*', route => { report.blockedLabRequests++; return route.abort('blockedbyclient'); });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => report.errors.push(error.message));
    if (followup) {
      if (storageTabs) await checkStorageTabs(page, context);
      else await checkFollowup(page, context, browser);
      assert.deepEqual(report.errors, []);
      report.complete = true;
      return;
    }
    await page.goto(base + '/app.html#home', { waitUntil: 'domcontentloaded' });
    await page.locator('#learningPaths').waitFor();
    assert.equal(await page.locator('#learningPaths .tile:not([hidden])').count(), 8);
    assert.equal(await page.locator('#launcher.on').count(), 0);
    await page.screenshot({ path: path.join(output, phase + '-home-desktop.png'), timeout: 20000 });
    await page.locator('#searchBtn').click();
    await page.locator('#cmdkInput').fill('enzyme');
    await page.locator('#cmdkInput').press('Enter');
    await page.waitForURL(/#lessons\/enzyme/);
    report.checks.push('Production Home renders and keyboard search navigates to the Enzyme Action lesson.');
    let frame = await frameFor(page, 'lessons', '#lesson-search');
    await frame.locator('#lesson-search').fill('impossiblequery987');
    assert.equal(await frame.locator('.les-card:not([hidden])').count(), 0);
    await frame.getByRole('button', { name: 'Show all lessons', exact: true }).click();
    assert.equal(await frame.locator('.les-card:not([hidden])').count(), 9);
    await page.screenshot({ path: path.join(output, phase + '-lessons-desktop.png'), timeout: 20000 });
    report.checks.push('Production Lessons search has a recoverable empty state and all nine original lessons.');
    frame = await frameFor(page, 'solve/cell', '#svConfigCard');
    assert.equal(await frame.locator('[data-group="topic"][aria-checked="true"]').getAttribute('data-val'), 'Cell Biology');
    const topic = frame.locator('[data-group="topic"][aria-checked="true"]');
    await topic.focus(); await topic.press('ArrowRight');
    assert.equal(await frame.locator('[data-group="topic"][aria-checked="true"]').getAttribute('data-val'), 'Genetics & DNA');
    await frame.locator('[data-group="mode"][data-val="practice"]').click();
    await frame.locator('[data-act="start"]').focus(); await frame.locator('[data-act="start"]').press('Enter');
    assert.equal(await frame.locator('#svCounter').textContent(), '1');
    await frame.locator('[data-act="skip"]').focus(); await frame.locator('[data-act="skip"]').press('Enter');
    assert.match(await frame.locator('#svPrimary').textContent(), /Next question/);
    await frame.locator('#svPrimary').focus(); await frame.locator('#svPrimary').press('Enter');
    assert.equal(await frame.locator('#svCounter').textContent(), '2');
    report.checks.push('Production Solve accepts topic deep links and keyboard configuration, session start, explanation and next question.');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(base + '/app.html#home', { waitUntil: 'domcontentloaded' });
    await page.locator('#learningPaths').waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({ path: path.join(output, phase + '-home-mobile.png'), timeout: 20000 });
    assert.deepEqual(report.errors, []);
    report.checks.push('Production mobile Home fits the viewport; no uncaught errors across the smoke.');
    report.complete = true;
    await context.close();
  } catch (error) {
    report.failure = error.message;
    throw error;
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(path.join(output, phase + '.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
