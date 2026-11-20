/* Bounded real-artifact interface checks. No live response substitution.
 * BIOLOGY_POLISH_URL=https://biology.entelloq.com/ checks that public body.
 * Without it, a local server serves only the current dist/index.html.
 * BIOLOGY_POLISH_OUTPUT selects a fresh evidence directory for retries. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {dismissCBSE}=require('../tests/cbse-browser-helper.cjs');
const {checkAppSearch}=require('../tests/app-search-browser.cjs');
const {checkProgressCards}=require('../tests/progress-readability-browser.cjs');
const {checkLabCatalogNavigation}=require('../tests/lab-catalog-navigation-browser.cjs');
const root=path.resolve(__dirname,'..'),modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules');
const {chromium}=createRequire(path.join(modules,'__polish_browser__.cjs'))('playwright');
const external=process.env.BIOLOGY_POLISH_URL;
const output=path.resolve(process.env.BIOLOGY_POLISH_OUTPUT||path.join(root,'docs/polish-20261028/interface-local'));
const optional=new Set(['fonts.googleapis.com','fonts.gstatic.com','accounts.google.com','groq-proxy.physicsedge.workers.dev']);
const report={mode:external?'live HTTPS':'local distributable',startedAt:new Date().toISOString(),complete:false,runs:[],limitations:'Isolated desktop Chromium at CSS widths1440/390/320 with reduced motion. Optional services blocked; no camera, accounts, AI requests, physical touch devices or scientific-model validation.'};
fs.mkdirSync(output,{recursive:true});
const save=()=>fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
let server,browser,entry;
async function child(parent,selector){const frame=await (await parent.locator(selector).elementHandle({timeout:60000})).contentFrame();assert(frame,selector+' owns a live frame');return frame;}
async function mounted(page,ready){await dismissCBSE(page);const shell=await child(page,'#bioq-workspace');await shell.locator('#viewFrame.on').waitFor({timeout:60000});const frame=await child(shell,'#viewFrame');await frame.locator(ready).first().waitFor({timeout:60000});await shell.locator('#skel.on').waitFor({state:'hidden',timeout:30000});assert.equal(await shell.locator('#oops.on').count(),0);return {shell,frame};}
async function contained(page,shell,frame){const rows=[];for(const [name,scope]of [['wrapper',page],['shell',shell],['section',frame]]){const box=await scope.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(box.scroll<=box.width+1,`${name} overflows: ${JSON.stringify(box)}`);rows.push({name,...box});}return rows;}
(async()=>{
 if(external){const target=new URL(external);assert.equal(target.protocol,'https:','Live verification requires HTTPS');target.hash='';entry=target.href;}
 else{const artifact=path.join(root,'dist/index.html'),bytes=fs.readFileSync(artifact);report.localArtifact={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};server=http.createServer((req,res)=>{if(new URL(req.url,'http://local').pathname!=='/'){res.writeHead(404).end('Only the portable artifact is served');return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':bytes.length});res.end(bytes);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));entry='http://127.0.0.1:'+server.address().port+'/';}
 report.url=entry;save();browser=await chromium.launch({headless:true});
 for(const width of [1440,390,320]){
  const run={width,height:width===1440?1000:844,complete:false,checks:[],errors:[],cameraRequests:0,requests:[],unexpectedRequests:[]};report.runs.push(run);save();
  const context=await browser.newContext({viewport:{width,height:run.height},reducedMotion:'reduce',colorScheme:'dark',serviceWorkers:'block'});
  await context.exposeBinding('__polishCameraAttempt',()=>{run.cameraRequests++;});
  await context.addInitScript(()=>{if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{await window.__polishCameraAttempt();throw new Error('Camera disabled by isolated interface check');};});
  await context.route('**/*',route=>{const request=route.request(),target=new URL(request.url());if(!['http:','https:'].includes(target.protocol))return route.continue();if(target.href.split('#')[0]===entry&&request.isNavigationRequest()&&!request.frame().parentFrame()){run.requests.push({url:target.href,action:'actual network document'});return route.continue();}const isOptional=optional.has(target.hostname);run.requests.push({url:target.href,action:'blocked',optional:isOptional});if(!isOptional)run.unexpectedRequests.push(target.href);return route.abort('blockedbyclient');});
  const page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(120000);page.on('pageerror',error=>run.errors.push(error.message));
  const capture=async name=>page.screenshot({path:path.join(output,`${width}-${name}.png`),timeout:30000});
  try{
   const started=Date.now();const response=await page.goto(entry+'#labs',{waitUntil:'domcontentloaded',timeout:120000});assert(response?.ok(),'The actual main document loaded successfully');run.document={status:response.status(),url:response.url(),loadMs:Date.now()-started};let {shell,frame}=await mounted(page,'#lab-search');
   run.search=await checkAppSearch(page,shell);run.checks.push('Search: accessible touch target, typing/empty recovery, focus trap/shortcuts and preserved route/storage');save();
   run.catalogue=await checkLabCatalogNavigation(page,frame,{capture:name=>capture('labs-'+name),theme:'dark'});run.checks.push('Labs: submit/filter/recovery, focus-safe return, real route shim and preserved notebook marker');run.labsLayout=await contained(page,shell,frame);await frame.locator('#lab-results-title').scrollIntoViewIfNeeded();await capture('labs');save();
   await page.goto(entry+'#me',{waitUntil:'domcontentloaded',timeout:120000});({shell,frame}=await mounted(page,'#masterySlot .topic'));run.progress=await checkProgressCards(page,frame,{width,theme:await shell.locator('html').getAttribute('data-theme')});run.checks.push('Me: eight readable topic cards, contained status and original desktop layout');run.meLayout=await contained(page,shell,frame);await frame.locator('#masterySlot').scrollIntoViewIfNeeded();await capture('me');
   assert.equal(run.cameraRequests,0,'No camera attempt');assert.deepEqual(run.unexpectedRequests,[],'No unbundled application dependencies');assert.deepEqual(run.errors,[],'No uncaught page errors');run.complete=true;console.log(`PASS interface ${width}: search, Labs, Me; camera0; no page errors or horizontal overflow`);save();
  }catch(error){run.failure=error.message;run.url=page.url();await capture('failure').catch(()=>{});save();throw error;}
  finally{await context.close();}
 }
 report.complete=true;report.completedAt=new Date().toISOString();save();console.log(JSON.stringify({complete:true,mode:report.mode,widths:report.runs.map(run=>run.width),output},null,2));
})().catch(error=>{report.failure=error.message;save();console.error(error);process.exitCode=1}).finally(async()=>{await browser?.close();if(server?.listening)await new Promise(resolve=>server.close(resolve));});
