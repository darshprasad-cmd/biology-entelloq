/* Real five-specimen WebGL + cut/forceps interaction check. Recorded tracker
   snapshots go through production routeInput; no camera is requested. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__lab_interactions__.cjs'))('playwright');
const base = process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3002';
const output = process.env.BIOLOGY_INTERACTION_OUTPUT || path.join(root, 'docs/dissection-interactions/browser');
fs.mkdirSync(output, { recursive: true });
const specimenIds = (process.env.BIOLOGY_INTERACTION_SPECIMENS || 'frog,cockroach,earthworm,fish,heart').split(',');
assert.ok(specimenIds.length && specimenIds.every(id => ['frog', 'cockroach', 'earthworm', 'fish', 'heart'].includes(id)), 'known specimen IDs only');
const report = { base, requestedSpecimens: specimenIds, specimens: [], errors: [], cameraRequests: 0 };
const save = () => fs.writeFileSync(path.join(output, 'interactions.json'), JSON.stringify(report, null, 2));
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('https://unpkg.com/**', route => route.abort());
    const page = await context.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', e => report.errors.push(e.message));
    await page.addInitScript(() => {
      window.__cameraRequests = 0;
      navigator.mediaDevices.getUserMedia = async () => { window.__cameraRequests++; throw new Error('Camera forbidden in synthetic test'); };
    });
    await page.goto(base + '/lab.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LAB?.ok, null, { timeout: 45000 });
    await page.evaluate(() => window.__LAB.intro()?.skip());
    for (const id of specimenIds) {
      await page.evaluate(id => window.__LAB.loadSpecimen(id), id);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: path.join(output, id + '-intact.png') });
      const result = await page.evaluate(async id => {
        const lab = window.__LAB, { THREE, camera } = lab, dis = lab.dissection;
        const group = lab.parts[0].mesh.parent, results = [], lifted = [];
        const screen = p => { const v = p.clone().project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }; };
        const act = (p, gripping, dt = 16) => {
          group.updateMatrixWorld(true);
          lab.feedHandSnapshot({ active: true, health: 0, hands: [{ present: false }, {
            present: true, cursor: p, cursorS: p, isPinching: gripping,
            pinchStrength: gripping ? .95 : 0, span: 0, gesture: gripping ? 'pinch' : 'point', roll: 0,
          }] }, dt);
          lab.cutting().update(dt);
        };
        function bounds(part) {
          part.mesh.geometry.computeBoundingBox();
          return part.mesh.geometry.boundingBox.clone().applyMatrix4(part.mesh.matrixWorld);
        }
        // Exercise real pin actions, not seeding readiness state.
        lab.setTool('pins');
        for (const p of lab.parts.filter(p => p.mesh.visible)) {
          const arr = p.mesh.geometry.attributes.position;
          for (let i = 0; i < arr.count; i += Math.max(1, Math.floor(arr.count / 28))) {
            const at = screen(new THREE.Vector3().fromBufferAttribute(arr, i).applyMatrix4(p.mesh.matrixWorld));
            const hit = dis.pick(at.x, at.y);
            if (hit?.object.userData.partId !== p.id) continue;
            act(at, true); act(at, false); break;
          }
          if (dis.state.pinned.size >= 4) break;
        }
        function strokeFor(part) {
          const b = bounds(part), c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3());
          for (const axis of ['z', 'x']) for (const side of [0, -.2, .2, -.35, .35]) {
            const other = axis === 'z' ? 'x' : 'z'; let run = [];
            for (let i = 0; i < 31; i++) {
              const p = c.clone(); p[axis] += size[axis] * (-.4 + .8 * i / 30); p[other] += size[other] * side;
              const at = screen(p), hit = dis.pick(at.x, at.y);
              if (hit?.object.userData.partId === part.id) {
                run.push({ at, point: hit.point.clone() });
                if (run.length >= 6 && run[0].point.distanceTo(hit.point) > 1.5) return run;
              } else run = [];
            }
          }
          return null;
        }
        async function liftPart(target) {
          const part = lab.parts.find(p => p.id === target);
          if (!part || !part.mesh.visible || !part.detachable) throw new Error(id + ': unavailable forceps target ' + target);
          group.updateMatrixWorld(true);
          const arr = part.mesh.geometry.attributes.position; let grip;
          for (let i = 0; i < arr.count; i += Math.max(1, Math.floor(arr.count / 160))) {
            const at = screen(new THREE.Vector3().fromBufferAttribute(arr, i).applyMatrix4(part.mesh.matrixWorld));
            if (dis.pick(at.x, at.y)?.object.userData.partId === target) { grip = at; break; }
          }
          if (!grip) throw new Error(id + ': no forceps contact on ' + target);
          lab.setTool('forceps'); act(grip, false); act(grip, true);
          const dest = { x: grip.x + .4, y: grip.y };
          act(dest, true); act(dest, false);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          if (!dis.state.removed.has(target)) throw new Error(id + ': forceps failed to lift ' + target);
          lifted.push(target);
        }
        if (id === 'cockroach') { await liftPart('wing-left'); await liftPart('wing-right'); }
        if (id === 'fish') await liftPart('operculum');
        // Follow each specimen's actual access sequence, not arbitrary organs
        // forced into the frog's layered workflow. Insect fat is lifted below.
        const access = { frog: ['skin', 'subcutaneous-fascia', 'muscle-wall', 'parietal-peritoneum'],
          cockroach: ['exoskeleton'], earthworm: ['body-wall'],
          fish: ['body-wall', 'myotome-wall'], heart: ['pericardium', 'epicardium', 'lv-free-wall'] }[id];
        for (const target of access) {
          if (id === 'heart' && target === 'epicardium') await liftPart('epicardial-fat');
          group.updateMatrixWorld(true);
          const part = lab.parts.find(p => p.id === target);
          const path = part && part.mesh.visible && strokeFor(part);
          if (!path) throw new Error(id + ': no accessible cuttable surface ' + target);
          const originalIndexCount = part.mesh.geometry.index?.count || part.mesh.geometry.attributes.position.count;
          lab.setTool('scalpel'); act(path[0].at, false);
          for (const point of path) act(point.at, true);
          act(path.at(-1).at, false);
          // Let the real tick (softbody, constraints and cutting in production
          // order) run before checking the incision or touching the forceps.
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          const inc = dis.state.incisions.get(part.id);
          if (!inc || inc.length <= 1.1) throw new Error(id + ': right hand did not incise ' + part.id);
          if (!lab.cutting().has(part.id)) throw new Error(id + ': incision geometry missing ' + part.id);
          const cutIndexCount = part.mesh.geometry.drawRange.count;
          if (!(cutIndexCount < originalIndexCount)) throw new Error(id + ': no actual faces opened ' + part.id);
          // Grip an accessible cut surface, then pull off it into empty space.
          let grip;
          for (const pt of path) if (dis.pick(pt.at.x, pt.at.y)?.object.userData.partId === part.id) { grip = pt.at; break; }
          if (!grip) {
            const b = bounds(part), c = b.getCenter(new THREE.Vector3());
            for (const dx of [-.5, .5, -1, 1]) {
              const at = screen(c.clone().add(new THREE.Vector3(dx, 0, 0)));
              if (dis.pick(at.x, at.y)?.object.userData.partId === part.id) { grip = at; break; }
            }
          }
          if (!grip) throw new Error(id + ': no remaining cut edge for forceps ' + part.id);
          lab.setTool('forceps'); act(grip, false); act(grip, true);
          for (let i = 1; i <= 24; i++) act({ x: grip.x + i / 70, y: grip.y }, true, 32);
          act({ x: grip.x + 24 / 70, y: grip.y }, false, 32);
          for (let i = 0; i < 30; i++) act({ x: .98, y: .1 }, false, 32);
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          if (!dis.state.opened.has(part.id) || !dis.state.removed.has(part.id) || part.mesh.visible)
            throw new Error(id + ': forceps left a covering layer ' + part.id);
          if (lab.cutting().has(part.id)) throw new Error(id + ': removed layer retained wound overlay ' + part.id);
          results.push({ part: part.id, incisionLength: inc.length, cutIndexCount, opened: true, removed: true, hidden: true, nextLayer: dis.state.maxLayerRevealed });
        }
        if (id === 'cockroach') {
          const fat = lab.parts.find(p => p.id.startsWith('fat-body-') && p.mesh.visible);
          await liftPart(fat.id);
        }
        return { id, pinned: dis.state.pinned.size, layers: results, damage: dis.state.damage.length, inputSource: lab.input.source,
          lifted,
          visibleInternal: lab.parts.filter(p => p.layer > 0 && p.mesh.visible).map(p => p.id) };
      }, id);
      report.specimens.push(result); console.log('Right-hand cut and forceps verified:', id, result.layers.map(l => l.part).join(', '));
      assert.equal(result.damage, 0, 'firm pinch alone is not a plunging injury');
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      await page.screenshot({ path: path.join(output, id + '-opened.png') }); save();
    }
    report.cameraRequests = await page.evaluate(() => window.__cameraRequests);
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []);
    report.complete = true; report.limit = 'Synthetic tracker snapshots verify application routing, not webcam recognition or measured physical tissue fidelity.';
  } finally { save(); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
