/* Exterior review evidence: real offline Three.js scene, no webcam access. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__exterior__.cjs'))('playwright');
const output = process.env.BIOLOGY_EXTERIOR_OUTPUT || path.join(root, 'docs/specimen-exteriors/browser');
const ids = (process.env.BIOLOGY_EXTERIOR_SPECIMENS || 'frog,fish,cockroach,earthworm,heart').split(',');
fs.mkdirSync(output, { recursive: true });
const report = { specimens: [], errors: [], cameraRequests: 0, limitations: 'Visual review capture, not proof of reference equivalence, measured anatomy or hardware tracking.' };
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => report.errors.push(e.message));
    report.warnings = [];
    page.on('console', message => { if (message.type() === 'warning') report.warnings.push(message.text()); });
    await page.route('https://unpkg.com/**', route => route.abort());
    await page.addInitScript(() => {
      window.__cameraRequests = 0;
      navigator.mediaDevices.getUserMedia = async () => { window.__cameraRequests++; throw new Error('Camera forbidden during exterior review'); };
    });
    await page.goto((process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3002') + '/lab.html', { waitUntil: 'domcontentloaded' });
    const served = await (await page.request.get(page.url())).body();
    report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    assert.ok(served.equals(fs.readFileSync(path.join(root, 'lab.html'))), 'preview serves the current built artifact');
    await page.waitForFunction(() => window.__LAB?.ok && window.__LAB.ready && window.__LAB.dissection, null, { timeout: 60000 });
    if (process.env.BIOLOGY_REQUIRE_PREPARED_FROG === '1') {
      assert.equal(await page.evaluate(() => window.__LAB.parts.find(p => p.id === 'skin')?.mesh.userData.preparedExterior?.specimenId), 'frog', 'actual prepared frog is installed, not fallback');
    }
    await page.evaluate(() => window.__LAB.intro()?.skip());
    for (const id of ids) {
      const data = await page.evaluate(async id => {
        const t = performance.now(); await window.__LAB.requestSpecimen(id);
        const lab = window.__LAB, objects = [];
        if (['frog', 'cockroach'].includes(id) && !lab.parts.some(p => p.mesh.userData.preparedExterior?.specimenId === id))
          throw new Error(id + ': actual detailed exterior was not installed');
        lab.parts.forEach(p => p.mesh.traverse(m => {
          if (m.isMesh && m.geometry) objects.push({ part: p.id, visible: p.mesh.visible && m.visible,
            triangles: (m.geometry.index?.count || m.geometry.attributes.position.count) / 3,
            finite: Array.from(m.geometry.attributes.position.array).every(Number.isFinite) });
        }));
        return { id, buildMs: performance.now() - t, partCount: lab.parts.length,
          triangles: objects.reduce((n, m) => n + m.triangles, 0), meshes: objects.length,
          finite: objects.every(m => m.finite), placement: lab.environment().placement };
      }, id);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: path.join(output, id + '-exterior.png') });
      if (process.env.BIOLOGY_EXTERIOR_DIAGNOSTIC === '1' && id === 'heart') {
        console.log('Heart surfaces:', await page.evaluate(() => window.__LAB.parts.filter(p => p.mesh.visible).map(p => ({id:p.id, transmission:p.mesh.material.transmission, opacity:p.mesh.material.opacity}))));
        await page.evaluate(() => window.__LAB.parts.forEach(p => p.mesh.traverse(m => { if (m.material && p.id !== 'pericardium') { m.material.transmission = 0; m.material.needsUpdate = true; } })));
        await page.screenshot({path:path.join(output, 'heart-no-transmission.png')});
        await page.evaluate(() => {let scene=window.__LAB.parts[0].mesh; while(scene.parent)scene=scene.parent; scene.traverse(o => {if(o.isLight)o.castShadow=false;});});
        await page.screenshot({path:path.join(output, 'heart-no-shadows.png')});
      }
      assert.equal(data.finite, true, id + ': finite geometry'); report.specimens.push(data);
      console.log('Exterior captured:', id, Math.round(data.buildMs) + 'ms', data.triangles + ' triangles');
    }
    report.cameraRequests = await page.evaluate(() => window.__cameraRequests);
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []);
    report.complete = true;
  } finally {
    fs.writeFileSync(path.join(output, 'exteriors.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
