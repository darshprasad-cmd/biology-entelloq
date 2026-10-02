/* Actual geometry and createDissection inputs, in illustrative model units.
 * This isolated exposed-organ diagnostic does not validate full layer access,
 * respiratory lumens, a complete species network, or webcam tracking. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { before, test } = require('node:test');
const root = path.resolve(__dirname, '..');
let THREE, build, createDissection;
before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  const context = vm.createContext({ THREE, performance });
  for (const name of ['anatomy', 'cockroach', 'dissect']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8').replace(/^export\s+/gm, ''), context);
  }
  build = () => vm.runInContext("buildSpecimen(THREE, 'cockroach')", context);
  createDissection = vm.runInContext('createDissection', context);
});

function fixture() {
  const specimen = build(); specimen.group.updateMatrixWorld(true);
  const part = specimen.parts.find(p => p.id === 'tracheae');
  return { ...specimen, part, mesh: part.mesh };
}
const vertex = (mesh, i) => new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld);

// Discover tube components from the production mesh's indexed connectivity,
// not implementation metadata, child decorations or fixed vertex offsets.
function components(mesh) {
  const g = mesh.geometry, adjacency = Array.from({ length: g.attributes.position.count }, () => new Set());
  for (let i = 0; i < g.index.count; i += 3) {
    const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
    for (const index of ids) assert.ok(Number.isInteger(index) && index >= 0 && index < adjacency.length);
    for (const [u, v] of [[ids[0], ids[1]], [ids[1], ids[2]], [ids[2], ids[0]]]) {
      adjacency[u].add(v); adjacency[v].add(u);
    }
  }
  const visited = new Set(), result = [];
  for (let start = 0; start < adjacency.length; start++) {
    if (visited.has(start)) continue;
    const ids = new Set([start]), queue = [start]; visited.add(start);
    while (queue.length) for (const next of adjacency[queue.pop()]) if (!visited.has(next)) {
      visited.add(next); ids.add(next); queue.push(next);
    }
    const points = [...ids].map(i => vertex(mesh, i)), bounds = new THREE.Box3().setFromPoints(points);
    result.push({ ids, points, bounds, trunk: bounds.max.z - bounds.min.z > 5 });
  }
  return result;
}
function ring(mesh, component, u) {
  return [...component.ids].filter(i => Math.abs(mesh.geometry.attributes.uv.getX(i) - u) < 1e-6);
}
function target(mesh, component) {
  // The UV coordinate gives the middle cross-section of the actual mesh.
  // Drop its duplicated seam vertex when calculating the centre.
  const ids = ring(mesh, component, .5).sort((a, b) => mesh.geometry.attributes.uv.getY(a) - mesh.geometry.attributes.uv.getY(b));
  assert.ok(ids.length >= 5);
  return ids.slice(0, -1).reduce((sum, i) => sum.add(vertex(mesh, i)), new THREE.Vector3()).divideScalar(ids.length - 1);
}

test('tracheae retain all 27 IDs and one noncuttable detachable pick target', () => {
  const f = fixture();
  assert.deepEqual(Array.from(f.parts, p => p.id).sort(), [
    'exoskeleton', 'pronotum', 'head', 'wing-left', 'wing-right',
    'fat-body-l-0', 'fat-body-r-1', 'fat-body-l-2', 'fat-body-r-3',
    'fat-body-c-4', 'fat-body-l-5', 'fat-body-r-6', 'fat-body-c-7', 'dorsal-heart',
    'oesophagus', 'crop', 'gizzard', 'midgut', 'gastric-caeca', 'hindgut', 'malpighian-tubules',
    'salivary-gland-l', 'salivary-gland-r', 'nerve-cord', 'brain-ganglion', 'tracheae', 'reproductive',
  ].sort());
  const { id, name, layer, system, cuttable, detachable } = f.part;
  assert.deepEqual({ id, name, layer, system, cuttable, detachable }, {
    id: 'tracheae', name: 'Tracheal system', layer: 3, system: 'respiratory', cuttable: false, detachable: true,
  });
  assert.ok(f.mesh.isMesh);
  assert.equal(f.mesh.userData.partId, 'tracheae');
  assert.equal(f.mesh.visible, false);
  assert.equal(f.mesh.children.length, 0, 'no visible-but-unpickable right trunk or branch decorations');
  assert.deepEqual(f.mesh.position.toArray(), [0, 0, 0]);
  assert.deepEqual(f.mesh.quaternion.toArray(), [0, 0, 0, 1]);
  assert.deepEqual(f.mesh.scale.toArray(), [1, 1, 1]);
});

test('both unchanged trunks and all ten branch surfaces are finite, bounded and nondegenerate', () => {
  const { mesh } = fixture(), g = mesh.geometry, tubes = components(mesh);
  assert.equal(tubes.length, 12, 'two longitudinal tubes and ten transverse tubes in the part geometry');
  for (const attribute of Object.values(g.attributes)) assert.ok(attribute.array.every(Number.isFinite));
  for (const name of ['normal', 'uv']) assert.equal(g.attributes[name].count, g.attributes.position.count);
  for (let i = 0; i < g.index.count; i += 3) {
    const a = vertex(mesh, g.index.getX(i)), b = vertex(mesh, g.index.getX(i + 1)), c = vertex(mesh, g.index.getX(i + 2));
    assert.ok(b.sub(a).cross(c.sub(a)).lengthSq() > 1e-12, 'no collapsed triangles');
  }
  const trunks = tubes.filter(t => t.trunk), branches = tubes.filter(t => !t.trunk);
  assert.equal(trunks.length, 2); assert.equal(branches.length, 10);
  for (const trunk of trunks) {
    const side = Math.sign(trunk.bounds.getCenter(new THREE.Vector3()).x);
    assert.equal(trunk.ids.size, 41 * 7, 'unchanged trunk resolution');
    assert.ok(Math.abs(trunk.bounds.min.z + 4.6) < 1e-6 && Math.abs(trunk.bounds.max.z - 2) < 1e-6);
    for (const p of trunk.points) assert.ok(Math.abs(Math.hypot(p.x - side * 1.25, p.y + .08) - .045) < 1e-6,
      'all original longitudinal wall vertices remain on the original .045-radius envelope');
  }
  for (const branch of branches) {
    assert.equal(branch.ids.size, 15 * 6, 'unchanged branch resolution');
    assert.ok(branch.bounds.max.x - branch.bounds.min.x > 1.2 && branch.bounds.max.x - branch.bounds.min.x < 1.32);
    assert.ok(branch.bounds.min.y > -.12 && branch.bounds.max.y < .08);
  }
});

test('every branch inlet rim is embedded in its actual polygonal longitudinal trunk wall', () => {
  const { mesh } = fixture(), tubes = components(mesh), trunks = tubes.filter(t => t.trunk);
  assert.equal(trunks.length, 2);
  const ray = new THREE.Raycaster(), material = mesh.material.clone(); material.side = THREE.DoubleSide;
  try {
    for (const branch of tubes.filter(t => !t.trunk)) {
      const inlet = ring(mesh, branch, 0), rootPoints = inlet.map(i => vertex(mesh, i));
      assert.equal(inlet.length, 6);
      const rootCentre = rootPoints.slice(0, -1).reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(5);
      const side = Math.sign(rootCentre.x), trunk = trunks.find(t => Math.sign(t.bounds.min.x) === side);
      assert.ok(Math.abs(rootCentre.x - side * 1.25) < 1e-6 && Math.abs(rootCentre.y + .08) < 1e-6,
        'each branch starts at its trunk axis rather than beyond its outside wall');
      const indices = [];
      for (let i = 0; i < mesh.geometry.index.count; i += 3) if (trunk.ids.has(mesh.geometry.index.getX(i))) {
        indices.push(mesh.geometry.index.getX(i), mesh.geometry.index.getX(i + 1), mesh.geometry.index.getX(i + 2));
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', mesh.geometry.attributes.position); geometry.setIndex(indices);
      const wall = new THREE.Mesh(geometry, material); wall.matrixWorld.copy(mesh.matrixWorld);
      try {
        for (const p of rootPoints) {
          const axis = new THREE.Vector3(side * 1.25, -.08, p.z), radial = p.clone().sub(axis).normalize();
          ray.set(axis, radial);
          const hit = ray.intersectObject(wall, false)[0];
          assert.ok(hit && p.distanceTo(axis) < hit.distance - .005,
            `branch rim is buried inside the rendered trunk, not only inside its bounding box: ${p.toArray()}`);
        }
      } finally { geometry.dispose(); }
    }
    assert.equal(tubes.filter(t => !t.trunk).length, 10);
  } finally { material.dispose(); }
});

test('production nonrecursive raycast directly hits both trunks and all ten branches', () => {
  const { mesh } = fixture(), tubes = components(mesh), ray = new THREE.Raycaster();
  assert.equal(tubes.length, 12);
  for (const component of tubes) {
    const centre = target(mesh, component);
    ray.set(centre.clone().add(new THREE.Vector3(0, 3, 0)), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(mesh, false)[0];
    assert.ok(hit && hit.object === mesh && component.ids.has(hit.face.a),
      'the desired visible tube itself is pickable, not a different carrier');
  }
});

test('real probe, refused scalpel and forceps use either side; engine Undo restores the entire network', () => {
  const f = fixture(), scene = new THREE.Scene(), events = []; scene.add(f.group);
  for (const part of f.parts) part.mesh.visible = part === f.part;
  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, .1, 40);
  camera.up.set(0, 0, 1); camera.position.set(0, 10, -1.3); camera.lookAt(0, 0, -1.3); camera.updateMatrixWorld();
  const api = createDissection(THREE, { ...f, scene, camera, requiresPinning: false, onEvent: e => events.push(e) });
  const coordinates = p => { const n = p.clone().project(camera); return { x: (n.x + 1) / 2, y: (1 - n.y) / 2 }; };
  const input = (p, gripping) => { scene.updateMatrixWorld(true); api.update({ ...coordinates(p), gripping, grip: gripping ? .7 : 0, span: 0 }, 16); };
  const tubes = components(f.mesh), originalTargets = tubes.map(t => target(f.mesh, t));
  const savedGeometry = f.mesh.geometry, saved = savedGeometry.attributes.position.array.slice();
  const originalBounds = new THREE.Box3().setFromObject(f.mesh, true);
  try {
    assert.equal(tubes.length, 12);
    api.state.maxLayerRevealed = 2;
    for (const point of originalTargets) { const { x, y } = coordinates(point); assert.equal(api.pick(x, y), null, 'a visible preview must not bypass deep-layer access'); }
    api.state.maxLayerRevealed = 3;
    f.mesh.visible = false;
    for (const point of originalTargets) { const { x, y } = coordinates(point); assert.equal(api.pick(x, y), null, 'hidden tubes are never tool targets'); }
    f.mesh.visible = true;
    for (const tube of tubes) {
      const point = target(f.mesh, tube), { x, y } = coordinates(point), before = events.length;
      assert.equal(api.pick(x, y)?.object, f.mesh);
      input(point, true); input(point, false);
      assert.ok(events.slice(before).some(e => e.kind === 'discover' && e.partId === 'tracheae'));
    }
    const rightBranch = tubes.find(t => !t.trunk && t.bounds.getCenter(new THREE.Vector3()).x > 0);
    const point = target(f.mesh, rightBranch);
    api.setTool('scalpel'); input(point, true); input(point, false);
    assert.ok(events.some(e => e.kind === 'incise' && e.partId === 'tracheae' && e.meta.refused));
    assert.equal(api.state.incisions.has('tracheae'), false);
    assert.deepEqual(f.mesh.geometry.attributes.position.array, saved);
    api.setTool('forceps'); input(point, true); input(point.clone().add(new THREE.Vector3(4, 0, 0)), true); input(point, false);
    assert.ok(api.state.removed.has('tracheae'));
    assert.ok(events.some(e => e.kind === 'lift' && e.partId === 'tracheae'));
    scene.updateMatrixWorld(true);
    assert.ok(!new THREE.Box3().setFromObject(f.mesh, true).intersectsBox(originalBounds), 'whole network leaves cavity together');
    assert.equal(f.mesh.children.length, 0);
    for (const point of originalTargets) {
      const { x, y } = coordinates(point);
      assert.notEqual(api.pick(x, y)?.object, f.mesh, 'no residual tube shields its original position');
    }
    assert.equal(f.mesh.geometry, savedGeometry); assert.deepEqual(savedGeometry.attributes.position.array, saved);
    assert.ok(api.undo()); assert.equal(api.state.removed.has('tracheae'), false);
    assert.deepEqual(f.mesh.position.toArray(), [0, 0, 0]);
    scene.updateMatrixWorld(true);
    for (const tube of tubes) { const { x, y } = coordinates(target(f.mesh, tube)); assert.equal(api.pick(x, y)?.object, f.mesh); }
    assert.equal(components(f.mesh).length, 12);
  } finally { api.dispose(); }
});

test('temporary tube buffers are disposed and the merged network has an owned disposable geometry', () => {
  const created = new Set(), disposed = new Set(), set = THREE.BufferGeometry.prototype.setAttribute, dispose = THREE.BufferGeometry.prototype.dispose;
  THREE.BufferGeometry.prototype.setAttribute = function (name, attribute) { if (name === 'position') created.add(this); return set.call(this, name, attribute); };
  THREE.BufferGeometry.prototype.dispose = function () { disposed.add(this); return dispose.call(this); };
  try {
    const f = fixture(), owned = new Set(); f.group.traverse(m => { if (m.geometry) owned.add(m.geometry); });
    const temporaryTubes = [...created].filter(g => g.type === 'TubeGeometry' && [0.045, 0.028].includes(g.parameters?.radius));
    assert.equal(temporaryTubes.length, 12);
    for (const g of temporaryTubes) assert.ok(disposed.has(g) && !owned.has(g), 'temporary tracheal tube copied then released');
    assert.ok(owned.has(f.mesh.geometry) && !disposed.has(f.mesh.geometry), 'live merged geometry is not prematurely disposed');
    for (const g of created) assert.ok(owned.has(g) || disposed.has(g), 'no orphan intermediate buffer');
    f.group.traverse(m => { if (m.geometry) m.geometry.dispose(); });
    for (const g of created) assert.ok(disposed.has(g));
  } finally { THREE.BufferGeometry.prototype.setAttribute = set; THREE.BufferGeometry.prototype.dispose = dispose; }
});
