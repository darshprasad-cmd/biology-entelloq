/* Source shell DOM checks. No renderer, camera, AI requests or specimen mutation. */
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root, '../biology-entelloq/node_modules');
const { chromium } = createRequire(path.join(modules, '__mobile_controls__.cjs'))('playwright');
const lab = fs.readFileSync(path.join(root, 'lab.html'), 'utf8');
const headStyles = (lab.split('</head>')[0].match(/<style\b[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
const shared = lab.match(/<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:START -->[\s\S]*?<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:END -->/)[0];
const shellSource = fs.readFileSync(path.join(root, 'src/lab/shell.js'), 'utf8').replace(/^export /gm, '');
const anatomy = fs.readFileSync(path.join(root, 'src/lab/anatomy.js'), 'utf8').replace(/^export /gm, '');
const aiSource = fs.readFileSync(path.join(root, 'src/ai/biology-ai.js'), 'utf8');
const viewports = [
  { width: 1440, height: 1000 }, { width: 768, height: 1024 },
  { width: 390, height: 844 }, { width: 320, height: 640 }, { width: 844, height: 390 },
];
async function usable(page, selector) {
  const info = await page.locator(selector).evaluate(el => {
    const r = el.getBoundingClientRect();
    return { selector: el.id, width: r.width, height: r.height, x:r.x, y:r.y, viewport:[innerWidth,innerHeight], obstruction:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,160),
      bounds: r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      hit: el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) };
  });
  assert.ok(info.width >= 44 && info.height >= 44 && info.bounds && info.hit, JSON.stringify(info));
}
async function tapClose(page, selector, panel, opener, className = 'on') {
  await usable(page, selector); await page.locator(selector).tap();
  assert.equal(await page.locator(panel).evaluate((el, cls) => el.classList.contains(cls), className), false, panel);
  assert.equal(await page.evaluate(() => document.activeElement.id || document.activeElement.dataset.tool), opener);
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const errors = [], pictures = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport, hasTouch: true, reducedMotion: 'reduce' });
      await context.route('**/*', route => route.request().url() === 'http://lab-controls.test/'
        ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' + headStyles + '<body><div id="stage"></div>' + shared })
        : route.abort());
      const page = await context.newPage(); page.setDefaultTimeout(5000);
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://lab-controls.test/');
      await page.addScriptTag({ content: anatomy + '\n' + shellSource + `
        window.shell=buildShell(document.body);document.querySelector('#shellcss').textContent=SHELL_CSS;
        shell.mountCards(SPECIMENS,id=>shell.setSpecimen(SPECIMENS[id],[]));shell.setSpecimen(SPECIMENS.frog,[]);
        window.undoCount=0;window.imagingEvents=[];window.answer='pending';shell.onUndo(()=>undoCount++);shell.on('imaging',value=>imagingEvents.push(value));
      ` });
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#pick')).opacity) === 0);
      assert.equal(await page.locator('#undobtn').isDisabled(), true);
      await page.evaluate(() => shell.setUndoState(true, 'last pin'));
      await usable(page, '#undobtn'); await page.locator('#undobtn').tap();
      assert.equal(await page.evaluate(() => undoCount), 1);
      assert.match(await page.locator('#undobtn').getAttribute('aria-label'), /last pin.*Command Z/);
      await page.evaluate(() => shell.setUndoState(false)); assert.equal(await page.locator('#undobtn').isDisabled(), true);

      await page.locator('#helpbtn').tap(); await usable(page, '#keysclose');
      await page.keyboard.press('v'); assert.equal(await page.locator('#viva').isVisible(), false, 'help owns keyboard focus');
      await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.tagName), 'A');
      await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'keysclose');
      await page.locator('#kbox').evaluate(el => el.scrollTop = el.scrollHeight);
      await tapClose(page, '#keysclose', '#keys', 'helpbtn');
      await page.locator('#specbtn').tap(); await usable(page, '#pickclose');
      await page.locator('#pickclose').tap();
      assert.equal(await page.locator('#pick').evaluate(el => el.classList.contains('gone')), true);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'specbtn');
      assert.equal(await page.locator('#specbtn .specname').textContent(), 'Frog');

      await page.locator('.tool[data-tool="probe"]').focus();
      await page.evaluate(() => shell.setStructure({ name: 'Liver', note: 'Selected structure', system: 'Digestive' }));
      await page.locator('#helpbtn').tap(); await page.keyboard.press('Escape');
      assert.equal(await page.locator('#struct').evaluate(el => el.classList.contains('on')), true, 'help exit preserves underlying detail');
      await tapClose(page, '#structclose', '#struct', 'probe');

      await page.locator('#consolebtn').tap();
      await tapClose(page, '#consoleclose', '#drawer', 'consolebtn', 'open');
      if (await page.locator('#recbtn').isVisible()) {
        await page.locator('#recbtn').tap(); await tapClose(page, '#recclose', '#rec', 'recbtn');
        await page.locator('#vivabtn').focus();
      } else {
        await page.locator('#helpbtn').focus(); await page.keyboard.press('l');
        await tapClose(page, '#recclose', '#rec', 'helpbtn'); await page.locator('#helpbtn').focus();
      }
      const vivaOpener = await page.evaluate(() => document.activeElement.id);
      await page.evaluate(() => shell.showViva({ damage: [] }));
      await page.locator('#vbox').evaluate(el => el.scrollTop = el.scrollHeight);
      await tapClose(page, '#vivaclose', '#viva', vivaOpener);
      await page.locator('.tool[data-tool="probe"]').focus();
      await page.evaluate(() => shell.askInput('Name the selected tissue.', value => answer = value));
      await page.waitForFunction(() => document.activeElement.id === 'askin');
      await usable(page, '#askclose'); await page.locator('#askclose').tap();
      assert.equal(await page.evaluate(() => answer), null);
      assert.equal(await page.evaluate(() => document.activeElement.dataset.tool), 'probe');

      await page.evaluate(() => shell.setImaging({ mode: 'xray' }));
      await usable(page, '#imagingclose'); await page.locator('#imagingclose').tap();
      assert.deepEqual(await page.evaluate(() => imagingEvents), ['off']);
      assert.equal(await page.locator('#imagingclose').isVisible(), false);
      await page.evaluate(() => shell.setHandState({ on: true, status: 'tracking', health: 0 }));
      await page.locator('#handpreview').tap(); await usable(page, '#handpreview');
      assert.equal(await page.locator('#handpreview').textContent(), '×');
      await page.locator('#handpreview').tap();
      assert.equal(await page.locator('#handpreview').getAttribute('aria-expanded'), 'false');
      await page.evaluate(() => shell.setHandState({ on: false }));
      await page.evaluate(() => shell.setSpecimen(SPECIMENS.heart, []));
      await usable(page, '#undobtn'); await usable(page, '#helpbtn'); await usable(page, '#specbtn'); await usable(page, '#eqx-fab');
      if (await page.locator('body').evaluate(el => el.classList.contains('bioq-phone'))) {
        assert.ok(await page.evaluate(() => document.querySelector('#topright').getBoundingClientRect().left >= document.querySelector('#eqx-fab').getBoundingClientRect().right), 'long specimen names do not cover the launcher or Undo');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const picture = path.join(os.tmpdir(), `biology-lab-controls-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: picture }); pictures.push(picture);
      await context.close();
    }
    // Keep one mounted shell alive through real viewport changes. Fresh mobile
    // contexts alone cannot catch a phone class decided only at initial load.
    for (const hasTouch of [false, true]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch, reducedMotion: 'reduce' });
      await context.route('**/*', route => route.request().url() === 'http://lab-controls.test/'
        ? route.fulfill({ contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">' + headStyles + '<body><div id="stage"></div>' + shared })
        : route.abort());
      const page = await context.newPage(); page.setDefaultTimeout(5000);
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://lab-controls.test/');
      await page.addScriptTag({ content: anatomy + '\n' + shellSource + `
        window.shell=buildShell(document.body);document.querySelector('#shellcss').textContent=SHELL_CSS;
        shell.setSpecimen(SPECIMENS.frog,[]);shell.setTool('forceps');shell.setUndoState(true,'last cut');
        window.handRequests=0;shell.on('hands',()=>handRequests++);
      ` });
      await page.addScriptTag({ content: aiSource });
      await page.evaluate(() => BIOQ_AI.mount('lab'));
      for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 640 }, { width: 1440, height: 1000 }]) {
        const phone = viewport.width !== 1440;
        await page.setViewportSize(viewport);
        await page.waitForFunction(expected => shell.isPhone() === expected && document.body.classList.contains('bioq-phone') === expected, phone);
        const layout = await page.evaluate(() => {
          const bounds = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return r.x >= 0 && r.y >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; };
          const dock = document.querySelector('#dock').getBoundingClientRect();
          return { handParent: document.querySelector('#hand').parentElement.id,
            systemParent: document.querySelector('#systems').parentElement.id,
            aiParent: document.querySelector('#bioq-ai-launch').parentElement.id,
            horizontalTools: dock.width > dock.height,
            handInViewport: bounds('#hand'), objectiveInViewport: bounds('#obj'),
            selectedTool: document.querySelector('.tool.on').dataset.tool, handRequests,
            overflow: document.documentElement.scrollWidth > innerWidth + 1 };
        });
        assert.equal(layout.handParent, phone ? 'rail' : '');
        assert.equal(layout.systemParent, phone ? 'secsys' : '');
        assert.equal(layout.aiParent, phone ? 'railfoot' : 'bioq-ai');
        assert.equal(layout.horizontalTools, phone);
        assert.equal(layout.handInViewport && layout.objectiveInViewport, true, JSON.stringify({ viewport, hasTouch, layout }));
        assert.equal(layout.overflow, false); assert.equal(layout.selectedTool, 'forceps'); assert.equal(layout.handRequests, 0);
        assert.equal(await page.locator('#recbtn').isVisible(), phone);
        assert.equal(await page.locator('#undobtn').isDisabled(), false);
        for (const selector of ['#undobtn', '#helpbtn', '#specbtn', '#handbtn', '#eqx-fab']) await usable(page, selector);
        if (phone) await usable(page, '#bioq-ai-launch');
        await page.locator('#bioq-ai-launch').click();
        assert.equal(await page.locator('#bioq-ai-panel').isVisible(), true);
        if (phone) await usable(page, '#bioq-ai-close');
        await page.locator('#bioq-ai-close').click();
        assert.equal(await page.locator('#bioq-ai-panel').isVisible(), false);
        const picture = path.join(os.tmpdir(), `biology-lab-resize-${hasTouch ? 'touch' : 'mouse'}-${viewport.width}x${viewport.height}.png`);
        await page.screenshot({ path: picture }); pictures.push(picture);
      }
      await context.close();
    }
    assert.deepEqual(errors, []); console.log(JSON.stringify({ viewports: viewports.length, liveResizeCases: 8, errors, pictures }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
