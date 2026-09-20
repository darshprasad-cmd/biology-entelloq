/* Maintenance capture: real, isolated app views in a fresh browser context. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const {createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules','capture-previews.cjs'));
const {chromium}=runtime('playwright');
const root=path.resolve(__dirname,'..'),base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3014';
const out=path.join(root,'assets/previews'),temp=path.join(require('node:os').tmpdir(),'biology-app-captures');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(temp,{recursive:true});
const captures=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:1100,height:850},reducedMotion:'reduce'});const page=await context.newPage();
 async function capture(key,selector,route){const el=page.locator(selector).first();await el.waitFor();await el.screenshot({path:path.join(temp,key+'.png'),animations:'disabled',style:'#nav,#eqx-fab,#bio-background-toggle{visibility:hidden!important}'});captures.push({key,route,selector});console.log('Captured '+key);}
 try{
  await page.goto(base+'/learn.html?embed=1#cell');await capture('legacy-cell','#cell .cell-stage svg','learn.html#cell');
  await page.goto(base+'/learn.html?embed=1#microscope');await capture('legacy-microscope','#scopeField','learn.html#microscope');
  await page.goto(base+'/learn.html?embed=1#topic/photosynthesis/visual');await capture('section-learn','.bl-diagram > svg','learn.html#topic/photosynthesis/visual');
  await page.goto(base+'/universe.html#earth');await page.waitForFunction(()=>window.__UNI&&document.querySelector('#uni canvas'));await page.locator('#uniload').waitFor({state:'hidden'});await capture('section-universe','#uni canvas','universe.html#earth');
  // Expose the real question renderer only inside this isolated capture response.
  // No sample answer, artificial score, or capture hook enters the published app.
  await page.route('**/solve.html*',async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('function startItems(items,mode,label){',`window.__capturePractice=(mode)=>{if(S?.timerId)clearInterval(S.timerId);const q=QBANK.find(q=>q.type==='diagram'&&q.diagram==='cell')||QBANK.find(q=>q.type==='diagram');startItems([q],'practice','Cell Biology');S.mode=mode;S.timeLeft=50;renderRunner();};window.__captureReview=()=>{S.phase='review';renderRunner();};function startItems(items,mode,label){`);await route.fulfill({response,body});});
  await page.goto(base+'/solve.html?embed=1');await page.locator('#svConfigCard').waitFor();
  for(const mode of ['practice','timed','adaptive']){
   await page.evaluate(mode=>window.__capturePractice(mode),mode);
   await capture('solve-'+mode,'.sv-runner','solve.html · '+mode+' renderer');
  }
  await capture('section-solve','.sv-qcard','solve.html · diagram practice');
  await page.evaluate(()=>window.__captureReview());await capture('solve-review','.sv-qcard','solve.html · diagram answer review');
  await page.goto(base+'/me.html?embed=1');await page.locator('#recSlot').waitFor();
  await capture('section-me','#masterySlot','me.html · empty local profile');
  await page.goto(base+'/about.html?embed=1#founder');await capture('section-about','#page-founder .avatar','about.html#founder');
  await page.goto(base+'/explore.html?embed=1#tree');await capture('section-explore','#treeStage svg','explore.html#tree');
  for(const [key,selector] of [['atlas','#atlasDetail .br-reference-figure'],['timeline','#tlDetail .br-reference-figure'],['graph','#kgCanvas'],['diseases','#dzList .dz-item'],['tree','#treeStage svg']])await capture('explore-'+key,selector,'explore.html#'+key);
  for(const id of ['altitude','resistance','glucose']){await page.goto(base+'/reason.html?embed=1#'+id);await capture('reason-'+id,'.tp-case-visual','reason.html#'+id);}
  await page.goto(base+'/app.html#home');await page.locator('.cc-world .bp-media img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));await page.screenshot({path:path.join(temp,'section-home.png'),animations:'disabled'});captures.push({key:'section-home',route:'app.html#home',selector:'viewport'});
 }finally{await browser.close();}
 const py=spawnSync(process.env.BIOLOGY_PYTHON||'python',['-c',
  'from PIL import Image; from pathlib import Path; import sys; source=Path(sys.argv[1]); target=Path(sys.argv[2]); [(lambda im,p: (im.thumbnail((960,700)), im.convert("RGB").save(target/(p.stem+".webp"),"WEBP",quality=84)))(Image.open(p),p) for p in source.glob("*.png")]',temp,out],{encoding:'utf8',windowsHide:true});assert.equal(py.status,0,py.stderr);
 fs.mkdirSync(path.join(root,'docs/previews'),{recursive:true});fs.writeFileSync(path.join(root,'docs/previews/app-captures.json'),JSON.stringify(captures,null,2)+'\n');
 for(const [section,source] of Object.entries({lessons:'lesson-diffusion',reason:'reason-glucose',labs:'lab-microscope',lab:'lab-frog-dissection'}))fs.copyFileSync(path.join(out,source+'.webp'),path.join(out,'section-'+section+'.webp'));
})().catch(error=>{console.error(error);process.exitCode=1;});
