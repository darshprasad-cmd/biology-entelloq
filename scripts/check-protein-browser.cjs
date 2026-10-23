/* Real Mol* in the built single-file Biology shell; no source server required. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const {dismissCBSE} = require('../tests/cbse-browser-helper.cjs');
const root = path.resolve(__dirname,'..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || path.resolve(root,'../biology-entelloq/node_modules');
const {chromium} = createRequire(path.join(modules,'protein-check.cjs'))('playwright');
const output = path.join(root,'docs/protein');
const bytes = fs.readFileSync(path.join(root,'dist/index.html'));
const base = 'http://biology.protein.test/index.html';
const report = {complete:false,checks:[],errors:[],requests:[],artifactSha256:crypto.createHash('sha256').update(bytes).digest('hex'),rendering:'Chromium SwiftShader; no camera or live AI tested'};
fs.mkdirSync(output,{recursive:true});
const check = (name,value=true) => {assert.ok(value,name);report.checks.push(name);console.log('PASS '+name);};
async function child(frame,selector) {const element=await frame.locator(selector).elementHandle({timeout:60000});return element.contentFrame();}
async function routeReady(page,route) {
  const [section,...parts]=route.split('/'),sub=parts.length?'#'+parts.join('/'):'';
  await page.waitForFunction(({section,sub})=>{
    const app=document.querySelector('#bioq-workspace')?.contentWindow;
    const child=app?.document.querySelector('#viewFrame.on')?.contentWindow;
    return child?.BioqContext?.ready && child.BioqLocation.pathname.endsWith('/'+section+'.html') && child.BioqLocation.hash===sub;
  },{section,sub},{timeout:60000});
}
async function enter(page,route) {
  await page.goto(base+'#'+route,{waitUntil:'domcontentloaded',timeout:90000});await dismissCBSE(page);
  await routeReady(page,route);
  const shell=await child(page,'#bioq-workspace');await shell.locator('#viewFrame.on').waitFor({timeout:60000});
  const frame=await child(shell,'#viewFrame');await frame.locator('#proteins').waitFor({timeout:60000});
  return {shell,frame};
}
async function ready(frame,id) {await frame.locator('#pa-stage[data-loaded="true"][data-protein="'+id+'"]').waitFor({timeout:90000});}
async function layout(page,shell,frame,name) {
  for(const part of [page,shell,frame]) {const widths=await part.evaluate(()=>[innerWidth,document.documentElement.scrollWidth]);assert.ok(widths[1]<=widths[0]+1,name+' overflow '+widths);}
  check(name+' fits viewport');
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BIOLOGY_BROWSER_CHANNEL?{channel:process.env.BIOLOGY_BROWSER_CHANNEL}:{}),args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
 let rejectRemote=false;
 await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin==='http://biology.protein.test') {
     check('no separate local resource needed',url.pathname==='/index.html');
     return route.fulfill({status:200,contentType:'text/html',body:bytes});
   }
   if(url.hostname==='files.rcsb.org'){report.requests.push(url.href);return rejectRemote?route.abort():route.continue();}
   if(['fonts.googleapis.com','fonts.gstatic.com','accounts.google.com','groq-proxy.physicsedge.workers.dev'].includes(url.hostname))return route.abort();
   if(url.protocol==='http:'||url.protocol==='https:'){report.errors.push('Unexpected network '+url.href);return route.abort();}
   return route.continue();
 });
 const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
 try {
   let {shell,frame}=await enter(page,'explore');
   check('viewer stays lazy on Explore',await frame.evaluate(()=>typeof window.molstar==='undefined'));
   await frame.getByRole('link',{name:'Open Protein Atlas'}).click();await ready(frame,'1CRN');
   check('actual bundled crambin parsed into 327 atoms',await frame.locator('#pa-stage').getAttribute('data-atoms')==='327');
   check('real WebGL canvas exists',await frame.locator('#pa-host canvas').count()>0);
   check('crambin requires no remote coordinate request',report.requests.length===0);
   await frame.locator('#proteins').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'atlas-desktop.png')});
   await layout(page,shell,frame,'desktop');
   await shell.locator('#themeBtn').click();await frame.waitForFunction(()=>document.documentElement.dataset.theme==='light');
   await page.screenshot({path:path.join(output,'atlas-light.png')});check('shared Biology light theme reaches the loaded viewer');
   await shell.locator('#themeBtn').click();await frame.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
   await frame.getByRole('button',{name:'Atoms',exact:true}).click();await frame.locator('#pa-stage[data-mode="atomic-detail"]').waitFor({timeout:60000});check('actual atom representation completes');
   await frame.getByRole('button',{name:'Surface',exact:true}).click();await frame.locator('#pa-stage[data-mode="molecular-surface"]').waitFor({timeout:60000});check('actual molecular surface completes');
   await frame.getByRole('button',{name:'Reset view',exact:true}).focus();await page.keyboard.press('Enter');check('keyboard reset works',(await frame.locator('#pa-status').textContent()).includes('view reset'));
   await frame.locator('[data-pa-protein="1STP"]').click();await ready(frame,'1STP');
   check('actual remote streptavidin parses',Number(await frame.locator('#pa-stage').getAttribute('data-atoms'))>500);
   await frame.getByRole('button',{name:'Focus BTN ligand'}).click();check('actual ligand select/focus completes',(await frame.locator('#pa-status').textContent()).includes('BTN ligand selected'));
   await frame.locator('#proteins').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'atlas-ligand.png')});
   await frame.locator('[data-pa-protein="1HHO"]').click();await ready(frame,'1HHO');check('actual remote oxyhaemoglobin parses',Number(await frame.locator('#pa-stage').getAttribute('data-atoms'))>1000);
   rejectRemote=true;await frame.locator('[data-pa-protein="1STP"]').click();await frame.locator('#pa-cover[data-error="true"]').waitFor({timeout:30000});
   check('network failure gives recovery and no false loaded state',await frame.locator('#pa-stage').getAttribute('data-loaded')==='false');
   await frame.locator('[data-pa-protein="1CRN"]').click();await ready(frame,'1CRN');check('offline structure recovers from remote failure');
   await page.setViewportSize({width:390,height:844});await frame.locator('#proteins').scrollIntoViewIfNeeded();await layout(page,shell,frame,'mobile');await page.screenshot({path:path.join(output,'atlas-mobile.png')});
   await page.goto(base+'#learn/topic/photosynthesis/visual',{waitUntil:'domcontentloaded'});await dismissCBSE(page);
   await routeReady(page,'learn/topic/photosynthesis/visual');
   shell=await child(page,'#bioq-workspace');frame=await child(shell,'#viewFrame');await frame.locator('#bl-topic-title').waitFor({timeout:60000});
   check('existing Learn deep route remains available',(await frame.locator('#bl-topic-title').textContent()).toLowerCase().includes('photosynthesis') && await frame.locator('#bl-mode-visual').getAttribute('aria-selected')==='true');
   ({shell,frame}=await enter(page,'explore/proteins'));await ready(frame,'1CRN');check('direct Protein Atlas route reloads in Biology shell');
   check('zero uncaught errors or unexpected network',report.errors.length===0);report.complete=true;
 } finally {
   fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
