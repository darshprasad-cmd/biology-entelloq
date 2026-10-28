/* Real packaged UI. No camera, account, tracking or external service is requested. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const {checkQuestionnaireLayout}=require('../tests/cbse-questionnaire-browser.cjs');
const root=path.resolve(__dirname,'..'),modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules');
const {chromium}=createRequire(path.join(modules,'__cbse_check.cjs'))('playwright');
const bytes=fs.readFileSync(path.join(root,'dist/index.html')),out=path.resolve(process.env.BIOLOGY_CBSE_OUTPUT||path.join(root,'docs/cbse/browser'));
const external=process.env.BIOLOGY_CBSE_URL;let server;
const report={cases:[],limitations:'Chromium emulation, not physical touch hardware or educator validation; no camera or live AI tested.'};
async function run(){
 fs.mkdirSync(out,{recursive:true});
 let base=external;
 if(!base){server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');if(req.url.startsWith('/held')){const cut=bytes.indexOf('<script id="bioq-manifest"');res.write(bytes.subarray(0,cut));setTimeout(()=>res.end(bytes.subarray(cut)),2500);}else res.end(bytes);});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port+'/';}
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,768,390,320]){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
   await page.goto(base,{waitUntil:'commit'});
   await page.getByRole('heading',{name:'Let’s make this workspace yours.'}).waitFor();
   assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.matches(':modal')),true);
   assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
   await page.screenshot({path:path.join(out,'questionnaire-'+width+'.png')});
   const design=await checkQuestionnaireLayout(page,width,{capture:name=>page.screenshot({path:path.join(out,name+'.png')})});
   for(let i=0;i<20;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.getElementById('bio-cbse').contains(document.activeElement)),true);}
   await page.locator('label').filter({has:page.locator('input[name=classYear][value="12"]')}).click();
   await page.locator('input[name=goal][value=practice]').check({force:true});
   await page.locator('input[name=minutes][value="30"]').check({force:true});
   await page.locator('#cbse-focus').selectOption('genetics');
   await page.getByRole('button',{name:'Build my study space'}).click();
   await page.getByRole('heading',{name:'Class 12 · Biology',exact:true}).waitFor();
   assert.match(await page.locator('.cbse-plan').innerText(),/30-minute suggestion/i);
   assert.match(await page.locator('.cbse-plan a').getAttribute('href'),/#solve\/learn\/mendelian-genetics\/layman/);
   await page.getByRole('button',{name:'Class 9',exact:true}).click();
   await page.getByRole('heading',{name:'Class 9 · Science: Biology',exact:true}).waitFor();
   assert.equal(await page.locator('.cbse-unit').count(),5);
   for(const year of ['10','11']){await page.getByRole('button',{name:'Class '+year,exact:true}).click();await page.getByRole('heading',{name:year==='10'?'Class 10 · Science: Biology':'Class 11 · Biology',exact:true}).waitFor();}
   await page.getByRole('button',{name:'Class 9',exact:true}).click();
   assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
   await page.screenshot({path:path.join(out,'dashboard-'+width+'.png')});
   await page.reload({waitUntil:'domcontentloaded'});
   await page.getByRole('heading',{name:'Class 12 · Biology',exact:true}).waitFor();
   await page.getByRole('button',{name:'Edit my preferences'}).click();
   await page.locator('input[name=classYear][value="9"]').check({force:true});
   assert.equal(await page.locator('#cbse-focus').inputValue(),'cells');
   await page.locator('input[name=goal][value=revision]').check({force:true});
   await page.getByRole('button',{name:'Save my preferences'}).click();
   assert.match(await page.locator('.cbse-plan a').getAttribute('href'),/cell-structure\/visual/);
   await page.evaluate(()=>localStorage.setItem('bioq-test-notes','preserve'));
   await page.getByRole('button',{name:'Reset only study preferences'}).click();
   assert.equal(await page.evaluate(()=>localStorage.getItem('bioq-test-notes')),'preserve');
   assert.equal(await page.evaluate(()=>localStorage.getItem(BioCBSE.KEY)),null);
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
   await context.close();assert.deepEqual(errors,[]);report.cases.push({width,firstScreen:true,allClasses:true,profileEditReset:true,...design});
  }
  const context=await browser.newContext(),page=await context.newPage();
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  await page.goto(base+'#learn/topic/cell-structure/visual',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Skip for now'}).click();
  assert.equal(new URL(page.url()).hash,'#learn/topic/cell-structure/visual');
  const shell=page.frameLocator('#bioq-workspace'),lesson=shell.frameLocator('#viewFrame');
  await lesson.locator('#bl-mode-visual[aria-selected=true]').waitFor();
  await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.open),false);
  await page.evaluate(()=>BioCBSE.openQuestionnaire());await page.getByRole('button',{name:'Save my preferences'}).click();
  await page.goto(base+'#learn/topic/dna/layman',{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.open),false);await lesson.locator('[data-mode="layman"], #bl-mode-layman').first().waitFor();
  report.cases.push({deepLinkPreserved:true,skipPersists:true,savedDeepLink:true});await context.close();
  const linked=await browser.newContext(),lp=await linked.newPage();
  await linked.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await lp.goto(base+'#cbse:12',{waitUntil:'domcontentloaded'});
  assert.equal(await lp.locator('input[name=classYear]:checked').inputValue(),'12');
  await lp.getByRole('button',{name:'Skip for now'}).click();
  await lp.getByRole('heading',{name:'Class 12 · Biology',exact:true}).waitFor();
  for(const year of ['9','10','11','12']){
   await lp.goto(base+'#cbse:'+year,{waitUntil:'domcontentloaded'});
   await lp.getByRole('heading',{name:year==='9'||year==='10'?'Class '+year+' · Science: Biology':'Class '+year+' · Biology',exact:true}).waitFor();
   assert.match(await lp.locator('.cbse-actions a').getAttribute('href'),new RegExp('#cbse:'+year+'$'));
  }
  await lp.locator('.cbse-plan a').click();await lp.frameLocator('#bioq-workspace').frameLocator('#viewFrame').locator('#bl-mode-layman').waitFor();
  await lp.frameLocator('#bioq-workspace').locator('#nav [data-cbse-entry]').click();await lp.getByRole('heading',{name:'Class 12 · Biology',exact:true}).waitFor();
  await linked.close();report.cases.push({allClassDeepLinks:true,siblingClassLink:true,realLessonNavigation:true,appReentry:true});
  const blocked=await browser.newContext(),bp=await blocked.newPage();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage denied');}}));
  await blocked.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await bp.goto(base,{waitUntil:'domcontentloaded'});await bp.getByRole('button',{name:'Build my study space'}).click();assert.match(await bp.locator('#cbse-feedback').innerText(),/could not be saved/);await blocked.close();report.cases.push({blockedStorage:true});
  const writeBlocked=await browser.newContext(),wp=await writeBlocked.newPage();
  await writeBlocked.addInitScript(()=>{
   localStorage.setItem('bioq.cbse.profile.v1',JSON.stringify({version:1,classYear:'9',goal:'foundations',minutes:20,focus:'cells'}));
   Storage.prototype.setItem=function(){throw new Error('Quota');};
  });
  await writeBlocked.route('**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await wp.goto(base,{waitUntil:'domcontentloaded'});await wp.getByRole('button',{name:'Edit my preferences'}).click();
  await wp.locator('label').filter({has:wp.locator('input[name=classYear][value="12"]')}).click();
  await wp.getByRole('button',{name:'Save my preferences'}).click();
  await wp.getByRole('heading',{name:'Class 12 · Biology',exact:true}).waitFor();
  assert.match(await wp.locator('#cbse-feedback').innerText(),/could not be saved/);
  assert.equal(await wp.evaluate(()=>JSON.parse(localStorage.getItem(BioCBSE.KEY)).classYear),'9');
  await writeBlocked.close();report.cases.push({failedWriteRetainsNewSessionPreferences:true});
  if(!external){
   const first=await browser.newContext(),fp=await first.newPage();await fp.goto(base+'held',{waitUntil:'commit'});await fp.getByRole('heading',{name:'Let’s make this workspace yours.'}).waitFor();assert.equal(await fp.evaluate(()=>!!window.BioqPackage),false);assert.equal(await fp.locator('#bioq-workspace').count(),1);await first.close();report.cases.push({questionnaireBeforeManifest:true});
   const portable=await browser.newContext(),pp=await portable.newPage();await portable.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());await pp.goto(pathToFileURL(path.join(root,'dist/index.html')).href,{waitUntil:'domcontentloaded'});await pp.getByRole('button',{name:'Build my study space'}).click();await pp.getByRole('heading',{name:'Class 9 · Science: Biology',exact:true}).waitFor();await portable.close();report.cases.push({offlineFileQuestionnaire:true});
  }
  report.pass=true;
 }finally{await browser.close();if(server)await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify(report,null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
