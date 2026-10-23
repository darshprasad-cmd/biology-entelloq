'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function context(storage=new Map()){
 const c={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}};
 for(const file of ['practicals-data.js','practicals-ui.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'src/cbse',file),'utf8'),c);
 return c;
}
test('all 44 standard and 15 accessible Biology audit IDs have authored guides, without counting them as simulations',()=>{
 const c=context(),d=c.BIO_CBSE_PRACTICALS,audit=JSON.parse(fs.readFileSync(path.join(root,'docs/cbse/practicals.json'),'utf8')).requirements.filter(r=>r.subject==='Biology');
 const all=[...d.guides,...d.alternatives];assert.equal(d.guides.length,44);assert.equal(d.alternatives.length,15);assert.equal(new Set(all.map(g=>g.id)).size,59);
 assert.deepEqual(all.map(g=>g.id).sort(),audit.map(g=>g.id).sort());
 for(const row of audit){const g=all.find(g=>g.id===row.id);assert.equal(g.classYear,row.classYear);assert.equal(g.simulation,false);assert.equal(g.schoolPracticalCompleted,false);assert.equal(Boolean(g.alternativeNotAdditional),row.category==='accessible-alternative');assert.equal(JSON.stringify(g.sourcePages),JSON.stringify(row.pages));}
 for(const [year,count] of [[9,5],[10,4],[11,19],[12,16]])assert.equal(d.guides.filter(g=>g.classYear===year).length,count);
});
test('every guide has distinct substantive method, observations, analysis, safety, references and explanatory viva',()=>{
 const d=context().BIO_CBSE_PRACTICALS,all=[...d.guides,...d.alternatives];
 assert.equal(new Set(all.map(g=>g.steps.join('|'))).size,59);
 for(const g of all){
  assert.ok(g.principle.length>50,g.id);assert.ok(g.apparatus.length>=1,g.id);assert.ok(g.steps.length>=4,g.id);assert.ok(g.steps.every(s=>s.length>20),g.id);
  assert.ok(g.columns.length>=3,g.id);assert.ok(g.analysis.join(' ').length>80,g.id);assert.ok(g.errors.length,g.id);assert.ok(g.safety.length>40,g.id);
  assert.ok(g.references.length>=2,g.id);for(const ref of g.references)assert.match(d.sources[ref].url,/^https:\/\//);
  for(const q of g.viva){assert.ok(q.options.length>=3,g.id);assert.ok(Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,g.id);assert.ok(q.explanation.length>35,g.id);}
  for(const id of g.links||[])assert.ok(d.guides.some(x=>x.id===id),g.id+' -> '+id);
 }
});
test('scientific and supervision boundaries remain explicit for ambiguous or sensitive activities',()=>{
 const api=context().BioCBSEPracticals;
 for(let n=10;n<=13;n++){const g=api.find('b11-a-e'+n);assert.match(g.safety,/synthetic|Synthetic/);assert.match(g.safety,/cannot diagnose/);}
 assert.match(api.find('b11-a-e13').analysis.join(' '),/pigment/);
 assert.match(api.find('b12-b-s07').analysis.join(' '),/tongue rolling.*earlobes/);
 assert.match(api.find('b12-b-s05').principle,/not interchangeable with a frog/);
 assert.match(api.find('b12-vi-e02').analysis.join(' '),/differs from mammalian/);
 assert.match(api.find('b11-b-s06').safety,/Virtual images\/models only/);
 assert.match(api.find('b12-a-e02').analysis[0],/total sampled area/);
 assert.match(api.find('b12-a-e03').analysis[0],/occupied quadrats/);
 assert.match(api.find('b11-a-e08').analysis[0],/dimensionless/);
});
test('viva grading has exact answers and explanations, with invalid submissions rejected',()=>{
 const c=context();for(const g of [...c.BIO_CBSE_PRACTICALS.guides,...c.BIO_CBSE_PRACTICALS.alternatives])for(const [i,q] of g.viva.entries()){
  assert.equal(c.BioCBSEPracticals.grade(g.id,i,q.answer).correct,true);
  assert.equal(c.BioCBSEPracticals.grade(g.id,i,(q.answer+1)%q.options.length).correct,false);
  assert.equal(c.BioCBSEPracticals.grade(g.id,i,-1),null);
 }
 assert.equal(c.BioCBSEPracticals.grade('__proto__',0,0),null);
});
test('notes isolate keys, reject corrupt data and retain session writes when persistent storage fails',()=>{
 const store=new Map([['bioq.notes','preserve'],['bioq.cbse.practical-notes.v1.s9-e04','broken']]),c=context(store),api=c.BioCBSEPracticals;
 assert.equal(api.readNotes('s9-e04'),'');assert.equal(api.saveNotes('s9-e04','observed evidence'),true);assert.equal(api.readNotes('s9-e04'),'observed evidence');assert.equal(store.get('bioq.notes'),'preserve');
 assert.equal(api.saveNotes('constructor','bad'),false);assert.equal(api.saveNotes('s9-e04','x'.repeat(12001)),false);
 assert.equal(api.validNotes({version:2,text:'old'}),null);
 c.localStorage.setItem=()=>{throw Error('quota');};assert.equal(api.saveNotes('s9-e04','new session note'),false);assert.equal(api.readNotes('s9-e04'),'new session note');
 Object.defineProperty(c,'localStorage',{get(){throw Error('blocked');}});assert.equal(api.readNotes('s10-e06'),'');
});
test('practical routes are bounded and source does not touch protected user data, camera or network',()=>{
 const api=context().BioCBSEPracticals;
 for(const y of [9,10,11,12])assert.equal(api.parse(api.path(y)).year,y);
 for(const bad of ['#cbse:8/practicals','#cbse:9/practicals/<script>','#labs/microscope'])assert.equal(api.parse(bad),null);
 const ui=fs.readFileSync(path.join(root,'src/cbse/practicals-ui.js'),'utf8');assert.doesNotMatch(ui,/localStorage\.clear|removeItem|getUserMedia|fetch\(/);
 assert.match(ui,/escape\(readNotes/);
});
