/* Real Me cards, with labelled test fixtures only; this does not validate mastery. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
async function checkProgressCards(page,section,{width,theme}={}){
 const viewport=await section.evaluate(()=>innerWidth);
 const geometry=await section.locator('#masterySlot .topic').evaluateAll(elements=>elements.map(el=>{const meta=el.querySelector('.meta'),status=el.lastElementChild,rect=el.getBoundingClientRect(),mr=meta.getBoundingClientRect(),sr=status.getBoundingClientRect();return {title:meta.querySelector('b').textContent,display:getComputedStyle(el).display,topic:{x:rect.x,right:rect.right,width:rect.width},meta:{x:mr.x,right:mr.right,y:mr.y,bottom:mr.bottom,width:mr.width,scroll:meta.scrollWidth,client:meta.clientWidth},status:{x:sr.x,right:sr.right,y:sr.y,bottom:sr.bottom,width:sr.width,scroll:status.scrollWidth,client:status.clientWidth}}}));
 assert.equal(geometry.length,8,'All original topic cards remain');
 for(const row of geometry){
  assert(row.meta.width>=140,`${width}/${theme}: reading column too narrow ${JSON.stringify(row)}`);
  assert(row.meta.scroll<=row.meta.client+1,`Text does not clip: ${JSON.stringify(row)}`);
  assert(row.status.scroll<=row.status.client+1,`Status does not clip: ${JSON.stringify(row)}`);
  assert(row.status.right<=row.topic.right+1&&row.meta.right<=row.topic.right+1,'Cards contain text and status');
  if(viewport<=850){assert.equal(row.display,'grid');assert(row.status.y>=row.meta.bottom+10,'Status appears below, not beside, the reading column');}
  else{assert.equal(row.display,'flex','Desktop retains the original horizontal row');assert(row.status.x>=row.meta.right-1);}
 }
 assert(await section.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No document overflow');
 return {width,theme,viewport,geometry};
}
async function checkProgressReadability(browser,base,options={}){
 const entry=options.entry||'/app.html',output=options.output;
 const rows=[],errors=[];
 for(const width of options.widths||[320,390,768,1440])for(const theme of options.themes||['dark','light'])for(const state of options.states||['empty','practice-fixture']){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const history=state==='empty'?[]:[{topic:'Mixed',per:{'Human Physiology':{m:3,x:5},'Molecular Biology':{m:7,x:10}},at:1761600000000}];
  const fixture={'bioq_solve_history':JSON.stringify(history),'bioq_solve_mistakes':'[]','bioq.lab-notebook.v1.microscope':JSON.stringify({hypothesis:'Keep this local note unchanged.',observations:'An authored test fixture, not student evidence.',trials:[]})};
  try{
   await context.addInitScript(({theme,fixture})=>{try{localStorage.setItem('bioq_theme',theme);for(const [key,value] of Object.entries(fixture))if(localStorage.getItem(key)===null)localStorage.setItem(key,value);}catch(_){}},{theme,fixture});
   await context.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+entry+'#me',{waitUntil:'domcontentloaded',timeout:120000});
   const skip=page.getByRole('button',{name:'Skip for now',exact:true});if(await skip.isVisible())await skip.click();
   let section;for(let attempt=0;attempt<200&&!section;attempt++){for(const frame of page.frames())if(await frame.locator('#masterySlot .topic').count()){section=frame;break;}if(!section)await page.waitForTimeout(50);}
   assert(section,'Me progress view rendered');await section.locator('#masterySlot .topic').first().waitFor();
   assert.equal(await section.locator('#masterySlot .topic').count(),8);
   assert.equal(await section.locator('#masterySlot .notyet').count(),state==='empty'?8:6);
   assert.equal(await section.locator('#masterySlot .ring-wrap').count(),state==='empty'?0:2);
   assert.equal(await section.evaluate(()=>document.documentElement.dataset.theme),theme);
   if(state!=='empty')assert.deepEqual(await section.locator('#masterySlot .ring-wrap .pct').allTextContents(),['60%','70%']);
   const {geometry}=await checkProgressCards(page,section,{width,theme});
   // A preview is labelled and reversible and must not become student activity.
   const toggle=section.locator('#previewToggle');await toggle.focus();await toggle.press('Enter');await section.locator('#previewExit').waitFor();
   await section.locator('#previewExit').focus();await section.locator('#previewExit').press('Enter');await section.locator('#previewExit').waitFor({state:'detached'});
   assert.equal(await section.locator('#masterySlot .notyet').count(),state==='empty'?8:6);
   assert.deepEqual(await section.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(fixture)),fixture,'Opening/previewing progress never changes stored answers or notes');
   if(output){fs.mkdirSync(output,{recursive:true});await section.locator('#masterySlot').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`me-${width}-${theme}-${state}.png`)});}
   rows.push({width,theme,state,geometry});
  }finally{await context.close();}
 }
 assert.deepEqual(errors,[]);const report={checks:rows.length,states:'Empty and synthetic saved practice; not a mastery validation',rows,errors};if(output)fs.writeFileSync(path.join(output,'progress-report.json'),JSON.stringify(report,null,2)+'\n');return report;
}
module.exports={checkProgressCards,checkProgressReadability};
