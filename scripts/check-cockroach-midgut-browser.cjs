/* Real-render diagnostic, deliberately exposing the digestive region. The
 * normal access sequence is covered by the five-specimen browser suite.
 * Synthetic application input is not webcam or anatomical validation. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__midgut_review__.cjs'))('playwright');
const base = process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3008';
const output = path.resolve(process.env.BIOLOGY_MIDGUT_OUTPUT || path.join(root, 'docs/cockroach-midgut-loop/detail'));
fs.mkdirSync(output, { recursive: true });
const report = { base, errors: [], cameraRequests: 0, complete: false,
  limitation: 'Exposed digestive-region diagnostic, not the normal opening sequence, educator review or webcam validation.' };
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => report.errors.push(e.message));
    await page.route('https://unpkg.com/**', route => route.abort());
    await page.addInitScript(() => {
      window.__cameraRequests = 0;
      navigator.mediaDevices.getUserMedia = async () => { window.__cameraRequests++; throw new Error('Camera forbidden in midgut diagnostic'); };
    });
    await page.goto(base + '/lab.html', { waitUntil: 'domcontentloaded' });
    const served = await (await page.request.get(page.url())).body();
    assert.ok(served.equals(fs.readFileSync(path.join(root, 'lab.html'))), 'served page matches the current built artifact');
    report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    await page.waitForFunction(() => window.__LAB?.ready && window.__LAB.dissection);
    await page.evaluate(async () => { __LAB.intro()?.skip(); await __LAB.requestSpecimen('cockroach'); });
    report.setup = await page.evaluate(() => {
      const lab = __LAB, { THREE } = lab, mesh = lab.parts.find(p => p.id === 'midgut').mesh;
      // Test-only exposure, never reported as a successful dissection procedure.
      for (const p of lab.parts) p.mesh.visible = ['gastric-caeca', 'midgut', 'gizzard', 'hindgut'].includes(p.id);
      lab.dissection.state.maxLayerRevealed = 2;
      mesh.parent.updateMatrixWorld(true);
      const centre = mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
      lab.camera.position.copy(centre).add(new THREE.Vector3(.5, 8, -3.5));
      lab.camera.lookAt(centre); lab.camera.updateMatrixWorld(); lab.setTool('probe');
      return { prepared: lab.parts.some(p => p.mesh.userData.preparedExterior?.specimenId === 'cockroach'),
        partCount: lab.parts.length, vertices: mesh.geometry.attributes.position.count,
        triangles: mesh.geometry.index.count / 3, decorativeChildren: mesh.children.length };
    });
    assert.equal(report.setup.prepared, true); assert.equal(report.setup.partCount, 27);
    assert.equal(report.setup.decorativeChildren, 0);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => {
      const lab = __LAB, mesh = lab.parts.find(p => p.id === 'midgut').mesh;
      const centre = mesh.geometry.boundingBox.getCenter(new lab.THREE.Vector3()).applyMatrix4(mesh.matrixWorld).project(lab.camera);
      // Account for the production orbit target without changing that control.
      lab.camera.setViewOffset(innerWidth, innerHeight, centre.x * innerWidth / 2, -centre.y * innerHeight / 2, innerWidth, innerHeight);
    });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: path.join(output, 'midgut-attached.png') });
    report.interaction = await page.evaluate(() => {
      const lab = __LAB, { THREE, camera } = lab, dis = lab.dissection;
      const part = lab.parts.find(p => p.id === 'midgut'), mesh = part.mesh;
      mesh.parent.updateMatrixWorld(true);
      const positions = mesh.geometry.attributes.position, rest = Array.from(positions.array), home = mesh.position.clone();
      const targets = [];
      // Find actual directly pickable wall vertices distributed along the loop,
      // not hard-coded screen coordinates or synthetic metadata hit targets.
      for (let region = 0; region < 3; region++) {
        let target;
        for (let i = 0; i < positions.count; i++) {
          const p = new THREE.Vector3().fromBufferAttribute(positions, i);
          if (!(region === 0 ? p.x > .65 && p.z > -1.7 : region === 1 ? p.z < -2.4 : p.z > -1.7 && p.z < -.8 && p.x < .5)) continue;
          const v = p.applyMatrix4(mesh.matrixWorld).project(camera), at = { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
          if (at.x > .05 && at.x < .95 && at.y > .05 && at.y < .95 && dis.pick(at.x, at.y)?.object === mesh) { target = at; break; }
        }
        if (!target) throw new Error('No directly reachable loop surface in region ' + region);
        lab.setTool('probe'); lab.feed(target.x, target.y, 0, false, 0);
        if (dis.hovered !== part.id) throw new Error('Probe did not identify midgut');
        targets.push(target);
      }
      const target = targets[0];
      lab.setTool('forceps'); lab.feed(target.x, target.y, 0, false, 0); lab.feed(target.x, target.y, .7, true, 0);
      lab.feed(target.x + .25, target.y + .15, .7, true, 0); lab.feed(target.x + .25, target.y + .15, 0, false, 0);
      if (dis.state.removed.has(part.id) || !mesh.position.equals(home)) throw new Error('Intact non-detachable gut was moved or extracted');
      if (!rest.every((n, i) => positions.array[i] === n)) throw new Error('Tool action changed the intact gut surface');
      lab.setTool('probe');
      return { probeRegions: targets.length, directMeshPicking: true, nonDetachablePreserved: true, intactGeometryPreserved: true };
    });
    report.cameraRequests = await page.evaluate(() => window.__cameraRequests);
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []);
    report.complete = true;
    console.log('Midgut rendered; three loop regions probe directly; non-detachable behavior preserved; no camera requests.');
  } finally {
    fs.writeFileSync(path.join(output, 'midgut.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
