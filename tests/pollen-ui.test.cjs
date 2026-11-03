'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),KEY='bioq.cbse.pollen.v1';
const source=fs.readFileSync(path.join(root,'src/cbse/pollen-ui.js'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
function context(store=new Map()){
  const c={localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)}};
  for(const file of['pollen-model.js','pollen-ui.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'src/cbse',file),'utf8'),c);
  return c;
}
function row(field='A',time=20,changes={}){
  const values={A:{total:9,n:[0,3,6]},B:{total:11,n:[0,4,7]},C:{total:14,n:[0,5,8]}};
  const entry=values[field]||values.A,germinated=entry.n[[0,10,20].indexOf(time)];
  return {state:{field,time},total:entry.total,germinated,percent:Number((100*germinated/entry.total).toFixed(1)),dataKind:'synthetic_pollen_snapshot',...changes};
}
function withRows(records){return context(new Map([[KEY,JSON.stringify({version:1,records})]]));}
// This stub inspects deterministic HTML and handlers only. Real layout, focus,
// keyboard and numeric-input behaviour are checked in the browser suite.
function hostStub(){
  const nodes=new Map();
  return {innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',valueAsNumber:NaN,checked:false,disabled:false,reset(){},focus(){}});return nodes.get(selector);},querySelectorAll(){return[];}};
}

test('pollen notebook accepts versioned checked counts and ignores corrupt, foreign or malformed data',()=>{
  for(const corrupt of['broken','null','{}','[]',JSON.stringify({version:2,records:[row()]}),JSON.stringify({version:1,records:null}),JSON.stringify({version:1,records:{}})])assert.equal(context(new Map([[KEY,corrupt]])).BioPollen.load().length,0);
  const good=row();
  const invalid=[null,{},[],true,42,row('D'),row('A',5),{...good,total:8},{...good,germinated:7},{...good,percent:99},{...good,percent:'66.7'},{...good,state:{field:'A'}},{...good,mastery:100},{...good,state:{field:'<img src=x onerror=alert(1)>',time:20}},{...good,state:{field:'A',time:20,correct:true}}];
  const api=withRows([good,...invalid,row('C',10)]).BioPollen;
  assert.deepEqual(plain(api.load()),[good,row('C',10)]);
  assert.equal(api.KEY,KEY);
});

test('checked provenance is recomputed and no stored answer or assessment claim can become evidence',()=>{
  const api=withRows([{...row(),dataKind:'real_physical_viability_assay'}]).BioPollen;
  assert.equal(api.load()[0].dataKind,'synthetic_pollen_snapshot');
  assert.deepEqual(Object.keys(api.load()[0]).sort(),['state','total','germinated','percent','dataKind'].sort());
  assert.equal(withRows([{...row(),correct:true},{...row(),expected:6}]).BioPollen.load().length,0);
  const {host}= {host:hostStub()};api.mount(host);
  assert.match(host.querySelector('.pollen-records').innerHTML,/6 \/ 9 grains = 66\.7%/);
  assert.match(host.querySelector('.pollen-summary').innerHTML,/1 ruptured grains included in total/);
  assert.match(host.querySelector('.pollen-summary').innerHTML,/not a mean of percentages or a real viability estimate/);
});

test('deduplication replaces the same field-time count without inflating sample size or combining times',()=>{
  const store=new Map(),c=context(store),api=c.BioPollen;
  const entries=[row(),row('A',20,{percent:66.67}),row('B',20),row('A',10)];
  assert.equal(api.persist(entries),true);
  const records=plain(api.load());assert.equal(records.length,3);
  assert.equal(records.find(r=>r.state.field==='A'&&r.state.time===20).percent,66.67);
  const summaries=plain(c.BioPollenModel.summarize(records));assert.deepEqual(summaries.map(g=>g.time),[10,20]);
  assert.equal(summaries[0].total,9);assert.equal(summaries[1].total,20);assert.equal(summaries[1].germinated,13);assert.equal(summaries[1].percent,65);
  assert.equal(JSON.parse(store.get(KEY)).records.length,3);assert.deepEqual(plain(context(store).BioPollen.load()),records);
  const all=[];for(const time of[0,10,20])for(const field of['A','B','C'])all.push(row(field,time));
  api.persist([...all,...all]);assert.equal(api.load().length,9);
});

test('persist validates inputs, caps the inspected tail and retains only the nine legitimate field-time cells',()=>{
  const api=context().BioPollen;
  api.persist(Array(150).fill(row('A',10)));assert.equal(api.load().length,1);
  const tail=Array(100).fill(null);api.persist([row(),...tail]);assert.equal(api.load().length,0,'older entries outside the inspected bound are not retained');
  for(const bad of[null,{},'rows',undefined]){assert.equal(api.persist(bad),true);assert.equal(api.load().length,0);}
  const input=row();api.persist([input]);input.state.field='C';input.total=999;
  assert.deepEqual(plain(api.load()),[row()],'persist must clone caller-owned raw inputs');
});

test('public notebook reads cannot mutate internal checked rows or inject unchecked rendering data',()=>{
  const store=new Map(),api=context(store).BioPollen;api.persist([row()]);const before=store.get(KEY),external=api.load();
  for(const mutate of[()=>external[0].state.field='<img src=x onerror=alert(1)>',()=>external[0].total=999,()=>external.push({state:{field:'X',time:99},total:999,germinated:999,percent:100}),()=>external.length=0]){try{mutate();}catch(error){assert.equal(error.name,'TypeError');}}
  assert.deepEqual(plain(api.load()),[row()],'load returns an isolated copy or immutable snapshots');
  assert.equal(store.get(KEY),before);
  const host=hostStub();api.mount(host);assert.doesNotMatch(host.querySelector('.pollen-records').innerHTML,/<img|999|Field X/);
  assert.equal(host.querySelector('[data-pollen-count]').textContent,'(1)');
});

test('blocked and quota-exhausted storage retain session counts and preserve every unrelated note key',()=>{
  const other=[['bioq.notes','lesson'],['bioq.cbse.practical-notes.v1.b12-a-e01','preparation'],['bioq.cbse.microscopy.v1','microscopy'],['bioq.cbse.potato-osmosis.v1','osmosis'],['bioq.lab-notebook.v1.pollen','legacy']];
  const store=new Map(other),c=context(store),api=c.BioPollen;assert.equal(api.persist([row()]),true);
  c.localStorage.setItem=()=>{throw Error('quota');};assert.equal(api.persist([row('B')]),false);assert.equal(api.load()[0].state.field,'B');
  assert.equal(context(store).BioPollen.load()[0].state.field,'A');for(const[k,v]of other)assert.equal(store.get(k),v);
  const blocked=context();Object.defineProperty(blocked,'localStorage',{get(){throw Error('denied');}});assert.equal(blocked.BioPollen.load().length,0);
  assert.equal(blocked.BioPollen.persist([row('C')]),false);assert.equal(blocked.BioPollen.load()[0].state.field,'C');
});

test('CSV is a fixed schema of revalidated bounded fields with recomputed percentage and synthetic provenance',()=>{
  const api=context().BioPollen;
  const result=api.csv([row(),row('B',20),row('A',20,{percent:66.67}),{...row(),state:{field:'=HYPERLINK("evil")',time:20}},{...row(),percent:'=SUM(1,2)'},{...row(),total:100000}]);
  assert.equal(result,'field,time_min,total_grains,germinated,ruptured,percentage,provenance\r\nA,20,9,6,1,66.67,synthetic_not_experimental\r\nB,20,11,7,1,63.64,synthetic_not_experimental\r\n');
  assert.equal(api.csv([{...row(),dataKind:'=BAD()'}]),api.csv([row()]));
  assert.doesNotMatch(result,/HYPERLINK|SUM|evil|100000/);
  assert.equal(api.csv(null),'field,time_min,total_grains,germinated,ruptured,percentage,provenance\r\n');
});

test('rendering exposes an empty first field and text alternatives without camera, network or legacy-state mutation',()=>{
  const host=hostStub();context().BioPollen.mount(host);
  assert.match(host.querySelector('.pollen-view').innerHTML,/Empty virtual slide/);
  assert.doesNotMatch(host.querySelector('.pollen-view').innerHTML,/data-pollen-grain=/);
  assert.equal(host.querySelector('#pollen-inspect').disabled,true);
  assert.match(host.querySelector('.pollen-text tbody').innerHTML,/Prepare a clear field/);
  assert.match(host.innerHTML,/Text equivalent of the field/);assert.match(host.innerHTML,/No sample or camera/);
  assert.match(host.innerHTML,/not a universal laboratory definition/);assert.match(host.innerHTML,/real-time incubation is simulated/);
  assert.doesNotMatch(source,/localStorage\.clear|removeItem|getUserMedia|fetch\(|XMLHttpRequest|sendBeacon|setInterval|requestAnimationFrame/);
});

test('source integration targets only the class-twelve pollen mount and preserves existing practical extensions',()=>{
  const builder=fs.readFileSync(path.join(root,'scripts/build-single-file.py'),'utf8');
  assert.match(builder,/"pollen-model\.js", "pollen-ui\.js"/);assert.match(builder,/"pollen-ui\.css"/);
  assert.ok(builder.indexOf('"pollen-ui.js"')<builder.indexOf('"practicals-ui.js"'));
  const integration=fs.readFileSync(path.join(root,'src/cbse/practicals-ui.js'),'utf8');
  assert.match(integration,/g\.id==='b12-a-e01'&&root\.BioPollen/);assert.match(integration,/root\.BioPollen\.mount\(bench\)/);
  assert.match(integration,/Interactive pollen bench/);assert.match(integration,/bench\.focus\(\{preventScroll:true\}\)/);
  assert.match(integration,/root\.BioMicroscopy\.mount\(bench\)/);assert.match(integration,/root\.BioPotatoOsmosis\.mount\(bench\)/);
  assert.match(source,/Biology_SecP2_2026-27\.pdf#page=12/);assert.match(source,/lelm202\.pdf#page=1/);
  const css=fs.readFileSync(path.join(root,'src/cbse/pollen-ui.css'),'utf8');
  assert.match(css,/prefers-reduced-motion:reduce/);assert.match(css,/:focus-visible/);assert.match(css,/min-height:44px/);
});
