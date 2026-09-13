const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const ids = ['skin', 'forelimb-left', 'forelimb-right', 'hindlimb-left', 'hindlimb-right'];
let THREE, install, loaded, build, createSoftBody, originalBitmap, originalSelf;
const dataURL = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
const positionKey = (p, i) => [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]].map(v => Math.round(v * 1e5)).join(',');
function topology(mesh) {
  const p = mesh.geometry.attributes.position.array, index = mesh.geometry.index.array;
  const vertexKeys = Array.from({ length: p.length / 3 }, (_, i) => positionKey(p, i));
  const keys = new Map(), parents = [], canonical = vertexKeys.map(key => {
    if (!keys.has(key)) { keys.set(key, parents.length); parents.push(parents.length); }
    return keys.get(key);
  });
  const find = value => { while (parents[value] !== value) { parents[value] = parents[parents[value]]; value = parents[value]; } return value; };
  const edges = new Map();
  for (let i = 0; i < index.length; i += 3) {
    const triangle = [index[i], index[i + 1], index[i + 2]], a = find(canonical[triangle[0]]);
    parents[find(canonical[triangle[1]])] = a; parents[find(canonical[triangle[2]])] = a;
    for (let edge = 0; edge < 3; edge++) {
      const key = [vertexKeys[triangle[edge]], vertexKeys[triangle[(edge + 1) % 3]]].sort().join('|');
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  const components = new Map();
  for (let i = 0; i < index.length; i += 3) { const id = find(canonical[index[i]]); components.set(id, (components.get(id) || 0) + 1); }
  return { components: [...components.values()].sort((a, b) => b - a),
    boundary: new Set([...edges].filter(([, count]) => count === 1).map(([key]) => key)), positions: new Set(vertexKeys) };
}
function geometryDigest(mesh) {
  const hash = crypto.createHash('sha256');
  mesh.traverse(node => {
    hash.update(JSON.stringify([node.position.toArray(), node.quaternion.toArray(), node.scale.toArray()]));
    if (node.geometry) for (const attr of [...Object.values(node.geometry.attributes), node.geometry.index].filter(Boolean))
      hash.update(Buffer.from(attr.array.buffer, attr.array.byteOffset, attr.array.byteLength));
  });
  return hash.digest('hex');
}
test.before(async () => {
  const read = name => fs.readFileSync(path.join(root, 'src/lab', name), 'utf8');
  const threeURL = dataURL(read('vendor/three.module.min.js')); THREE = await import(threeURL);
  const utilsURL = dataURL(read('vendor/utils/BufferGeometryUtils.js').replace("from 'three'", `from '${threeURL}'`));
  const vendor = await import(dataURL(read('vendor/loaders/GLTFLoader.js').replace("from 'three'", `from '${threeURL}'`).replace("from '../utils/BufferGeometryUtils.js'", `from '${utilsURL}'`)));
  const { createPreparedSpecimenLoader } = await import(dataURL(read('prepared-loader.js')));
  ({ installPreparedExterior: install } = await import(dataURL(read('specimen-assets.js'))));
  ({ createSoftBody } = await import(dataURL(read('softbody.js'))));
  build = new Function('THREE', ['anatomy', 'frog'].map(name => read(name + '.js')).join('\n').replace(/^export\s+/gm, '') + '\nreturn buildSpecimen;')(THREE);
  originalSelf = globalThis.self; originalBitmap = globalThis.createImageBitmap;
  globalThis.self = globalThis;
  // Real binary/material parsing; only browser bitmap decode is replaced. Header
  // dimensions remain real and the production loader enforces image budgets.
  globalThis.createImageBitmap = async blob => {
    const bytes = new DataView(await blob.arrayBuffer()); let width, height;
    if (bytes.getUint32(0) === 0x89504e47) { width = bytes.getUint32(16); height = bytes.getUint32(20); }
    else for (let offset = 2; offset + 9 < bytes.byteLength;) {
      const marker = bytes.getUint8(offset + 1); if (marker === 0xff) { offset++; continue; }
      if ([0xc0, 0xc1, 0xc2].includes(marker)) { height = bytes.getUint16(offset + 5); width = bytes.getUint16(offset + 7); break; }
      offset += 2 + bytes.getUint16(offset + 2);
    }
    assert.ok(width && height, 'test decoder stub needs recognized image dimensions'); return { width, height, close() {} };
  };
  const bytes = fs.readFileSync(path.join(root, 'assets/specimens/frog.glb'));
  const load = createPreparedSpecimenLoader({ pageURL: () => 'https://biology.test/lab.html',
    fetchImpl: async () => new Response(bytes), importLoader: async () => vendor });
  loaded = await load(THREE, { specimenId: 'frog', url: './assets/specimens/frog.glb' });
});
test.after(() => { loaded?.dispose(); globalThis.self = originalSelf; globalThis.createImageBitmap = originalBitmap; });

test('actual prepared frog has all five independent static roots and bounded finite textured materials', () => {
  assert.deepEqual(loaded.prepared.children.map(mesh => mesh.name).sort(), [...ids].sort());
  assert.deepEqual(loaded.prepared.userData, { schemaVersion: 1, specimenId: 'frog' });
  for (const mesh of loaded.prepared.children) {
    assert.equal(mesh.type, 'Mesh'); assert.equal(mesh.children.length, 0);
    assert.deepEqual(mesh.position.toArray(), [0, 0, 0]); assert.deepEqual(mesh.quaternion.toArray(), [0, 0, 0, 1]);
    assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]); assert.deepEqual(mesh.userData, {});
    assert.ok(mesh.geometry.attributes.position.count <= 9000); assert.ok(mesh.geometry.index.count <= 54000);
    assert.deepEqual(Object.keys(mesh.geometry.attributes).sort(), ['normal', 'position', 'uv']);
    for (const attr of Object.values(mesh.geometry.attributes)) assert.ok(attr.array.every(Number.isFinite));
    assert.ok(mesh.material.isMeshStandardMaterial && mesh.material.map?.isTexture);
    assert.ok(Number.isFinite(mesh.material.roughness) && mesh.material.roughness >= 0 && mesh.material.roughness <= 1);
    assert.ok(Number.isFinite(mesh.material.metalness) && mesh.material.metalness >= 0 && mesh.material.metalness <= 1);
    assert.ok(mesh.material.map.image.width > 0 && mesh.material.map.image.width <= 4096);
    assert.ok(mesh.material.map.image.height > 0 && mesh.material.map.image.height <= 4096);
  }
});

for (const id of ids.filter(id => id !== 'skin')) test(`${id}: one position-welded surface with a coincident body seam`, () => {
  const limb = topology(loaded.prepared.getObjectByName(id)), body = topology(loaded.prepared.getObjectByName('skin'));
  assert.equal(limb.components.length, 1, `${id} contains disconnected triangle components: ${limb.components.join(', ')}`);
  const shared = [...limb.boundary].filter(edge => body.boundary.has(edge));
  assert.ok(shared.length >= 3, `${id} needs an actual matching skin/limb boundary, not a nearby floating overlay`);
});

test('installing the actual asset leaves organ resources, original part descriptors, transforms and four pin contracts untouched', () => {
  const { parts } = build(THREE, 'frog');
  const originals = parts.map(part => ({ part, mesh: part.mesh, geometry: part.mesh.geometry, material: part.mesh.material,
    metadata: JSON.stringify(Object.fromEntries(Object.entries(part).filter(([key]) => key !== 'mesh'))),
    position: part.mesh.position.toArray(), quaternion: part.mesh.quaternion.toArray(), scale: part.mesh.scale.toArray(),
    digest: geometryDigest(part.mesh), userData: part.mesh.userData, children: [...part.mesh.children] }));
  const handle = install(THREE, { specimenId: 'frog', parts, prepared: loaded.prepared });
  try {
    for (const old of originals) {
      assert.equal(old.part.mesh, old.mesh); assert.equal(old.mesh.userData, old.userData);
      assert.equal(JSON.stringify(Object.fromEntries(Object.entries(old.part).filter(([key]) => key !== 'mesh'))), old.metadata);
      assert.deepEqual(old.mesh.position.toArray(), old.position); assert.deepEqual(old.mesh.quaternion.toArray(), old.quaternion); assert.deepEqual(old.mesh.scale.toArray(), old.scale);
      if (!ids.includes(old.part.id)) {
        assert.equal(old.mesh.geometry, old.geometry); assert.equal(old.mesh.material, old.material);
        assert.deepEqual(old.mesh.children, old.children); assert.equal(geometryDigest(old.mesh), old.digest);
      } else assert.equal(old.mesh.userData.preparedExterior.partId, old.part.id);
    }
    const limbs = parts.filter(part => ids.includes(part.id) && part.id !== 'skin');
    assert.equal(limbs.length, 4);
    for (const limb of limbs) {
      assert.equal(limb.layer, 0, limb.id + ' remains exposed to initial pin contact');
      assert.equal(limb.cuttable, false); assert.equal(limb.detachable, false);
      limb.mesh.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(limb.mesh), center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3()), ray = new THREE.Raycaster(); let hit = false;
      for (const axis of [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)]) {
        ray.set(center.clone().addScaledVector(axis, size.length() + 1), axis.clone().negate());
        hit ||= ray.intersectObject(limb.mesh, false).length > 0;
      }
      assert.ok(hit, limb.id + ' actual geometry must remain contactable by the pin tool');
    }
  } finally { handle.restore(); }
  for (const old of originals) { assert.equal(old.mesh.geometry, old.geometry); assert.equal(old.mesh.material, old.material); assert.equal(geometryDigest(old.mesh), old.digest); }
});

test('actual scanned seams remain joined during press, jiggle and life; free tissue responds and exact rest normals return', () => {
  const { parts, group } = build(THREE, 'frog');
  const handle = install(THREE, { specimenId: 'frog', parts, prepared: loaded.prepared });
  const exterior = parts.filter(part => ids.includes(part.id));
  group.position.set(.3, -1.4, .2); group.rotation.set(.12, .23, -.08); group.updateMatrixWorld(true);
  const originals = exterior.map(part => ({ part, position: part.mesh.geometry.attributes.position.array.slice(), normal: part.mesh.geometry.attributes.normal.array.slice() }));
  const vertices = new Map(), point = new THREE.Vector3();
  for (const { part } of originals) {
    const attr = part.mesh.geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      point.fromBufferAttribute(attr, i).applyMatrix4(part.mesh.matrixWorld);
      const key = point.toArray().map(v => Math.round(v * 1e5)).join(',');
      if (!vertices.has(key)) vertices.set(key, []);
      vertices.get(key).push({ part, index: i, rest: point.clone() });
    }
  }
  const shared = [...vertices.values()].filter(entries => new Set(entries.map(entry => entry.part.id)).size > 1);
  assert.ok(shared.length > 30, 'actual scan must have substantial common limb boundaries');
  let soft;
  try {
    soft = createSoftBody(THREE, exterior);
    const skin = exterior.find(part => part.id === 'skin'), attr = skin.mesh.geometry.attributes.position;
    let contact = 0;
    for (let i = 1; i < attr.count; i++) if (attr.getY(i) > attr.getY(contact)) contact = i;
    point.fromBufferAttribute(attr, contact).applyMatrix4(skin.mesh.matrixWorld);
    soft.press('skin', point, 1, 1.6); exterior.forEach(part => soft.jiggle(part.id, .65)); soft.setLife(true);
    let maxResponse = 0;
    for (let frame = 0; frame < 30; frame++) {
      soft.update(32);
      for (const entries of shared) {
        for (const entry of entries) {
          point.fromBufferAttribute(entry.part.mesh.geometry.attributes.position, entry.index).applyMatrix4(entry.part.mesh.matrixWorld);
          assert.ok(point.distanceTo(entry.rest) < 2e-5, entry.part.id + ' shared vertex stays anchored');
        }
      }
      for (const old of originals) {
        const current = old.part.mesh.geometry.attributes.position.array;
        for (let i = 0; i < current.length; i++) maxResponse = Math.max(maxResponse, Math.abs(current[i] - old.position[i]));
      }
    }
    assert.ok(maxResponse > .01, 'the entire specimen must not be immobilized to hide seam cracks');
    soft.release('skin'); soft.setLife(false);
    for (let frame = 0; frame < 120; frame++) soft.update(50);
    for (const old of originals) {
      assert.deepEqual(old.part.mesh.geometry.attributes.position.array, old.position, old.part.id + ' settles exactly');
      assert.deepEqual(old.part.mesh.geometry.attributes.normal.array, old.normal, old.part.id + ' restores authored normals after settling');
    }
    soft.jiggle('skin', .5); soft.update(32); soft.dispose(); soft = null;
    for (const old of originals) {
      assert.deepEqual(old.part.mesh.geometry.attributes.position.array, old.position);
      assert.deepEqual(old.part.mesh.geometry.attributes.normal.array, old.normal, 'dispose restores authored normals too');
    }
  } finally { soft?.dispose(); handle.restore(); }
});
