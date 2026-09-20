const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.html'),'utf8');
const main=fs.readFileSync(path.join(root,'src/lab/main.js'),'utf8');
const parentSource=app.match(/<script id="launcher-exit-bridge">([\s\S]*?)<\/script>/)[1];
const childSource=main.match(/\/\/ BIOQ_LAB_MODAL_BRIDGE_START([\s\S]*?)\/\/ BIOQ_LAB_MODAL_BRIDGE_END/)[1];
const origin='https://biology.example';
test('immersive routes respect restore push:false and only Lab exit bypasses history traversal',()=>{
  assert.match(app,/openLaunch\(k,\{push\}\); return; \}  \/\/ immersive/);
  const openSource=app.match(/function openLaunch\(k,\{push=true\}=\{\}\)\{[\s\S]*?\n\}/)[0];
  const clicks=[];const routes={lab:{file:'lab.html',k:'lab'},universe:{file:'universe.html',k:'universe'}};
  const frame={dataset:{src:'./lab.html?instant=1',ready:'1'}};
  const ctx={BYKEY:routes,launcherOpen:false,launcher:{classList:{add(){}}},lframe:frame,lload:{style:{}},setActive(){},tintField(){},postTheme(){},
    history:{length:3,pushState:(...args)=>clicks.push(['push',...args]),back:()=>clicks.push(['back'])},closeLaunch:()=>{clicks.push(['close']);ctx.launcherOpen=false;}};
  vm.createContext(ctx);vm.runInContext(openSource,ctx);
  ctx.openLaunch('lab',{push:false});assert.equal(clicks.length,0);
  ctx.openLaunch('lab');assert.equal(clicks.length,1);assert.equal(clicks[0][3],'#lab');
  ctx.openLaunch('universe',{push:false});assert.equal(clicks.length,1);
  const exitSource=app.match(/\$\("#launchX"\)\.addEventListener\("click",\(\)=>\{[^\n]+/)[0];
  ctx.$=()=>({addEventListener:(_,fn)=>ctx.exit=fn});vm.runInContext(exitSource,ctx);
  clicks.length=0;frame.dataset.src='./lab.html?instant=1';ctx.launcherOpen=true;ctx.exit();assert.deepEqual(clicks,[['close']]);
  clicks.length=0;frame.dataset.src='./universe.html';ctx.launcherOpen=true;ctx.exit();assert.deepEqual(clicks,[['back'],['close']]);
});
function parentFixture(){
  const handlers={},posts=[],observations=[],bodyClasses=new Set();
  const host={open:true,classList:{contains:()=>host.open,toggle(){}},insertBefore(){}};
  const frame={src:'./lab.html?instant=1',contentWindow:{postMessage:(...args)=>posts.push(args)},getAttribute:()=>frame.src,addEventListener:(name,fn)=>handlers['frame-'+name]=fn};
  const exit={hidden:false,inert:false,textContent:'× Exit'};
  const ctx={document:{body:{classList:{toggle:(name,on)=>on?bodyClasses.add(name):bodyClasses.delete(name)}},getElementById:id=>({launcher:host,launchFrame:frame,launchX:exit})[id],createElement:()=>({})},
    location:{origin,href:origin+'/app.html#lab'},URL,
    window:{addEventListener:(name,fn)=>handlers[name]=fn},
    MutationObserver:class{constructor(fn){handlers.mutation=fn;}observe(...args){observations.push(args);}}};
  vm.runInNewContext(parentSource,ctx);
  const message=(data,source=frame.contentWindow,eventOrigin=origin)=>handlers.message({data,source,origin:eventOrigin});
  return {handlers,posts,host,frame,exit,message,observations,bodyClasses};
}
test('parent accepts only exact current lab source, origin and a boolean modal state',()=>{
  const f=parentFixture();
  assert.equal(f.exit.hidden,false);assert.equal(f.posts[0][1],origin);
  for(const [data,source,eventOrigin] of [[{bioqLabModal:true},{},origin],[{bioqLabModal:true},f.frame.contentWindow,'https://other.example'],[{bioqLabModal:'true'},f.frame.contentWindow,origin],[null,f.frame.contentWindow,origin]])
    f.message(data,source,eventOrigin);
  assert.equal(f.exit.hidden,false);
  f.message({bioqLabModal:true});assert.equal(f.exit.hidden,true);assert.equal(f.exit.inert,true);
  assert.equal(f.bodyClasses.has('lab-modal-active'),true);
  f.message({bioqLabModal:false});assert.equal(f.exit.hidden,false);assert.equal(f.exit.inert,false);
  assert.equal(f.bodyClasses.has('lab-modal-active'),false);
  assert.match(app,/body\.lab-modal-active :is\(#eqx-fab,#eqx-panel,#bioq-ai,#bio-background-toggle\)\{visibility:hidden!important;pointer-events:none!important\}/);
});
test('warm reopen preserves modal ownership; navigation/load resets and requests fresh state',()=>{
  const f=parentFixture();f.message({bioqLabModal:true});
  f.host.open=false;f.handlers.mutation();assert.equal(f.exit.hidden,false);
  assert.equal(f.bodyClasses.has('lab-modal-active'),false);
  f.host.open=true;f.handlers.mutation();assert.equal(f.exit.hidden,true);
  assert.equal(f.bodyClasses.has('lab-modal-active'),true);
  f.frame.src='./universe.html';f.handlers.mutation();assert.equal(f.exit.hidden,false);
  assert.equal(f.bodyClasses.has('lab-modal-active'),false);
  f.message({bioqLabModal:true});assert.equal(f.exit.hidden,false);
  f.frame.src='./lab.html?instant=1';f.handlers.mutation();f.handlers['frame-load']();
  assert.equal(f.exit.hidden,false);assert.equal(f.posts.length,2);
  f.message({bioqLabModal:true});assert.equal(f.exit.hidden,true);
});
test('child publishes transitions only, uses exact origin and validates refresh requests',()=>{
  let active=false;const posts=[],handlers={};const parent={postMessage:(...args)=>posts.push(args)};
  const window={parent,addEventListener:(name,fn)=>handlers[name]=fn};
  const ctx=vm.createContext({window,location:{origin},document:{querySelector:()=>active?{}:null}});
  vm.runInContext(childSource+'\nglobalThis.publish=publishLabModalState;',ctx);
  ctx.publish();ctx.publish();assert.equal(posts.length,1);assert.equal(posts[0][0].bioqLabModal,false);assert.equal(posts[0][1],origin);
  active=true;ctx.publish();ctx.publish();assert.equal(posts.length,2);assert.equal(posts[1][0].bioqLabModal,true);
  for(const event of [{source:{},origin,data:{bioqLabModalRequest:true}},{source:parent,origin:'https://other.example',data:{bioqLabModalRequest:true}},{source:parent,origin,data:{bioqLabModalRequest:'true'}}])handlers.message(event);
  assert.equal(posts.length,2);
  handlers.message({source:parent,origin,data:{bioqLabModalRequest:true}});assert.equal(posts.length,3);
  window.parent=window;active=false;ctx.publish();assert.equal(posts.length,3,'standalone pages do not message themselves');
  assert.match(main,/function tick\(t\)\s*\{\s*publishLabModalState\(\);/,'publish before the scale-render early return');
});
