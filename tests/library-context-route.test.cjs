'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/library/app-library.js'),'utf8');
function fixture(section='learn',hash='#library',portable=true){
 let listener;const changes=[],remembered=[],child={location:{hash},document:{}};
 if(portable){child.BioqLocation={hash};child.BioqContext={ready:true};child.location.hash='#native-url-is-not-the-logical-route';}
 const frame={src:'https://biology.test/'+section+'.html?embed=1',contentWindow:child,classList:{contains:()=>true}};
 const crumb={textContent:'Library'},location={href:'https://biology.test/app.html#'+section,origin:'https://biology.test',hash:'#'+section};
 const win={BioAppContext:{remember:(...args)=>remembered.push(args),refreshHome(){}}};win.top=win;
 const context={window:win,URL,location,addEventListener:(name,fn)=>{if(name==='message')listener=fn;},document:{getElementById:id=>id==='viewFrame'?frame:id==='routeLabel'?crumb:null},history:{replaceState:(state,unused,url)=>{changes.push(url);location.hash=url;}}};
 vm.runInNewContext(source,context);
 return{changes,remembered,crumb,child,frame,send:c=>listener({source:child,origin:location.origin,data:{bioqContext:c}})};
}
test('a queued lesson context cannot replace the library or category URL after returning',()=>{
 for(const hash of ['', '#library','#category/plant-biology']){
  const f=fixture('learn',hash);f.send({kind:'learn',topic:'photosynthesis',mode:'layman',title:'Old lesson'});
  assert.deepEqual(f.changes,[]);assert.deepEqual(f.remembered,[]);assert.equal(f.crumb.textContent,'Library');
 }
});
test('stale topics and modes cannot overwrite the current reading route',()=>{
 for(const hash of ['#topic/cell-structure/layman','#topic/photosynthesis/visual']){
  const f=fixture('learn',hash);f.send({kind:'learn',topic:'photosynthesis',mode:'layman'});assert.deepEqual(f.changes,[]);
 }
 const pending=fixture('learn','#topic/photosynthesis/layman');pending.child.BioqContext.ready=false;
 pending.send({kind:'learn',topic:'photosynthesis',mode:'layman'});assert.deepEqual(pending.changes,[]);
});
test('current native and portable contexts still update the exact route and remembered topic',()=>{
 for(const portable of [false,true])for(const [section,hash,context,expected]of [
  ['learn','#topic/photosynthesis/visual',{kind:'learn',topic:'photosynthesis',mode:'visual'},'#learn/topic/photosynthesis/visual'],
  ['learn','#topic/calvin-cycle/advanced',{kind:'learn',topic:'photosynthesis',subtopicId:'calvin-cycle',mode:'advanced'},'#learn/topic/calvin-cycle/advanced'],
  ['learn','#topic/dna',{kind:'learn',topic:'dna',mode:'layman'},'#learn/topic/dna/layman'],
  ['labs','#osmosis',{kind:'lab',lab:'osmosis',mode:'explore'},'#labs/osmosis'],
  ['solve','#learn/dna/visual',{kind:'solve',topic:'dna',mode:'visual'},'#solve/learn/dna/visual'],
  ['reason','#learn/dna',{kind:'reason',topic:'dna',mode:'layman'},'#reason/learn/dna/layman']
 ]){const f=fixture(section,hash,portable);f.send(context);assert.deepEqual(f.changes,[expected]);assert.equal(f.remembered.length,1);}
});
test('catalogue, stale lab and inaccessible or malformed child routes are ignored',()=>{
 for(const [section,hash,context]of [['labs','',{kind:'lab',lab:'osmosis'}],['labs','#microscope',{kind:'lab',lab:'osmosis'}],['solve','',{kind:'solve',topic:'dna'}],['reason','#learn/cells',{kind:'reason',topic:'dna'}],['learn','#topic/%E0%A4/layman',{kind:'learn',topic:'dna'}]]){
  const f=fixture(section,hash);f.send(context);assert.deepEqual(f.changes,[]);
 }
 const f=fixture();Object.defineProperty(f.child,'BioqLocation',{get(){throw Error('navigated away');}});f.send({kind:'learn',topic:'dna'});assert.deepEqual(f.changes,[]);
});
