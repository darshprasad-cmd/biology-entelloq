const test = require('node:test');
const assert = require('node:assert/strict');
const science = require('../assets/entelloq-science.js');
function memory() { const map = new Map(); return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}; }
const catalog = [
 {id:'pendulum',title:'Simple pendulum',subject:'physics',kind:'lab',description:'Period and gravity'},
 {id:'mitosis',title:'Mitosis',subject:'biology',kind:'lab',description:'Cell division'},
 {id:'ohm',title:'Ohm’s law',subject:'physics',kind:'lab',tags:['circuit','current','voltage']},
 {id:'micro',title:'Onion cell microscopy',subject:'biology',kind:'lab'}
];
test('deterministic natural-language search and scientific aliases route both subjects',()=>{
 assert.equal(science.search(catalog,'how does a pendulum swing')[0].id,'pendulum');
 assert.equal(science.search(catalog,'why do cells divide')[0].id,'mitosis');
 assert.equal(science.search(catalog,'resistor circuit')[0].id,'ohm');
 assert.equal(science.search(catalog,'microscope')[0].id,'micro');
 assert.deepEqual(science.search(catalog,'temperature pendulum'),[]);
});
test('preview flag has explicit off switch and remains off on public origins',()=>{
 assert.equal(science.enabled({hostname:'localhost',search:''}),true);
 assert.equal(science.enabled({hostname:'localhost',search:'?excellence=0'}),false);
 assert.equal(science.enabled({hostname:'physics.entelloq.com',search:''}),false);
 assert.equal(science.enabled({hostname:'physics.entelloq.com',search:'?excellence=1'}),true);
 assert.equal(science.classroomEnabled({search:''}),false);
});
test('save/reload keeps config, units, graph and provenance',()=>{
 const storage=memory(), n=science.createNotebook(storage), input={subject:'physics',title:'Trial',config:{mass:2},measurements:[{name:'force',value:4,unit:'N'}],graph:{x:'s',y:'m',points:[[0,0],[1,2]]},model:{classification:'analytical'},observations:'A test'};
 const r=n.save(input); assert.equal(r.ok,true);
 input.config.mass=30;
 const again=science.createNotebook(storage).list()[0]; assert.equal(again.config.mass,2); assert.equal(again.measurements[0].unit,'N');
 assert.equal(n.status().cloudSync,false);
});
test('full, blocked, and unconfirmed storage never reports saved',()=>{
 for(const storage of [ {getItem(){throw Error('blocked')},setItem(){}}, {getItem(){return null},setItem(){throw Error('quota')}}, {getItem(){return null},setItem(){}} ]){
  const n=science.createNotebook(storage); assert.equal(n.save({title:'Trial',subject:'physics'}).ok,false);
 }
});
test('corrupt notebook is preserved until explicit recovery',()=>{
 const storage=memory();storage.setItem('n','not json'); const n=science.createNotebook(storage,'n'); assert.deepEqual(n.list(),[]);assert.equal(n.status().available,false); assert.equal(n.save({title:'Trial',subject:'biology'}).ok,false);assert.equal(storage.getItem('n'),'not json');
});
test('stale edits and missing revision are rejected instead of overwriting',()=>{
 const storage=memory(), a=science.createNotebook(storage), b=science.createNotebook(storage), original=a.save({title:'Trial',subject:'biology'}).entry;
 const changed=b.save({...original,observations:'second'},original.updatedAt);assert.equal(changed.ok,true);
 assert.equal(a.save({...original,observations:'stale'},original.updatedAt).conflict,true);
 assert.equal(a.save({...original,observations:'unversioned'}).conflict,true);
 assert.equal(a.list()[0].observations,'second');
 assert.equal(a.remove(original.id,original.updatedAt).conflict,true);
});
test('CSV prevents formula injection while preserving negative scientific measurements',()=>{
 const csv=science.exportCSV([{title:'=HYPERLINK("bad")',observations:'+CMD()',measurements:[{name:'x',value:-1.25,unit:'m'}]}]);
 assert.match(csv,/'=HYPERLINK/); assert.match(csv,/'\+CMD/); assert.match(csv,/"-1.25"/);
});
test('print report escapes observations and preserves scientific context',()=>{
 const html=science.reportHTML([{title:'<script>x</script>',observations:'<img src=x onerror=alert(1)>',config:{mass:2},measurements:[{name:'Mass',value:2,unit:'kg'}]}]);
 assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;img/);assert.match(html,/kg/);assert.match(html,/Configuration/);
});
test('rejects dangerous and oversized serialized records',()=>{
 const n=science.createNotebook(memory()); assert.equal(n.save(JSON.parse('{"subject":"physics","title":"x","__proto__":{"polluted":true}}')).ok,false);
 assert.equal(n.save({subject:'physics',title:'x',observations:'x'.repeat(2000001)}).ok,false);
});
test('report renders only safe captured PNG images and CSV avoids raster payloads',()=>{
 const entry={title:'Trial',graph:{kind:'canvas-observation',image:'data:image/png;base64,aGVsbG8=',note:'Actual canvas capture'}};
 assert.match(science.reportHTML([entry]),/<img style=/);assert.doesNotMatch(science.exportCSV([entry]),/aGVsbG8=/);
 entry.graph.image='https://attacker.invalid/tracker.png';assert.doesNotMatch(science.reportHTML([entry]),/<img /);
});
test('aggregate notebooks above the per-entry limit remain readable and exportable',()=>{
 const n=science.createNotebook(memory());for(let i=0;i<3;i++)assert.equal(n.save({title:'Trial '+i,subject:'physics',observations:'x'.repeat(800000)}).ok,true);
 const entries=n.list();assert.equal(entries.length,3);assert.equal(n.status().available,true);assert.equal(JSON.parse(n.exportJSON(entries)).entries.length,3);
});
test('invalid IDs never poison an existing notebook',()=>{
 const n=science.createNotebook(memory());assert.equal(n.save({title:'Trial',subject:'biology'}).ok,true);
 assert.equal(n.save({id:42,title:'Bad',subject:'biology'}).ok,false);assert.equal(n.list().length,1);
});
test('cross-subject preview uses only explicit same-host loopback origins and retains the route',()=>{
 const item={subject:'biology',url:'https://biology.entelloq.com/#labs/osmosis'};
 const loc={hostname:'127.0.0.1',search:'?excellence=1&eqPhysics=http%3A%2F%2F127.0.0.1%3A8791&eqBiology=http%3A%2F%2F127.0.0.1%3A8792'};
 const url=new URL(science.resolveSubjectURL(item,loc));assert.equal(url.origin,'http://127.0.0.1:8792');assert.equal(url.hash,'#labs/osmosis');assert.equal(url.searchParams.get('excellence'),'1');
 assert.equal(new URL(science.resolveSubjectURL(item,{hostname:'127.0.0.1',search:'?eqBiology=https://evil.example'})).origin,'https://biology.entelloq.com');
 assert.equal(new URL(science.resolveSubjectURL(item,{hostname:'physics.entelloq.com',search:loc.search})).origin,'https://biology.entelloq.com');
 assert.throws(()=>science.resolveSubjectURL({subject:'biology',url:'https://evil.example/#labs'},loc));
});
test('generated metadata cannot turn a successful write into a reported failure',()=>{
 const n=science.createNotebook(memory()),entry={subject:'physics',title:'Near limit',observations:''};entry.observations='x'.repeat(1999990-JSON.stringify(entry).length);
 assert.equal(n.save(entry).ok,false);assert.equal(n.list().length,0);
});
test('CSV remains exportable with nullable or primitive imported measurements',()=>{
 const n=science.createNotebook(memory()),saved=n.save({subject:'biology',title:'Mixed',measurements:[null,0,'not available',{name:'t',value:2,unit:'s'}]});assert.equal(saved.ok,true);assert.match(n.exportCSV(n.list()),/not available/);
});
