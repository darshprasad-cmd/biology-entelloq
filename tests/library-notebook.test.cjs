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
