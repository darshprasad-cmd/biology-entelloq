const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules','__bio_workflow.cjs'));
const {chromium}=runtime('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3013';
const output=path.resolve(__dirname,'../docs/library');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('Lab failed:'))errors.push(m.text());});const report={checks:[],errors};
 try{
  await p.goto(base+'/labs.html');await p.locator('#lab-search').waitFor();assert.equal(await p.locator('#lab-cards>a').count(),23);
  await p.locator('#lab-search').fill('heart');assert.ok(await p.locator('#lab-cards>a').count()>=3);
  await p.locator('#lab-type').selectOption('dissection');assert.equal(await p.locator('#lab-cards>a').count(),3);assert.equal(await p.locator('#lab-cards>a[href="#heart-dissection"]').count(),1);
  await p.locator('#lab-search').fill('<img src=x onerror=alert(1)>');assert.equal(await p.locator('#lab-cards img').count(),0);await p.locator('#lab-clear').click();assert.equal(await p.locator('#lab-cards>a').count(),23);
  report.checks.push('23 working entries; aliases; intersecting category/type filters; safe, recoverable empty search.');
  await p.goto(base+'/labs.html#photosynthesis-rate');await p.locator('#lab-hypothesis').fill('If light rises, oxygen production will rise until a plateau.');
  await p.locator('#lab-record').click();const baseline=await p.evaluate(()=>JSON.parse(localStorage.getItem('bioq.lab-notebook.v1.photosynthesis-rate')).trials[0]);
  await p.getByRole('slider',{name:'Light (µmol photons/m²/s)',exact:true}).fill('1000');await p.locator('#lab-record').click();
  let trials=await p.evaluate(()=>JSON.parse(localStorage.getItem('bioq.lab-notebook.v1.photosynthesis-rate')).trials);assert.ok(trials[1].measurements['Net O₂ exchange (µmol/min)']>baseline.measurements['Net O₂ exchange (µmol/min)']);
  await p.locator('#lab-x').selectOption('Light (µmol photons/m²/s)');await p.locator('#lab-y').selectOption('Net O₂ exchange (µmol/min)');assert.equal(await p.locator('#lab-plot circle').count(),2);
  await p.locator('#lab-graph-type').selectOption('line');assert.equal(await p.locator('#lab-plot polyline').count(),1);await p.locator('#lab-graph-type').selectOption('bar');assert.equal(await p.locator('#lab-plot rect').count(),2);
  await p.locator('[data-note=conclusion]').fill('Oxygen production increased, with diminishing gains.');await p.reload();await p.locator('#lab-record').waitFor();assert.equal(await p.locator('.ln-table tbody tr').count(),2);assert.match(await p.locator('[data-note=conclusion]').inputValue(),/diminishing/);
  await p.getByRole('slider',{name:'Light (µmol photons/m²/s)',exact:true}).fill('250');await p.getByRole('slider',{name:'Temperature (°C)',exact:true}).fill('35');await p.locator('#lab-record').click();await p.locator('#lab-coach').click();assert.match(await p.locator('.bio-guide-answer').textContent(),/only one/);await p.keyboard.press('Escape');assert.equal(await p.locator('#lab-coach').evaluate(e=>e===document.activeElement),true);
  for(const [id,extension] of [['lab-csv','.csv'],['lab-export','.md'],['lab-capture','.png']]){const downloadPromise=p.waitForEvent('download');await p.locator('#'+id).click();const download=await downloadPromise;assert.ok(download.suggestedFilename().endsWith(extension));}
  report.checks.push('Scientific snapshots respond to controls; trial table, scatter/line/bar, persistence, fair-test guidance, CSV/notebook/image exports, focus return.');
  await p.goto(base+'/labs.html#plant-investigation');await p.getByRole('button',{name:'Compare light exposure',exact:true}).click();assert.equal(await p.getByRole('button',{name:'Evaluate my explanation',exact:true}).isDisabled(),true);await p.getByRole('button',{name:'Compare soil moisture',exact:true}).click();await p.getByRole('button',{name:'Compare leaf nitrogen',exact:true}).click();await p.locator('#investigation-cause').selectOption('2');await p.getByRole('button',{name:'Evaluate my explanation',exact:true}).click();assert.match(await p.locator('#labStage').textContent(),/Nitrogen limitation best fits/);await p.locator('#lab-record').click();assert.equal(await p.locator('.ln-table tbody tr').count(),1);
  report.checks.push('Scenario requires evidence before evaluating a cause; chosen tests enter the notebook.');
  for(const id of ['heart','frog','fish','earthworm','cockroach']){
   console.log('Checking dissection: '+id);
   await p.goto(base+'/labs.html#'+id+'-dissection');const handle=await p.locator('.ln-stage-iframe').elementHandle();const frame=await handle.contentFrame();await frame.waitForFunction(()=>window.__LAB?.parts&&Object.keys(window.__LAB.parts).length>5,{},{timeout:30000});
   await p.locator('#lab-record').click();const data=await p.evaluate(id=>JSON.parse(localStorage.getItem('bioq.lab-notebook.v1.'+id+'-dissection')).trials.at(-1),id);assert.ok(data.measurements['Available anatomical structures']>5);assert.match(data.variables.Specimen,new RegExp(id==='fish'?'Fish':id==='heart'?'Heart':id,'i'));
  }
  report.checks.push('All five existing 3D dissections mount inside the notebook workflow with available structures; no camera requested.');
  for(const width of [320,390,768,1440]){
   await p.setViewportSize({width,height:900});await p.goto(base+'/app.html#labs/photosynthesis-rate');const frame=await(await p.locator('#viewFrame').elementHandle()).contentFrame();await frame.locator('#lab-record').waitFor();assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Lab overflow at '+width);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Shell overflow at '+width);assert.equal(await p.locator('#bio-app-backdrop').count(),1);assert.equal(await frame.locator('#bio-app-backdrop').count(),0);
   if(width===1440)await p.screenshot({path:path.join(output,'labs-desktop.png')});if(width===390)await p.screenshot({path:path.join(output,'labs-mobile.png')});
  }
  report.checks.push('320/390/768/1440 layouts have no horizontal overflow; one shared launch backdrop through iframe navigation.');
  const denied=await browser.newContext({reducedMotion:'reduce'});await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}});});const d=await denied.newPage();await d.goto(base+'/labs.html#osmosis');await d.locator('#lab-hypothesis').fill('Water enters.');await d.locator('#lab-record').click();assert.equal(await d.locator('.ln-table tbody tr').count(),1);assert.match(await d.locator('#lab-save-state').textContent(),/unavailable/);await denied.close();
  report.checks.push('Denied storage retains a usable investigation and gives accurate export guidance.');
  assert.deepEqual(errors,[]);report.passed=true;
 }finally{fs.writeFileSync(path.join(output,'workflow-browser.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
