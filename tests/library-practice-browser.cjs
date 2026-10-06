/* Run against built pages: BIOLOGY_PREVIEW_URL=http://127.0.0.1:3014 */
const assert=require('node:assert/strict');
const path=require('node:path');
const {createRequire}=require('node:module');
const {chromium}=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules','practice-browser.cjs'))('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3014';

(async()=>{
 const browser=await chromium.launch({headless:true});
 const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1360,height:960},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/solve.html?instant=1#learn/photosynthesis/visual');
  await page.locator('#bioPractice h1').waitFor();
  assert.equal(await page.locator('#bioPractice h1').textContent(),'Photosynthesis');
  assert.equal(await page.locator('#svRoot').isVisible(),false);
  assert.equal(await page.locator('#launch').isVisible(),false,'A topic continuation bypasses the entry cinematic');
  assert.equal(await page.locator('.tp-dot').count(),3);
  const catalog=await page.evaluate(()=>BIO_LIBRARY.topics.map(t=>({id:t.id,title:t.title})));
  for(const topic of catalog){
   await page.evaluate(id=>{location.hash='#learn/'+id+'/advanced';},topic.id);
   await page.waitForFunction(title=>document.querySelector('#bioPractice h1')?.textContent===title,topic.title);
   assert.equal(await page.locator('.tp-dot').count(),3,topic.id);
  }
  await page.evaluate(()=>{location.hash='#learn/photosynthesis/visual';});
  await page.waitForFunction(()=>document.querySelector('#bioPractice h1')?.textContent==='Photosynthesis');
  const correct=await page.evaluate(()=>BioPractice.questionsFor(BIO_LIBRARY.topics.find(t=>t.id==='photosynthesis'))[0].answer);
  await page.locator('input[name=tpAnswer]').nth(correct).check();
  await page.locator('.tp-submit').click();
  assert.match(await page.locator('.tp-feedback').textContent(),/That’s right/);
  await page.reload();
  await page.locator('.tp-feedback').waitFor();
  assert.match(await page.locator('.tp-progress').textContent(),/1 \/ 3 checked/);
  // Existing Solve statistics and its bank remain separate from topic checkpoints.
  assert.equal(await page.evaluate(()=>localStorage.getItem('bioq_solve_history')),null);
  await page.locator('.tp-path>a').click();
  await page.waitForURL('**/learn.html#topic/photosynthesis/visual');
  await page.goBack();
  await page.locator('.tp-feedback').waitFor();
  await page.locator('.tp-retry').click();
  assert.equal(await page.locator('input[name=tpAnswer]:checked').count(),0);
  assert.equal(await page.locator('.tp-submit').isDisabled(),true);
  await page.locator('input[name=tpAnswer]').nth(correct).check();
  await page.locator('.tp-submit').click();
  for(let i=1;i<3;i++){
   await page.locator('.tp-next').click();
   await page.locator('input[name=tpAnswer]').nth(0).check();
   await page.locator('.tp-submit').click();
  }
  assert.equal(await page.locator('.tp-complete').count(),1);
  await page.locator('.tp-complete a').click();
  await page.waitForURL('**/reason.html#learn/photosynthesis/visual');
  await page.locator('#tpDraft').waitFor();
  assert.equal(await page.locator('.tp-reveal').isDisabled(),true);
  const draft='The change affects electron transport, so ATP and NADPH production can limit carbon fixation.';
  await page.locator('#tpDraft').fill(draft);
  await page.locator('.tp-reveal').click();
  assert.equal(await page.locator('.tp-chain li').count(),1);
  await page.reload();
  await page.locator('#tpDraft').waitFor();
  assert.equal(await page.locator('#tpDraft').inputValue(),draft);
  assert.equal(await page.locator('.tp-chain li').count(),1);
  while(await page.locator('.tp-reveal').count()) await page.locator('.tp-reveal').click();
  await page.locator('#tpReflection').fill('I should identify the immediate light-reaction products before discussing sugar production.');
  await page.reload();
  await page.locator('#tpReflection').waitFor();
  assert.match(await page.locator('#tpReflection').inputValue(),/light-reaction/);
  assert.match(await page.locator('.tp-note').first().textContent(),/not automatically graded/);
  // Both page links preserve the Learn mode; the learner can move repeatedly.
  await page.locator('.tp-path a').filter({hasText:'Solve'}).click();
  await page.waitForURL('**/solve.html#learn/photosynthesis/visual');
  await page.locator('.tp-complete').waitFor();
  await page.locator('.tp-path a').filter({hasText:'Reason'}).click();
  await page.waitForURL('**/reason.html#learn/photosynthesis/visual');
  await page.locator('#tpReflection').waitFor();
  assert.equal(await page.locator('#tpDraft').inputValue(),draft);
  for(const width of [320,390,768,1360]){
   await page.setViewportSize({width,height:960});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Reason overflow at '+width);
  }
  await page.locator('.tp-footer a').filter({hasText:'All reasoning'}).click();
  await page.locator('.rz-workout').first().waitFor();
  assert.equal(await page.locator('.rz-workout').count(),3);
  assert.equal(await page.locator('.rz-workout .tp-case-preview svg').count(),3);
  assert.equal(await page.locator('.rz-workout .bp-media img').count(),0);
  assert.equal(new Set(await page.locator('.rz-workout .tp-case-preview').evaluateAll(nodes=>nodes.map(n=>n.innerHTML))).size,3);
  for(const [caseId,topic] of [['altitude','gas-exchange'],['resistance','natural-selection'],['glucose','homeostasis']]){
   await page.locator('.rz-workout[href="#'+caseId+'"]').click();
   await page.locator('.tp-case-visual svg').waitFor();
   assert.match(await page.locator('.tp-case-visual a').getAttribute('href'),new RegExp('topic/'+topic+'/visual$'));
   await page.locator('.rz-back').click();
   await page.locator('.rz-workout').first().waitFor();
  }
  assert.equal(await page.locator('#bioPractice').isVisible(),false);
  await page.locator('#tpTopic').selectOption('mitochondria');
  await page.locator('#bioPracticeCatalog button').click();
  await page.waitForURL('**#learn/mitochondria/visual');
  await page.locator('#tpDraft').waitFor();
  assert.equal(await page.locator('#tpDraft').inputValue(),'');

  const app=await context.newPage();app.on('pageerror',e=>errors.push(e.message));
  await app.goto(base+'/app.html#learn/topic/photosynthesis/visual');
  const frame=app.frameLocator('#viewFrame');
  await frame.locator('[data-practice="solve"]').first().click();
  await app.waitForURL('**/app.html#solve/learn/photosynthesis/visual');
  await frame.locator('#bioPractice h1').waitFor();
  await frame.locator('.tp-path a').filter({hasText:'Reason'}).click();
  await app.waitForURL('**/app.html#reason/learn/photosynthesis/visual');
  await frame.locator('#tpDraft').waitFor();
  assert.equal(await frame.locator('#tpDraft').inputValue(),draft);
  await app.reload();
  await frame.locator('#tpDraft').waitFor();
  assert.equal(await frame.locator('#tpDraft').inputValue(),draft);
  await frame.locator('.tp-path>a').click();
  await app.waitForURL('**/app.html#learn/topic/photosynthesis/visual');
  await frame.locator('[data-practice="solve"]').first().waitFor();

  const denied=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await denied.addInitScript(()=>{Storage.prototype.getItem=function(){throw Error('blocked');};Storage.prototype.setItem=function(){throw Error('blocked');};});
  const restricted=await denied.newPage();restricted.on('pageerror',e=>errors.push(e.message));
  await restricted.goto(base+'/solve.html?instant=1#learn/enzymes/intuition');
  await restricted.locator('#bioPractice h1').waitFor();
  await restricted.locator('input[name=tpAnswer]').first().check();
  await restricted.locator('.tp-submit').click();
  assert.equal(await restricted.locator('.tp-save').textContent(),'Kept for this visit only');
  await restricted.locator('.tp-next').click();
  await restricted.locator('.tp-dot').first().click();
  await restricted.locator('.tp-feedback').waitFor();
  assert(await restricted.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Solve mobile overflow');
  assert.deepEqual(errors,[]);
  console.log('PASS: '+catalog.length+' topic Solve routes, three-question feedback/retry, standalone and embedded Learn ↔ Reason ↔ Solve returns/reloads, persisted drafts/reflections, original Reason catalog, restricted storage and mobile layout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
