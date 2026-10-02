/* Actual procedural geometry and dissection-engine regressions, in illustrative
 * model units. These tests are not species validation, a continuous-lumen
 * simulation, full access-procedure coverage, or webcam-tracking evidence. */
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
  const part = id => specimen.parts.find(p => p.id === id);
  return { ...specimen, part, mesh: part('midgut').mesh };
}
const vertices = mesh => Array.from({ length: mesh.geometry.attributes.position.count }, (_, i) =>
  new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld));
const samples = (mesh, n = 800) => mesh.geometry.parameters.path.getSpacedPoints(n)
  .map(p => p.applyMatrix4(mesh.matrixWorld));
const bounds = mesh => mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
function nearestDistance(points, point) {
  let nearest = Infinity;
  for (const p of points) nearest = Math.min(nearest, p.distanceTo(point));
  return nearest;
}

test('midgut remains one connected selectable tube with the existing tool contract', () => {
  const f = fixture(), midgut = f.part('midgut'), g = f.mesh.geometry;
  assert.equal(f.parts.length, 27);
  assert.equal(new Set(f.parts.map(p => p.id)).size, 27);
  const { id, name, layer, system, cuttable, detachable } = midgut;
  assert.deepEqual({ id, name, layer, system, cuttable, detachable }, {
    id: 'midgut', name: 'Midgut (mesenteron)', layer: 2, system: 'digestive', cuttable: true, detachable: false,
  });
  assert.equal(f.mesh.userData.partId, 'midgut');
  assert.equal(f.mesh.visible, false);
  assert.equal(f.mesh.children.length, 0);
  assert.ok(f.mesh.isMesh);
  for (const attribute of Object.values(g.attributes)) assert.ok(attribute.array.every(Number.isFinite));
  const p = vertices(f.mesh), adjacency = p.map(() => new Set());
  for (let i = 0; i < g.index.count; i += 3) {
    const ids = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
    for (const index of ids) assert.ok(Number.isInteger(index) && index >= 0 && index < p.length);
    const [a, b, c] = ids;
    assert.ok(p[b].clone().sub(p[a]).cross(p[c].clone().sub(p[a])).lengthSq() > 1e-12,
      'finite nondegenerate wall triangles');
    for (const [u, v] of [[a, b], [b, c], [c, a]]) { adjacency[u].add(v); adjacency[v].add(u); }
  }
  const seen = new Set([0]), queue = [0];
  while (queue.length) for (const n of adjacency[queue.pop()]) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  assert.equal(seen.size, p.length, 'all rendered tube vertices belong to one connected wall');
  // Validate the actual rings against their construction curve so the following
  // curve measurements cannot pass with an unrelated decorative mesh.
  const { tubularSegments: rings, radialSegments: sides, radius, path: curve } = g.parameters;
  assert.ok(Number.isInteger(rings) && rings >= 2 && Number.isInteger(sides) && sides >= 3);
  assert.equal(p.length, (rings + 1) * (sides + 1));
  let largestRadius = 0;
  for (let i = 0; i <= rings; i++) {
    const centre = curve.getPointAt(i / rings).applyMatrix4(f.mesh.matrixWorld);
    const distances = p.slice(i * (sides + 1), (i + 1) * (sides + 1)).map(v => v.distanceTo(centre));
    const ringRadius = distances.reduce((sum, r) => sum + r, 0) / distances.length;
    assert.ok(ringRadius > 0 && ringRadius <= radius + 1e-6, 'positive ring radius within original tube envelope');
    for (const distance of distances) assert.ok(Math.abs(distance - ringRadius) < 1e-6, 'each rendered ring remains circular about its real path');
    largestRadius = Math.max(largestRadius, ringRadius);
  }
  assert.ok(Math.abs(largestRadius - radius) < 1e-6, 'tapering the outlet must not shrink the entire organ');
});

test('route turns right, returns anteriorly, descends ventrally and returns to the posterior midline', () => {
  const f = fixture(), points = samples(f.mesh), radius = f.mesh.geometry.parameters.radius;
  let posteriorTurn = 0;
  for (let i = 1; i < points.length; i++) if (points[i].z < points[posteriorTurn].z) posteriorTurn = i;
  assert.ok(posteriorTurn > 0 && posteriorTurn < points.length - 2);
  assert.ok(points[posteriorTurn].x > radius * 2, 'first loop is right of the midline, not a straight gut or left mirror');
  let anteriorReturn = posteriorTurn;
  for (let i = posteriorTurn; i < points.length; i++) if (points[i].z > points[anteriorReturn].z) anteriorReturn = i;
  assert.ok(points[anteriorReturn].z - points[posteriorTurn].z > radius * 4,
    'a genuine anterior return, not a tiny wiggle');
  const ventralReturn = points.slice(anteriorReturn).reduce((lowest, p) => p.y < lowest.y ? p : lowest);
  assert.ok(ventralReturn.y < points[posteriorTurn].y - radius / 2, 'return moves ventrally');
  assert.ok(points.at(-1).y > ventralReturn.y + .01, 'outlet rises dorsally after the ventral turn');
  assert.ok(points.at(-1).z < points[anteriorReturn].z - radius * 2, 'outlet turns posterior again');
  assert.ok(Math.abs(points.at(-1).x) < radius / 2, 'outlet returns to the ileum midline');
  assert.ok(points.at(-1).distanceTo(points[0]) < f.mesh.geometry.parameters.path.getLength() / 2,
    'the route has substantial folded length rather than simply elongating a straight tube');
});

test('midgut has no collapsed inner bend or nonlocal self-intersection', () => {
  const f = fixture(), points = samples(f.mesh), radius = f.mesh.geometry.parameters.radius;
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances.at(-1) + points[i].distanceTo(points[i - 1]));
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i].distanceTo(points[i - 1]), b = points[i + 1].distanceTo(points[i]);
    const c = points[i + 1].distanceTo(points[i - 1]);
    const cross = points[i].clone().sub(points[i - 1]).cross(points[i + 1].clone().sub(points[i - 1])).length();
    const bendRadius = cross > 1e-12 ? a * b * c / (2 * cross) : Infinity;
    assert.ok(bendRadius > radius, `local bend radius ${bendRadius} must exceed tube radius ${radius} near ${points[i].toArray()}`);
  }
  // Neighbouring cross-sections overlap by construction. Beyond half the
  // circumference of a radius-sized bend, distant tube runs must be separated
  // by at least their combined radii. Dense arc-length samples avoid knot bias.
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
    if (distances[j] - distances[i] <= Math.PI * radius) continue;
    assert.ok(points[i].distanceTo(points[j]) >= 2 * radius - 1e-5,
      `nonlocal tube runs overlap near samples ${i}, ${j}`);
  }
});

test('loop clears the nerve cord, dorsal vessel and both longitudinal tracheal trunks', () => {
  const f = fixture(), points = samples(f.mesh), radius = f.mesh.geometry.parameters.radius;
  const trachea = f.part('tracheae').mesh;
  for (const mesh of [f.part('nerve-cord').mesh, f.part('dorsal-heart').mesh]) {
    const neighbour = samples(mesh), required = radius + mesh.geometry.parameters.radius;
    const clearance = points.reduce((best, p) => Math.min(best, nearestDistance(neighbour, p)), Infinity);
    assert.ok(clearance >= required, `${mesh.userData.partId}: centreline distance ${clearance} < combined radii ${required}`);
  }
  // Both trunks now live in one selectable mesh. Derive their conservative
  // cylindrical envelopes from actual indexed components/vertices, not stale
  // TubeGeometry parameters or implementation-only curve metadata.
  const g = trachea.geometry, adjacency = Array.from({ length: g.attributes.position.count }, () => new Set());
  for (let i = 0; i < g.index.count; i += 3) {
    const [a, b, c] = [g.index.getX(i), g.index.getX(i + 1), g.index.getX(i + 2)];
    for (const [u, v] of [[a, b], [b, c], [c, a]]) { adjacency[u].add(v); adjacency[v].add(u); }
  }
  const seen = new Set(), trunks = [];
  for (let start = 0; start < adjacency.length; start++) {
    if (seen.has(start)) continue;
    const indices = [], queue = [start]; seen.add(start);
    while (queue.length) {
      const index = queue.pop(); indices.push(index);
      for (const next of adjacency[index]) if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
    const surface = indices.map(i => new THREE.Vector3().fromBufferAttribute(g.attributes.position, i).applyMatrix4(trachea.matrixWorld));
    const box = new THREE.Box3().setFromPoints(surface);
    if (box.max.z - box.min.z > 5) trunks.push({ surface, box });
  }
  assert.equal(trunks.length, 2, 'both real longitudinal components still exist');
  for (const { surface, box } of trunks) {
    // Six-sided tubes have symmetric opposite vertices; their XY bounds locate
    // the actual axis. The maximum radial vertex distance encloses every wall
    // triangle, so clearing this cylinder also clears the real polygonal tube.
    const centre = box.getCenter(new THREE.Vector3());
    assert.ok(box.max.x - box.min.x < .1 && box.max.y - box.min.y < .1);
    const envelopeRadius = Math.max(...surface.map(p => Math.hypot(p.x - centre.x, p.y - centre.y)));
    const axis = new THREE.Line3(new THREE.Vector3(centre.x, centre.y, box.min.z), new THREE.Vector3(centre.x, centre.y, box.max.z));
    const projected = new THREE.Vector3();
    const clearance = points.reduce((best, p) => Math.min(best, axis.closestPointToPoint(p, true, projected).distanceTo(p)), Infinity);
    assert.ok(clearance >= radius + envelopeRadius,
      `tracheal wall at x=${centre.x}: clearance ${clearance} < combined envelope radii ${radius + envelopeRadius}`);
  }
});

test('surface endpoints overlap adjacent gut regions, and the loop stays inside existing width and depth limits', () => {
  const f = fixture(), points = samples(f.mesh), giz = f.part('gizzard').mesh, hindgut = f.part('hindgut').mesh;
  const bodyBounds = bounds(f.part('exoskeleton').mesh), gutFloor = Math.min(bounds(giz).min.y, bounds(hindgut).min.y);
  const meshBounds = bounds(f.mesh);
  assert.ok(meshBounds.min.x >= bodyBounds.min.x && meshBounds.max.x <= bodyBounds.max.x);
  assert.ok(meshBounds.min.z >= bodyBounds.min.z && meshBounds.max.z <= bodyBounds.max.z);
  assert.ok(meshBounds.max.y <= bodyBounds.max.y, 'tube remains below the existing dorsal roof');
  assert.ok(meshBounds.min.y >= gutFloor, 'does not worsen the existing gut floor; full cavity enclosure is not claimed');
  // Test the actual irregular gizzard surface along rays from outside its
  // centre. The inlet must be inside that wall, not merely near its bounds.
  const centre = giz.getWorldPosition(new THREE.Vector3()), ray = new THREE.Raycaster();
  const inletDirection = points[0].clone().sub(centre).normalize();
  ray.set(centre.clone().addScaledVector(inletDirection, 2), inletDirection.clone().negate());
  const surface = ray.intersectObject(giz, false)[0];
  assert.ok(surface && points[0].distanceTo(centre) < surface.point.distanceTo(centre), 'inlet penetrates the actual gizzard surface');
  const inletRing = vertices(f.mesh).slice(0, f.mesh.geometry.parameters.radialSegments);
  const embedded = inletRing.filter(p => {
    const radial = p.clone().sub(centre).normalize();
    ray.set(centre.clone().addScaledVector(radial, 2), radial.clone().negate());
    const hit = ray.intersectObject(giz, false)[0];
    return hit && p.distanceTo(centre) < hit.point.distanceTo(centre);
  });
  assert.ok(embedded.length >= inletRing.length / 2, 'a substantial inlet rim enters the gizzard, not a point contact');
  const hindPoints = samples(hindgut), outlet = points.at(-1), inlet = hindPoints[0];
  assert.ok(nearestDistance(hindPoints, outlet) < hindgut.geometry.parameters.radius / 2, 'outlet is embedded in hindgut');
  assert.ok(outlet.z < inlet.z, 'actual longitudinal overlap closes the former end gap');
  assert.ok(meshBounds.intersectsBox(bounds(hindgut)), 'rendered walls reach the hindgut region');
});

test('every rendered outlet-rim vertex is inside the actual hindgut wall and beyond its inlet', () => {
  const f = fixture(), hindgut = f.part('hindgut').mesh;
  const hindPoints = samples(hindgut), inlet = hindPoints[0];
  const direction = hindPoints[1].clone().sub(inlet).normalize();
  const { tubularSegments: rings, radialSegments: sides } = f.mesh.geometry.parameters;
  const rim = vertices(f.mesh).slice(rings * (sides + 1));
  const ray = new THREE.Raycaster(), projected = new THREE.Vector3();
  assert.equal(rim.length, sides + 1);
  for (const p of rim) {
    assert.ok(p.clone().sub(inlet).dot(direction) > 0, 'all of the rim passes beyond the open hindgut inlet plane');
    // Find a nearby centre on the actual parent curve, then intersect the
    // rendered polygonal wall. Comparing declared radii or bounding boxes can
    // miss an exposed rim on an oblique, mismatched-radius junction.
    let nearest = Infinity, centre;
    for (let i = 1; i < hindPoints.length; i++) {
      new THREE.Line3(hindPoints[i - 1], hindPoints[i]).closestPointToPoint(p, true, projected);
      const distance = projected.distanceToSquared(p);
      if (distance < nearest) { nearest = distance; centre = projected.clone(); }
    }
    const radial = p.clone().sub(centre).normalize();
    ray.set(centre.clone().addScaledVector(radial, 2), radial.clone().negate());
    const hit = ray.intersectObject(hindgut, false)[0];
    assert.ok(hit && p.distanceTo(centre) < hit.point.distanceTo(centre) - 1e-4,
      `distal rim must sit inside the actual polygonal hindgut wall, not remain exposed at ${p.toArray()}`);
  }
});

test('the complementary hindgut inlet rim is buried inside the actual midgut wall', () => {
  const f = fixture(), hindgut = f.part('hindgut').mesh;
  const midPoints = samples(f.mesh), ray = new THREE.Raycaster(), projected = new THREE.Vector3();
  const rim = vertices(hindgut).slice(0, hindgut.geometry.parameters.radialSegments + 1);
  const material = f.mesh.material.clone(); material.side = THREE.DoubleSide;
  const wallMesh = new THREE.Mesh(f.mesh.geometry, material);
  wallMesh.matrixWorld.copy(f.mesh.matrixWorld);
  try {
    for (const p of rim) {
      let nearest = Infinity, centre;
      for (let i = 1; i < midPoints.length; i++) {
        new THREE.Line3(midPoints[i - 1], midPoints[i]).closestPointToPoint(p, true, projected);
        const distance = projected.distanceToSquared(p);
        if (distance < nearest) { nearest = distance; centre = projected.clone(); }
      }
      const radial = p.clone().sub(centre).normalize();
      // Trace outwards from inside the local tube, with a test-only two-sided
      // material. The first wall hit is the local boundary, not a different
      // loop encountered by an outside-in ray. Production material is untouched.
      ray.set(centre, radial);
      const wall = ray.intersectObject(wallMesh, false)[0];
      assert.ok(wall && p.distanceTo(centre) < wall.distance - 1e-4,
        `hindgut inlet rim must be hidden inside the midgut wall, not protrude at ${p.toArray()}`);
    }
  } finally { material.dispose(); }
});

test('real probe and scalpel can use the curved surface, with undo restoring the intact mesh', () => {
  const f = fixture(), scene = new THREE.Scene(), events = [];
  scene.add(f.group);
  // Explicit isolated exposed-organ diagnostic. Full layer access, viewports
  // and rendered specimens are checked independently by browser QA.
  for (const part of f.parts) part.mesh.visible = part.id === 'midgut';
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, .1, 30);
  camera.up.set(0, 0, 1); camera.position.set(0, 10, -1.5); camera.lookAt(0, 0, -1.5); camera.updateMatrixWorld();
  const api = createDissection(THREE, { ...f, scene, camera, requiresPinning: false, onEvent: e => events.push(e) });
  api.state.maxLayerRevealed = 2;
  const input = (p, gripping) => {
    const ndc = p.clone().project(camera);
    scene.updateMatrixWorld(true);
    api.update({ x: (ndc.x + 1) / 2, y: (1 - ndc.y) / 2, gripping, grip: gripping ? .6 : 0, span: 0 }, 16);
  };
  const route = samples(f.mesh, 160), saved = f.mesh.geometry.attributes.position.array.slice();
  const savedPosition = f.mesh.position.clone();
  try {
    // Select a continuous centreline run on the right flank, far enough apart
    // for the engine's real stroke-distance threshold. No state incisions are
    // fabricated, and projected rays must hit the actual curved surface.
    const run = route.filter(p => p.x > .65 && p.z < -1.2 && p.z > -2.4).slice(0, 20);
    assert.ok(run.length >= 5, 'substantial right-flank tool target');
    for (const point of run) {
      const ndc = point.clone().project(camera);
      assert.equal(api.pick((ndc.x + 1) / 2, (1 - ndc.y) / 2)?.object, f.mesh);
    }
    input(run[0], true); input(run[0], false);
    assert.ok(events.some(e => e.kind === 'discover' && e.partId === 'midgut'));
    api.setTool('forceps');
    input(run[0], true); input(run[0].clone().add(new THREE.Vector3(4, 0, 0)), true);
    input(run[0], false);
    assert.equal(api.state.removed.has('midgut'), false, 'intact non-detachable midgut cannot be lifted free');
    assert.deepEqual(f.mesh.position.toArray(), savedPosition.toArray());
    api.setTool('scalpel');
    for (const point of run) input(point, true);
    input(run.at(-1), false);
    assert.ok(api.state.incisions.get('midgut')?.points.length >= 3);
    assert.ok(events.some(e => e.kind === 'incise' && e.partId === 'midgut' && !e.meta.refused));
    assert.ok(api.undo());
    assert.equal(api.state.incisions.has('midgut'), false);
    assert.equal(api.state.removed.has('midgut'), false);
    assert.deepEqual(f.mesh.geometry.attributes.position.array, saved);
    assert.deepEqual(f.mesh.position.toArray(), savedPosition.toArray());
  } finally { api.dispose(); }
});
