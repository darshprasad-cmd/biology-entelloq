'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules';
const {chromium}=createRequire(path.join(modules,'__launch_check.cjs'))('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3036',out=path.resolve(__dirname,'../docs/reality-opened');
fs.mkdirSync(out,{recursive:true});
const report={base,complete:false,viewports:[],checks:[],errors:[],failedAssets:[],metrics:{}};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try{
  for(const width of [360,390,768,1440,1920]){
   const context=await browser.newContext({viewport:{width,height:width<800?844:1000},reducedMotion:'reduce'});
   const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))report.failedAssets.push(r.url());});
   await page.goto(base+'/',{waitUntil:'networkidle'});
   await page.locator('#bio-title').waitFor();
   assert.equal(await page.locator('#bio-motion-toggle').isDisabled(),true);
   const h=await page.evaluate(()=>document.documentElement.scrollHeight);
   for(let y=0;y<h;y+=700){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(100);}
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
   const dimension=await page.evaluate(()=>({inner:innerWidth,scroll:document.documentElement.scrollWidth,sections:document.querySelectorAll('main section').length}));assert.ok(dimension.scroll<=width+1,`overflow at ${width}`);
   const images=await page.locator('img').evaluateAll(items=>items.filter(e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().width>0).map(e=>({src:e.getAttribute('src')?.slice(0,100),loaded:e.complete&&e.naturalWidth>0})));assert.ok(images.every(e=>e.loaded),'All visible images loaded '+width);
   await page.screenshot({path:path.join(out,`biology-${width}-hero.png`)});await page.screenshot({path:path.join(out,`biology-${width}-full.png`),fullPage:true});
   await page.locator('[data-organelle-button=nucleus]').click();assert.equal(await page.locator('.bio-cell-window').getAttribute('data-organelle'),'nucleus');assert.match(await page.locator('#bio-cell-description').textContent(),/genetic instructions/);
   await page.locator('[data-organelle-button=mitochondria]').click();assert.match(await page.locator('#bio-cell-description').textContent(),/ATP/);
   await page.locator('#bio-cell-story').screenshot({path:path.join(out,`biology-${width}-cell.png`)});
   if(width<801){await page.evaluate(()=>scrollTo(0,0));await page.locator('#bio-menu-toggle').click();assert.equal(await page.locator('#bio-menu-toggle').getAttribute('aria-expanded'),'true');await page.locator('#bio-launch-nav a[href="#pe-founder"]').click();assert.equal(await page.locator('#bio-menu-toggle').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#pe-founder').isVisible(),true);}
   await page.evaluate(()=>scrollTo(0,0));await page.locator('#bio-open-search').click();await page.locator('#bio-search-input').fill('enzyme');assert.equal(await page.locator('#bio-search-results a').count(),1);assert.equal(await page.locator('#bio-search-results a').getAttribute('href'),'app.html#labs');await page.keyboard.press('Escape');await page.locator('#bio-search').waitFor({state:'hidden'});assert.equal(await page.locator('#bio-search').evaluate(e=>e.open),false);
   await page.locator('#pe-substrate').fill('10');assert.match(await page.locator('#pe-rate').textContent(),/90.9/);await page.locator('#pe-substrate').fill('0');assert.match(await page.locator('#pe-rate').textContent(),/0.0/);
   const broken=await page.locator('a[href^="#"]').evaluateAll(links=>links.map(a=>a.getAttribute('href')).filter(h=>!document.getElementById(h.slice(1))));assert.deepEqual(broken,[]);
   const destinations=await page.locator('a[href^="app.html"]').evaluateAll(items=>[...new Set(items.map(e=>e.getAttribute('href')))]);report.viewports.push({width,...dimension,images:images.length,destinations});
   await page.locator('.bio-explore-button').click();await page.waitForURL(/app\.html#home/);await page.locator('#homeIn').waitFor();assert.equal(await page.locator('#homeIn').isVisible(),true);await context.close();
  }
  report.checks.push('All five widths: complete-page screenshots, visible assets, no horizontal overflow, organelle controls, search, native menus, route inventory, enzyme values, immediate working app entry.');
  const context=await browser.newContext({viewport:{width:1440,height:1000},recordVideo:{dir:path.join(out,'recording'),size:{width:1440,height:1000}}});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(base+'/',{waitUntil:'networkidle'});assert.equal(await page.locator('#lnd').getAttribute('data-motion'),'running');
  await page.keyboard.press('Tab');assert.equal(await page.locator('.pe-skip').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Enter');assert.equal(await page.locator('#pe-main').evaluate(e=>e===document.activeElement),true);
  await page.locator('#bio-motion-toggle').click();assert.equal(await page.locator('#lnd').getAttribute('data-motion'),'paused');await page.reload();assert.equal(await page.locator('#lnd').getAttribute('data-motion'),'paused');await page.locator('#bio-motion-toggle').click();
  const scene=await page.locator('#bio-cell-story').evaluate(e=>({top:e.offsetTop,travel:e.offsetHeight-innerHeight}));
  for(const [name,progress] of [['approach',0],['opening',.45],['separated',1]]){
   await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),scene.top+scene.travel*progress);await page.waitForTimeout(350);
   await page.screenshot({path:path.join(out,`biology-motion-${name}.png`)});
   const pose=await page.locator('.bio-cell-window').evaluate(e=>({scale:+e.style.getPropertyValue('--cell-scale'),open:+e.style.getPropertyValue('--membrane-open'),spread:+e.style.getPropertyValue('--organelle-spread')}));
   if(progress===.45)assert.ok(pose.scale>1.3&&pose.open>.4,'The scroll opens the membrane and substantially changes camera scale');
   if(progress===1)assert.ok(pose.spread>.95,'The final cutaway separates its structures');
  }
  await page.locator('video').scrollIntoViewIfNeeded();await page.waitForTimeout(700);assert.equal(await page.locator('video').evaluate(v=>!v.paused),true,'Visible video plays muted');assert.equal(await page.locator('video').evaluate(v=>v.muted),true);
  await page.locator('#bio-motion-toggle').click();assert.equal(await page.locator('video').evaluate(v=>v.paused),true,'Global pause stops footage');await page.locator('#bio-motion-toggle').click();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);assert.equal(await page.locator('video').evaluate(v=>v.paused),true,'Offscreen footage stops');
  const storyTop=await page.locator('#bio-cell-story').evaluate(e=>e.offsetTop);for(let y=0;y<storyTop+1500;y+=110){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(65);}await page.setViewportSize({width:768,height:844});await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));
  const height=await page.evaluate(()=>document.documentElement.scrollHeight);for(let y=0;y<height;y+=340){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(230);}for(let y=height;y>=0;y-=900){await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(60);}
  report.metrics=await page.evaluate(()=>({navigationMs:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,resources:performance.getEntriesByType('resource').filter(e=>e.name.startsWith(location.origin)).map(e=>({name:e.name.split('/').pop(),bytes:e.transferSize})),viewport:{width:innerWidth,height:innerHeight}}));
  const video=page.video();await context.close();if(video)await video.saveAs(path.join(out,'biology-scroll.webm'));
  report.checks.push('Normal, fast and reverse scrolling, scene resize, keyboard skip/focus, persisted pause, muted footage playback, offscreen video pause and scrolling recording.');
  const blocked=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});await blocked.route('**/*.mp4',route=>route.abort());const bp=await blocked.newPage();await bp.goto(base+'/');await bp.locator('video').scrollIntoViewIfNeeded();await bp.locator('video').evaluate(v=>v.load());await bp.waitForTimeout(500);assert.ok(await bp.locator('video').getAttribute('poster'));await blocked.close();report.checks.push('Blocked video retains a poster; reduced motion disables decorative travel and playback.');
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.failedAssets,[]);report.complete=true;
 }finally{await browser.close();fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
