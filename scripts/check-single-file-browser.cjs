/* Verify the real distributable without a source server, network dependencies,
 * user accounts or camera hardware. Run after scripts/build-single-file.py. */
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { gunzipSync } = require('node:zlib');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const { checkLibrarySearch } = require('../tests/library-search-browser.cjs');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__single_file_check__.cjs'))('playwright');
const artifact = path.resolve(process.env.BIOLOGY_SINGLE_HTML || path.join(root, 'dist/index.html'));
const output = path.resolve(process.env.BIOLOGY_SINGLE_OUTPUT || path.join(root, 'docs/single-file'));
const base = 'http://bioentelloq.single-file.test/index.html';
// These existing online services are optional. Every other HTTP request is a
// packaging failure, including CDN modules that silently fall back when denied.
// Camera is never enabled here, so even MediaPipe requests would be unexpected.
const optionalServiceHosts = new Set(['fonts.googleapis.com', 'fonts.gstatic.com',
  'accounts.google.com', 'groq-proxy.physicsedge.workers.dev']);
const bytes = fs.readFileSync(artifact);
// Check both layouts: older packages stored scan data in the initial manifest;
// current packages name inert model blocks later in the same HTML response.
const artifactText = bytes.toString('utf8');
const manifestMatch = artifactText.match(/<script id="bioq-manifest" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(manifestMatch, 'The distributable contains its initial manifest');
const artifactManifest = JSON.parse(manifestMatch[1]);
const embeddedSpecimens = ['frog','cockroach'].map(id => {
  const name = 'assets/specimens/' + id + '.glb', entry = artifactManifest.assets[name];
  assert.ok(entry, id + ': model metadata is embedded');
  let payload = entry.data;
  if (entry.deferred) {
    assert.match(entry.deferred, /^bioq-deferred-asset-\d+$/);
    payload = artifactText.match(new RegExp('id="' + entry.deferred + '">([^<]+)</script>'))?.[1];
  }
  assert.equal(typeof payload, 'string', id + ': compressed bytes exist inside this same HTML');
  const decoded = gunzipSync(Buffer.from(payload,'base64'));
  const digest = crypto.createHash('sha256').update(decoded).digest('hex');
  assert.equal(digest,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex'),id + ': embedded model is byte-identical');
  return {id,deferred:!!entry.deferred,bytes:decoded.length,sha256:digest};
});
const worldsOnly = process.argv.includes('--worlds-only');
const fileOnly = process.argv.includes('--file-only');
const reportName = (worldsOnly ? 'worlds-' : '') + (fileOnly ? 'file-' : '') + 'browser-report.json';
fs.mkdirSync(output, { recursive: true });
const report = {
  scope: worldsOnly ? 'immersive worlds only' : 'full application',
  artifact: path.relative(root, artifact), bytes: bytes.length,
  sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  embeddedSpecimens,
  timestamp: new Date().toISOString(), complete: false, runs: [],
  rendering: { backend: 'SwiftShader software WebGL', deviceScaleFactor: 0.5, desktopCSSViewport: '1440x1000', mobileCSSViewport: '390x844' },
  limitations: 'Isolated Chromium with SwiftShader software WebGL at half device scale (one quarter of physical render pixels); CSS layout viewports remain unchanged. No live AI, Google sign-in, billing, real camera or touch hardware was exercised.'
};
const sections = [
  ['learn', '#bl-search'], ['lessons', '#lesson-search'], ['reason', '#rzSearch'],
  ['labs', '#lab-search'], ['solve', '#svConfigCard'], ['explore', '#treeStage'],
  ['me', '#journeySlot'], ['about', 'main h1']
];

async function childFrame(parent, selector) {
  const element = await parent.locator(selector).elementHandle({ timeout: 60000 });
  const frame = await element.contentFrame();
  assert.ok(frame, selector + ' owns a live document');
  return frame;
}
async function workspace(page, ready = '#homeIn') {
  const frame = await childFrame(page, '#bioq-workspace');
  await frame.locator(ready).waitFor({ state: 'attached', timeout: 60000 });
  return frame;
}
async function section(page, url, route, ready) {
  await page.goto(url + '#' + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const shell = await workspace(page);
  await shell.locator('#viewFrame.on').waitFor({ timeout: 45000 });
  const frame = await childFrame(shell, '#viewFrame');
  await frame.locator(ready).first().waitFor({ timeout: 60000 });
  await shell.locator('#skel.on').waitFor({ state: 'hidden', timeout: 30000 });
  assert.equal(await shell.locator('#oops.on').count(), 0, route + ' avoids the failed-section boundary');
  return { shell, frame };
}
async function noOverflow(page, frames, label, run) {
  for (const [name, frame] of [['wrapper', page], ...frames]) {
    const size = await frame.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    assert.ok(size.scroll <= size.width + 1, `${label}: ${name} overflows (${size.scroll} > ${size.width})`);
    run.layouts.push({ label, name, ...size });
  }
}
async function screenshot(page, name) {
  await page.screenshot({ path: path.join(output, name + '.png'), timeout: 30000 });
}
function worldStep(run, step) {
  (run.worldProgress ||= []).push({ step, timestamp: new Date().toISOString() });
  console.log('[' + run.mode + '] ' + step);
  fs.writeFileSync(path.join(output, reportName), JSON.stringify(report, null, 2) + '\n');
}
async function checkWorlds(page, url, run) {
  worldStep(run, 'Open Home and enter the Dissection Lab');
  await page.goto(url + '#home', { waitUntil: 'domcontentloaded' });
  let shell = await workspace(page);
  await shell.locator('#nav [data-go="lab"]').click();
  await page.waitForURL(/#lab$/);
  await shell.locator('#launcher.on').waitFor();
  let world = await childFrame(shell, '#launchFrame');
  worldStep(run, 'Wait for the actual lab runtime');
  await world.waitForFunction(() => window.__LAB?.ok && window.__LAB.ready && window.__LAB.dissection,
    null, { timeout: 90000 });
  await world.evaluate(() => window.__LAB.intro()?.skip());
  run.specimens = [];
  for (const id of ['frog', 'cockroach']) {
    worldStep(run, 'Load and verify prepared ' + id);
    const specimen = await world.evaluate(async id => {
      await window.__LAB.requestSpecimen(id);
      const lab = window.__LAB;
      let meshes = 0, triangles = 0, finite = true;
      lab.parts.forEach(part => part.mesh.traverse(mesh => {
        if (!mesh.isMesh || !mesh.geometry) return;
        meshes++;
        triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position?.count || 0) / 3;
        const positions = mesh.geometry.attributes.position?.array;
        if (positions && !Array.from(positions).every(Number.isFinite)) finite = false;
      }));
      return { id, prepared: lab.parts.some(part => part.mesh.userData.preparedExterior?.specimenId === id),
        parts: lab.parts.length, meshes, triangles, finite };
    }, id);
    assert.equal(specimen.prepared, true, id + ': actual prepared exterior is embedded');
    assert.ok(specimen.parts > 5 && specimen.meshes > 5 && specimen.triangles > 0);
    assert.equal(specimen.finite, true, id + ': finite rendered geometry');
    run.specimens.push(specimen);
    worldStep(run, 'Capture prepared ' + id);
    await screenshot(page, run.mode + '-' + id);
  }
  worldStep(run, 'Open the controls dialog through its button');
  await world.locator('#helpbtn').click();
  await world.locator('#keys.on').waitFor();
  await shell.locator('#launchX').waitFor({ state: 'hidden' });
  assert.equal(await shell.locator('#launchX').evaluate(element => element.inert), true, 'The child modal owns the Exit corner');
  worldStep(run, 'Capture dialog ownership of the Exit corner');
  await screenshot(page, run.mode + '-lab-modal');
  worldStep(run, 'Close the controls dialog through its button');
  await world.locator('#keysclose').click();
  await world.locator('#keys.on').waitFor({ state: 'hidden' });
  await shell.locator('#launchX').waitFor({ state: 'visible' });
  worldStep(run, 'Exit the lab through the shell button');
  await shell.locator('#launchX').click();
  await shell.locator('#launcher.on').waitFor({ state: 'hidden' });
  await page.waitForURL(/#home$/);
  worldStep(run, 'Reload after leaving the lab');
  await page.reload({ waitUntil: 'domcontentloaded' });
  shell = await workspace(page);
  assert.equal(await shell.locator('#launcher.on').count(), 0, 'Closing the lab survives reload');
  run.checks.push('Prepared frog and cockroach assets load offline with finite geometry; child dialogs own the Exit corner; lab exit returns to Home and survives reload.');

  worldStep(run, 'Open Biology Universe through its navigation button');
  await shell.locator('#nav [data-go="universe"]').click();
  await page.waitForURL(/#universe$/);
  await shell.locator('#launcher.on').waitFor();
  world = await childFrame(shell, '#launchFrame');
  worldStep(run, 'Wait for all 13 Universe stages');
  await world.waitForFunction(() => window.__UNI, null, { timeout: 90000 });
  const universe = await world.evaluate(() => ({ count: __UNI.count,
    stages: __UNI.scene.children.filter(item => item.userData.stageKey).map(item => item.userData.stageKey) }));
  assert.equal(universe.count, 13);
  assert.equal(universe.stages.length, 13, 'Every Universe stage factory initializes offline');
  run.universe = universe;
  worldStep(run, 'Inspect the Cell stage');
  await world.evaluate(() => { const i = __UNI_ORDER.indexOf('cell'); __UNI.Z.pos = __UNI.Z.posTarget = i; __UNI.jumpTo(i); __UNI._tick(0); });
  await world.locator('#uInspect').click();
  assert.equal(await world.evaluate(() => __UNI.viewMode), 'orbit');
  await screenshot(page, run.mode + '-universe');
  worldStep(run, 'Close Universe through the shell button');
  await shell.locator('#launchX').click();
  await shell.locator('#launcher.on').waitFor({ state: 'hidden' });
  await page.waitForURL(/#home$/);
  run.checks.push('All 13 real Universe stages initialize offline, Cell inspection opens, and the Universe close control restores Home.');

  worldStep(run, 'Open and reload the Universe DNA deep link');
  await page.goto(url + '#universe/dna', { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  shell = await workspace(page);
  await shell.locator('#launcher.on').waitFor();
  world = await childFrame(shell, '#launchFrame');
  await world.waitForFunction(() => window.__UNI && window.__UNI_ORDER[__UNI.Z.posTarget] === 'dna', null, { timeout: 90000 });
  worldStep(run, 'Navigate the warm Universe from DNA to Atom');
  await page.goto(url + '#universe/atom', { waitUntil: 'domcontentloaded' });
  await world.waitForFunction(() => window.__UNI && window.__UNI_ORDER[__UNI.Z.posTarget] === 'atom', null, { timeout: 30000 });
  await shell.locator('#launchLoad').waitFor({ state: 'hidden' });
  worldStep(run, 'Follow the Universe brand link into the lab');
  await world.locator('.u-brand').click();
  await page.waitForURL(/#lab$/);
  world = await childFrame(shell, '#launchFrame');
  await world.waitForFunction(() => window.__LAB?.ok && window.__LAB.ready && window.__LAB.dissection, null, { timeout: 90000 });
  worldStep(run, 'Switch from the active lab to Learn');
  await page.goto(url + '#learn', { waitUntil: 'domcontentloaded' });
  await shell.locator('#launcher.on').waitFor({ state: 'hidden' });
  await (await childFrame(shell, '#viewFrame')).locator('#bl-search').waitFor();
  run.checks.push('A direct Universe DNA deep link survives reload, warm navigation selects Atom, its Biology Lab link opens the real lab, and switching to Learn closes the immersive launcher.');
}
async function runSuite(browser, mode, url) {
  const run = { mode, checks: [], layouts: [], errors: [], requests: [], forbiddenDependencies: [], cameraRequests: 0, complete: false };
  report.runs.push(run);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 0.5, reducedMotion: 'reduce', serviceWorkers: 'block', colorScheme: 'dark' });
  await context.exposeBinding('__singleFileCameraAttempt', () => { run.cameraRequests++; });
  await context.addInitScript(() => {
    window.__singleFileCameraRequests = 0;
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => {
      window.__singleFileCameraRequests++;
      await window.__singleFileCameraAttempt();
      throw new Error('Camera disabled by isolated packaging check');
    };
  });
  await context.route('**/*', async route => {
    const request = route.request();
    const target = new URL(request.url());
    if (mode === 'http' && target.href.split('#')[0] === base && request.isNavigationRequest() && !request.frame().parentFrame()) {
      run.requests.push({ url: target.href, action: 'single HTML fulfilled' });
      return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: bytes });
    }
    if (['http:', 'https:'].includes(target.protocol)) {
      const dependency = !optionalServiceHosts.has(target.hostname);
      run.requests.push({ url: target.href, action: 'denied', applicationDependency: dependency });
      if (dependency) run.forbiddenDependencies.push(target.href);
      return route.abort('blockedbyclient');
    }
    if (target.protocol === 'file:' && target.href.split('#')[0] !== url) {
      run.forbiddenDependencies.push(target.href);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(90000);
  page.on('request', request => {
    const target = new URL(request.url());
    if (target.protocol === 'file:' && target.href.split('#')[0] !== url && !run.forbiddenDependencies.includes(target.href))
      run.forbiddenDependencies.push(target.href);
  });
  page.on('pageerror', error => run.errors.push(error.message));
  page.on('console', message => { if (/^(Lab failed:|.*stage failed:)/.test(message.text())) run.errors.push(message.text()); });
  try {
    if (worldsOnly) {
      await checkWorlds(page, url, run);
      assert.equal(run.cameraRequests, 0);
      assert.deepEqual(run.forbiddenDependencies, []);
      assert.deepEqual(run.errors, []);
      run.complete = true;
      return;
    }
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    let shell = await workspace(page, '#bio-title');
    assert.match(await shell.locator('#bio-title').textContent(), /Biology/);
    await noOverflow(page, [['landing', shell]], 'landing desktop', run);
    await screenshot(page, mode + '-landing-desktop');
    await page.goto(url + '#pe-worlds', { waitUntil: 'domcontentloaded' });
    shell = await workspace(page, '#bio-title');
    assert.equal(await shell.locator('#pe-worlds').count(), 1, 'Legacy landing fragments stay on the landing page');
    await shell.locator('.bio-watch').click();
    await page.waitForURL(/#landing\/pe-experiment$/);
    await shell.locator('.bio-explore-button').click();
    await page.waitForURL(/#home$/);
    shell = await workspace(page);
    await shell.locator('#homeIn .cc-world').first().waitFor();
    assert.equal(await shell.locator('#homeIn .cc-world').count(), 8);
    await screenshot(page, mode + '-home-desktop');
    run.checks.push('Landing and Start Exploring load the application from the one supplied HTML file.');

    for (const [key, ready] of sections) {
      const opened = await section(page, url, key, ready);
      assert.ok((await opened.frame.locator('body').textContent()).trim().length > 100, key + ' contains real section content');
      await noOverflow(page, [['shell', opened.shell], [key, opened.frame]], key + ' desktop', run);
    }
    run.checks.push('All eight embedded sections open real content with no horizontal overflow on desktop.');

    let navigation = await section(page, url, 'learn', '#bl-search');
    run.checks.push('Learn search desktop: ' + await checkLibrarySearch(page, navigation.frame));
    await navigation.shell.locator('#nav .navi[data-go="lessons"]:not(.quick-action)').click();
    await page.waitForURL(/#lessons$/);
    await (await childFrame(navigation.shell, '#viewFrame')).locator('#lesson-search').waitFor();
    await page.goBack();
    await page.waitForURL(/#learn$/);
    navigation.shell = await workspace(page);
    await (await childFrame(navigation.shell, '#viewFrame')).locator('#bl-search').waitFor();
    assert.equal(await navigation.shell.locator('#nav .navi[data-go="learn"]:not(.quick-action)').getAttribute('aria-current'), 'page');
    run.checks.push('Browser Back between different section documents restores both the outer route and active navigation.');

    let opened = await section(page, url, 'learn/topic/cell-structure/visual', '#bl-mode-visual');
    assert.equal(await opened.frame.locator('#bl-mode-visual').getAttribute('aria-selected'), 'true');
    await opened.frame.locator('#bl-mode-layman').click();
    await page.waitForURL(/#learn\/topic\/cell-structure\/layman$/);
    await page.goBack();
    opened = { shell: await workspace(page) };
    opened.frame = await childFrame(opened.shell, '#viewFrame');
    await opened.frame.locator('#bl-mode-visual[aria-selected="true"]').waitFor();
    await page.waitForURL(/#learn\/topic\/cell-structure\/visual$/);
    await page.reload({ waitUntil: 'domcontentloaded' });
    shell = await workspace(page);
    let frame = await childFrame(shell, '#viewFrame');
    await frame.locator('#bl-mode-visual[aria-selected="true"]').waitFor();
    run.checks.push('Cell Structure Visual deep link opens correctly; mode changes update the outer URL, browser Back restores Visual, and reload preserves it.');

    const originalTheme = await shell.locator('html').getAttribute('data-theme');
    await shell.locator('#themeBtn').click();
    const expectedTheme = originalTheme === 'light' ? 'dark' : 'light';
    await frame.waitForFunction(theme => document.documentElement.getAttribute('data-theme') === theme, expectedTheme);
    await page.reload({ waitUntil: 'domcontentloaded' });
    shell = await workspace(page);
    assert.equal(await shell.locator('html').getAttribute('data-theme'), expectedTheme);
    run.checks.push('Theme changes reach the embedded section and persist after reload.');

    opened = await section(page, url, 'labs/photosynthesis-rate', '#lab-record');
    await opened.frame.locator('#lab-hypothesis').fill('More light increases net oxygen exchange until the model plateaus.');
    await opened.frame.locator('#lab-record').click();
    await opened.frame.locator('[data-note="conclusion"]').fill('A saved observation in the single HTML notebook.');
    await opened.frame.locator('#lab-record').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    shell = await workspace(page);
    frame = await childFrame(shell, '#viewFrame');
    await frame.locator('#lab-record').waitFor();
    assert.equal(await frame.locator('.ln-table tbody tr').count(), 2);
    assert.match(await frame.locator('#lab-hypothesis').inputValue(), /More light/);
    assert.match(await frame.locator('[data-note="conclusion"]').inputValue(), /saved observation/);
    run.checks.push('A real experimental notebook preserves its hypothesis, two measured trials and conclusion after reload.');
    await screenshot(page, mode + '-notebook-desktop');
    await checkWorlds(page, url, run);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    shell = await workspace(page, '#bio-title');
    await noOverflow(page, [['landing', shell]], 'landing mobile', run);
    await screenshot(page, mode + '-landing-mobile');
    await shell.locator('.bio-explore-button').click();
    await page.waitForURL(/#home$/);
    shell = await workspace(page);
    await noOverflow(page, [['shell', shell]], 'home mobile', run);
    await screenshot(page, mode + '-home-mobile');
    for (const [key, ready] of sections) {
      opened = await section(page, url, key, ready);
      await noOverflow(page, [['shell', opened.shell], [key, opened.frame]], key + ' mobile', run);
      if (key === 'learn') run.checks.push('Learn search mobile: ' + await checkLibrarySearch(page, opened.frame));
    }
    opened = await section(page, url, 'labs/photosynthesis-rate', '#lab-record');
    await noOverflow(page, [['shell', opened.shell], ['notebook', opened.frame]], 'notebook mobile', run);
    await screenshot(page, mode + '-notebook-mobile');
    run.checks.push('Landing, Home, every section and the saved notebook fit a 390-pixel mobile viewport.');
    assert.equal(run.cameraRequests, 0, 'No camera request is made automatically, including in previously unmounted frames');
    assert.deepEqual(run.forbiddenDependencies, [], 'No physical application documents or assets may be requested');
    assert.deepEqual(run.errors, [], 'No uncaught application errors');
    run.complete = true;
    console.log(mode + ': ' + run.checks.length + ' checks passed');
  } catch (error) {
    run.failure = error.message;
    run.url = page.url();
    run.frames = page.frames().map(f => ({ name: f.name(), url: f.url().slice(0, 240) }));
    await screenshot(page, mode + '-failure').catch(() => {});
    throw error;
  } finally {
    await context.close();
    fs.writeFileSync(path.join(output, reportName), JSON.stringify(report, null, 2) + '\n');
  }
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  let copyDirectory;
  try {
    if (!fileOnly) await runSuite(browser, 'http', base);
    copyDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'bioentelloq-single-html-'));
    const copy = path.join(copyDirectory, 'Biology Entelloq.html');
    fs.copyFileSync(artifact, copy);
    assert.deepEqual(fs.readdirSync(copyDirectory), ['Biology Entelloq.html']);
    await runSuite(browser, 'file', pathToFileURL(copy).href);
    report.complete = true;
  } finally {
    await browser.close();
    if (copyDirectory) {
      fs.unlinkSync(path.join(copyDirectory, 'Biology Entelloq.html'));
      fs.rmdirSync(copyDirectory);
    }
    fs.writeFileSync(path.join(output, reportName), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ complete: report.complete, bytes: report.bytes, sha256: report.sha256,
    runs: report.runs.map(run => ({ mode: run.mode, complete: run.complete, checks: run.checks.length })) }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
