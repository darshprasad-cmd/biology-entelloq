'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/cbse/potato-osmosis-ui.js'),'utf8');
function context(store=new Map()){
 const c={localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)}};
 for(const file of ['potato-osmosis-model.js','potato-osmosis-ui.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'src/cbse',file),'utf8'),c);
 return c;
}
const row={concentration:20,direction:'inward',setup:'intact',repeat:1,timeMinutes:0,testLevel:8,controlLevel:8};
test('potato notebook loads only its versioned raw model observations',()=>{
 const key='bioq.cbse.potato-osmosis.v1';
 for(const corrupt of ['broken','null','{}',JSON.stringify({version:2,records:[row]}),JSON.stringify({version:1,records:Array(91).fill(row)})]){
  assert.equal(context(new Map([[key,corrupt]])).BioPotatoOsmosis.load().length,0);
 }
 const c=context(new Map([[key,JSON.stringify({version:1,records:[row,{...row,direction:'<script>'},{...row,testLevel:100},{...row,timeMinutes:10,testLevel:8},{...row,conclusion:'mastered'}]})]]));
 assert.deepEqual(JSON.parse(JSON.stringify(c.BioPotatoOsmosis.load())),[row]);
});
test('new notebook saves and session fallback never replace lesson, lab or preparation notes',()=>{
 const store=new Map([['bioq.notes','lesson'],['bioq.lab-notebook.v1.microscope','lab'],['bioq.cbse.practical-notes.v1.b11-a-e03','preparation']]);
 const c=context(store),api=c.BioPotatoOsmosis;
 assert.equal(api.KEY,'bioq.cbse.potato-osmosis.v1');assert.equal(api.persist([row]),true);
 assert.equal(JSON.stringify(api.load()),JSON.stringify([row]));
 assert.equal(context(store).BioPotatoOsmosis.load().length,1);
 c.localStorage.setItem=()=>{throw Error('quota');};assert.equal(api.persist([{...row,repeat:2}]),false);assert.equal(api.load()[0].repeat,2);
 assert.equal(store.get('bioq.notes'),'lesson');assert.equal(store.get('bioq.lab-notebook.v1.microscope'),'lab');assert.equal(store.get('bioq.cbse.practical-notes.v1.b11-a-e03'),'preparation');
 const blocked=context();Object.defineProperty(blocked,'localStorage',{get(){throw Error('blocked');}});
 assert.equal(blocked.BioPotatoOsmosis.load().length,0);assert.equal(blocked.BioPotatoOsmosis.persist([row]),false);assert.equal(blocked.BioPotatoOsmosis.load().length,1);
});
test('apparatus remains explicit simulation with signed comparison, faults, local-only storage and primary references',()=>{
 assert.match(source,/Simulated readings/);assert.match(source,/not a biological specimen or a calibrated prediction/);
 assert.match(source,/name="netChange"[^>]*min="-30"/);assert.match(source,/poto-direction/);assert.match(source,/value="outward"/);
 assert.match(source,/Punctured base/);assert.match(source,/Flooded rim/);assert.match(source,/control remains intact/);
 assert.match(source,/No practical-completion or mastery score/);assert.match(source,/never deletes your saved observations/);
 assert.match(source,/https:\/\/cbseacademic\.nic\.in\/[^" ]+#page=6/);assert.match(source,/https:\/\/ncert\.nic\.in\/[^" ]+kelm312\.pdf#page=1/);
 assert.doesNotMatch(source,/localStorage\.clear|removeItem|getUserMedia|fetch\(|XMLHttpRequest|sendBeacon/);
});
test('single-file source order loads the apparatus model and UI before the narrow practical integration',()=>{
 const builder=fs.readFileSync(path.join(root,'scripts/build-single-file.py'),'utf8');
 assert.match(builder,/"potato-osmosis-model\.js", "potato-osmosis-ui\.js", "practicals-ui\.js"/);
 assert.match(builder,/"potato-osmosis-ui\.css"/);
 const integration=fs.readFileSync(path.join(root,'src/cbse/practicals-ui.js'),'utf8');
 assert.match(integration,/g\.id==='b11-a-e03'&&root\.BioPotatoOsmosis/);
 assert.match(integration,/Interactive potato bench/);assert.match(integration,/bench\.focus/);
});
