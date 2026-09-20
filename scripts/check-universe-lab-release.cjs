/* Final local/live artifact and touch smoke. No camera or AI service calls. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
const {chromium}=createRequire(path.join(process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules'),'__release__.cjs'))('playwright');
const base=process.env.BIOLOGY_PREVIEW_URL||'http://127.0.0.1:3006';
const output=path.resolve(root,process.env.BIOLOGY_RELEASE_OUTPUT||'docs/lab-mobile-undo/release-smoke');
const report={base,errors:[],artifacts:{},complete:false,limit:'Software WebGL and synthetic pin input; no camera recognition or physical touch hardware claim.'};
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
    await context.route('https://unpkg.com/**',route=>route.abort());
    await context.addInitScript(()=>{window.__cameraRequests=0;if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=()=>{window.__cameraRequests++;throw Error('Camera forbidden in release smoke');};});
    const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>report.errors.push(e.message));
    for(const file of ['universe.html','lab.html']){
      const response=await page.request.get(base+'/'+file+'?release=universe-undo');assert.equal(response.status(),200);
      const bytes=await response.body();assert.ok(bytes.equals(fs.readFileSync(path.join(root,file))),file+' exact published artifact');
      report.artifacts[file]=crypto.createHash('sha256').update(bytes).digest('hex');
    }
    await page.goto(base+'/universe.html#cell',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__UNI?.count===13,null,{timeout:60000});
    await page.locator('#uPartsToggle').tap();assert.equal(await page.locator('.u-parts-list [data-part]').count(),15);
    await page.locator('[data-part="pores"]').tap();assert.match(await page.locator('#uPanelTitle').textContent(),/Pore/i);
    await page.locator('.u-panel .close').tap();await page.locator('#uInspect').tap();
    await page.locator('#uInspect').blur();await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(()=>__UNI.pos),7);assert.notEqual(await page.evaluate(()=>__UNI.inspectionView.yaw),0);
    await page.screenshot({path:path.join(output,'universe-phone.png')});
    assert.equal(await page.evaluate(()=>__cameraRequests),0);
    await page.goto(base+'/lab.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__LAB?.ready&&window.__LAB?.dissection,null,{timeout:60000});
    await page.evaluate(()=>__LAB.intro()?.skip());
    assert.equal(await page.evaluate(()=>document.body.classList.contains('bioq-phone')),true);
    assert.equal(await page.evaluate(()=>__LAB.parts.find(p=>p.id==='skin').mesh.userData.preparedExterior?.specimenId),'frog');
    await page.locator('#helpbtn').tap();await page.locator('#keysclose').tap();assert.equal(await page.locator('#keys').evaluate(el=>el.classList.contains('on')),false);
    await page.locator('#specbtn').tap();await page.locator('#pickclose').tap();assert.equal(await page.locator('#pick').evaluate(el=>el.classList.contains('gone')),true);
    assert.equal(await page.locator('#undobtn').isDisabled(),true);
    await page.evaluate(()=>{
      const l=__LAB; l.setTool('pins');l.camera.updateMatrixWorld();
      for(const p of l.parts.filter(p=>p.mesh.visible)){
        p.mesh.updateWorldMatrix(true,false);const a=p.mesh.geometry.attributes.position;
        for(let i=0;i<a.count;i+=Math.max(1,Math.floor(a.count/48))){
          const v=new l.THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(p.mesh.matrixWorld).project(l.camera),x=(v.x+1)/2,y=(1-v.y)/2;
          if(l.dissection.pick(x,y)?.object.userData.partId!==p.id)continue;
          l.feed(x,y,0,false,0);l.feed(x,y,1,true,0);l.feed(x,y,0,false,0);
          if(l.dissection.state.pinned.size)return;
        }
      }
      throw Error('No real pin contact found');
    });
    await page.locator('#undobtn').tap();assert.equal(await page.evaluate(()=>__LAB.dissection.state.pinned.size),0);
    await page.locator('#helpbtn').tap();await page.locator('#keysclose').tap();
    await page.screenshot({path:path.join(output,'lab-phone.png')});
    await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>!document.body.classList.contains('bioq-phone'));
    assert.equal(await page.evaluate(()=>__cameraRequests),0);assert.deepEqual(report.errors,[]);report.complete=true;
    console.log(JSON.stringify(report,null,2));
  }finally{fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
