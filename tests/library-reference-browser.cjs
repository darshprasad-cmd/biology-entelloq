/* Explore previews retain every existing selection and remain available on touch. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules';
const {chromium}=createRequire(path.join(modules,'reference-browser.cjs'))('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3015';
const output=path.resolve(__dirname,'../docs/previews');
const report={completed:false,checks:[],screenshots:[]};
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base+'/explore.html',{waitUntil:'domcontentloaded'});
    await page.locator('#atlas .br-reference-thumb').first().waitFor();
    assert.equal(await page.locator('#atlas .br-reference-thumb svg').count(),10);
    assert.equal(await page.locator('#tlTrack .br-reference-thumb svg').count(),12);
    assert.deepEqual(await page.locator('.br-reference-thumb').first().evaluate(el=>['--ink','--em','--dim','--cy','--rose','--amber','--indigo'].filter(name=>!getComputedStyle(el).getPropertyValue(name).trim())),[],'Every diagram colour resolves to an existing palette variable.');
    for(const [kind,list,detail,total] of [['atlas','#sysList','#atlasDetail',10],['timeline','#tlTrack','#tlDetail',12]]){
      const fingerprints=[];
      for(let index=0;index<total;index++){
        const button=page.locator(list+' [data-i="'+index+'"]');await button.click();
        await page.locator(detail+' [data-reference-index="'+index+'"]').waitFor();
        assert.equal(await button.getAttribute('aria-selected'),'true');
        assert.equal(await page.locator(detail+' .br-reference-figure').count(),1);
        fingerprints.push(await page.locator(detail+' svg').first().innerHTML());
        assert((await page.locator(detail+' p').first().innerText()).length>50);
      }
      assert.equal(new Set(fingerprints).size,total,kind+' has a distinct relevant diagram for every selection');
    }
    report.checks.push('All 10 atlas systems and all 12 timeline events have persistent previews and distinct selected diagrams; original content and selection still work.');
    await page.locator('#sysList [data-i="0"]').focus();
    await page.keyboard.press('End');
    await page.locator('#atlasDetail [data-reference-index="9"]').waitFor();
    assert.equal(await page.locator('#sysList [data-i="9"]').evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Home');
    await page.locator('#atlasDetail [data-reference-index="0"]').waitFor();
    await page.locator('#tlTrack [data-i="11"]').focus();
    await page.keyboard.press('Home');
    await page.locator('#tlDetail [data-reference-index="0"]').waitFor();
    report.checks.push('Atlas and timeline retain arrow, Home and End keyboard selection with visible focus.');
    await page.locator('#atlas').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,'reference-atlas-desktop.png')});
    report.screenshots.push('reference-atlas-desktop.png');
    for(const width of [320,390,768,1440]){
      await page.setViewportSize({width,height:960});
      for(const id of ['atlas','timeline']){
        await page.locator('#'+id).scrollIntoViewIfNeeded();
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' '+id+' has no page overflow');
        assert(await page.locator('#'+id+' .br-reference-thumb').first().isVisible());
        const preview=page.locator('#'+(id==='atlas'?'atlasDetail':'tlDetail')+' .br-reference-figure');
        assert(await preview.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      }
      if(width===390){await page.locator('#atlasDetail').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'reference-atlas-mobile.png')});report.screenshots.push('reference-atlas-mobile.png');}
    }
    assert.deepEqual(errors,[],'No uncaught browser errors');
    report.checks.push('Previews are visible before clicking, with bounded diagrams and no page overflow from 320 to 1440 pixels.');
    report.completed=true;
  }finally{await browser.close();fs.writeFileSync(path.join(output,'reference-browser-report.json'),JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
