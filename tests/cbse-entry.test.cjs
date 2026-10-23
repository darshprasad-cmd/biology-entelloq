const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function context(storage=new Map()){
 const value={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
 for(const file of ['curriculum.js','entry.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'src/cbse',file),'utf8'),value);
 return value;
}
test('four separate current-year biology strands are honest supporting-resource maps',()=>{
 const c=context(),data=c.BIO_CBSE_DATA;assert.equal(data.year,'2026–27');assert.deepEqual(Object.keys(data.courses),['9','10','11','12']);
 const lib={window:{}};for(const n of ['topics','extended-core','extended-systems'])vm.runInNewContext(fs.readFileSync(path.join(root,'src/library',n+'.js'),'utf8'),lib);
 const ids=new Set(lib.window.BIO_LIBRARY.topics.map(t=>t.id));
 for(const course of Object.values(data.courses)){assert.match(course.source,/^https:\/\/cbseacademic\.nic\.in\/.*2026-27\.pdf$/);assert.ok(course.note.length>50);assert.equal(new Set(course.units.map(u=>u.id)).size,course.units.length);
  for(const unit of course.units){assert.equal(unit.status,'supporting-resources');assert.ok(unit.gap.length>50);assert.ok(unit.topics.length);for(const id of unit.topics)assert.ok(ids.has(id),id);}
 }
 assert.deepEqual(Array.from(data.courses['9'].units,u=>u.id),['cells','tissues','reproduction','diversity','earth']);
 assert.match(data.courses['10'].note,/teacher/);assert.match(data.courses['11'].note,/Solanaceae/);
});
test('profile validation normalizes only bounded non-identifying preferences',()=>{
 const api=context().BioCBSE,base={version:1,classYear:'12',goal:'practice',minutes:30,focus:'genetics',name:'not stored'};
 assert.equal(JSON.stringify(api.valid(base)),JSON.stringify({version:1,classYear:'12',goal:'practice',minutes:30,focus:'genetics'}));
 for(const change of [{version:2},{classYear:'8'},{classYear:'__proto__'},{goal:'constructor'},{minutes:5},{focus:'cells'}])assert.equal(api.valid({...base,...change}),null);
});
test('saving, resetting and corrupt or blocked storage never touch student data',()=>{
 const store=new Map([['bioq.notes','untouched'],['bioq.cbse.profile.v1','bad json']]),c=context(store);
 assert.equal(c.BioCBSE.read(),null);
 assert.equal(c.BioCBSE.save({version:1,classYear:'9',goal:'foundations',minutes:10,focus:'cells'}),true);
 assert.equal(c.BioCBSE.read().classYear,'9');assert.equal(store.get('bioq.notes'),'untouched');
 Object.defineProperty(c,'localStorage',{get(){throw Error('blocked');}});
 assert.equal(c.BioCBSE.read(),null);assert.equal(c.BioCBSE.save({version:1,classYear:'9',goal:'revision',minutes:20,focus:'cells'}),false);
});
test('first-visit code precedes the manifest and specimen payload without changing launcher boundaries',()=>{
 const shell=fs.readFileSync(path.join(root,'src/single-file/shell.html'),'utf8');
 assert.ok(shell.indexOf('__BIOQ_CBSE_ENTRY__')<shell.indexOf('__BIOQ_MANIFEST__'));
 assert.ok(shell.indexOf('<dialog id="bio-cbse"')<shell.indexOf('__BIOQ_CBSE_ENTRY__'));
 const js=fs.readFileSync(path.join(root,'src/cbse/entry.js'),'utf8');
 assert.doesNotMatch(js,/fetch\(|getUserMedia|localStorage\.clear|sessionStorage\.clear/);
 assert.match(js,/dialog\.showModal\(\)/);assert.match(js,/pendingIncoming/);
});
