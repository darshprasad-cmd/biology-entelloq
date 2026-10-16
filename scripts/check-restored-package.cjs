'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules';
const {chromium}=createRequire(path.join(modules,'__restored_package.cjs'))('playwright');
const url=process.env.BIOLOGY_RELEASE_URL||'http://127.0.0.1:3039/dist/index.html';
const live=url.startsWith('https:'),out=path.resolve(__dirname,'../docs/launch-restoration',live?'live':'package');fs.mkdirSync(out,{recursive:true});
const report={url,complete:false,checks:[],errors:[],metrics:[]};
async function shell(page){await page.locator('#bioq-workspace').waitFor();return (await page.locator('#bioq-workspace').elementHandle()).contentFrame();}
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width<800?844:1000},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});let frame=await shell(page);await frame.locator('#bio-title').waitFor();await page.locator('#bioq-loading').waitFor({state:'hidden'});
  await frame.waitForFunction(()=>document.querySelector('.bio-hero-image').complete&&document.querySelector('.bio-hero-image').naturalWidth>0);
  assert.match(await frame.locator('#bio-title').textContent(),/Where Biology/);assert.equal(await frame.locator('.bio-teaser').count(),4);assert.equal(await frame.locator('#bio-cell-story').count(),0);
  assert.ok(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(width<800){assert.equal(await frame.locator('#eqx-fab').evaluate(e=>Math.round(e.getBoundingClientRect().width)),44);await frame.locator('#eqx-fab').click();assert.equal(await frame.locator('#eqx-panel').evaluate(e=>e.classList.contains('eqx-open')),true);await frame.locator('#eqx-close').click();}
  await page.screenshot({path:path.join(out,`biology-restored-${width}.png`)});
  await frame.locator('#bio-open-search').click();await frame.locator('#bio-search-input').fill('enzyme');assert.equal(await frame.locator('#bio-search-results a').count(),1);await page.keyboard.press('Escape');await frame.locator('#bio-search').waitFor({state:'hidden'});
  await frame.locator('.pe-founder').scrollIntoViewIfNeeded();await frame.waitForFunction(()=>document.querySelector('.pe-founder img').complete&&document.querySelector('.pe-founder img').naturalWidth>0);assert.equal(await frame.locator('.pe-founder img').evaluate(e=>getComputedStyle(e).filter),'none');await page.screenshot({path:path.join(out,`founder-color-${width}.png`)});
  await frame.locator('.bio-watch').click();await page.waitForURL(/#landing\/pe-experiment$/);assert.equal(await frame.locator('#pe-substrate').isVisible(),true);
  await frame.locator('.bio-explore-button').click();await page.waitForURL(/#home$/);frame=await shell(page);await frame.locator('#homeIn .cc-world').first().waitFor();
  await frame.locator('#homeIn .cc-world[data-go="learn"]').click();await page.waitForURL(/#learn$/);const reading=await (await frame.locator('#viewFrame').elementHandle()).contentFrame();await reading.locator('#bl-search').waitFor();assert.equal(await frame.locator('#skel').count(),1);await frame.locator('#skel').waitFor({state:'hidden'});assert.equal(await frame.locator('#oops').evaluate(e=>e.classList.contains('on')),false);
  report.metrics.push({width,domContentLoadedMs:await page.evaluate(()=>Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd))});
  report.checks.push(`${width}: packaged original hero, four teasers, no overflow, first-Escape search close, full-color founder, fragment route, Home entry, Learn ready without overlay.`);await context.close();
 }
 assert.deepEqual(report.errors,[]);report.complete=true;
}finally{await browser.close();fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
