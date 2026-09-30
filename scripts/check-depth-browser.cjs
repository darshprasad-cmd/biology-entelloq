/* Local/production verification of the authored depth and cross-pillar notebook. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules','__depth_check.cjs'));
const {chromium}=runtime('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3026';
const output=path.resolve(process.env.BIOLOGY_DEPTH_OUTPUT||path.join(__dirname,'../docs/learning-depth'));fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],report={base,checks:[],errors};
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'/learn.html#topic/enzymes/advanced');
  await page.locator('[data-depth-topic="enzymes"]').waitFor();
  await page.locator('[data-open-depth]').click();
  assert.equal(await page.locator('#bd-title').evaluate(e=>e===document.activeElement),true);
  assert.ok(await page.locator('#bd-title').evaluate(el=>el.getBoundingClientRect().top>=document.querySelector('.bl-modes').getBoundingClientRect().bottom),'Depth heading clears the sticky mode tabs');
  const ids=await page.evaluate(()=>window.BIO_LIBRARY.topics.map(t=>t.id));
  for(const id of ids){
   await page.evaluate(id=>{location.hash='topic/'+id+'/scientific';},id);
   await page.locator('[data-depth-topic="'+id+'"]').waitFor();
   assert.equal(await page.locator('[data-depth-task]').count(),2,id);
   assert.equal(await page.locator('.bd-mechanism details').count(),3,id);
   assert.ok(await page.locator('.bd-table-wrap tbody tr').count()>=3,id);
   assert.equal(await page.locator('.bd-answer').evaluateAll(nodes=>nodes.every(n=>!n.open)),true,id);
  }
  report.checks.push('All '+ids.length+' concepts render mechanisms, evidence tables and distinct transfer tasks. Answers start hidden.');
  await page.goto(base+'/learn.html#topic/enzymes/advanced');
  await page.locator('[data-depth-topic="enzymes"]').waitFor();
  const evidence=page.locator('[data-depth-task="investigation"]');
  await evidence.locator('[data-depth-draft]').fill('My claim follows the trend; the control makes the comparison fair.');
  assert.equal(await evidence.locator('[data-depth-rating="revisit"]').isDisabled(),true);
  await evidence.locator('.bd-hint summary').click();
  assert.equal(await evidence.locator('.bd-answer').evaluate(e=>e.open),false);
  await evidence.locator('.bd-answer summary').click();
  await evidence.locator('[data-depth-rating="revisit"]').click();
  assert.equal(await evidence.locator('[data-depth-rating="revisit"]').getAttribute('aria-pressed'),'true');
  await evidence.locator('.bd-answer summary').click();
  assert.equal(await evidence.locator('[data-depth-rating="revisit"]').getAttribute('aria-pressed'),'true');
  await evidence.locator('.bd-answer summary').click();
  await page.reload();
  assert.match(await page.locator('[data-depth-task="investigation"] textarea').inputValue(),/comparison fair/);
  assert.equal(await page.locator('[data-depth-task="investigation"] .bd-answer').evaluate(e=>e.open),true);
  await page.goto(base+'/reason.html#learn/enzymes/advanced');
  await page.locator('[data-depth-topic="enzymes"]').waitFor();
  assert.equal(await page.locator('[data-depth-task]').count(),1);
  assert.match(await page.locator('[data-depth-task="investigation"] textarea').inputValue(),/comparison fair/);
  await page.locator('[data-depth-task="investigation"] textarea').fill('Revised explanation from Reason with a specific causal link.');
  assert.equal(await page.locator('[data-depth-rating="revisit"]').getAttribute('aria-pressed'),'false');
  await page.locator('[data-depth-rating="revisit"]').click();
  await page.goto(base+'/learn.html#library');
  await page.locator('.bd-revisit').waitFor();
  assert.equal(await page.locator('.bd-revisit a[href="#topic/enzymes/scientific"]').count(),1);
  await page.locator('.bd-revisit a').click();
  assert.match(await page.locator('[data-depth-task="investigation"] textarea').inputValue(),/Revised explanation from Reason/);
  report.checks.push('Hints and model comparison are separate; notes and honest self-review persist across reload, Learn and Reason; revisit list resolves to the topic.');
  await page.goto(base+'/solve.html#learn/enzymes/advanced');
  await page.locator('[data-depth-topic="enzymes"]').waitFor();
  assert.equal(await page.locator('.tp-dot').count(),3);
  await page.locator('[data-depth-task="transfer"] textarea').fill('Transfer explanation saved while I practise.');
  await page.locator('.tp-options input').first().check();
  await page.locator('.tp-submit').click();
  assert.match(await page.locator('[data-depth-task="transfer"] textarea').inputValue(),/saved while I practise/);
  await page.locator('.tp-next').click();
  assert.match(await page.locator('[data-depth-task="transfer"] textarea').inputValue(),/saved while I practise/);
  await page.locator('[data-depth-export]').scrollIntoViewIfNeeded();
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-depth-export]').click();
  const download=await downloadPromise;assert.equal(download.suggestedFilename(),'biology-enzymes-study-notes.md');
  const exported=fs.readFileSync(await download.path(),'utf8');
  assert.match(exported,/Transfer explanation saved/);assert.match(exported,/Revised explanation from Reason/);
  assert.match(exported,/Evidence limits:/);assert.match(exported,/\| --- \|/);
  report.checks.push('Solve retains its three graded checks plus the transfer task; rerendering does not erase drafts; study-note export contains both activity drafts.');
  await page.goto(base+'/learn.html#topic/photosynthesis/advanced');
  await page.locator('[data-depth-topic="photosynthesis"]').waitFor();
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Learn overflow at '+width);
   if(width===390||width===1440){await page.locator('#bd-title').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(output,'depth-'+width+'.png')});}
  }
  await page.locator('.bd-goals summary').focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.bd-goals').evaluate(e=>e.open),true);
  await page.locator('.bd-table-wrap').focus();assert.equal(await page.locator('.bd-table-wrap').evaluate(e=>e===document.activeElement),true);
  await page.evaluate(()=>{document.documentElement.dataset.theme='light';});
  const contrast=await page.locator('[data-depth-task="investigation"] textarea').evaluate(el=>{
   const style=getComputedStyle(el);
   const luminance=value=>{const rgb=value.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb.reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);};
   const a=luminance(style.color),b=luminance(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });
  assert.ok(contrast>=4.5,'Light-theme draft text contrast');
  await page.locator('.bd-study').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'depth-light.png')});
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
  report.checks.push('320/390/768/1440 Learn widths fit; native disclosure and evidence table support keyboard focus under reduced motion.');
  for(const section of ['reason','solve']){
   await page.goto(base+'/'+section+'.html#learn/photosynthesis/advanced');
   await page.locator('[data-depth-topic="photosynthesis"]').waitFor();
   for(const width of [320,768,1440]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,section+' overflow '+width);}
  }
  for(const [id,topic] of [['enzyme','enzymes'],['population','population-growth'],['cardiac','cardiac-cycle']]){
   await page.goto(base+'/lessons.html#'+id);await page.locator('.les-depth').waitFor();
   assert.equal(await page.locator('.les-depth a[href="./learn.html#topic/'+topic+'/advanced"]').count(),1);
  }
  report.checks.push('Light-theme draft contrast meets 4.5:1; Reason/Solve layouts fit at phone/tablet/desktop widths; representative Lessons expose exact depth links.');
  await page.setViewportSize({width:390,height:900});
  await page.goto(base+'/app.html#learn/topic/photosynthesis/advanced');
  const frame=await(await page.locator('#viewFrame').elementHandle()).contentFrame();
  await frame.locator('[data-depth-topic="photosynthesis"]').waitFor();
  assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  report.checks.push('The depth experience works inside the existing mobile app shell.');
  const denied=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}});});
  const d=await denied.newPage();await d.goto(base+'/learn.html#topic/dna/scientific');
  await d.locator('[data-depth-task="investigation"] textarea').fill('Storage denied, still learning.');
  await d.locator('[data-mode="advanced"]').click();
  assert.match(await d.locator('[data-depth-task="investigation"] textarea').inputValue(),/still learning/);
  assert.match(await d.locator('[data-depth-task="investigation"] .bd-save').textContent(),/unavailable/);
  await denied.close();report.checks.push('Blocked storage keeps drafts through mode changes and honestly reports session-only persistence.');
  assert.deepEqual(errors,[]);report.passed=true;
 }catch(error){report.failure=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
