'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const file=path.join(__dirname,'../src/cbse/chromatography-model.js'),M=require(file);
const ratios={'leaf-a':[.25,.45,.65,.85],'leaf-b':[.2,.4,.7,.9]};
const state=(patch={})=>({...M.defaults(),...patch});
function expected(s){return {frontDistance:s.front,bandDistance:s.front*ratios[s.sample][Number(s.band[1])-1],rf:ratios[s.sample][Number(s.band[1])-1]};}
function row(patch={},answers={}){const s=state(patch);return M.record(s,{...expected(s),...answers});}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} differs from ${b}`);

test('pure global/CommonJS API is deterministic, frozen and explicitly synthetic',()=>{
 const source=fs.readFileSync(file,'utf8'),c={};vm.runInNewContext(source,c);assert.equal(c.BioChromatographyModel.defaults().front,60);
 assert.doesNotMatch(source,/localStorage|fetch\(|getUserMedia|XMLHttpRequest|Math\.random|Date\.now/);
 for(const x of[M,M.constants,M.constants.SAMPLES,M.constants.FRONTS,M.constants.BANDS,M.questions,M.questions[0],M.questions[0].options,M.limits])assert.ok(Object.isFrozen(x));
 assert.match(M.constants.NOTICE,/Synthetic.*not.*calibrated.*completion/);assert.ok(M.limits.some(s=>/not instrument calibration/.test(s)));assert.ok(M.limits.some(s=>/not independent biological replicates/.test(s)));
 const s=M.defaults();s.front=99;assert.deepEqual(M.defaults(),{sample:'leaf-a',front:60,band:'B1'});
});

test('strict settings reject missing, extra, inherited, string, nonfinite and accessor state',()=>{
 const s=Object.freeze(state());assert.deepEqual(M.normalize(s),s);assert.notEqual(M.normalize(s),s);
 for(const bad of[undefined,null,{},[],Object.create(s),{...s,sample:'leaf-c'},{...s,sample:'constructor'},{...s,front:'60'},{...s,front:50},{...s,front:NaN},{...s,front:Infinity},{...s,band:'B0'},{...s,band:1},{...s,extra:1},{...s,[Symbol('x')]:1}]){assert.equal(M.normalize(bad),null);assert.equal(M.check(bad,{}).correct,false);assert.equal(M.record(bad,{}),null);}
 for(const key of Object.keys(s)){const missing={...s};delete missing[key];assert.equal(M.normalize(missing),null);}
 let called=false;const getter={...s};Object.defineProperty(getter,'front',{get(){called=true;return 60;}});assert.equal(M.normalize(getter),null);assert.equal(called,false);
 assert.equal(M.normalize(new Proxy({},{ownKeys(){throw Error('trap');}})),null);
});

test('all 24 authored band configurations use independent same-origin mm ratios',()=>{
 let count=0;
 for(const sample of['leaf-a','leaf-b'])for(const front of[40,60,80]){
  const bands=M.run({sample,front});assert.equal(bands.length,4);assert.deepEqual(bands.map(b=>b.id),['B1','B2','B3','B4']);
  bands.forEach((b,i)=>{close(b.distance,front*ratios[sample][i]);assert.equal(b.rf,ratios[sample][i]);close(b.distance/front,b.rf);assert.match(b.color,/^#[0-9a-f]{6}$/);assert.ok(b.distance>0&&b.distance<front);const s={sample,front,band:b.id};assert.equal(M.check(s,expected(s)).correct,true);assert.ok(M.record(s,expected(s)));count++;});
 }
 assert.equal(count,24);
 const first=M.run({sample:'leaf-a',front:60});first[0].distance=99;assert.equal(M.run({sample:'leaf-a',front:60})[0].distance,15);
 for(const bad of[null,{},[],{sample:'leaf-a',front:'60'},{sample:'leaf-a',front:50},state()])assert.equal(M.run(bad),null);
});

test('answers must be finite numbers and physically ordered, never blanks or coercible text',()=>{
 const s=state(),good=expected(s);
 for(const bad of[null,undefined,{},[],Object.create(good),{...good,frontDistance:''},{...good,frontDistance:'60'},{...good,bandDistance:'15'},{...good,rf:'0.25'},{...good,rf:NaN},{...good,rf:Infinity},{...good,rf:0},{...good,rf:1},{...good,bandDistance:0},{...good,bandDistance:60},{...good,frontDistance:0},{...good,extra:true}]){assert.equal(M.check(s,bad).correct,false);assert.equal(M.record(s,bad),null);}
 let called=false;const getter={...good};Object.defineProperty(getter,'rf',{get(){called=true;return .25;}});assert.equal(M.check(s,getter).correct,false);assert.equal(called,false);
});

test('teaching tolerances bound both raw distances, authored Rf and entered ratio consistency',()=>{
 const s=state({front:40}),good=expected(s);
 assert.equal(M.check(s,{...good,frontDistance:40.25}).correct,true);
 assert.equal(M.check(s,{...good,frontDistance:40.2501}).correct,false);
 assert.equal(M.check(s,{...good,bandDistance:10.25,rf:.255}).correct,true);
 assert.equal(M.check(s,{...good,bandDistance:10.2501,rf:.255}).correct,false);
 assert.equal(M.check(s,{...good,rf:.2551}).correct,true);
 assert.equal(M.check(s,{...good,rf:.2552}).correct,false);
 const inconsistent=M.check(s,{frontDistance:39.75,bandDistance:10.25,rf:.25});assert.equal(inconsistent.correct,false);assert.match(inconsistent.feedback,/also agree with your entered/);
 const wrongOrigin=M.check(s,{frontDistance:60,bandDistance:30,rf:.5});assert.equal(wrongOrigin.correct,false);assert.match(wrongOrigin.feedback,/pencil origin/);
});

test('checked records retain raw numerical readings with reconstructed provenance and defensive state',()=>{
 const r=row({}, {frontDistance:60.1,bandDistance:15.05,rf:.25});assert.ok(r);assert.deepEqual(r,{state:state(),frontDistance:60.1,bandDistance:15.05,rf:.25,dataKind:'synthetic_chromatogram'});
 assert.deepEqual(M.validRecord({...r,dataKind:'physical_experiment'}),r);
 for(const bad of[null,[],{},Object.create(r),{...r,notes:'private'},{...r,mastery:100},{...r,rf:999},{...r,frontDistance:'60'},{...r,state:{...r.state,front:61}},{...r,state:{sample:'leaf-a',front:60}}])assert.equal(M.validRecord(bad),null);
 const copy=M.validRecord(r);copy.state.front=80;copy.rf=.99;assert.equal(r.state.front,60);assert.equal(r.rf,.25);
 let called=false;const getter={...r};Object.defineProperty(getter,'dataKind',{get(){called=true;return 'x';}});assert.equal(M.validRecord(getter),null);assert.equal(called,false);
});

test('bounded notebook sanitizer deduplicates latest valid configurations and rejects unsafe records',()=>{
 const all=[];for(const sample of['leaf-a','leaf-b'])for(const front of[40,60,80])for(const band of['B1','B2','B3','B4'])all.push(row({sample,front,band}));
 assert.equal(M.sanitizeRecords([...all,...all]).length,24);assert.equal(M.sanitizeRecords(all).length,M.constants.MAX_RECORDS);
 const first=row(),last=row({}, {frontDistance:60.1,bandDistance:15.05});const result=M.sanitizeRecords([first,{...first,rf:999},last]);assert.equal(result.length,1);assert.equal(result[0].frontDistance,60.1);result[0].state.front=40;assert.equal(last.state.front,60);
 assert.deepEqual(M.sanitizeRecords({trials:all}),[]);assert.deepEqual(M.sanitizeRecords([first,...Array(200).fill(null)]),[]);
 let called=false;const sparse=[];Object.defineProperty(sparse,'0',{get(){called=true;return first;}});sparse[3]=first;assert.equal(M.sanitizeRecords(sparse).length,1);assert.equal(called,false);
 assert.deepEqual(M.sanitizeRecords(new Proxy([],{get(){throw Error('trap');}})),[]);
 assert.equal(M.sanitizeRecords([{...first,dataKind:'=HYPERLINK("bad")'}])[0].dataKind,'synthetic_chromatogram');
});

test('summaries compare distinct front settings by mixture and band without fabricated averages',()=>{
 const rows=[row({front:80}),row({front:40}),row({front:60}),row({front:60}),row({sample:'leaf-b'}),row({band:'B2'})],groups=M.summarize(rows);
 assert.equal(groups.length,3);const g=groups.find(g=>g.sample==='leaf-a'&&g.band==='B1');assert.equal(g.count,3);assert.deepEqual(g.points.map(p=>p.front),[40,60,80]);assert.deepEqual(g.points.map(p=>p.bandDistance),[10,15,20]);assert.ok(g.points.every(p=>p.rf===.25));assert.equal(Object.hasOwn(g,'mean'),false);assert.match(g.limitation,/not independent repeats.*no average/);
 assert.deepEqual(M.summarize(null),[]);
});

test('retrieval and application questions have one explained answer and reject invalid grades',()=>{
 assert.deepEqual(M.questions.map(q=>q.id),['origin','dimensionless','ink','submersion','front','identity']);
 for(const q of M.questions){assert.ok(q.prompt.length>20&&q.explanation.length>50);assert.equal(new Set(q.options).size,4);for(let i=0;i<4;i++){const result=M.grade(q.id,i);assert.equal(result.correct,i===q.answer);assert.equal(result.explanation,q.explanation);}assert.equal(M.grade(q.id,String(q.answer)),null);}
 for(const pair of[[null,0],['missing',0],['origin',-1],['origin',4],['origin',NaN],['origin',.5]])assert.equal(M.grade(...pair),null);
});
