'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{createRequire}=require('node:module');
const {chromium}=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules','__reality_package.cjs'))('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/reality-opened'),base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3036';
const report={complete:false,artifact:'dist/index.html',sha256:createHash('sha256').update(fs.readFileSync(path.join(root,'dist/index.html'))).digest('hex'),checks:[],errors:[]};
async function inner(page){return (await page.locator('#bioq-workspace').elementHandle()).contentFrame();}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:1600,height:1000}});const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base+'/dist/index.html',{waitUntil:'domcontentloaded'});await page.locator('#bioq-workspace').waitFor();let frame=await inner(page);await frame.locator('#bio-title').waitFor();await page.locator('#bioq-loading').waitFor({state:'hidden'});
 await page.screenshot({path:path.join(out,'biology-final-desktop.png')});
 assert.equal(await frame.locator('#bio-motion-toggle').evaluate(e=>e.parentElement.id),'lnd');
 const story=await frame.locator('#bio-cell-story').evaluate(e=>({top:e.offsetTop,travel:e.offsetHeight-innerHeight}));
 for(const progress of [0,.18,.26,.45,1]){await frame.evaluate(y=>scrollTo({top:y,behavior:'instant'}),story.top+story.travel*progress);await page.waitForTimeout(180);const state=await frame.locator('.bio-cell-window').evaluate(e=>({photo:+e.style.getPropertyValue('--cell-observation-opacity'),diagram:+e.style.getPropertyValue('--cell-diagram-opacity')}));assert.ok(state.photo<.01||state.diagram<.01,'Photographic and diagram organelles do not overlap');}
 const pause=await frame.locator('#bio-motion-toggle').boundingBox();assert.ok(pause.y>=0&&pause.y+pause.height<=1000,'Pause remains visible outside the hero');await page.screenshot({path:path.join(out,'biology-final-cutaway.png')});
 await frame.locator('#bio-motion-toggle').click();assert.equal(await frame.locator('#lnd').getAttribute('data-motion'),'paused');
 await page.setViewportSize({width:390,height:844});await frame.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'biology-final-mobile.png')});
 const caption=await frame.locator('.bio-hero-caption').boundingBox(),control=await frame.locator('#bio-motion-toggle').boundingBox();assert.ok(caption.y+caption.height<control.y||caption.x+caption.width<control.x,'Scientific caption is clear of pause control');
 await frame.locator('#bio-menu-toggle').click();assert.equal(await frame.locator('[data-bioq-account] button').first().isVisible(),true,'Account remains available in mobile menu');await frame.locator('#bio-menu-toggle').click();
 await frame.locator('.bio-watch').click();await page.waitForURL(/#landing\/pe-experiment$/);assert.equal(await frame.locator('#pe-substrate').isVisible(),true);
 await frame.locator('.bio-explore-button').click();await page.waitForURL(/#home$/);frame=await inner(page);await frame.locator('#homeIn .cc-world').first().waitFor();await page.setViewportSize({width:1600,height:1000});await page.waitForTimeout(250);await page.screenshot({path:path.join(out,'biology-current-app-1600.png')});
 report.checks.push('Final generated artifact: desktop and mobile screenshots, sequential cell-to-diagram reveal without duplicate organelles, visible global pause, clear scientific caption, mobile account access, launch fragment route, immediate home entry and actual 1600px product screenshot.');
 assert.deepEqual(report.errors,[]);report.complete=true;await context.close();
}finally{await browser.close();fs.writeFileSync(path.join(out,'package-report.json'),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
