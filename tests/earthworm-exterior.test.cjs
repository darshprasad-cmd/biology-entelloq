/* Actual offline Three geometry checks. No renderer, browser or camera required.
   These establish continuity/contracts, not photorealism or anatomical validation. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { before, test } = require('node:test');
const root = path.resolve(__dirname, '..');
let THREE, context;

before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  context = vm.createContext({ THREE });
  for (const name of ['anatomy', 'earthworm']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8').replace(/\bexport\s+/g, ''), context, { filename: name + '.js' });
  }
});
function build() {
  const spec = context.buildEarthworm(THREE);
  spec.group.updateMatrixWorld(true);
  return spec;
}
const part = (s, id) => s.parts.find(p => p.id === id);
function internalHash(spec) {
  const hash = crypto.createHash('sha256');
  for (const p of spec.parts.filter(p => p.layer > 0)) {
    hash.update(JSON.stringify([p.id, p.layer, p.system, p.cuttable, p.detachable,
      p.mesh.position.toArray(), p.mesh.quaternion.toArray(), p.mesh.scale.toArray()]));
    p.mesh.traverse(m => {
      if (!m.geometry) return;
      for (const key of Object.keys(m.geometry.attributes).sort()) hash.update(Buffer.from(m.geometry.attributes[key].array.buffer));
      if (m.geometry.index) hash.update(Buffer.from(m.geometry.index.array.buffer));
      hash.update(JSON.stringify([m.position.toArray(), m.quaternion.toArray(), m.scale.toArray()]));
    });
  }
  return hash.digest('hex');
}
function ringPoints(mesh, row) {
  const g = mesh.geometry, width = g.parameters.radialSegments + 1;
  return Array.from({ length: width - 1 }, (_, i) => new THREE.Vector3()
    .fromBufferAttribute(g.attributes.position, row * width + i).applyMatrix4(mesh.matrixWorld));
}
function radiusAt(mesh, z) {
  const hit = new THREE.Raycaster(new THREE.Vector3(0, 2, z), new THREE.Vector3(0, -1, 0)).intersectObject(mesh, false)[0];
  return hit ? hit.point.y : null;
}

test('all internal geometry, child transforms and part contracts remain byte-identical', () => {
  // Captured from the accepted pre-exterior builder, with the shipped Three runtime.
  assert.equal(internalHash(build()), 'd0d0e49cf48e8cb9f545e184fe1fbe97e8da1361dd7953c5a500cac46d4955d3');
});

test('external IDs, pin anchors, incision and straight resting pose survive', () => {
  const spec = build();
  assert.deepEqual(spec.group.position.toArray(), [0, 0, 0]);
  assert.deepEqual(spec.group.quaternion.toArray(), [0, 0, 0, 1]);
  const expected = { 'body-wall': [0, 0, 0], prostomium: [0, 0.06, 7.15], clitellum: [0, 0, 2.6], 'anal-segment': [0, 0, -6.95] };
  for (const [id, anchor] of Object.entries(expected)) {
    const p = part(spec, id);
    assert.equal(p.mesh.userData.partId, id); assert.equal(p.layer, 0);
    assert.equal(p.cuttable, id === 'body-wall'); assert.equal(p.detachable, false);
    assert.deepEqual(p.mesh.position.toArray(), anchor);
    assert.deepEqual(p.mesh.scale.toArray(), [1, 1, 1]);
  }
  assert.equal(part(spec, 'prostomium').mesh.rotation.x, 0.25);
  assert.deepEqual(JSON.parse(JSON.stringify(part(spec, 'body-wall').incision)),
    [[-0.16, 0.5, 1.6], [-0.16, 0.52, -0.2], [-0.15, 0.5, -2.6], [-0.14, 0.47, -4.6], [-0.12, 0.42, -6.2]]);
  assert.equal(vm.runInContext('SPECIMENS.earthworm.requiresPinning', context), true);
});

test('segment rows remain closed and level, with subdued radius variation', () => {
  const mesh = part(build(), 'body-wall').mesh, g = mesh.geometry;
  let previous = null, maxStep = 0, peaks = 0, previousDelta = 0;
  for (let row = 0; row <= g.parameters.heightSegments; row++) {
    const ring = ringPoints(mesh, row), z = ring[0].z;
    assert.ok(ring.every(v => Math.abs(v.z - z) < 1e-7), 'no axial noise within a segment');
    const meanX = ring.reduce((sum, v) => sum + v.x, 0) / ring.length;
    const meanY = ring.reduce((sum, v) => sum + v.y, 0) / ring.length;
    assert.ok(Math.abs(meanX) < 1e-7 && Math.abs(meanY) < 1e-7, 'unchanged straight centreline');
    if (z < -4.5 || z > 1.8) { previous = null; continue; }
    const radius = ring.reduce((sum, v) => sum + Math.hypot(v.x, v.y), 0) / ring.length;
    if (previous !== null) {
      const delta = radius - previous;
      maxStep = Math.max(maxStep, Math.abs(delta));
      if (previousDelta > 0 && delta <= 0) peaks++;
      previousDelta = delta;
    }
    previous = radius;
  }
  assert.ok(maxStep < 0.012, 'fine segment furrows, not deep corrugated ridges: ' + maxStep);
  assert.ok(peaks >= 14, 'real geometric annulation is retained');
});

test('terminal joins and clitellar sleeve edges are seated inside the body all around', () => {
  const spec = build(), body = part(spec, 'body-wall').mesh;
  for (const [id, rows] of [['prostomium', [24]], ['anal-segment', [0]], ['clitellum', [0, 40]]]) {
    const mesh = part(spec, id).mesh;
    for (const row of rows) for (const v of ringPoints(mesh, row)) {
      const normal = new THREE.Vector3(v.x, v.y, 0).normalize();
      const origin = new THREE.Vector3(0, 0, v.z).addScaledVector(normal, 2);
      const hit = new THREE.Raycaster(origin, normal.clone().negate()).intersectObject(body, false)[0];
      assert.ok(hit, id + ': body covers the join ring');
      assert.ok(Math.hypot(hit.point.x, hit.point.y) > Math.hypot(v.x, v.y), id + ': entire open edge buried');
    }
  }
});

test('mouth and tail taper continuously with no detached terminal bulbs', () => {
  const spec = build(), body = part(spec, 'body-wall').mesh;
  for (const [id, from, to] of [['prostomium', 6.35, 7.34], ['anal-segment', -6.35, -7.28]]) {
    const end = part(spec, id).mesh;
    let previous = Infinity;
    for (let i = 0; i <= 45; i++) {
      const z = from + (to - from) * i / 45;
      const heights = [radiusAt(body, z), radiusAt(end, z)].filter(v => v !== null);
      assert.ok(heights.length, id + ': no axial gap at ' + z);
      const radius = Math.max(...heights);
      assert.ok(radius <= previous + 0.009, id + ': no bulb after a pinched neck');
      previous = radius;
    }
    assert.ok(previous < 0.11, id + ': restrained terminal radius');
  }
});

test('clitellum is a close-fitting band with a continuous shoulder, not a sphere', () => {
  const spec = build(), body = part(spec, 'body-wall').mesh, band = part(spec, 'clitellum').mesh;
  const middle = radiusAt(band, 2.6), adjacent = radiusAt(body, 1.9);
  assert.ok(middle > adjacent && middle / adjacent < 1.14);
  assert.ok(middle - radiusAt(body, 2.6) < 0.025, 'band remains close to shared body profile');
  const bounds = new THREE.Box3().setFromObject(band, true);
  assert.ok(bounds.max.z - bounds.min.z > 1.3, 'girdle extends longitudinally');
});

test('all four outer pieces use the same low-transmission vertex-coloured cuticle optics', () => {
  const spec = build(), materials = new Set();
  const optics = m => [m.color.getHex(), m.roughness, m.clearcoat, m.clearcoatRoughness,
    m.sheen, m.sheenColor.getHex(), m.transmission, m.thickness, m.attenuationColor.getHex(), m.attenuationDistance];
  const body = part(spec, 'body-wall').mesh.material;
  for (const id of ['body-wall', 'prostomium', 'clitellum', 'anal-segment']) {
    const mesh = part(spec, id).mesh, m = mesh.material;
    assert.ok(m.vertexColors && mesh.geometry.attributes.color, id + ': no flat colour cap');
    assert.equal(m.color.getHex(), 0xffffff, id + ': pigment is in vertices, not a second multiplier');
    assert.equal(m.opacity, 1); assert.equal(m.transmission, 0.03);
    assert.deepEqual(optics(m), optics(body), id + ': no discontinuous optics at joins');
    materials.add(m);
  }
  assert.equal(materials.size, 4, 'selection/damage must not mutate another part through shared material');
});

test('cap and clitellum pigments match the body at the same axial position', () => {
  const spec = build(), body = part(spec, 'body-wall').mesh, bg = body.geometry;
  const width = bg.parameters.radialSegments + 1, bc = bg.attributes.color;
  let compared = 0;
  for (const id of ['prostomium', 'clitellum', 'anal-segment']) {
    const mesh = part(spec, id).mesh, g = mesh.geometry, colors = g.attributes.color;
    for (let row = 0; row <= g.parameters.heightSegments; row++) {
      const z = ringPoints(mesh, row)[0].z;
      if (z < -7 || z > 7) continue;
      const bodyRow = (7 - z) / 14 * bg.parameters.heightSegments;
      const a = Math.max(0, Math.min(bg.parameters.heightSegments, Math.floor(bodyRow)));
      const b = Math.min(bg.parameters.heightSegments, a + 1), mix = bodyRow - a;
      for (let column = 0; column < width - 1; column++) for (let channel = 0; channel < 3; channel++) {
        const expected = bc.array[(a * width + column) * 3 + channel] * (1 - mix)
          + bc.array[(b * width + column) * 3 + channel] * mix;
        assert.ok(Math.abs(colors.array[(row * width + column) * 3 + channel] - expected) < 0.006,
          id + ': matching pigment at z=' + z);
        compared++;
      }
    }
  }
  assert.ok(compared > 5000, 'compare full shared circumference, not one favourable seam pixel');
});

test('new exterior has finite bounds, normals, UVs and a bounded triangle budget', () => {
  const spec = build();
  let triangles = 0;
  for (const p of spec.parts.filter(p => p.layer === 0)) p.mesh.traverse(m => {
    if (!m.geometry) return;
    const g = m.geometry;
    for (const a of Object.values(g.attributes)) assert.ok(a.array.every(Number.isFinite), p.id);
    g.computeBoundingBox(); g.computeBoundingSphere();
    assert.ok(Number.isFinite(g.boundingSphere.radius) && g.boundingSphere.radius > 0);
    assert.ok(g.boundingBox.min.toArray().concat(g.boundingBox.max.toArray()).every(Number.isFinite));
    triangles += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  });
  assert.ok(triangles < 27000, 'exterior remains under 27k triangles: ' + triangles);
});
