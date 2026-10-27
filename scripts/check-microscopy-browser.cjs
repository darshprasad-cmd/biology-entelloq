/* Packaged-browser rehearsal of original schematic microscopy, not biological imaging,
 * physical microscope calibration, webcam accuracy or supervised practical competence. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules');
const runtime=createRequire(path.join(modules,'__microscopy_check.cjs')),{chromium}=runtime('playwright');
const axePath=process.env.BIOLOGY_AXE_PATH||runtime.resolve('axe-core/axe.min.js');
const out=path.resolve(process.env.BIOLOGY_MICROSCOPY_OUTPUT||path.join(root,'docs/cbse/microscopy-browser'));
const route='#cbse:9/practicals/s9-e04',key='bioq.cbse.microscopy.v1';
const report={cases:[],limitations:'Chromium emulation and original schematic/model checks only. Not physical touch, screen-reader certification, captured microscopy, calibrated dimensions or optics, webcam tracking, educator review or supervised practical competence.'};
let server,browser;
const observation={onion:'Model observation: adjacent elongated onion cells have boundaries, pale interiors and stained nuclei. These are schematic structures, not measured specimen data.',cheek:'Model observation: separate irregular cheek cells have a cell membrane and stained nucleus. No rigid cell wall is shown; this is an illustrative model.'};
async function open(page,base,action='Skip for now'){
 await page.goto(base.replace(/#.*$/,'')+route,{waitUntil:'domcontentloaded',timeout:90000});
 await page.getByRole('heading',{name:'Let’s make this workspace yours.'}).waitFor();
 assert.equal(await page.locator('.micro-bench').count(),0,'the questionnaire must precede the bench');
 assert.equal(await page.locator('input[name=classYear]:checked').inputValue(),'9');
 await page.getByRole('button',{name:action,exact:true}).click();
 await page.locator('.micro-bench').waitFor();assert.equal(new URL(page.url()).hash,route);
 await page.getByRole('button',{name:'Interactive microscopy bench',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'cbsep-microscopy-bench');
}
async function range(page,id,value){
 await page.locator('#micro-'+id).evaluate((el,next)=>{el.value=String(next);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);
 assert.equal(Number(await page.locator('#micro-'+id).inputValue()),value);
}
async function count(page,n){assert.equal(Number((await page.locator('[data-micro-count]').innerText()).match(/\d+/)?.[0]),n);}
async function select(page,id,value){await page.locator('#micro-'+id).selectOption(String(value));}
async function visual(page){return page.locator('.micro-view svg').evaluate(svg=>svg.outerHTML);}
function translation(transform){const match=/translate\(([-\d.e]+)[ ,]+([-\d.e]+)\)/i.exec(transform);assert.ok(match,'tissue must expose its stage translation');return match.slice(1).map(Number);}
function near(actual,expected,label){assert.ok(Math.abs(actual-expected)<1e-7,label+': '+actual+' versus '+expected);}
async function record(page,text){await page.locator('.micro-record textarea[name=observation]').fill(text);await page.getByRole('button',{name:'Save model observation',exact:true}).click();}
async function prepare(page,specimen='onion'){
 await select(page,'specimen',specimen);await page.locator('#micro-prepared').check();await page.locator('#micro-stain').check();
 await select(page,'mount','flat');await select(page,'objective',10);
 await range(page,'focus',specimen==='onion'?52:46);await range(page,'light',75);await range(page,'x',0);await range(page,'y',0);
}
async function accessibility(page,width,state){
 if(!await page.evaluate(()=>Boolean(window.axe)))await page.addScriptTag({path:axePath});
 const violations=await page.evaluate(async()=>{const r=await axe.run('#bio-cbse',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 assert.deepEqual(violations,[],JSON.stringify({width,state,violations}));report.cases.push({width,state,axeViolations:0});
}
async function contextFor(base,options={}){
 const context=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce',acceptDownloads:true,...options});
 await context.route('**/*',r=>{const url=r.request().url();return url.startsWith('file:')||new URL(url).origin===new URL(base).origin?r.continue():r.abort();});
 await context.addInitScript(()=>{window.__cameraCalls=0;if(navigator.mediaDevices)Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value(){window.__cameraCalls++;throw Error('Unexpected camera access');}});});
 return context;
}
async function assertLayout(page,width){
 assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.matches(':modal')),true);
 assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true,'dialog overflow at '+width);
 assert.equal(await page.locator('.micro-bench').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true,'bench overflow at '+width);
 assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
 for(const id of ['specimen','mount','objective','focus','light','x','y'])assert.ok((await page.locator('#micro-'+id).boundingBox()).height>=44,id+' target height');
 assert.equal(await page.locator('.micro-view svg').getAttribute('role'),'img');
 assert.ok((await page.locator('.micro-view svg').getAttribute('aria-label'))?.length>35,'view must expose a meaningful equivalent description');
}
async function responsiveCase(base,width){
 const context=await contextFor(base,{viewport:{width,height:900}}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 try{
  await open(page,base,width===1440?'Build my study space':'Skip for now');await assertLayout(page,width);
  await page.screenshot({path:path.join(out,'setup-'+width+'.png')});await accessibility(page,width,'setup');
  await page.evaluate(()=>{localStorage.setItem('bioq.notes','existing lesson');localStorage.setItem('bioq.lab-notebook.v1.microscope','existing microscope');});
  const note='Original microscopy preparation plan — preserve this alongside the separate model notebook.';
  await page.locator('#cbsep-note').fill(note);await page.getByRole('button',{name:'Save this note',exact:true}).click();
  const requestBaseline=requests.length;
  await record(page,observation.onion);await count(page,0);assert.match(await page.locator('.micro-feedback').innerText(),/prepar|mount|slide|focus|ready/i);
  assert.equal(await page.locator('[data-micro-tissue]').evaluate(node=>node.children.length),0,'unprepared field contains no tissue');
  await prepare(page);const focused=await visual(page);
  const sharpBlur=Number(await page.locator('feGaussianBlur').getAttribute('stdDeviation'));
  await range(page,'focus',0);assert.notEqual(await visual(page),focused,'defocus must change the rendered field');
  assert.ok(Number(await page.locator('feGaussianBlur').getAttribute('stdDeviation'))>sharpBlur,'focus changes actual SVG blur, not only text');
  await record(page,observation.onion);await count(page,0);assert.match(await page.locator('.micro-feedback').innerText(),/focus|clear/i);
  await range(page,'focus',52);
  await page.locator('#micro-stain').uncheck();const unstained=await visual(page);await page.locator('#micro-stain').check();assert.notEqual(await visual(page),unstained,'stain must change contrast');
  await range(page,'light',20);await record(page,observation.onion);await count(page,0);assert.match(await page.locator('.micro-feedback').innerText(),/illumination|light/i);await range(page,'light',75);
  const magnifications=[];
  for(const [objective,total,fov] of [[4,40,4500],[10,100,1800],[40,400,450]]){
   await select(page,'objective',objective);const readout=await page.locator('.micro-readout').innerText();
   assert.match(readout,new RegExp('\\b'+total+'\\s*[×x]'),'total magnification at '+objective+'x');
   assert.match(readout,new RegExp('\\b'+fov+'\\s*[µμ]m'),'18 mm field-number specimen field at '+objective+'x');magnifications.push({objective,total,fov,readout});
  }
  assert.equal(new Set(magnifications.map(item=>item.readout)).size,3,'FOV and magnification must update between objectives');
  await select(page,'objective',10);
  const initialTransform=await page.locator('[data-micro-tissue]').getAttribute('transform');
  await range(page,'x',400);const movedTransform=await page.locator('[data-micro-tissue]').getAttribute('transform');
  assert.notEqual(movedTransform,initialTransform,'horizontal stage control must move tissue');
  const initial=translation(initialTransform),moved=translation(movedTransform);near(moved[0]-initial[0],-400*380/1800,'rightward slide gives leftward image');near(moved[1],initial[1],'x-only stage preserves y');
  await range(page,'y',300);const movedY=translation(await page.locator('[data-micro-tissue]').getAttribute('transform'));near(movedY[1]-moved[1],-300*380/1800,'downward slide gives upward image');near(movedY[0],moved[0],'y-only stage preserves x');
  await range(page,'x',0);await range(page,'y',0);
  const keyboard=page.locator('#micro-x');await keyboard.focus();const before=Number(await keyboard.inputValue());await page.keyboard.press('ArrowRight');assert.ok(Number(await keyboard.inputValue())>before,'native keyboard stage range');await range(page,'x',0);
  for(const mount of ['bubbles','fold']){
   const clean=await visual(page);await select(page,'mount',mount);assert.notEqual(await visual(page),clean,'mount fault must visibly alter the field');
   assert.match(await page.locator('.micro-status').innerText(),mount==='bubbles'?/bubble/i:/fold|overlap|thick/i);
   await record(page,observation.onion);await count(page,0);assert.match(await page.locator('.micro-feedback').innerText(),/bubble|fold|mount|clear|flat|prepar/i);
   if(mount==='bubbles'){
    const bubbleTransform=()=>page.locator('[data-micro-bubbles]').getAttribute('transform');
    const original=await bubbleTransform();assert.equal(original,await page.locator('[data-micro-tissue]').getAttribute('transform'),'bubbles occupy the same specimen coordinate frame');
    await range(page,'x',100);await range(page,'y',-100);const shifted=await bubbleTransform();assert.notEqual(shifted,original,'bubbles move with the stage');assert.equal(shifted,await page.locator('[data-micro-tissue]').getAttribute('transform'));
    await select(page,'objective',40);const enlarged=await bubbleTransform();assert.notEqual(enlarged,shifted,'bubbles magnify with the specimen');assert.equal(enlarged,await page.locator('[data-micro-tissue]').getAttribute('transform'));
    assert.deepEqual(await page.locator('[data-micro-bubbles] circle').evaluateAll(nodes=>nodes.map(node=>Number(node.getAttribute('r')))),[175,240],'bubble radii stay in specimen micrometres, not screen pixels');
    await select(page,'objective',10);await range(page,'x',0);await range(page,'y',0);assert.equal(await bubbleTransform(),original);
   }
   if(width===1440)await page.locator('.micro-view').screenshot({path:path.join(out,'fault-'+mount+'.png')});await select(page,'mount','flat');
  }
  await record(page,observation.onion);await count(page,1);assert.match(await page.locator('.micro-feedback').innerText(),/saved|recorded/i);
  await record(page,observation.onion);await count(page,1);
  const onion=await visual(page);await page.locator('.micro-view').screenshot({path:path.join(out,'onion-'+width+'.png')});
  await prepare(page,'cheek');assert.notEqual(await visual(page),onion,'changing tissue changes the drawing');
  await record(page,observation.cheek);await count(page,2);await page.locator('.micro-view').screenshot({path:path.join(out,'cheek-'+width+'.png')});
  await page.locator('[data-micro=reset]').click();await count(page,2);assert.equal(await page.locator('#micro-prepared').isChecked(),false,'reset changes setup, not notebook');
  await page.locator('.micro-practice summary').click();
  for(const [id,correct] of [['total-magnification',2],['field-diameter',1]]){
   const form=page.locator('[data-micro-question="'+id+'"]');await form.locator('input[value="0"]').check();await form.getByRole('button',{name:'Check reasoning',exact:true}).click();assert.match(await form.locator('[role=status]').innerText(),/Reconsider/);
   await form.locator('input[value="'+correct+'"]').check();await form.getByRole('button',{name:'Check reasoning',exact:true}).click();assert.match(await form.locator('[role=status]').innerText(),/Reasoning supported/);
  }
  await page.locator('.micro-notebook summary').click();await page.locator('.micro-notebook').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'notebook-'+width+'.png')});await accessibility(page,width,'two-specimen-notebook');
  const downloadPromise=page.waitForEvent('download');await page.locator('[data-micro=export]').click();const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'microscopy-model-observations.csv');const csv=fs.readFileSync(await download.path(),'utf8');assert.match(csv,/onion/i);assert.match(csv,/cheek/i);assert.match(csv,/illustrative|schematic|model|not_experimental/i);
  const stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);assert.equal(stored.version,1);assert.equal(stored.records.length,2);
  assert.equal(csv,await page.evaluate(rows=>window.BioMicroscopy.csv(rows),stored.records));assert.equal(csv.trim().split(/\r?\n/).length,3);
  assert.ok(csv.includes('adjacent elongated onion cells'),'CSV includes the learner observation');
  assert.equal(requests.length,requestBaseline,'bench controls and saving must not issue network requests');
  await page.reload({waitUntil:'domcontentloaded',timeout:90000});await page.locator('.micro-bench').waitFor();await count(page,2);
  assert.equal(await page.locator('#cbsep-note').inputValue(),note);
  assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('bioq.notes'),localStorage.getItem('bioq.lab-notebook.v1.microscope')]),['existing lesson','existing microscope']);
  await page.getByRole('button',{name:'Interactive microscopy bench',exact:true}).click();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('.micro-bench'))),true);
  await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Class 9 · Science: Biology',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H1');
  assert.equal(await page.evaluate(()=>window.__cameraCalls),0);assert.deepEqual(errors,[]);
  report.cases.push({width,firstScreen:true,questionnaireAction:width===1440?'complete':'skip',deepLinkPreserved:true,nativeKeyboardStage:true,focusAndContrast:true,magnifications,invertedStageMovement:true,mountFaults:true,bubblesShareStageAndMagnification:true,illuminationReadiness:true,bothSpecimensSaved:true,dedup:true,retrievalAndApplicationFeedback:true,csvExact:true,reload:true,notesPreserved:true,resetPreservesNotebook:true,escapeAndFocus:true,noBenchNetworkRequests:true,cameraCalls:0});
 }finally{await context.close();}
}
async function persistenceCases(base){
 const corrupt=await contextFor(base);await corrupt.addInitScript(({key})=>{window.__payloadExecuted=0;const payload='<img src=x onerror="window.__payloadExecuted=1">';localStorage.setItem(key,JSON.stringify({version:1,records:[{state:{specimen:payload},observation:payload}]}));localStorage.setItem('bioq.cbse.practical-notes.v1.s9-e04',JSON.stringify({version:1,text:payload}));},{key});
 const cp=await corrupt.newPage();await open(cp,base);await count(cp,0);assert.equal(await cp.evaluate(()=>window.__payloadExecuted),0);assert.equal(await cp.locator('.micro-bench img').count(),0);assert.match(await cp.locator('#cbsep-note').inputValue(),/<img src=x/);await corrupt.close();report.cases.push({invalidNotebookIgnored:true,storedMarkupNotExecuted:true});
 const malformed=await contextFor(base);await malformed.addInitScript(key=>localStorage.setItem(key,'{invalid JSON'),key);const mp=await malformed.newPage();await open(mp,base);await count(mp,0);await malformed.close();report.cases.push({malformedNotebookIgnored:true});
 const text=await contextFor(base),tp=await text.newPage();await open(tp,base);await prepare(tp);await tp.evaluate(()=>window.__payloadExecuted=0);
 const payload='<img src=x onerror="window.__payloadExecuted=1"> is stored as observation text, never rendered as HTML.';
 await record(tp,payload);await count(tp,1);await tp.locator('.micro-notebook summary').click();assert.equal(await tp.locator('.micro-records img').count(),0);assert.match(await tp.locator('.micro-records').innerText(),/<img src=x/);assert.equal(await tp.evaluate(()=>window.__payloadExecuted),0);
 await record(tp,'=HYPERLINK("https://example.invalid","model observation only")');await count(tp,2);
 const exported=await tp.evaluate(()=>window.BioMicroscopy.csv(window.BioMicroscopy.load()));assert.ok(exported.includes('"\'=HYPERLINK('),'spreadsheet formula prefix must be neutralized');await text.close();report.cases.push({validObservationMarkupEscaped:true,csvFormulaPrefixEscaped:true});
 const blocked=await contextFor(base);await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Storage denied');}}));
 const bp=await blocked.newPage(),errors=[];bp.on('pageerror',e=>errors.push(e.message));await open(bp,base);await prepare(bp);await record(bp,observation.onion);await count(bp,1);
 await bp.locator('.micro-notebook summary').click();assert.match(await bp.locator('.micro-storage').innerText(),/session only|session-only/i);
 await bp.getByRole('link',{name:'← All Class 9 practical guides',exact:true}).click();await bp.locator('a[href="'+route+'"]').click();await bp.locator('.micro-bench').waitFor();await count(bp,1);assert.deepEqual(errors,[]);await blocked.close();report.cases.push({blockedStorageSessionRemount:true});
}
async function offlineCase(){
 const url=pathToFileURL(path.join(root,'dist/index.html')).href,context=await contextFor(url),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{await open(page,url);await prepare(page);await record(page,observation.onion);await count(page,1);await select(page,'objective',40);await range(page,'x',500);assert.equal(await page.evaluate(()=>window.__cameraCalls),0);assert.deepEqual(errors,[]);report.cases.push({singleFileOfflineInteractive:true,cameraCalls:0});}finally{await context.close();}
}
async function run(){
 fs.mkdirSync(out,{recursive:true});const portableOnly=process.argv.includes('--portable');let base=process.env.BIOLOGY_CBSE_URL;
 if(!base&&!portableOnly){const bytes=fs.readFileSync(path.join(root,'dist/index.html'));server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(bytes);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+'/';}
 report.target=portableOnly?'file:// local portable artifact':base;browser=await chromium.launch({headless:true});
 try{
  if(portableOnly)await offlineCase();else{
   const widths=process.env.BIOLOGY_MICROSCOPY_WIDTHS?process.env.BIOLOGY_MICROSCOPY_WIDTHS.split(',').map(Number):[1440,768,390,360];
   assert.ok(widths.length&&widths.every(width=>Number.isInteger(width)&&width>=320&&width<=1920),'valid viewport widths required');
   for(const width of widths)await responsiveCase(base,width);await persistenceCases(base);if(!process.env.BIOLOGY_CBSE_URL)await offlineCase();
  }
  report.status='passed';
 }catch(error){report.status='failed';report.error=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();server?.close();}
 console.log(JSON.stringify(report,null,2));
}
run().catch(error=>{console.error(error);server?.close();process.exitCode=1;});
