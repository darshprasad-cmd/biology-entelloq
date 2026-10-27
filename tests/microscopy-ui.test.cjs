'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),key='bioq.cbse.microscopy.v1';
const source=fs.readFileSync(path.join(root,'src/cbse/microscopy-ui.js'),'utf8');
function context(store=new Map()){
 const c={localStorage:{getItem:k=>store.get(k)||null,setItem:(k,value)=>store.set(k,value)}};
 for(const file of ['microscopy-model.js','microscopy-ui.js'])vm.runInNewContext(fs.readFileSync(path.join(root,'src/cbse',file),'utf8'),c);
 return c;
}
function row(specimen='onion',observation='Elongated adjoining outlines and darker stained nuclei.'){
 return {state:{specimen,prepared:true,stain:true,mount:'flat',objective:40,focus:specimen==='onion'?52:46,light:65,x:0,y:0},observation};
}
const plain=value=>JSON.parse(JSON.stringify(value));
function notebookContext(records){return context(new Map([[key,JSON.stringify({version:1,records})]]));}
// This only models the DOM slots needed to inspect escaping. Real interaction,
// focus, geometry and responsive checks belong to check-microscopy-browser.cjs.
function hostStub(){
 const nodes=new Map();
 const host={innerHTML:'',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',value:'',checked:false,disabled:false,focus(){}});return nodes.get(selector);},querySelectorAll(){return[];}};
 return {host,nodes};
}
function parseCSV(text){
 const records=[];let fields=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
  else if(ch===','&&!quoted){fields.push(field);field='';}
  else if(ch==='\n'&&!quoted){fields.push(field.replace(/\r$/,''));records.push(fields);fields=[];field='';}
  else field+=ch;
 }
 assert.equal(quoted,false,'CSV quotes remain balanced');
 return records;
}

test('microscopy notebook admits only versioned usable model observations and discards malformed states',()=>{
 for(const corrupt of ['broken','null','{}',JSON.stringify({version:2,records:[row()]}),JSON.stringify({version:1,records:{}}),JSON.stringify({version:1,records:null})]){
  assert.equal(context(new Map([[key,corrupt]])).BioMicroscopy.load().length,0);
 }
 const valid=row();
 const invalid=[null,{},[],true,42,{state:valid.state},{...valid,observation:600},row('frog'),row('onion',''),row('onion','x'.repeat(601)),row('onion','cell\u0000nucleus')];
 for(const patch of [{prepared:false},{stain:false},{mount:'bubbles'},{mount:'fold'},{objective:100},{focus:0},{light:100},{x:1501},{y:-1501},{focus:'52'},{mastery:100}])invalid.push({...valid,state:{...valid.state,...patch}});
 const c=notebookContext([valid,...invalid,row('cheek')]);
 assert.deepEqual(plain(c.BioMicroscopy.load()).map(r=>r.state.specimen),['onion','cheek']);
});

test('stored conclusions are never trusted: total, field diameter and provenance are recomputed from raw state',()=>{
 const original={...row('cheek','  Flattened outlines and stained nuclei.  '),total:99999,fovUm:1,dataKind:'real_patient_slide',mastery:100};
 const api=notebookContext([original]).BioMicroscopy,r=plain(api.load()[0]);
 assert.equal(r.total,400);assert.equal(r.fovUm,450);assert.equal(r.dataKind,'illustrative_virtual_slide');
 assert.equal(r.observation,'Flattened outlines and stained nuclei.');assert.equal(Object.hasOwn(r,'mastery'),false);
 assert.equal(original.total,99999);assert.equal(original.observation,'  Flattened outlines and stained nuclei.  ');
 assert.deepEqual(Object.keys(r).sort(),['dataKind','fovUm','observation','state','total']);
 const bad={...original,state:{...original.state,total:999}};
 assert.equal(notebookContext([bad]).BioMicroscopy.load().length,0);
});

test('load and persist retain at most the latest forty raw observation records',()=>{
 const rows=Array.from({length:75},(_,i)=>row(i%2?'cheek':'onion','Field '+i));
 const loaded=notebookContext(rows).BioMicroscopy.load();
 assert.equal(loaded.length,40);assert.equal(loaded[0].observation,'Field 35');assert.equal(loaded[39].observation,'Field 74');
 const store=new Map(),api=context(store).BioMicroscopy;
 assert.equal(api.persist(rows),true);assert.equal(api.load().length,40);
 const persisted=JSON.parse(store.get(key));assert.equal(persisted.version,1);assert.equal(persisted.records.length,40);
 assert.equal(context(store).BioMicroscopy.load()[0].observation,'Field 35');
});

test('blocked or quota-exhausted storage falls back to the session without replacing any prior student notes',()=>{
 const existing=[['bioq.notes','lesson note'],['bioq.lab-notebook.v1.microscope','legacy microscope'],['bioq.cbse.practical-notes.v1.s9-e04','school preparation'],['bioq.cbse.potato-osmosis.v1','potato observations']];
 const store=new Map(existing),c=context(store),api=c.BioMicroscopy;
 assert.equal(api.KEY,key);assert.equal(api.persist([row()]),true);
 c.localStorage.setItem=()=>{throw Error('quota');};assert.equal(api.persist([row('cheek')]),false);
 assert.equal(api.load()[0].state.specimen,'cheek');assert.equal(context(store).BioMicroscopy.load()[0].state.specimen,'onion');
 for(const[k,v]of existing)assert.equal(store.get(k),v);
 const blocked=context();Object.defineProperty(blocked,'localStorage',{get(){throw Error('blocked');}});
 assert.equal(blocked.BioMicroscopy.load().length,0);assert.equal(blocked.BioMicroscopy.persist([row()]),false);
 assert.equal(blocked.BioMicroscopy.load().length,1);
});

test('CSV recomputes model values, escapes spreadsheet formula prefixes, commas, quotes and embedded newlines',()=>{
 const api=context().BioMicroscopy;
 const inputs=['=1+1','+SUM(1,2)','-1+2','@command',' \t=SUM(2,3)','Nucleus "dark", boundary pale.\nSecond field.'];
 const rows=inputs.map((text,i)=>({...row(i%2?'cheek':'onion',text),total:999,fovUm:-1}));
 const text=api.csv([...rows,row('frog')]),records=parseCSV(text);
 assert.equal(records.length,inputs.length+1);assert.equal(records[0].length,9);
 records.slice(1).forEach(fields=>{assert.equal(fields.length,9);assert.equal(fields[2],'400');assert.equal(fields[3],'450');assert.equal(fields[8],'illustrative_not_experimental');});
 inputs.slice(0,5).forEach((input,i)=>assert.equal(records[i+1][7],"'"+input.trim()));
 assert.equal(records[6][7],inputs[5]);assert.ok(text.endsWith('\r\n'));
 assert.equal(parseCSV(api.csv([])).length,1);
});

test('rendered notebook treats student markup as escaped text, with no network, camera or unrelated-storage mutation',()=>{
 const text='<img src=x onerror="alert(1)"> & a \'nucleus\' label';
 const api=notebookContext([row('onion',text)]).BioMicroscopy,{host}=hostStub();api.mount(host);
 const rendered=host.querySelector('.micro-records').innerHTML;
 assert.match(rendered,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; a &#39;nucleus&#39; label/);
 assert.doesNotMatch(rendered,/<img|<script|<iframe/);assert.equal(host.querySelector('[data-micro-count]').textContent,'(1)');
 assert.match(host.innerHTML,/not photomicrographs/);assert.match(host.innerHTML,/does not perform or certify the school practical/);
 assert.match(host.innerHTML,/does not grade the scientific accuracy/);assert.match(host.innerHTML,/normally lacks chloroplasts/);
 assert.match(host.innerHTML,/latest 40 observations/);assert.match(host.innerHTML,/replaces the oldest/);assert.match(host.innerHTML,/Download your CSV before adding more/);
 assert.doesNotMatch(source,/localStorage\.clear|removeItem|getUserMedia|fetch\(|XMLHttpRequest|sendBeacon/);
});

test('single-file source order and narrow class-nine guide integration include the microscopy bench',()=>{
 const builder=fs.readFileSync(path.join(root,'scripts/build-single-file.py'),'utf8');
 assert.match(builder,/"microscopy-model\.js", "microscopy-ui\.js"/);assert.match(builder,/"microscopy-ui\.css"/);
 assert.ok(builder.indexOf('"microscopy-ui.js"')<builder.indexOf('"practicals-ui.js"'));
 const integration=fs.readFileSync(path.join(root,'src/cbse/practicals-ui.js'),'utf8');
 assert.match(integration,/g\.id==='s9-e04'&&root\.BioMicroscopy/);assert.match(integration,/root\.BioMicroscopy\.mount\(bench\)/);
 assert.match(integration,/Interactive microscopy bench/);assert.match(integration,/bench\.focus\(\{preventScroll:true\}\)/);
 assert.match(integration,/g\.id==='b11-a-e03'&&root\.BioPotatoOsmosis/);
 assert.match(source,/ScienceSt_SecP1_2026-27\.pdf#page=19/);assert.match(source,/ielm103\.pdf#page=1/);
});
