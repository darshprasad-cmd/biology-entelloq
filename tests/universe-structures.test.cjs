const {test,before}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
let THREE,kit,data,structures,dnaGraph,factories;
before(async()=>{
  THREE=await import('data:text/javascript;base64,'+fs.readFileSync(path.join(root,'src/lab/vendor/three.module.min.js')).toString('base64'));
  const ctx2d=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>k in o?o[k]:()=>{}});
  const document={createElement:()=>({width:0,height:0,getContext:()=>ctx2d})};
  factories=new Map();
  const context=vm.createContext({THREE,document,UNI:{register:(key,fn)=>factories.set(key,fn)},texLoad:()=>new THREE.Texture()});
  for(const name of ['kit.js','data.js','stage_cosmic.js','stage_body.js','stage_cell.js','stage_molecular.js'])vm.runInContext(fs.readFileSync(path.join(root,'src/universe',name),'utf8'),context,{filename:name});
  vm.runInContext('this.kit=KIT;this.data=UNI_DATA;this.structures=MOL_STRUCTURES;this.graph=molDnaGraph;',context);
  ({kit,data,structures}=context);dnaGraph=context.graph;
});

test('haemoglobin contains all four deposited continuous chains and four complete hemes, not generic coils',()=>{
  assert.equal(structures.protein.sha256,'abf382e0fd84b53bd4c08b373d37c0d7fe9fbe1a9a9c3851b2f5f2fbbe627101');
  const chains=structures.protein.chains;
  assert.deepEqual(Array.from(chains,c=>c.id),['A','B','C','D']);
  assert.deepEqual(Array.from(chains,c=>c.ca.length),[141,146,141,146]);
  for(const c of chains){
    for(let i=1;i<c.ca.length;i++){
      assert.equal(c.ca[i][0],c.ca[i-1][0]+1);
      const d=new THREE.Vector3(...c.ca[i].slice(1)).distanceTo(new THREE.Vector3(...c.ca[i-1].slice(1)));
      assert.ok(d>2.7&&d<4.5,`${c.id} CA gap ${i}: ${d}`);
    }
    assert.equal(c.heme.length,43);assert.equal(c.heme.filter(a=>a[1]==='Fe').length,1);
    assert.ok(c.bonds.length>=45);
    const degree=new Array(c.heme.length).fill(0);c.bonds.forEach(([a,b])=>{degree[a]++;degree[b]++;});assert.ok(degree.every(n=>n>0));
  }
  assert.match(data.protein.modelNote,/4HHB/);assert.match(data.protein.facts.join(' '),/deoxygenated/);
  assert.doesNotMatch(JSON.stringify(data.protein),/Beta Sheet|Active Site/);
});

function componentCount(n,bonds){const seen=new Set(),adj=Array.from({length:n},()=>[]);bonds.forEach(([a,b])=>{adj[a].push(b);adj[b].push(a);});let total=0;for(let i=0;i<n;i++)if(!seen.has(i)){total++;const q=[i];seen.add(i);while(q.length){for(const j of adj[q.pop()])if(!seen.has(j)){seen.add(j);q.push(j);}}}return total;}

test('coordinate DNA has two continuous antiparallel chains with chemically complete bases and sugars',()=>{
  assert.equal(structures.dna.sha256,'df42f1506792f191b957227b061360652adcf6f813eb69d9ec553067ea584670');
  const rows=structures.dna.atoms,g=dnaGraph(rows);
  assert.equal(rows.length,486);assert.equal(g.residues.size,24);assert.equal(componentCount(rows.length,g.bonds),2);
  assert.equal(g.hbonds.length,32);
  const degree=new Array(rows.length).fill(0);
  for(const [a,b]of g.bonds){
    assert.equal(rows[a][0],rows[b][0],'no covalent link between strands');degree[a]++;degree[b]++;
    const distance=new THREE.Vector3(...rows[a].slice(5)).distanceTo(new THREE.Vector3(...rows[b].slice(5)));
    assert.ok(distance>1.1&&distance<1.95,`invalid covalent bond ${rows[a][3]}-${rows[b][3]} ${distance}`);
  }
  assert.ok(degree.every(n=>n>0),'no unconnected oxygen atoms or fragments');
  for(const [a,b]of g.hbonds){assert.notEqual(rows[a][0],rows[b][0]);assert.ok(new THREE.Vector3(...rows[a].slice(5)).distanceTo(new THREE.Vector3(...rows[b].slice(5)))<3.5);}
});

test('the enlarged A-T pair has fused purine rings, full sugar rings and exactly two hydrogen bonds',()=>{
  const rows=structures.dna.atoms.filter(r=>(r[0]==='A'&&r[1]===6)||(r[0]==='B'&&r[1]===19)),g=dnaGraph(rows);
  assert.equal(rows.length,41);assert.equal(g.hbonds.length,2);assert.equal(componentCount(rows.length,g.bonds),2);
  for(const type of ['DA','DT']){
    const ids=rows.map((r,i)=>r[2]===type?i:-1).filter(i=>i>=0),set=new Set(ids);
    const e=g.bonds.filter(([a,b])=>set.has(a)&&set.has(b)).length;
    assert.equal(e-ids.length+1,type==='DA'?3:2,`${type} cycle rank includes the pentose ring`);
  }
  assert.match(data.nucleotide.title,/Base Pair/);assert.match(data.nucleotide.hotspots.sugar.desc,/four carbon atoms and one oxygen/);
});

test('all 13 stages instantiate finite geometry and valid hotspots; updates remain finite',()=>{
  assert.equal(factories.size,13);
  const camera=new THREE.PerspectiveCamera(50,1.44,0.01,100);camera.position.z=3.5;
  for(const [key,factory]of factories){
    const stage=factory({THREE,KIT:kit,meta:data[key]});
    for(const dt of [0,0.016,0.05]){stage.update?.(dt,0,camera,1);stage.root.updateMatrixWorld(true);}
    let vertices=0;
    stage.root.traverse(obj=>{const a=obj.geometry?.attributes.position;if(a){vertices+=a.count;assert.ok(Array.from(a.array).every(Number.isFinite),key+' finite vertices');}assert.ok(obj.matrixWorld.elements.every(Number.isFinite),key+' finite transforms');});
    assert.ok(vertices>100,key+' populated');assert.ok(vertices<400000,key+' bounded geometry');
    const ids = new Set(), represented = new Set();
    for(const h of stage.hotspots){
      const v=new THREE.Vector3();h.get(v);assert.ok(v.toArray().every(Number.isFinite),key+' '+h.id);assert.ok(h.meta?.name,key+' labelled hotspot');
      assert.ok(!ids.has(h.id),key+' unique hotspot '+h.id);ids.add(h.id); represented.add(h.meta);
      assert.ok(h.meta.desc?.length>20,key+' explained subpart '+h.id);
    }
    for(const [part,meta] of Object.entries(data[key].hotspots||{}))assert.ok(represented.has(meta),key+' '+part+' has a real scene anchor, not a text-only invented subpart');
    if(key==='organ')assert.equal(stage.root.userData.structure.coronariesSurfaceProjected,true);
    if(key==='organism')assert.equal(stage.root.userData.structure.hands,2);
    if(key==='tissue')assert.equal(stage.root.userData.structure.branches,12);
    if(key==='atom'){assert.equal(stage.root.userData.structure.configuration,'1s2 2s2 2p2');assert.match(data.atom.modelNote,/not a solved or measured/);}
    stage.dispose();
  }
});
