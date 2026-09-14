const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function notebook(){const window={};vm.runInNewContext(fs.readFileSync(path.join(root,'src/library/notebook.js'),'utf8'),{window,Map,Set,Blob,URL,setTimeout});return window.BioNotebook;}
test('malformed notebook records cannot break the UI or inject non-finite graph values',()=>{
 const n=notebook();for(const value of [null,[],42,'broken']){const s=n.clean(value);assert.equal(s.mode,'guided');assert.equal(s.trials.length,0);}
 const s=n.clean({mode:'bogus',hypothesis:{bad:true},trials:[null,{variables:{temperature:Infinity,valid:37},measurements:{rate:NaN,real:2},observation:'test'}]});
 assert.equal(s.hypothesis,'');assert.equal(s.trials.length,1);assert.deepEqual(JSON.parse(JSON.stringify(s.trials[0].variables)),{valid:37});assert.equal(s.trials[0].measurements.real,2);assert.equal('rate' in s.trials[0].measurements,false);
});
test('export preserves scientific negative numbers and quotes formula-like user text safely',()=>{
 const text=notebook().csv([{index:1,at:'2026-09-14',variables:{temp:-10},measurements:{rate:1.2},stage:'Observed',observation:'=HYPERLINK("bad")'}]);
 assert.ok(text.includes('"-10"'));assert.ok(text.includes('"\'=HYPERLINK(""bad"")"'));assert.ok(text.includes('Variable: temp'));assert.ok(text.includes('Measurement: rate'));
});
test('notebook load limits records and keeps each trial independent',()=>{
 const n=notebook(),trials=Array.from({length:110},(_,i)=>({variables:{x:i},measurements:{y:i*i}}));const note=n.clean({trials});assert.equal(note.trials.length,80);assert.equal(note.trials[0].index,1);assert.equal(note.trials[0].variables.x,30);trials[30].variables.x=-1;assert.equal(note.trials[0].variables.x,30);
});
test('guide uses exact active subtopic and teaches experimental control from the recorded variables',()=>{
 const window={dispatchEvent(){},BIO_LIBRARY:{topics:[{id:'photosynthesis',explanations:{layman:'parent'}},{id:'calvin-cycle',explanations:{layman:'child',advanced:'deeper child',intuition:'ATP coupling'},keyTerms:[]}]}};
 const env={window,parent:window,location:{origin:'http://local'},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/library/context.js'),'utf8'),env);
 window.BioContext.publish({kind:'learn',topic:'photosynthesis',subtopicId:'calvin-cycle',mode:'layman'});assert.equal(window.BioContext.reply('simpler'),'child');
 window.BioContext.publish({kind:'lab',hypothesis:'Rate increases',trials:[{variables:{temperature:30,pH:7}},{variables:{temperature:40,pH:8}}]});assert.match(window.BioContext.reply('why?'),/temperature, pH/);assert.match(window.BioContext.reply('why?'),/only one/);
 window.BioContext.publish({kind:'lab',hypothesis:'Rate increases',trials:[{variables:{temperature:30}},{variables:{temperature:30}}]});assert.match(window.BioContext.reply('why?'),/deterministic/);
});

// Exercise the actual mounted notebook, its event handlers and shared persistence.
// The small DOM adapter omits layout only; no persistence logic is reimplemented.
function mountedNotebook(shared=new Map(),initial){
 const nodes=new Map(),windowEvents=new Map(),writes=[],published=[];
 let lastFocus=null,storageUnavailable=false;
 function node(name=''){
  const listeners=new Map(),attributes=new Map();let id='';
  const el={name,innerHTML:'',textContent:'',value:'',hidden:false,dataset:{},disabled:false,className:'',
   classList:{toggle(){}},setAttribute(k,v){attributes.set(k,String(v));},getAttribute(k){return attributes.get(k)||null;},
   addEventListener(type,fn){listeners.set(type,fn);},removeEventListener(type){listeners.delete(type);},
   fire(type){listeners.get(type)?.({target:el});},focus(){lastFocus=el;},append(){},after(){},
   querySelector(selector){if(!nodes.has(selector))nodes.set(selector,node(selector));return nodes.get(selector);},
   querySelectorAll(selector){
    if(selector==='[data-lab-mode]')return ['guided','challenge','sandbox'].map(mode=>{const e=el.querySelector('mode:'+mode);e.dataset.labMode=mode;return e;});
    if(selector==='[data-note]')return ['question','variables','method','observations','conclusion','limitations'].map(field=>{const e=el.querySelector('field:'+field);e.dataset.note=field;return e;});
    return [];
   }};
  Object.defineProperty(el,'id',{get(){return id;},set(value){id=value;nodes.set('#'+value,el);}});
  return el;
 }
 const window={BioContext:{publish(c){published.push(JSON.parse(JSON.stringify(c)));}},addEventListener(type,fn){windowEvents.set(type,fn);},removeEventListener(type){windowEvents.delete(type);}};
 const localStorage={getItem(key){if(storageUnavailable)throw Error('Blocked storage');return shared.get(key)??null;},setItem(key,value){if(storageUnavailable)throw Error('Blocked storage');writes.push([key,value]);shared.set(key,value);}};
 const document={createElement:()=>node()};
 vm.runInNewContext(fs.readFileSync(path.join(root,'src/library/notebook.js'),'utf8'),{window,document,localStorage,Map,Set,Blob,URL,setTimeout});
 const key='bioq.lab-notebook.v1.osmosis';if(initial)shared.set(key,JSON.stringify(initial));
 const workflow=node('workflow'),target=node('target'),host=node('host'),controls={concentration:1};
 const live={snapshot(){return {variables:{concentration:controls.concentration},measurements:{volume:12},stage:'Equilibrated'};},reset(){throw Error('Notebook reset must not reset experiment controls');}};
 const instance=window.BioNotebook.mount({id:'osmosis',title:'Osmosis',question:'How does concentration affect volume?',relatedTopics:[]},host,live,workflow,target);
 return {key,shared,writes,windowEvents,workflow,target,controls,instance,published,
  get:selector=>target.querySelector(selector),read:()=>JSON.parse(shared.get(key)||'null'),
  click(selector){const e=target.querySelector(selector);if(e.onclick)e.onclick();else e.fire('click');},
  input(selector,value){const e=target.querySelector(selector);e.value=value;e.fire('input');},
  storageEvent(){windowEvents.get('storage')?.({key,newValue:shared.get(key)??null});},
  setUnavailable(value){storageUnavailable=value;},focus:()=>lastFocus
 };
}

test('closing an unchanged second tab cannot erase a trial recorded in the first tab',()=>{
 const disk=new Map(),a=mountedNotebook(disk),b=mountedNotebook(disk);
 assert.equal(disk.size,0,'opening a blank notebook must not write an empty snapshot');
 a.click('#lab-record');assert.equal(a.read().trials.length,1);
 b.instance.dispose();assert.equal(a.read().trials.length,1);assert.equal(b.writes.length,0);
 assert.equal(b.windowEvents.has('storage'),false,'dispose removes the cross-tab observer');
});

test('a stale edit and stale trial remain exportable locally without replacing another tab’s work',()=>{
 const disk=new Map(),a=mountedNotebook(disk),b=mountedNotebook(disk);
 a.input('#lab-hypothesis','A prediction');a.click('#lab-record');const saved=disk.get(a.key);
 b.input('#lab-hypothesis','B prediction');b.controls.concentration=7;b.click('#lab-record');
 assert.equal(disk.get(a.key),saved);assert.match(b.get('#lab-save-state').textContent,/Another tab changed/);
 assert.equal(b.workflow.querySelector('#lab-hypothesis').value,'B prediction');
 assert.equal(b.published.at(-1).hypothesis,'B prediction');assert.equal(b.published.at(-1).trials[0].variables.concentration,7);
 assert.equal(typeof b.get('#lab-export').onclick,'function');assert.equal(b.get('#lab-csv').disabled,false);
 b.instance.dispose();assert.equal(disk.get(a.key),saved);
});

test('new-investigation cancellation retains all 80 trials and written notes',()=>{
 const initial={hypothesis:'Keep this prediction',observations:'Keep these observations',mode:'challenge',trials:Array.from({length:80},(_,i)=>({variables:{concentration:i},measurements:{volume:i+1},stage:'Recorded'}))};
 const n=mountedNotebook(new Map(),initial),saved=n.shared.get(n.key);
 n.click('#lab-record');assert.equal(n.read().trials.length,80);assert.match(n.get('#lab-save-state').textContent,/New investigation/);
 n.click('#lab-new');assert.equal(n.get('#lab-reset-panel').hidden,false);assert.match(n.get('#lab-reset-panel').innerHTML,/Export your notebook first/);
 n.click('#lab-reset-cancel');assert.equal(n.get('#lab-reset-panel').hidden,true);assert.equal(n.shared.get(n.key),saved);
 assert.equal(n.read().hypothesis,'Keep this prediction');assert.equal(n.read().observations,'Keep these observations');assert.equal(n.read().trials.length,80);
 assert.equal(n.focus(),n.get('#lab-new'));
});

test('confirmed new investigation clears notebook fields and admits new trials while retaining simulation controls',()=>{
 const n=mountedNotebook(new Map(),{question:'An old question',hypothesis:'Old',variables:'Old controls',method:'Old method',observations:'Old evidence',conclusion:'Old conclusion',limitations:'Old limitations',mode:'challenge',trials:Array.from({length:80},()=>({variables:{concentration:1},measurements:{volume:5}}))});
 n.controls.concentration=9;n.click('#lab-new');n.click('#lab-reset-confirm');
 const fresh=n.read();assert.equal(fresh.trials.length,0);assert.equal(fresh.mode,'guided');assert.equal(fresh.question,'How does concentration affect volume?');
 for(const field of ['hypothesis','variables','method','observations','conclusion','limitations'])assert.equal(fresh[field],'');
 assert.equal(n.controls.concentration,9);assert.equal(n.workflow.querySelector('#lab-hypothesis').value,'');assert.equal(n.get('#lab-reset-panel').hidden,true);
 n.click('#lab-record');assert.equal(n.read().trials.length,1);assert.equal(n.read().trials[0].index,1);assert.equal(n.read().trials[0].variables.concentration,9);
});

test('reset confirmation rechecks storage and cannot clear records added after the confirmation opened',()=>{
 const disk=new Map(),a=mountedNotebook(disk),b=mountedNotebook(disk);
 b.click('#lab-new');a.click('#lab-record');const saved=disk.get(a.key);b.click('#lab-reset-confirm');
 assert.equal(disk.get(a.key),saved);assert.equal(a.read().trials.length,1);assert.equal(b.get('#lab-reset-panel').hidden,false);
 assert.match(b.get('#lab-reset-message').textContent,/Another tab changed/);
});

test('an old tab cannot restore a notebook cleared by another tab',()=>{
 const disk=new Map(),a=mountedNotebook(disk);a.click('#lab-record');const b=mountedNotebook(disk);
 a.click('#lab-new');a.click('#lab-reset-confirm');assert.equal(a.read().trials.length,0);
 b.storageEvent();assert.match(b.get('#lab-save-state').textContent,/Another tab changed/);
 b.input('field:conclusion','A stale conclusion');b.instance.dispose();
 assert.equal(a.read().trials.length,0);assert.equal(a.read().conclusion,'');
});

test('storage failure still permits a confirmed session-only reset without touching saved data',()=>{
 const n=mountedNotebook();n.click('#lab-record');const saved=n.shared.get(n.key);n.setUnavailable(true);
 n.click('#lab-new');n.click('#lab-reset-confirm');assert.equal(n.shared.get(n.key),saved);
 assert.equal(n.published.at(-1).trials.length,0);assert.match(n.get('#lab-save-state').textContent,/storage is unavailable/);
 n.click('#lab-record');assert.equal(n.published.at(-1).trials.length,1);assert.equal(n.get('#lab-csv').disabled,false);
});

test('malformed saved JSON can recover through a new trial or confirmed reset without a false conflict',()=>{
 for(const useReset of [false,true]){
  const disk=new Map([['bioq.lab-notebook.v1.osmosis','{not valid JSON']]),n=mountedNotebook(disk);
  if(useReset){n.click('#lab-new');n.click('#lab-reset-confirm');assert.equal(n.read().trials.length,0);}
  else {n.click('#lab-record');assert.equal(n.read().trials.length,1);}
  assert.match(n.get('#lab-save-state').textContent,/Saved on this device/);
  assert.doesNotMatch(n.get('#lab-save-state').textContent,/Another tab changed/);
 }
});
