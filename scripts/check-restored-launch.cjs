'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules';
const {chromium}=createRequire(path.join(modules,'__restored_check.cjs'))('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3039';
const out=path.resolve(__dirname,'../docs/launch-restoration');
fs.mkdirSync(out,{recursive:true});
const report={base,complete:false,viewports:[],checks:[],errors:[],failedAssets:[]};
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1600,390,360,768,1440,1920]){
   const context=await browser.newContext({viewport:{width,height:width<800?844:1000},reducedMotion:'reduce'});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))report.failedAssets.push(r.url());});
   await page.goto(base+'/',{waitUntil:'networkidle'});
   assert.match(await page.locator('#bio-title').textContent(),/Where Biology/);
   assert.equal(await page.locator('#bio-cell-story').count(),0);
   assert.equal(await page.locator('.bio-teaser').count(),4);
   assert.equal(await page.locator('#bio-motion-toggle').isDisabled(),true);
   assert.equal(await page.locator('.bio-hero-image').evaluate(e=>getComputedStyle(e).animationName),'none');
   const h=await page.evaluate(()=>document.documentElement.scrollHeight);
   for(let y=0;y<h;y+=800){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(35);}
   await page.waitForFunction(()=>Array.from(document.images).filter(e=>e.offsetWidth>0).every(e=>e.complete&&e.naturalWidth>0));
   const info=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,sections:document.querySelectorAll('section').length,images:Array.from(document.images).filter(e=>e.offsetWidth>0).length}));
   assert.ok(info.scroll<=width+1,`No overflow at ${width}`);assert.equal(info.sections,10);
   assert.equal(await page.locator('.pe-founder img').evaluate(e=>getComputedStyle(e).filter),'none');
   const broken=await page.locator('a[href^="#"]').evaluateAll(links=>links.map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(h.slice(1))));assert.deepEqual(broken,[]);
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,`biology-restored-${width}.png`)});
   if(width===1600||width===390){await page.screenshot({path:path.join(out,`biology-restored-${width}-full.png`),fullPage:true});}
   await page.locator('#bio-open-search').click();await page.locator('#bio-search-input').fill('enzyme');assert.equal(await page.locator('#bio-search-results a').getAttribute('href'),'app.html#labs');await page.keyboard.press('Escape');await page.locator('#bio-search').waitFor({state:'hidden'});
   for(const [substrate,rate] of [['0','0.0'],['1','50.0'],['10','90.9']]){await page.locator('#pe-substrate').fill(substrate);assert.match(await page.locator('#pe-rate').textContent(),new RegExp(rate.replace('.','\\.')));}
   await page.locator('.pe-faq summary').first().click();assert.equal(await page.locator('.pe-faq details').first().getAttribute('open'),'');
   report.viewports.push(info);await context.close();
  }
  report.checks.push('Six widths: original heading, four teasers, ten sections, no pinned scene, complete images, no overflow, original-color founder, valid anchors, search, FAQ and unchanged enzyme rates.');
  const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.keyboard.press('Tab');assert.equal(await page.locator('.pe-skip').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Enter');assert.equal(await page.locator('#pe-main').evaluate(e=>e===document.activeElement),true);
  await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>document.querySelector('#bio-welcome').dataset.motionActive==='true');
  assert.equal(await page.locator('#lnd').getAttribute('data-motion'),'running');
  await page.locator('#bio-motion-toggle').click();assert.equal(await page.locator('#lnd').getAttribute('data-motion'),'paused');await page.reload();assert.equal(await page.locator('#lnd').getAttribute('data-motion'),'paused');
  await page.locator('#bio-motion-toggle').click();await page.locator('#pe-founder').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#bio-welcome').dataset.motionActive==='false');assert.equal(await page.locator('.bio-hero-image').evaluate(e=>getComputedStyle(e).animationPlayState),'paused');
  await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>document.querySelector('#bio-welcome').dataset.motionActive==='true');
  await page.locator('.bio-explore-button').click();await page.waitForURL(/app\.html#home/);await page.locator('#homeIn').waitFor();
  report.checks.push('Keyboard skip/focus, persisted global pause, offscreen hero animation suspension, returning hero resumes, immediate app Home entry.');
  await context.close();assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedAssets,[]);report.complete=true;
 }finally{await browser.close();fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
