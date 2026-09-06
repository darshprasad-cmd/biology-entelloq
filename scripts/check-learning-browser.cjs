/* Focused non-lab UI verification. A single browser; no lab navigation or input.
   Usage: BIOLOGY_PLAYWRIGHT_MODULES=/path/to/node_modules node scripts/check-learning-browser.cjs --baseline
   Local convenience fallback reuses the existing sibling prototype's test tools.
   Serve the repository first; override BIOLOGY_PREVIEW_URL when not on port 3001. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '..', 'biology-entelloq', 'node_modules');
const testRequire = createRequire(path.join(modules, '__learning_test__.cjs'));
const { chromium } = testRequire('playwright');
const base = process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3001';
const output = path.join(root, 'docs', 'learning-polish');
const baseline = process.argv.includes('--baseline');
const homeCaptureOnly = process.argv.includes('--capture-home');
const report = { phase: baseline ? 'before' : 'after', base, completed: false, reducedMotion: true, labRequestsBlocked: 0, observations: [], checks: [] };
fs.mkdirSync(output, { recursive: true });

async function shell(page, view) {
  await page.goto(base + '/app.html#' + view, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.locator('#homeIn .cc-map-grid .cc-node').first().waitFor({ state: 'attached', timeout: 15000 });
  if (view === 'home') return page;
  const iframe = page.locator('#viewFrame');
  await iframe.waitFor({ state: 'visible', timeout: 15000 });
  const frame = await (await iframe.elementHandle()).contentFrame();
  await frame.locator('h1').first().waitFor({ timeout: 15000 });
  return frame;
}

async function observe(page, name, frame = page) {
  const data = await frame.evaluate(() => ({
    title: document.title,
    headings: [...document.querySelectorAll('h1,h2')].map(x => x.textContent.trim()).slice(0, 16),
    inputLabels: [...document.querySelectorAll('input:not([type=hidden])')].map(x => ({ id: x.id, label: x.getAttribute('aria-label') || x.placeholder })),
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  report.observations.push({ name, ...data });
  return data;
}

async function checkLessons(page) {
  const frame = await shell(page, 'lessons');
  const search = frame.locator('#lesson-search');
  const visibleCards = frame.locator('.les-card:not([hidden])');
  assert.equal(await visibleCards.count(), 9, 'All original lessons are available');
  await search.fill('induced fit');
  assert.equal(await visibleCards.count(), 1);
  assert.equal(await visibleCards.first().getAttribute('data-lesson'), 'enzyme');
  await frame.locator('#lesson-domain').selectOption('Cell Biology');
  assert.equal(await visibleCards.count(), 0, 'Filters must intersect');
  await frame.getByRole('button', { name: 'Show all lessons', exact: true }).click();
  assert.equal(await visibleCards.count(), 9);
  assert.equal(await search.evaluate(el => el === document.activeElement), true, 'Clear returns focus to search');
  await search.fill('<img src=x onerror=alert(1)>');
  assert.equal(await visibleCards.count(), 0);
  assert.equal(await frame.locator('.les-empty img').count(), 0, 'Search input must remain text');
  await frame.getByRole('button', { name: 'Show all lessons', exact: true }).click();
  await frame.locator('[data-lesson="diffusion"]').click();
  const tab = frame.getByRole('tab', { name: 'Experience', exact: true });
  await tab.focus();
  await tab.press('ArrowRight');
  const predict = frame.getByRole('tab', { name: 'Predict', exact: true });
  assert.equal(await predict.getAttribute('aria-selected'), 'true');
  assert.equal(await predict.evaluate(el => el === document.activeElement), true);
  await predict.press('End');
  assert.equal(await frame.locator('.les-tab').last().getAttribute('aria-selected'), 'true');
  await frame.locator('.les-tab').last().press('Home');
  assert.equal(await tab.getAttribute('aria-selected'), 'true');
  assert.equal(await frame.locator('.les-tab[tabindex="0"]').count(), 1, 'Only one tab belongs in the tab sequence');
  report.checks.push('Lessons: 9 originals, intersecting search/domain filters, safe empty state, reset focus and Arrow/Home/End lens navigation.');
}

async function checkReason(page) {
  const frame = await shell(page, 'reason');
  const search = frame.locator('#rzSearch');
  const count = await frame.locator('.rz-workout').count();
  assert.ok(count > 2);
  await search.fill('impossiblequery987');
  assert.equal(await frame.locator('.rz-workout').count(), 0);
  await frame.getByRole('button', { name: 'Show all workouts', exact: true }).click();
  assert.equal(await frame.locator('.rz-workout').count(), count);
  assert.equal(await search.evaluate(el => el === document.activeElement), true);
  await frame.locator('.rz-workout').first().click();
  assert.match(await frame.locator('#rzProgressLabel').textContent(), /Step 1 of 7/);
  await frame.getByRole('button', { name: 'Begin reasoning →', exact: true }).click();
  assert.match(await frame.locator('#rzProgressLabel').textContent(), /Step 2 of 7/);
  await frame.locator('.rz-mo').first().focus();
  await frame.locator('.rz-mo').first().press('Space');
  assert.equal(await frame.locator('.rz-mo').first().getAttribute('aria-pressed'), 'true');
  await frame.getByRole('button', { name: 'Check my selection', exact: true }).click();
  assert.ok(await frame.locator('.rz-answer-label').count() > 1, 'Answers have text labels, not color alone');
  await frame.getByRole('button', { name: 'Continue →', exact: true }).last().click();
  assert.match(await frame.locator('#rzProgressLabel').textContent(), /Step 3 of 7/);
  assert.equal(await frame.locator('.rz-node[aria-current="step"]').count(), 1);
  report.checks.push('Reason: recoverable empty filters, preserved workout flow, keyboard multi-select, textual feedback and accurate current step.');
}

async function openShellSearch(page) {
  const topSearch = page.locator('#topSearch');
  if (await topSearch.isVisible()) {
    await topSearch.click();
    return topSearch;
  }
  // The mobile header keeps Explore visible; its Search Biology action opens
  // the same shell palette and returns focus to that visible header control.
  const explore = page.locator('#exploreBtn');
  await explore.click();
  await page.locator('#bq-explore[open]').waitFor({ state: 'visible' });
  await page.locator('#exploreSearch').click();
  await page.locator('#bq-explore').waitFor({ state: 'hidden' });
  return explore;
}

async function checkSearch(page) {
  await shell(page, 'home');
  const trigger = await openShellSearch(page);
  await page.locator('#cmdkInput').fill('<img src=x onerror=alert(1)>');
  assert.equal(await page.locator('#cmdkList img').count(), 0, 'Search string cannot become HTML');
  await page.locator('#cmdkInput').press('Escape');
  assert.equal(await trigger.evaluate(el => el === document.activeElement), true, 'Search closes back to its trigger');
  await openShellSearch(page);
  await page.locator('#cmdkInput').fill('osmosis');
  assert.ok(await page.locator('#cmdkInput').getAttribute('aria-activedescendant'));
  await page.locator('#cmdkInput').press('Tab');
  assert.equal(await page.locator('#cmdkClose').evaluate(el => el === document.activeElement), true);
  await page.locator('#cmdkClose').press('Shift+Tab');
  assert.equal(await page.locator('#cmdkInput').evaluate(el => el === document.activeElement), true);
  await page.locator('#cmdkInput').press('Enter');
  await page.waitForURL(/#lessons\/diffusion/, { timeout: 10000 });
  report.checks.push('Shell search: literal markup input, Escape focus restore and keyboard deep link to osmosis lesson.');
}

async function checkHome(page) {
  await shell(page, 'home');
  const hash = new URL(page.url()).hash;
  const map = page.locator('#homeIn .cc-map');
  assert.equal(await map.locator('.cc-node').count(), 8, 'All Biology fields are available in the map');
  assert.equal(await map.getByRole('heading', { name: 'Your Biology Map', exact: true }).count(), 1);
  const choosePath = page.locator('#choosePath');
  await choosePath.click();
  const dialog = page.locator('#bq-explore');
  await dialog.waitFor({ state: 'visible' });
  assert.equal(new URL(page.url()).hash, hash, 'Opening Explore must not invoke the section router');
  assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true, 'Explore owns keyboard focus while open');
  for (const [group, count] of [['understand', 3], ['practise', 3], ['personal', 2], ['all', 8]]) {
    await dialog.locator('[data-path-group="' + group + '"]').click();
    assert.equal(await dialog.locator('#learningPaths .tile:not([hidden])').count(), count);
    assert.equal(await dialog.locator('[data-path-group][aria-pressed="true"]').count(), 1);
    assert.equal(await dialog.locator('[data-path-group="' + group + '"]').getAttribute('aria-pressed'), 'true');
  }
  await dialog.locator('#exploreClose').press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await choosePath.evaluate(el => el === document.activeElement), true, 'Closing Explore returns focus to its opener');
  const activity = await page.evaluate(() => localStorage.getItem('bioq_activity'));
  try {
    for (const value of ['null', '{"counts":{"learn":"oops","solve":-9},"last":{"k":"constructor","sub":"<img>"}}']) {
      await page.evaluate(data => localStorage.setItem('bioq_activity', data), value);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#homeIn .cc-map-grid .cc-node').first().waitFor();
      assert.equal(await page.locator('#homeIn .cc-map-grid .cc-node').count(), 8);
      const resume = page.locator('#homeIn .cc-hero [data-go]');
      assert.equal(await resume.getAttribute('data-go'), 'lessons');
      assert.equal(await resume.getAttribute('data-sub'), 'diffusion');
      assert.match(await resume.textContent(), /Start exploring/);
      assert.equal(await page.locator('#homeIn .cc-hero img').count(), 0);
      assert.equal(await page.locator('#launcher.on').count(), 0);
      assert.ok(!(await page.locator('#homeIn').textContent()).includes('NaN'));
      await page.locator('#exploreBtn').click();
      assert.equal(await page.locator('#learningPaths .tile').count(), 8);
      await page.locator('#exploreClose').click();
    }
  } finally {
    await page.evaluate(value => value === null ? localStorage.removeItem('bioq_activity') : localStorage.setItem('bioq_activity', value), activity);
  }
  report.checks.push('Home: eight Biology fields, all Explore route groups, pressed-state feedback, modal opener focus and a safe first lesson after null/malformed local activity.');
}

async function checkExploreAndLearn(page) {
  let frame = await shell(page, 'explore');
  const originalCount = await frame.locator('#dzList .dz-item').count();
  assert.ok(originalCount > 5);
  await frame.locator('#dzSearch').fill('impossiblequery987');
  await frame.locator('#dzReset').click();
  assert.equal(await frame.locator('#dzSearch').inputValue(), '');
  assert.equal(await frame.locator('#dzFilters [aria-pressed="true"]').count(), 1);
  assert.equal(await frame.locator('#dzFilters [data-cat="All"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await frame.locator('#dzSearch').evaluate(el => el === document.activeElement), true);
  assert.equal(await frame.locator('#dzList .dz-item').count(), originalCount);
  assert.ok(!(await frame.locator('#dzCount').textContent()).startsWith('0'));
  frame = await shell(page, 'learn');
  await frame.locator('#catalog a').filter({ hasText: 'Interactive Cell Explorer' }).click();
  assert.ok(frame.url().endsWith('#cell'));
  assert.equal(await frame.locator('#catalog article').filter({ hasText: 'Histology Viewer' }).locator('a,button').count(), 0);
  await frame.locator('#catalog a').filter({ hasText: 'Human Anatomy Explorer' }).click();
  await page.waitForURL(/#explore\/atlas/, { timeout: 10000 });
  report.checks.push('Learn/Explore: supported Cell and Anatomy cards open real destinations; reference-only card is not a dead control; disease filters recover and restore focus.');
}

async function checkSolve(page) {
  const frame = await shell(page, 'solve/cell');
  assert.equal(await frame.locator('[data-group="topic"][aria-checked="true"]').getAttribute('data-val'), 'Cell Biology');
  const topic = frame.locator('[data-group="topic"][aria-checked="true"]');
  await topic.focus();
  await topic.press('ArrowRight');
  assert.equal(await frame.locator('[data-group="topic"][aria-checked="true"]').getAttribute('data-val'), 'Genetics & DNA');
  assert.equal(await frame.locator('[data-group="topic"][tabindex="0"]').count(), 1);
  await frame.locator('[data-group="topic"][aria-checked="true"]').press('ArrowLeft');
  await frame.locator('[data-group="mode"][data-val="practice"]').click();
  await frame.locator('[data-act="start"]').focus();
  await frame.locator('[data-act="start"]').press('Enter');
  assert.equal(await frame.locator('#svCounter').textContent(), '1');
  await frame.locator('[data-act="skip"]').focus();
  await frame.locator('[data-act="skip"]').press('Enter');
  // Practice mode deliberately reveals the explanation before advancing.
  assert.equal(await frame.locator('#svCounter').textContent(), '1');
  assert.match(await frame.locator('#svPrimary').textContent(), /Next question/);
  await frame.locator('#svPrimary').focus();
  await frame.locator('#svPrimary').press('Enter');
  assert.equal(await frame.locator('#svCounter').textContent(), '2');
  const stem = await frame.locator('#svStem').textContent();
  await page.goto(base + '/app.html#solve/genetics', { waitUntil: 'domcontentloaded' });
  assert.equal(await frame.locator('#svCounter').textContent(), '2', 'A new topic link cannot reset an in-flight session');
  assert.equal(await frame.locator('#svStem').textContent(), stem);
  report.checks.push('Solve: Cell Biology deep link, radio arrow keys/roving focus, keyboard session start/skip and no in-flight reset when topic changes.');
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', colorScheme: 'dark' });
    await context.route('**/lab.html*', route => { report.labRequestsBlocked++; return route.abort('blockedbyclient'); });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    report.errors = errors;
    page.on('pageerror', error => errors.push(error.message));
    if (homeCaptureOnly) {
      await shell(page, 'home');
      await page.screenshot({ path: path.join(output, 'after-home-desktop.png'), timeout: 20000 });
      // Recreate the baseline's real navigation history for a comparable resume
      // card. Do not seed or alter application data to manufacture a screenshot.
      for (const view of ['lessons', 'reason', 'learn', 'solve', 'explore', 'me']) await shell(page, view);
      await page.setViewportSize({ width: 390, height: 844 });
      await shell(page, 'home');
      await page.screenshot({ path: path.join(output, 'after-home-mobile.png'), timeout: 20000 });
      assert.deepEqual(errors, []);
      report.completed = true;
      report.checks.push('Home screenshots refreshed after copy-only edits; no full interaction suite rerun.');
      await context.close();
      return;
    }
    await shell(page, 'home');
    await observe(page, 'home-desktop');
    await page.screenshot({ path: path.join(output, report.phase + '-home-desktop.png'), fullPage: false, timeout: 20000 });
    const lessons = await shell(page, 'lessons');
    if (!baseline) {
      assert.equal(await lessons.locator('#eqx-fab').evaluate(el => getComputedStyle(el).display), 'none');
      assert.equal(await page.locator('#eqx-fab').isVisible(), true);
      report.checks.push('Embedded sections use one parent ecosystem switcher; child switcher is hidden without modifying standalone pages.');
    }
    await observe(page, 'lessons-desktop', lessons);
    await page.screenshot({ path: path.join(output, report.phase + '-lessons-desktop.png'), fullPage: false, timeout: 20000 });
    for (const view of ['reason', 'learn', 'solve', 'explore', 'me']) {
      const frame = await shell(page, view);
      await observe(page, view + '-desktop', frame);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await shell(page, 'home');
    await observe(page, 'home-mobile');
    await page.screenshot({ path: path.join(output, report.phase + '-home-mobile.png'), fullPage: false, timeout: 20000 });
    report.errors = errors;
    if (!baseline) {
      for (const view of ['lessons', 'reason', 'learn', 'solve', 'explore', 'me']) {
        const frame = await shell(page, view);
        await observe(page, view + '-mobile', frame);
        if (view === 'lessons' || view === 'reason') await page.screenshot({ path: path.join(output, 'after-' + view + '-mobile.png'), fullPage: false, timeout: 20000 });
      }
      await checkSearch(page);
      await page.setViewportSize({ width: 900, height: 1100 });
      for (const view of ['home', 'lessons', 'reason']) await observe(page, view + '-tablet', await shell(page, view));
      await page.setViewportSize({ width: 1440, height: 1000 });
      await checkLessons(page);
      await checkReason(page);
      await checkSearch(page);
      await checkHome(page);
      await checkExploreAndLearn(page);
      await checkSolve(page);
      assert.deepEqual(errors, [], 'Uncaught browser errors');
      for (const item of report.observations) assert.equal(item.horizontalOverflow, false, item.name + ' horizontally overflows');
      report.checks.push('All seven non-lab sections render at desktop/mobile, plus home/lessons/reason on tablet, without uncaught errors or horizontal overflow.');
    }
    report.completed = true;
    await context.close();
  } catch (error) {
    report.failure = error.message;
    throw error;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, homeCaptureOnly ? 'home-capture.json' : report.phase + '-browser.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
