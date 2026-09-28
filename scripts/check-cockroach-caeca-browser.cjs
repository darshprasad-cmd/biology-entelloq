/* Focused real-render / tool regression. Exposes only the digestive region for
   inspection; the normal opening sequence is covered by the five-specimen run.
   Synthetic application input does not validate a webcam or biological fidelity. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__caeca_review__.cjs'))('playwright');
const base = process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3002';
const output = path.resolve(process.env.BIOLOGY_CAECA_OUTPUT || path.join(root, 'docs/cockroach-caecal-pouches/detail'));
fs.mkdirSync(output, { recursive: true });
const report = { base, errors: [], cameraRequests: 0, complete: false,
  limitation: 'Isolated digestive-region diagnostic, not an end-to-end access sequence, educator review or webcam test.' };
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    page.on('pageerror', e => report.errors.push(e.message));
    await page.route('https://unpkg.com/**', route => route.abort());
    await page.addInitScript(() => {
      window.__cameraRequests = 0;
      navigator.mediaDevices.getUserMedia = async () => { window.__cameraRequests++; throw new Error('Camera forbidden in caeca diagnostic'); };
    });
    await page.goto(base + '/lab.html', { waitUntil: 'domcontentloaded' });
    const served = await (await page.request.get(page.url())).body();
    assert.ok(served.equals(fs.readFileSync(path.join(root, 'lab.html'))), 'current built artifact');
    report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    await page.waitForFunction(() => window.__LAB?.ready && window.__LAB.dissection);
    await page.evaluate(async () => { __LAB.intro()?.skip(); await __LAB.requestSpecimen('cockroach'); });
    report.setup = await page.evaluate(() => {
      const lab = __LAB, { THREE } = lab, p = lab.parts.find(p => p.id === 'gastric-caeca');
      const prepared = lab.parts.some(p => p.mesh.userData.preparedExterior?.specimenId === 'cockroach');
      // Deliberate diagnostic exposure. Do not count this as opening the shell.
      for (const part of lab.parts) part.mesh.visible = ['gastric-caeca', 'midgut', 'gizzard'].includes(part.id);
      lab.dissection.state.maxLayerRevealed = 2;
      p.mesh.parent.updateMatrixWorld(true);
      const centre = p.mesh.localToWorld(new THREE.Vector3(0, 0, 0));
      lab.camera.position.copy(centre).add(new THREE.Vector3(1.2, 2.8, -1.1));
      lab.camera.lookAt(centre); lab.camera.updateMatrixWorld();
      lab.setTool('probe');
      return { prepared, partCount: lab.parts.length, vertices: p.mesh.geometry.attributes.position.count,
        triangles: p.mesh.geometry.index.count / 3, decorativeChildren: p.mesh.children.length };
    });
    assert.equal(report.setup.prepared, true); assert.equal(report.setup.partCount, 27);
    assert.equal(report.setup.decorativeChildren, 0);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate(() => {
      const lab = __LAB, mesh = lab.parts.find(p => p.id === 'gastric-caeca').mesh;
      const centre = mesh.geometry.boundingBox.getCenter(new lab.THREE.Vector3()).applyMatrix4(mesh.matrixWorld).project(lab.camera);
      // Reframe this diagnostic without altering OrbitControls or production UI.
      lab.camera.setViewOffset(innerWidth, innerHeight, centre.x * innerWidth / 2, -centre.y * innerHeight / 2, innerWidth, innerHeight);
    });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: path.join(output, 'caeca-attached.png') });
    report.interaction = await page.evaluate(() => {
      const lab = __LAB, { THREE, camera } = lab, dis = lab.dissection;
      const part = lab.parts.find(p => p.id === 'gastric-caeca'), mesh = part.mesh;
      mesh.parent.updateMatrixWorld(true);
      const positions = mesh.geometry.attributes.position;
      const rest = Array.from(positions.array); let target;
      for (let i = 0; i < positions.count; i += 2) {
        const world = mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(positions, i));
        const v = world.project(camera), at = { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
        if (at.x > .05 && at.x < .95 && at.y > .05 && at.y < .95 && dis.pick(at.x, at.y)?.object === mesh) { target = at; break; }
      }
      if (!target) throw new Error('No reachable caecal pouch surface');
      lab.setTool('probe'); lab.feed(target.x, target.y, 0, false, 0);
      if (dis.hovered !== part.id) throw new Error('Probe failed to identify caecal mesh');
      lab.setTool('forceps'); lab.feed(target.x, target.y, 0, false, 0); lab.feed(target.x, target.y, .7, true, 0);
      // An off-canvas destination gives a large enough camera-plane displacement
      // at this close diagnostic zoom. Native full-view drags are tested elsewhere.
      lab.feed(target.x + 3, target.y, .7, true, 0); lab.feed(target.x + 3, target.y, 0, false, 0);
      if (!dis.state.removed.has(part.id)) throw new Error('Forceps did not extract the pouches');
      const extracted = mesh.position.toArray();
      mesh.parent.updateMatrixWorld(true);
      const repick = dis.pick(target.x, target.y)?.object?.userData.partId;
      if (repick === part.id) throw new Error('Extracted tissue still blocks the cavity');
      // Preserve the app's intentional extraction boundary: restoring a severed
      // organ without its attachments is unsafe. Access-layer Undo is exercised
      // by the full interaction suite; isolated engine Undo has unit coverage.
      if (lab.canUndo || lab.undo() !== false || !dis.state.removed.has(part.id))
        throw new Error('Organ extraction must retain the existing Undo boundary');
      if (!rest.every((n, i) => positions.array[i] === n)) throw new Error('Lift changed tissue geometry');
      return { probe: part.id, extracted, cavityUnblocked: true, extractionUndoBoundaryPreserved: true, geometryPreserved: true };
    });
    report.cameraRequests = await page.evaluate(() => window.__cameraRequests);
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []);
    report.complete = true;
    console.log('Caecal geometry rendered; probe, forceps and extraction Undo boundary passed; camera requests: 0.');
  } finally {
    fs.writeFileSync(path.join(output, 'caeca.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
