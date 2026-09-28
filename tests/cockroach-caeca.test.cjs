/* Actual shipped geometry and input-agnostic dissection contracts. Model units,
 * not measured anatomy. The isolated organ fixture does not validate the full
 * access procedure, texture rendering, webcam tracking, or species accuracy. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { before, test } = require('node:test');

const root = path.resolve(__dirname, '..');
let THREE, build, createDissection;
before(async () => {
  const html = fs.readFileSync(path.join(root, 'lab.html'), 'utf8');
  const imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.ok(imports.three.startsWith('data:text/javascript;base64,'));
  THREE = await import(imports.three);
  const context = vm.createContext({ THREE, performance });
  for (const name of ['anatomy', 'cockroach', 'dissect']) {
    const source = fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8');
    vm.runInContext(source.replace(/^export\s+/gm, ''), context, { filename: name + '.js' });
  }
  build = () => vm.runInContext("buildSpecimen(THREE, 'cockroach')", context);
  createDissection = vm.runInContext('createDissection', context);
});

function fixture() {
  const specimen = build();
  specimen.group.updateMatrixWorld(true);
  const caeca = specimen.parts.find(p => p.id === 'gastric-caeca');
  return { ...specimen, caeca, mesh: caeca.mesh };
}

// Derive components from actual indexed connectivity, never author metadata or
// fixed vertex offsets. A torus and eight ornamental children cannot pass this.
function components(geometry) {
  const position = geometry.attributes.position, indices = geometry.index.array;
  const adjacency = Array.from({ length: position.count }, () => new Set());
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    for (const [u, v] of [[a, b], [b, c], [c, a]]) {
      assert.ok(u >= 0 && u < position.count && v >= 0 && v < position.count);
      adjacency[u].add(v); adjacency[v].add(u);
    }
  }
  const visited = new Set(), result = [];
  for (let start = 0; start < position.count; start++) {
    if (visited.has(start)) continue;
    const vertices = new Set(), queue = [start]; visited.add(start);
    while (queue.length) {
      const v = queue.pop(); vertices.add(v);
      for (const next of adjacency[v]) if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
    const triangles = [];
    for (let i = 0; i < indices.length; i += 3) {
      if (vertices.has(indices[i])) triangles.push([indices[i], indices[i + 1], indices[i + 2]]);
    }
    result.push({ vertices, triangles });
  }
  return result;
}
const vertex = (mesh, index) => new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, index)
  .applyMatrix4(mesh.matrixWorld);
function distalCentre(mesh, component) {
  const points = [...component.vertices].map(i => vertex(mesh, i));
  const box = new THREE.Box3().setFromPoints(points), cutoff = box.min.z + (box.max.z - box.min.z) * .7;
  const distal = points.filter(p => p.z > cutoff);
  return distal.reduce((sum, p) => sum.add(p), new THREE.Vector3()).divideScalar(distal.length);
}

test('caeca retain all 27 part IDs and the selectable cut/lift contract', () => {
  const f = fixture();
  assert.deepEqual(Array.from(f.parts, p => p.id).sort(), [
    'exoskeleton', 'pronotum', 'head', 'wing-left', 'wing-right',
    'fat-body-l-0', 'fat-body-r-1', 'fat-body-l-2', 'fat-body-r-3',
    'fat-body-c-4', 'fat-body-l-5', 'fat-body-r-6', 'fat-body-c-7', 'dorsal-heart',
    'oesophagus', 'crop', 'gizzard', 'midgut', 'gastric-caeca', 'hindgut', 'malpighian-tubules',
    'salivary-gland-l', 'salivary-gland-r', 'nerve-cord', 'brain-ganglion', 'tracheae', 'reproductive',
  ].sort());
  const { id, name, layer, system, cuttable, detachable } = f.caeca;
  assert.deepEqual({ id, name, layer, system, cuttable, detachable }, {
    id: 'gastric-caeca', name: 'Gastric caeca', layer: 2, system: 'digestive', cuttable: true, detachable: true,
  });
  assert.equal(f.mesh.userData.partId, 'gastric-caeca');
  assert.ok(f.mesh.isMesh);
  assert.equal(f.mesh.children.length, 0, 'no visible but unpickable child pouches');
  assert.equal(f.mesh.visible, false, 'gut starts behind the access layers');
  assert.deepEqual(f.mesh.position.toArray(), [0, 0, 0]);
  assert.deepEqual(f.mesh.quaternion.toArray(), [0, 0, 0, 1]);
  assert.deepEqual(f.mesh.scale.toArray(), [1, 1, 1]);
});

test('eight finite closed pouches have outward nondegenerate faces and no ring or open tips', () => {
  const { mesh } = fixture(), geometry = mesh.geometry, pouches = components(geometry);
  assert.equal(pouches.length, 8);
  for (const attribute of Object.values(geometry.attributes)) assert.ok(attribute.array.every(Number.isFinite));
  for (const pouch of pouches) {
    const edges = new Map(); let volume = 0;
    for (const [a, b, c] of pouch.triangles) {
      const pa = vertex(mesh, a), pb = vertex(mesh, b), pc = vertex(mesh, c);
      const normal = pb.clone().sub(pa).cross(pc.clone().sub(pa));
      assert.ok(normal.lengthSq() > 1e-14, 'no zero-area cap or seam triangles');
      volume += pa.dot(pb.clone().cross(pc)) / 6;
      for (const [u, v] of [[a, b], [b, c], [c, a]]) {
        const key = [Math.min(u, v), Math.max(u, v)].join(':');
        const edge = edges.get(key) || { count: 0, direction: 0 };
        edge.count++; edge.direction += u < v ? 1 : -1; edges.set(key, edge);
      }
    }
    for (const edge of edges.values()) {
      assert.equal(edge.count, 2, 'every cap and side edge belongs to two faces');
      assert.equal(edge.direction, 0, 'adjacent triangle winding is consistent');
    }
    assert.equal(pouch.vertices.size - edges.size + pouch.triangles.length, 2, 'closed genus-zero pouch, not a torus');
    assert.ok(volume > .001 && volume < .03, 'finite outward-facing solid with bounded volume');
  }
});

test('every pouch intersects the anterior midgut without adding ventral protrusion beyond existing gut geometry', () => {
  const f = fixture(), midgut = f.parts.find(p => p.id === 'midgut').mesh;
  const body = f.parts.find(p => p.id === 'exoskeleton').mesh;
  const bodyBounds = body.geometry.boundingBox.clone().applyMatrix4(body.matrixWorld);
  const gutBounds = new THREE.Box3();
  for (const id of ['midgut', 'gizzard']) {
    const mesh = f.parts.find(p => p.id === id).mesh;
    gutBounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
  }
  const ray = new THREE.Raycaster();
  const surfaceDistance = point => {
    // The shipped midgut is straight here. Intersect its rendered polygonal
    // wall, rather than assuming the declared TubeGeometry radius is exact.
    if (point.z <= -1.89 || point.z >= -.101) return null;
    const centre = new THREE.Vector3(0, -.04, point.z);
    const radial = point.clone().sub(centre).normalize();
    ray.set(centre.clone().addScaledVector(radial, 2), radial.clone().negate());
    const hit = ray.intersectObject(midgut, false)[0];
    assert.ok(hit, 'midgut wall is present beside this root');
    return point.distanceTo(centre) - hit.point.distanceTo(centre);
  };
  const quadrants = new Set();
  for (const pouch of components(f.mesh.geometry)) {
    const signed = new Map();
    for (const index of pouch.vertices) {
      const point = vertex(f.mesh, index);
      assert.ok(point.x >= bodyBounds.min.x && point.x <= bodyBounds.max.x
        && point.z >= bodyBounds.min.z && point.z <= bodyBounds.max.z && point.y <= bodyBounds.max.y,
      `pouch stays within abdominal width/length and below its dorsal roof: ${point.toArray()}`);
      // The pre-existing midgut/gizzard already extend below the simplified
      // procedural ventral shell. Do not hide that limitation with a tolerance
      // or claim full cavity enclosure; prevent this correction worsening it.
      assert.ok(point.y >= gutBounds.min.y, `pouch does not protrude below existing gut: ${point.y}`);
      const distance = surfaceDistance(point);
      if (distance !== null) signed.set(index, distance);
    }
    const roots = [...signed].filter(([, distance]) => distance < -.005);
    assert.ok(roots.length > 0, 'a root is embedded inside the actual midgut wall');
    assert.ok(pouch.triangles.some(triangle => triangle.some(i => signed.get(i) < -.005)
      && triangle.some(i => signed.get(i) > .005)), 'actual pouch faces cross the midgut surface; no floating gap');
    const attachment = vertex(f.mesh, roots[0][0]);
    assert.ok(attachment.z > -.3 && attachment.z < -.1, 'attachment is at the anterior midgut, not hindgut');
    quadrants.add(`${Math.sign(attachment.x)}:${Math.sign(attachment.y + .04)}`);
    assert.ok(distalCentre(f.mesh, pouch).z > attachment.z + .3, 'blind tip extends away from the embedded root');
  }
  assert.equal(quadrants.size, 4, 'roots surround the gut in the transverse XY plane');
});

test('each distal pouch is selectable through the production nonrecursive Mesh raycast', () => {
  const { mesh } = fixture(), ray = new THREE.Raycaster();
  for (const pouch of components(mesh.geometry)) {
    const centre = distalCentre(mesh, pouch);
    const radial = new THREE.Vector3(centre.x, centre.y + .04, 0).normalize();
    ray.set(centre.clone().addScaledVector(radial, 2), radial.clone().negate());
    const hit = ray.intersectObject(mesh, false)[0];
    assert.ok(hit && hit.object === mesh, 'real merged pouch surface is a direct pick target');
    assert.ok(pouch.vertices.has(hit.face.a), 'ray hits this pouch, not a carrier ring or neighboring pouch');
    assert.ok(hit.point.z > .2, 'probe reaches a distal finger, beyond the former ring');
  }
});

test('real probe, scalpel and forceps work on pouch surfaces without child remnants', () => {
  const f = fixture(), scene = new THREE.Scene(), events = [];
  scene.add(f.group);
  // Intentional isolated exposed-organ fixture: accessibility through other
  // organs and the whole cutting procedure are covered by browser interaction QA.
  for (const part of f.parts) part.mesh.visible = part === f.caeca;
  const pouch = components(f.mesh.geometry)[0], centre = distalCentre(f.mesh, pouch);
  const radial = new THREE.Vector3(centre.x, centre.y + .04, 0).normalize();
  const camera = new THREE.OrthographicCamera(-4, 4, 4, -4, .1, 50);
  camera.up.set(0, 0, 1); camera.position.copy(centre).addScaledVector(radial, 10); camera.lookAt(centre); camera.updateMatrixWorld();
  const api = createDissection(THREE, { ...f, scene, camera, requiresPinning: false, onEvent: e => events.push(e) });
  api.state.maxLayerRevealed = 2;
  const act = (x, gripping, y = .5) => {
    scene.updateMatrixWorld(true); api.update({ x, y, gripping, grip: gripping ? .7 : 0, span: 0 }, 16);
  };
  const savedGeometry = f.mesh.geometry, saved = savedGeometry.attributes.position.array.slice();
  const originalBounds = new THREE.Box3().setFromObject(f.mesh, true);
  try {
    assert.equal(api.pick(.5, .5)?.object, f.mesh);
    act(.5, true); act(.5, false);
    assert.ok(events.some(e => e.kind === 'discover' && e.partId === 'gastric-caeca'));
    // Find a contiguous stroke on one actual pouch, not a line bridging the
    // empty spaces between independently closed fingers.
    let run = [], longest = [];
    for (let i = 0; i <= 100; i++) {
      const y = .35 + i * .003, hit = api.pick(.5, y);
      if (hit?.object === f.mesh && pouch.vertices.has(hit.face.a)) {
        run.push(y); if (run.length > longest.length) longest = run.slice();
      } else run = [];
    }
    assert.ok(longest.length >= 5, 'one pouch provides a real contiguous scalpel path');
    api.setTool('scalpel');
    act(.5, false, longest[0]);
    for (const y of longest) act(.5, true, y);
    act(.5, false, longest.at(-1));
    assert.ok(api.state.incisions.get('gastric-caeca')?.points.length >= 3);
    assert.ok(events.some(e => e.kind === 'incise' && e.partId === 'gastric-caeca' && !e.meta.refused));
    assert.ok(api.undo()); assert.equal(api.state.incisions.has('gastric-caeca'), false);
    act(.5, false); // Undo requires a neutral input before a new gesture.
    api.setTool('forceps'); act(.5, true); act(.96, true); act(.96, false);
    assert.ok(api.state.removed.has('gastric-caeca'));
    assert.ok(events.some(e => e.kind === 'lift' && e.partId === 'gastric-caeca'));
    assert.equal(f.mesh.geometry, savedGeometry);
    assert.deepEqual(f.mesh.geometry.attributes.position.array, saved, 'lifting never deforms or loses a pouch');
    scene.updateMatrixWorld(true);
    assert.ok(!new THREE.Box3().setFromObject(f.mesh, true).intersectsBox(originalBounds), 'all eight pouches leave the cavity together');
    assert.notEqual(api.pick(.5, .5)?.object, f.mesh, 'removed tissue is no longer a dissection pick shield');
    assert.equal(f.mesh.children.length, 0, 'no carrier or detached child remnant remains');
    assert.ok(api.undo());
    assert.equal(api.state.removed.has('gastric-caeca'), false);
    assert.deepEqual(f.mesh.position.toArray(), [0, 0, 0]);
    assert.equal(api.pick(.5, .5)?.object, f.mesh);
    assert.equal(components(f.mesh.geometry).length, 8);
  } finally { api.dispose(); }
});
