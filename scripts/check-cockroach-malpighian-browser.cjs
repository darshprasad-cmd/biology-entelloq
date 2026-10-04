/* Actual WebGL diagnostic exposing a schematic Malpighian subset and its gut
 * neighbours, then isolating the subset for direct picking. This is NOT the
 * normal dissection sequence, complete species anatomy or camera validation.
 * The full access sequence is covered by check-dissection-interactions-browser. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__malpighian_review__.cjs'))('playwright');
const base = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3008').replace(/\/$/, '');
const packaged = process.env.BIOLOGY_MALPIGHIAN_PACKAGED === '1';
const url = packaged ? base + '/#lab' : base + '/lab.html';
// For live checks, use the independently downloaded artifact from the verified
// deployment run. Its bytes must match exactly; do not weaken this to markers.
const artifact = process.env.BIOLOGY_DEPLOYED_ARTIFACT
  ? path.resolve(process.env.BIOLOGY_DEPLOYED_ARTIFACT)
  : path.join(root, packaged ? 'dist/index.html' : 'lab.html');
const output = path.resolve(process.env.BIOLOGY_MALPIGHIAN_OUTPUT || path.join(root, 'docs/cockroach-malpighian-attachments/detail'));
fs.mkdirSync(output, { recursive: true });
const report = { url, packaged, complete: false, errors: [], cameraRequests: 0,
  limitation: 'Exposed gut-attachment view followed by isolated component picking with synthetic input. Not normal tissue access, complete tubule counts or lumens, physical touch, or webcam validation.' };

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => report.errors.push(error.message));
    await page.route('https://unpkg.com/**', route => route.abort());
    await page.addInitScript(() => {
      window.__cameraRequests = 0;
      navigator.mediaDevices.getUserMedia = async () => { window.__cameraRequests++; throw new Error('Camera forbidden in Malpighian diagnostic'); };
    });
    // The portable response can leave Chromium's inspector cache while nested
    // documents initialize. Fetch independently before navigation for byte QA.
    const response = await page.request.get(url.split('#')[0], { headers: { 'Cache-Control': 'no-cache' }, timeout: 90000 });
    assert.equal(response.status(), 200);
    const served = await response.body();
    assert.ok(served.equals(fs.readFileSync(artifact)), 'served application matches the expected built/deployed artifact byte for byte');
    report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    let world = page;
    if (packaged) {
      const shell = await (await page.locator('#bioq-workspace').elementHandle()).contentFrame();
      await shell.locator('#launcher.on').waitFor();
      world = await (await shell.locator('#launchFrame').elementHandle()).contentFrame();
    }
    await world.waitForFunction(() => window.__LAB?.ready && window.__LAB.dissection, null, { timeout: 90000 });
    await world.evaluate(async () => { __LAB.intro()?.skip(); await __LAB.requestSpecimen('cockroach'); });
    report.setup = await world.evaluate(() => {
      const lab = __LAB, { THREE } = lab, part = lab.parts.find(p => p.id === 'malpighian-tubules'), mesh = part.mesh;
      const g = mesh.geometry, positions = g.attributes.position;
      if (!g.index) throw new Error('Expected indexed tubule geometry');
      const adjacency = Array.from({ length: positions.count }, () => new Set());
      for (let i = 0; i < g.index.count; i += 3) {
        const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
        if (ids.some(id => !Number.isInteger(id) || id < 0 || id >= positions.count)) throw new Error('Invalid component index');
        for (const [a, b] of [[ids[0], ids[1]], [ids[1], ids[2]], [ids[2], ids[0]]]) { adjacency[a].add(b); adjacency[b].add(a); }
      }
      // Discover connected surface components from rendered triangles, without
      // fixed offsets, authored part metadata, or invisible proxy targets.
      const visited = new Set(), components = [];
      for (let start = 0; start < positions.count; start++) {
        if (visited.has(start)) continue;
        const ids = new Set([start]), queue = [start]; visited.add(start);
        while (queue.length) for (const next of adjacency[queue.pop()]) if (!visited.has(next)) {
          visited.add(next); ids.add(next); queue.push(next);
        }
        const bounds = new THREE.Box3().setFromPoints([...ids].map(i => new THREE.Vector3().fromBufferAttribute(positions, i)));
        components.push({ ids, bounds, diagonal: bounds.getSize(new THREE.Vector3()).length() });
      }
      components.sort((a, b) => a.diagonal - b.diagonal);
      if (components.length !== 24) throw new Error('Expected six ampullae and eighteen representative tubules, got ' + components.length);
      const ampullae = components.slice(0, 6), threads = components.slice(6);
      if (!(threads[0].diagonal > ampullae[5].diagonal * 2)) throw new Error('Six compact ampullae must be distinct from eighteen extended thread surfaces');
      const junction = new THREE.Box3();
      for (const ampulla of ampullae) junction.union(ampulla.bounds);
      // Test-only exposure: these snapshots do not pretend to be a completed
      // dissection. Keep the genuine gut neighbours for the attachment view.
      const visibleIds = ['malpighian-tubules', 'midgut', 'hindgut'];
      const viewBounds = new THREE.Box3();
      for (const p of lab.parts) p.mesh.visible = visibleIds.includes(p.id);
      lab.dissection.state.maxLayerRevealed = 2;
      mesh.parent.updateMatrixWorld(true);
      for (const p of lab.parts.filter(p => visibleIds.includes(p.id))) viewBounds.expandByObject(p.mesh, true);
      const centre = viewBounds.getCenter(new THREE.Vector3()), size = viewBounds.getSize(new THREE.Vector3());
      const distance = Math.max(size.x, size.z) / (2 * Math.tan(lab.camera.fov * Math.PI / 360)) * 1.35;
      lab.camera.clearViewOffset();
      lab.camera.position.copy(centre).add(new THREE.Vector3(0, distance, distance * .32));
      lab.camera.lookAt(centre); lab.camera.updateMatrixWorld(); lab.setTool('probe');
      window.__malpighianDiagnostic = { threads, ampullae, junction, centre };
      return { prepared: lab.parts.some(p => p.mesh.userData.preparedExterior?.specimenId === 'cockroach'),
        partCount: lab.parts.length, vertices: positions.count, triangles: g.index.count / 3,
        decorativeChildren: mesh.children.length, ampullae: ampullae.length, representativeThreads: threads.length,
        attachmentViewParts: visibleIds, componentBounds: components.map(c => ({ vertices: c.ids.size,
          min: c.bounds.min.toArray(), max: c.bounds.max.toArray() })) };
    });
    assert.equal(report.setup.prepared, true); assert.equal(report.setup.partCount, 27);
    assert.equal(report.setup.decorativeChildren, 0);
    assert.equal(report.setup.ampullae, 6); assert.equal(report.setup.representativeThreads, 18);
    await world.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await world.evaluate(() => {
      const lab = __LAB, centre = __malpighianDiagnostic.centre.clone().project(lab.camera);
      lab.camera.setViewOffset(innerWidth, innerHeight, centre.x * innerWidth / 2, -centre.y * innerHeight / 2, innerWidth, innerHeight);
    });
    await world.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: path.join(output, 'malpighian-gut-attachment.png') });
    await world.evaluate(() => {
      for (const part of __LAB.parts) part.mesh.visible = part.id === 'malpighian-tubules';
    });
    await world.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: path.join(output, 'malpighian-pickable-threads.png') });
    report.interaction = await world.evaluate(() => {
      const lab = __LAB, { THREE, camera } = lab, dis = lab.dissection;
      const part = lab.parts.find(p => p.id === 'malpighian-tubules'), mesh = part.mesh;
      const { threads, junction } = __malpighianDiagnostic, geometry = mesh.geometry;
      const positions = geometry.attributes.position, rest = Array.from(positions.array), targets = [], events = [];
      const originalPushEvent = lab.shell.pushEvent;
      // Observe the actual production event bus, forwarding every event intact.
      lab.shell.pushEvent = function (event) { events.push(event); return originalPushEvent.apply(this, arguments); };
      const screen = p => { const v = p.applyMatrix4(mesh.matrixWorld).project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }; };
      const feed = (at, gripping) => lab.feed(at.x, at.y, gripping ? .7 : 0, gripping, 0);
      try {
        mesh.parent.updateMatrixWorld(true);
        for (const [component, thread] of threads.entries()) {
          let target;
          // Use real surface vertices outside the complete junction envelope;
          // verify the ray hits this component, not an overlapping sibling.
          const candidates = [...thread.ids].map(i => ({ i, p: new THREE.Vector3().fromBufferAttribute(positions, i) }))
            .filter(({ p }) => junction.distanceToPoint(p) > .15)
            .sort((a, b) => junction.distanceToPoint(b.p) - junction.distanceToPoint(a.p));
          for (const { i, p } of candidates) {
            const at = screen(p), hit = dis.pick(at.x, at.y);
            if (at.x > .05 && at.x < .95 && at.y > .05 && at.y < .95 && hit?.object === mesh && thread.ids.has(hit.face.a)) {
              target = { component, vertex: i, face: hit.faceIndex, ...at }; break;
            }
          }
          if (!target) throw new Error('No directly reachable non-junction surface on representative tubule ' + component);
          const beforeProbe = events.length;
          lab.setTool('probe'); feed(target, false); feed(target, true); feed(target, false);
          if (dis.hovered !== part.id || !events.slice(beforeProbe).some(e => e.kind === 'discover' && e.partId === part.id))
            throw new Error('Probe did not identify tubule ' + component);
          const before = events.length;
          lab.setTool('scalpel'); feed(target, false); feed(target, true); feed(target, false);
          if (!events.slice(before).some(e => e.kind === 'incise' && e.partId === part.id && e.meta?.refused))
            throw new Error('Scalpel refusal missing on tubule ' + component);
          if (dis.state.incisions.has(part.id) || lab.cutting().has(part.id)) throw new Error('Noncuttable tubules acquired a wound');
          targets.push(target);
        }
        // Start extraction at a true distal thread, never at an ampulla/carrier.
        const target = targets[Math.floor(targets.length / 2)];
        lab.setTool('forceps'); feed(target, false); feed(target, true);
        feed({ x: target.x + 3, y: target.y }, true); feed({ x: target.x + 3, y: target.y }, false);
        if (!dis.state.removed.has(part.id) || !events.some(e => e.kind === 'lift' && e.partId === part.id))
          throw new Error('Forceps did not extract the complete Malpighian subset');
        mesh.parent.updateMatrixWorld(true);
        for (const at of targets) if (dis.pick(at.x, at.y)?.object?.userData.partId === part.id)
          throw new Error('An extracted tubule still blocks its former position');
        // Preserve the existing app boundary: access-layer Undo is implemented,
        // but app-level restoration of extracted organ attachments is not.
        if (lab.canUndo || lab.undo() !== false || !dis.state.removed.has(part.id))
          throw new Error('Organ-extraction Undo boundary changed');
        if (mesh.geometry !== geometry || !rest.every((value, i) => positions.array[i] === value))
          throw new Error('Tool actions changed the noncuttable tubule geometry');
        return { componentDiscovery: 'indexed triangle connectivity', probedThreads: targets.length,
          refusedScalpelContacts: targets.length, extractionFromDistalThread: target.component,
          wholeSubsetExtracted: true, cavityUnblocked: true, extractionUndoBoundaryPreserved: true,
          geometryPreserved: true, targets };
      } finally { lab.shell.pushEvent = originalPushEvent; }
    });
    assert.equal(report.interaction.probedThreads, 18);
    report.cameraRequests = (await Promise.all(page.frames().map(frame => frame.evaluate(() => window.__cameraRequests || 0)))).reduce((a, b) => a + b, 0);
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []);
    report.complete = true;
    console.log('All eighteen representative Malpighian threads probe directly and refuse a scalpel; forceps clears the whole subset; existing Undo boundary preserved; no camera requests.');
  } finally {
    fs.writeFileSync(path.join(output, 'malpighian.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
