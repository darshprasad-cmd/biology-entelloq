/* Exercise the actual shell search without changing routes or opening services. */
'use strict';
const assert=require('node:assert/strict');
async function checkAppSearch(page,shell){
 const trigger=shell.locator('#topSearch'),dialog=shell.locator('#cmdk'),input=shell.locator('#cmdkInput'),close=shell.locator('#cmdkClose');
 const marker='bioq.polish.search.browser.unrelated';
 const prior=await shell.evaluate(key=>{const old=localStorage.getItem(key);localStorage.setItem(key,'Keep this local draft');return old;},marker);
 const before={url:page.url(),hash:await shell.evaluate(()=>location.hash),storage:await shell.evaluate(()=>Object.fromEntries(['bioq_solve_history','bioq_solve_mistakes','bioq.lab-notebook.v1.microscope'].map(key=>[key,localStorage.getItem(key)])))};
 const focus=async(locator,message)=>assert.equal(await locator.evaluate(el=>el===document.activeElement),true,message);
 const stable=async()=>{assert.equal(page.url(),before.url,'Search does not rewrite the outer route');assert.equal(await shell.evaluate(()=>location.hash),before.hash,'Search does not rewrite the shell route');assert.deepEqual(await shell.evaluate(keys=>Object.fromEntries(keys.map(key=>[key,localStorage.getItem(key)])),Object.keys(before.storage)),before.storage,'Search preserves practice history and notes');};
 try{
  await trigger.waitFor({state:'visible'});
  assert.equal(await trigger.getAttribute('aria-label'),'Search Biology Entelloq');
  assert.equal(await trigger.getAttribute('aria-haspopup'),'dialog');assert.equal(await trigger.getAttribute('aria-controls'),'cmdk');
  const dimensions=await trigger.evaluate(el=>{const r=el.getBoundingClientRect(),bar=el.closest('.topbar').getBoundingClientRect(),explore=document.getElementById('exploreBtn').getBoundingClientRect();return {width:r.width,height:r.height,x:r.x,right:r.right,y:r.y,bottom:r.bottom,viewport:innerWidth,bar:{y:bar.y,bottom:bar.bottom},explore:{x:explore.x,right:explore.right}};});
  assert(dimensions.width>=44&&dimensions.height>=44,'Search is at least44px in both dimensions');assert(dimensions.x>=0&&dimensions.right<=dimensions.viewport+1,'Search stays inside the viewport');assert(dimensions.y>=dimensions.bar.y&&dimensions.bottom<=dimensions.bar.bottom+1,'Search stays inside its header');assert(dimensions.x>=dimensions.explore.right-1||dimensions.right<=dimensions.explore.x+1,'Search does not overlap Explore');
  await trigger.focus();await page.keyboard.press('Enter');await dialog.waitFor({state:'visible'});await focus(input,'Opening search focuses its input');
  assert.equal(await input.getAttribute('aria-expanded'),'true');assert.equal(await close.getAttribute('aria-label'),'Close search');assert.equal((await close.innerText()).trim(),'Close','Phones get a close action rather than an Escape-key instruction');
  const initialCount=await shell.locator('#cmdkList [role=option]').count();assert(initialCount>5);
  await input.fill('osmosis');assert(await shell.locator('#cmdkList [role=option]').count()>0);await focus(input,'Typing retains focus');
  const selected=await input.getAttribute('aria-activedescendant');assert(selected);assert.equal(await shell.locator('#'+selected).getAttribute('aria-selected'),'true');
  await input.press('ArrowDown');const next=await input.getAttribute('aria-activedescendant');assert(next);assert.equal(await shell.locator('#'+next).getAttribute('aria-selected'),'true');await input.press('ArrowUp');assert.equal(await input.getAttribute('aria-activedescendant'),selected);
  await input.press('Tab');await focus(close,'Tab reaches close');await close.press('Tab');await focus(input,'Tab wraps inside search');await input.press('Shift+Tab');await focus(close,'Shift+Tab stays in search');await close.press('Shift+Tab');await focus(input,'Reverse Tab returns to input');
  const markup='<img src=x onerror="throw 123">';await input.fill(markup);assert.equal(await shell.locator('#cmdkList img').count(),0);assert.equal(await shell.locator('#cmdkList [role=option]').count(),0);assert((await shell.locator('.cmdk-empty').innerText()).includes(markup));assert.equal(await input.getAttribute('aria-activedescendant'),null);assert.match(await shell.locator('#cmdkCount').innerText(),/^0 results$/);
  await input.press('Enter');await dialog.waitFor({state:'visible'});await stable();
  await input.fill('');assert.equal(await shell.locator('#cmdkList [role=option]').count(),initialCount,'Clearing recovers the full search list');
  await input.press('Escape');await dialog.waitFor({state:'hidden'});await focus(trigger,'Escape restores the visible trigger');assert.equal(await input.getAttribute('aria-expanded'),'false');
  await page.keyboard.press('Control+k');await dialog.waitFor({state:'visible'});await focus(input,'Ctrl K opens search');assert.equal(await dialog.evaluate(el=>el.classList.contains('keyboard-open')),true,'Keyboard opening uses the instant path');await page.keyboard.press('Control+k');await dialog.waitFor({state:'hidden'});await focus(trigger,'Ctrl K toggles closed and restores focus');
  await trigger.click();await dialog.waitFor({state:'visible'});await close.click();await dialog.waitFor({state:'hidden'});await focus(trigger,'Visible Close restores the exact trigger');
  await stable();assert.equal(await shell.evaluate(key=>localStorage.getItem(key),marker),'Keep this local draft');
  return {dimensions,checks:'Visible44px search; accessible close; escaped empty recovery; native input and arrows; forward/reverse focus trap; Escape/Ctrl K; exact trigger and unchanged route/history/notebook.'};
 }finally{
  if(await dialog.isVisible())await close.click();
  await shell.evaluate(({marker,prior})=>{if(prior===null)localStorage.removeItem(marker);else localStorage.setItem(marker,prior);},{marker,prior});
 }
}
module.exports={checkAppSearch};
