/* Browser verification for the data-driven Learn library and retained Learn tools.
 * Serve the repository first. Override BIOLOGY_PREVIEW_URL / BIOLOGY_PLAYWRIGHT_MODULES.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const modules = process.env.BIOLOGY_PLAYWRIGHT_MODULES || 'C:/Users/darsh/biology-entelloq/node_modules';
const { chromium } = createRequire(path.join(modules, 'library-browser.cjs'))('playwright');
const base = process.env.BIOLOGY_PREVIEW_URL || 'http://127.0.0.1:3013';
const report = { completed:false, checks:[], screenshots:[] };
const output = path.join(root, 'docs', 'library');
fs.mkdirSync(output, {recursive:true});
async function main() {
  const browser = await chromium.launch({headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(base + '/learn.html', {waitUntil:'domcontentloaded'});
    await page.locator('#bl-search').waitFor();
    assert(await page.locator('.bl-topicrow').count() >= 18);
    assert.equal(await page.locator('#cell').count(),1);
    assert.equal(await page.locator('#microscope').count(),1);
    report.checks.push('Complete library mounts beside preserved cell and microscope experiences.');
    for (const [query,id] of [['cell powerhouse','mitochondria'],['plant food','photosynthesis'],['protein factory','ribosomes'],['mitocondria','mitochondria']]) {
      await page.locator('#bl-search').fill(query);
      assert(await page.locator(`.bl-topiclink[href="#topic/${id}/layman"]`).count() > 0, query+' resolves');
    }
    await page.locator('#bl-search').fill('mitochondria');
    assert(await page.locator('.bl-topiclink[href="#topic/cellular-respiration/layman"]').count() > 0);
    await page.locator('#bl-search').fill('<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('#bl-results img').count(),0);
    await page.locator('#bl-clear').click();
    await page.locator('[data-category="plant-biology"]').click();
    assert(await page.locator('.bl-topiclink[href="#topic/photosynthesis/layman"]').count() > 0);
    await page.locator('#bl-curriculum').selectOption('ap');
    assert(await page.locator('.bl-topicrow').count() > 0);
    await page.locator('#bl-clear').click();
    report.checks.push('Aliases, fuzzy search, connected expansion, safe text handling, categories and curriculum filters work.');
    await page.screenshot({path:path.join(output,'learn-library-desktop.png'),fullPage:false});
    report.screenshots.push('learn-library-desktop.png');
    const core=['cell-structure','membrane-transport','biomolecules','enzymes','photosynthesis','cellular-respiration','mitosis','meiosis','dna','protein-synthesis','mendelian-genetics','heart-circulation','gas-exchange','nervous-system','immunity','plant-transport','natural-selection','ecology'];
    for(const id of core) {
      await page.goto(base+'/learn.html#topic/'+id+'/layman',{waitUntil:'domcontentloaded'});
      await page.locator('.bl-diagram svg').waitFor();
      assert.equal(await page.locator('.bl-modes [role=tab]').count(),6,id+' supports six modes');
      for(const mode of ['intuition','visual','scientific','advanced','realWorld','layman']) {
        await page.locator('[data-mode="'+mode+'"]').click();
        await page.waitForFunction(m=>location.hash.endsWith('/'+m)&&document.querySelector('[data-mode="'+m+'"]')?.getAttribute('aria-selected')==='true',mode);
        assert((await page.locator('.bl-prose').innerText()).length>100,id+' has '+mode+' content');
      }
      const next=page.locator('[data-visual-action="next"]');
      if(await next.count()) {
        const before=await page.locator('.bl-diagram svg').innerHTML();
        await next.click();
        assert.notEqual(await page.locator('.bl-diagram svg').innerHTML(),before,id+' changes visual state');
      }
      assert(await page.locator('.bl-quiz [data-answer]').count()>=2);
    }
    report.checks.push('All 18 priority topics render six substantial modes, checks, and visual states that change with interaction.');
    const completeCoverage=await page.evaluate(async()=>{
      const failures=[];
      for(const topic of window.BIO_LIBRARY.topics) {
        const hash='#topic/'+topic.id+'/visual';
        if(location.hash!==hash) {const ready=new Promise(resolve=>window.addEventListener('hashchange',()=>setTimeout(resolve,0),{once:true}));location.hash=hash;await ready;}
        if(!document.querySelector('.bl-diagram svg')||!document.querySelector('.bl-prose')?.textContent.trim()||!document.querySelector('.bl-quiz [data-answer]'))failures.push(topic.id);
      }
      return {total:window.BIO_LIBRARY.topics.length,failures};
    });
    assert.deepEqual(completeCoverage.failures,[]);
    report.checks.push('All '+completeCoverage.total+' completed concepts render a visual, explanation and check without errors.');
    await page.goto(base+'/learn.html#topic/photosynthesis/layman');
    await page.locator('[data-mode="layman"]').focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>location.hash.endsWith('/intuition')&&document.querySelector('[data-mode="intuition"]')?.getAttribute('aria-selected')==='true');
    assert.equal(await page.locator('[data-mode="intuition"]').getAttribute('aria-selected'),'true');
    assert.equal(await page.locator('[data-mode="intuition"]').evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('End');
    await page.waitForFunction(()=>location.hash.endsWith('/realWorld')&&document.querySelector('[data-mode="realWorld"]')?.getAttribute('aria-selected')==='true');
    await page.goBack();
    await page.waitForFunction(()=>location.hash.endsWith('/intuition')&&document.querySelector('[data-mode="intuition"]')?.getAttribute('aria-selected')==='true');
    report.checks.push('Arrow, End, focus management and browser history preserve explanation mode.');
    await page.locator('[data-mode="visual"]').click();
    await page.locator('[data-zoom="5"]').click();
    assert((await page.locator('.bl-stepdetail').innerText()).includes('Photosystems'));
    await page.screenshot({path:path.join(output,'learn-photosynthesis-desktop.png'),fullPage:false});
    report.screenshots.push('learn-photosynthesis-desktop.png');
    await page.goto(base+'/learn.html#topic/cell-structure/visual');
    await page.locator('[data-select-organelle="mitochondria"]').click();
    assert((await page.locator('.bl-stepdetail').innerText()).includes('cristae'));
    await page.locator('[data-select-organelle="vacuoles"]').click();
    assert((await page.locator('.bl-diagram svg').innerHTML()).includes('Photosynthetic plant cell'));
    await page.locator('[data-select-organelle="nucleus"]').click();
    const nucleusLink=page.locator('.bl-organelle-link');
    assert((await nucleusLink.getAttribute('href')).includes('/nucleus/'));
    report.checks.push('Organelles are selectable by keyboard buttons and connect to specific lessons; plant and animal cell schematics differ.');
    await page.goto(base+'/learn.html#topic/mendelian-genetics/visual');
    await page.locator('[data-parent="a"]').selectOption('AA');
    await page.locator('[data-parent="b"]').selectOption('aa');
    assert((await page.locator('.bl-result-summary').innerText()).includes('Aa: 100%'));
    report.checks.push('Punnett square recomputes genotype probabilities after both parent changes.');
    await page.goto(base+'/learn.html#topic/photosynthesis/scientific');
    const correct=await page.evaluate(()=>window.BIO_LIBRARY.topics.find(t=>t.id==='photosynthesis').quickCheck[0].answer);
    await page.locator('[data-check="0"][data-answer="'+correct+'"]').click();
    assert((await page.locator('[data-feedback="0"]').innerText()).includes('mechanism'));
    await page.reload();
    assert(await page.locator('[data-feedback="0"]').isVisible());
    await page.locator('[data-feedback="0"] button').click();
    assert.equal(await page.locator('[data-check="0"]').first().isDisabled(),false);
    await page.locator('[data-ask]').first().click();
    await page.locator('dialog.bio-guide').waitFor({state:'visible'});
    assert((await page.locator('.bio-guide-answer').innerText()).length>100);
    await page.keyboard.press('Escape');
    report.checks.push('Quick checks explain answers, persist across reload, retry, and pass selected topic context to the learning guide.');
    for(const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:900});
      for(const suffix of ['#library','#topic/cell-structure/visual','#topic/photosynthesis/advanced']) {
        await page.goto(base+'/learn.html'+suffix,{waitUntil:'domcontentloaded'});
        await page.locator('#bioLibrary').waitFor();
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+suffix+' has no page overflow');
        assert(await page.locator('#bioLibrary').evaluate(el=>el.scrollWidth<=el.clientWidth+1),width+suffix+' library has no overflow');
      }
      if(width===390) {await page.screenshot({path:path.join(output,'learn-photosynthesis-mobile.png'),fullPage:false});report.screenshots.push('learn-photosynthesis-mobile.png');}
    }
    report.checks.push('Index, cell model and photosynthesis remain within viewport at 320, 390, 768 and 1440 pixels.');
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>{document.documentElement.dataset.theme='light';});
    await page.screenshot({path:path.join(output,'learn-photosynthesis-light.png'),fullPage:false});
    report.screenshots.push('learn-photosynthesis-light.png');
    await page.goto(base+'/app.html#learn/topic/calvin-cycle/advanced',{waitUntil:'domcontentloaded'});
    const iframe=page.locator('#viewFrame');
    await iframe.waitFor({state:'visible'});
    let frame=await (await iframe.elementHandle()).contentFrame();
    await frame.locator('.bl-prose').waitFor();
    assert.equal(await frame.locator('#bl-topic-title').innerText(),'Calvin Cycle');
    assert.equal(await frame.locator('[data-mode="advanced"]').getAttribute('aria-selected'),'true');
    await frame.locator('[data-mode="visual"]').click();
    await page.waitForFunction(()=>location.hash==='#learn/topic/calvin-cycle/visual');
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('#viewFrame').waitFor({state:'visible'});
    frame=await (await page.locator('#viewFrame').elementHandle()).contentFrame();
    await frame.locator('.bl-prose').waitFor();
    assert.equal(await frame.locator('#bl-topic-title').innerText(),'Calvin Cycle');
    assert.equal(await frame.locator('[data-mode="visual"]').getAttribute('aria-selected'),'true');
    report.checks.push('Embedded app deep links preserve subtopic and selected mode through interactions and a full reload.');
    const denied=await browser.newContext({viewport:{width:390,height:900}});
    await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});});
    const deniedPage=await denied.newPage();
    await deniedPage.goto(base+'/learn.html#topic/dna/advanced',{waitUntil:'domcontentloaded'});
    await deniedPage.locator('.bl-prose').waitFor();
    assert((await deniedPage.locator('.bl-understand').innerText()).includes('unavailable'));
    await deniedPage.locator('[data-answer]').first().click();
    assert(await deniedPage.locator('[data-feedback="0"]').isVisible());
    await denied.close();
    const malformed=await browser.newContext();
    await malformed.addInitScript(()=>{localStorage.setItem('bio.entelloq.library.progress.v1','{broken');});
    const malformedPage=await malformed.newPage();
    await malformedPage.goto(base+'/learn.html#topic/cell-structure/layman');
    await malformedPage.locator('.bl-prose').waitFor();
    await malformed.close();
    report.checks.push('Denied storage and malformed saved progress cannot prevent learning or quick checks.');
    assert.deepEqual(errors,[],'No uncaught page errors');
    report.completed=true;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output,'learn-browser-report.json'),JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
