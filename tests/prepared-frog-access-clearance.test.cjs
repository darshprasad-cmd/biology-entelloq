const assert = require('node:assert/strict'), { before, after, test } = require('node:test');
const { loadRealPreparedFrog } = require('./helpers/real-prepared-frog.cjs');
let api;
before(async () => { api = await loadRealPreparedFrog(); });
after(() => api?.loaded.dispose());
for (const [label, x, z0, z1] of [['midline', 0, -2, 1.5], ['short pelvic', 0, -3, -1.4], ['short cranial', 0, 1.2, 3], ['left oblique', -2, -1.8, 0], ['right oblique', 2, -1.8, 0]]) {
  test(`actual frog ${label} incision: forceps opens the ventral cavity while retaining head, backing and limbs`, () => {
    const { THREE } = api, f = api.fixture(), mesh = f.parts.find(p => p.id === 'skin').mesh;
    const rest = mesh.geometry.attributes.position.array.slice(), index = mesh.geometry.index;
    const limbState = f.parts.filter(p => /^(fore|hind)limb-/.test(p.id)).map(p => ({ mesh: p.mesh,
      geometry: p.mesh.geometry, material: p.mesh.material, position: p.mesh.geometry.attributes.position.array.slice(), matrix: p.mesh.matrix.clone() }));
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0).transformDirection(mesh.matrixWorld), points = [];
    for (let z = z0; z <= z1; z += .2) {
      ray.set(mesh.localToWorld(new THREE.Vector3(x, 10, z)), down);
      const hit = ray.intersectObject(mesh, false)[0]; if (hit) points.push(hit.point);
    }
    assert.ok(points.length >= 5 && points[0].distanceTo(points.at(-1)) > 1.1, 'a valid nontrivial real-surface incision');
    const cuts = api.createCutting(THREE, f.scene);
    try {
      assert.ok(cuts.open({ partId: 'skin', mesh, points, rest, system: 'integument' }));
      for (let i = 0; i < 12; i++) cuts.update(64);
      mesh.visible = false; assert.ok(cuts.releaseSurface('skin')); assert.ok(cuts.remove('skin'));
      f.scene.updateMatrixWorld(true);
      const residual = f.group.getObjectByName('uncut:skin'), window = residual?.userData.accessWindow;
      assert.ok(window?.preparedFrog); assert.deepEqual(window.normal, [0, 1, 0]);
      assert.equal(window.tailZ, -3.4); assert.equal(window.headZ, 3.15);
      const optical = new THREE.Mesh(residual.geometry, residual.material); optical.matrixWorld.copy(residual.matrixWorld);
      for (const xx of [-1, -.5, 0, .5, 1]) for (const z of [-3.2, -2.7, -2, -1, 0, 1, 2, 2.9]) {
        ray.set(mesh.localToWorld(new THREE.Vector3(xx, 10, z)), down);
        const hit = ray.intersectObject(optical, false)[0];
        assert.ok(!hit || mesh.worldToLocal(hit.point.clone()).y <= -.0249, `no upper opaque remnant at x=${xx}, z=${z}`);
      }
      const pos = residual.geometry.attributes.position, keys = new Set();
      const key = (a, i) => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]].map(v => Math.round(v * 1e5)).join(',');
      for (let i = 0; i < pos.count; i += 3) keys.add([key(pos.array, i), key(pos.array, i + 1), key(pos.array, i + 2)].sort().join('|'));
      let retainedHead = 0, retainedBack = 0, retainedPelvis = 0;
      for (let i = 0; i < index.count; i += 3) {
        const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        const head = ids.every(i => rest[i * 3 + 2] > 3.16), back = ids.every(i => rest[i * 3 + 1] < -.03), pelvis = ids.every(i => rest[i * 3 + 2] < -3.41);
        if (head || back || pelvis) assert.ok(keys.has(ids.map(i => key(rest, i)).sort().join('|')), 'uncut original triangle survives whole');
        retainedHead += head; retainedBack += back; retainedPelvis += pelvis;
      }
      assert.ok(retainedHead > 20 && retainedBack > 100 && retainedPelvis > 5);
      for (const old of limbState) {
        assert.equal(old.mesh.geometry, old.geometry); assert.equal(old.mesh.material, old.material);
        assert.deepEqual(old.mesh.geometry.attributes.position.array, old.position); assert.deepEqual(old.mesh.matrix.elements, old.matrix.elements);
      }
      assert.equal(residual.material.map, mesh.material.map); assert.equal(residual.userData.noPick, true);
      for (const attr of Object.values(residual.geometry.attributes)) assert.ok(attr.array.every(Number.isFinite));
      cuts.clear(); assert.equal(f.group.getObjectByName('uncut:skin'), undefined); assert.equal(mesh.geometry.index, index);
      assert.ok(rest.every((v, i) => Math.abs(v - mesh.geometry.attributes.position.array[i]) < 2e-6));
    } finally { cuts.dispose(); f.dispose(); }
  });
}
