/* Focused opening regression: deliberately hold the specimen tail off the
 * connection and prove Solve works before the parent document finishes.
 * No WebGL worlds, camera, accounts or live AI are started by this check. */
'use strict';
const {dismissCBSE}=require('../tests/cbse-browser-helper.cjs');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
const {gunzipSync,gzipSync}=require('node:zlib');
const root=path.resolve(__dirname,'..');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules');
const {chromium}=createRequire(path.join(modules,'__opening_check__.cjs'))('playwright');
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const marker='<script type="application/octet-stream" id="bioq-deferred-asset-0">';
const boundary=html.indexOf(marker);assert.ok(boundary>0,'A model tail follows the startup runtime');
const prefix=html.slice(0,boundary),tail=html.slice(boundary);
const frog='assets/specimens/frog.glb',frogHash=createHash('sha256').update(fs.readFileSync(path.join(root,frog))).digest('hex');
const report={complete:false,initialBytes:Buffer.byteLength(prefix),totalBytes:Buffer.byteLength(html),checks:[],errors:[],unexpectedRequests:[]};
const reportPath=path.join(root,'docs/single-file/opening-browser-report.json');
const latePrefix=prefix.replace(/(<script id="bioq-manifest" type="application\/json">)([\s\S]*?)(<\/script>)/,(_,start,data,end)=>{
 const manifest=JSON.parse(data),lesson=gunzipSync(Buffer.from(manifest.pages['learn.html'],'base64')).toString('utf8');
 manifest.pages['learn.html']=gzipSync(Buffer.from(lesson.replace('</body>','<script src="https://biology-reading-test.invalid/held.js"></script></body>'))).toString('base64');
 return start+JSON.stringify(manifest).replace(/</g,'\\u003c')+end;
});
let waitingResponse;
const server=http.createServer((req,res)=>{
 if(req.url==='/held') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.write(prefix);waitingResponse=res;return;}
 if(req.url==='/late-reading') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(latePrefix+'</body></html>');return;}
 if(req.url==='/truncated') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(prefix+'</body></html>');return;}
 if(req.url==='/corrupt') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(prefix+marker+'not-a-valid-gzip-payload</script><script>BioqPackage.assetReady("'+frog+'");</script></body></html>');return;}
 res.writeHead(404);res.end();
});
async function frame(parent,selector){const handle=await parent.locator(selector).elementHandle();return handle.contentFrame();}
async function ready(page){
 await dismissCBSE(page);
 const shell=await frame(page,'#bioq-workspace');await shell.locator('#viewFrame.on').waitFor({timeout:30000});
 const solve=await frame(shell,'#viewFrame');await solve.locator('#svConfigCard').waitFor({timeout:30000});
 await page.locator('#bioq-loading').waitFor({state:'hidden'});
 return {shell,solve};
}
async function open(browser,url,allowed,options={}){
 const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:.5,reducedMotion:'reduce',serviceWorkers:'block'});
 if(options.init)await context.addInitScript(options.init);
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url());
  if(allowed(url,request))return route.continue();
  if(['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))return route.abort('blockedbyclient');
  if(['http:','https:','file:'].includes(url.protocol)){report.unexpectedRequests.push(url.href);return route.abort('blockedbyclient');}
  return route.continue();
 });
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',error=>report.errors.push(error.message));
 await page.goto(url,{waitUntil:'commit',timeout:30000});
 return {context,page,...(options.skipReady?{}:await ready(page))};
}
async function exactFrog(page){
 return page.evaluate(async path=>{
  const response=await BioqPackage.fetch(window,'https://biology.entelloq.com/'+path,{},()=>{throw new Error('Unexpected model network request');});
  const bytes=await response.arrayBuffer();
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
  return {hash,bytes:bytes.byteLength};
 },frog);
}
async function readingReadyAfterTimeout(browser,base){
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});let heldScript;
 try{
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='biology-reading-test.invalid'){heldScript=route;return;}
   if(url.origin===base&&url.pathname==='/late-reading')return route.continue();
   if(['http:','https:'].includes(url.protocol))return route.abort('blockedbyclient');
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(base+'/late-reading#learn/topic/cell-structure/visual',{waitUntil:'domcontentloaded'});
  await dismissCBSE(page);
  const shell=await frame(page,'#bioq-workspace');await shell.locator('#viewFrame.on').waitFor();const lesson=await frame(shell,'#viewFrame');
  await shell.locator('#oops.on').waitFor({timeout:20000});assert.match(await shell.locator('#oopsMsg').textContent(),/took too long/);
  assert.equal(await lesson.evaluate(()=>BioqContext.ready),false,'The real timeout precedes authored readiness');
  assert.ok(heldScript,'The test holds the same reading document before completion');await heldScript.fulfill({contentType:'text/javascript',body:''});heldScript=null;
  await lesson.waitForFunction(()=>BioqContext.ready);await shell.locator('#oops.on').waitFor({state:'hidden'});await shell.locator('#skel.on').waitFor({state:'hidden'});
  await require('../tests/library-answer-browser.cjs').checkLibraryAnswer(page,lesson);
  report.checks.push('A reading document that genuinely exceeds the 15-second deadline first shows recovery, then late validated completion dismisses it and restores real keyboard/pointer quiz answers and retries.');
 }finally{await heldScript?.abort().catch(()=>{});await context.close();}
}
async function readingReadyWithHeldImage(browser,base){
 const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});let heldImage;
 try{
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.origin===base&&url.pathname==='/held-decoration.png'){heldImage=route;return;}
   if(url.origin===base&&url.pathname==='/truncated')return route.continue();
   if(['http:','https:'].includes(url.protocol))return route.abort('blockedbyclient');
   return route.continue();
  });
  await context.addInitScript(base=>document.addEventListener('DOMContentLoaded',()=>{
   if(window.BioqLocation?.pathname.endsWith('/learn.html')){const image=document.createElement('img');image.src=base+'/held-decoration.png';image.hidden=true;document.body.append(image);}
  }),base);
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(base+'/truncated#learn/topic/cell-structure/visual',{waitUntil:'domcontentloaded'});
  await dismissCBSE(page);
  const shell=await frame(page,'#bioq-workspace');await shell.locator('#viewFrame.on').waitFor();const lesson=await frame(shell,'#viewFrame');
  await lesson.locator('#bl-mode-visual[aria-selected=true]').waitFor();await shell.locator('#skel.on').waitFor({state:'hidden'});
  assert.equal(await lesson.evaluate(()=>document.readyState),'interactive','The noncritical image still delays native load');
  await lesson.locator('.bl-quiz [data-check="0"]').first().click();await lesson.locator('[data-feedback="0"]').waitFor({state:'visible'});
  await page.waitForTimeout(15500);
  assert.equal(await shell.locator('#oops.on').count(),0,'A ready lesson must not hit the unchanged 15-second load deadline');
  await lesson.getByRole('button',{name:'Try this check again',exact:true}).click();assert.equal(await lesson.locator('.bl-quiz [data-check="0"]').first().isEnabled(),true);
  report.checks.push('Learn answers and retries remain usable beyond the unchanged 15-second deadline while a noncritical image deliberately withholds native iframe load.');
  await page.goto(base+'/truncated#home',{waitUntil:'domcontentloaded'});
  const home=await frame(page,'#bioq-workspace');await home.locator('#homeIn .cc-world').first().waitFor();
  await page.evaluate(()=>{window.originalLoadFrame=BioqPackage.loadFrame;BioqPackage.loadFrame=(target,value,...rest)=>target.id==='viewFrame'?true:originalLoadFrame(target,value,...rest);});
  await home.locator('#nav [data-go="learn"]:not(.quick-action)').click();await home.locator('#oops.on').waitFor({timeout:20000});
  assert.match(await home.locator('#oopsMsg').textContent(),/took too long/,'A genuinely unmounted section still reaches the unchanged deadline');
  await page.evaluate(()=>{BioqPackage.loadFrame=originalLoadFrame;delete window.originalLoadFrame;});await home.locator('#oopsRetry').click();
  const retried=await frame(home,'#viewFrame');await retried.locator('#bl-search').waitFor();await home.locator('#skel.on').waitFor({state:'hidden'});assert.equal(await home.locator('#oops.on').count(),0,JSON.stringify(await retried.evaluate(()=>({ready:BioqContext.ready,state:document.readyState,page:BioqContext.page,src:frameElement.getAttribute('src'),url:BioqContext.url.href,body:document.body.children.length}))));
  report.checks.push('A withheld reading document still shows the 15-second recovery screen; restoring its loader and choosing Retry opens the real Learn page.');
 }finally{await heldImage?.abort().catch(()=>{});await context.close();}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 let isolatedDirectory;
 try{
  await readingReadyAfterTimeout(browser,base);
  await readingReadyWithHeldImage(browser,base);
  const begin=Date.now();
  const held=await open(browser,base+'/held#solve',url=>url.origin===base&&url.pathname==='/held');
  report.solveReadyMs=Date.now()-begin;
  assert.equal(await held.page.evaluate(()=>document.readyState),'loading','Solve must open while the model response is still withheld');
  assert.equal(await held.solve.locator('#svConfigCard').isVisible(),true);
  assert.equal(await held.shell.locator('#nav .navi[data-go="solve"]:not(.quick-action)').getAttribute('aria-current'),'page');
  report.checks.push('The exact #solve route is interactive before the model tail or parent DOMContentLoaded.');
  const cancellation=await held.page.evaluate(async path=>{
   const controller=new AbortController();
   const pending=BioqPackage.fetch(window,'https://biology.entelloq.com/'+path,{signal:controller.signal},()=>{throw new Error('network');});
   controller.abort();return pending.then(()=> 'unexpected success',error=>error.name);
  },frog);
  assert.equal(cancellation,'AbortError');
  const deadline=await held.page.evaluate(async path=>{
   const nativeTimeout=window.setTimeout;
   window.setTimeout=(callback,delay,...args)=>nativeTimeout(callback,delay>=60000?20:delay,...args);
   try{return await BioqPackage.fetch(window,'https://biology.entelloq.com/'+path,{},()=>{throw new Error('network');}).then(()=>'',error=>error.message);}
   finally{window.setTimeout=nativeTimeout;}
  },frog);
  assert.match(deadline,/taking too long/,'A stalled model download has a bounded, actionable failure');
  const original=exactFrog(held.page);
  waitingResponse.end(tail);waitingResponse=null;
  report.frog=await original;assert.equal(report.frog.hash,frogHash);
  await held.page.waitForLoadState('domcontentloaded');
  const cachedCancellation=await held.page.evaluate(async path=>{
   const controller=new AbortController();
   const pending=BioqPackage.fetch(window,'https://biology.entelloq.com/'+path,{signal:controller.signal},()=>{throw new Error('network');});
   controller.abort();return pending.then(()=> 'unexpected success',error=>error.name);
  },frog);
  assert.equal(cachedCancellation,'AbortError','Cancellation wins even when decoded bytes are already cached');
  report.checks.push('Cancellation and a stalled-download deadline reject promptly; a later fetch returns the exact original frog bytes after the same response continues.');
  await held.context.close();
  for(const mode of ['truncated','corrupt']){
   const opened=await open(browser,base+'/'+mode+'#solve',url=>url.origin===base&&url.pathname==='/'+mode);
   await opened.page.waitForLoadState('domcontentloaded');
   const error=await opened.page.evaluate(path=>BioqPackage.fetch(window,'https://biology.entelloq.com/'+path,{},()=>{throw new Error('network');}).then(()=>'',error=>error.message),frog);
   assert.match(error,/download.*(?:interrupted|could not be read)/);
   await opened.shell.locator('#nav [data-go="lab"]').click();
   const problem=await frame(opened.shell,'#launchFrame');
   await problem.locator('[role="alert"]').waitFor();
   await problem.getByRole('button',{name:'Try again'}).waitFor();
   await opened.shell.locator('#launchLoad').waitFor({state:'hidden'});
   await opened.shell.locator('#launchX').click();
   await opened.page.waitForURL(url=>url.hash==='#solve');
   await opened.solve.locator('#svConfigCard').waitFor();
   report.checks.push(mode+' model data rejects with an actionable error and retry; exiting the error returns to working Solve.');
   await opened.context.close();
  }
  const tempRoot=path.resolve(process.env.TEMP||process.env.TMP||path.join(root,'dist'));
  isolatedDirectory=fs.mkdtempSync(path.join(tempRoot,'biology-opening-'));
  const single=path.join(isolatedDirectory,'Biology Entelloq.html');fs.writeFileSync(single,html);
  const fileURL=pathToFileURL(single).href;
  const offline=await open(browser,fileURL+'#solve',url=>url.href.split('#')[0]===fileURL);
  assert.equal((await exactFrog(offline.page)).hash,frogHash);
  report.checks.push('The copied-alone HTML opens Solve and serves identical deferred model bytes with external requests blocked.');
  await offline.context.close();
  const unsupported=await open(browser,base+'/truncated#solve',url=>url.origin===base&&url.pathname==='/truncated',{
   init:()=>{window.DecompressionStream=undefined;},skipReady:true
  });
  await unsupported.page.locator('#bioq-retry').waitFor({state:'visible'});
  assert.match(await unsupported.page.locator('#bioq-loading-message').textContent(),/current version of Chrome, Edge, Firefox or Safari/);
  report.checks.push('A browser without DecompressionStream shows a clear compatibility message and retry instead of an uncaught startup exception.');
  await unsupported.context.close();
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.unexpectedRequests,[]);report.complete=true;
 }finally{
  waitingResponse?.end();await browser.close();await new Promise(resolve=>server.close(resolve));
  if(isolatedDirectory){const single=path.join(isolatedDirectory,'Biology Entelloq.html');fs.unlinkSync(single);fs.rmdirSync(isolatedDirectory);}
  fs.mkdirSync(path.dirname(reportPath),{recursive:true});fs.writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
