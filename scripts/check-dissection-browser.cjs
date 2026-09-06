/* Real WebGL geometry checks. Never requests a camera; shell states are tested separately. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__lab_check__.cjs'))('playwright');
const base = process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3002';
const output = process.env.BIOLOGY_LAB_EVIDENCE || path.join(root, 'docs/dissection-realism');
const report = { base, specimens: [], layouts: [], errors: [], warnings: [], checks: [] };
fs.mkdirSync(output, { recursive: true });
const save = () => fs.writeFileSync(path.join(output, 'browser.json'), JSON.stringify(report, null, 2));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    // Exercise the documented offline fallback without waiting for optional CDN
    // bloom passes. Core Three.js and OrbitControls stay vendored and unchanged.
    await context.route('https://unpkg.com/**', route => route.abort());
    page.setDefaultTimeout(25000);
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'warning') report.warnings.push(message.text().slice(0, 240)); });
    await page.goto(base + '/lab.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LAB?.ok, null, { timeout: 45000 });
    await page.evaluate(() => window.__LAB.intro()?.skip());
    await page.waitForFunction(() => !document.body.classList.contains('intro'));
    await page.waitForTimeout(800);
    for (const id of ['frog', 'cockroach', 'earthworm', 'fish', 'heart']) {
      const data = await page.evaluate(id => {
        const lab = window.__LAB;
        lab.loadSpecimen(id);
        const { THREE } = lab, group = lab.parts[0].mesh.parent;
        group.updateMatrixWorld(true);
        let minY = Infinity;
        const v = new THREE.Vector3();
        group.traverseVisible(o => {
          const a = o.isMesh && o.geometry?.attributes.position;
          if (a) for (let i = 0; i < a.count; i++) minY = Math.min(minY, v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld).y);
        });
        const up = new THREE.Vector3(...(id === 'heart' ? [0, 0, 1] : id === 'fish' ? [-1, 0, 0] : [0, 1, 0])).transformDirection(group.matrixWorld);
        return { id, minY, placement: lab.environment().placement, upwardAxis: up.y, parts: lab.parts.length };
      }, id);
      report.specimens.push(data);
      console.log('Geometry verified:', id);
      assert.ok(Math.abs(data.minY - data.placement.supportY) < 0.002, id + ' grounded');
      assert.ok(data.upwardAxis > 0.999, id + ' dissection surface faces up');
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: path.join(output, id + '-bench.png') });
      save();
    }
    // Verify no decorative idle deformation of preserved specimens.
    const still = await page.evaluate(async () => {
      const lab = window.__LAB, p = lab.parts.find(p => p.mesh.geometry?.attributes.position);
      const before = Array.from(p.mesh.geometry.attributes.position.array);
      await new Promise(r => setTimeout(r, 200));
      return before.every((v, i) => v === p.mesh.geometry.attributes.position.array[i]);
    });
    assert.equal(still, true, 'preserved specimen is stationary');
    report.checks.push('All five specimens contact pad; authored dissection axes face up; preserved tissue does not idle-pulse.');
    assert.deepEqual(report.errors, []);
    report.checks.push('Responsive hand-panel state coverage runs separately in check-hand-layout-browser.cjs without GPU rendering.');
    report.complete = true;
  } finally {
    fs.writeFileSync(path.join(output, 'browser.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
