/* Actual geometry and createDissection inputs, in illustrative model units.
 * The exposed-organ diagnostic does not validate the full access procedure,
 * continuous lumens, renal physiology, species accuracy or webcam tracking. */
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
  const part = specimen.parts.find(p => p.id === 'malpighian-tubules');
  return { ...specimen, part, mesh: part.mesh };
}
const vertex = (mesh, i) => new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld);

// Discover surfaces from indexed connectivity, not fixed offsets, opaque
// metadata or children that the production nonrecursive picker cannot reach.
function components(mesh) {
  const g = mesh.geometry, adjacency = Array.from({ length: g.attributes.position.count }, () => new Set());
  assert.ok(g.index, 'the closed surfaces have shared indexed edges');
  assert.equal(g.index.count % 3, 0);
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
    const triangles = [];
    for (let i = 0; i < g.index.count; i += 3) if (ids.has(g.index.getX(i))) {
      triangles.push([g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)]);
    }
    const points = [...ids].map(i => vertex(mesh, i)), bounds = new THREE.Box3().setFromPoints(points);
    const size = bounds.getSize(new THREE.Vector3());
    result.push({ ids, triangles, points, bounds, centre: bounds.getCenter(new THREE.Vector3()), ampulla: Math.max(size.x, size.y, size.z) < .4 });
  }
  return result;
}

// Find a top-down ray that really reaches this tube's rendered surface; no
// proxy point or enlarged invisible collider can satisfy the face check.
function topTarget(mesh, component) {
  const ray = new THREE.Raycaster(), candidates = component.triangles.map(ids =>
    ids.reduce((sum, i) => sum.add(vertex(mesh, i)), new THREE.Vector3()).divideScalar(3))
    .sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
  for (const point of candidates) {
    ray.set(new THREE.Vector3(point.x, 3, point.z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(mesh, false)[0];
    if (hit && component.ids.has(hit.face.a)) return hit.point;
  }
  assert.fail('each representative tubule has an exposed top-down direct surface target');
}

function componentWall(mesh, component, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', mesh.geometry.attributes.position);
  geometry.setIndex(component.triangles.flat());
  const wall = new THREE.Mesh(geometry, material); wall.matrixWorld.copy(mesh.matrixWorld);
  return wall;
}

// The closed rounded components are convex near the proximal caps. Comparing
// each point to an actual rendered triangle along the radial ray, rather than
// its bounding box, distinguishes seated roots from almost-touching ones.
function signedSurfaceDistance(point, centre, wall) {
  const offset = point.clone().sub(centre), distance = offset.length();
  const radial = distance > 1e-10 ? offset.divideScalar(distance) : new THREE.Vector3(1, 0, 0);
  const ray = new THREE.Raycaster(centre.clone().addScaledVector(radial, 3), radial.clone().negate());
  const hit = ray.intersectObject(wall, false)[0];
  assert.ok(hit, 'the receiving wall exists along this radial ray');
  return distance - hit.point.distanceTo(centre);
}

function caps(component) {
  const neighbors = new Map([...component.ids].map(i => [i, new Set()]));
  for (const [a, b, c] of component.triangles) for (const [u, v] of [[a, b], [b, c], [c, a]]) {
    neighbors.get(u).add(v); neighbors.get(v).add(u);
  }
  // The single shared vertices that close each end have eight neighboring
  // rim vertices; regular wall vertices have six (five next to a cap).
  const ends = [...neighbors].filter(([, adjacent]) => adjacent.size === 8).map(([i]) => i);
  assert.equal(ends.length, 2, 'a connected wall has exactly two explicitly closed ends');
  return { ends, neighbors };
}

test('Malpighian subset retains all 27 IDs and one noncuttable detachable pick target', () => {
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
    id: 'malpighian-tubules', name: 'Malpighian tubules', layer: 2, system: 'excretory', cuttable: false, detachable: true,
  });
  assert.ok(f.mesh.isMesh);
  assert.equal(f.mesh.userData.partId, 'malpighian-tubules');
  assert.equal(f.mesh.visible, false);
  assert.equal(f.mesh.children.length, 0, 'no unpickable decorative tubules or central carrier blob');
  assert.deepEqual(f.mesh.position.toArray(), [0, 0, 0]);
  assert.deepEqual(f.mesh.quaternion.toArray(), [0, 0, 0, 1]);
  assert.deepEqual(f.mesh.scale.toArray(), [1, 1, 1]);
  assert.match(f.part.note, /schematic|representative|subset/i, 'the displayed subset is not claimed to be the full tubule count');
});

test('six ampullae and eighteen representative tubules are finite closed outward surfaces within budget', () => {
  const { mesh } = fixture(), g = mesh.geometry, surfaces = components(mesh);
  assert.equal(surfaces.length, 24);
  assert.equal(surfaces.filter(s => s.ampulla).length, 6);
  assert.equal(surfaces.filter(s => !s.ampulla).length, 18, 'representative subset, not a species count');
  assert.ok(g.attributes.position.count < 12000 && g.index.count / 3 < 20000, 'bounded single-draw-call geometry');
  for (const attribute of Object.values(g.attributes)) assert.ok(attribute.array.every(Number.isFinite));
  assert.equal(g.attributes.normal.count, g.attributes.position.count);
  for (const component of surfaces) {
    const edges = new Map(); let volume = 0;
    for (const [a, b, c] of component.triangles) {
      const pa = vertex(mesh, a), pb = vertex(mesh, b), pc = vertex(mesh, c);
      assert.ok(pb.clone().sub(pa).cross(pc.clone().sub(pa)).lengthSq() > 1e-16, 'no collapsed cap or seam triangles');
      volume += pa.dot(pb.clone().cross(pc)) / 6;
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const key = `${Math.min(u, v)}:${Math.max(u, v)}`, edge = edges.get(key) || { count: 0, direction: 0 };
        edge.count++; edge.direction += u < v ? 1 : -1; edges.set(key, edge);
      }
    }
    for (const edge of edges.values()) {
      assert.equal(edge.count, 2, 'root and blind tip have no open boundary edges');
      assert.equal(edge.direction, 0, 'adjacent faces have coherent outward winding');
    }
    assert.equal(component.ids.size - edges.size + component.triangles.length, 2, 'each surface is closed and genus zero');
    assert.ok(volume > 1e-6 && volume < .03, `each fine component has positive bounded volume: ${volume}`);
    assert.ok(component.bounds.min.x > -2 && component.bounds.max.x < 2);
    assert.ok(component.bounds.min.y > -.7 && component.bounds.max.y < .7);
    assert.ok(component.bounds.min.z > -5 && component.bounds.max.z < -1.9, 'tufts arise at the hindgut junction and fan posteriorly');
  }
});

test('every representative tubule is a direct target of the production nonrecursive raycast', () => {
  const { mesh } = fixture(), tubules = components(mesh).filter(s => !s.ampulla), ray = new THREE.Raycaster();
  assert.equal(tubules.length, 18);
  for (const tubule of tubules) {
    const point = topTarget(mesh, tubule);
    ray.set(point.clone().add(new THREE.Vector3(0, 3, 0)), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObject(mesh, false)[0];
    assert.ok(hit?.object === mesh && tubule.ids.has(hit.face.a), 'this visible thread itself is selectable');
  }
});

test('all six ampullae cross the actual junction wall and surround it transversely', () => {
  const f = fixture(), hindgut = f.parts.find(p => p.id === 'hindgut').mesh;
  const ampullae = components(f.mesh).filter(s => s.ampulla), angles = [];
  assert.equal(ampullae.length, 6);
  for (const ampulla of ampullae) {
    const signed = new Map();
    for (const i of ampulla.ids) {
      const point = vertex(f.mesh, i);
      assert.ok(point.z > -2.2 && point.z < -2.04, 'ampullary attachments remain at the actual gut junction');
      signed.set(i, signedSurfaceDistance(point, new THREE.Vector3(0, -.04, point.z), hindgut));
    }
    const ends = caps(ampulla).ends.map(i => ({ point: vertex(f.mesh, i), distance: signed.get(i) })).sort((a, b) => a.distance - b.distance);
    assert.ok(ends[0].distance < -.02 && ends[1].distance > .03, 'ampulla extends from inside the polygonal gut wall to outside');
    assert.ok(ampulla.triangles.some(face => face.some(i => signed.get(i) < -.002) && face.some(i => signed.get(i) > .002)),
      'the actual ampulla wall crosses the receiving gut surface; no detached point proxy');
    angles.push(Math.atan2(ends[0].point.y + .04, ends[0].point.x));
  }
  angles.sort((a, b) => a - b);
  for (let i = 0; i < angles.length; i++) {
    const gap = (angles[(i + 1) % angles.length] - angles[i] + Math.PI * 2) % (Math.PI * 2);
    assert.ok(gap > .8 && gap < 1.3, 'six illustrative attachments surround the transverse circumference, not one carrier lump');
  }
});

test('each closed tubule actually enters one ampulla, with three illustrative branches per receiver', () => {
  const { mesh } = fixture(), surfaces = components(mesh), ampullae = surfaces.filter(s => s.ampulla);
  const tubules = surfaces.filter(s => !s.ampulla), material = mesh.material.clone(); material.side = THREE.DoubleSide;
  const walls = ampullae.map(a => componentWall(mesh, a, material)), counts = ampullae.map(() => 0);
  try {
    assert.equal(ampullae.length, 6); assert.equal(tubules.length, 18);
    for (const tubule of tubules) {
      const { ends, neighbors } = caps(tubule);
      const endpoints = ends.map(i => ({ i, point: vertex(mesh, i) }));
      endpoints.sort((a, b) => b.point.z - a.point.z);
      const proximal = endpoints[0], distal = endpoints[1];
      assert.ok(proximal.point.z > -2.15 && proximal.point.z < -2.09);
      assert.ok(distal.point.z < proximal.point.z - .8, 'a closed blind tip extends away from the junction');
      const receiving = ampullae.map((a, index) => ({ index, distance: signedSurfaceDistance(proximal.point, a.centre, walls[index]) }))
        .filter(a => a.distance < -.005);
      assert.equal(receiving.length, 1, 'proximal cap is meaningfully buried inside exactly one actual ampulla surface');
      const index = receiving[0].index; counts[index]++;
      const localVertices = [proximal.i, ...neighbors.get(proximal.i)];
      // A cap can be seated even when its first rim has started emerging.
      // Its physical incident triangles must bridge from an embedded tip to
      // the following tube wall, not merely share a metadata attachment name.
      assert.ok(localVertices.every(i => vertex(mesh, i).distanceTo(ampullae[index].centre) < .15));
      const signed = new Map([...tubule.ids].map(i => [i, signedSurfaceDistance(vertex(mesh, i), ampullae[index].centre, walls[index])]));
      assert.ok(tubule.triangles.some(face => face.some(i => signed.get(i) < -.002) && face.some(i => signed.get(i) > .002)),
        'actual tubule faces pass through the receiving ampulla wall');
      assert.ok(signed.get(distal.i) > .5, 'the distal blind tip is free, not a loop returning to the receiver');
    }
    assert.deepEqual(counts, [3, 3, 3, 3, 3, 3]);
  } finally { for (const wall of walls) wall.geometry.dispose(); material.dispose(); }
});

test('free tubule walls clear the actual midgut and hindgut outside their receiving ampullae', () => {
  const f = fixture(), surfaces = components(f.mesh), tubules = surfaces.filter(s => !s.ampulla);
  const ampullae = surfaces.filter(s => s.ampulla), material = f.mesh.material.clone(); material.side = THREE.DoubleSide;
  const receivers = ampullae.map(a => componentWall(f.mesh, a, material));
  const freePoints = []; let attachments = 0;
  try {
    for (const tubule of tubules) {
      const proximal = caps(tubule).ends.map(i => vertex(f.mesh, i)).sort((a, b) => b.z - a.z)[0];
      const owner = ampullae.findIndex((ampulla, i) => ampulla.bounds.containsPoint(proximal)
        && signedSurfaceDistance(proximal, ampulla.centre, receivers[i]) < -.005);
      assert.ok(owner >= 0, 'the actual proximal cap identifies its receiving ampulla');
      for (const point of tubule.points) {
        const inReceiver = ampullae[owner].bounds.containsPoint(point)
          && signedSurfaceDistance(point, ampullae[owner].centre, receivers[owner]) <= 0;
        if (inReceiver) attachments++;
        else freePoints.push(point);
      }
    }
  } finally { for (const receiver of receivers) receiver.geometry.dispose(); material.dispose(); }
  assert.ok(attachments >= 18 && attachments < 400, 'only small physically embedded roots are exempt, not an entire longitudinal band');
  const closest = new THREE.Vector3(), offset = new THREE.Vector3();
  for (const id of ['midgut', 'hindgut']) {
    const mesh = f.parts.find(p => p.id === id).mesh, geometry = mesh.geometry, triangles = [];
    for (let i = 0; i < geometry.index.count; i += 3) {
      const triangle = new THREE.Triangle(...[0, 1, 2].map(j => vertex(mesh, geometry.index.getX(i + j))));
      triangles.push({ triangle, normal: triangle.getNormal(new THREE.Vector3()) });
    }
    let inspected = 0;
    for (const point of freePoints) {
      // Only points physically inside the actual receiving ampullae are
      // excluded. Free strands, including their early ascent near z=-2.2,
      // must not pierce the returning midgut or ileum. In this occupied-flank
      // region, nearest outward-face signed distance
      // distinguishes exterior clearance from material penetration. This is
      // not a general inside/outside proof for the gut's uncapped endpoints,
      // or a validation of the whole body cavity and every other organ.
      let minimum = Infinity, signed = Infinity;
      for (const { triangle, normal } of triangles) {
        triangle.closestPointToPoint(point, closest);
        offset.subVectors(point, closest);
        const distanceSq = offset.lengthSq();
        if (distanceSq < minimum) {
          minimum = distanceSq;
          signed = Math.sqrt(distanceSq) * Math.sign(normal.dot(offset));
        }
      }
      assert.ok(signed > .001, `free tubule must clear the actual ${id} wall, not pierce it: ${point.toArray()}, signed distance ${signed}`);
      inspected++;
    }
    assert.ok(inspected > 3000, 'check the actual fine tube wall vertices, not just its centreline or bounding box');
  }
});

test('real probe reaches all tubules, scalpel refuses, and forceps plus engine Undo leave no remnant', () => {
  const f = fixture(), scene = new THREE.Scene(), events = []; scene.add(f.group);
  for (const part of f.parts) part.mesh.visible = part === f.part;
  const camera = new THREE.OrthographicCamera(-6, 6, 6, -6, .1, 40);
  camera.up.set(0, 0, 1); camera.position.set(0, 10, -2.5); camera.lookAt(0, 0, -2.5); camera.updateMatrixWorld();
  const api = createDissection(THREE, { ...f, scene, camera, requiresPinning: false, onEvent: e => events.push(e) });
  const coordinates = p => { const n = p.clone().project(camera); return { x: (n.x + 1) / 2, y: (1 - n.y) / 2 }; };
  const input = (p, gripping) => { scene.updateMatrixWorld(true); api.update({ ...coordinates(p), gripping, grip: gripping ? .7 : 0, span: 0 }, 16); };
  const tubules = components(f.mesh).filter(s => !s.ampulla), targets = tubules.map(t => topTarget(f.mesh, t));
  const savedGeometry = f.mesh.geometry, saved = savedGeometry.attributes.position.array.slice();
  const originalBounds = new THREE.Box3().setFromObject(f.mesh, true);
  try {
    assert.equal(tubules.length, 18);
    api.state.maxLayerRevealed = 1;
    for (const point of targets) { const { x, y } = coordinates(point); assert.equal(api.pick(x, y), null, 'preview visibility never bypasses layer access'); }
    api.state.maxLayerRevealed = 2; f.mesh.visible = false;
    for (const point of targets) { const { x, y } = coordinates(point); assert.equal(api.pick(x, y), null, 'hidden tubules are not pick targets'); }
    f.mesh.visible = true;
    for (const [i, point] of targets.entries()) {
      const { x, y } = coordinates(point), before = events.length, hit = api.pick(x, y);
      assert.ok(hit?.object === f.mesh && tubules[i].ids.has(hit.face.a));
      input(point, true); input(point, false);
      assert.ok(events.slice(before).some(e => e.kind === 'discover' && e.partId === f.part.id));
    }
    for (const point of targets) {
      const before = events.length; api.setTool('scalpel'); input(point, true); input(point, false);
      assert.ok(events.slice(before).some(e => e.kind === 'incise' && e.partId === f.part.id && e.meta.refused));
    }
    assert.equal(api.state.incisions.has(f.part.id), false);
    assert.deepEqual(f.mesh.geometry.attributes.position.array, saved);
    const point = targets.find(p => p.x > 0); assert.ok(point, 'test extraction from the right-side thread, not a midline carrier');
    api.setTool('forceps'); input(point, true); input(point.clone().add(new THREE.Vector3(4, 0, 0)), true); input(point, false);
    assert.ok(api.state.removed.has(f.part.id));
    assert.ok(events.some(e => e.kind === 'lift' && e.partId === f.part.id));
    scene.updateMatrixWorld(true);
    assert.ok(!new THREE.Box3().setFromObject(f.mesh, true).intersectsBox(originalBounds), 'entire subset leaves the cavity together');
    assert.equal(f.mesh.children.length, 0);
    for (const point of targets) {
      const { x, y } = coordinates(point); assert.notEqual(api.pick(x, y)?.object, f.mesh, 'no residual thread shields its original position');
    }
    assert.equal(f.mesh.geometry, savedGeometry); assert.deepEqual(savedGeometry.attributes.position.array, saved);
    assert.ok(api.undo()); assert.equal(api.state.removed.has(f.part.id), false);
    assert.deepEqual(f.mesh.position.toArray(), [0, 0, 0]); scene.updateMatrixWorld(true);
    for (const point of targets) { const { x, y } = coordinates(point); assert.equal(api.pick(x, y)?.object, f.mesh); }
    assert.equal(components(f.mesh).length, 24);
  } finally { api.dispose(); }
});

test('all created buffers remain owned or disposed and the combined organ survives until disposal', () => {
  const created = new Set(), disposed = new Set(), set = THREE.BufferGeometry.prototype.setAttribute, dispose = THREE.BufferGeometry.prototype.dispose;
  THREE.BufferGeometry.prototype.setAttribute = function (name, attribute) { if (name === 'position') created.add(this); return set.call(this, name, attribute); };
  THREE.BufferGeometry.prototype.dispose = function () { disposed.add(this); return dispose.call(this); };
  try {
    const f = fixture(), owned = new Set(); f.group.traverse(m => { if (m.geometry) owned.add(m.geometry); });
    assert.ok(owned.has(f.mesh.geometry) && !disposed.has(f.mesh.geometry));
    assert.equal(f.mesh.children.length, 0, 'one owned geometry for the whole pickable subset');
    for (const g of created) assert.ok(owned.has(g) || disposed.has(g), 'no orphan temporary geometry');
    f.group.traverse(m => { if (m.geometry) m.geometry.dispose(); });
    for (const g of created) assert.ok(disposed.has(g), 'every builder geometry is reachable for eventual disposal');
  } finally { THREE.BufferGeometry.prototype.setAttribute = set; THREE.BufferGeometry.prototype.dispose = dispose; }
});
