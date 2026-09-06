/* Real lab shell + published base/shared CSS, without WebGL or camera access.
   Hand lifecycle data is injected through the public shell API; no tracker is
   loaded. This is layout/event evidence, not hardware-tracking validation. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__hand_layout__.cjs'))('playwright');
const output = path.join(root, 'docs/dissection-realism');
fs.mkdirSync(output, { recursive: true });
const lab = fs.readFileSync(path.join(root, 'lab.html'), 'utf8');
const shellSource = fs.readFileSync(path.join(root, 'src/lab/shell.js'), 'utf8').replace(/^export /gm, '');
const anatomy = fs.readFileSync(path.join(root, 'src/lab/anatomy.js'), 'utf8');
const metadataLiteral = anatomy.match(/export const SPECIMENS = (\{[\s\S]*?\n\});/)[1];
const metadata = vm.runInNewContext('(' + metadataLiteral + ')');
const shared = lab.match(/<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:START -->[\s\S]*?<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:END -->/)[0];
// Include base style tags from the page head, preserving their cascade order.
// Other module CSS is only created by those modules; none is invented here.
const baseStyles = (lab.split('</head>')[0].match(/<style\b[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
const assetCss = fs.readFileSync(path.join(root, 'assets/feature-tutorials.css'), 'utf8');
const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' +
  baseStyles + '<style>' + assetCss + '</style></head><body><div id="stage"></div>' + shared + '</body></html>';
const allSizes = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'laptop', width: 1366, height: 768 },
  { name: 'tablet', width: 900, height: 1100, touch: true },
  { name: 'phone', width: 390, height: 844, touch: true },
  { name: 'phone-small', width: 320, height: 640, touch: true },
  { name: 'landscape', width: 844, height: 390, touch: true },
];
const only = process.argv.find(value => value.startsWith('--only='))?.slice(7).split(',');
const sizes = only ? allSizes.filter(size => only.includes(size.name)) : allSizes;
assert.ok(sizes.length, 'At least one known viewport is required');
const report = { at: new Date().toISOString(), kind: 'real-shell-layout-harness-no-renderer-no-camera', complete: false,
  observations: [], errors: [], issues: [], checks: [], blockedRequests: 0 };

async function inspect(page, size, state) {
  const observation = await page.evaluate(() => {
    const rect = selector => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect(), css = getComputedStyle(el);
      if (!r.width || !r.height || css.display === 'none' || css.visibility === 'hidden' || +css.opacity === 0) return null;
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom,
        centerClickable: !!hit && (hit === el || el.contains(hit)),
        overflow: el.scrollWidth > el.clientWidth + 1, text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 140) };
    };
    const names = ['#hand', '#handbtn', '#handstat', '#handpreview', '#selfwrap', '#dock', '#railfoot', '#eqx-fab', '#helpbtn', '#specbtn', '#coach', '#obj'];
    return { viewport: { width: innerWidth, height: innerHeight }, phone: document.body.classList.contains('bioq-phone'),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      rects: Object.fromEntries(names.map(name => [name, rect(name)])) };
  });
  const item = { name: size.name, state, ...observation };
  report.observations.push(item);
  const { rects } = item;
  const issue = text => report.issues.push(size.name + '/' + state + ': ' + text);
  const overlap = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1;
  for (const selector of ['#handbtn', '#eqx-fab', '#helpbtn', '#specbtn']) {
    const control = rects[selector];
    if (!control || !control.centerClickable) issue(selector + ' center is not clickable');
  }
  if (!rects['#handbtn'] || rects['#handbtn'].height < 44) issue('main hand control is smaller than 44px');
  if (item.overflow || rects['#hand']?.overflow) issue('horizontal overflow');
  for (const [a, b] of [['#hand', '#dock'], ['#hand', '#eqx-fab'], ['#hand', '#railfoot'], ['#eqx-fab', '#helpbtn'], ['#eqx-fab', '#specbtn'], ['#handbtn', '#coach']]) {
    if (overlap(rects[a], rects[b])) issue(a + ' overlaps ' + b);
  }
  if (rects['#hand'] && (rects['#hand'].y < 0 || rects['#hand'].bottom > size.height + 1)) issue('hand panel extends outside viewport');
  return item;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  try {
    for (const size of sizes) {
      const context = await browser.newContext({ viewport: { width: size.width, height: size.height },
        hasTouch: !!size.touch, isMobile: !!size.touch, reducedMotion: 'reduce', colorScheme: 'dark' });
      await context.route('**/*', route => {
        if (route.request().url() === 'http://lab-layout.test/') return route.fulfill({ contentType: 'text/html', body: html });
        report.blockedRequests++;
        return route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      page.setDefaultTimeout(8000);
      page.on('pageerror', error => report.errors.push(size.name + ': ' + error.message));
      await page.goto('http://lab-layout.test/', { waitUntil: 'domcontentloaded', timeout: 15000 });
      // The shell's source prefix includes ICONS, SHELL_TOOLS, SH_PHONE,
      // objective/gesture registries and escaping helpers. No main.js executes.
      await page.addScriptTag({ content: shellSource + '\nwindow.__shellLayout = { shell: buildShell(document.body), events: [] }; document.getElementById("shellcss").textContent = SHELL_CSS;' });
      await page.evaluate(specimens => {
        const test = window.__shellLayout;
        test.shell.mountCards(specimens, id => test.shell.setSpecimen(specimens[id], []));
        test.shell.setSpecimen(specimens.frog, []);
        test.shell.on('hands', want => { test.events.push(want); if (!want) test.shell.setHandState({ on: false }); });
      }, metadata);
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#pick')).opacity) === 0);
      await inspect(page, size, 'off');
      await page.screenshot({ path: path.join(output, 'hand-' + size.name + '-off.png'), timeout: 15000 });
      await page.evaluate(() => window.__shellLayout.shell.setHandState({ on: false, status: 'failed', reason: 'Camera permission denied. You can still use touch or mouse.' }));
      await inspect(page, size, 'failed');
      await page.locator('#handbtn').click();
      assert.equal(await page.evaluate(() => window.__shellLayout.events.at(-1)), true);
      await page.evaluate(() => {
        window.__shellLayout.shell.setHandState({ on: true, status: 'tracking', health: 0, hands: 2, gesture: 'pinch', grip: .7 });
        document.body.classList.add('handmode');
      });
      await inspect(page, size, 'live-coach');
      await page.locator('#coachok').click();
      await inspect(page, size, 'live-preview-closed');
      if (await page.locator('#handpreview').isVisible()) await page.locator('#handpreview').click();
      await inspect(page, size, 'live-preview-open');
      await page.screenshot({ path: path.join(output, 'hand-' + size.name + '-live.png'), timeout: 15000 });
      await page.evaluate(() => window.__shellLayout.shell.setConsoleOpen(true));
      await inspect(page, size, 'live-console-open');
      await page.evaluate(() => window.__shellLayout.shell.setConsoleOpen(false));
      await page.locator('#handbtn').click();
      assert.equal(await page.evaluate(() => window.__shellLayout.events.at(-1)), false);
      assert.equal(await page.locator('#handbtn').textContent(), 'Use my hands');
      await page.locator('#handbtn').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => window.__shellLayout.events.at(-1)), true);
      await page.locator('#eqx-fab').click();
      assert.equal(await page.locator('#eqx-fab').getAttribute('aria-expanded'), 'true');
      await page.locator('#eqx-close').click();
      await page.locator('#helpbtn').click();
      assert.equal(await page.locator('#keys').evaluate(el => el.classList.contains('on')), true);
      await page.keyboard.press('Escape');
      await page.locator('#specbtn').click();
      assert.equal(await page.locator('#pick').evaluate(el => el.classList.contains('gone')), false);
      await page.locator('#cards .card').first().click();
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.issues, []);
    report.complete = true;
    report.checks = ['Six viewport families and off/failed/live/preview/console states', 'Main camera button at least 44px and center-hit-test clickable',
      'Hand panel does not overlap tools, shared FAB or console footer', 'FAB/help/specimen chooser open and close',
      'Original hands event dispatch by pointer and keyboard; Stop remains reachable', 'No renderer loaded or camera requested'];
  } catch (error) { report.failure = error.message; throw error; }
  finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'hand-layout' + (only ? '-' + only.join('-') : '') + '.json'), JSON.stringify(report, null, 2) + '\n');
  }
  console.log(JSON.stringify({ complete: report.complete, observations: report.observations.length, errors: report.errors, issues: report.issues }));
})().catch(error => { console.error(error); process.exitCode = 1; });
