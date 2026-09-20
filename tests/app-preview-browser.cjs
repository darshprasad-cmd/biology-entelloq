/* Real app-shell browser checks. Images are decoded after scrolling into view,
 * including inside the app iframe and touch chooser; no standalone embed pages.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules','app-preview-browser.cjs'))('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3015';
const output=path.resolve(__dirname,'../docs/library');
fs.mkdirSync(output,{recursive:true});
const report={completed:false,checks:[],screenshots:[],pageErrors:[],missingAssets:[]};

async function decoded(locator,expected,label){
 await locator.first().waitFor({state:'attached'});
 const count=await locator.count();
 if(expected!==null)assert.equal(count,expected,label+' image count');else assert(count>0,label+' needs a preview');
 for(let i=0;i<count;i++){
  const image=locator.nth(i);await image.scrollIntoViewIfNeeded();
  await image.evaluate(async element=>{if(!element.complete||!element.naturalWidth)await element.decode();});
  const dimensions=await image.evaluate(element=>({complete:element.complete,width:element.naturalWidth,height:element.naturalHeight}));
  assert(dimensions.complete&&dimensions.width>0&&dimensions.height>0,label+' image '+i+' decoded');
 }
 report.checks.push(label+': '+count+' decoded previews.');
}
function monitor(page){
 page.on('pageerror',error=>report.pageErrors.push(error.message));
 page.on('response',response=>{if(response.url().startsWith(base+'/')&&response.status()>=400)report.missingAssets.push({url:response.url(),status:response.status()});});
 page.on('requestfailed',request=>{if(request.url().startsWith(base+'/assets/')&&!/ABORTED/.test(request.failure()?.errorText||''))report.missingAssets.push({url:request.url(),error:request.failure()?.errorText});});
}
async function noOverflow(page,frame,label){
 const outer=await page.evaluate(()=>({viewport:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 assert(outer.html<=outer.viewport+1&&outer.body<=outer.viewport+1,label+' app overflow: '+JSON.stringify(outer));
 if(frame){
  const inner=await frame.locator('body').evaluate(body=>({viewport:innerWidth,html:document.documentElement.scrollWidth,body:body.scrollWidth}));
  assert(inner.html<=inner.viewport+1&&inner.body<=inner.viewport+1,label+' iframe overflow: '+JSON.stringify(inner));
 }
}
async function main(){
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();monitor(page);
  const frame=page.frameLocator('#viewFrame');
  async function open(section,ready){
   await page.goto(base+'/app.html#'+section,{waitUntil:'domcontentloaded'});
   if(ready)await frame.locator(ready).first().waitFor();
  }
  await open('home');
  await decoded(page.locator('#homeIn .cc-world .bp-media img'),8,'Home directory');
  await decoded(page.locator('#homeIn .cc-node .bp-media img'),8,'Biology map');
  await page.locator('.side [data-go="learn"]').hover();
  await page.locator('#bio-nav-preview:not([hidden])').waitFor();
  await decoded(page.locator('#bio-nav-preview img'),1,'Sidebar pointer preview');
  assert.match(await page.locator('#bio-nav-preview strong').textContent(),/Learn/);
  await page.mouse.move(700,80);
  assert.equal(await page.locator('#bio-nav-preview').isVisible(),false);
  await page.locator('.side [data-go="learn"]').focus();
  await page.keyboard.press('Tab');
  await page.locator('#bio-nav-preview:not([hidden])').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#bio-nav-preview').isVisible(),false);
  report.checks.push('Sidebar previews support pointer and keyboard focus, and close on Escape.');
  await page.evaluate(()=>document.activeElement?.blur());
  await page.locator('#homeIn .cc-head').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'app-preview-desktop.png'),fullPage:false});
  report.screenshots.push('app-preview-desktop.png');
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:1000});await noOverflow(page,null,'Home '+width);
  }
  const sections=[
   ['lessons','.les-card','.les-card .bp-media img',9],
   ['labs','.lc-card','.lc-preview img',23],
   ['solve','#svConfigCard','.sv-opt[data-group="topic"] .bp-media img',9],
   ['me','#recSlot .card','#recSlot .card .bp-media img',null],
   ['explore','#sysList .sys-btn',null,null],
   ['reason','.rz-workout',null,null],
   ['learn','.bl-topicrow',null,null],
   ['about','main',null,null]
  ];
  for(const [section,ready,images,count] of sections){
   await open(section,ready);
   if(images)await decoded(frame.locator(images),count,section+' catalog');
   if(section==='solve')await decoded(frame.locator('.sv-opt[data-group="mode"] .bp-media img'),3,'Solve modes');
   if(section==='explore'){
    assert.equal(await frame.locator('#sysList .br-reference-thumb svg').count(),10,'Atlas preview count');
    assert.equal(await frame.locator('#tlTrack .br-reference-thumb svg').count(),12,'Timeline preview count');
    assert.equal(new Set(await frame.locator('#sysList .br-reference-thumb svg').evaluateAll(nodes=>nodes.map(n=>n.innerHTML))).size,10,'Atlas previews should be distinct');
    assert.equal(new Set(await frame.locator('#tlTrack .br-reference-thumb svg').evaluateAll(nodes=>nodes.map(n=>n.innerHTML))).size,12,'Timeline previews should be distinct');
    for(const type of ['atlas','timeline']){
     const buttons=frame.locator(type==='atlas'?'#sysList .sys-btn':'#tlTrack .tl-ev');
     const detail=frame.locator(type==='atlas'?'#atlasDetail':'#tlDetail');
     for(let index=0;index<await buttons.count();index++){
      await buttons.nth(index).click();
      await detail.locator('.br-reference-figure[data-reference-index="'+index+'"] svg').waitFor();
     }
    }
    report.checks.push('All 10 atlas systems and 12 timeline milestones show distinct previews and matching selectable diagrams.');
   }
   for(const width of [320,390,768,1440]){
    await page.setViewportSize({width,height:1000});
    await noOverflow(page,frame,section+' '+width);
   }
   console.log('Checked '+section+' previews and responsive app frame.');
  }
  report.checks.push('Home and all eight app sections stay within both shell and iframe width at 320, 390, 768 and 1440 pixels.');
  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const touch=await touchContext.newPage();monitor(touch);
  await touch.goto(base+'/app.html#home');
  await touch.locator('#homeIn .cc-world').first().waitFor();
  await touch.locator('#exploreBtn').tap();
  await touch.locator('#bq-explore[open]').waitFor();
  assert.equal(await touch.locator('#learningPaths .tile:not([hidden])').count(),8);
  await decoded(touch.locator('#learningPaths .tile .bp-media img'),8,'Touch path chooser');
  const chooserOverflow=await touch.locator('#bq-explore').evaluate(element=>element.scrollWidth>element.clientWidth+1);
  assert.equal(chooserOverflow,false,'Touch chooser horizontal overflow');
  await touch.locator('#exploreClose').tap();
  assert.equal(await touch.locator('#bq-explore').isVisible(),false);
  await touch.locator('#homeIn .cc-head').scrollIntoViewIfNeeded();
  await touch.screenshot({path:path.join(output,'app-preview-mobile.png'),fullPage:false});
  report.screenshots.push('app-preview-mobile.png');
  await touch.locator('#homeIn .cc-world[data-go="lessons"]').tap();
  const touchFrame=touch.frameLocator('#viewFrame');
  await decoded(touchFrame.locator('.les-card .bp-media img'),9,'Touch Lessons inside app');
  await touchFrame.locator('.les-listhead').scrollIntoViewIfNeeded();
  await noOverflow(touch,touchFrame,'Touch Lessons');
  assert.equal(await touchFrame.locator('body').evaluate(body=>getComputedStyle(body).backgroundColor),'rgba(0, 0, 0, 0)','Embedded page should show app backdrop');
  assert.equal(await touch.locator('#bio-app-backdrop').count(),1,'Shell retains the shared photographic backdrop');
  await touch.screenshot({path:path.join(output,'app-lessons-mobile.png'),fullPage:false});
  report.screenshots.push('app-lessons-mobile.png');
  report.checks.push(await require('./app-resume-browser.cjs').checkResume(browser,base));
  assert.deepEqual(report.pageErrors,[],'No browser page errors');
  assert.deepEqual(report.missingAssets,[],'No missing local assets');
  report.completed=true;
  console.log('PASS: '+report.checks.join('\n'));
 }finally{
  fs.writeFileSync(path.join(output,'app-preview-browser-report.json'),JSON.stringify(report,null,2)+'\n');
  await browser.close();
 }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
