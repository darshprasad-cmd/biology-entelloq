/* Real app.html + its real launcher iframe. Child uses source shell, microscope
 * and bridge; only the WebGL scale scene is represented by its real CSS/close
 * markup. This isolates cross-document hit testing without a WebGL context. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
const modules=process.env.BIOLOGY_PLAYWRIGHT_MODULES||path.resolve(root,'../biology-entelloq/node_modules');
const {chromium}=createRequire(path.join(modules,'__app_lab_exits__.cjs'))('playwright');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const app=read('app.html'),lab=read('lab.html'),main=read('src/lab/main.js');
const shell=read('src/lab/shell.js').replace(/^export /gm,'');
const anatomy=read('src/lab/anatomy.js').replace(/^export /gm,'');
const histology=read('src/lab/histology.js').replace(/^export /gm,'');
const bridge=main.match(/\/\/ BIOQ_LAB_MODAL_BRIDGE_START([\s\S]*?)\/\/ BIOQ_LAB_MODAL_BRIDGE_END/)[1];
const journeyCSS=read('src/lab/zoomverse.js').match(/style\.textContent = `([\s\S]*?)`;/)[1];
const styles=(lab.split('</head>')[0].match(/<style\b[^>]*>[\s\S]*?<\/style>/g)||[]).join('\n');
const child=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${styles}
<body><div id="stage"></div><script>${anatomy}\n${shell}\n${histology}\n${bridge}
window.shell=buildShell(document.body);document.querySelector('#shellcss').textContent=SHELL_CSS;
shell.mountCards(SPECIMENS,id=>shell.setSpecimen(SPECIMENS[id],[]));shell.setSpecimen(SPECIMENS.frog,[]);
window.microscope=createHistology(document.body);
const journey=document.createElement('div');journey.id='zoomverse';journey.innerHTML='<div class="zv-top"><span></span><button class="zv-x" type="button">Esc ×</button></div>';document.body.appendChild(journey);
journey.querySelector('.zv-x').onclick=()=>journey.classList.remove('on','vis');
shell.setFeatureAvailability({histology:true,zoomverse:true});
shell.on('feature',id=>{
  if(id==='histology')shell.showFeatureChoices({title:'Histology reference slides',note:'Illustrative teaching reference.',items:[{id:'epidermis',label:'Skin',detail:'H&E · Frog reference'}],onChoose:id=>microscope.open('reference-'+id,{name:'Frog reference · Skin',tissue:id,species:'frog'})});
  if(id==='zoomverse')journey.classList.add('on','vis');
});
function fixtureTick(){publishLabModalState();requestAnimationFrame(fixtureTick);}fixtureTick();
window.fixtureReady=true;
<\/script><style>${journeyCSS}</style>`;
const origin='http://app-lab-exits.test';
const views=[{width:1440,height:1000},{width:768,height:1024},{width:390,height:844},{width:320,height:640},{width:844,height:390}];
async function settle(page){await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function readyLab(page){
  const frame=await (await page.locator('#launchFrame').elementHandle()).contentFrame();
  await frame.waitForFunction(()=>window.fixtureReady===true);
  await frame.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#pick')).opacity)===0);
  return frame;
}
async function exitLab(page){
  await page.locator('#launchX').tap();
  await page.waitForFunction(()=>location.hash==='#home'&&!document.querySelector('#launcher').classList.contains('on'));
  // The old direct-entry bug briefly closed, then popstate reopened #lab.
  await page.waitForTimeout(250);
  assert.equal(new URL(page.url()).hash,'#home');
  assert.equal(await page.locator('#launcher').evaluate(el=>el.classList.contains('on')),false);
  assert.equal(await page.evaluate(()=>window.fixtureHistory.backs),0,'Exit Lab must not traverse an unknown previous history entry');
}
const backgroundWidgets='#eqx-fab,#eqx-panel,#bioq-ai,#bio-background-toggle';
async function widgetState(page){return page.locator(backgroundWidgets).evaluateAll(elements=>elements.map(el=>({id:el.id,visibility:getComputedStyle(el).visibility})));}
async function outerExit(page,hidden){
  await page.waitForFunction(hidden=>document.querySelector('#launchX').hidden===hidden,hidden);
  assert.equal(await page.locator('#launchX').isVisible(),!hidden);
  assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('lab-modal-active')),hidden);
  if(hidden){
    const widgets=await widgetState(page);assert.ok(widgets.length>=3,'actual parent widgets mounted');
    assert.ok(widgets.every(widget=>widget.visibility==='hidden'),JSON.stringify(widgets));
  }
}
async function childExit(page,frame,selector){
  const inner=await frame.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,hit:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
  assert.ok(inner.w>=44&&inner.h>=44&&inner.hit,JSON.stringify({selector,inner}));
  const outer=await page.evaluate(point=>{const iframe=document.querySelector('#launchFrame'),r=iframe.getBoundingClientRect();return document.elementFromPoint(r.x+point.x,r.y+point.y)===iframe;},inner);
  assert.equal(outer,true,'outer app must not intercept '+selector);
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
  const errors=[],pictures=[];
  try{
    for(const viewport of views){
      const context=await browser.newContext({viewport,hasTouch:true,reducedMotion:'reduce'});
      await context.route('**/*',route=>{
        const url=new URL(route.request().url());
        if(url.origin!==origin)return route.abort();
        if(url.pathname==='/app.html')return route.fulfill({contentType:'text/html',body:app});
        if(url.pathname==='/lab.html')return route.fulfill({contentType:'text/html',body:child});
        if(url.pathname==='/universe.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Other immersive route</title>'});
        const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
        const types={'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.html':'text/html'};
        return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
      });
      const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>{
        window.fixtureHistory={pushes:0,backs:0};
        for(const [method,counter] of [['pushState','pushes'],['back','backs']]){
          const original=history[method];history[method]=function(...args){window.fixtureHistory[counter]++;return original.apply(this,args);};
        }
      });
      // A restored/deep-linked Lab must not push a duplicate #lab entry. Closing
      // the inner study first must leave Exit Lab usable and return to Home.
      await page.goto(origin+'/app.html#lab');
      const directFrame=await readyLab(page);
      assert.equal(await page.evaluate(()=>window.fixtureHistory.pushes),0,'direct entry restores, rather than pushes, the lab route');
      await directFrame.locator('#scalebtn').tap();await outerExit(page,true);
      await childExit(page,directFrame,'#zoomverse .zv-x');
      await directFrame.locator('#zoomverse .zv-x').tap();await outerExit(page,false);
      await exitLab(page);
      await page.goto(origin+'/app.html#home');
      await page.locator('#home [data-go="lab"]').first().click();
      const frame=await readyLab(page);
      assert.equal(await page.evaluate(()=>window.fixtureHistory.pushes),1,'deliberate Home to Lab navigation pushes exactly once');
      await outerExit(page,false);
      const initialWidgets=await widgetState(page);
      const frameBounds=await page.locator('#launchFrame').evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight};});
      assert.ok(frameBounds.top>=56&&Math.abs(frameBounds.bottom-frameBounds.viewport)<=1,JSON.stringify(frameBounds));
      await childExit(page,frame,'#specbtn');
      assert.match(await page.locator('#launchX').textContent(),/Exit lab/);
      // Neither the parent itself, a wrong origin, nor malformed values can
      // impersonate the current embedded Lab's boolean state message.
      await page.evaluate(()=>window.postMessage({bioqLabModal:true},location.origin));
      await frame.evaluate(()=>parent.dispatchEvent(new MessageEvent('message',{source:window,origin:'https://untrusted.example',data:{bioqLabModal:true}})));
      await frame.evaluate(()=>parent.postMessage({bioqLabModal:'true'},location.origin));
      await settle(page);await outerExit(page,false);
      await frame.locator('#histologybtn').tap();await outerExit(page,true);
      assert.equal(await page.locator('#launchFrame').evaluate(el=>el.getBoundingClientRect().height),frameBounds.height,'modal ownership must not resize the specimen');
      await childExit(page,frame,'#featureclose');
      await frame.locator('#featureclose').tap();await outerExit(page,false);
      assert.deepEqual(await widgetState(page),initialWidgets,'closing the child modal restores parent widget visibility');
      assert.equal(await page.locator('#launcher').evaluate(el=>el.classList.contains('on')),true);
      await frame.locator('#histologybtn').tap();await outerExit(page,true);
      await frame.locator('[data-choice="epidermis"]').tap();
      await frame.waitForFunction(()=>microscope.isOpen());await outerExit(page,true);
      await childExit(page,frame,'#hisClose');
      await frame.locator('#hisClose').tap();await outerExit(page,false);
      assert.equal(await page.locator('#launcher').evaluate(el=>el.classList.contains('on')),true);
      await frame.locator('#scalebtn').tap();await outerExit(page,true);
      await childExit(page,frame,'#zoomverse .zv-x');
      await frame.locator('#zoomverse .zv-x').tap();await outerExit(page,false);
      await frame.locator('#helpbtn').tap();await outerExit(page,true);
      await childExit(page,frame,'#keysclose');await frame.locator('#keysclose').tap();await outerExit(page,false);
      await frame.locator('#specbtn').tap();await outerExit(page,true);
      await childExit(page,frame,'#pickclose');await frame.locator('#pickclose').tap();await outerExit(page,false);
      await exitLab(page);
      await page.locator('#home [data-go="lab"]').first().click();await outerExit(page,false);
      assert.equal(await page.evaluate(()=>window.fixtureHistory.pushes),2,'a deliberate warm re-entry pushes exactly once');
      // A warm iframe can retain its modal while browser Back closes the app
      // launcher. Reopening must restore the handoff, not reveal a second exit.
      await frame.locator('#histologybtn').tap();await outerExit(page,true);
      await page.goBack();
      await page.waitForFunction(()=>!document.querySelector('#launcher').classList.contains('on'));
      await page.locator('#home [data-go="lab"]').first().click();await outerExit(page,true);
      await childExit(page,frame,'#featureclose');
      const picture=path.join(os.tmpdir(),'biology-app-modal-exit-'+viewport.width+'x'+viewport.height+'.png');
      await page.screenshot({path:picture});pictures.push(picture);
      await frame.locator('#featureclose').tap();await outerExit(page,false);
      // Navigating the frame resets ownership; an old Lab state cannot hide
      // the exit of a different immersive page.
      await page.locator('[data-go="universe"]').first().evaluate(el=>el.click());
      await page.locator('#launchFrame').evaluate(el=>new Promise(resolve=>el.contentDocument?.readyState==='complete'?resolve():el.addEventListener('load',resolve,{once:true})));
      await outerExit(page,false);
      assert.equal(await page.locator('#launchFrame').evaluate(el=>el.getBoundingClientRect().top),0,'non-Lab immersive routes retain full height');
      await page.locator('#launchX').tap();
      await page.waitForFunction(()=>!document.querySelector('#launcher').classList.contains('on'));
      await context.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({viewports:views.length,routingFlows:['direct-entry-modal-close-exit','home-lab-exit','warm-reentry-back'],errors,pictures},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
