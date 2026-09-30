const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const dir=path.join(__dirname,'../src/lab');
const create=new Function(fs.readFileSync(path.join(dir,'dissect.js'),'utf8').replace(/^export\s+/gm,'')+'\nreturn createDissection;')();
let THREE;
test.before(async()=>{THREE=await import('data:text/javascript;base64,'+fs.readFileSync(path.join(dir,'vendor/three.module.min.js')).toString('base64'));});
function setup(depth) {
  const scene=new THREE.Scene(),group=new THREE.Group(); scene.add(group);
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(2,40,30),new THREE.MeshPhysicalMaterial());
  mesh.userData.partId='skin';group.add(mesh);
  const part={id:'skin',name:'Skin',mesh,layer:0,cuttable:true,detachable:false};
  const camera=new THREE.PerspectiveCamera(45,1,.1,100);
  camera.position.set(0,12,.01);camera.lookAt(0,0,0);camera.updateMatrixWorld();scene.updateMatrixWorld(true);
  const samples=[],events=[];
  const api=create(THREE,{scene,group,camera,parts:[part],getCutDepth:()=>depth,
    onCutProgress:(p,points,d)=>samples.push(d),onEvent:e=>events.push(e)});
  const screen=z=>{const p=new THREE.Vector3(.2,Math.sqrt(4-.04-z*z),z).project(camera);return{x:(p.x+1)/2,y:(1-p.y)/2};};
  function cut(nextDepth) {
    api.setTool('scalpel');
    for(let i=0;i<=20;i++) {
      if(i===8&&nextDepth!==undefined)depth=nextDepth;
      api.update({...screen(-1.5+i*.15),gripping:true,grip:.7,span:0},16);
    }
    api.update({...screen(1.5),gripping:false,grip:0,span:0},16);
  }
  return{api,part,samples,events,cut};
}
test('a long shallow score records tissue injury without releasing a flap; undo removes the score',()=>{
  const s=setup(.18);s.cut();
  const inc=s.api.state.incisions.get('skin');assert.ok(inc.length>1.1);
  assert.equal(inc.depth,.18);assert.notEqual(s.part.mesh.userData.peelable,true);
  assert.ok(s.events.some(e=>e.kind==='incise'&&e.meta.superficial));
  assert.equal(s.api.undo(),true);assert.equal(s.api.state.incisions.size,0);s.api.dispose();
});
test('a controlled cut releases the layer and keeps its starting depth throughout the stroke',()=>{
  const s=setup(.55);s.cut(.9);
  assert.equal(s.api.state.incisions.get('skin').depth,.55);
  assert.equal(s.part.mesh.userData.peelable,true);
  assert.ok(s.samples.length>0&&s.samples.every(d=>d===.55));
  assert.equal(s.api.state.damage.length,0);s.api.dispose();
});
test('refused tissue contact never reports accepted cut progress',()=>{
  const s=setup(.9);s.part.cuttable=false;s.cut();
  assert.equal(s.samples.length,0);assert.equal(s.api.state.incisions.size,0);
  assert.ok(s.events.some(e=>e.meta.refused));s.api.dispose();
});
test('replacing a controlled incision with a shallow score clears stale flap access, and undo restores it',()=>{
  const s=setup(.55);s.cut(.18);
  assert.equal(s.part.mesh.userData.peelable,true);
  s.cut();assert.equal(s.api.state.incisions.get('skin').depth,.18);
  assert.equal(s.part.mesh.userData.peelable,false);
  assert.equal(s.api.undo(),true);assert.equal(s.part.mesh.userData.peelable,true);
  assert.equal(s.api.state.incisions.get('skin').depth,.55);s.api.dispose();
});
