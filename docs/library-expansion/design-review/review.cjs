const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('C:/Users/darsh/biology-entelloq/node_modules/playwright');
const output = __dirname;
const report = {complete:false,errors:[],views:[],controls:[]};
(async()=>{
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>report.errors.push(e.message));
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:width<500?844:1000});
      for(const theme of ['dark','light']){
        await page.goto('http://127.0.0.1:3027/learn.html#library',{waitUntil:'domcontentloaded'});
        await page.locator('#bl-search').waitFor();
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
        await page.waitForTimeout(400);
        await page.evaluate(()=>scrollTo(0,0));
        report.views.push(await page.evaluate(({width,theme})=>({width,theme,page:'index',scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,search:document.querySelector('#bl-search').getBoundingClientRect().toJSON(),pathsOpen:document.querySelector('.bl-paths').open,hero:document.querySelector('.bl-intro').getBoundingClientRect().toJSON(),searchFont:getComputedStyle(document.querySelector('#bl-search')).fontSize}),{width,theme}));
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' '+theme+' index overflow');
        if(width<500){
          assert.equal(await page.locator('.bl-paths').evaluate(el=>el.open),false);
          assert.equal(await page.locator('#bl-search').evaluate(el=>getComputedStyle(el).fontSize),'16px');
          assert(await page.locator('#bl-search').evaluate(el=>el.getBoundingClientRect().bottom<innerHeight),'Search input must fit first phone viewport');
        }
        await page.screenshot({path:path.join(output,`index-${width}-${theme}.png`)});
        await page.locator('.bl-paths-heading').click();
        if(await page.locator('.bl-paths').evaluate(el=>!el.open))await page.locator('.bl-paths-heading').click();
        assert.equal(await page.locator('[data-learning-path]').count(),3);
        const p=page.locator('[data-learning-path]').first();
        await p.locator('summary').click();
        await p.locator('a').first().focus();
        assert.equal(await p.locator('a').first().evaluate(el=>el===document.activeElement),true);
        await page.locator('#bl-curriculum').selectOption('neet');
        assert(await page.locator('.bl-topicrow').count()>0);
        await page.locator('.bl-topicrow').first().scrollIntoViewIfNeeded();
        assert(await page.locator('.bl-card-summary').first().isVisible());
        await page.screenshot({path:path.join(output,`catalog-${width}-${theme}.png`)});
        await page.goto('http://127.0.0.1:3027/learn.html#topic/nephron/scientific',{waitUntil:'domcontentloaded'});
        await page.locator('#bl-topic-title').waitFor();
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
        await page.waitForTimeout(400);
        assert.match(await page.locator('#bl-topic-title').innerText(),/Nephron/);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' '+theme+' topic overflow');
        assert(await page.locator('.bl-mode[aria-selected="true"]').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.parentElement.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1;}),'Active lens is fully visible after direct navigation');
        const hash=await page.evaluate(()=>location.hash);
        await page.screenshot({path:path.join(output,`lesson-${width}-${theme}.png`)});
        for(const id of ['bl-visual','bd-title','bl-check-title','bl-terms-title']){
          await page.locator(`[data-lesson-section="${id}"]`).click();
          assert.equal(await page.evaluate(()=>location.hash),hash,'jump preserves route');
          assert.equal(await page.locator('#'+id).evaluate(el=>el===document.activeElement),true,'jump moves focus');
          const where=await page.locator('#'+id).evaluate(el=>({top:el.getBoundingClientRect().top,bar:document.querySelector('.bl-modes').getBoundingClientRect().bottom}));
          assert(where.top>=where.bar-1,'jump clears sticky modes: '+id+' '+JSON.stringify(where));
        }
        assert.equal(await page.locator('.bl-terms').evaluate(el=>el.open),true);
        assert.equal(await page.locator('#bl-terms-title').getAttribute('tabindex'),null,'native summary stays in tab order');
        await page.screenshot({path:path.join(output,`terms-${width}-${theme}.png`)});
        await page.locator('[data-lesson-section="bd-title"]').click();
        await page.locator('.bd-table-wrap').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.join(output,`evidence-${width}-${theme}.png`)});
        const controls=await page.locator('.bl-lesson-nav button,.bl-modes button,.bl-subnav a,.bl-ai button,.bd-study button').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({text:el.textContent.trim(),height:el.getBoundingClientRect().height})));
        assert(controls.every(c=>c.height>=43.9),'Small tap target: '+JSON.stringify(controls.filter(c=>c.height<43.9)));
        report.controls.push({width,theme,count:controls.length,min:Math.min(...controls.map(c=>c.height))});
      }
    }
    assert.deepEqual(report.errors,[]);report.complete=true;
  }finally{await browser.close();fs.writeFileSync(path.join(output,'review.json'),JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
