'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),KEY='bioq.cbse.chromatography.v1';
const source=fs.readFileSync(path.join(root,'src/cbse/chromatography-ui.js'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));
const ratios={'leaf-a':[.25,.45,.65,.85],'leaf-b':[.2,.4,.7,.9]};
function row(sample='leaf-a',front=60,band='B1',extra={}){const rf=ratios[sample][Number(band.slice(1))-1];return {state:{sample,front,band},frontDistance:front,bandDistance:Number((front*rf).toFixed(2)),rf,dataKind:'synthetic_chromatogram',...extra};}
function context(store=new Map()){const c={localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)}};for(const file of ['chromatography-model.js','chromatography-ui.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'src/cbse',file),'utf8'),c);return c;}
function withRows(records){return context(new Map([[KEY,JSON.stringify({version:1,records})]]));}
test('chromatography notebook ignores corrupt versions and forged measured records',()=>{
 for(const value of ['broken','null','[]','{}',JSON.stringify({version:2,records:[row()]}),JSON.stringify({version:1,records:null})])assert.equal(context(new Map([[KEY,value]])).BioChromatography.load().length,0);
 const valid=row(),invalid=[null,{},[],true,42,{...valid,frontDistance:99},{...valid,bandDistance:99},{...valid,rf:99},{...valid,rf:'0.25'},{...valid,mastery:100},{...valid,state:{sample:'<img src=x>',front:60,band:'B1'}},{...valid,state:{sample:'leaf-a',front:60,band:'B1',correct:true}}];
 assert.deepEqual(plain(withRows([valid,...invalid,row('leaf-b',80,'B4')]).BioChromatography.load()),[valid,row('leaf-b',80,'B4')]);assert.equal(context().BioChromatography.KEY,KEY);
});
test('checked notebook strips forged provenance and preserves only meaningful raw fields',()=>{
 const api=withRows([{...row(),dataKind:'physical_lab_certified'}]).BioChromatography;assert.equal(api.load()[0].dataKind,'synthetic_chromatogram');assert.deepEqual(Object.keys(api.load()[0]).sort(),['state','frontDistance','bandDistance','rf','dataKind'].sort());assert.equal(withRows([{...row(),correct:true}]).BioChromatography.load().length,0);
});
test('only 24 distinct sample-front-band observations survive repeated recordings',()=>{
 const store=new Map(),api=context(store).BioChromatography,rows=[];for(const sample of Object.keys(ratios))for(const front of [40,60,80])for(const band of ['B1','B2','B3','B4'])rows.push(row(sample,front,band));
 assert.equal(api.persist([...rows,...rows]),true);assert.equal(api.load().length,24);assert.equal(new Set(api.load().map(r=>[r.state.sample,r.state.front,r.state.band].join(':'))).size,24);assert.deepEqual(plain(context(store).BioChromatography.load()),plain(api.load()));
 for(const value of [null,undefined,{},'rows']){assert.equal(api.persist(value),true);assert.equal(api.load().length,0);}
});
test('load and persist cannot mutate caller-owned or internal checked observations',()=>{
 const store=new Map(),api=context(store).BioChromatography,input=row();api.persist([input]);input.state.sample='leaf-b';input.bandDistance=999;assert.deepEqual(plain(api.load()),[row()]);
 const before=store.get(KEY),external=api.load();for(const mutate of [()=>external[0].state.sample='<img>',()=>external[0].rf=999,()=>external.push({}),()=>external.length=0])try{mutate();}catch(error){assert.equal(error.name,'TypeError');}
 assert.deepEqual(plain(api.load()),[row()]);assert.equal(store.get(KEY),before);
});
test('blocked and full storage use session-only records without clearing unrelated notes',()=>{
 const others=[['bioq.notes','lesson'],['bioq.cbse.practical-notes.v1.b11-a-e08','preparation'],['bioq.cbse.pollen.v1','pollen'],['bioq.cbse.microscopy.v1','microscope'],['bioq.cbse.potato-osmosis.v1','osmosis']];
 const store=new Map(others),c=context(store),api=c.BioChromatography;assert.equal(api.persist([row()]),true);c.localStorage.setItem=()=>{throw Error('quota');};assert.equal(api.persist([row('leaf-b')]),false);assert.equal(api.load()[0].state.sample,'leaf-b');assert.equal(context(store).BioChromatography.load()[0].state.sample,'leaf-a');for(const[k,v]of others)assert.equal(store.get(k),v);
 const denied=context();Object.defineProperty(denied,'localStorage',{get(){throw Error('denied');}});assert.equal(denied.BioChromatography.load().length,0);assert.equal(denied.BioChromatography.persist([row('leaf-b')]),false);assert.equal(denied.BioChromatography.load().length,1);
});
test('CSV revalidates records and emits independent fixed numeric schema without formulas',()=>{
 const api=context().BioChromatography,header='sample,solvent_front_mm,band,band_distance_mm,rf,provenance\r\n';
 assert.equal(api.csv([row(),row('leaf-b',80,'B4'),{...row(),rf:'=SUM(1,2)'},{...row(),state:{sample:'=HYPERLINK()',front:60,band:'B1'}}]),header+'leaf-a,60,B1,15,0.25,synthetic_chromatogram\r\nleaf-b,80,B4,72,0.9,synthetic_chromatogram\r\n');
 assert.equal(api.csv([row('leaf-a',60,'B1',{rf:.254})]),header+'leaf-a,60,B1,15,0.254,synthetic_chromatogram\r\n','CSV retains an accepted raw reading rather than silently rounding it');
 assert.equal(api.csv(null),header);assert.equal(api.csv([{...row(),dataKind:'=BAD()'}]),api.csv([row()]));
});
test('new bench uses a narrow guide mount and local persistence without altering previous benches',()=>{
 const builder=fs.readFileSync(path.join(root,'scripts/build-single-file.py'),'utf8'),integration=fs.readFileSync(path.join(root,'src/cbse/practicals-ui.js'),'utf8'),css=fs.readFileSync(path.join(root,'src/cbse/chromatography-ui.css'),'utf8');
 assert.match(builder,/'chromatography-model\.js'|"chromatography-model\.js"/);assert.match(builder,/'chromatography-ui\.js'|"chromatography-ui\.js"/);assert.match(builder,/chromatography-ui\.css/);assert.ok(builder.indexOf('chromatography-ui.js')<builder.indexOf('practicals-ui.js'));
 assert.match(integration,/g\.id==='b11-a-e08'&&root\.BioChromatography/);assert.match(integration,/root\.BioChromatography\.mount\(bench\)/);for(const name of ['BioPollen','BioMicroscopy','BioPotatoOsmosis'])assert.ok(integration.includes('root.'+name+'.mount(bench)'));
 assert.match(source,/Biology_SecP2_2026-27\.pdf#page=7/);assert.match(source,/valueAsNumber/);assert.doesNotMatch(source,/localStorage\.clear|removeItem|getUserMedia|fetch\(|XMLHttpRequest|sendBeacon|setInterval|requestAnimationFrame/);
 assert.match(css,/prefers-reduced-motion/);assert.match(css,/:focus-visible/);assert.match(css,/min-height:\s*44px/);
});
