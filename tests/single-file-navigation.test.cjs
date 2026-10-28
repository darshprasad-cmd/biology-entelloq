/* Exercise the real portable host with real compressed pages and a small browser
 * boundary. This covers route/history ownership; browser QA covers actual frames. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), zlib = require('node:zlib');
const source = fs.readFileSync(path.join(__dirname,'../src/single-file/host.js'),'utf8');
const bridge = fs.readFileSync(path.join(__dirname,'../src/single-file/bridge.js'),'utf8');
class BrowserEvent {constructor(type, options = {}) {this.type = type; Object.assign(this, options);}}
const clone = value => value === undefined ? undefined : structuredClone(value);

async function setup(href = 'https://biology.entelloq.com/', state = null) {
  let index = 0, address = new URL(href);
  const entries = [{href:address.href, state:clone(state)}], handlers = new Map(), events = [];
  const location = {get href(){return address.href;}, get hash(){return address.hash;}, get search(){return address.search;}, get pathname(){return address.pathname;}, get protocol(){return address.protocol;}, get origin(){return address.origin;}};
  function dispatch(event) {events.push(event); for (const fn of handlers.get(event.type) || []) fn(event);}
  const history = {
    get length(){return entries.length;}, get state(){return entries[index].state;},
    replaceState(value, unused, url){address=new URL(url,address);entries[index]={href:address.href,state:clone(value)};},
    pushState(value, unused, url){address=new URL(url,address);entries.splice(index+1);entries.push({href:address.href,state:clone(value)});index++;},
    go(delta){const next=index+delta;if(next<0||next>=entries.length)return;index=next;address=new URL(entries[index].href);dispatch(new BrowserEvent('popstate',{state:history.state}));},
    back(){history.go(-1);}, forward(){history.go(1);}
  };
  const workspace = {contentWindow:{},srcdoc:'',id:'bioq-workspace'}, loading={hidden:false};
  const manifest={bridge:'',assets:{},pages:Object.fromEntries(['index','app','learn','lessons','labs','lab','universe'].map(name=>[name+'.html',zlib.gzipSync('<!doctype html><html><head><title>'+name+'</title></head><body>'+name+'</body></html>').toString('base64')]))};
  const nodes = {'bioq-workspace':workspace,'bioq-loading':loading,'bioq-manifest':{textContent:JSON.stringify(manifest),remove(){}},'bioq-loading-message':{textContent:''},'bioq-retry':{hidden:true}};
  const sandbox={location,history,URL,Blob,Response,DecompressionStream,TextDecoder,Uint8Array,atob,DOMException,console,setTimeout,clearTimeout,queueMicrotask,CustomEvent:BrowserEvent,
    document:{getElementById:id=>nodes[id]||null},dispatchEvent:dispatch,
    addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn);}};
  sandbox.window=sandbox;
  vm.createContext(sandbox);
  await vm.runInContext(source,sandbox);
  assert.equal(nodes['bioq-retry'].hidden,true,'The real host opened its compressed fixture');
  const api=sandbox.BioPortable, pkg=sandbox.BioqPackage;
  function attach(route, frame=workspace, documentNodes={}) {
    const received=[];
    const win={frameElement:frame,document:{title:'Biology',getElementById:id=>documentNodes[id]||null},addEventListener(){},dispatchEvent(event){received.push(event);},HashChangeEvent:BrowserEvent,PopStateEvent:BrowserEvent,KeyboardEvent:BrowserEvent};
    frame.contentWindow=win;
    const context=pkg.connect(win,route);context.ready=true;
    return {win,context,received};
  }
  return {api,pkg,location,history,entries,workspace,events,attach,
    nativeHash(hash){history.pushState(history.state,'',address.href.split('#')[0]+hash);dispatch(new BrowserEvent('hashchange'));}};
}

test('ordinary section navigation keeps the physical address clean and explicit sharing carries the route',async()=>{
  const h=await setup();
  assert.equal(h.api.getRoute(),'');
  assert.equal(h.api.navigate('#courses/11/c11-cell-unit'),true);
  assert.equal(h.location.href,'https://biology.entelloq.com/');
  assert.equal(h.history.state.__bioqPortable.route,'#courses/11/c11-cell-unit');
  assert.equal(new URL(h.api.getShareURL()).searchParams.get('route'),'courses/11/c11-cell-unit');
  assert.match(h.workspace.srcdoc,/app\.html/);
  assert.match(h.workspace.srcdoc,/courses\/11\/c11-cell-unit/);
  h.api.navigate('#progress');
  assert.equal(h.api.getRoute(),'#progress');
  assert.match(h.workspace.srcdoc,/app\.html/);
  assert.equal(h.location.hash,'');
  assert.equal(h.events.filter(e=>e.type==='bioq:routechange').at(-1).detail.route,'#progress');
});

test('share query, legacy hash and history reload restore the same nested location without another history stop',async()=>{
  for(const href of ['https://biology.entelloq.com/?route=learn%2Ftopic%2Fcell-structure%2Fvisual','https://biology.entelloq.com/#learn/topic/cell-structure/visual']){
    const h=await setup(href);
    assert.equal(h.api.getRoute(),'#learn/topic/cell-structure/visual');
    assert.equal(h.location.href,'https://biology.entelloq.com/');
    assert.equal(h.history.length,1);
    const reloaded=await setup(h.location.href,h.history.state);
    assert.equal(reloaded.api.getRoute(),h.api.getRoute());
    assert.match(reloaded.workspace.srcdoc,/learn\/topic\/cell-structure\/visual/);
  }
});

test('old standalone page destinations still resolve inside the portable app',async()=>{
  const h=await setup();
  const app=h.attach('https://biology.entelloq.com/app.html#home');
  assert.equal(h.pkg.navigate(app.win,'./lessons.html#diffusion'),true);
  assert.equal(h.api.getRoute(),'#lessons/diffusion');
  assert.equal(h.location.href,'https://biology.entelloq.com/');
  assert.equal(app.context.url.hash,'#lessons/diffusion');
  assert.equal(h.pkg.navigate(app.win,'https://example.org/lessons.html#diffusion'),false);
});

test('Back and Forward restore virtual routes and authored state while immersive cleanup cannot replace the restored entry',async()=>{
  const h=await setup();
  h.api.navigate('#labs/osmosis',{state:{step:2}});
  h.api.navigate('#lab',{state:{launch:'lab'}});
  const launcher={classList:{contains:()=>true}};
  const app=h.attach('https://biology.entelloq.com/app.html#lab',h.workspace,{launcher});
  const dispatch=app.win.dispatchEvent;
  app.win.dispatchEvent=event=>{
    dispatch(event);
    if(event.type==='keydown')h.pkg.commit(app.win,new URL('https://biology.entelloq.com/app.html#home'),'replace',{cleanup:true});
  };
  const length=h.history.length;
  h.history.back();
  assert.equal(h.api.getRoute(),'#labs/osmosis');
  assert.equal(app.context.url.hash,'#labs/osmosis');
  assert.deepEqual(h.pkg.getState(),{step:2});
  assert.deepEqual(clone(app.received.find(e=>e.type==='popstate').state),{step:2});
  assert.equal(h.history.length,length);
  h.history.forward();
  assert.equal(h.api.getRoute(),'#lab');
  assert.equal(app.context.url.hash,'#lab');
  assert.equal(h.location.hash,'');
});

test('same-route updates replace state, child mode changes retain exact resume links, and nested dissection stays inside its notebook',async()=>{
  const h=await setup();
  h.api.navigate('#learn/topic/cell-structure/visual');
  const app=h.attach('https://biology.entelloq.com/app.html#learn/topic/cell-structure/visual');
  const child=h.attach('https://biology.entelloq.com/learn.html?embed=1#topic/cell-structure/visual',{});
  const length=h.history.length;
  h.pkg.commit(child.win,new URL('https://biology.entelloq.com/learn.html?embed=1#topic/cell-structure/visual'),'push',{mode:'visual'});
  assert.equal(h.history.length,length);
  assert.deepEqual(h.pkg.getState(),{mode:'visual'});
  h.pkg.commit(child.win,new URL('https://biology.entelloq.com/learn.html?embed=1#topic/cell-structure/scientific'),'replace');
  assert.equal(app.context.url.hash,'#learn/topic/cell-structure/scientific');
  assert.equal(new URL(h.api.getShareURL()).searchParams.get('route'),'learn/topic/cell-structure/scientific');
  h.api.navigate('#labs/frog-dissection');
  const dissection=h.attach('https://biology.entelloq.com/lab.html?instant=1',{});
  h.pkg.commit(dissection.win,new URL('https://biology.entelloq.com/lab.html?instant=1#frog'),'push');
  assert.equal(h.api.getRoute(),'#labs/frog-dissection');
});

test('native legacy fragments import over stale state and Back returns to the preceding clean route',async()=>{
  const h=await setup();
  h.api.navigate('#courses/9');
  h.nativeHash('#lessons/diffusion');
  assert.equal(h.api.getRoute(),'#lessons/diffusion');
  assert.equal(h.location.hash,'');
  h.history.back();
  assert.equal(h.api.getRoute(),'#courses/9');
  h.history.forward();
  assert.equal(h.api.getRoute(),'#lessons/diffusion');
});

test('a renamed local file preserves its filename, unrelated query and share/reload semantics',async()=>{
  const h=await setup('file:///C:/Lessons/Biology%20Entelloq.html?theme=light&route=lessons%2Fdiffusion');
  assert.equal(h.location.href,'file:///C:/Lessons/Biology%20Entelloq.html?theme=light');
  h.api.navigate('#lab');
  const shared=new URL(h.api.getShareURL());
  assert.equal(shared.protocol,'file:');
  assert.equal(shared.pathname,'/C:/Lessons/Biology%20Entelloq.html');
  assert.equal(shared.searchParams.get('theme'),'light');
  assert.equal(shared.searchParams.get('route'),'lab');
  const reloaded=await setup(h.location.href,h.history.state);
  assert.equal(reloaded.api.getRoute(),'#lab');
});

test('malformed routes cannot replace current state or introduce executable share URLs',async()=>{
  const h=await setup('https://biology.entelloq.com/?route=%3Cscript%3E');
  assert.equal(h.api.getRoute(),'');
  assert.equal(h.location.search,'');
  h.api.navigate('#home');
  for(const value of ['#learn?url=https://example.org','javascript:alert(1)','javascript:run','https://example.org/learn.html','data:text/plain','file:///C:/secret.html','../home#bad','x'.repeat(2049),null,{}]){
    assert.equal(h.api.navigate(value),false);
    assert.equal(h.api.getRoute(),'#home');
    assert.throws(()=>h.api.getShareURL(value),/invalid/);
  }
  assert.match(bridge,/window\.BioPortable = top\.BioPortable/);
  assert.match(bridge,/get state\(\) \{return pkg\.getState\(\);\}/);
});

test('unknown sections recover to the landing document while legacy anchors and curriculum routes remain shareable',async()=>{
  const h=await setup('https://biology.entelloq.com/#unknown-section');
  assert.equal(h.api.getRoute(),'#unknown-section');
  assert.match(h.workspace.srcdoc,/index\.html/);
  assert.equal(h.location.hash,'');
  h.api.navigate('#landing/pe-experiment');
  assert.match(h.workspace.srcdoc,/index\.html#pe-experiment/);
  h.api.navigate('#cbse:11/practicals/b11-a-e03');
  assert.equal(new URL(h.api.getShareURL()).searchParams.get('route'),'cbse:11/practicals/b11-a-e03');
  const app=h.attach('https://biology.entelloq.com/app.html#home');
  for(const target of ['javascript:run','data:text/html,Hello','blob:https://biology.entelloq.com/abc','mailto:hello@example.org']){
    assert.equal(h.pkg.navigate(app.win,target),false);
    assert.equal(h.api.getRoute(),'#cbse:11/practicals/b11-a-e03');
  }
});
