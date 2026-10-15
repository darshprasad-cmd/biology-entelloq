const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, 'src/lab', file), 'utf8');
const api = new Function(read('blood.js').replace(/^export\s+/gm, '') + '\nreturn {createBlood, BLD_REGISTER};')();
let THREE;
test.before(async () => {
  THREE = await import('data:text/javascript;base64,' + Buffer.from(read('vendor/three.module.min.js')).toString('base64'));
});
function fixture() {
  const scene = new THREE.Scene();
  const a = new THREE.Mesh(new THREE.BoxGeometry(3, .5, 3), new THREE.MeshPhysicalMaterial());
  const b = a.clone(); b.material = a.material.clone();
  scene.add(a, b); scene.updateMatrixWorld(true);
  const blood = api.createBlood(THREE, scene);
  blood.setSpecimen([{id:'skin',mesh:a},{id:'flap',mesh:b}]);
  const injury = {partId:'skin', point:new THREE.Vector3(0,.25,0), normal:new THREE.Vector3(0,1,0), severity:1, kind:'arterial'};
  const advance = seconds => { for (let i=0;i<seconds*60;i++) blood.update(1000/60); };
  return {blood, injury, advance};
}
test('preserved incisions leave host-bound residue without replenishing flow or volume loss', () => {
  const f=fixture();
  const mark=f.blood.bleed(f.injury);
  assert.equal(mark.kind,'residue');
  assert.equal(mark.partId,'skin');
  f.advance(8);
  assert.equal(f.blood.stats.sources,0);
  assert.equal(f.blood.stats.droplets,0);
  assert.ok(f.blood.stats.stains>0);
  assert.equal(f.blood.bloodLostML,0);
  assert.ok(f.blood.swab(f.injury.point,1)>0);
  f.advance(1);
  assert.equal(f.blood.stats.stains,0);
  f.blood.dispose();
});
test('fresh excised tissue seeps briefly; arterial input cannot create a pressurized jet', () => {
  const f=fixture(); f.blood.setContext('frog','fresh');
  const source=f.blood.bleed(f.injury);
  assert.equal(source.kind,'seep');
  assert.equal(api.BLD_REGISTER[source.kind].jet,0);
  assert.equal(api.BLD_REGISTER[source.kind].pulse,false);
  f.advance(2); assert.ok(f.blood.stats.droplets>0);
  f.advance(6); assert.equal(f.blood.stats.sources,0);
  assert.equal(f.blood.bloodLostML,0);
  f.blood.dispose();
});
test('cockroach stays pale and non-pulsatile in every condition; unsupported species cannot run circulation', () => {
  const f=fixture();
  for (const mode of ['preserved','fresh','circulation']) {
    f.blood.setContext('cockroach',mode);
    const cut=f.blood.bleed(f.injury);
    assert.equal(cut.kind,'hemolymph');
    assert.equal(api.BLD_REGISTER[cut.kind].jet,0);
    assert.equal(api.BLD_REGISTER[cut.kind].pulse,false);
    assert.notEqual(f.blood.context.preparation,'circulation');
  }
  for (const id of ['fish','earthworm']) {
    f.blood.setContext(id,'circulation');
    assert.equal(f.blood.context.preparation,'fresh');
    assert.equal(f.blood.bleed(f.injury).kind,'seep');
  }
  f.blood.dispose();
});
test('condition changes clear stale fluid, preserve amount, and only explicit circulation can pulse', () => {
  const f=fixture(); f.blood.setIntensity(.3); f.blood.bleed(f.injury);
  f.blood.setContext('frog','circulation');
  assert.equal(f.blood.stats.stains,0);
  assert.equal(f.blood.intensity,.3);
  assert.equal(f.blood.bleed(f.injury).kind,'arterial');
  f.advance(1); assert.ok(f.blood.stats.sources>0);
  f.blood.setContext('heart','preserved');
  assert.equal(f.blood.stats.sources,0);
  assert.equal(f.blood.stats.droplets,0);
  f.blood.setEnabled(false); assert.equal(f.blood.bleed(f.injury),null);
  f.blood.setEnabled(true); f.blood.setIntensity(0);
  assert.equal(f.blood.bleed(f.injury),null);
  f.blood.dispose();
});
test('adjacent marks on separate tissue flaps never merge across hosts', () => {
  const f=fixture();
  const a=f.blood.bleed(f.injury);
  const b=f.blood.bleed({...f.injury,partId:'flap'});
  assert.notEqual(a,b);
  assert.equal(a.partId,'skin'); assert.equal(b.partId,'flap');
  assert.equal(f.blood.stats.stains,2);
  f.blood.clearPart('skin');
  assert.equal(f.blood.stats.stains,1);
  assert.equal(b.alive,true);
  f.blood.dispose();
});
