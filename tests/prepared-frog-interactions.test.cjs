// CPU contract checks with procedural textured proxies, NOT acceptance of a
// downloaded frog, its seam quality, camera hardware or rendered appearance.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let THREE, buildFrog, installPreparedExterior, createSurfaceDetail, createSoftBody, createCutting, createDissection;
const exteriorIds = ['skin', 'forelimb-left', 'forelimb-right', 'hindlimb-left', 'hindlimb-right'];
test.before(async () => {
  const load = name => import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab', name + '.js')).toString('base64'));
  THREE = await load('vendor/three.module.min');
  ({ installPreparedExterior } = await load('specimen-assets'));
  ({ createSoftBody } = await load('softbody'));
  ({ createCutting } = await load('cutting'));
  ({ createDissection } = await load('dissect'));
  const source = ['anatomy', 'frog', 'surface'].map(n => fs.readFileSync(path.join(root, 'src/lab', n + '.js'), 'utf8')).join('\n');
  ({ buildFrog, createSurfaceDetail } = new Function('THREE', source.replace(/^export\s+/gm, '') + '\nreturn {buildFrog, createSurfaceDetail};')(THREE));
});
function fixture() {
  const built = buildFrog(THREE), prepared = new THREE.Group();
  prepared.userData = { schemaVersion: 1, specimenId: 'frog' };
  const texture = new THREE.DataTexture(new Uint8Array([117, 128, 77, 255]), 1, 1);
  const originals = built.parts.map(p => ({ part: p, geometry: p.mesh.geometry, material: p.mesh.material,
    position: p.mesh.position.clone(), quaternion: p.mesh.quaternion.clone(), scale: p.mesh.scale.clone() }));
  for (const id of exteriorIds) {
    const original = built.parts.find(p => p.id === id).mesh.geometry;
    original.computeBoundingBox();
    const size = original.boundingBox.getSize(new THREE.Vector3()), center = original.boundingBox.getCenter(new THREE.Vector3());
    const proxy = new THREE.SphereGeometry(1, 32, 24);
    proxy.scale(size.x / 2, size.y / 2, size.z / 2); proxy.translate(...center.toArray());
    const geometry = new THREE.BufferGeometry().copy(proxy); geometry.clearGroups(); proxy.dispose();
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: texture, roughness: .46 }));
    mesh.name = id; prepared.add(mesh);
  }
  const handle = installPreparedExterior(THREE, { specimenId: 'frog', parts: built.parts, prepared });
  const scene = new THREE.Scene(); scene.add(built.group); scene.updateMatrixWorld(true);
  return { ...built, scene, prepared, texture, originals, handle };
}
function finiteGeometry(mesh) {
  for (const [name, attribute] of Object.entries(mesh.geometry.attributes))
    assert.ok(attribute.array.every(Number.isFinite), `${mesh.name || mesh.userData.partId}: finite ${name}`);
  assert.ok(mesh.geometry.index.array.every(i => i < mesh.geometry.attributes.position.count));
}
test('prepared frog surface pass preserves borrowed PBR and fitted geometry; teardown restores original roots', () => {
  const f = fixture(), snapshots = f.parts.filter(p => exteriorIds.includes(p.id)).map(p => ({ mesh: p.mesh,
    positions: p.mesh.geometry.attributes.position.array.slice(), material: p.mesh.material, map: p.mesh.material.map }));
  let textureDisposals = 0; f.texture.addEventListener('dispose', () => textureDisposals++);
  const surface = createSurfaceDetail(THREE, f.parts, 'frog', f.group);
  try {
    surface.apply();
    for (const s of snapshots) {
      assert.deepEqual(s.mesh.geometry.attributes.position.array, s.positions, 'authored exterior vertices must not be displaced');
      assert.equal(s.mesh.material, s.material, 'prepared PBR material must not be procedurally replaced');
      assert.equal(s.mesh.material.map, s.map);
      assert.equal(s.mesh.children.length, 0, 'procedural exterior decoration must not cover the prepared mesh');
    }
  } finally { surface.dispose(); f.handle.restore(); }
  for (const old of f.originals) {
    assert.equal(old.part.mesh.geometry, old.geometry);
    assert.equal(old.part.mesh.material, old.material);
    assert.ok(old.part.mesh.position.equals(old.position));
    assert.ok(old.part.mesh.quaternion.equals(old.quaternion));
    assert.ok(old.part.mesh.scale.equals(old.scale));
  }
  assert.equal(textureDisposals, 0, 'borrowed textures survive surface/adapter teardown');
});
test('prepared frog pins, neutral input handoff, soft-body cut, access removal and reset use the actual engines', () => {
  const f = fixture(), skin = f.parts.find(p => p.id === 'skin'), mesh = skin.mesh;
  const geometry = mesh.geometry, positions = geometry.attributes.position, rest = positions.array.slice();
  const originalIndices = geometry.index.array.slice(), originalDraw = { ...geometry.drawRange };
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  camera.position.set(0, 26, .01); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const soft = createSoftBody(THREE, f.parts), cutting = createCutting(THREE, f.scene), events = [];
  const screen = point => { const p = point.clone().project(camera); return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 }; };
  const api = createDissection(THREE, { ...f, camera, requiresPinning: true,
    onEvent: e => { events.push(e); if (e.kind === 'peel') cutting.releaseSurface(e.partId); },
    onCutProgress: (part, points) => cutting.has(part.id) ? cutting.grow(part.id, points)
      : cutting.open({ partId: part.id, mesh: part.mesh, points, system: part.system, rest, amount: .62, depth: .55 }) });
  const act = (p, gripping, dt = 16) => { f.scene.updateMatrixWorld(true); api.update({ ...p, gripping, grip: gripping ? .5 : 0, span: 0 }, dt); };
  const at = (x, z) => screen(mesh.localToWorld(new THREE.Vector3(x, 2, z)));
  try {
    api.setTool('scalpel'); act(at(0, -1), true); act(at(0, -1), false);
    assert.ok(events.some(e => e.meta.refused)); assert.equal(api.state.incisions.size, 0);
    api.setTool('pins');
    for (const id of exteriorIds.slice(1)) {
      const limb = f.parts.find(p => p.id === id).mesh, pa = limb.geometry.attributes.position;
      let target;
      for (let i = 0; i < pa.count; i += Math.max(1, Math.floor(pa.count / 120))) {
        const p = screen(limb.localToWorld(new THREE.Vector3().fromBufferAttribute(pa, i)));
        if (api.pick(p.x, p.y)?.object === limb) { target = p; break; }
      }
      assert.ok(target, `${id} must be independently pickable`);
      act(target, true); act(target, false);
    }
    assert.deepEqual([...api.state.pinned].sort(), exteriorIds.slice(1).sort());
    api.setTool('scalpel');
    for (const z of [-1.5, -1, -.5, 0, .5, 1, 1.5]) act(at(0, z), true);
    // Same neutral packet used when an input owner releases: preserve attempt.
    act(at(0, 1.5), false);
    assert.ok(api.state.incisions.get('skin')?.length > 1.1);
    assert.equal(cutting.count, 1); assert.ok(mesh.userData.peelable);
    assert.ok(geometry.drawRange.count < originalIndices.length, 'real incision removes intersecting faces');
    soft.setLife(true);
    for (let frame = 0; frame < 8; frame++) { soft.update(16); cutting.update(16); }
    assert.equal(geometry.attributes.position, positions, 'shared soft-body attribute stays stable');
    assert.notDeepEqual(positions.array, rest); finiteGeometry(mesh);
    soft.setLife(false); soft.update(16); cutting.update(16);
    api.setTool('forceps');
    const grab = at(.7, 0); assert.equal(api.pick(grab.x, grab.y)?.object, mesh);
    act(grab, true); assert.equal(api.grabbed, 'skin');
    const destination = { x: grab.x + .2, y: grab.y };
    for (let i = 0; i < 6; i++) act(destination, true, 160);
    act(destination, false);
    assert.ok(api.state.removed.has('skin')); assert.equal(mesh.visible, false);
    const residual = f.group.getObjectByName('uncut:skin');
    assert.ok(residual, 'forceps event hands the real cut engine its residual shell');
    assert.equal(residual.material.map, f.texture); assert.equal(residual.userData.noPick, true);
    finiteGeometry(residual);
    assert.notEqual(api.pick(grab.x, grab.y)?.object, mesh, 'removed skin no longer intercepts tools');
    cutting.clear(); soft.dispose();
    assert.equal(f.group.getObjectByName('uncut:skin'), undefined);
    assert.deepEqual(geometry.index.array, originalIndices); assert.deepEqual(geometry.drawRange, originalDraw);
    assert.deepEqual(positions.array, rest, 'reset has no accumulated cut/breath displacement');
  } finally { api.dispose(); cutting.dispose(); soft.dispose(); f.handle.restore(); }
});
