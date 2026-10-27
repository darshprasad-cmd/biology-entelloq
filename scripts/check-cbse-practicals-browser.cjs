/* Packaged CBSE practical UI checks; no apparatus, camera or educator validation claimed. */
'use strict';
const {waitForPortableRoute}=require('../tests/portable-route-browser-helper.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules');
const runtime=createRequire(path.join(modules,'__practical_check.cjs')),{chromium}=runtime('playwright'),axePath=runtime.resolve('axe-core/axe.min.js');
const data={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/cbse/practicals-data.js'),'utf8'),data);
const all=[...data.BIO_CBSE_PRACTICALS.guides,...data.BIO_CBSE_PRACTICALS.alternatives];
const out=path.resolve(process.env.BIOLOGY_PRACTICALS_OUTPUT||path.join(root,'docs/cbse/practicals-browser'));
const report={cases:[],limitations:'Chromium emulation, not physical touch, screen-reader certification, apparatus validation or educator approval.'};
let server;
async function accessibility(page,width,state){
 if(!await page.evaluate(()=>Boolean(window.axe)))await page.addScriptTag({path:axePath});
 const violations=await page.evaluate(async()=>{const result=await axe.run('#bio-cbse',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 assert.deepEqual(violations,[],JSON.stringify({width,state,violations}));report.cases.push({width,accessibilityState:state,axeViolations:0});
}
async function run(){
 fs.mkdirSync(out,{recursive:true});let base=process.env.BIOLOGY_CBSE_URL;
 if(!base){const bytes=fs.readFileSync(path.join(root,'dist/index.html'));server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/';}
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,768,390,320]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
   await page.goto(base+'#cbse:11/practicals/b11-a-e05',{waitUntil:'domcontentloaded'});
   await page.getByRole('heading',{name:'Let’s make this workspace yours.'}).waitFor();
   assert.equal(await page.locator('input[name=classYear]:checked').inputValue(),'11');
   await page.getByRole('button',{name:'Skip for now'}).click();
   await page.getByRole('heading',{name:'Stomatal distribution on upper and lower surfaces',exact:true}).waitFor();
   assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.matches(':modal')),true);
   assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
   await page.screenshot({path:path.join(out,'guide-'+width+'.png')});
   await accessibility(page,width,'guide-with-safety-viva-and-notebook');
   await page.getByRole('button',{name:'Method',exact:true}).click();await page.screenshot({path:path.join(out,'method-'+width+'.png')});
   const q=all.find(g=>g.id==='b11-a-e05').viva[0];
   const form=page.locator('.cbsep-viva').first();
   await form.getByLabel(q.options[(q.answer+1)%q.options.length],{exact:true}).check();
   await form.getByRole('button',{name:'Check reasoning'}).click();assert.match(await form.getByRole('status').innerText(),/Reconsider/);
   await form.getByLabel(q.options[q.answer],{exact:true}).check();await form.getByRole('button',{name:'Check reasoning'}).click();assert.match(await form.getByRole('status').innerText(),/Correct reasoning/);
   await page.getByRole('button',{name:'My notes',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'cbsep-notes');
   await page.evaluate(()=>{localStorage.setItem('bioq.notes','existing lesson');localStorage.setItem('bioq.lab-notebook.v1.microscope','existing lab');});
   const note='Counted five comparable fields. <script>not executable</script> Δ area = 0.2 mm²';
   await page.getByLabel('Plan, observations, interpretation and questions').fill(note);await page.getByRole('button',{name:'Save this note'}).click();
   await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('#cbsep-note').inputValue(),note);
   await page.getByRole('button',{name:'My notes',exact:true}).click();await accessibility(page,width,'saved-notebook');
   assert.equal(await page.evaluate(()=>localStorage.getItem('bioq.notes')),'existing lesson');assert.equal(await page.evaluate(()=>localStorage.getItem('bioq.lab-notebook.v1.microscope')),'existing lab');
   const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download note'}).click();const file=await download;assert.equal(file.suggestedFilename(),'b11-a-e05-preparation.txt');
   await page.getByRole('link',{name:'← All Class 11 practical guides'}).click();
   await page.locator('#cbsep-search').fill('plasmolysis');assert.equal(await page.locator('.cbsep-card:visible').count(),1);
   await page.locator('#cbsep-search').fill('no-such-practical-xyz');await page.locator('.cbsep-empty:visible').waitFor();
   await page.locator('#cbsep-search').fill('');assert.equal(await page.locator('.cbsep-card:visible').count(),27);
   assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
   await page.screenshot({path:path.join(out,'library-'+width+'.png')});
   await accessibility(page,width,'catalogue');
   for(const year of [9,10,11,12]){await page.getByRole('button',{name:'Class '+year,exact:true}).click();await page.locator('#cbsep-search').waitFor();assert.equal(await page.locator('.cbsep-card').count(),all.filter(g=>g.classYear===year).length);}
   await page.getByRole('link',{name:'Quadrat sampling: population density',exact:true}).click();
   await page.getByRole('heading',{name:'Quadrat sampling: population density',exact:true}).waitFor();
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-section')),'method');
   for(let i=0;i<50&&await page.evaluate(()=>document.activeElement.getAttribute('data-action'))!=='close';i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.getElementById('bio-cbse').contains(document.activeElement)),true);}
   assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-action')),'close');
   await page.keyboard.press('Enter');await waitForPortableRoute(page,'#courses/12');
   const shell=page.frameLocator('#bioq-workspace');await shell.locator('#courseView .cw-class[data-sub="12"][aria-current=page]').waitFor();
   assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.open),false);
   await shell.getByRole('button',{name:'Class 12 practical preparation',exact:true}).click();await page.getByRole('heading',{name:'Prepare for the practical.',exact:true}).waitFor();
   await page.keyboard.press('Escape');await waitForPortableRoute(page,'#courses/12');assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.open),false);
   assert.deepEqual(errors,[]);await context.close();report.cases.push({width,deepLinkSkip:true,notesPreserved:true,vivaFeedback:true,searchEmpty:true,allClasses:true,keyboardClose:true});
  }
  const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await page.goto(base+'#cbse:12/practicals/b12-b-s05',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Build my study space'}).click();await page.getByRole('heading',{name:'Mammalian blastula: blastocyst organisation',exact:true}).waitFor();
  for(const g of all){await page.evaluate(hash=>{location.hash=hash;},'#cbse:'+g.classYear+'/practicals/'+g.id);await page.getByRole('heading',{name:g.title,exact:true}).waitFor();assert.equal(await page.locator('.cbsep-viva').count(),g.viva.length);assert.equal(await page.locator('.cbsep-steps li').count(),g.steps.length);assert.match(await page.locator('#cbsep-sources a').first().getAttribute('href'),/#page=/);}
  await page.evaluate(()=>{location.hash='#cbse:9/practicals/b12-a-e01';});await page.getByRole('heading',{name:'Practical guide not found'}).waitFor();
  await page.getByRole('link',{name:'Browse Class 9 practicals'}).click();await page.getByRole('heading',{name:'Prepare for the practical.'}).waitFor();
  await page.getByRole('link',{name:'Plant and cheek cells: stained mounts'}).click();await page.getByRole('button',{name:'Open supporting microscope model ↗'}).click();
  await waitForPortableRoute(page,'#labs/microscope');await page.frameLocator('#bioq-workspace').frameLocator('#viewFrame').locator('#labStage').waitFor();
  assert.deepEqual(errors,[]);await context.close();report.cases.push({all59GuidesRendered:true,firstSetupPreservesPractical:true,invalidCrossClassRoute:true,supportingBenchNavigation:true});
  const blocked=await browser.newContext(),bp=await blocked.newPage();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Storage denied');}}));await blocked.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await bp.goto(base+'#cbse:9/practicals/s9-e04',{waitUntil:'domcontentloaded'});await bp.getByRole('button',{name:'Skip for now'}).click();await bp.locator('#cbsep-note').fill('Session-only observation');await bp.getByRole('button',{name:'Save this note'}).click();assert.match(await bp.locator('.cbsep-note-status').innerText(),/session only/);await bp.getByRole('link',{name:'← All Class 9 practical guides'}).click();await bp.getByRole('link',{name:'Plant and cheek cells: stained mounts'}).click();assert.equal(await bp.locator('#cbsep-note').inputValue(),'Session-only observation');await blocked.close();report.cases.push({blockedStorageSessionFallback:true});
  if(!process.env.BIOLOGY_CBSE_URL){const offline=await browser.newContext(),op=await offline.newPage();await offline.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());await op.goto(pathToFileURL(path.join(root,'dist/index.html')).href+'#cbse:12/practicals/b12-a-e02',{waitUntil:'domcontentloaded'});await op.getByRole('button',{name:'Skip for now'}).click();await op.getByRole('heading',{name:'Quadrat sampling: population density',exact:true}).waitFor();assert.equal(await op.locator('.cbsep-viva').count(),2);await offline.close();report.cases.push({offlinePackagedGuide:true});}
  report.status='passed';fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();server?.close();}
}
run().catch(error=>{console.error(error);server?.close();process.exitCode=1;});
