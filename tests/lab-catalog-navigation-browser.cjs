/* Shared real-DOM assertions for a Labs Page/Frame, including portable nesting.
 * Caller owns browser/navigation; capture(name) is optional. */
'use strict';
const assert=require('node:assert/strict');
async function checkLabCatalogNavigation(page,world,{capture=async()=>{},theme='dark'}={}){
 const search=world.locator('#lab-search'),heading=world.locator('#lab-results-title'),count=world.locator('#lab-count');
 await search.waitFor();
 // Use the real Appearance owner so an embedded reading document and its
 // backdrop do not end up in contradictory themes during visual verification.
 const parent=world.parentFrame?.();
 const owner=parent&&await parent.locator('#themeBtn').count()?parent:world;
 if(await owner.locator('html').getAttribute('data-theme')!==theme){
  if(await owner.locator('#themeBtn').isVisible())await owner.locator('#themeBtn').click();
  else{await owner.locator('#exploreBtn').click();await owner.locator('#exploreTheme').click();await owner.locator('#exploreClose').click();}
 }
 await owner.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);
 await world.waitForFunction(theme=>document.documentElement.dataset.theme===theme,theme);
 const marker='bioq.lab-navigation.browser.unrelated';
 const previous=await world.evaluate(key=>{const old=localStorage.getItem(key);localStorage.setItem(key,'preserved notebook draft');return old;},marker);
 const initialHash=await world.evaluate(()=>(window.BioqLocation||location).hash);
 const handles=await Promise.all([search.elementHandle(),heading.elementHandle(),count.elementHandle()]);
 const focused=async(selector,label)=>assert.equal(await world.locator(selector).evaluate(e=>e===document.activeElement),true,label);
 const stable=async()=>{for(const [i,id]of ['lab-search','lab-results-title','lab-count'].entries())assert.equal(await handles[i].evaluate((e,id)=>e.isConnected&&e===document.getElementById(id),id),true,'Persistent '+id);assert.equal(await world.evaluate(()=>(window.BioqLocation||location).hash),initialHash,'Filtering must not navigate');};
 const visible=async(selector)=>assert.equal(await world.locator(selector).evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=-1&&r.bottom<=innerHeight+1;}),true,selector+' is in view');
 try{
  assert.equal(await heading.getAttribute('aria-describedby'),'lab-count');assert.equal(await count.getAttribute('aria-atomic'),'true');
  assert.equal(await world.locator('#lab-show-results').getAttribute('type'),'submit');
  await search.fill('photosynthesis');await focused('#lab-search','Typing keeps focus');await stable();
  assert.equal(await world.locator('#lab-cards>a').count(),2);
  await search.press('Enter');await focused('#lab-results-title','Native Enter focuses results');await visible('#lab-results-title');await stable();
  await page.keyboard.press('Tab');await focused('[data-lab-id="photosynthesis-rate"]','Next Tab reaches first result');
  await world.locator('#lab-show-results').click();await focused('#lab-results-title','Explicit submit focuses results');
  assert.ok((await world.locator('#lab-show-results').boundingBox()).height>=44,'Results button remains touch-sized');
  await world.locator('#lab-category').selectOption('Plant Biology');await world.locator('#lab-difficulty').selectOption('school');await world.locator('#lab-duration').selectOption('20');await world.locator('#lab-type').selectOption('simulation');
  await stable();assert.equal(await world.locator('#lab-cards>a').count(),1);assert.match(await count.textContent(),/Plant Biology · school · up to 20 min · simulation/);
  await search.fill('no-match-zyzyzyzy');await focused('#lab-search','Zero results retain input focus');await stable();assert.equal(await world.locator('#lab-cards>a').count(),0);
  await search.press('Enter');await focused('#lab-results-title','Empty results have the same target');await page.keyboard.press('Tab');await focused('#lab-clear','Recovery is the next control');await page.keyboard.press('Enter');await focused('#lab-search','Reset restores search focus');await stable();
  for(const id of ['lab-search','lab-category','lab-difficulty','lab-duration','lab-type'])assert.equal(await world.locator('#'+id).inputValue(),'','Reset '+id);
  assert.equal(await world.locator('#lab-cards>a').count(),23);
  await search.fill('photosynthesis');await world.locator('#lab-type').selectOption('simulation');await search.press('Enter');
  await capture('results');
  await world.locator('[data-lab-id="photosynthesis-rate"]').click();await world.locator('#lab-hypothesis').waitFor();
  assert.equal(await world.locator('.lb-hd h1').evaluate(e=>e===document.activeElement),true,'Bench title remains focused');
  await world.getByRole('link',{name:'All labs',exact:true}).focus();await page.keyboard.press('Enter');await search.waitFor();
  await focused('[data-lab-id="photosynthesis-rate"]','All labs restores outgoing card');await visible('[data-lab-id="photosynthesis-rate"]');
  assert.equal(await search.inputValue(),'photosynthesis');assert.equal(await world.locator('#lab-type').inputValue(),'simulation');
  await capture('return');
  // A deep-linked bench may not belong to the current filtered results.
  await world.evaluate(()=>{(window.BioqLocation||location).hash='osmosis';});await world.locator('#lab-hypothesis').waitFor();await world.getByRole('link',{name:'All labs',exact:true}).click();await search.waitFor();
  await focused('#lab-results-title','Excluded previous card falls back to results');assert.equal(await search.inputValue(),'photosynthesis');
  await world.evaluate(()=>{(window.BioqLocation||location).hash='not-a-real-bench';});await world.getByText('That bench could not be found. Choose an investigation below.',{exact:true}).waitFor();await focused('#lab-results-title','Invalid route has a useful focus target');
  assert.equal(await world.evaluate(key=>localStorage.getItem(key),marker),'preserved notebook draft');
  assert.equal(await world.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'No horizontal page overflow');
  // Leave a usable catalogue for callers continuing other workflow checks.
  await world.evaluate(hash=>{(window.BioqLocation||location).hash=hash;},initialHash);await search.waitFor();await search.fill('no-match-zyzyzyzy');await world.locator('#lab-clear').click();
  return 'Native/explicit submit; persistent result nodes; focus-safe filters; complete empty reset; card return/fallback; invalid-route recovery; route/storage preservation; visible touch target; no horizontal overflow.';
 }finally{
  await world.evaluate(({marker,previous})=>{if(previous===null)localStorage.removeItem(marker);else localStorage.setItem(marker,previous);},{marker,previous});
  await Promise.all(handles.map(h=>h.dispose()));
 }
}
module.exports={checkLabCatalogNavigation};
