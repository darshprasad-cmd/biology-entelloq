const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules';
const {chromium} = createRequire(path.join(modules, '__field_test__.cjs'))('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.BIOLOGY_FIELD_REPORT || path.join(require('node:os').tmpdir(), 'biology-field-labs');
fs.mkdirSync(out, {recursive:true});
(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  const base=fs.readFileSync(path.join(root,'src/_template.html'),'utf8').match(/<style[^>]*>([\s\S]*?)<\/style>/)[1];
  const css=fs.readFileSync(path.join(root,'src/library/field-labs.css'),'utf8');
  await page.setContent(`<html data-theme="dark"><head><style>${base}\n${css}\nbody{padding:24px}.stage{max-width:1160px;margin:auto;border:1px solid var(--hair)}@media(max-width:700px){body{padding:8px}}</style></head><body><div id="stage" class="stage"></div></body></html>`);
  await page.addScriptTag({content:'const LABS={list:[],register(id,d){this.list.push({id,...d})},get(id){return this.list.find(x=>x.id===id)}};'});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'src/library/field-labs.js'),'utf8')});
  async function mount(id){await page.evaluate(id=>{window.current?.dispose();window.current=LABS.get(id).build(document.getElementById('stage'));},id);}
  await mount('stomatal-transpiration');
  await page.getByRole('combobox',{name:'Change only this factor'}).selectOption('seal');
  await page.getByRole('button',{name:'Start paired experiment',exact:true}).click();
  assert.equal(await page.getByRole('combobox',{name:'Change only this factor'}).isDisabled(),true);
  await page.getByRole('button',{name:'Advance both by 5 min'}).click();
  const s=await page.evaluate(()=>current.snapshot());
  assert.equal(s.variables['Elapsed model time (min)'],5);
  assert.ok(s.measurements['Test loss (mg)'] < s.measurements['Reference loss (mg)']);
  assert.equal(await page.locator('.fl-table-wrap tbody tr').count(),2);
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'Advance both by 5 min'}).click();
  assert.equal(await page.getByRole('button',{name:'Advance both by 5 min'}).isDisabled(),true);
  await page.screenshot({path:path.join(out,'stomata-desktop.png'),fullPage:true});
  await page.locator('.fl-chambers').screenshot({path:path.join(out,'stomatal-transpiration-preview.png'),animations:'disabled'});
  const stomataCapture=await page.evaluate(async()=>Array.from(new Uint8Array(await (await current.capture()).arrayBuffer())));
  fs.writeFileSync(path.join(out,'stomata-observation.png'),Buffer.from(stomataCapture));
  await page.getByRole('button',{name:'New comparison',exact:true}).click();
  assert.equal((await page.evaluate(()=>current.snapshot())).variables['Elapsed model time (min)'],0);
  await page.getByRole('combobox',{name:'Test surface treatment'}).selectOption('both');
  await page.getByRole('button',{name:'Start paired experiment',exact:true}).click();
  await page.getByRole('button',{name:'Advance both by 5 min'}).click();
  assert.equal((await page.evaluate(()=>current.snapshot())).measurements['Test loss (mg)'],0);
  await mount('quadrat-sampling');
  assert.equal(await page.getByRole('button',{name:'Reveal virtual census'}).isDisabled(),true);
  const sampledIds=[];
  for(let i=0;i<3;i++){
    await page.getByRole('button',{name:'Locate a random quadrat'}).click();
    const id=await page.locator('.fl-quadrat-detail h3').textContent();sampledIds.push(id);
    const count=Number(await page.locator('.fl-quadrat-detail details strong').textContent());
    if(i===0){await page.getByRole('spinbutton',{name:'Focal plants in this quadrat'}).fill(String(count+1));await page.getByRole('button',{name:'Check count & record'}).click();assert.equal((await page.evaluate(()=>current.snapshot())).measurements['Quadrats recorded'],0);}
    await page.getByRole('spinbutton',{name:'Focal plants in this quadrat'}).fill(String(count));
    await page.getByRole('button',{name:'Check count & record'}).click();
  }
  assert.equal(new Set(sampledIds).size,3);
  await page.getByRole('button',{name:'Reveal virtual census'}).click();
  const q=await page.evaluate(()=>current.snapshot());assert.equal(q.measurements['Quadrats recorded'],3);assert.equal(q.measurements['Revealed census (plants)'],120);
  await page.screenshot({path:path.join(out,'quadrat-desktop.png'),fullPage:true});
  await page.locator('.fl-field-wrap').screenshot({path:path.join(out,'quadrat-sampling-preview.png'),animations:'disabled'});
  const quadratCapture=await page.evaluate(async()=>Array.from(new Uint8Array(await (await current.capture()).arrayBuffer())));
  fs.writeFileSync(path.join(out,'quadrat-observation.png'),Buffer.from(quadratCapture));
  await page.getByRole('button',{name:'New survey · same field'}).click();
  await page.getByRole('combobox',{name:'Placement design',exact:true}).selectOption('chosen');
  await page.getByRole('combobox',{name:'Choose quadrat by number'}).selectOption('0');
  await page.getByRole('button',{name:'Inspect this location'}).click();
  assert.ok((await page.locator('.fl-quadrat-detail h3').textContent()).includes('Quadrat 1'));
  for(const theme of ['dark','light']){
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    await page.setViewportSize({width:390,height:844});
    for(const id of ['stomatal-transpiration','quadrat-sampling']){
      await mount(id);
      if(id==='quadrat-sampling')await page.getByRole('button',{name:'Locate a random quadrat'}).click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' mobile width');
      assert.equal(await page.locator('input,select').evaluateAll(xs=>xs.filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')).length),0);
      await page.screenshot({path:path.join(out,`${id}-mobile-${theme}.png`),fullPage:true});
    }
  }
  await page.evaluate(()=>current.dispose());assert.equal(await page.locator('.fl-workbench').count(),0);
  await page.addStyleTag({content:fs.readFileSync(path.join(root,'src/_labs.css'),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'src/_lab_bench.js'),'utf8')});
  await page.evaluate(()=>{window.__enzymeFrames=0;const native=requestAnimationFrame;window.requestAnimationFrame=fn=>{__enzymeFrames++;return native(fn);};});
  await mount('enzyme-kinetics');await page.waitForTimeout(80);
  const restingFrames=await page.evaluate(()=>__enzymeFrames);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>__enzymeFrames),restingFrames,'static enzyme chart schedules no idle frames');
  await page.getByRole('slider',{name:'Temperature',exact:true}).fill('60');await page.getByRole('slider',{name:'Temperature',exact:true}).dispatchEvent('input');await page.waitForTimeout(40);assert.match(await page.locator('.bx-read').textContent(),/denatured/);
  await page.getByRole('slider',{name:'Temperature',exact:true}).fill('37');await page.getByRole('slider',{name:'Temperature',exact:true}).dispatchEvent('input');await page.getByRole('button',{name:'Fresh enzyme sample'}).click();await page.waitForTimeout(40);assert.ok((await page.evaluate(()=>current.snapshot())).measurements['Reaction rate (arbitrary units)']>0);
  const beforeTheme=await page.evaluate(()=>__enzymeFrames);await page.evaluate(()=>document.documentElement.dataset.theme='dark');await page.waitForTimeout(40);assert.ok((await page.evaluate(()=>__enzymeFrames))>beforeTheme,'theme repaints the static chart');
  await page.setViewportSize({width:480,height:844});await page.waitForTimeout(50);const sized=await page.locator('.bx-view canvas').evaluate(c=>({width:c.width,client:c.clientWidth}));assert.ok(sized.width>0&&sized.client>0);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(50);const hiddenFrames=await page.evaluate(()=>__enzymeFrames);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>__enzymeFrames),hiddenFrames);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(40);
  await page.evaluate(()=>current.dispose());const disposedFrames=await page.evaluate(()=>__enzymeFrames);await page.evaluate(()=>document.documentElement.dataset.theme='light');await page.setViewportSize({width:500,height:844});await page.waitForTimeout(60);assert.equal(await page.evaluate(()=>__enzymeFrames),disposedFrames,'disposed enzyme ignores theme and resize');
  assert.deepEqual(errors,[]);
  await browser.close();
  fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({passed:true,checked:['both mounts and snapshots','paired-run locking and 30 min cap','lower/both seal effects','wrong-count rejection','three unique random quadrats','gated census','handpicked accessible selection','dark/light 390 px layout and labels','dispose removes owned DOM','no page errors','enzyme idle, input, theme, resize, visibility and disposal lifecycle'],samples:{stomata:s,quadrat:q}},null,2));
  console.log('PASS: field lab interactions, scientific readings, labels, responsive themes, captures and enzyme lifecycle');
})().catch(e=>{console.error(e);process.exit(1)});
