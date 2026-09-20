/* A bounded regression for exact concept previews and resumed learning routes. */
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {createRequire}=require('node:module');
const {chromium}=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules','app-resume-browser.cjs'))('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3015';

async function checkResume(browser,url=base){
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const frame=page.frameLocator('#viewFrame');
 try{
  await page.goto(url+'/app.html#home',{waitUntil:'domcontentloaded'});
  const fresh=page.locator('.cc-art .bp-media img');
  await fresh.waitFor();
  assert.match(await fresh.getAttribute('src'),/lesson-diffusion\.webp$/);
  assert.equal(await page.locator('.cc-hero [data-go]').getAttribute('data-sub'),'diffusion');
  for(const [id,mode,title]of[['enzymes','advanced','Enzymes'],['photosynthesis','visual','Photosynthesis']]){
   for(const section of['learn','reason','solve']){
    const sub=(section==='learn'?'topic/':'learn/')+id+'/'+mode;
    await page.goto(url+'/app.html#'+section+'/'+sub,{waitUntil:'domcontentloaded'});
    await frame.locator(section==='learn'?'#bl-topic-title':'#bioPractice h1').waitFor();
    await page.locator('.side .navi[data-go="home"]').click();
    const hero=page.locator('.cc-hero'),svg=hero.locator('.cc-art .bp-media svg');
    await svg.waitFor();
    assert.equal(await hero.locator('.cc-art').getAttribute('data-preview-mounted'),'topic-'+id,section+' correct preview identity');
    assert.match(await svg.getAttribute('aria-label'),new RegExp(title));
    assert.equal(await hero.locator('h2').textContent(),title,'Home names the resumed concept');
    assert.equal(await hero.locator('[data-go]').getAttribute('data-go'),section);
    assert.equal(await hero.locator('[data-go]').getAttribute('data-sub'),sub);
    const duplicateIds=await page.evaluate(()=>{
     const ids=[...document.querySelectorAll('svg [id]')].map(e=>e.id);
     return ids.filter((id,index)=>ids.indexOf(id)!==index);
    });
    assert.deepEqual(duplicateIds,[],'SVG marker and definition IDs must be unique');
    await page.reload({waitUntil:'domcontentloaded'});await svg.waitFor();
    assert.equal(await hero.locator('h2').textContent(),title,'Home reload names the resumed concept');
    assert.equal(await hero.locator('[data-go]').getAttribute('data-sub'),sub,'Home reload retains the full route');
    await hero.locator('[data-go]').click();
    await page.waitForURL('**/app.html#'+section+'/'+sub);
    await frame.locator(section==='learn'?'#bl-topic-title':'#bioPractice h1').waitFor();
   }
  }
  // Changing a lens inside the iframe must update the resumed context as well.
  await page.goto(url+'/app.html#learn/topic/enzymes/advanced',{waitUntil:'domcontentloaded'});
  await frame.locator('#bl-topic-title').waitFor();
  await frame.locator('[role="tab"]').filter({hasText:'Visual'}).click();
  await page.waitForURL('**/app.html#learn/topic/enzymes/visual');
  await page.locator('.side .navi[data-go="home"]').click();
  assert.equal(await page.locator('.cc-hero [data-go]').getAttribute('data-sub'),'topic/enzymes/visual');
  await page.setViewportSize({width:390,height:844});
  for(const sub of['','/topic/enzymes/advanced','/topic/photosynthesis/visual']){
   await page.goto(url+'/app.html#learn'+sub,{waitUntil:'domcontentloaded'});
   const title=frame.locator(sub?'#bl-topic-title':'.bl-library-title');await title.waitFor();
   const bounds=await title.boundingBox(),bar=await page.locator('.topbar').boundingBox();
   assert(bounds&&bar&&bounds.y>=bar.y+bar.height-1,'Learn title stays below the app header: '+sub+' '+JSON.stringify({bounds,bar}));
   assert(bounds.y<844&&bounds.y+bounds.height<844,'Learn title is fully visible on entry');
  }
  fs.mkdirSync(path.resolve(__dirname,'../docs/library'),{recursive:true});
  await page.screenshot({path:path.resolve(__dirname,'../docs/library/app-learn-entry-mobile.png'),fullPage:false});
  assert.deepEqual(errors,[]);
  return 'Fresh Home and six exact Learn/Reason/Solve resumes show the correct concept, preserve modes through reload/navigation, use unique SVG IDs, and keep mobile Learn titles below the header.';
 }finally{await context.close();}
}
module.exports={checkResume};
if(require.main===module)(async()=>{const browser=await chromium.launch({headless:true});try{console.log('PASS: '+await checkResume(browser));}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
