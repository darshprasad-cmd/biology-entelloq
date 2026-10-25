/* Host chrome, recovery and keyboard checks. Real tools run unmodified. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),portable=process.argv.includes('--portable');
const modules=process.env.CODEX_NODE_MODULES||process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(modules,'playwright'));
const evidence=path.join(root,'docs/host-quality');fs.mkdirSync(evidence,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.vtt':'text/vtt','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':data);});});
let browser;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,entry=portable?'/dist/index.html':'/app.html';
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',route=>{const url=route.request().url().split('#')[0];return (portable?url===base+entry:url.startsWith(base+'/'))?route.continue():route.abort();});
 const page=await context.newPage(),checks=[],errors=[],measurements=[],fontChecks=[];page.setDefaultTimeout(30000);page.on('pageerror',error=>errors.push(error.message));
 async function host(name){for(let n=0;n<300;n++){for(const frame of page.frames()){if(await frame.evaluate(name=>Boolean(window.BiologyLearningTools)&&(window.BioqContext?.page||location.pathname).endsWith(name+'.html'),name).catch(()=>false))return frame;}await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Missing host '+name);}
 async function start(name='learn') {await page.goto(base+entry+'#'+name,{waitUntil:'domcontentloaded'});const skip=page.getByRole('button',{name:'Skip for now',exact:true});if(await skip.isVisible())await skip.click();const section=await host(name);await section.locator('.bql-cards').waitFor();return section;}
 async function tool(section){await section.locator('[data-state="ready"]').waitFor({state:'attached'});return (await section.locator('.bql-frame').elementHandle()).contentFrame();}
 function passed(name){checks.push(name);console.log('PASS '+name);}
 try{
  let section=await start();
  await section.getByRole('button',{name:'Animated explanations',exact:true}).focus();await page.keyboard.press('Enter');let film=await tool(section);
  await film.waitForFunction(()=>{const image=document.getElementById('lesson-poster');return image?.complete&&image.naturalWidth===1280&&image.naturalHeight===720;},null,{timeout:5000}).catch(async error=>{
   console.error('Poster diagnostics',await film.evaluate(()=>{const image=document.getElementById('lesson-poster');return {src:image.src,attribute:image.getAttribute('src'),currentSrc:image.currentSrc,complete:image.complete,naturalWidth:image.naturalWidth,context:window.BioqContext?.url.href,base:document.baseURI,resource:window.BioqPackage?.resource('media/biology-poster.png',window.BioqContext?.url.href)};}));throw error;
  });
  assert.equal(await section.locator('[data-frame]').getAttribute('aria-busy'),'false');
  assert.equal(await section.evaluate(()=>document.activeElement?.id),'bql-workspace-title');
  assert.match(await section.locator('[data-hint]').innerText(),/authored.*captions/i);
  assert.equal(await section.locator('.bql-status').evaluate(el=>el.getBoundingClientRect().height),1);
  passed('Keyboard opens the real tool with a focused heading, clear boundary and no redundant ready banner');
  await section.locator('.bql-context summary').click();assert.match(await section.locator('[data-note]').innerText(),/not live simulations/);await section.locator('.bql-context summary').click();
  await section.locator('[data-guide]').click();const guide=await (await section.locator('.bql-guide iframe').elementHandle()).contentFrame();await guide.getByRole('heading',{name:'Learning tools: sources and boundaries'}).waitFor();
  await section.getByRole('button',{name:'Close sources',exact:true}).click();await section.locator('.bql-guide').waitFor({state:'detached'});assert.equal(await section.evaluate(()=>document.activeElement?.hasAttribute('data-guide')),true);
  passed('Complete scientific context remains available and Sources returns focus to its trigger');
  for(const viewport of [{width:1440,height:1000},{width:768,height:1024},{width:390,height:844}]){
   await page.setViewportSize(viewport);await section.evaluate(()=>{document.querySelector('.bql-entry').scrollIntoView({block:'start'});dispatchEvent(new Event('resize'));});
   await page.waitForTimeout(100);
   const dimensions=await section.locator('.bql-frame').evaluate(el=>{const rect=el.getBoundingClientRect();return {top:rect.top,height:rect.height,width:rect.width,viewport:innerHeight,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth};});
   measurements.push({outerViewport:viewport,...dimensions});assert(dimensions.top<190,JSON.stringify(dimensions));assert(dimensions.height>=320);assert(dimensions.height<=dimensions.viewport);assert(dimensions.scrollWidth<=dimensions.viewportWidth+2);
   if(viewport.width===390){
    const controls=await section.locator('.bql-toolbar button').evaluateAll(buttons=>buttons.map(button=>{const rect=button.getBoundingClientRect();return {name:button.textContent,width:rect.width,height:rect.height};}));
    assert(controls.every(button=>button.width>=44&&button.height>=44),JSON.stringify(controls));
    assert.equal(await section.locator('#bql-workspace-title').evaluate(el=>getComputedStyle(el).fontSize),'17px');
    const toolBounds=await section.locator('.bql-frame').boundingBox(),floating=await section.parentFrame().locator('#eqx-fab,#bioq-ai-launch').all();let visibleControls=0;
    for(const control of floating){if(await control.isVisible()){visibleControls++;const rect=await control.boundingBox();assert(toolBounds.y+toolBounds.height<=rect.y-8,JSON.stringify({tool:toolBounds,control:rect}));}}
    assert.equal(visibleControls,2);
    const playBounds=await film.locator('#play-button').boundingBox();assert(playBounds.y+playBounds.height<=toolBounds.y+toolBounds.height-1,JSON.stringify({tool:toolBounds,play:playBounds}));
   }
   assert(await film.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   if(viewport.width!==768)await page.screenshot({path:path.join(evidence,(portable?'portable-':'source-')+(viewport.width===390?'mobile':'desktop')+'.png'),fullPage:true});
  }
  passed('Desktop, tablet and mobile preserve tool space without horizontal overflow or a fixed 620px minimum');
  const hostFont=await section.addStyleTag({content:'.bql-workspace,.bql-workspace button,.bql-toolbar h2{font-family:Arial,sans-serif!important}'});
  const filmFont=await film.addStyleTag({content:':root{font-family:Arial,sans-serif!important}'});
  await section.evaluate(()=>dispatchEvent(new Event('resize')));await page.waitForTimeout(100);
  const fallbackFrame=await section.locator('.bql-frame').boundingBox(),fallbackPlay=await film.locator('#play-button').boundingBox();
  const hint=await section.locator('[data-hint]').evaluate(el=>({height:el.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(el).lineHeight)}));
  const clearance=fallbackFrame.y+fallbackFrame.height-fallbackPlay.y-fallbackPlay.height;
  fontChecks.push({font:'Arial, sans-serif',frame:fallbackFrame,play:fallbackPlay,hint,clearance});
  assert(hint.height<=hint.lineHeight+1,JSON.stringify(hint));assert(clearance>=1,JSON.stringify(fontChecks));
  await hostFont.evaluate(el=>el.remove());await filmFont.evaluate(el=>el.remove());
  await section.evaluate(()=>dispatchEvent(new Event('resize')));
  passed('The mobile hint stays on one line and Play fits with fallback fonts');
  await film.locator('#still-alternative > summary').click();
  const stills=film.locator('#still-grid img');assert.equal(await stills.count(),4);
  for(let index=0;index<4;index++){
   await stills.nth(index).scrollIntoViewIfNeeded();
   await film.waitForFunction(index=>{const image=document.querySelectorAll('#still-grid img')[index];return image?.complete&&image.naturalWidth===1280&&image.naturalHeight===720;},index,{timeout:5000});
  }
  await film.locator('#still-alternative > summary').click();await film.evaluate(()=>scrollTo(0,0));
  passed('The poster and all four still alternatives decode locally at the authored dimensions');
  await page.setViewportSize({width:1440,height:1000});await section.parentFrame().locator('#themeBtn').click();
  await section.waitForFunction(()=>document.documentElement.dataset.theme==='light');await film.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  const colors=await section.evaluate(()=>{const style=getComputedStyle(document.documentElement);return {accent:style.getPropertyValue('--em').trim(),text:style.getPropertyValue('--ink').trim()};});
  assert.equal(await film.evaluate(()=>document.documentElement.style.getPropertyValue('--accent')),colors.accent);
  await page.setViewportSize({width:390,height:844});
  await film.locator('#play-button').focus();await page.keyboard.press('Escape');assert.equal(await section.locator('.bql-frame').count(),1);
  await page.keyboard.press('Alt+Escape');assert.equal(await section.locator('.bql-frame').count(),0);assert.equal(await section.evaluate(()=>document.activeElement?.dataset.learningOpen),'animations');
  passed('The real Appearance control updates host and tool colors; plain Escape stays local while Alt+Escape returns focus to the card');
  await section.getByRole('button',{name:'Concept search',exact:true}).click();await tool(section);await section.locator('[data-reload]').focus();await page.keyboard.press('Alt+Escape');assert.equal(await section.evaluate(()=>document.activeElement?.dataset.learningOpen),'search');
  passed('The return shortcut works from host controls as well as inside the child');
  await page.screenshot({path:path.join(evidence,(portable?'portable-':'source-')+'cards-mobile.png'),fullPage:true});
  section=await start('reason');await section.getByRole('button',{name:'Experiment notebook',exact:true}).click();await tool(section);assert.match(await section.locator('[data-hint]').innerText(),/Saved in this browser/);await section.locator('.bql-context summary').click();assert.match(await section.locator('[data-note]').innerText(),/not an online classroom/);passed('Notebook naming and visible sharing boundary accurately describe browser/file sharing');
  if(!portable){
   section=await start();let release;const held=new Promise(resolve=>{release=resolve;});
   const intercept=async route=>{await held;await route.fulfill({status:404,contentType:'text/html',body:'<!doctype html><p>Missing test module</p>'});};
   await page.route('**/assets/learning-tools/animations/index.html*',intercept);
   await section.getByRole('button',{name:'Animated explanations',exact:true}).click();assert.equal(await section.locator('[data-frame]').getAttribute('aria-busy'),'true');assert.match(await section.locator('.bql-status').innerText(),/Opening Animated/);
   release();await section.locator('.bql-status[data-state="error"]').waitFor();assert.equal(await section.locator('[data-frame]').getAttribute('aria-busy'),'false');assert.match(await section.locator('.bql-status').innerText(),/Try Reload/);
   await page.unroute('**/assets/learning-tools/animations/index.html*',intercept);await section.locator('[data-reload]').click();film=await tool(section);await film.locator('#animation-app').waitFor();
   passed('A deliberately delayed/missing module exposes busy then error state and Reload recovers the real tool');
  }
  assert.deepEqual(errors,[]);const report={portable,checks,measurements,fontChecks,errors};fs.writeFileSync(path.join(evidence,(portable?'portable':'source')+'-checks.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }catch(error){await page.screenshot({path:path.join(evidence,(portable?'portable':'source')+'-failure.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{await context.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server.listening)await new Promise(resolve=>server.close(resolve));});
