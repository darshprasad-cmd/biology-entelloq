/* Focused real-WebGL bench regression. --diagnose also renders the legacy
   two-triangle bench for comparison; no camera, network assets or app edits. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__earthworm_scene__.cjs'))('playwright');
const output = path.join(root, 'docs/dissection-interactions/scene-diagnostic');
fs.mkdirSync(output, { recursive: true });
const report = { errors: [], points: [[800, 300], [800, 350], [850, 350]], cameraRequests: 0 };
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', e => report.errors.push(e.message));
    await page.route('https://unpkg.com/**', route => route.abort());
    await page.addInitScript(() => {
      window.__cameraRequests = 0;
      navigator.mediaDevices.getUserMedia = async () => { window.__cameraRequests++; throw new Error('No camera in scene check'); };
    });
    await page.goto((process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3002') + '/lab.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LAB?.ok, null, { timeout: 45000 });
    await page.evaluate(() => { window.__LAB.intro()?.skip(); window.__LAB.loadSpecimen('earthworm'); });
    const frame = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const pixels = async bytes => page.evaluate(async ({ image, points }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + image; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      return points.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data));
    }, { image: bytes.toString('base64'), points: report.points });
    await frame();
    report.scene = await page.evaluate(points => {
      const lab = window.__LAB, { THREE, camera } = lab, scene = lab.parts[0].mesh.parent.parent;
      const table = scene.children.find(o => o.geometry?.type === 'PlaneGeometry' && o.material?.type === 'MeshPhysicalMaterial');
      const ray = new THREE.Raycaster();
      const pad = scene.getObjectByName('dissection-pad');
      const hitsPad = points.map(([x, y]) => {
        ray.setFromCamera(new THREE.Vector2(x / 720 - 1, 1 - y / 500), camera);
        return ray.intersectObject(pad, false).length > 0;
      });
      return { width: table.geometry.parameters.width, height: table.geometry.parameters.height,
        widthSegments: table.geometry.parameters.widthSegments, heightSegments: table.geometry.parameters.heightSegments,
        triangles: table.geometry.index.count / 3, hitsPad };
    }, report.points);
    assert.equal(report.scene.width, 70); assert.equal(report.scene.height, 70);
    assert.equal(report.scene.widthSegments, 12); assert.equal(report.scene.heightSegments, 12);
    assert.equal(report.scene.triangles, 288); assert.ok(report.scene.hitsPad.every(Boolean));
    report.fixedPixels = await pixels(await page.screenshot({ path: path.join(output, 'verified-grid-bench.png') }));
    assert.ok(report.fixedPixels.every(([r, g, b]) => r + g + b > 45 && g >= r), 'previously black pad samples must render the green pad');
    if (process.argv.includes('--diagnose')) {
      await page.evaluate(() => {
        const { THREE, parts } = window.__LAB, scene = parts[0].mesh.parent.parent;
        const table = scene.children.find(o => o.geometry?.type === 'PlaneGeometry' && o.material?.type === 'MeshPhysicalMaterial');
        table.userData.gridGeometry = table.geometry; table.geometry = new THREE.PlaneGeometry(70, 70);
      });
      await frame();
      report.legacyPixels = await pixels(await page.screenshot({ path: path.join(output, 'legacy-two-triangle-bench.png') }));
      // Record rather than require the old artifact: other graphics drivers may
      // rasterize the giant clipped triangle correctly.
      report.legacyArtifactReproduced = report.legacyPixels.some(([r, g, b]) => r + g + b < 15);
    }
    report.cameraRequests = await page.evaluate(() => window.__cameraRequests);
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []);
    report.complete = true;
  } finally {
    fs.writeFileSync(path.join(output, 'bench-regression.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
