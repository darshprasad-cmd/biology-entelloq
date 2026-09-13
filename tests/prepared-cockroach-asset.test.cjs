const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const ids = ['exoskeleton', 'pronotum', 'head', 'wing-left', 'wing-right'];
const dataURL = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
let THREE, loaded, install, build, createCutting, originalBitmap, originalSelf;
const bytes = fs.readFileSync(path.join(root, 'assets/specimens/cockroach.glb'));
const jsonLength = bytes.readUInt32LE(12), definition = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const imageHashes = definition.images.map(image => {
  const view = definition.bufferViews[image.bufferView], start = 28 + jsonLength + (view.byteOffset || 0);
  return crypto.createHash('sha256').update(bytes.subarray(start, start + view.byteLength)).digest('hex');
});
test.before(async () => {
  const read = name => fs.readFileSync(path.join(root, 'src/lab', name), 'utf8');
  const threeURL = dataURL(read('vendor/three.module.min.js')); THREE = await import(threeURL);
  const utilsURL = dataURL(read('vendor/utils/BufferGeometryUtils.js').replace("from 'three'", `from '${threeURL}'`));
  const vendor = await import(dataURL(read('vendor/loaders/GLTFLoader.js').replace("from 'three'", `from '${threeURL}'`).replace("from '../utils/BufferGeometryUtils.js'", `from '${utilsURL}'`)));
  const { createPreparedSpecimenLoader } = await import(dataURL(read('prepared-loader.js')));
  ({ installPreparedExterior: install } = await import(dataURL(read('specimen-assets.js'))));
  ({ createCutting } = await import(dataURL(read('cutting.js'))));
  build = new Function('THREE', ['anatomy', 'cockroach'].map(name => read(name + '.js')).join('\n').replace(/^export\s+/gm, '') + '\nreturn buildSpecimen;')(THREE);
  originalSelf = globalThis.self; originalBitmap = globalThis.createImageBitmap;
  globalThis.self = globalThis;
  // Real binary/material parsing and PNG dimensions; bitmap decoding alone is
  // stubbed. Browser QA must verify the rendered texture and interactions.
  globalThis.createImageBitmap = async blob => {
    const image = new DataView(await blob.arrayBuffer());
    assert.equal(image.getUint32(0), 0x89504e47);
    return { width: image.getUint32(16), height: image.getUint32(20), close() {} };
  };
  const load = createPreparedSpecimenLoader({ pageURL: () => 'https://biology.test/lab.html',
    fetchImpl: async () => new Response(bytes), importLoader: async () => vendor });
  loaded = await load(THREE, { specimenId: 'cockroach', url: './assets/specimens/cockroach.glb' });
});
test.after(() => { loaded?.dispose(); globalThis.self = originalSelf; globalThis.createImageBitmap = originalBitmap; });

test('actual cockroach preserves original licensed base-colour and normal image bytes with one shared PBR material', () => {
  assert.equal(definition.asset.extras.sourceSHA256, '027d5da04d25c77f7e4ef7fb38970f071934e8ce4dda5b44230134768631190a');
  assert.match(definition.asset.extras.license, /CC-BY-4.0/);
  assert.match(definition.asset.copyright, /CK \(xcellf\)/);
  assert.equal(definition.materials.length, 1); assert.equal(definition.images.length, 3); assert.equal(definition.textures.length, 3);
  assert.ok(imageHashes.includes('cd7740c6ab2c1625d707c0592953872925e8725b22d4385e9942fcd12168d39e'), 'original base-colour PNG bytes');
  assert.ok(imageHashes.includes('1e48f554e9f8f18c0cb887016f0bb07ac6a9faf913d3f63c0fa03f856297a05e'), 'original normal PNG bytes');
  assert.deepEqual(definition.materials[0].pbrMetallicRoughness.baseColorFactor, [.42, .52, .46, 1]);
  assert.equal(definition.materials[0].pbrMetallicRoughness.metallicFactor, 0);
  const materials = new Set(loaded.prepared.children.map(mesh => mesh.material)); assert.equal(materials.size, 1);
  const material = [...materials][0];
  assert.ok(material.isMeshStandardMaterial && material.map?.isTexture && material.normalMap?.isTexture && material.roughnessMap?.isTexture);
  // Pinned r160 flips the normal-map Y sign for derivative-tangent geometry.
  assert.ok(Math.abs(material.normalScale.x - .45) < 1e-6 && Math.abs(Math.abs(material.normalScale.y) - .45) < 1e-6);
});

test('actual cockroach satisfies five complete identity-transform part roots and unchanged static geometry budgets', () => {
  assert.deepEqual(loaded.prepared.userData, { schemaVersion: 1, specimenId: 'cockroach' });
  assert.deepEqual(loaded.prepared.children.map(mesh => mesh.name).sort(), [...ids].sort());
  for (const mesh of loaded.prepared.children) {
    assert.equal(mesh.type, 'Mesh'); assert.deepEqual(mesh.userData, {}); assert.equal(mesh.children.length, 0);
    assert.deepEqual(mesh.position.toArray(), [0, 0, 0]); assert.deepEqual(mesh.quaternion.toArray(), [0, 0, 0, 1]); assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]);
    assert.deepEqual(Object.keys(mesh.geometry.attributes).sort(), ['normal', 'position', 'uv']);
    assert.ok(mesh.geometry.attributes.position.count <= 9000 && mesh.geometry.index.count <= 54000);
    for (const attribute of Object.values(mesh.geometry.attributes)) {
      assert.ok(attribute.array instanceof Float32Array && !attribute.isInterleavedBufferAttribute);
      assert.ok(attribute.array.every(Number.isFinite));
    }
    for (const map of [mesh.material.map, mesh.material.normalMap, mesh.material.roughnessMap])
      assert.deepEqual([map.image.width, map.image.height], [2048, 2048]);
  }
});

test('actual cockroach adapter uses existing builder frames and preserves organs, descriptors and independent wing contacts', () => {
  const { parts, group } = build(THREE, 'cockroach');
  const originals = parts.map(part => ({ part, mesh: part.mesh, geometry: part.mesh.geometry, material: part.mesh.material,
    descriptor: { ...part }, matrix: part.mesh.matrix.clone(), position: part.mesh.position.toArray(), quaternion: part.mesh.quaternion.toArray(),
    scale: part.mesh.scale.toArray(), children: [...part.mesh.children] }));
  const handle = install(THREE, { specimenId: 'cockroach', parts, prepared: loaded.prepared });
  try {
    group.updateMatrixWorld(true);
    for (const old of originals) {
      assert.equal(old.part.mesh, old.mesh); assert.deepEqual(old.part, old.descriptor);
      assert.deepEqual(old.mesh.position.toArray(), old.position); assert.deepEqual(old.mesh.quaternion.toArray(), old.quaternion); assert.deepEqual(old.mesh.scale.toArray(), old.scale);
      if (!ids.includes(old.part.id)) {
        assert.equal(old.mesh.geometry, old.geometry); assert.equal(old.mesh.material, old.material); assert.deepEqual(old.mesh.children, old.children);
      } else {
        assert.equal(old.mesh.children.length, 0, 'no whole-shell decorative overlay');
        assert.equal(old.mesh.userData.preparedExterior.partId, old.part.id);
        const position = old.mesh.geometry.attributes.position, normal = old.mesh.geometry.attributes.normal;
        const p = new THREE.Vector3().fromBufferAttribute(position, 0).applyMatrix4(old.mesh.matrixWorld);
        const n = new THREE.Vector3().fromBufferAttribute(normal, 0).transformDirection(old.mesh.matrixWorld);
        const ray = new THREE.Raycaster(p.clone().addScaledVector(n, .2), n.clone().negate());
        assert.ok(ray.intersectObject(old.mesh, false).length > 0, old.part.id + ' remains a real root-level contact surface');
      }
    }
    for (const id of ['wing-left', 'wing-right']) {
      const wing = parts.find(part => part.id === id);
      assert.equal(wing.layer, 0); assert.equal(wing.detachable, true);
    }
  } finally { handle.restore(); }
  for (const old of originals) { assert.equal(old.mesh.geometry, old.geometry); assert.equal(old.mesh.material, old.material); assert.deepEqual(old.mesh.children, old.children); }
});

test('actual cockroach forceps window preserves all six walking-leg surfaces, neck and cerci while removing central dorsal terga', () => {
  const { parts, group } = build(THREE, 'cockroach');
  const handle = install(THREE, { specimenId: 'cockroach', parts, prepared: loaded.prepared });
  const scene = new THREE.Scene(); scene.add(group); scene.updateMatrixWorld(true);
  const part = parts.find(part => part.id === 'exoskeleton'), mesh = part.mesh;
  const geometry = mesh.geometry, rest = geometry.attributes.position.array.slice(), originalIndex = geometry.index;
  const pkey = index => Array.from(rest.subarray(index*3, index*3+3)).map(value => Math.round(value * 1e5)).join(',');
  const canonical = new Map(), parent = [], vertex = [];
  for (let i = 0; i < rest.length / 3; i++) {
    const key = pkey(i); if (!canonical.has(key)) { canonical.set(key, parent.length); parent.push(parent.length); }
    vertex.push(canonical.get(key));
  }
  const find = index => { while (parent[index] !== index) { parent[index] = parent[parent[index]]; index = parent[index]; } return index; };
  const indices = originalIndex.array;
  for (let i = 0; i < indices.length; i += 3) {
    const a = find(vertex[indices[i]]); parent[find(vertex[indices[i+1]])] = a; parent[find(vertex[indices[i+2]])] = a;
  }
  const components = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    const key = find(vertex[indices[i]]); if (!components.has(key)) components.set(key, []);
    components.get(key).push([indices[i], indices[i+1], indices[i+2]]);
  }
  const legs = [...components.values()].filter(triangles => {
    const vertices = triangles.flat();
    return Math.max(...vertices.map(i => Math.abs(rest[i*3]))) > 2
      && Math.max(...vertices.map(i => rest[i*3+1])) < .30;
  });
  assert.equal(legs.length, 6, 'six measured separate walking-leg components in the actual prepared mesh');
  const cuts = createCutting(THREE, scene), points = [];
  const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0).transformDirection(mesh.matrixWorld);
  for (let z = -2; z <= 2.5; z += .45) {
    ray.set(mesh.localToWorld(new THREE.Vector3(0, 2, z)), down);
    const hit = ray.intersectObject(mesh, false)[0]; if (hit) points.push(hit.point);
  }
  try {
    assert.ok(points.length >= 6); assert.ok(cuts.open({ partId: part.id, mesh, points, rest, system: part.system }));
    for (let i = 0; i < 12; i++) cuts.update(64);
    mesh.visible = false; assert.ok(cuts.releaseSurface(part.id)); assert.ok(cuts.remove(part.id));
    const residual = group.getObjectByName('uncut:exoskeleton'); assert.ok(residual);
    const window = residual.userData.accessWindow.abdomen; assert.ok(window, 'prepared roach must use bounded local abdominal access');
    const position = residual.geometry.attributes.position, index = residual.geometry.index.array;
    const key = i => [position.getX(i), position.getY(i), position.getZ(i)].map(value => Math.round(value * 1e5)).join(',');
    const retained = new Set();
    for (let i = 0; i < index.length; i += 3) {
      retained.add([key(index[i]), key(index[i+1]), key(index[i+2])].sort().join('|'));
      const x = (position.getX(index[i])+position.getX(index[i+1])+position.getX(index[i+2]))/3;
      const y = (position.getY(index[i])+position.getY(index[i+1])+position.getY(index[i+2]))/3;
      const z = (position.getZ(index[i])+position.getZ(index[i+1])+position.getZ(index[i+2]))/3;
      assert.ok(!(x > window.minX+1e-5 && x < window.maxX-1e-5 && z > window.minZ+1e-5 && z < window.maxZ-1e-5 && y > window.minY+1e-5), 'no opaque triangle spans the removed dorsal window');
    }
    for (const leg of legs) for (const triangle of leg)
      assert.ok(retained.has(triangle.map(pkey).sort().join('|')), 'every original leg triangle survives whole, not as chopped floating fragments');
    let preservedNeck = 0, preservedTail = 0, removedDorsal = 0;
    for (const triangles of components.values()) for (const triangle of triangles) {
      const retainedWhole = retained.has(triangle.map(pkey).sort().join('|'));
      if (triangle.every(i => rest[i*3+2] > window.maxZ+.05)) { assert.ok(retainedWhole); preservedNeck++; }
      if (triangle.every(i => rest[i*3+2] < window.minZ-.05)) { assert.ok(retainedWhole); preservedTail++; }
      if (triangle.every(i => Math.abs(rest[i*3]) < .9 && rest[i*3+2] > -2 && rest[i*3+2] < 2.5 && rest[i*3+1] > .31)) {
        assert.equal(retainedWhole, false); removedDorsal++;
      }
    }
    assert.ok(preservedNeck > 20 && preservedTail > 20 && removedDorsal > 20);
    // Inspect the geometry directly: residual.raycast is intentionally disabled
    // for tools, so use a temporary mesh solely to verify optical clearance.
    const optical = new THREE.Mesh(residual.geometry, residual.material);
    optical.matrixWorld.copy(mesh.matrixWorld);
    ray.set(mesh.localToWorld(new THREE.Vector3(0, 2, 0)), down);
    const through = ray.intersectObject(optical, false)[0];
    assert.ok(!through || mesh.worldToLocal(through.point.clone()).y <= window.minY+1e-5, 'central dorsal surface is actually absent, not merely unpickable');
    assert.equal(residual.material.map, mesh.material.map); assert.equal(residual.userData.noPick, true);
    for (const attr of Object.values(residual.geometry.attributes)) assert.ok(attr.array.every(Number.isFinite));
    const rim = residual.getObjectByName('access-rim'); assert.ok(rim && rim.geometry.attributes.position.count > 0);
    const rp = rim.geometry.attributes.position;
    for (let i = 0; i < rp.count; i += 6) for (const vertex of [i, i+1]) {
      const x = rp.getX(vertex), y = rp.getY(vertex), z = rp.getZ(vertex);
      assert.ok(x >= window.minX-1e-5 && x <= window.maxX+1e-5 && z >= window.minZ-1e-5 && z <= window.maxZ+1e-5 && y >= window.minY-1e-5);
      assert.ok(Math.min(Math.abs(x-window.minX), Math.abs(x-window.maxX), Math.abs(z-window.minZ), Math.abs(z-window.maxZ), Math.abs(y-window.minY)) < 1e-5, 'rim lies on the actual bounded cut');
    }
    cuts.clear(); assert.equal(group.getObjectByName('uncut:exoskeleton'), undefined);
    assert.equal(mesh.geometry.index, originalIndex);
    assert.ok(rest.every((value, i) => Math.abs(value - mesh.geometry.attributes.position.array[i]) < 2e-6), 'cut reset restores the source within Float32 write precision');
  } finally { cuts.dispose(); handle.restore(); }
});
