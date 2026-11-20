/* Exercise the actual host's async asset helpers with controlled arrival and
 * decoding promises. Browser coverage separately verifies streaming HTML. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname,'../src/single-file/host.js'),'utf8');
const helpers = source.slice(source.indexOf('  function waitFor('),source.indexOf('  async function inBatches('));
function setup(unpack, delay = value => value) {
  let removed = 0;
  const context = vm.createContext({window:{DOMException},DOMException,unpack,clearTimeout,
    setTimeout:(callback,ms)=>setTimeout(callback,delay(ms)),
    document:{getElementById:()=>({textContent:'encoded-model',remove:()=>removed++})}});
  vm.runInContext(helpers + ';globalThis.api={waitFor,assetBytes};',context);
  return {api:context.api,removed:()=>removed};
}
const tick = () => new Promise(resolve=>setImmediate(resolve));

test('cosmetic shell refresh preserves a pending route and its recovery deadline',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../app.html'),'utf8');
  const refresh=app.slice(app.indexOf('function refreshShellNavigation('),app.indexOf('window.BioShell='));
  assert.match(app,/refresh:refreshShellNavigation/);
  const label={textContent:'Lab / Osmosis Lab'},active=[],pending={src:'./labs.html?embed=1#osmosis'};
  const sandbox=vm.createContext({current:'labs',BYKEY:{labs:{label:'Virtual Labs'},home:{label:'Explore'}},
    $:selector=>{assert.equal(selector,'#routeLabel');return label;},setActive:key=>active.push(key),pending,loadTimer:123,
    routeFromHash(){assert.fail('Relabeling must not navigate');},clearTimeout(){assert.fail('Relabeling must not cancel recovery');}});
  vm.runInContext(refresh+';globalThis.refresh=refreshShellNavigation;',sandbox);
  sandbox.refresh();assert.deepEqual(active,['labs']);assert.equal(label.textContent,'Virtual Labs / Osmosis Lab');
  assert.equal(sandbox.pending,pending);assert.equal(sandbox.loadTimer,123);
  sandbox.current=null;label.textContent='Home';sandbox.refresh();assert.equal(label.textContent,'Explore');
});

test('reading readiness releases only the current authored document after its DOM handlers',()=>{
  const tasks=[],events=[];
  const context={page:'learn.html',ready:true};
  const win={document:{readyState:'interactive'},BioqContext:context};
  const frame=context.frame={id:'viewFrame',source:'learn.html?embed=1',getAttribute(){return this.source;},isConnected:true,contentWindow:win,ownerDocument:{defaultView:{Event}},dispatchEvent:event=>events.push(event.type)};
  const sandbox=vm.createContext({setTimeout:callback=>tasks.push(callback),contextFor:target=>target.BioqContext});
  vm.runInContext(source.slice(source.indexOf('  function readingReady('),source.indexOf('  function loadFrame('))+';globalThis.ready=readingReady;',sandbox);
  sandbox.ready(win,context);assert.deepEqual(events,[],'Authored DOM callbacks finish first');tasks.shift()();assert.deepEqual(events,['load']);
  for(const change of [()=>{context.ready=false;},()=>{frame.isConnected=false;},()=>{win.BioqContext={};},()=>{win.document={readyState:'interactive'};},()=>{frame.source='solve.html?embed=1';}]){
    context.ready=true;frame.isConnected=true;win.BioqContext=context;win.document={readyState:'interactive'};sandbox.ready(win,context);change();tasks.shift()();assert.equal(events.length,1,'Unready, removed or replaced documents cannot complete a later load');
  }
  context.ready=true;frame.isConnected=true;win.BioqContext=context;win.document={readyState:'complete'};sandbox.ready(win,context);tasks.shift()();assert.equal(events.length,2,'Document completion does not prove the shell acknowledged its request');
  sandbox.ready(win,context);tasks.shift()();assert.equal(events.length,3,'Repeated valid completion is safe for the idempotent shell handler');
  context.page='lab.html';sandbox.ready(win,context);assert.equal(tasks.length,0,'Immersive models retain their own readiness');
});
test('same-document fragment reuse reports readiness without remounting the lesson',()=>{
  const old={page:'learn.html',url:new URL('https://biology.entelloq.com/learn.html?embed=1#topic/cell-structure/visual'),ready:true},events=[],ready=[];
  const owner={BioqContext:{url:new URL('https://biology.entelloq.com/app.html')}},win={BioqContext:old,HashChangeEvent:class {constructor(type){this.type=type;}},dispatchEvent:event=>events.push(event.type)};
  const frame={id:'viewFrame',contentWindow:win,ownerDocument:{defaultView:owner}};
  const sandbox=vm.createContext({pendingFrames:new WeakMap(),pages:new Set(['learn.html']),contextFor:target=>target.BioqContext,logical:(value,base)=>new URL(value,base),localPath:value=>new URL(value).pathname.slice(1),readingReady:(...args)=>ready.push(args)});
  vm.runInContext(source.slice(source.indexOf('  function loadFrame('),source.indexOf('  function navigate('))+';globalThis.load=loadFrame;',sandbox);
  assert.equal(sandbox.load(frame,'https://biology.entelloq.com/learn.html?embed=1',{setAttribute(){throw new Error('Fragment reuse must not rebuild content');}}),true);
  assert.deepEqual(events,['hashchange']);assert.equal(ready.length,1);assert.equal(ready[0][0],win);assert.equal(ready[0][1],old);assert.equal(old.ready,true);
});
test('same-URL document replacement invalidates readiness before the new DOM commits',()=>{
  const old={page:'learn.html',url:new URL('https://biology.entelloq.com/learn.html?embed=1'),ready:true};
  const owner={BioqContext:{url:new URL('https://biology.entelloq.com/app.html')}},win={BioqContext:old};
  const frame={contentWindow:win,ownerDocument:{defaultView:owner}},writes=[];
  const sandbox=vm.createContext({pendingFrames:new WeakMap(),pages:new Set(['learn.html']),assets:new Map(),contextFor:target=>target.BioqContext,
    logical:(value,base)=>new URL(value,base),localPath:value=>new URL(value).pathname.slice(1),render:()=>{assert.equal(old.ready,false,'Invalidate before mounting, while the previous WindowProxy/document still exists');return '<body>Reading</body>';}});
  vm.runInContext(source.slice(source.indexOf('  function loadFrame('),source.indexOf('  function navigate('))+';globalThis.load=loadFrame;',sandbox);
  assert.equal(sandbox.load(frame,old.url.href,{setAttribute(name,value){writes.push([name,value]);}}),true);
  assert.equal(old.ready,false);assert.equal(old.superseded,true);assert.deepEqual(writes.map(item=>item[0]),['srcdoc','src']);
});

test('superseded children cannot commit or navigate, while active parsing documents can',()=>{
  const writes=[],workspace={contentWindow:{}},context={page:'about.html',url:new URL('https://biology.entelloq.com/about.html'),ready:false};
  const win={BioqContext:context},sandbox=vm.createContext({URL,workspace,contextFor:target=>target.BioqContext,
    routeFor:url=>'#about/'+url.hash.slice(1),setOuter:(...args)=>writes.push(args),
    logical(){assert.fail('A superseded callback must not resolve or navigate a destination');}});
  vm.runInContext(source.slice(source.indexOf('  function ownsNavigation('),source.indexOf('  function render('))+
    source.slice(source.indexOf('  function navigate('),source.indexOf('  function showRoute('))+
    ';globalThis.api={commit,navigate};',sandbox);
  const initial=new URL('https://biology.entelloq.com/about.html#/home');sandbox.api.commit(win,initial,'replace');
  assert.equal(context.url,initial,'The active document may normalize its route before readiness');assert.equal(writes.length,1);
  context.superseded=true;const stale=new URL('https://biology.entelloq.com/about.html#/late');sandbox.api.commit(win,stale);
  assert.equal(context.url,initial,'Do not mutate the outgoing context');assert.equal(writes.length,1,'Do not overwrite the new outer route');
  assert.equal(sandbox.api.navigate(win,'labs.html#learning-kinetics'),true,'Stale navigation is consumed rather than falling through to the native frame');
});
test('shell completion recovers a late current document while retaining invalid-document errors',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../app.html'),'utf8');
  const load=app.slice(app.indexOf('function loadSection('),app.indexOf('function useShellNavigation('));
  for(const scenario of ['current','unready','wrong-page','empty','replaced']){
    const classes=()=>{const values=new Set();return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)};};
    const oops={classList:classes()},skel={classList:classes()},timers=[];
    const frame={contentWindow:{BioqContext:{page:'learn.html',ready:false}},contentDocument:{body:{children:[{},{}],innerHTML:'valid reading document'}}};
    const sandbox=vm.createContext({frame,oops,skel,BYKEY:{learn:{file:'learn.html'}},loadedSrc:null,pending:null,loadTimer:null,
      setTimeout:(callback,ms)=>{assert.equal(ms,15000);timers.push(callback);return timers.length;},clearTimeout(){},postTheme(){},useShellNavigation(){},failSection(){oops.classList.add('on');skel.classList.remove('on');}});
    vm.runInContext(load+';globalThis.load=loadSection;',sandbox);sandbox.load('learn','topic/cell-structure/visual',false);timers.shift()();
    assert.equal(oops.classList.contains('on'),true,'The real deadline shows recovery before completion');
    frame.contentWindow.BioqContext.ready=true;
    if(scenario==='unready')frame.contentWindow.BioqContext.ready=false;
    if(scenario==='wrong-page')frame.contentWindow.BioqContext.page='solve.html';
    if(scenario==='empty')frame.contentDocument.body={children:[],innerHTML:''};
    if(scenario==='replaced')sandbox.loadedSrc='./solve.html?embed=1';
    frame.onload();assert.equal(oops.classList.contains('on'),scenario!=='current',scenario+' completion handles recovery safely');
  }
});

test('retained reading frames lose route ownership on Home/immersive visits and regain it when selected',()=>{
  const workspace={},app={page:'app.html',url:new URL('https://biology.entelloq.com/app.html#about'),frame:workspace};
  const owner={BioqContext:app},frame={id:'viewFrame',isConnected:true,ownerDocument:{defaultView:owner}};
  const context={page:'about.html',frame,ready:false},sandbox=vm.createContext({workspace,contextFor:win=>win.BioqContext});
  vm.runInContext(source.slice(source.indexOf('  function ownsNavigation('),source.indexOf('  function commit('))+';globalThis.owns=ownsNavigation;',sandbox);
  assert.equal(sandbox.owns(context),true,'The selected parsing document owns its initial route');
  for(const hash of ['#home','#lab','#universe','#labs/learning-kinetics']){app.url.hash=hash;assert.equal(sandbox.owns(context),false,hash+' owns the outer route instead');}
  app.url.hash='#about';assert.equal(sandbox.owns(context),true,'A retained section can be selected again');
  app.superseded=true;assert.equal(sandbox.owns(context),false,'Children of a replaced workspace are stale too');
  app.superseded=false;frame.isConnected=false;assert.equal(sandbox.owns(context),false,'Removed frames cannot navigate');
});

test('cancellation between arrival and continuation prevents specimen decoding',async()=>{
  let decodes = 0;
  const {api} = setup(async()=>{decodes++;throw new Error('corrupt payload');});
  const controller = new AbortController();
  const asset = {available:Promise.resolve(),elementId:'model'};
  const request = api.assetBytes(asset,controller.signal);
  queueMicrotask(()=>controller.abort());
  await assert.rejects(request,error=>error.name==='AbortError');
  await tick();
  assert.equal(decodes,0);
  assert.equal(asset.decoding,undefined);
});
test('one cancelled request does not discard shared decoding or a later retry',async()=>{
  let complete,decodes = 0;
  const {api,removed} = setup(()=>{decodes++;return new Promise(resolve=>{complete=resolve;});});
  const controller = new AbortController(), asset = {available:Promise.resolve(),elementId:'model'};
  const cancelled = api.assetBytes(asset,controller.signal);
  await tick();
  const surviving = api.assetBytes(asset);
  controller.abort();
  await assert.rejects(cancelled,error=>error.name==='AbortError');
  const bytes = new Uint8Array([0x67,0x6c,0x54,0x46]);
  complete(bytes);
  assert.equal(await surviving,bytes);
  assert.equal(await api.assetBytes(asset),bytes);
  assert.equal(decodes,1); assert.equal(removed(),1);
});
test('a shared corrupt decode is handled after its caller has cancelled',async()=>{
  let fail;
  const {api} = setup(()=>new Promise((_,reject)=>{fail=reject;}));
  const controller = new AbortController(), asset = {available:Promise.resolve(),elementId:'model'};
  const request = api.assetBytes(asset,controller.signal);
  await tick(); controller.abort();
  await assert.rejects(request,error=>error.name==='AbortError');
  fail(new Error('invalid gzip')); await tick();
  await assert.rejects(api.assetBytes(asset),/could not be read.*reload/i);
});
test('a stalled arrival rejects within the host deadline instead of waiting forever',async()=>{
  const {api} = setup(()=>{throw new Error('must not decode');},()=>5);
  await assert.rejects(api.assetBytes({available:new Promise(()=>{}),elementId:'model'}),/taking too long.*try again/i);
});
