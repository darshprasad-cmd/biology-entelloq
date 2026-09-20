/* Capture the real existing lesson models and reasoning controls.
   This script changes no lesson/scoring behavior and captures no user activity. */
const fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules','__study_previews.cjs'));
const {chromium}=runtime('playwright'),sharp=runtime('sharp');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3014';
const root=path.resolve(__dirname,'..'),output=path.join(root,'assets/previews'),docs=path.join(root,'docs/previews');
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(docs,{recursive:true});
const lessons=['diffusion','enzyme','population','photosynthesis','respiration','replication','selection','actionpotential','cardiac'];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:820,height:980},deviceScaleFactor:2,reducedMotion:'no-preference'});
 const page=await context.newPage(),manifest=[],errors=[];
 page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));
 async function capture(key,locator,metadata){
  await locator.scrollIntoViewIfNeeded();
  // Export canvas pixels directly so a sticky page header cannot cover the model.
  const isCanvas=await locator.evaluate(el=>el.tagName==='CANVAS');
  const png=isCanvas?Buffer.from((await locator.evaluate(el=>el.toDataURL('image/png'))).split(',')[1],'base64'):await locator.screenshot({type:'png',animations:'disabled',style:'#nav,#eqx-fab,#bio-background-toggle{visibility:hidden!important}'});
  // The live canvas is transparent over the lesson's dark stage; retain that background.
  const background=isCanvas?await locator.evaluate(el=>{for(let node=el;node;node=node.parentElement){const color=getComputedStyle(node).backgroundColor;if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent')return color;}return '#071009';}):'#071009';
  const file=key+'.webp';await sharp(png).flatten({background}).resize({width:960,withoutEnlargement:true}).webp({quality:88,effort:5}).toFile(path.join(output,file));
  const info=await sharp(path.join(output,file)).metadata();
  manifest.push({key,src:'assets/previews/'+file,width:info.width,height:info.height,bytes:fs.statSync(path.join(output,file)).size,...metadata});
 }
 try{
  for(const id of lessons){
   await page.goto(base+'/lessons.html#'+id,{waitUntil:'domcontentloaded'});await page.locator('#lensStage canvas').waitFor();
   let delay=900;
   if(id==='replication'){await page.getByRole('slider',{name:'Fork speed',exact:true}).fill('100');delay=2700;}
   if(id==='population')delay=1700;
   if(id==='selection')delay=1800;
   if(id==='actionpotential'){await page.getByRole('button',{name:'Stimulate',exact:false}).click();delay=900;}
   await page.waitForTimeout(delay);
   await capture('lesson-'+id,page.locator('#lensStage canvas'),{route:'lessons.html#'+id,selector:'#lensStage canvas',kind:'Actual Experience-lens model',state:id==='actionpotential'?'Above-threshold stimulus applied':id==='replication'?'Fork speed 100%, copying in progress':'Default model conditions',alt:await page.locator('.les-title,h1.h1').first().innerText().catch(()=>id)});
  }
  for(const id of ['altitude','resistance','glucose']){
   await page.goto(base+'/reason.html#'+id,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Begin reasoning',exact:false}).click();
   await page.locator('#rzSteps section.rz-step').last().waitFor();
   await capture('reason-'+id,page.locator('#rzSteps section.rz-step').last(),{route:'reason.html#'+id,selector:'#rzSteps section.rz-step:last-of-type',kind:'Actual principle-selection stage',state:'First reasoning step, no answers selected or revealed',alt:await page.locator('h1').innerText()});
  }
  fs.writeFileSync(path.join(docs,'study-captures.json'),JSON.stringify({capturedFrom:base,manifest,errors},null,2));
  console.log(JSON.stringify({count:manifest.length,bytes:manifest.reduce((n,x)=>n+x.bytes,0),manifest,errors},null,2));
  if(errors.length)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
