/* Offline geometry contracts. The pre-exterior hashes preserve the original
   interactive anatomy, not the appearance of the new sac, fat, or vessel rims. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto');
const { before, test } = require('node:test');
const root = path.resolve(__dirname, '..');
let THREE, heart;
before(async () => {
  const html = fs.readFileSync(path.join(root, 'lab.html'), 'utf8');
  const imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.ok(imports.three.startsWith('data:text/javascript;base64,'), 'use the shipped offline runtime');
  THREE = await import(imports.three);
  const context = vm.createContext({ THREE });
  for (const name of ['anatomy', 'heart']) {
    const source = fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8');
    vm.runInContext(source.replace(/\bexport\s+/g, ''), context, { filename: name + '.js' });
  }
  heart = context.buildHeart(THREE); heart.group.updateMatrixWorld(true);
});
const part = id => {
  const found = heart.parts.find(p => p.id === id);
  assert.ok(found, id + ' retains its original part');
  return found;
};
function localBounds(mesh) {
  mesh.updateMatrix(); mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
}

test('heart IDs, layers, transforms, interactions, and authored incisions remain unchanged', () => {
  assert.equal(heart.parts.length, 32);
  assert.equal(new Set(heart.parts.map(p => p.id)).size, 32);
  const hash = crypto.createHash('sha256');
  for (const p of heart.parts) {
    assert.equal(p.mesh.userData.partId, p.id);
    p.mesh.updateMatrix();
    hash.update(JSON.stringify([p.id, p.name, p.layer, p.system, p.cuttable,
      p.detachable, p.mesh.matrix.elements, p.incision || null]));
  }
  assert.equal(hash.digest('hex'), 'b74713e46da6c92594eafb8a2e27bbb0a0d4a68faa580722cacd1813ff7161c9');
  assert.equal(heart.group.rotation.x, -Math.PI / 2);
  assert.equal(heart.group.scale.x, .9);
});

test('internal valves, septum, chordae, and papillary muscles keep their geometry and remain hidden', () => {
  const internal = heart.parts.filter(p => p.layer === 2);
  assert.equal(internal.length, 14);
  const hash = crypto.createHash('sha256');
  for (const p of internal) {
    assert.equal(p.mesh.visible, false, p.id + ' must not become exterior decoration');
    hash.update(p.id);
    p.mesh.traverse(mesh => {
      mesh.updateMatrix(); hash.update(JSON.stringify(mesh.matrix.elements));
      if (!mesh.geometry) return;
      for (const name of ['position', 'normal', 'uv']) {
        const array = mesh.geometry.attributes[name]?.array;
        if (array) hash.update(Buffer.from(array.buffer));
      }
      if (mesh.geometry.index) hash.update(Buffer.from(mesh.geometry.index.array.buffer));
    });
  }
  assert.equal(hash.digest('hex'), '0b00e07c72a5bfbe49a3f19baa339894314e68fa737b4f1e6c46173a552a5bc8');
});

test('the sac is finite and tapered, while fat is localized opaque tissue instead of an enclosing veil', () => {
  const sac = part('pericardium').mesh, fat = part('epicardial-fat').mesh;
  assert.equal(sac.userData.exteriorDetail, 'conforming-sac');
  assert.equal(fat.userData.exteriorDetail, 'localized-fat');
  const sacBounds = localBounds(sac), fatBounds = localBounds(fat);
  const sacSize = sacBounds.getSize(new THREE.Vector3());
  assert.ok(sacSize.y > sacSize.x && sacSize.x < 6.5, 'sac follows a tapered heart, not the previous broad sphere');
  assert.ok(sacBounds.min.y < -3.4 && sacBounds.max.y > 3.8, 'sac retains apex-to-base coverage');
  assert.ok(fatBounds.min.y > sacBounds.min.y + 2, 'fat does not wrap the full ventricular/apical surface');
  assert.ok(fatBounds.min.z > -.5, 'localized anterior pads do not recreate an enclosing shell');
  assert.equal(fat.material.transparent, false);
  assert.equal(fat.material.opacity, 1);
  assert.equal(fat.material.depthWrite, true);
  assert.equal(fat.material.transmission, 0);
});

test('all thirteen vessel stumps have correctly parented, open rims and recessed lumens', () => {
  let stemCount = 0;
  for (const id of ['aorta', 'pulmonary-trunk', 'svc', 'ivc', 'pulmonary-veins']) {
    part(id).mesh.traverse(stem => {
      const path = stem.geometry?.parameters?.path;
      if (!path) return;
      stemCount++;
      const end = path.getPointAt(1), axis = path.getTangentAt(1).normalize();
      const vertices = stem.geometry.attributes.position;
      const radius = new THREE.Vector3().fromBufferAttribute(vertices, vertices.count - 1).distanceTo(end);
      const rims = stem.children.filter(mesh => mesh.userData.exteriorDetail === 'vessel-rim');
      const lumens = stem.children.filter(mesh => mesh.userData.exteriorDetail === 'vessel-lumen');
      assert.equal(rims.length, 1, id + ': one rim per actual vessel stem');
      assert.equal(lumens.length, 1, id + ': one lumen per actual vessel stem');
      const rim = rims[0], lumen = lumens[0];
      assert.equal(rim.parent, stem); assert.equal(lumen.parent, stem);
      assert.equal(rim.userData.partId, undefined); assert.equal(lumen.userData.partId, undefined);
      assert.ok(rim.position.distanceTo(end) < 1e-6, id + ': rim is seated on its own distal centre');
      assert.ok(new THREE.Vector3(0, 0, 1).applyQuaternion(rim.quaternion).dot(axis) > 1 - 1e-6);
      const ring = rim.geometry.parameters, bore = lumen.geometry.parameters;
      assert.ok(ring.innerRadius > 0 && ring.innerRadius < ring.outerRadius, id + ': a real annular opening');
      assert.ok(Math.abs(ring.outerRadius - radius) < radius * .03, id + ': rim meets vessel wall');
      assert.equal(bore.openEnded, true, id + ': lumen must not be capped');
      assert.ok(bore.radiusTop > 0 && bore.radiusTop < radius);
      assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(lumen.quaternion).dot(axis) > 1 - 1e-6);
      const mouth = lumen.position.clone().addScaledVector(axis, bore.height / 2);
      assert.ok(mouth.distanceTo(end) < 1e-6, id + ': recessed bore mouth meets the rim plane');
      assert.ok(lumen.position.clone().sub(end).dot(axis) < 0, id + ': bore is inside, not floating beyond stump');
    });
  }
  assert.equal(stemCount, 13, 'retain the existing main vessels and branching pattern');
});

test('all geometry is finite with valid indices and a bounded rendering cost', () => {
  let triangles = 0;
  heart.group.traverse(mesh => {
    const geometry = mesh.geometry, positions = geometry?.attributes.position;
    if (!positions) return;
    assert.ok(positions.array.every(Number.isFinite), 'finite positions');
    assert.ok(geometry.attributes.normal.array.every(Number.isFinite), 'finite normals');
    if (geometry.index) {
      assert.ok(geometry.index.array.every(i => i >= 0 && i < positions.count), 'valid vertex references');
      triangles += geometry.index.count / 3;
    } else triangles += positions.count / 3;
    geometry.computeBoundingSphere();
    assert.ok(Number.isFinite(geometry.boundingSphere.radius) && geometry.boundingSphere.radius > 0);
  });
  assert.ok(triangles > 30000 && triangles < 42000, 'heart stays below 42k triangles including hidden anatomy');
});
