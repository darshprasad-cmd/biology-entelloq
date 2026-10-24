import test from 'node:test';
import assert from 'node:assert/strict';
import { ReviewSession } from '../src/review.js';

const now=()=>new Date('2026-10-24T10:00:00.000Z');
function memory(){const values=new Map();return {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};}
function serialLocks(){
  const queues=new Map();
  return {request(name,options,callback){assert.equal(options.mode,'exclusive');const task=(queues.get(name)||Promise.resolve()).then(callback);queues.set(name,task.catch(()=>{}));return task;}};
}
const opts=()=>({storage:memory(),locks:serialLocks(),now});
const read=(store,key)=>JSON.parse(store.getItem(key));

test('pre-opened sessions concurrently preserve different cards for both subjects',async()=>{
  for(const [subject,ids] of [['biology',['enzyme','osmosis']],['physics',['energy','net-force']]]){
    const options=opts(),a=new ReviewSession(subject,options),b=new ReviewSession(subject,options);
    a.reveal(ids[0]);b.reveal(ids[1]);await Promise.all([a.rate(ids[0],3),b.rate(ids[1],4)]);
    const saved=read(options.storage,a.key);assert.equal(saved.events.length,2);
    assert.deepEqual(new Set(saved.events.map(event=>event.cardId)),new Set(ids));
    assert.equal(new ReviewSession(subject,options).events.length,2);
  }
});

test('same-card concurrency saves once and rejects the stale second rating without loss',async()=>{
  const options=opts(),a=new ReviewSession('biology',options),b=new ReviewSession('biology',options);
  a.reveal('enzyme');b.reveal('enzyme');
  const outcomes=await Promise.allSettled([a.rate('enzyme',3),b.rate('enzyme',4)]);
  assert.equal(outcomes.filter(value=>value.status==='fulfilled').length,1);
  assert.match(outcomes.find(value=>value.status==='rejected').reason.message,/already been scheduled/);
  const saved=read(options.storage,a.key);assert.equal(saved.events.length,1);assert.equal(saved.events[0].rating,3);
  assert.equal(b.events.length,1);assert.equal(b.queue().some(card=>card.id==='enzyme'),false);
});

test('stale-session import preserves newly saved attempts and duplicate imports remain idempotent',async()=>{
  const options=opts(),a=new ReviewSession('biology',options),b=new ReviewSession('biology',options),imported=new ReviewSession('biology',{now});
  a.reveal('enzyme');await a.rate('enzyme',3);imported.reveal('osmosis');await imported.rate('osmosis',4);
  await b.import(imported.snapshot());await b.import(imported.snapshot());
  const saved=read(options.storage,a.key);assert.equal(saved.events.length,2);assert.ok(saved.events.some(event=>event.id===a.events[0].id));
});

test('unavailable locks or SecurityError preserve valid stored history and retain new attempts for export',async()=>{
  for(const locks of [null,{request:async()=>{throw new DOMException('Opaque origin','SecurityError');}}]){
    const options=opts(),initial=new ReviewSession('biology',options);initial.reveal('enzyme');await initial.rate('enzyme',3);
    const before=options.storage.getItem(initial.key),fallback=new ReviewSession('biology',{...options,locks});
    fallback.reveal('osmosis');await fallback.rate('osmosis',4);
    assert.equal(options.storage.getItem(initial.key),before);assert.equal(fallback.snapshot().events.length,2);assert.match(fallback.warning,/Session only.*Export/);
  }
});

test('corruption occurring after the session opens is preserved rather than overwritten',async()=>{
  const options=opts(),a=new ReviewSession('biology',options);options.storage.setItem(a.key,'broken after opening');
  a.reveal('enzyme');await a.rate('enzyme',3);
  assert.equal(options.storage.getItem(a.key),'broken after opening');assert.equal(a.events.length,1);assert.match(a.warning,/preserved.*export/);
});

test('a failed write keeps valid stored history and an exportable in-memory attempt',async()=>{
  const options=opts(),a=new ReviewSession('biology',options);a.reveal('enzyme');await a.rate('enzyme',3);
  const before=options.storage.getItem(a.key);const blocked={getItem:options.storage.getItem,setItem:()=>{throw new DOMException('Quota','QuotaExceededError');}};
  const b=new ReviewSession('biology',{...options,storage:blocked});b.reveal('osmosis');await b.rate('osmosis',3);
  assert.equal(options.storage.getItem(a.key),before);assert.equal(b.events.length,2);assert.match(b.warning,/full or blocked.*Export/);
});

test('double clicks cannot queue two ratings from one session',async()=>{
  const options=opts(),a=new ReviewSession('biology',options);a.reveal('enzyme');
  const outcomes=await Promise.allSettled([a.rate('enzyme',3),a.rate('enzyme',4)]);
  assert.equal(outcomes.filter(value=>value.status==='fulfilled').length,1);assert.equal(read(options.storage,a.key).events.length,1);
});

test('clock, duplicate, conflicting and over-cap inputs remain rejected without persistence mutation',async()=>{
  const options=opts(),a=new ReviewSession('biology',options);a.reveal('enzyme');await a.rate('enzyme',3);
  const before=options.storage.getItem(a.key),event=a.events[0],snapshot=a.snapshot();
  for(const events of [[event,event],[{...event,rating:2}],[{...event,at:'2030-01-01T00:00:00.000Z'}],Array.from({length:10001},(_,i)=>({...event,id:'event-'+i}))]){
    await assert.rejects(a.import({...snapshot,events}));assert.equal(options.storage.getItem(a.key),before);
  }
  const many=Array.from({length:10000},(_,i)=>({...event,id:'event-'+i}));
  const capped=new ReviewSession('biology',{...options,storage:memory()});
  capped.storage.setItem(capped.key,JSON.stringify({...snapshot,events:many}));
  capped.reveal('osmosis');await assert.rejects(capped.rate('osmosis',3),/compatible/);
  assert.equal(read(capped.storage,capped.key).events.length,10000);
});
