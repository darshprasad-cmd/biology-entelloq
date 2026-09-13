const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const expected = {
  frog: ['skin', 'forelimb-left', 'forelimb-right', 'hindlimb-left', 'hindlimb-right'],
  cockroach: ['exoskeleton', 'pronotum', 'head', 'wing-left', 'wing-right'],
};
let THREE, installPreparedExterior, PREPARED_EXTERIOR_PART_IDS, build;
test.before(async () => {
  const moduleAt = name => import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab', name)).toString('base64'));
  THREE = await moduleAt('vendor/three.module.min.js');
  ({ installPreparedExterior, PREPARED_EXTERIOR_PART_IDS } = await moduleAt('specimen-assets.js'));
  const source = ['anatomy', 'frog', 'cockroach'].map(name => fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8')).join('\n');
  build = new Function('THREE', source.replace(/^export\s+/gm, '') + '\nreturn buildSpecimen;')(THREE);
});

function geometry(size = 2) {
  const box = new THREE.BoxGeometry(size, size, size);
  const result = new THREE.BufferGeometry().copy(box);
  result.clearGroups(); box.dispose(); return result;
}
function fixture(specimenId = 'frog', real = false) {
  const texture = new THREE.DataTexture(new Uint8Array([130, 110, 65, 255]), 1, 1);
  const prepared = new THREE.Group();
  prepared.userData = { schemaVersion: 1, specimenId };
  const parts = real ? build(THREE, specimenId).parts : expected[specimenId].concat('untouched-organ').map((id, i) => {
    const mesh = new THREE.Mesh(geometry(), new THREE.MeshStandardMaterial());
    mesh.userData.partId = id; mesh.position.set(i / 10, i / 20, -i / 10);
    mesh.scale.set(1, 1.1, 0.9); mesh.rotation.x = i / 100;
    mesh.add(new THREE.Mesh(geometry(0.1), new THREE.MeshStandardMaterial()));
    return { id, mesh, layer: i === expected[specimenId].length ? 2 : 0, cuttable: i === 0,
      detachable: i > 0, name: id, anchors: [[i, 0, 0]], pin: i > 0 ? i : undefined };
  });
  for (const id of expected[specimenId]) {
    const mesh = new THREE.Mesh(geometry(), new THREE.MeshStandardMaterial({ map: texture }));
    mesh.name = id; prepared.add(mesh);
  }
  return { specimenId, parts, prepared, texture };
}
function snapshot(parts) {
  return parts.map(part => ({ part, descriptor: { ...part }, mesh: part.mesh, geometry: part.mesh.geometry,
    material: part.mesh.material, childrenArray: part.mesh.children, children: [...part.mesh.children],
    userData: part.mesh.userData, userDataCopy: { ...part.mesh.userData }, parent: part.mesh.parent,
    position: part.mesh.position.toArray(), quaternion: part.mesh.quaternion.toArray(), scale: part.mesh.scale.toArray(),
    visible: part.mesh.visible, renderOrder: part.mesh.renderOrder }));
}
function unchanged(state) {
  for (const old of state) {
    assert.deepEqual(old.part, old.descriptor);
    assert.equal(old.part.mesh, old.mesh);
    assert.equal(old.mesh.geometry, old.geometry); assert.equal(old.mesh.material, old.material);
    assert.equal(old.mesh.children, old.childrenArray); assert.deepEqual(old.mesh.children, old.children);
    assert.equal(old.mesh.userData, old.userData); assert.deepEqual(old.mesh.userData, old.userDataCopy);
    assert.equal(old.mesh.parent, old.parent);
    assert.deepEqual(old.mesh.position.toArray(), old.position);
    assert.deepEqual(old.mesh.quaternion.toArray(), old.quaternion);
    assert.deepEqual(old.mesh.scale.toArray(), old.scale);
    assert.equal(old.mesh.visible, old.visible); assert.equal(old.mesh.renderOrder, old.renderOrder);
    old.children.forEach(child => assert.equal(child.parent, old.mesh));
  }
}

test('only prepared frog and cockroach formats are accepted and their root lists are immutable', () => {
  assert.deepEqual(PREPARED_EXTERIOR_PART_IDS, expected);
  assert.ok(Object.isFrozen(PREPARED_EXTERIOR_PART_IDS));
  for (const ids of Object.values(PREPARED_EXTERIOR_PART_IDS)) assert.ok(Object.isFrozen(ids));
  for (const specimenId of ['fish', 'earthworm', 'heart', 'toString', '', undefined])
    assert.throws(() => installPreparedExterior(THREE, { ...fixture(), specimenId }), /unknown specimen/);
});

for (const specimenId of Object.keys(expected)) for (const real of [false, true]) {
  test(`${specimenId}: ${real ? 'actual builder' : 'synthetic'} transaction preserves part identity, transforms, contracts and every organ`, () => {
    const f = fixture(specimenId, real), state = snapshot(f.parts);
    if (real) assert.deepEqual(f.parts.filter(p => p.layer === 0).map(p => p.id).sort(), [...expected[specimenId]].sort());
    const handle = installPreparedExterior(THREE, f);
    assert.equal(handle.specimenId, specimenId); assert.deepEqual(handle.partIds, expected[specimenId]);
    for (const old of state) {
      if (!expected[specimenId].includes(old.part.id)) { unchanged([old]); continue; }
      assert.deepEqual(old.part, old.descriptor, 'descriptor and interaction metadata unchanged');
      assert.equal(old.mesh.userData, old.userData); assert.equal(old.mesh.children, old.childrenArray);
      assert.equal(old.mesh.parent, old.parent); assert.equal(old.mesh.visible, old.visible);
      assert.deepEqual(old.mesh.position.toArray(), old.position);
      assert.deepEqual(old.mesh.quaternion.toArray(), old.quaternion);
      assert.deepEqual(old.mesh.scale.toArray(), old.scale);
      const source = f.prepared.getObjectByName(old.part.id);
      assert.notEqual(old.mesh.geometry, old.geometry); assert.notEqual(old.mesh.geometry, source.geometry);
      assert.notEqual(old.mesh.material, old.material); assert.notEqual(old.mesh.material, source.material);
      assert.equal(old.mesh.material.map, f.texture, 'decoded texture intentionally borrowed');
      assert.equal(old.mesh.geometry.type, 'BufferGeometry', 'no fake procedural geometry type');
      assert.ok(old.mesh.geometry.boundingSphere.radius > 0);
      assert.deepEqual(old.mesh.userData.preparedExterior, { schemaVersion: 1, specimenId, partId: old.part.id, role: 'part' });
      assert.equal(old.mesh.children.length, 0, 'procedural decorations cannot cover the new model');
      old.children.forEach(child => assert.equal(child.parent, null));
      assert.equal(source.parent, f.prepared); assert.deepEqual(source.userData, {});
    }
    handle.restore(); unchanged(state); handle.restore(); unchanged(state);
  });
}

const invalid = {
  'missing complete root set': f => f.prepared.remove(f.prepared.children.at(-1)),
  'unknown extra mesh': f => f.prepared.add(new THREE.Mesh(geometry(), new THREE.MeshStandardMaterial())),
  'duplicate root': f => { f.prepared.children[1].name = f.prepared.children[0].name; },
  'wrong schema': f => { f.prepared.userData.schemaVersion = 2; },
  'wrong species': f => { f.prepared.userData.specimenId = 'cockroach'; },
  'unsupported root metadata': f => { f.prepared.userData.overlay = true; },
  'unbaked transform': f => { f.prepared.children[0].position.x = 1; },
  'unbaked matrix': f => { f.prepared.children[0].matrix.elements[12] = 1; },
  'hidden root': f => { f.prepared.children[0].visible = false; },
  'animation': f => { f.prepared.children.at(-1).animations.push(new THREE.AnimationClip('move', 1, [])); },
  'light in root slot': f => { const old = f.prepared.children[0], light = new THREE.PointLight(); light.name = old.name; f.prepared.remove(old); f.prepared.add(light); },
  'bone in root slot': f => { const old = f.prepared.children[0], bone = new THREE.Bone(); bone.name = old.name; f.prepared.remove(old); f.prepared.add(bone); },
  'nested overlay': f => f.prepared.children[0].add(new THREE.Mesh(geometry(), new THREE.MeshStandardMaterial())),
  'missing UV': f => f.prepared.children[0].geometry.deleteAttribute('uv'),
  'extra skin weights': f => f.prepared.children[0].geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(new Float32Array(96), 4)),
  'morph': f => { const g = f.prepared.children[0].geometry; g.morphAttributes.position = [g.attributes.position.clone()]; },
  'nonfinite position': f => { f.prepared.children.at(-1).geometry.attributes.position.array[0] = NaN; },
  'nonfinite normal': f => { f.prepared.children[0].geometry.attributes.normal.array[0] = Infinity; },
  'nonunit normals': f => f.prepared.children[0].geometry.attributes.normal.array.fill(0),
  'coordinate outside local budget': f => { f.prepared.children[0].geometry.attributes.position.array[0] = 100; },
  'partial draw': f => f.prepared.children[0].geometry.setDrawRange(0, 3),
  'multiple material groups': f => { const g = f.prepared.children[0].geometry; g.addGroup(0, 3, 0); g.addGroup(3, 3, 0); },
  'index out of bounds': f => { f.prepared.children[0].geometry.index.array[0] = 100; },
  'unindexed mesh': f => f.prepared.children[0].geometry.setIndex(null),
  'material array': f => { const m = f.prepared.children[0]; m.material = [m.material]; },
  'non-PBR material': f => { f.prepared.children[0].material = new THREE.MeshBasicMaterial({ map: f.texture }); },
  'untextured root': f => { f.prepared.children.at(-1).material.map = null; },
  'undecoded texture': f => { f.texture.image = {}; },
  'oversized texture': f => { f.texture.image = { width: 8192, height: 8192 }; },
  'nonfinite material': f => { f.prepared.children[0].material.roughness = NaN; },
  'invisible material': f => { f.prepared.children[0].material.opacity = 0; },
  'occupied emissive feedback': f => f.prepared.children[0].material.emissive.set(0xff0000),
  'displacement changes contacts': f => { f.prepared.children[0].material.displacementMap = f.texture; },
  'unsupported UV channel': f => { f.texture.channel = 1; },
  'nonfinite texture transform': f => { f.texture.offset.x = Infinity; },
  'missing functional part': f => f.parts.shift(),
  'duplicate functional descriptor': f => f.parts.push(f.parts[0]),
  'mismatched target ID': f => { f.parts[0].mesh.userData.partId = 'other'; },
  'active cutting target': f => { f.parts[0].mesh.userData.peelable = true; },
  'nested functional organ': f => f.parts[0].mesh.add(f.parts.at(-1).mesh),
  'immutable target': f => Object.freeze(f.parts[0].mesh.userData),
};
for (const [name, mutate] of Object.entries(invalid)) test(`rejects ${name} before any functional mutation`, () => {
  const f = fixture(); mutate(f); const state = snapshot(f.parts);
  assert.throws(() => installPreparedExterior(THREE, f), /Prepared exterior:/);
  unchanged(state);
});

test('rejects Scene, skinned, instanced, interleaved and over-budget geometry', () => {
  const mutations = [
    f => { const scene = new THREE.Scene(); scene.userData = f.prepared.userData; f.prepared = scene; },
    f => { const mesh = new THREE.SkinnedMesh(geometry(), f.prepared.children[0].material); mesh.name = 'skin'; f.prepared.remove(f.prepared.children[0]); f.prepared.add(mesh); },
    f => { const mesh = new THREE.InstancedMesh(geometry(), f.prepared.children[0].material, 1); mesh.name = 'skin'; f.prepared.remove(f.prepared.children[0]); f.prepared.add(mesh); },
    f => { const g = f.prepared.children[0].geometry; g.setAttribute('position', new THREE.InterleavedBufferAttribute(new THREE.InterleavedBuffer(g.attributes.position.array, 3), 3, 0)); },
    f => { const g = f.prepared.children[0].geometry; g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9001 * 3), 3)); },
    f => f.prepared.children[0].geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(54003), 1)),
  ];
  for (const mutate of mutations) { const f = fixture(); mutate(f); const state = snapshot(f.parts); assert.throws(() => installPreparedExterior(THREE, f), /Prepared exterior:/); unchanged(state); }
});

function addEye(f, { owner = 'skin', size = 0.15, z = 0.8 } = {}) {
  const eye = new THREE.Mesh(geometry(size).translate(0.5, 0, z), new THREE.MeshPhysicalMaterial({ map: f.texture }));
  eye.name = 'eye-left'; eye.userData = { preparedExterior: { role: 'detail', kind: 'eye', ownerPartId: owner } };
  f.prepared.getObjectByName(owner).add(eye); return eye;
}
test('only bounded named eyes survive as non-pickable owned details, with no tool part IDs or ghost-overlays', () => {
  for (const specimenId of ['frog', 'cockroach']) {
    const f = fixture(specimenId), owner = specimenId === 'frog' ? 'skin' : 'head';
    const source = addEye(f, { owner }), state = snapshot(f.parts);
    const handle = installPreparedExterior(THREE, f), mesh = f.parts.find(p => p.id === owner).mesh;
    const eye = mesh.children[0]; assert.notEqual(eye, source); assert.equal(eye.parent, mesh);
    assert.equal(source.parent, f.prepared.getObjectByName(owner));
    assert.equal(eye.userData.partId, undefined); assert.equal(eye.userData.noPick, undefined);
    assert.equal(eye.userData.exteriorDetail, 'eye'); assert.equal(eye.userData.exteriorTissue, undefined);
    assert.equal(eye.userData.preparedExterior.partId, owner);
    const hits = []; eye.raycast(new THREE.Raycaster(), hits); assert.deepEqual(hits, []);
    mesh.visible = false; const visible = []; mesh.traverseVisible(node => visible.push(node)); assert.deepEqual(visible, []);
    mesh.visible = state.find(s => s.part.id === owner).visible;
    handle.restore(); unchanged(state);
  }
});
test('eye metadata cannot disguise an oversized cover, body-centre detail, extra pickable appendage, or wrong owner', () => {
  const mutations = [
    f => addEye(f, { size: 1.8 }), f => addEye(f, { z: 0 }),
    f => { addEye(f).userData.preparedExterior.ownerPartId = 'forelimb-left'; },
    f => { addEye(f).name = 'body-cover'; },
    f => { addEye(f).userData.partId = 'skin'; },
    f => addEye(f, { owner: 'forelimb-left' }),
  ];
  for (const mutate of mutations) { const f = fixture(); mutate(f); const state = snapshot(f.parts); assert.throws(() => installPreparedExterior(THREE, f), /Prepared exterior:/); unchanged(state); }
});

test('clone failure releases prior allocations without changing any live or prepared resource', () => {
  const f = fixture(), state = snapshot(f.parts), made = [], disposed = [];
  for (const mesh of f.prepared.children) {
    for (const resource of [mesh.geometry, mesh.material]) {
      const clone = resource.clone.bind(resource);
      resource.clone = () => { const copy = clone(); made.push(copy); copy.addEventListener('dispose', () => disposed.push(copy)); return copy; };
    }
  }
  f.prepared.children.at(-1).material.clone = () => { throw new Error('allocation failed'); };
  assert.throws(() => installPreparedExterior(THREE, f), /allocation failed/);
  unchanged(state); assert.ok(made.length > 1); assert.deepEqual(new Set(disposed), new Set(made));
});
test('commit failure rolls back all changed roots and existing children', () => {
  const f = fixture(), last = f.parts[4].mesh;
  // Simulate a host veto at the last tag assignment after normal validation.
  last.userData = new Proxy(last.userData, { set(target, key, value) { if (key === 'preparedExterior') throw new Error('host veto'); target[key] = value; return true; } });
  const state = snapshot(f.parts);
  assert.throws(() => installPreparedExterior(THREE, f), /host veto/); unchanged(state);
});
test('restore disposes only owned clones once; original geometry/material and borrowed texture stay alive', () => {
  const f = fixture(), state = snapshot(f.parts), disposed = [];
  const originals = [...f.parts.flatMap(p => [p.mesh.geometry, p.mesh.material]),
    ...f.prepared.children.flatMap(m => [m.geometry, m.material]), f.texture];
  originals.forEach(resource => resource.addEventListener('dispose', () => disposed.push(resource)));
  const handle = installPreparedExterior(THREE, f), owned = f.parts.filter(p => expected.frog.includes(p.id)).flatMap(p => [p.mesh.geometry, p.mesh.material]);
  owned.forEach(resource => resource.addEventListener('dispose', () => disposed.push(resource)));
  assert.throws(() => installPreparedExterior(THREE, f), /untouched functional root/);
  handle.restore(); handle.restore(); unchanged(state);
  assert.equal(disposed.length, owned.length); assert.deepEqual(new Set(disposed), new Set(owned));
  const again = installPreparedExterior(THREE, f); again.restore(); unchanged(state);
});
