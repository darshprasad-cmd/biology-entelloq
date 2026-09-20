/* Real WebGL review. No external textures, camera, GPU/FPS or microscopy claims. */
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__universe__.cjs'))('playwright');
const before = process.argv.includes('--before');
const output = path.join(root, 'docs/universe-realism', process.env.BIOLOGY_UNIVERSE_REVIEW || (before ? 'before' : 'browser'));
const url = (process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3004') + '/universe.html';
fs.mkdirSync(output, { recursive: true });
const report = { errors: [], stages: [], limitations: 'Software-rendered browser checks; not physical touch hardware, measured microscopy or GPU performance.' };
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => { window.__cameraRequests=0; if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__cameraRequests++;return Promise.reject(new Error('Camera forbidden in test'));}; });
    await context.route('https://unpkg.com/**', route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.text().includes('stage failed:')) report.errors.push(message.text()); });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const served = await (await page.request.get(url)).body();
    assert.ok(served.equals(fs.readFileSync(path.join(root, 'universe.html'))), 'browser preview serves the current artifact');
    report.artifactSha256 = crypto.createHash('sha256').update(served).digest('hex');
    await page.waitForFunction(() => window.__UNI, null, { timeout: 60000 });
    assert.equal(await page.evaluate(() => window.__UNI.count), 13);
    assert.equal(await page.evaluate(() => window.__UNI.scene.children.filter(x => x.userData.stageKey).length), 13, 'all 13 factories actually built, not silently skipped');
    const keys = before ? ['universe', 'earth', 'organ', 'cell', 'dna', 'atom'] : await page.evaluate(() => window.__UNI_ORDER.slice());
    for (const key of keys) {
      await page.evaluate(key => {
        const i = window.__UNI_ORDER.indexOf(key);
        window.__UNI.Z.pos = window.__UNI.Z.posTarget = i;
        window.__UNI.jumpTo(i);
        window.__UNI._tick(0);
      }, key);
      await page.screenshot({ path: path.join(output, key + '.png') });
      const model = await page.evaluate(key => {
        const c = window.__UNI, group = c.scene.children.find(x => x.userData.stageKey === key);
        let meshes = 0, vertices = 0;
        group.traverse(x => { if (x.isMesh || x.isPoints) meshes++; vertices += x.geometry?.attributes.position?.count || 0; });
        return { visible: group.visible, meshes, vertices, structure: group.userData.structure || null };
      }, key);
      assert.ok(model.visible && model.meshes > 0, key + ' is genuinely rendered');
      report.stages.push({ key, title: await page.locator('#uTitle').textContent(), ...model });
    }
    if (!before) {
      // Exercise the actual rendered core through the shipped UI, not a mock.
      report.inspection=[];
      for(const key of ['organ','cell','organelle','protein','dna']){
        await page.evaluate(key=>{const c=window.__UNI,i=window.__UNI_ORDER.indexOf(key);c.Z.pos=c.Z.posTarget=i;c.jumpTo(i);c._tick(0);},key);
        await page.locator('#uInspect').click();
        assert.equal(await page.evaluate(()=>__UNI.viewMode),'orbit');
        const start=await page.evaluate(()=>({pos:__UNI.pos,view:__UNI.inspectionView}));
        await page.locator('#uInspect').blur();
        await page.keyboard.press('ArrowRight');
        // Empty canvas, not a projected marker's (possibly long) label hit box.
        await page.mouse.move(200,440);await page.mouse.wheel(0,-100);
        await page.waitForFunction(distance=>__UNI.inspectionView.distance<distance,start.view.distance,{timeout:5000});
        const moved=await page.evaluate(()=>({pos:__UNI.pos,view:__UNI.inspectionView}));
        assert.equal(moved.pos,start.pos,key+' inspection keeps scale');
        assert.notEqual(moved.view.yaw,start.view.yaw,key+' keyboard orbits');
        assert.ok(moved.view.distance<start.view.distance,key+' wheel inspects instead of changing scale');
        await page.locator('#uResetView').click();
        assert.deepEqual(await page.evaluate(()=>__UNI.inspectionView),{yaw:0,pitch:0,distance:3.5});
        await page.locator('#uPartsToggle').click();
        const count=await page.locator('.u-parts-list [data-part]').count();assert.ok(count>=3,key+' populated subparts');
        await page.locator('.u-parts-list [data-part]').last().click();
        assert.ok((await page.locator('#uPanelTitle').textContent()).length>2);
        await page.locator('.u-panel .close').click();
        await page.locator('.u-parts-close').click();
        await page.locator('#uInspect').click();
        await page.locator('#uInspect').blur();
        report.inspection.push({key,subparts:count});
      }
      await page.keyboard.press('Home');
      assert.equal(await page.evaluate(() => window.__UNI.pos), 0);
      await page.keyboard.press('ArrowUp');
      assert.equal(await page.evaluate(() => window.__UNI.pos), 0.5);
      await page.keyboard.press('End');
      assert.equal(await page.evaluate(() => window.__UNI.pos), 12);
      assert.match(await page.locator('#uSize').textContent(), /^~/);
      const frozen = await page.evaluate(() => {
        const c = window.__UNI;
        c.renderer.domElement.dispatchEvent(new PointerEvent('pointermove', { clientX: 80, clientY: 80 }));
        c._tick(0.05);
        return { pos: c.pos, camera: c.camera.position.toArray(), matrix: c.scene.children.filter(x => x.type === 'Group').map(x => x.matrixWorld.elements.slice()) };
      });
      const still = await page.evaluate(() => {
        const c = window.__UNI; c._tick(0.05); c._tick(0.05);
        return { pos: c.pos, camera: c.camera.position.toArray(), matrix: c.scene.children.filter(x => x.type === 'Group').map(x => x.matrixWorld.elements.slice()) };
      });
      assert.deepEqual(still, frozen, 'reduced motion freezes idle stages and camera');
      for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
        await page.setViewportSize(viewport);
        await page.keyboard.press('8');
        await page.screenshot({ path: path.join(output, 'cell-' + viewport.width + '.png') });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      }
      report.mobileStages = [];
      for (const key of keys) {
        await page.evaluate(key => {
          const c=window.__UNI, i=window.__UNI_ORDER.indexOf(key);
          c.Z.pos=c.Z.posTarget=i;c.jumpTo(i);c._tick(0);
        },key);
        await page.screenshot({path:path.join(output,key+'-390.png')});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,key+' phone overflow');
        report.mobileStages.push(key);
      }
      await page.keyboard.press('8');
      const touch = await context.newCDPSession(page);
      const start = await page.evaluate(() => window.__UNI.pos);
      // Use empty canvas below the model: mobile controls occupy the top 232px.
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y: 690, id: 1 }, { x: 240, y: 690, id: 2 }] });
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100, y: 690, id: 1 }, { x: 280, y: 690, id: 2 }] });
      const pinched = await page.evaluate(() => window.__UNI.pos);
      assert.ok(pinched > start, 'browser-dispatched two-finger spread zooms inward');
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.equal(await page.evaluate(() => window.__UNI.Z.flingVel), 0);
      await page.keyboard.press('8');
      await page.locator('.u-mark').first().focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.u-panel').evaluate(el => el.classList.contains('open')), true);
      assert.equal(await page.locator('.u-panel').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.u-panel').evaluate(el => el.classList.contains('open')), false);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => !window.__UNI.reducedMotion);
      await page.mouse.move(190, 690); await page.mouse.wheel(0, 100);
      await page.waitForFunction(() => window.__UNI.Z.posTarget > 7, null, { timeout: 5000 });
      assert.ok(await page.evaluate(() => window.__UNI.Z.posTarget > window.__UNI.pos), 'normal wheel eases towards requested scale');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => window.__UNI.reducedMotion);
      assert.equal(await page.evaluate(() => window.__UNI.Z.flingVel), 0, 'live reduced-motion change cancels momentum');
      report.controls = 'Home, End, ArrowUp, numeric jump, real browser touch pinch, normal wheel, live reduced motion, keyboard hotspot panel, tablet and mobile passed';
    }
    assert.deepEqual(report.errors, []);
    assert.equal(await page.evaluate(()=>window.__cameraRequests),0,'camera never started without user consent');
    report.complete = true;
    console.log(JSON.stringify(report, null, 2));
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
