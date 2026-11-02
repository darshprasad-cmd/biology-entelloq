/* Original schematic pollen-counting browser rehearsal. Not measured germination,
 * viable-pollen diagnosis, webcam validation or supervised practical competence. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules');
const runtime=createRequire(path.join(modules,'__pollen_check.cjs')),{chromium}=runtime('playwright');
const axePath=process.env.BIOLOGY_AXE_PATH||runtime.resolve('axe-core/axe.min.js');
const out=path.resolve(process.env.BIOLOGY_POLLEN_OUTPUT||path.join(root,'docs/cbse/pollen-browser'));
const route='#cbse:12/practicals/b12-a-e01',key='bioq.cbse.pollen.v1';
// Authored fixtures, independently checked by counting rendered circles and
// measuring rendered polylines below; never read the model/UI answer key.
const EXPECTED={A:{total:9,ruptured:1,germinated:{0:0,10:3,20:6}},B:{total:11,ruptured:1,germinated:{0:0,10:4,20:7}},C:{total:14,ruptured:2,germinated:{0:0,10:5,20:8}}};
const report={cases:[],limitations:'Chromium emulation and original schematic/counting checks only. Not real pollen, germination-rate calibration, viability diagnosis, physical touch, screen-reader certification, webcam tracking, educator review or supervised practical competence.'};
let server,browser;
async function open(page,base,action='Skip for now'){
 await page.goto(base.replace(/#.*$/,'')+route,{waitUntil:'domcontentloaded',timeout:90000});
 await page.getByRole('heading',{name:'Let’s make this workspace yours.'}).waitFor();
 assert.equal(await page.locator('.pollen-bench').count(),0,'questionnaire must precede the new bench');
 assert.equal(await page.locator('input[name=classYear]:checked').inputValue(),'12');
 await page.getByRole('button',{name:action,exact:true}).click();
 await page.locator('.pollen-bench').waitFor();assert.equal(new URL(page.url()).hash,route);
 await page.getByRole('button',{name:'Interactive pollen bench',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'cbsep-pollen-bench');
}
async function count(page,n){assert.equal(Number((await page.locator('[data-pollen-count]').innerText()).match(/\d+/)?.[0]),n);}
async function select(page,id,value){await page.locator('#pollen-'+id).selectOption(String(value));}
async function visual(page){return page.locator('.pollen-view svg').evaluate(svg=>svg.outerHTML);}
async function prepare(page,field='A',time=0){await page.locator('#pollen-prepared').check();await select(page,'condition','clear');await select(page,'field',field);await select(page,'time',time);}
async function record(page,values){for(const name of ['total','germinated','percent'])await page.locator('#pollen-'+name).fill(String(values[name]));await page.getByRole('button',{name:'Check and save counts',exact:true}).click();}
async function geometry(page,field,time){
 const rows=await page.locator('.pollen-view [data-pollen-grain]').evaluateAll(groups=>groups.map(group=>{
  const body=group.querySelector('[data-pollen-body]'),tube=group.querySelector('[data-pollen-tube]');
  const points=tube?(tube.getAttribute('points')||'').trim().split(/\s+/).filter(Boolean).map(point=>point.split(',').map(Number)):[];
  let length=0;for(let i=1;i<points.length;i++)length+=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);
  return {id:group.getAttribute('data-pollen-grain'),diameter:2*Number(body?.getAttribute('r')),length,ruptured:group.getAttribute('data-ruptured')==='true'};
 }));
 const expected=EXPECTED[field];assert.equal(rows.length,expected.total,'every recognizable grain belongs in N, including ruptured grains');
 assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,'grain IDs must be distinct within a field');
 assert.ok(rows.every(row=>row.id.startsWith(field)&&Number.isFinite(row.diameter)&&row.diameter>0&&Number.isFinite(row.length)),'measurable original grain geometry');
 assert.equal(rows.filter(row=>row.ruptured).length,expected.ruptured,'ruptured grains remain recognizable and counted in total');
 const germinated=rows.filter(row=>!row.ruptured&&row.length-row.diameter>1e-6).length;
 assert.equal(germinated,expected.germinated[time],'strict tube length greater than grain diameter: '+field+' at '+time);
 const equivalent=await page.locator('.pollen-text tbody tr').evaluateAll(lines=>lines.map(line=>[...line.children].map(cell=>cell.textContent.trim())));
 assert.deepEqual(equivalent,rows.map(row=>[row.id,row.diameter.toFixed(1),row.length.toFixed(1),row.ruptured?'Ruptured':'Intact']),'text equivalent must report the same measurable geometry');
 return {total:rows.length,germinated,percent:Number((100*germinated/rows.length).toFixed(1)),rows};
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
async function layout(page,width){
 assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.matches(':modal')),true);
 assert.equal(await page.locator('#bio-cbse').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true,'dialog overflow at '+width);
 assert.equal(await page.locator('.pollen-bench').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true,'bench overflow at '+width);
 assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);
 for(const id of ['condition','field','time','total','germinated','percent'])assert.ok((await page.locator('#pollen-'+id).boundingBox()).height>=44,id+' minimum control height');
 assert.equal(await page.locator('.pollen-view svg').getAttribute('role'),'img');
 assert.ok((await page.locator('.pollen-view svg').getAttribute('aria-label'))?.length>30,'equivalent field description is required');
}
async function responsiveCase(base,width){
 const context=await contextFor(base,{viewport:{width,height:900}}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!/^(blob:|data:)/.test(r.url()))requests.push(r.url());});
 try{
  await open(page,base,width===1440?'Build my study space':'Skip for now');await layout(page,width);
  await page.screenshot({path:path.join(out,'setup-'+width+'.png')});await accessibility(page,width,'setup');
  await page.evaluate(()=>{localStorage.setItem('bioq.notes','existing lesson');localStorage.setItem('bioq.cbse.microscopy.v1','preserve microscope');localStorage.setItem('bioq.cbse.potato-osmosis.v1','preserve potato');});
  const note='Original pollen preparation notes remain independent of the simulated count notebook.';
  await page.locator('#cbsep-note').fill(note);await page.getByRole('button',{name:'Save this note',exact:true}).click();
  const baseline=requests.length;
  await record(page,{total:9,germinated:0,percent:0});await count(page,0);assert.match(await page.locator('.pollen-feedback').innerText(),/prepar|mount|medium|slide/i);
  assert.equal(await page.locator('.pollen-view [data-pollen-grain]').count(),0,'empty mount has no countable grains');
  await page.locator('#pollen-prepared').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#pollen-prepared').isChecked(),true,'native keyboard preparation');
  await select(page,'field','A');await select(page,'time',20);const valid=await geometry(page,'A',20);
  await page.locator('#pollen-inspect').selectOption('A03');assert.match(await page.locator('#pollen-measurement').innerText(),/A03: diameter 28\.0, tube centreline 28\.0/);
  await record(page,{...valid,total:valid.total+1});await count(page,0);assert.match(await page.locator('.pollen-feedback').innerText(),/total|count|grain|denominator/i);
  await record(page,{...valid,germinated:valid.germinated-1});await count(page,0);assert.match(await page.locator('.pollen-feedback').innerText(),/germinat|tube|count/i);
  await record(page,{...valid,percent:valid.percent+5});await count(page,0);assert.match(await page.locator('.pollen-feedback').innerText(),/percent|100|division|calculate/i);
  for(const condition of ['crowded','dry']){
   const clear=await visual(page);await select(page,'condition',condition);assert.notEqual(await visual(page),clear,'preparation fault changes visible field');
   await record(page,valid);await count(page,0);assert.match(await page.locator('.pollen-feedback').innerText(),/crowd|overlap|dry|mount|condition|prepar|clear/i);
   if(width===1440)await page.locator('.pollen-view').screenshot({path:path.join(out,'fault-'+condition+'.png')});await select(page,'condition','clear');
  }
  const results=[],fieldDrawings=new Set();let n=0;
  for(const field of ['A','B','C']){
   await select(page,'field',field);let prior=null;
   for(const time of [0,10,20]){
    await select(page,'time',time);const actual=await geometry(page,field,time),drawing=await visual(page);if(prior)assert.notEqual(drawing,prior,'time snapshot must change actual tubes');prior=drawing;
    await record(page,actual);await count(page,++n);assert.match(await page.locator('.pollen-feedback').innerText(),/saved|checked|recorded/i);
    await record(page,actual);await count(page,n);results.push({field,time,total:actual.total,germinated:actual.germinated,percent:actual.percent});
   }
   fieldDrawings.add(prior);if(width===1440)await page.locator('.pollen-view').screenshot({path:path.join(out,'field-'+field+'-20.png')});
  }
  assert.equal(fieldDrawings.size,3,'three distinct fields');
  await page.locator('.pollen-practice summary').click();
  for(const [id,wrong,correct] of [['boundary',1,0],['denominator',1,2],['pooled',0,1]]){
   const form=page.locator('[data-pollen-question="'+id+'"]');await form.locator('input[value="'+wrong+'"]').check();await form.getByRole('button',{name:'Check reasoning',exact:true}).click();assert.match(await form.locator('[role=status]').innerText(),/Reconsider/);
   await form.locator('input[value="'+correct+'"]').check();await form.getByRole('button',{name:'Check reasoning',exact:true}).click();assert.match(await form.locator('[role=status]').innerText(),/Reasoning supported/);
  }
  await page.getByRole('button',{name:'Reset current mount',exact:true}).click();await count(page,9);assert.equal(await page.locator('#pollen-prepared').isChecked(),false);
  await page.locator('.pollen-notebook summary').click();await page.locator('.pollen-notebook').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'notebook-'+width+'.png')});await accessibility(page,width,'nine-field-snapshots');
  const pooled=await page.locator('.pollen-summary > p').allTextContents();assert.equal(pooled.length,3,'times must not be combined into a single enlarged denominator');
  for(const [index,time,g,percent] of [[0,0,0,'0.0'],[1,10,12,'35.3'],[2,20,21,'61.8']]){assert.ok(pooled[index].includes(time+' min · 3/3 fields'));assert.ok(pooled[index].includes(g+' ÷ 34 × 100 = '+percent+'%'),'pool raw counts across distinct fields, not percentages');}
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download pollen counts (CSV)',exact:true}).click();const download=await downloadPromise;
  assert.equal(download.suggestedFilename(),'pollen-synthetic-counts.csv');const csv=fs.readFileSync(await download.path(),'utf8'),stored=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(stored.version,1);assert.equal(stored.records.length,9);assert.equal(csv,await page.evaluate(rows=>window.BioPollen.csv(rows),stored.records));
  assert.equal(csv.trim().split(/\r?\n/).length,10);assert.match(csv,/illustrative|schematic|model|not_experimental/i);
  assert.deepEqual(csv.trim().split(/\r?\n/).slice(1).map(line=>line.split(',')),results.map(result=>[result.field,String(result.time),String(result.total),String(result.germinated),String(EXPECTED[result.field].ruptured),(100*result.germinated/result.total).toFixed(2),'synthetic_not_experimental']),'CSV independently matches measured count fixtures');
  assert.equal(requests.length,baseline,'controls, snapshots and saving must not issue runtime requests');
  await page.reload({waitUntil:'domcontentloaded',timeout:90000});await page.locator('.pollen-bench').waitFor();await count(page,9);assert.equal(await page.locator('#cbsep-note').inputValue(),note);
  assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('bioq.notes'),localStorage.getItem('bioq.cbse.microscopy.v1'),localStorage.getItem('bioq.cbse.potato-osmosis.v1')]),['existing lesson','preserve microscope','preserve potato']);
  await page.getByRole('button',{name:'Interactive pollen bench',exact:true}).click();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>Boolean(document.activeElement.closest('.pollen-bench'))),true);
  await page.keyboard.press('Escape');await page.getByRole('heading',{name:'Class 12 · Biology',exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.activeElement.tagName),'H1');
  assert.equal(await page.evaluate(()=>window.__cameraCalls),0);assert.deepEqual(errors,[]);
  report.cases.push({width,firstScreen:true,questionnaireAction:width===1440?'complete':'skip',deepLinkPreserved:true,independentRenderedGeometry:true,equivalentDimensionsTable:true,inspectorEqualLengthBoundary:true,totalIncludesRecognizableRupturedGrains:true,results,incorrectCountsAndPercentageRejected:true,preparationFaults:true,dedup:true,rawCountPoolingByTime:true,retrievalAndApplicationFeedback:true,csvExact:true,reload:true,notesPreserved:true,resetPreservesNotebook:true,keyboardAndEscapeFocus:true,noBenchNetworkRequests:true,cameraCalls:0});
 }finally{await context.close();}
}
async function persistenceCases(base){
 const corrupt=await contextFor(base);await corrupt.addInitScript(({key})=>{window.__payloadExecuted=0;const payload='<img src=x onerror="window.__payloadExecuted=1">';localStorage.setItem(key,JSON.stringify({version:1,records:[{state:{field:payload},total:payload,germinated:1,percent:1},{state:{field:'A',time:20},total:999,germinated:999,percent:100}]}));localStorage.setItem('bioq.cbse.practical-notes.v1.b12-a-e01',JSON.stringify({version:1,text:payload}));},{key});
 const cp=await corrupt.newPage();await open(cp,base);await count(cp,0);assert.equal(await cp.evaluate(()=>window.__payloadExecuted),0);assert.equal(await cp.locator('.pollen-bench img').count(),0);assert.match(await cp.locator('#cbsep-note').inputValue(),/<img src=x/);await corrupt.close();report.cases.push({invalidAndForgedNotebookIgnored:true,storedMarkupNotExecuted:true});
 const malformed=await contextFor(base);await malformed.addInitScript(key=>localStorage.setItem(key,'{invalid JSON'),key);const mp=await malformed.newPage();await open(mp,base);await count(mp,0);await malformed.close();report.cases.push({malformedNotebookIgnored:true});
 const blocked=await contextFor(base);await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('Storage denied');}}));
 const bp=await blocked.newPage(),errors=[];bp.on('pageerror',e=>errors.push(e.message));await open(bp,base);await prepare(bp,'B',10);await record(bp,await geometry(bp,'B',10));await count(bp,1);
 await bp.locator('.pollen-notebook summary').click();assert.match(await bp.locator('.pollen-storage').innerText(),/session only|session-only/i);
 await bp.getByRole('link',{name:'← All Class 12 practical guides',exact:true}).click();await bp.locator('a[href="'+route+'"]').click();await bp.locator('.pollen-bench').waitFor();await count(bp,1);assert.deepEqual(errors,[]);await blocked.close();report.cases.push({blockedStorageSessionRemount:true});
}
async function offlineCase(){
 const url=pathToFileURL(path.join(root,'dist/index.html')).href,context=await contextFor(url),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{await open(page,url);await prepare(page,'C',20);await record(page,await geometry(page,'C',20));await count(page,1);assert.equal(await page.evaluate(()=>window.__cameraCalls),0);assert.deepEqual(errors,[]);report.cases.push({singleFileOfflineInteractive:true,cameraCalls:0});}finally{await context.close();}
}
async function run(){
 fs.mkdirSync(out,{recursive:true});const portableOnly=process.argv.includes('--portable');let base=process.env.BIOLOGY_CBSE_URL;
 if(!base){const bytes=fs.readFileSync(path.join(root,'dist/index.html'));report.localArtifact={bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};if(!portableOnly){server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(bytes);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+'/';}}
 report.target=portableOnly?'file:// local portable artifact':base;browser=await chromium.launch({headless:true});
 try{if(portableOnly)await offlineCase();else{const widths=process.env.BIOLOGY_POLLEN_WIDTHS?process.env.BIOLOGY_POLLEN_WIDTHS.split(',').map(Number):[1440,768,390,320];assert.ok(widths.length&&widths.every(width=>Number.isInteger(width)&&width>=320&&width<=1920),'valid viewport widths required');for(const width of widths)await responsiveCase(base,width);await persistenceCases(base);if(!process.env.BIOLOGY_CBSE_URL)await offlineCase();}report.status='passed';}
 catch(error){report.status='failed';report.error=error.stack;throw error;}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();server?.close();}
 console.log(JSON.stringify(report,null,2));
}
run().catch(error=>{console.error(error);server?.close();process.exitCode=1;});
