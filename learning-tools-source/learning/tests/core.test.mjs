import test from 'node:test';
import assert from 'node:assert/strict';
import { ReviewSession } from '../src/review.js';
import { Notebook } from '../src/notebook.js';
import { catalog,lexicalSearch } from '../src/catalog.js';
const memory=()=>{const values=new Map();return{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)}};
const locks={request:async(_name,_options,callback)=>callback()};
test('review attempts require reveal, schedule into the future, and survive reload without cross-subject contamination',async()=>{
  const storage=memory();let now=new Date('2026-10-24T10:00:00.000Z');const s=new ReviewSession('physics',{storage,now:()=>now,locks});
  assert.equal(s.queue().length,8);await assert.rejects(s.rate('net-force',3),/Reveal/);
  s.reveal('net-force');const card=await s.rate('net-force',3);assert.equal(card.reps,1);assert.ok(card.due>now);assert.equal(s.queue().length,7);
  const restored=new ReviewSession('physics',{storage,now:()=>now,locks});assert.equal(restored.events.length,1);assert.equal(restored.state('net-force').due.toISOString(),card.due.toISOString());
  assert.equal(new ReviewSession('biology',{storage,now:()=>now,locks}).events.length,0);
  now=new Date(card.due.getTime()+1);assert.ok(restored.queue().some(x=>x.id==='net-force'));restored.reveal('net-force');await restored.rate('net-force',1);assert.equal(restored.events.length,2);
});
test('export/import merges idempotently, rejects corruption/future clocks and never overwrites history on failure',async()=>{
  const now=()=>new Date('2026-10-24T10:00:00.000Z');const a=new ReviewSession('biology',{now});a.reveal('enzyme');await a.rate('enzyme',4);
  const b=new ReviewSession('biology',{now});await b.import(JSON.parse(JSON.stringify(a.snapshot())));await b.import(a.snapshot());assert.equal(b.events.length,1);assert.equal(b.state('enzyme').due.toISOString(),a.state('enzyme').due.toISOString());
  for(const bad of [{...a.snapshot(),subject:'physics'},{...a.snapshot(),events:[{...a.events[0],at:'2030-01-01T00:00:00.000Z'}]},{...a.snapshot(),events:[{...a.events[0],rating:99}]},{...a.snapshot(),events:[{...a.events[0],rating:1}]}])await assert.rejects(b.import(bad));
  assert.equal(b.events.length,1);
});
test('invalid persisted state is preserved and a blocked store remains usable with an export warning',async()=>{
  const store=memory();store.setItem('entelloq.next.review.v1.physics','broken');const s=new ReviewSession('physics',{storage:store,locks});assert.match(s.warning,/preserved/);s.reveal('energy');await s.rate('energy',3);assert.equal(store.getItem(s.key),'broken');assert.equal(s.snapshot().events.length,1);
  const blocked=new ReviewSession('physics',{storage:{getItem:()=>null,setItem:()=>{throw Error('quota')}},locks});blocked.reveal('energy');await blocked.rate('energy',3);assert.match(blocked.warning,/Export/);
});
test('Yjs concurrent edits merge in both directions, duplicate imports are idempotent, undo is local',()=>{
  const opts={storage:memory(),channelFactory:()=>null};const a=new Notebook('physics','trial',opts);const b=new Notebook('physics','trial',{...opts,storage:memory()});
  a.setText('Prediction: ');b.import(a.export());a.undo.stopCapturing();b.undo.stopCapturing();a.setText('Prediction: faster');b.setText('Prediction: slower');
  const ea=a.export(),eb=b.export();a.import(eb);b.import(ea);assert.equal(a.text.toString(),b.text.toString());assert.match(a.text.toString(),/faster/);assert.match(a.text.toString(),/slower/);
  a.import(eb);assert.equal(a.text.toString(),b.text.toString());a.undo.undo();assert.match(a.text.toString(),/slower/);assert.doesNotMatch(a.text.toString(),/faster/);
  a.destroy();b.destroy();
});
test('notebook restore and namespace boundaries preserve text, reject bad imports before mutation',()=>{
  const storage=memory();const a=new Notebook('biology','trial',{storage,channelFactory:()=>null});a.setText('<img onerror=alert(1)> enzyme concentration');a.destroy();
  const b=new Notebook('biology','trial',{storage,channelFactory:()=>null});assert.match(b.text.toString(),/<img/);const before=b.text.toString();assert.throws(()=>b.import({...b.export(),subject:'physics'}));assert.throws(()=>b.import({...b.export(),update:'INVALID!'}));assert.throws(()=>b.setText('x'.repeat(50001)));assert.equal(b.text.toString(),before);b.destroy();
});
test('keyword search is transparent, subject scoped, and does not invent unmatched results',()=>{assert.equal(lexicalSearch('biology','enzyme')[0].id,'enzyme');assert.equal(lexicalSearch('physics','zzzzqqqq').length,0);assert.equal(catalog.physics.length,8);assert.equal(catalog.biology.length,8);});
