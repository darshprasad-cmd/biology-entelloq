/* Real app -> lab iframe -> all eight rendered scales. Camera remains off. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
const {chromium}=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules'),'__scale_browser__.cjs'))('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3006';
const output=path.resolve(root,process.env.BIOLOGY_SCALE_OUTPUT||'docs/scale-journey-detail/preview');
fs.mkdirSync(output,{recursive:true});
const report={base,complete:false,errors:[],stages:[],checks:[]};
async function hit(page,frame,selector){
  const inner=await frame.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,inBounds:r.x>=0&&r.y>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
  assert.ok(inner.width>=44&&inner.height>=44&&inner.inBounds&&inner.hit,selector+JSON.stringify(inner));
  assert.equal(await page.evaluate(p=>{const f=document.querySelector('#launchFrame'),r=f.getBoundingClientRect();return document.elementFromPoint(r.x+p.x,r.y+p.y)===f;},inner),true,'outer page intercepts '+selector);
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'});
    await context.route('https://unpkg.com/**',r=>r.abort());
    await context.addInitScript(()=>{window.__cameraRequests=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__cameraRequests++;throw Error('Camera forbidden');};});
    const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.errors.push(e.message));
    for(const file of ['app.html','lab.html']){const response=await page.request.get(base+'/'+file+'?check=scale-detail');assert.equal(response.status(),200);assert.ok((await response.body()).equals(fs.readFileSync(path.join(root,file))),file+' byte match');}
    await page.goto(base+'/app.html#lab',{waitUntil:'domcontentloaded'});
    const frame=page.frameLocator('#launchFrame');
    await frame.locator('#scalebtn').waitFor({state:'visible',timeout:90000});
    await page.waitForFunction(()=>document.querySelector('#launchFrame').contentWindow.__LAB?.ready,null,{timeout:90000});
    const lab=page.frames().find(f=>/lab\.html/.test(f.url()));assert.ok(lab);
    await lab.evaluate(()=>__LAB.intro()?.skip());
    await hit(page,frame,'#specbtn');await frame.locator('#specbtn').click();
    await page.waitForFunction(()=>document.querySelector('#launchX').hidden);await hit(page,frame,'#pickclose');await frame.locator('#pickclose').click();
    await page.waitForFunction(()=>!document.querySelector('#launchX').hidden);
    await frame.locator('#histologybtn').click();await page.waitForFunction(()=>document.querySelector('#launchX').hidden);
    await hit(page,frame,'#featureclose');await frame.locator('[data-choice="liver"]').click();
    await hit(page,frame,'#hisClose');await frame.locator('#hisClose').click();
    await page.waitForFunction(()=>!document.querySelector('#launchX').hidden);
    report.checks.push('real nested specimen chooser, histology picker and microscope exit hit tests');
    await frame.locator('#scalebtn').click();await page.waitForFunction(()=>document.querySelector('#launchX').hidden);
    await hit(page,frame,'#zoomverse .zv-x');
    assert.equal(await frame.locator('.zv-nav button').count(),8);
    assert.equal(await frame.locator('.zv-motion').getAttribute('aria-pressed'),'false','reduced motion defaults to still models');
    for(let stage=0;stage<8;stage++){
      await frame.locator('.zv-nav [data-stage="'+stage+'"]').click();
      await lab.waitForFunction(i=>__LAB.zoomverse().currentStage===i,stage);
      const item=await lab.evaluate(()=>({index:__LAB.zoomverse().currentStage,name:document.querySelector('.zv-name').textContent,parts:__LAB.zoomverse().parts(),states:__LAB.zoomverse().stageStates()}));
      assert.ok(item.parts.length>=3);assert.ok(item.states.every(s=>Number.isFinite(s.scale)&&Number.isFinite(s.opacity)));
      for(const part of item.parts){await frame.locator('.zv-parts [data-part="'+part.id+'"]').click();assert.equal(await lab.evaluate(()=>__LAB.zoomverse().selectedPart),part.id);assert.equal(await frame.locator('.zv-part-note').textContent(),part.note);}
      await frame.locator('.zv-nav [data-stage="'+stage+'"]').click();
      report.stages.push({name:item.name,parts:item.parts.length});
      await page.screenshot({path:path.join(output,'desktop-'+stage+'.png')});
    }
    await frame.locator('.zv-nav [data-stage="1"]').click();
    const rotationBefore=await lab.evaluate(()=>__LAB.zoomverse().stageStates().find(s=>s.name==='Cell').rotation);
    await frame.locator('.zv-rotate').click();
    const bounds=await page.locator('#launchFrame').boundingBox();
    await page.mouse.move(bounds.x+500,bounds.y+350);await page.mouse.down();await page.mouse.move(bounds.x+580,bounds.y+390,{steps:8});await page.mouse.up();
    const rotationAfter=await lab.evaluate(()=>__LAB.zoomverse().stageStates().find(s=>s.name==='Cell').rotation);assert.notDeepEqual(rotationAfter,rotationBefore);
    await frame.locator('.zv-nav [data-stage="1"]').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await lab.evaluate(()=>__LAB.zoomverse().currentStage),2,'keyboard navigation reaches the viewer, not lab tools');
    await page.emulateMedia({reducedMotion:'no-preference'});await frame.locator('.zv-motion').click();
    assert.equal(await frame.locator('.zv-motion').getAttribute('aria-pressed'),'true');
    await page.emulateMedia({reducedMotion:'reduce'});
    await lab.waitForFunction(()=>document.querySelector('.zv-motion').getAttribute('aria-pressed')==='false');
    await lab.evaluate(()=>{const z=__LAB.zoomverse(),v=z.zoom;z.setZoom(NaN);z.update(16);if(!Number.isFinite(z.zoom))throw Error('nonfinite zoom');z.setZoom(v);z.update(16);});
    report.checks.push('all stages and subpart buttons; finite transitions; actual pointer rotation; reduced-motion default');
    for(const viewport of [{width:390,height:844},{width:320,height:640},{width:844,height:390}]){
      await page.setViewportSize(viewport);
      await lab.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      await hit(page,frame,'#zoomverse .zv-x');await hit(page,frame,'.zv-next');await hit(page,frame,'.zv-motion');
      await frame.locator('.zv-nav [data-stage="5"]').click();
      if(viewport.width<=390){
        await hit(page,frame,'.zv-inspect-toggle');await frame.locator('.zv-inspect-toggle').click();
        await frame.locator('.zv-parts [data-part="backbone-a"]').click();
        assert.equal(await lab.evaluate(()=>__LAB.zoomverse().selectedPart),'backbone-a');
        await frame.locator('.zv-inspect-toggle').click();
        await lab.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      }
      const extents=await lab.evaluate(()=>{const info=document.querySelector('.zv-info').getBoundingClientRect(),foot=document.querySelector('.zv-controls').getBoundingClientRect();return{width:innerWidth,height:innerHeight,info:{x:info.x,y:info.y,right:info.right,bottom:info.bottom},foot:{x:foot.x,y:foot.y,right:foot.right,bottom:foot.bottom}};});
      assert.ok(extents.info.x>=0&&extents.info.right<=extents.width+1&&extents.info.bottom<=extents.height);
      await page.screenshot({path:path.join(output,'app-dna-'+viewport.width+'.png')});
      assert.ok(extents.info.bottom<=extents.foot.y+1||extents.foot.right<=extents.info.x,'inspection and navigation must not overlap: '+JSON.stringify(extents));
    }
    await frame.locator('.zv-x').click();await page.waitForFunction(()=>!document.querySelector('#launchX').hidden);
    assert.equal(await lab.evaluate(()=>__LAB.zoomverse().isOpen()),false);
    await hit(page,frame,'#specbtn');
    await page.locator('#launchX').click();await page.waitForFunction(()=>!document.querySelector('#launcher').classList.contains('on'));
    assert.equal(await lab.evaluate(()=>__cameraRequests),0);assert.deepEqual(report.errors,[]);
    report.checks.push('phone portrait and landscape; back-to-lab then Exit-lab; no camera requests or page errors');report.complete=true;
    console.log(JSON.stringify(report,null,2));
  }finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
