/* Actual packaged-browser rehearsal; not biological, physical-apparatus or webcam validation. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules');
const runtime=createRequire(path.join(modules,'__potato_check.cjs')),{chromium}=runtime('playwright');
const axePath=process.env.BIOLOGY_AXE_PATH||createRequire(path.resolve(root,'../biology-entelloq/node_modules/__axe_check.cjs')).resolve('axe-core/axe.min.js');
const model=require('../src/cbse/potato-osmosis-model.js');
const out=path.resolve(process.env.BIOLOGY_OSMOSIS_OUTPUT||path.join(root,'docs/cbse/potato-osmosis-browser'));
const route='#cbse:11/practicals/b11-a-e03',key='bioq.cbse.potato-osmosis.v1';
const report={cases:[],limitations:'Chromium emulation and illustrative model agreement only. Not physical touch, screen-reader certification, potato kinetics, webcam tracking, educator review or supervised practical competence.'};
let server,browser;
const round=value=>Number(value.toFixed(1));
async function open(page,base,action='Skip for now'){
 await page.goto(base.replace(/#.*$/,'')+route,{waitUntil:'domcontentloaded',timeout:90000});
 await page.getByRole('heading',{name:'Let’s make this workspace yours.'}).waitFor();
 assert.equal(await page.locator('.poto').count(),0,'questionnaire must precede apparatus');
 assert.equal(await page.locator('input[name=classYear]:checked').inputValue(),'11');
 await page.getByRole('button',{name:action,exact:true}).click();
 await page.locator('.poto').waitFor();assert.equal(new URL(page.url()).hash,route);
 await page.getByRole('button',{name:'Interactive potato bench',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'cbsep-potato-bench');
}
async function observe(page,options,minutes){
 const expected=model.compare(options,minutes);assert.ok(expected);
 const values=await page.locator('.poto-readout').allTextContents();
 const actual=values.map(v=>Number.parseFloat(v));
 assert.deepEqual(actual,[round(expected.testLevel),round(expected.controlLevel)],JSON.stringify({options,minutes,values}));
 assert.equal(actual[1],8,'matched water control remains intact even when test cup is faulty');
 assert.equal(await page.locator('.poto-apparatus svg').count(),2);
 assert.match(await page.locator('.poto-apparatus svg').first().getAttribute('aria-label'),new RegExp(actual[0].toFixed(1)+' mm'));
 return {testLevel:actual[0],controlLevel:actual[1],netChange:round(actual[0]-actual[1])};
}
async function enter(page,values){for(const name of ['testLevel','controlLevel','netChange'])await page.locator('.poto-record [name='+name+']').fill(String(values[name]));await page.locator('.poto-record button[type=submit]').click();}
async function save(page,options,minutes){const values=await observe(page,options,minutes);await enter(page,values);assert.match(await page.locator('.poto-feedback').innerText(),/Reading and subtraction checked/);return values;}
async function count(page,n){assert.equal(await page.locator('[data-poto-count]').innerText(),'('+n+')');}
async function advance(page,options,from,to){for(let t=from+10;t<=to;t+=10){await page.locator('[data-poto=advance]').click();assert.equal(await page.locator('.poto-time').innerText(),t+' / 60 model min');await observe(page,options,t);}}
async function newRun(page,options){
 await page.locator('[data-poto=new]').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'poto-concentration');
 for(const [id,value] of Object.entries(options))await page.locator('#poto-'+id).selectOption(String(value));
 await page.locator('[data-poto=start]').click();
}
async function accessibility(page,width,state){
 if(!await page.evaluate(()=>Boolean(window.axe)))await page.addScriptTag({path:axePath});
 const violations=await page.evaluate(async()=>{const r=await axe.run('#bio-cbse',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 assert.deepEqual(violations,[],JSON.stringify({width,state,violations}));report.cases.push({width,state,axeViolations:0});
}
async function contextFor(base,options={}){
 const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce',acceptDownloads:true,...options});
 await context.route('**/*',r=>{const url=r.request().url();return url.startsWith('file:')||new URL(url).origin===new URL(base).origin?r.continue():r.abort();});
 await context.addInitScript(()=>{window.__cameraCalls=0;if(navigator.mediaDevices)Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value(){window.__cameraCalls++;throw Error('Unexpected camera access');}});});
 return context;
}
async function responsiveCase(base,width){
 const context=await contextFor(base,{viewport:{width,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await open(page,base,width===1440?'Build my study space':'Skip for now');
  assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.matches(':modal')),true);
  assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
  assert.equal(await page.locator('.poto').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
  assert.equal(await page.locator('[data-poto=advance]').isDisabled(),true);
  assert.equal(await page.locator('.poto-record fieldset').evaluate(fieldset=>fieldset.disabled),true);
  assert.equal(await page.locator('.poto-record input[name=testLevel]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
  assert.equal(await page.locator('.poto').evaluate(d=>getComputedStyle(d).backgroundColor),'rgb(15, 36, 26)');
  for(const id of ['concentration','direction','setup','repeat'])assert.ok((await page.locator('#poto-'+id).boundingBox()).height>=44);
  await page.screenshot({path:path.join(out,'setup-'+width+'.png')});await accessibility(page,width,'setup');
  await page.evaluate(()=>{localStorage.setItem('bioq.notes','existing lesson');localStorage.setItem('bioq.lab-notebook.v1.microscope','existing microscope');});
  const note='Original plan — preserve this while testing the potato bench.';
  await page.locator('#cbsep-note').fill(note);await page.getByRole('button',{name:'Save this note',exact:true}).click();
  const options={concentration:20,direction:'inward',setup:'intact',repeat:1};
  await page.locator('[data-poto=start]').focus();await page.keyboard.press('Enter');
  for(const id of ['concentration','direction','setup','repeat'])assert.equal(await page.locator('#poto-'+id).isDisabled(),true);
  const zero=await observe(page,options,0);await enter(page,{...zero,testLevel:9});assert.match(await page.locator('.poto-feedback').innerText(),/Recheck the readouts/);await count(page,0);
  await enter(page,{...zero,netChange:1});assert.match(await page.locator('.poto-feedback').innerText(),/Subtract both starting levels/);await count(page,0);
  await save(page,options,0);await count(page,1);await save(page,options,0);await count(page,1);
  await advance(page,options,0,10);await save(page,options,10);await count(page,2);
  await advance(page,options,10,60);const forward=await save(page,options,60);assert.ok(forward.netChange>0);await count(page,3);
  assert.equal(await page.locator('[data-poto=advance]').isDisabled(),true);
  await page.locator('.poto-apparatus').screenshot({path:path.join(out,'apparatus-'+width+'.png')});
  await page.locator('.poto-notebook summary').click();await page.locator('.poto').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'run-'+width+'.png')});await accessibility(page,width,'checked-inward-notebook');
  await newRun(page,{...options,repeat:3});await count(page,3);await advance(page,{...options,repeat:3},0,60);
  const repeat=await save(page,{...options,repeat:3},60);assert.notEqual(repeat.testLevel,forward.testLevel);await count(page,4);
  const reverse={...options,direction:'outward'};await newRun(page,reverse);await advance(page,reverse,0,60);const reversed=await save(page,reverse,60);assert.ok(reversed.netChange<0);await count(page,5);
  const water={...options,concentration:0};await newRun(page,water);await advance(page,water,0,60);assert.equal((await save(page,water,60)).netChange,0);await count(page,6);
  for(const [setup,n] of [['leaking',7],['flooded',8]]){
   const fault={...options,setup};await newRun(page,fault);await advance(page,fault,0,10);await save(page,fault,10);await count(page,n);
   assert.match(await page.locator('.poto-feedback').innerText(),/confounded/);
   assert.match(await page.locator('.poto-inference').innerText(),setup==='leaking'?/punctur|leak/i:/flood|mixing/i);
   if(width===1440)await page.locator('.poto-apparatus').screenshot({path:path.join(out,'apparatus-'+setup+'.png')});
  }
  await page.locator('.poto-reason summary').click();await page.locator('.poto-reason input[value="2"]').check();await page.getByRole('button',{name:'Check explanation',exact:true}).click();assert.match(await page.locator('.poto-reason [role=status]').innerText(),/Reconsider/);
  await page.locator('.poto-reason input[value="0"]').check();await page.getByRole('button',{name:'Check explanation',exact:true}).click();assert.match(await page.locator('.poto-reason [role=status]').innerText(),/Supported, with limits/);
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-poto=export]').click();const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'potato-osmometer-simulated.csv');const csv=fs.readFileSync(await download.path(),'utf8');
  const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).records,key);
  assert.equal(csv,model.csv(stored));assert.equal(csv.trim().split(/\r?\n/).length,9);assert.match(csv,/outward/);assert.match(csv,/illustrative_not_experimental/);assert.match(csv,/leaking/);assert.match(csv,/flooded/);
  await page.reload({waitUntil:'domcontentloaded',timeout:90000});await page.locator('.poto').waitFor();await count(page,8);
  assert.equal(await page.locator('#cbsep-note').inputValue(),note);
  assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('bioq.notes'),localStorage.getItem('bioq.lab-notebook.v1.microscope')]),['existing lesson','existing microscope']);
  await page.locator('.poto-notebook summary').click();await page.locator('.poto-notebook').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'notebook-'+width+'.png')});
  await accessibility(page,width,'reloaded-signed-and-fault-observations');
  await page.getByRole('button',{name:'Interactive potato bench',exact:true}).click();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.matches('.poto-method summary')),true);
  await page.keyboard.press('Enter');assert.equal(await page.locator('.poto-method').getAttribute('open'),'');
  await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Class 11 · Biology',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H1');
  assert.equal(await page.evaluate(()=>window.__cameraCalls),0);assert.deepEqual(errors,[]);
  report.cases.push({width,firstScreen:true,keyboardStartAndDetails:true,signedReadingsAndModelAgreement:true,allTimeSteps:true,concentrations:[0,20],repeats:true,faults:true,dedup:true,csvExact:true,notesPreserved:true,reload:true,escapeAndFocus:true,cameraCalls:0});
 }finally{await context.close();}
}
async function persistenceCases(base){
 const corrupt=await contextFor(base);await corrupt.addInitScript(({key})=>{window.__payloadExecuted=0;const payload='<img src=x onerror="window.__payloadExecuted=1">';localStorage.setItem(key,JSON.stringify({version:1,records:[{concentration:20,direction:'inward',setup:'intact',repeat:1,timeMinutes:10,testLevel:999,controlLevel:8},{concentration:20,direction:payload,setup:'intact',repeat:1,timeMinutes:0,testLevel:8,controlLevel:8}]}));localStorage.setItem('bioq.cbse.practical-notes.v1.b11-a-e03',JSON.stringify({version:1,text:payload}));},{key});
 const cp=await corrupt.newPage();await open(cp,base);await count(cp,0);assert.equal(await cp.evaluate(()=>window.__payloadExecuted),0);assert.equal(await cp.locator('.poto img').count(),0);assert.match(await cp.locator('#cbsep-note').inputValue(),/<img src=x/);await corrupt.close();report.cases.push({corruptNotebookIgnored:true,storedMarkupNotExecuted:true});
 const blocked=await contextFor(base);await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Storage denied');}}));
 const bp=await blocked.newPage(),errors=[];bp.on('pageerror',e=>errors.push(e.message));await open(bp,base);
 const options={concentration:10,direction:'inward',setup:'intact',repeat:1};await bp.locator('#poto-concentration').selectOption('10');await bp.locator('[data-poto=start]').click();await advance(bp,options,0,10);await save(bp,options,10);
 await bp.locator('.poto-notebook summary').click();assert.match(await bp.locator('.poto-storage').innerText(),/session only/);
 await bp.getByRole('link',{name:'← All Class 11 practical guides',exact:true}).click();await bp.locator('a[href="'+route+'"]').click();await bp.locator('.poto').waitFor();await count(bp,1);assert.deepEqual(errors,[]);
 await blocked.close();report.cases.push({tenPercentComparison:true,blockedStorageSessionRemount:true});
}
async function offlineCase(){
 const url=pathToFileURL(path.join(root,'dist/index.html')).href,context=await contextFor(url),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{await open(page,url);const options={concentration:20,direction:'inward',setup:'intact',repeat:1};await page.locator('[data-poto=start]').click();await advance(page,options,0,10);await save(page,options,10);await count(page,1);assert.equal(await page.evaluate(()=>window.__cameraCalls),0);assert.deepEqual(errors,[]);report.cases.push({singleFileOfflineInteractive:true,cameraCalls:0});}finally{await context.close();}
}
async function run(){
 fs.mkdirSync(out,{recursive:true});let base=process.env.BIOLOGY_CBSE_URL;
 if(!base){const bytes=fs.readFileSync(path.join(root,'dist/index.html'));server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(bytes);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+'/';}
 report.target=base;browser=await chromium.launch({headless:true});
 try{for(const width of [1440,768,390,320])await responsiveCase(base,width);await persistenceCases(base);if(!process.env.BIOLOGY_CBSE_URL)await offlineCase();report.status='passed';}
 catch(error){report.status='failed';report.error=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();server?.close();}
 console.log(JSON.stringify(report,null,2));
}
run().catch(error=>{console.error(error);server?.close();process.exitCode=1;});
