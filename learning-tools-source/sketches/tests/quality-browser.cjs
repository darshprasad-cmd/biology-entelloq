const fs=require('node:fs/promises'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_NODE_MODULES?path.join(process.env.CODEX_NODE_MODULES,'playwright'):'C:/Users/darsh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),checks=[],errors=[],external=[];
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.md':'text/markdown'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://local');
 if(url.pathname==='/host.html'){res.writeHead(200,{'Content-Type':'text/html'});return res.end('<!doctype html><html lang="en"><title>Embedded sketch check</title><style>body{margin:0}header{height:80px;padding:20px;box-sizing:border-box}iframe{display:block;width:100%;height:calc(100dvh - 80px);border:0}</style><header>Existing application navigation</header><iframe title="Scientific sketch" src="/index.html?subject=biology&theme=light"></iframe></html>');}
 const p=path.resolve(root,'.'+decodeURIComponent(url.pathname));if(!p.startsWith(root+path.sep))throw Error('outside');
 res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(await fs.readFile(p));
}catch{res.writeHead(404);res.end();}});
function pass(name){checks.push(name);console.log('PASS',name);}
const layout=()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,editor:document.querySelector('.sketch-editor').getBoundingClientRect().toJSON(),workspace:document.querySelector('.sketch-workspace').getBoundingClientRect().toJSON(),buttons:[...document.querySelectorAll('.sketch-actions button,.sketch-view-actions button')].filter(b=>b.getClientRects().length).map(b=>({text:b.textContent,height:b.getBoundingClientRect().height}))});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 const context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce',acceptDownloads:true});
 context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});});
 await context.route('**/*',r=>{if(r.request().url().startsWith(base)||r.request().url().startsWith('data:'))return r.continue();external.push(r.request().url());return r.abort();});
 const page=await context.newPage();
 const ready=async(target=page)=>{await target.locator('canvas.interactive').waitFor();await target.waitForFunction(()=>!!localStorage.getItem(`entelloq:scientific-sketch:v1:${document.documentElement.dataset.subject}`));await target.getByRole('button',{name:'Fit drawing',exact:true}).click();await target.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
 try{
  for(const [name,subject,theme,width,height] of [['physics-desktop','physics','light',1280,1000],['biology-tablet','biology','light',768,1024],['biology-mobile','biology','dark',390,844],['physics-small','physics','dark',320,640]]){
   await page.setViewportSize({width,height});await page.goto(`${base}/index.html?subject=${subject}&theme=${theme}`);await ready();
   const sizes=await page.evaluate(layout);assert(!sizes.overflow,name+' overflow');assert(sizes.buttons.every(b=>b.height>=44),name+' touch target');
   const transition=await page.locator('.sketch-view-actions button').first().evaluate(b=>getComputedStyle(b).transitionDuration);assert.equal(transition,'0s');
   await page.screenshot({path:path.join(root,`qa/quality-${name}.png`),fullPage:true});
  }
  pass('Desktop, tablet, mobile and 320px layouts fit; wrapper controls have 44px targets and respect reduced motion');
  const before=await page.evaluate(()=>localStorage.getItem('entelloq:scientific-sketch:v1:physics'));
  const oldCanvas=await page.locator('canvas.interactive').elementHandle();
  await page.getByRole('button',{name:'Focus canvas',exact:true}).focus();await page.keyboard.press('Enter');
  await page.locator('.sketch-workspace.is-focused').waitFor();
  const full=await page.evaluate(layout);assert.equal(full.workspace.y,0);assert.equal(full.workspace.height,640);assert.equal(full.workspace.width,320);assert(!full.overflow);assert(full.editor.height>400);
  assert(await oldCanvas.evaluate(c=>c===document.querySelector('canvas.interactive')),'focus must not remount editor');
  await page.getByRole('button',{name:'Fit drawing',exact:true}).click();await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('.is-focused'));assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Focus canvas');assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
  assert.equal(await page.evaluate(()=>localStorage.getItem('entelloq:scientific-sketch:v1:physics')),before);
  pass('Keyboard focus mode uses the full viewport, keeps the same live canvas, restores focus on Escape and preserves stored scene bytes');
  await page.setViewportSize({width:390,height:844});await page.goto(`${base}/index.html?subject=biology&theme=dark`);await ready();
  await page.getByRole('button',{name:'Focus canvas',exact:true}).click();await page.getByRole('button',{name:'Fit drawing',exact:true}).click();
  await page.screenshot({path:path.join(root,'qa/quality-biology-focus.png'),fullPage:true});
  await page.getByTestId('main-menu-trigger').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.sketch-error').count(),0,'engine menu must remain usable');await page.locator('.dropdown-menu-item').filter({hasText:'Fit drawing'}).waitFor();await page.keyboard.press('Escape');
  await page.locator('.dropdown-menu-item').filter({hasText:'Fit drawing'}).waitFor({state:'hidden'});assert(await page.locator('.is-focused').isVisible(),'Escape closes the engine menu before leaving focus');
  await page.locator('label').filter({has:page.locator('[data-testid="toolbar-text"]')}).click();await page.locator('canvas.interactive').click({position:{x:25,y:180}});
  await page.locator('textarea.excalidraw-wysiwyg').fill('A labelled observation');await page.keyboard.press('Escape');
  await page.locator('textarea.excalidraw-wysiwyg').waitFor({state:'hidden'});assert(await page.locator('.is-focused').isVisible(),'Escape finishes editing text before leaving focus');
  await page.locator('label').filter({has:page.locator('[data-testid="toolbar-rectangle"]')}).click();await page.keyboard.press('Escape');
  assert(await page.locator('.is-focused').isVisible(),'Escape first returns an active drawing tool to selection');
  await page.locator('canvas.interactive').click({position:{x:15,y:180}});await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('.is-focused'));
  pass('Escape first closes the engine menu, finishes text, or returns a drawing tool to selection; idle Escape then leaves focus');
  await page.getByRole('button',{name:'Focus canvas',exact:true}).click();
  await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'entelloq:scientific-sketch:v1:biology',newValue:'peer-change'})));
  await page.waitForFunction(()=>document.querySelector('.sketch-status').dataset.kind==='warning');
  assert.equal(await page.locator('.sketch-status').getAttribute('data-kind'),'warning');assert(await page.locator('.sketch-status').isVisible());
  await page.getByRole('button',{name:'Exit focus',exact:true}).click();assert(await page.getByRole('button',{name:'Save this tab',exact:true}).isVisible());
  pass('A conflicting save remains visibly warned in focus mode; leaving focus exposes explicit recovery without replacing data');
  await page.goto(base+'/host.html');const frame=page.frames().find(f=>f.url().includes('/index.html'));await ready(frame);
  await page.evaluate(()=>document.querySelector('iframe').contentWindow.postMessage({type:'entelloq-learning:theme',theme:'dark',tokens:{accent:'#087f5b'}},location.origin));
  await frame.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await frame.getByRole('button',{name:'Focus canvas',exact:true}).click();
  await frame.evaluate(()=>{window.hostBacks=0;const back=e=>{if(e.key==='Escape'&&!e.defaultPrevented&&!document.querySelector('.sketch-workspace.is-focused'))window.hostBacks++;};document.addEventListener('keydown',back,true);document.addEventListener('keydown',back);});
  const contained=await frame.evaluate(layout);assert.equal(contained.workspace.y,0);assert.equal(contained.workspace.height,764);assert.equal(contained.workspace.width,390);
  assert.equal(await page.locator('header').isVisible(),true);assert.equal(await frame.locator('.excalidraw').evaluate(e=>getComputedStyle(e).getPropertyValue('--color-on-primary-container').trim()),'#80dfbb');
  await page.screenshot({path:path.join(root,'qa/quality-embedded-focus.png'),fullPage:true});
  await frame.getByRole('button',{name:'Exit focus',exact:true}).focus();await page.keyboard.press('Escape');await frame.waitForFunction(()=>!document.querySelector('.is-focused'));assert.equal(await frame.evaluate(()=>window.hostBacks),0);
  await frame.getByRole('button',{name:'Focus canvas',exact:true}).click();
  await frame.evaluate(()=>window.EntelloqSketch.destroy());assert.equal(await frame.locator('canvas.interactive').count(),0);assert.equal(await frame.evaluate(()=>document.body.style.overflow),'');
  pass('Inside an application iframe, focus stays contained, follows the parent Biology theme, consumes Escape before host Back and cleans up on teardown');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);pass('No page errors or external requests in the quality flows');
  await fs.writeFile(path.join(root,'qa/quality-browser-checks.json'),JSON.stringify({checkedAt:new Date().toISOString(),checks,errors,external,browser:'Chrome',boundary:'Real isolated browser, standalone module and same-origin iframe fixture; host deployment checks are separate'},null,2)+'\n');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
