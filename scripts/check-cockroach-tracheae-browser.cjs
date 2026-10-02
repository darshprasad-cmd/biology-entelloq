/* Actual WebGL diagnostic exposing the respiratory subset. This is NOT the
 * normal dissection sequence, a complete anatomy review or camera validation.
 * The full access sequence is covered by check-dissection-interactions-browser. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__tracheae_review__.cjs'))('playwright');
const base = process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3008';
const packaged = process.env.BIOLOGY_TRACHEAE_PACKAGED === '1';
const url = packaged ? base.replace(/\/$/, '') + '/#lab' : base + '/lab.html';
const artifact = path.join(root, packaged ? 'dist/index.html' : 'lab.html');
const output = path.resolve(process.env.BIOLOGY_TRACHEAE_OUTPUT || path.join(root, 'docs/cockroach-tracheal-picking/detail'));
fs.mkdirSync(output, { recursive: true });
const report = { url, packaged, complete: false, errors: [], cameraRequests: 0,
  limitation: 'Exposed respiratory subset with synthetic input, not normal tissue access, full airway anatomy, physical touch or webcam validation.' };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => report.errors.push(error.message));
    await page.route('https://unpkg.com/**', route => route.abort());
    await page.addInitScript(() => {
      window.__cameraRequests = 0;
      navigator.mediaDevices.getUserMedia = async () => { window.__cameraRequests++; throw new Error('Camera forbidden in tracheal diagnostic'); };
    });
    // The 26 MB portable response can be evicted from Chromium's inspector
    // cache while its nested documents initialize. Verify bytes independently
    // before navigation rather than relying on that transient inspector buffer.
    const response = await page.request.get(url.split('#')[0], { headers: { 'Cache-Control': 'no-cache' }, timeout: 90000 });
    assert.equal(response.status(), 200);
    const served = await response.body();
    assert.ok(served.equals(fs.readFileSync(artifact)), 'served application matches the current built artifact');
    report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    let world = page;
    if (packaged) {
      const shellElement = await page.locator('#bioq-workspace').elementHandle();
      const shell = await shellElement.contentFrame();
      await shell.locator('#launcher.on').waitFor();
      world = await (await shell.locator('#launchFrame').elementHandle()).contentFrame();
    }
    await world.waitForFunction(() => window.__LAB?.ready && window.__LAB.dissection, null, { timeout: 90000 });
    await world.evaluate(async () => { __LAB.intro()?.skip(); await __LAB.requestSpecimen('cockroach'); });
    report.setup = await world.evaluate(() => {
      const lab = __LAB, mesh = lab.parts.find(p => p.id === 'tracheae').mesh;
      // Deliberate test-only exposure. Normal access is verified separately.
      for (const part of lab.parts) part.mesh.visible = part.mesh === mesh;
      lab.dissection.state.maxLayerRevealed = 3;
      mesh.parent.updateMatrixWorld(true);
      const centre = mesh.geometry.boundingBox.getCenter(new lab.THREE.Vector3()).applyMatrix4(mesh.matrixWorld);
      lab.camera.position.copy(centre).add(new lab.THREE.Vector3(0, 15, 6));
      lab.camera.lookAt(centre); lab.camera.updateMatrixWorld(); lab.setTool('probe');
      return { prepared: lab.parts.some(p => p.mesh.userData.preparedExterior?.specimenId === 'cockroach'),
        partCount: lab.parts.length, vertices: mesh.geometry.attributes.position.count,
        triangles: mesh.geometry.index.count / 3, decorativeChildren: mesh.children.length };
    });
    assert.equal(report.setup.prepared, true); assert.equal(report.setup.partCount, 27);
    assert.equal(report.setup.decorativeChildren, 0);
    await world.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await world.evaluate(() => {
      const lab = __LAB, mesh = lab.parts.find(p => p.id === 'tracheae').mesh;
      const centre = mesh.geometry.boundingBox.getCenter(new lab.THREE.Vector3()).applyMatrix4(mesh.matrixWorld).project(lab.camera);
      lab.camera.setViewOffset(innerWidth, innerHeight, centre.x * innerWidth / 2, -centre.y * innerHeight / 2, innerWidth, innerHeight);
    });
    await world.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: path.join(output, 'tracheae-connected.png') });
    report.interaction = await world.evaluate(() => {
      const lab = __LAB, { THREE, camera } = lab, dis = lab.dissection;
      const part = lab.parts.find(p => p.id === 'tracheae'), mesh = part.mesh;
      const positions = mesh.geometry.attributes.position, rest = Array.from(positions.array);
      mesh.parent.updateMatrixWorld(true);
      const targets = [];
      for (const side of [-1, 1]) {
        // Find direct hits on both actual trunks and EVERY authored branch,
        // including the right-side surfaces that used to be ornamental children.
        for (let region = -1; region < 5; region++) {
          let target;
          for (let i = 0; i < positions.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(positions, i);
            const inside = region < 0 ? side * p.x > 1.21 && p.z < -3.3 && p.z > -4.3
              : side * p.x > .45 && side * p.x < .9 && Math.abs(p.z - (1.6 - region * 1.1 - .08)) < .075;
            if (!inside) continue;
            const v = p.applyMatrix4(mesh.matrixWorld).project(camera), at = { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
            if (at.x > .05 && at.x < .95 && at.y > .05 && at.y < .95 && dis.pick(at.x, at.y)?.object === mesh) { target = at; break; }
          }
          if (!target) throw new Error('No directly reachable airway surface: side ' + side + ', region ' + region);
          lab.setTool('probe'); lab.feed(target.x, target.y, 0, false, 0);
          if (dis.hovered !== part.id) throw new Error('Probe did not identify tracheal system');
          targets.push({ side, region, ...target });
        }
      }
      // Start extraction on a right branch, not the formerly working left trunk.
      const target = targets.find(p => p.side === 1 && p.region === 2);
      lab.setTool('forceps'); lab.feed(target.x, target.y, 0, false, 0); lab.feed(target.x, target.y, .7, true, 0);
      lab.feed(target.x + 3, target.y, .7, true, 0); lab.feed(target.x + 3, target.y, 0, false, 0);
      if (!dis.state.removed.has(part.id)) throw new Error('Forceps did not extract the airway subset');
      mesh.parent.updateMatrixWorld(true);
      for (const at of targets) if (dis.pick(at.x, at.y)?.object?.userData.partId === part.id)
        throw new Error('Removed airway still blocks the cavity');
      // Preserve the app's existing organ-extraction boundary. Access-layer Undo
      // is allowed; restoring organ attachments is not implemented by the app.
      if (lab.canUndo || lab.undo() !== false || !dis.state.removed.has(part.id))
        throw new Error('Organ-extraction Undo boundary changed');
      if (!rest.every((value, i) => positions.array[i] === value)) throw new Error('Extraction altered airway geometry');
      return { probedTrunks: 2, probedBranches: 10, rightBranchExtraction: true,
        cavityUnblocked: true, extractionUndoBoundaryPreserved: true, geometryPreserved: true };
    });
    report.cameraRequests = (await Promise.all(page.frames().map(frame => frame.evaluate(() => window.__cameraRequests || 0)))).reduce((a, b) => a + b, 0);
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []);
    report.complete = true;
    console.log('Both tracheal trunks and ten branches probe directly; right-side extraction clears the cavity; existing Undo boundary preserved; no camera requests.');
  } finally {
    fs.writeFileSync(path.join(output, 'tracheae.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
