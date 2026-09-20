/* Real DOM, pointer/keyboard/touch and cancellation checks. No WebGL or service calls. */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__parts_test__.cjs'))('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const errors = [], pictures = []; let checked = 0;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', hasTouch: true });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.abort());
    await page.setContent('<div id="uni"></div>');
    await page.addScriptTag({ content: `const UNI={};\n` + fs.readFileSync(path.join(root, 'src/universe/data.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'src/universe/ui.js'), 'utf8') + `
      window.core={pos:0,viewMode:'zoom',paused:false,count:UNI_ORDER.length,
        jumpTo(i){this.pos=i;this.frame?.(i)},projectedHotspots(){return []},onImmersion(fn){this.immersion=fn},onJump(){},onFrame(fn){this.frame=fn;fn(this.pos)},
        setViewMode(v){this.viewMode=v;this.viewChange?.()},setPaused(v){this.paused=v;this.viewChange?.()},resetView(){this.resets=(this.resets||0)+1;this.viewChange?.()},onViewChange(fn){this.viewChange=fn}};
      window.catalogue=UNI_DATA;window.order=UNI_ORDER;window.ui=buildUniverseUI(core);
      window.requests=[];window.BIOQ_AI={ask(options){return new Promise(resolve=>requests.push({options,resolve}))},explainError(){return 'Unavailable'}};
    ` });
    const catalogue = await page.evaluate(() => order.map(key => ({ key, hotspots: Object.entries(catalogue[key].hotspots).map(([id, meta]) => ({ id, name: meta.name })) })));
    for (let stage = 0; stage < catalogue.length; stage++) {
      await page.evaluate(i => core.jumpTo(i), stage);
      await page.locator('#uPartsToggle').click();
      const records = catalogue[stage].hotspots;
      assert.equal(await page.locator('.u-parts-list [data-part]').count(), records.length);
      for (const record of records) {
        await page.locator(`.u-parts-list [data-part="${record.id}"]`).click();
        assert.equal(await page.locator('#uPanelTitle').textContent(), record.name);
        assert.equal((await page.evaluate(() => ui.selection)).id, record.id);
        await page.locator('.u-panel .close').click();
        assert.equal(await page.evaluate(() => document.activeElement.dataset.part), record.id);
        checked++;
      }
      await page.locator('.u-parts-close').click();
    }
    // Arrow/Home/End navigate list focus without driving the scale engine.
    await page.evaluate(() => core.jumpTo(order.indexOf('cell'))); await page.locator('#uPartsToggle').click();
    const position = await page.evaluate(() => core.pos);
    await page.keyboard.press('End'); assert.equal(await page.evaluate(() => core.pos), position);
    const lastId = await page.evaluate(() => document.activeElement.dataset.part); assert.ok(lastId);
    await page.keyboard.press('Home'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Scale overview');
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
    const firstName = await page.locator('#uPanelTitle').textContent();
    await page.locator('.u-next').click(); assert.notEqual(await page.locator('#uPanelTitle').textContent(), firstName);
    await page.locator('.u-prev').click(); assert.equal(await page.locator('#uPanelTitle').textContent(), firstName);
    await page.locator('.u-all-parts').click(); assert.equal(await page.locator('.u-panel').isVisible(), false);
    assert.equal(await page.locator('[aria-current="true"][data-part]').count(), 1);
    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => document.activeElement.id), 'uPartsToggle');
    await page.locator('#uInspect').click(); assert.equal(await page.evaluate(() => core.viewMode), 'orbit');
    await page.locator('#uPause').click(); assert.equal(await page.evaluate(() => core.paused), true);
    await page.locator('#uResetView').click(); assert.equal(await page.evaluate(() => core.resets), 1);
    // A pending response cannot populate a newly selected structure or a closed panel.
    await page.evaluate(() => ui.selectSubpart(Object.keys(catalogue.cell.hotspots)[0], 'cell'));
    await page.locator('.askbtn').click(); await page.waitForFunction(() => requests.length === 1);
    await page.locator('.u-next').click(); assert.equal(await page.evaluate(() => requests[0].options.signal.aborted), true);
    await page.evaluate(() => requests[0].resolve('STALE RESPONSE')); assert.equal(await page.locator('#uAns').textContent(), '');
    await page.locator('.askbtn').click(); await page.waitForFunction(() => requests.length === 2);
    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => requests[1].options.signal.aborted), true);
    await page.evaluate(() => requests[1].resolve('STALE CLOSED RESPONSE'));
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 640 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      assert.equal(await page.locator('#uScaleSelect option').count(), 13);
      for (let i = 0; i < catalogue.length; i++) {
        await page.locator('#uScaleSelect').selectOption(String(i));
        assert.equal(await page.evaluate(() => core.pos), i, 'touch selector reaches every scale');
      }
      await page.locator('#uHelpToggle').tap();
      await page.locator('.u-help-body').evaluate(el => el.scrollTop = el.scrollHeight);
      const helpClose = await page.locator('.u-help-close').boundingBox();
      assert.ok(helpClose.width >= 44 && helpClose.height >= 44 && helpClose.y >= 0 && helpClose.y + helpClose.height <= viewport.height);
      await page.locator('.u-help-close').tap();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'uHelpToggle');
      await page.evaluate(() => ui.openSubparts('cell'));
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
        controls: [...document.querySelectorAll('.u-explorer button,.u-parts-close')].map(el => { const r = el.getBoundingClientRect(); return { id: el.id || el.className,
          onScreen: r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.width >= 44 && r.height >= 44,
          hit: el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) }; }) }));
      assert.equal(layout.overflow, false, JSON.stringify(viewport)); layout.controls.forEach(c => assert.ok(c.onScreen && c.hit, JSON.stringify({ viewport, c })));
      const png = path.join(os.tmpdir(), `biology-universe-subparts-${viewport.width}x${viewport.height}.png`); await page.screenshot({ path: png }); pictures.push(png);
      await page.locator('#uParts').evaluate(el => el.scrollTop = el.scrollHeight);
      await page.locator('.u-parts-close').tap();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'uPartsToggle');
      await page.locator('#uPartsToggle').tap();
      await page.locator('.u-parts-list [data-part]').first().tap();
      if (viewport.width <= 640) assert.equal(await page.locator('#uParts').isVisible(), false, 'mobile list yields to detail sheet');
      await page.locator('.u-panel').evaluate(el => el.scrollTop = el.scrollHeight);
      const detailClose = await page.locator('.u-panel .close').boundingBox();
      assert.ok(detailClose.width >= 44 && detailClose.height >= 44 && detailClose.y >= 0 && detailClose.y + detailClose.height <= viewport.height);
      await page.locator('.u-panel .close').tap();
    }
    assert.deepEqual(errors, []); console.log(JSON.stringify({ checked, scales: catalogue.length, viewports: 5, errors, pictures }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
