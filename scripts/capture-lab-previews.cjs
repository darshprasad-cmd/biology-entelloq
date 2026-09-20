/* Capture the real, working lab diagrams. No illustration generator or device access.
   Start the site's static server, then run:
   BIOLOGY_PREVIEW_BASE=http://127.0.0.1:3014 node scripts/capture-lab-previews.cjs
   Optional: --ids=microscope,osmosis (recapture only those labs).
   Requires Playwright and Python/Pillow. PNG intermediates stay in the OS temp folder. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {createRequire}=require('node:module'),{spawnSync}=require('node:child_process');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||'C:/Users/darsh/biology-entelloq/node_modules';
const {chromium}=createRequire(path.join(modules,'__previews__.cjs'))('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'assets/previews');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'biology-lab-previews-'));
const base=process.env.BIOLOGY_PREVIEW_BASE||'http://127.0.0.1:3014';
const only=process.argv.find(x=>x.startsWith('--ids='))?.slice(6).split(',');
const captures=[
 ['microscope','.bx-view canvas',async p=>{await p.getByRole('button',{name:'40x',exact:true}).click();await p.getByRole('button',{name:'Apply stain',exact:true}).click();}],
 ['osmosis','.ex-canvas',async p=>{await p.getByRole('button',{name:'Advance 10 s',exact:true}).click({clickCount:3});}],
 ['enzyme-kinetics','.bx-view canvas'],
 ['photosynthesis-rate','.ex-canvas',async p=>{await p.getByRole('button',{name:'Advance 10 s',exact:true}).click();}],
 ['cellular-respiration','.ex-canvas'],
 ['mitosis','.ex-canvas',async p=>{await p.getByRole('button',{name:'Advance cell-cycle stage'}).click({clickCount:2});}],
 ['mendelian-genetics','.ex-table-wrap',async p=>{await p.getByRole('combobox',{name:'Inheritance model'}).selectOption('dihybrid');await p.getByRole('button',{name:'Breed offspring sample'}).click();}],
 ['dna-protein','.ex-canvas',async p=>{await p.getByRole('button',{name:'Read next codon',exact:true}).click({clickCount:6});}],
 ['heart-physiology','.ex-canvas'],
 ['heart-rate','#hrCan'],
 ['gas-exchange','.ex-canvas'],
 ['natural-selection','#nsArena'],
 ['predator-prey','.bx-view canvas',async p=>{await p.getByRole('button',{name:'Advance 1 model time unit',exact:true}).click({clickCount:12});}],
 ['gel-electrophoresis','.bx-view canvas',async p=>{await p.getByRole('button',{name:'Load the wells',exact:true}).click();await p.getByRole('button',{name:'Advance 10 model minutes',exact:true}).click({clickCount:6});}],
 ['dna-extraction','#mlxdView canvas',async p=>{for(let i=0;i<5;i++)await p.locator('.mlx-step.now').click();}],
 ['pcr','#mlxpView canvas',async p=>{await p.locator('#mlxpRun').click();}],
 ['plant-investigation','.bx-view svg'],
 ['ecosystem-investigation','.bx-view svg'],
 ...['heart','frog','fish','earthworm','cockroach'].map(specimen=>[specimen+'-dissection','iframe'])
];
async function main(){
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:process.env.BIOLOGY_BROWSER_CHANNEL||'msedge',args:['--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:2,reducedMotion:'reduce',colorScheme:'dark'});
 // The optional remote bloom dependency is unrelated to specimen preparation.
 await context.route('https://unpkg.com/**',r=>r.abort());
 const page=await context.newPage();
 const failures=[];
 try{
  await page.goto(base+'/labs.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';});
  // Fixed site navigation must not occlude the diagram after it is scrolled
  // into view. Its layout stays intact; the native bench drawing is untouched.
  await page.addStyleTag({content:'header.nav{visibility:hidden!important}'});
  await page.evaluate(()=>document.fonts.ready);
  const registered=await page.evaluate(()=>LABS.all().map(l=>l.id));
  if(registered.length!==23||captures.some(([id])=>!registered.includes(id)))throw new Error('The preview list must match all 23 registered labs.');
  for(const [id,selector,prepare] of captures.filter(([id])=>!only||only.includes(id))){
   try{
    await page.evaluate(id=>{location.hash=id;},id);
    await page.waitForFunction(id=>document.querySelector('.lb-page h1')?.textContent===LABS.get(id).title,id);
    const png=path.join(temp,id+'.png');
    if(selector==='iframe'){
     const iframe=page.locator('#labStage iframe');
     await iframe.scrollIntoViewIfNeeded();
     await page.waitForFunction(()=>document.querySelector('#labStage iframe')?.getAttribute('aria-busy')==='false',null,{timeout:60000});
     const frame=await (await iframe.elementHandle()).contentFrame();
     await frame.waitForFunction(()=>window.__LAB?.ok&&window.__LAB?.ready!==false);
     await frame.evaluate(()=>document.fonts.ready);
     // Native WebGL capture immediately after rendering preserves the real scene
     // without unrelated theatre buttons covering the specimen in a small thumbnail.
     const url=await frame.evaluate(()=>{window.__LAB.environment().render();return document.querySelector('#stage canvas').toDataURL('image/png');});
     fs.writeFileSync(png,Buffer.from(url.split(',')[1],'base64'));
    }else{
     if(prepare)await prepare(page);
     const target=page.locator('#labStage '+selector).first();
     await target.scrollIntoViewIfNeeded();
     // Let the bench's own animation/resize loop draw the selected state.
     await page.waitForTimeout(120);
     await target.screenshot({path:png,animations:'disabled'});
    }
    const result=spawnSync(process.env.BIOLOGY_PYTHON||'python',['-c',
     'from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert("RGB"); im.thumbnail((960,720),Image.Resampling.LANCZOS); im.save(sys.argv[2],"WEBP",quality=86,method=6)',
     png,path.join(out,'lab-'+id+'.webp')],{encoding:'utf8'});
    if(result.status!==0)throw new Error(result.stderr||'WebP conversion failed');
    console.log('CAPTURED',id,fs.statSync(path.join(out,'lab-'+id+'.webp')).size+' bytes');
   }catch(e){failures.push(id+': '+e.message);console.error('FAILED',id,e.message);}
  }
 }finally{await browser.close();}
 if(failures.length)throw new Error(failures.join('\n'));
 console.log('Actual lab previews saved in',out,'; native originals:',temp);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
