/* Focused opening regression: deliberately hold the specimen tail off the
 * connection and prove Solve works before the parent document finishes.
 * No WebGL worlds, camera, accounts or live AI are started by this check. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto');
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
let waitingResponse;
const server=http.createServer((req,res)=>{
 if(req.url==='/held') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.write(prefix);waitingResponse=res;return;}
 if(req.url==='/truncated') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(prefix+'</body></html>');return;}
 if(req.url==='/corrupt') {res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(prefix+marker+'not-a-valid-gzip-payload</script><script>BioqPackage.assetReady("'+frog+'");</script></body></html>');return;}
 res.writeHead(404);res.end();
});
async function frame(parent,selector){const handle=await parent.locator(selector).elementHandle();return handle.contentFrame();}
async function ready(page){
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
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 let isolatedDirectory;
 try{
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
