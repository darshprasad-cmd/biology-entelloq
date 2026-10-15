/* Real lab fluid controls and accepted-cut integration. Synthetic hand snapshots
   exercise production routing; a native stationary touch exercises the touch router.
   No webcam is requested, and no blood event is seeded directly. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__specimen_fluids__.cjs'))('playwright');
const base = process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3014';
const output = path.resolve(root, process.env.BIOLOGY_FLUID_OUTPUT || 'docs/tissue-realism/fluids');
fs.mkdirSync(output, { recursive: true });
const report = { base, complete: false, errors: [], warnings: [], cameraRequests: 0, layouts: [], controls: [], interactions: [] };
const save = () => fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
async function bounded(label, run, timeout = 60000) {
  report.action = label; report.actionStartedAt = new Date().toISOString(); save();
  let timer;
  try {
    return await Promise.race([run(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error('Timed out after ' + timeout + 'ms: ' + label)), timeout);
    })]);
  } finally { clearTimeout(timer); }
}
const frames = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const sceneRendering = (page, visible) => page.evaluate(visible => {
  let scene = __LAB.parts[0].mesh;
  while (scene.parent) scene = scene.parent;
  scene.visible = visible;
}, visible);
const state = page => page.evaluate(() => {
  const b = __LAB.blood();
  return { context: b.context, stats: b.stats, intensity: b.intensity, enabled: b.enabled,
    running: __LAB.physio()?.running() || false, hasPhysio: !!__LAB.physio() };
});
async function openControls(page) {
  if (!await page.locator('#preparationseg').isVisible()) await page.locator('.bchip').click();
}
async function condition(page, mode) {
  report.action = 'choose condition ' + mode; save();
  await openControls(page);
  await page.locator('[data-preparation="' + mode + '"]').click();
  await page.waitForFunction(mode => __LAB.blood().context.preparation === mode, mode);
}
async function closeControls(page) {
  await page.mouse.move(5, 5);
  await frames(page);
  if (await page.locator('#consoleclose').isVisible()) await page.locator('#consoleclose').click();
  const structureClose = page.locator('#structclose');
  if (await structureClose.isVisible()) {
    try { await structureClose.click({ timeout: 2000 }); }
    catch (error) {
      // The hover card can dismiss itself after the pointer leaves the specimen.
      // A still-visible card remains a real failure; do not force-click hidden UI.
      if (await structureClose.isVisible()) throw error;
    }
  }
}
async function load(page, id) {
  console.log('Checking specimen:', id);
  await closeControls(page);
  await page.evaluate(id => __LAB.requestSpecimen(id), id);
  await page.waitForFunction(id => __LAB.ready && __LAB.blood().context.specimenId === id, id, { timeout: 60000 });
  await frames(page);
}
async function installHelpers(page) {
  await page.evaluate(() => {
    const lab = __LAB, { THREE, camera } = lab;
    const group = () => lab.parts[0].mesh.parent;
    const screen = p => { const v = p.clone().project(camera); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 }; };
    const act = (at, gripping, dt = 16) => {
      group().updateMatrixWorld(true);
      lab.feedHandSnapshot({ active: true, health: 0, hands: [{ present: false }, {
        present: true, cursor: at, cursorS: at, isPinching: gripping, pinchStrength: gripping ? .95 : 0,
        span: 0, gesture: gripping ? 'pinch' : 'point', roll: 0,
      }] }, dt);
      lab.cutting().update(dt);
    };
    const sample = target => {
      group().updateMatrixWorld(true); camera.updateMatrixWorld();
      const part = lab.parts.find(p => p.id === target);
      if (!part?.mesh.visible) throw Error('No visible target ' + target);
      part.mesh.geometry.computeBoundingBox();
      const box = part.mesh.geometry.boundingBox.clone().applyMatrix4(part.mesh.matrixWorld);
      const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      for (const axis of ['z', 'x']) for (const side of [0, -.2, .2, -.35, .35]) {
        const other = axis === 'z' ? 'x' : 'z'; let run = [];
        for (let i = 0; i < 41; i++) {
          const p = center.clone(); p[axis] += size[axis] * (-.4 + .8 * i / 40); p[other] += size[other] * side;
          const at = screen(p), hit = lab.dissection.pick(at.x, at.y);
          if (hit?.object.userData.partId === target) {
            run.push({ at, point: hit.point.toArray() });
            if (run.length >= 6 && new THREE.Vector3().fromArray(run[0].point).distanceTo(hit.point) > 1.5) return run;
          } else run = [];
        }
      }
      throw Error('No cut path on ' + target);
    };
    const pin = () => {
      lab.setTool('pins'); act({ x: .98, y: .1 }, false);
      for (const part of lab.parts.filter(p => p.mesh.visible)) {
        const arr = part.mesh.geometry.attributes.position;
        for (let i = 0; i < arr.count; i += Math.max(1, Math.floor(arr.count / 60))) {
          const at = screen(new THREE.Vector3().fromBufferAttribute(arr, i).applyMatrix4(part.mesh.matrixWorld));
          if (lab.dissection.pick(at.x, at.y)?.object.userData.partId !== part.id) continue;
          act(at, true); act(at, false); break;
        }
        if (lab.dissection.state.pinned.size >= 4) break;
      }
      return lab.dissection.state.pinned.size;
    };
    const cut = (target, midDepth = null) => {
      const points = sample(target), blood = lab.blood(), calls = [], original = blood.bleed;
      blood.bleed = input => {
        calls.push({ partId: input.partId, point: [input.point.x, input.point.y, input.point.z] });
        return original(input);
      };
      try {
        lab.setTool('scalpel'); act(points[0].at, false);
        for (const [index, p] of points.entries()) {
          act(p.at, true);
          // Invoke the real depth button handler within one synthetic gesture,
          // before the next production animation frame can end that gesture.
          if (midDepth !== null && index === 2) document.querySelector('[data-depth="' + midDepth + '"]').click();
        }
        act(points.at(-1).at, false);
      } finally { blood.bleed = original; }
      const incision = lab.dissection.state.incisions.get(target);
      return { target, calls, stats: blood.stats, incisionLength: incision?.length || 0, depth: incision?.depth,
        peelable: !!lab.parts.find(p => p.id === target).mesh.userData.peelable,
        damage: lab.dissection.state.damage.map(d => ({ partId: d.partId, kind: d.kind })),
        acceptedPoints: incision?.points.map(p => p.toArray()) || [], path: points };
    };
    const peel = target => {
      const part = lab.parts.find(p => p.id === target), arr = part.mesh.geometry.attributes.position;
      let grip;
      for (let i = 0; i < arr.count; i += Math.max(1, Math.floor(arr.count / 250))) {
        const at = screen(new THREE.Vector3().fromBufferAttribute(arr, i).applyMatrix4(part.mesh.matrixWorld));
        if (lab.dissection.pick(at.x, at.y)?.object.userData.partId === target) { grip = at; break; }
      }
      if (!grip) throw Error('No remaining forceps surface ' + target);
      lab.setTool('forceps'); act(grip, false); act(grip, true);
      for (let i = 1; i <= 24; i++) act({ x: grip.x + i / 70, y: grip.y }, true, 32);
      act({ x: grip.x + 24 / 70, y: grip.y }, false, 32);
      for (let i = 0; i < 30; i++) act({ x: .98, y: .1 }, false, 32);
      return { removed: lab.dissection.state.removed.has(target), visible: part.mesh.visible, stats: lab.blood().stats };
    };
    window.__fluidTest = { act, sample, pin, cut, peel };
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  process.once('SIGINT', () => browser.close().finally(() => process.exit(130)));
  let page;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true, reducedMotion: 'reduce' });
    await context.route('https://unpkg.com/**', route => route.abort());
    await context.addInitScript(() => {
      window.__cameraRequests = 0;
      if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { window.__cameraRequests++; throw Error('Camera forbidden in fluid QA'); };
    });
    page = await context.newPage(); page.setDefaultTimeout(30000);
    const evaluate = page.evaluate.bind(page);
    page.evaluate = (...args) => bounded('evaluate: ' + String(args[0]).replace(/\s+/g, ' ').slice(0, 140), () => evaluate(...args));
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', message => { if (message.type() === 'warning') report.warnings.push(message.text()); });
    const response = await page.request.get(base + '/lab.html');
    assert.equal(response.status(), 200);
    const served = await response.body();
    assert.ok(served.equals(fs.readFileSync(path.join(root, 'lab.html'))), 'preview serves current built artifact');
    report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    await page.goto(base + '/lab.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => __LAB?.ready && __LAB.dissection && __LAB.blood(), null, { timeout: 90000 });
    await page.evaluate(() => __LAB.intro()?.skip());
    assert.equal((await state(page)).context.preparation, 'preserved', 'cold open uses preserved specimen');
    assert.equal((await state(page)).running, false);
    report.rendering = 'Scene visibility is suppressed only during repeated DOM-control checks to reduce software WebGL load. It is restored for screenshots and all cut, touch, and forceps checks. This is not a performance benchmark.';
    await sceneRendering(page, false);

    for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
      report.stage = 'controls-' + viewport.width; save(); console.log('Checking controls:', viewport.width);
      await page.setViewportSize(viewport); await frames(page); await openControls(page);
      assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
      for (const mode of ['fresh', 'preserved']) {
        await condition(page, mode);
        assert.equal(await page.locator('[data-preparation="' + mode + '"]').getAttribute('aria-pressed'), 'true');
        assert.match(await page.locator('#preparationnote').textContent(), mode === 'fresh' ? /passive seepage/i : /without active bleeding/i);
      }
      for (const [i, value] of [0, .3, .55, 1].entries()) {
        const button = page.locator('#bleedseg [data-i="' + i + '"]');
        await button.click(); const current = await state(page);
        assert.equal(current.intensity, value); assert.equal(current.enabled, value > 0);
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
      }
      for (const depth of ['0.18', '0.9', '0.55']) {
        const button = page.locator('#cutdepthseg [data-depth="' + depth + '"]');
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
      }
      await page.locator('#preparationseg').scrollIntoViewIfNeeded();
      await page.locator('#bleedseg [data-i="0"]').click();
      await page.keyboard.press('b');
      const keyboardOn = await state(page);
      assert.equal(keyboardOn.enabled, true); assert.ok(keyboardOn.intensity > 0, 'B restores nonzero intensity after Off');
      assert.equal(await page.locator('#bleedseg [aria-pressed="true"]').textContent(), 'Moderate');
      await page.keyboard.press('b'); assert.equal((await state(page)).enabled, false);
      await page.keyboard.press('b'); assert.equal((await state(page)).enabled, true);
      await page.keyboard.press('['); assert.ok(Math.abs((await state(page)).intensity - .3) < 1e-8);
      await page.keyboard.press(']'); assert.equal((await state(page)).intensity, .55);
      const bounds = await page.locator('#preparationseg').evaluate(el => {
        const r = el.getBoundingClientRect();
        return { visible: r.width > 0 && r.height > 0, within: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.deepEqual(bounds, { visible: true, within: true, overflow: false });
      await sceneRendering(page, true); await frames(page);
      await page.screenshot({ path: path.join(output, 'controls-' + viewport.width + '.png') });
      await sceneRendering(page, false);
      report.layouts.push({ ...viewport, reducedMotion: true, buttons: true, keyboardAfterOff: keyboardOn }); save();
      await closeControls(page);
    }

    await page.setViewportSize({ width: 1440, height: 1000 }); await frames(page);
    for (const id of ['frog', 'heart', 'fish', 'earthworm', 'cockroach']) {
      report.stage = 'species-' + id; save();
      await load(page, id); await condition(page, 'preserved'); await closeControls(page);
      const supported = ['frog', 'heart'].includes(id);
      await page.locator('#labmodesbtn').click();
      assert.equal(await page.locator('[data-choice="physiology"]').isDisabled(), !supported);
      if (supported) {
        await page.locator('[data-choice="physiology"]').click();
        assert.equal((await state(page)).context.preparation, 'circulation');
        assert.equal((await state(page)).running, true);
        await condition(page, 'preserved');
        assert.equal((await state(page)).running, false);
        await closeControls(page); await page.keyboard.press('p');
        assert.equal((await state(page)).context.preparation, 'circulation');
        await page.keyboard.press('p');
        assert.equal((await state(page)).context.preparation, 'preserved');
      } else {
        await page.locator('#featureclose').click(); await page.keyboard.press('p');
        assert.equal((await state(page)).hasPhysio, false);
        assert.equal((await state(page)).context.preparation, 'preserved');
      }
      await condition(page, 'fresh');
      assert.equal((await state(page)).context.fluid, id === 'cockroach' ? 'hemolymph' : 'seep');
      report.controls.push({ id, supportedCirculation: supported, final: await state(page) }); save();
    }

    report.stage = 'cut-interactions'; save(); console.log('Checking real cuts, touch, forceps and Undo');
    await sceneRendering(page, true);
    await load(page, 'frog'); await condition(page, 'preserved'); await closeControls(page); await installHelpers(page);
    const refused = await page.evaluate(() => __fluidTest.cut('skin'));
    assert.equal(refused.calls.length, 0); assert.equal(refused.incisionLength, 0);
    assert.equal(refused.stats.sources + refused.stats.stains + refused.stats.droplets, 0, 'unpinned refused stroke creates no fluid');
    assert.ok(await page.evaluate(() => __fluidTest.pin()) >= 4, 'actual pin actions ready the specimen');
    const stationary = await page.evaluate(() => {
      const path = __fluidTest.sample('skin'); __LAB.setTool('scalpel');
      __fluidTest.act(path[0].at, false);
      for (let i = 0; i < 12; i++) __fluidTest.act(path[0].at, true);
      __fluidTest.act(path[0].at, false);
      return { path, stats: __LAB.blood().stats, incisions: __LAB.dissection.state.incisions.size };
    });
    assert.equal(stationary.stats.stains + stationary.stats.sources + stationary.stats.droplets, 0);
    assert.equal(stationary.incisions, 0, 'stationary synthetic pinch never accepts an incision');
    const nativePoint = await page.evaluate(points => {
      for (const { at } of points) {
        const x = at.x * innerWidth, y = at.y * innerHeight;
        if (document.elementFromPoint(x, y)?.tagName === 'CANVAS') return { x, y };
      }
      return null;
    }, stationary.path);
    assert.ok(nativePoint, 'stationary touch targets visible specimen canvas');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...nativePoint, id: 1, radiusX: 3, radiusY: 3 }] });
    await frames(page);
    assert.ok(await page.evaluate(() => __LAB.touch.claimed >= 0), 'native touch claims specimen tool');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...nativePoint, id: 1, radiusX: 3, radiusY: 3 }] });
    await frames(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await frames(page);
    assert.equal((await state(page)).stats.stains, 0, 'native stationary touch creates no fluid');
    await closeControls(page);
    await openControls(page); await page.locator('[data-depth="0.18"]').click(); await closeControls(page);
    const shallow = await page.evaluate(() => __fluidTest.cut('skin', 0.9));
    assert.ok(shallow.incisionLength > 1.1, 'shallow score has meaningful length');
    assert.equal(shallow.depth, .18, 'mid-stroke selector change preserves starting depth');
    assert.equal(shallow.peelable, false, 'shallow score does not release a flap');
    assert.equal(shallow.damage.some(d => d.kind === 'perforated'), false, 'mid-stroke deep choice does not retroactively perforate');
    const shallowPull = await page.evaluate(() => __fluidTest.peel('skin'));
    assert.equal(shallowPull.removed, false); assert.equal(shallowPull.visible, true, 'forceps cannot remove shallow-scored covering');
    await page.locator('#undobtn').click();
    await openControls(page); await page.locator('[data-depth="0.55"]').click(); await closeControls(page);
    const accepted = await page.evaluate(() => __fluidTest.cut('skin'));
    assert.equal(accepted.depth, .55); assert.equal(accepted.peelable, true, 'controlled depth releases flap');
    assert.ok(accepted.incisionLength > 1.1 && accepted.calls.length > 0 && accepted.stats.stains > 0, 'accepted cut creates residue');
    assert.equal(accepted.stats.sources, 0, 'preserved specimen has no replenished sources');
    for (const call of accepted.calls) assert.ok(accepted.acceptedPoints.some(p => p.every((v, i) => Math.abs(v - call.point[i]) < 1e-8)), 'fluid point lies on actual accepted incision');
    await frames(page); await page.screenshot({ path: path.join(output, 'frog-preserved-cut.png') });
    const peeled = await page.evaluate(() => __fluidTest.peel('skin'));
    assert.equal(peeled.removed, true); assert.equal(peeled.visible, false);
    assert.equal(peeled.stats.stains + peeled.stats.sources + peeled.stats.droplets, 0, 'removed access sheet leaves no floating residue');
    await page.locator('#undobtn').click();
    assert.equal(await page.evaluate(() => __LAB.parts.find(p => p.id === 'skin').mesh.visible), true, 'Undo restores removed skin');
    assert.equal((await state(page)).stats.stains, 0, 'Undo clears fluid');
    await page.locator('#undobtn').click();
    assert.equal(await page.evaluate(() => __LAB.dissection.state.incisions.has('skin')), false, 'Undo restores the cut');
    await condition(page, 'fresh'); await closeControls(page);
    const fresh = await page.evaluate(() => __fluidTest.cut('skin'));
    assert.ok(fresh.stats.sources > 0 && fresh.stats.stains > 0, 'fresh accepted cut produces passive sources');
    await condition(page, 'preserved');
    assert.equal((await state(page)).stats.stains + (await state(page)).stats.sources + (await state(page)).stats.droplets, 0, 'preparation switch clears previous fluid');
    await condition(page, 'fresh'); await closeControls(page);
    await page.locator('#undobtn').click();
    const beforeOff = await page.evaluate(() => __fluidTest.cut('skin'));
    assert.ok(beforeOff.stats.sources > 0);
    await openControls(page); await page.locator('#bleedseg [data-i="0"]').click(); await closeControls(page);
    const off = await page.evaluate(() => __fluidTest.cut('skin'));
    assert.equal(off.stats.sources, 0); assert.equal((await state(page)).enabled, false);
    await page.keyboard.press('b'); await page.keyboard.press('p');
    assert.equal((await state(page)).context.preparation, 'circulation');
    await load(page, 'earthworm');
    const switched = await state(page);
    assert.equal(switched.running, false); assert.equal(switched.hasPhysio, false);
    assert.equal(switched.stats.sources + switched.stats.stains + switched.stats.droplets, 0, 'specimen switch clears all fluid');
    report.interactions.push({ refused, stationary: { stats: stationary.stats, nativeTouch: true }, shallow, shallowPull, accepted, peeled, fresh, off, switched });
    report.cameraRequests = await page.evaluate(() => __cameraRequests);
    assert.equal(report.cameraRequests, 0); assert.deepEqual(report.errors, []);
    assert.equal((await state(page)).stats.faulted, false);
    report.complete = true;
    report.limit = 'Synthetic tracker and native touch verify application routing and rendering states, not webcam recognition, blood physics calibration, or anatomical validation.';
    console.log(JSON.stringify({ complete: true, layouts: report.layouts.length, specimens: report.controls.length, cameraRequests: report.cameraRequests, errors: report.errors }, null, 2));
  } catch (error) {
    report.failure = error.message;
    if (page) {
      await sceneRendering(page, true).catch(() => {});
      await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
      report.failureLayout = await page.locator('#drawbody').evaluate(el => [...el.querySelectorAll('.dsec,button')].map(node => {
        const r = node.getBoundingClientRect();
        return { id: node.id, text: node.textContent.slice(0, 80), x: r.x, y: r.y, width: r.width, height: r.height };
      })).catch(() => []);
    }
    throw error;
  } finally { save(); await browser.close(); }
})().catch(error => { report.failure = error.message; save(); console.error(error); process.exitCode = 1; });
