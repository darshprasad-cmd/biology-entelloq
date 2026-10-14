/* Bounded source-surface checks; packaged routes are covered by the release suite. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const {chromium}=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(__dirname,'../../biology-entelloq/node_modules'),'__reality_interior.cjs'))('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/reality-opened'),base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3039';
const report={complete:false,viewports:[],errors:[],performance:null,limitations:'Local Chromium synthetic timing only; no physical phone, screen-reader speech or real-user Core Web Vitals.'};
function luminance(rgb){return rgb.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);}
function contrast(a,b){let x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
async function audit(scope){return scope.evaluate(()=>{const style=getComputedStyle(document.documentElement),bg=document.querySelector('#bio-app-backdrop');return {width:innerWidth,scroll:document.documentElement.scrollWidth,bg:style.getPropertyValue('--bg').trim(),accent:style.getPropertyValue('--cy').trim(),display:style.getPropertyValue('--display').trim(),animation:bg?getComputedStyle(bg,'::before').animationName:null,filter:document.querySelector('.topbar')?getComputedStyle(document.querySelector('.topbar')).backdropFilter:null};});}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:1600,height:1000},reducedMotion:'no-preference'}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(base+'/app.html#home',{waitUntil:'domcontentloaded'});await page.locator('#homeIn .cc-world').first().waitFor();await page.waitForTimeout(300);
 const session=await context.newCDPSession(page);await session.send('Performance.enable');const metrics=async()=>Object.fromEntries((await session.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));const before=await metrics();await page.waitForTimeout(1500);const after=await metrics();report.performance={idleWindowMs:1500,mainThreadTaskMs:Math.round((after.TaskDuration-before.TaskDuration)*1000),scriptMs:Math.round((after.ScriptDuration-before.ScriptDuration)*1000),note:'Study backdrop has no RAF, CSS animation, or blur. Timing is observational, not a performance gate.'};
 for(const width of [1600,768,390,360]){
  await page.setViewportSize({width,height:width<800?844:1000});
  for(const theme of ['dark','light']){
   await page.evaluate(value=>{document.documentElement.dataset.theme=value;localStorage.setItem('bioq_theme',value);},theme);
   const state=await audit(page);assert.ok(state.scroll<=state.width+1);assert.equal(state.bg,theme==='dark'?'#080b0d':'#f4f1e9');assert.equal(state.animation,'none');assert.equal(state.filter,'none');assert.ok(state.display.startsWith("'Inter'"));
   const ink=theme==='dark'?[244,241,233]:[20,38,27],dim=theme==='dark'?[182,195,186]:[71,94,76],panel=theme==='dark'?[18,26,22]:[255,254,248];assert.ok(contrast(ink,panel)>=4.5);assert.ok(contrast(dim,panel)>=4.5);
   report.viewports.push({width,theme,...state,textContrast:+contrast(ink,panel).toFixed(2),secondaryContrast:+contrast(dim,panel).toFixed(2)});
   if([1600,390].includes(width))await page.screenshot({path:path.join(out,`biology-interior-${width}-${theme}.png`)});
   if(width===1600&&theme==='dark')await page.screenshot({path:path.join(out,'biology-current-app-1600.png')});
  }
 }
 await page.setViewportSize({width:1440,height:1000});await page.locator('#themeBtn').click();await page.locator('#nav [data-go="learn"]').click();await page.locator('#viewFrame.on').waitFor();const child=await(await page.locator('#viewFrame').elementHandle()).contentFrame();await child.locator('#bl-search').waitFor();const state=await audit(child);assert.ok(state.scroll<=state.width+1);assert.equal(state.bg,'#080b0d');await page.screenshot({path:path.join(out,'biology-interior-learn.png')});
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);const mobile=await audit(child);assert.ok(mobile.scroll<=mobile.width+1);await page.screenshot({path:path.join(out,'biology-interior-learn-mobile.png')});
 assert.deepEqual(report.errors,[]);report.complete=true;await context.close();
}finally{await browser.close();fs.writeFileSync(path.join(out,'interior-report.json'),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));})().catch(e=>{console.error(e);process.exitCode=1;});
