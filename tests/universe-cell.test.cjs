const { test, before } = require('node:test');
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let THREE, KIT, data, factories, context;
before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  const canvasContext = new Proxy({ createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}), createRadialGradient:()=>({addColorStop(){}}) }, {get:(o,k)=>k in o?o[k]:()=>{}});
  factories = new Map();
  context = vm.createContext({THREE,document:{createElement:()=>({getContext:()=>canvasContext})},UNI:{register:(key,fn)=>factories.set(key,fn)}});
  for (const file of ['kit.js','data.js','stage_cell.js']) vm.runInContext(fs.readFileSync(path.join(root,'src/universe',file),'utf8'),context,{filename:file});
  vm.runInContext('this.kit=KIT;this.data=UNI_DATA;',context); KIT=context.kit;data=context.data;
});
function make(key) { const stage=factories.get(key)({THREE,KIT,meta:data[key]});stage.root.updateMatrixWorld(true);return stage; }
function named(root,name) { const result=[];root.traverse(o=>{if(o.name===name)result.push(o);});return result; }
function snapshot(stage) { const result=[];stage.root.updateMatrixWorld(true);stage.root.traverse(o=>{result.push(...o.matrixWorld.elements);if(o.geometry?.attributes.position)result.push(...o.geometry.attributes.position.array);});return result; }
function meshComponents(g) {
  const edges = new Map(), used = new Set(), indices=g.index.array;
  for(let i=0;i<indices.length;i+=3)for(let j=0;j<3;j++){const a=indices[i+j],b=indices[i+(j+1)%3];used.add(a);if(!edges.has(a))edges.set(a,[]);if(!edges.has(b))edges.set(b,[]);edges.get(a).push(b);edges.get(b).push(a);}
  let count=0;const seen=new Set();for(const i of used)if(!seen.has(i)){count++;const todo=[i];seen.add(i);while(todo.length)for(const j of edges.get(todo.pop()))if(!seen.has(j)){seen.add(j);todo.push(j);}}return count;
}

test('every cell and mitochondrial subpart is attached to real bounded geometry; zero-dt is stationary and teardown disposes resources',()=>{
  for(const key of ['cell','organelle']){
    const stage=make(key), before=snapshot(stage), resources=new Set();
    stage.update(0,0,null,1);assert.deepEqual(snapshot(stage),before,key+' initial reduced motion');
    let count=0;stage.root.traverse(o=>{if(o.geometry){resources.add(o.geometry);const pos=o.geometry.attributes.position;count+=pos.count;assert.ok(Array.from(pos.array).every(Number.isFinite));}if(o.material)resources.add(o.material);});
    assert.ok(count>10000&&count<220000,key+' bounded vertex budget '+count);
    assert.equal(stage.hotspots.length,Object.keys(data[key].hotspots).length);
    for(const h of stage.hotspots){assert.ok(h.object.parent,h.id+' actual scene object');const v=h.get(new THREE.Vector3());assert.ok(v.toArray().every(Number.isFinite));assert.ok(v.length()<1.65,h.id+' inside model bounds');}
    stage.update(0.1);const moved=snapshot(stage);stage.update(0);assert.deepEqual(snapshot(stage),moved,key+' paused frame');
    let disposed=0;for(const r of resources)r.addEventListener('dispose',()=>disposed++);stage.dispose();assert.ok(disposed>=resources.size,key+' GPU resources disposed');
  }
});

test('cristae belong to one connected inner membrane with folds and matrix-facing ATP synthase',()=>{
  const stage=make('organelle'), inner=named(stage.root,'continuous-inner-membrane-and-cristae')[0];
  assert.equal(meshComponents(inner.geometry),1,'no disconnected crista rings');assert.equal(stage.root.userData.structure.folds,8);
  const point=context.uniCellMembrane(THREE,{a:1.25,b:0.52,c:0.45,folds:8}).point;
  for(let f=0;f<8;f++){
    const x=-1.25*.66+f*1.25*1.32/7, t=Math.acos(x/1.25), fold=point(t,Math.PI*1.5), shoulder=point(Math.acos((x+0.105)/1.25),Math.PI*1.5);
    assert.ok(Math.abs(fold.y)<.06,'invaginated crest');assert.ok(Math.abs(shoulder.y)>.23,'returns to boundary membrane');
  }
  const enzymes=named(stage.root,'matrix-facing-atp-synthase');assert.equal(enzymes.length,24);
  for(const enzyme of enzymes){const head=enzyme.children[2].getWorldPosition(new THREE.Vector3()),base=enzyme.getWorldPosition(new THREE.Vector3()),normal=new THREE.Vector3(...enzyme.userData.matrixNormal);assert.ok(head.sub(base).dot(normal)>.085);assert.ok(normal.y>0,'heads face the matrix above the lower cristae');assert.ok(enzyme.position.distanceTo(new THREE.Vector3(...enzyme.userData.membranePoint))<1e-8);}
  assert.equal(named(stage.root,'mitochondrial-ribosome').length,14);
  const dna=named(stage.root,'circular-mitochondrial-dna')[0],curve=dna.geometry.parameters.path;
  assert.equal(curve.closed,true);assert.ok(curve.getPoint(0).distanceTo(curve.getPoint(1))<1e-8);
  assert.ok(curve.points.every(p=>p.y>0.09&&p.y<0.3&&p.z>0.17),'mtDNA in the matrix');stage.dispose();
});

test('nuclear pores are membrane openings and ER/Golgi are flattened sacs with connected ER junctions',()=>{
  const stage=make('cell'), nucleus=named(stage.root,'opened-nucleus')[0], envelopes=named(stage.root,'porous-nuclear-envelope');
  assert.equal(envelopes.length,2);assert.equal(named(stage.root,'nuclear-pore-complex').length,4);
  const full=context.uniCellMembrane(THREE,{a:.645,b:.645,c:.645,cut:.32}).geometry;
  for(const envelope of envelopes){assert.ok(envelope.geometry.index.count<full.index.count,'actual triangles removed for pores');assert.equal(meshComponents(envelope.geometry),1);}
  full.dispose();assert.equal(named(stage.root,'interphase-chromatin')[0].children.length,8);assert.equal(named(stage.root,'nucleolus')[0].parent,nucleus);
  const er=named(stage.root,'rough-er-cisternae')[0],golgi=named(stage.root,'golgi-stack')[0],sacs=er.children.filter(o=>o.userData.flattenedCisterna);
  assert.equal(sacs.length,4);assert.equal(golgi.children.filter(o=>o.userData.flattenedCisterna).length,5);
  for(const sac of [...sacs,...golgi.children.filter(o=>o.userData.flattenedCisterna)]){sac.geometry.computeBoundingBox();const size=sac.geometry.boundingBox.getSize(new THREE.Vector3());assert.ok(size.x/size.y>3.3&&size.z/size.y>1.7,'flattened membrane sac');}
  const spine=named(stage.root,'er-cisternal-connections')[0],connection=named(stage.root,'nuclear-envelope-er-continuity')[0],center=nucleus.getWorldPosition(new THREE.Vector3());
  const end=connection.geometry.parameters.path.getPoint(1).applyMatrix4(connection.matrixWorld);assert.ok(end.distanceTo(center)<.645,'connector enters nuclear envelope');
  const start=connection.geometry.parameters.path.getPoint(0).applyMatrix4(connection.matrixWorld),spineEnd=spine.geometry.parameters.path.getPoint(1).applyMatrix4(spine.matrixWorld);assert.ok(start.distanceTo(spineEnd)<.12,'ER spine physically meets nuclear connector');
  for(const sac of sacs){const bounds=new THREE.Box3().setFromObject(sac).expandByScalar(.065);let touches=false;for(let i=0;i<=40;i++)if(bounds.containsPoint(spine.geometry.parameters.path.getPoint(i/40).applyMatrix4(spine.matrixWorld)))touches=true;assert.ok(touches,'each cisterna meets common ER spine');
    const positions=sac.geometry.attributes.position,vertex=new THREE.Vector3();for(let i=0;i<positions.count;i++){vertex.fromBufferAttribute(positions,i).applyMatrix4(sac.matrixWorld);assert.ok(vertex.distanceTo(center)>.65,'ER membrane stays outside the nuclear envelope');}
  }
  assert.equal(named(stage.root,'smooth-er-network')[0].children.length,4);assert.equal(named(stage.root,'centrosome')[0].children.length,2);stage.dispose();
});
