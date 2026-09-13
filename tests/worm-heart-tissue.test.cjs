/* Real offline Three geometry/material and soft-body integration checks.
 * These are not claims of photographic equivalence or anatomical validation. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { before, test } = require('node:test');
const root = path.resolve(__dirname, '..');
let THREE, context;
before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  context = vm.createContext({ THREE });
  for (const name of ['anatomy', 'earthworm', 'heart', 'softbody', 'surface'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8').replace(/^export\s+/gm, ''), context, { filename: name + '.js' });
});
const find = (s, id) => s.parts.find(p => p.id === id);

test('worm annuli have nonuniform spacing without moving the centreline or internal anatomy', () => {
  const s = context.buildEarthworm(THREE), mesh = find(s, 'body-wall').mesh;
  const g = mesh.geometry, p = g.attributes.position, stride = g.parameters.radialSegments + 1;
  const rows = [];
  for (let row = 0; row <= g.parameters.heightSegments; row++) {
    const z = p.getZ(row * stride);
    if (z < -4.8 || z > 1.7) continue;
    let radius = 0;
    for (let col = 0; col < stride - 1; col++) radius += Math.hypot(p.getX(row * stride + col), p.getY(row * stride + col));
    rows.push({ z, radius: radius / (stride - 1) });
  }
  const troughs = rows.filter((r, i) => i && i < rows.length - 1 && r.radius < rows[i - 1].radius && r.radius <= rows[i + 1].radius);
  assert.ok(troughs.length >= 15, 'actual shallow annular troughs remain in the cuttable geometry');
  const gaps = troughs.slice(1).map((r, i) => Math.abs(r.z - troughs[i].z));
  assert.ok(Math.max(...gaps) - Math.min(...gaps) > 0.045, 'segment spacing is no longer a perfect periodic cylinder');
  assert.deepEqual(find(s, 'pharynx').mesh.position.toArray(), [0, -0.02, 6]);
  assert.deepEqual(find(s, 'gizzard').mesh.position.toArray(), [0, -0.02, 3.85]);
});

test('worm wall now participates in the existing tissue press and recovers its exact rest geometry', () => {
  const s = context.buildEarthworm(THREE), wall = find(s, 'body-wall').mesh;
  s.group.updateMatrixWorld(true);
  const position = wall.geometry.attributes.position, rest = position.array.slice();
  assert.equal(position.count, 8745);
  const soft = context.createSoftBody(THREE, s.parts);
  soft.press('body-wall', new THREE.Vector3(0, 0.55, 0), 0.65, 0.65);
  for (let i = 0; i < 24; i++) soft.update(16);
  assert.equal(wall.geometry.attributes.position, position, 'no buffer replacement underneath cutting');
  const displacement = position.array.reduce((max, x, i) => Math.max(max, Math.abs(x - rest[i])), 0);
  assert.ok(displacement > 0.035 && displacement < 0.25, 'bounded visible tissue response: ' + displacement);
  assert.ok(position.array.every(Number.isFinite));
  soft.release('body-wall');
  for (let i = 0; i < 400; i++) soft.update(16);
  assert.deepEqual(position.array, rest, 'the pinned rest shape is restored on release');
  soft.dispose();
});

test('heart pigment is deterministic, spatially varied and attached only to the existing exterior tissue roots', () => {
  const a = context.buildHeart(THREE), b = context.buildHeart(THREE);
  const ids = ['lv-free-wall', 'rv-free-wall', 'right-atrium', 'left-atrium', 'right-auricle', 'left-auricle', 'epicardial-fat'];
  for (const id of ids) {
    const m = find(a, id).mesh, colors = m.geometry.attributes.color;
    assert.equal(m.material.vertexColors, true, id);
    assert.equal(colors.count, m.geometry.attributes.position.count);
    assert.ok(colors.array.every(x => Number.isFinite(x) && x >= 0 && x <= 1));
    const red = Array.from({ length: colors.count }, (_, i) => colors.getX(i));
    assert.ok(Math.max(...red) - Math.min(...red) > 0.05, id + ': not a flat material recolour');
    assert.deepEqual(colors.array, find(b, id).mesh.geometry.attributes.color.array, id + ': reproducible');
    const p = m.geometry.attributes.position, seams = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = [p.getX(i), p.getY(i), p.getZ(i)].map(x => x.toFixed(5)).join(',');
      const rgb = [colors.getX(i), colors.getY(i), colors.getZ(i)];
      if (seams.has(key)) rgb.forEach((v, j) => assert.ok(Math.abs(v - seams.get(key)[j]) < 1e-5, 'no painted UV seam'));
      else seams.set(key, rgb);
    }
  }
  for (const p of a.parts.filter(p => p.layer === 2)) assert.equal(p.mesh.userData.tissuePigment, undefined, p.id + ': untouched internal organ');
});

test('epicardial fat pads have tapered, nonuniform cross sections and remain one removable root', () => {
  const s = context.buildHeart(THREE), fat = find(s, 'epicardial-fat');
  assert.equal(fat.detachable, true); assert.equal(fat.cuttable, true);
  assert.equal(fat.mesh.children.length, 0, 'no hidden replacement shell or floating fat siblings');
  const p = fat.mesh.geometry.attributes.position, ringSize = 13, ringCount = 45;
  assert.equal(p.count, 4 * ringSize * ringCount);
  for (let pad = 0; pad < 4; pad++) {
    const radii = [];
    for (let row = 0; row < ringCount; row++) {
      const centre = new THREE.Vector3(), points = [];
      for (let col = 0; col < ringSize - 1; col++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, (pad * ringCount + row) * ringSize + col);
        points.push(v); centre.add(v);
      }
      centre.multiplyScalar(1 / points.length);
      radii.push(points.reduce((sum, v) => sum + v.distanceTo(centre), 0) / points.length);
    }
    const middle = radii.slice(8, -8);
    assert.ok(radii[0] < Math.max(...middle) * 0.6 && radii.at(-1) < Math.max(...middle) * 0.6, 'both pad shoulders taper into their host');
    assert.ok(Math.max(...middle) / Math.min(...middle) > 1.2, 'correlated lobulation, not uniform tubing');
  }
});

test('shared surface finishing preserves cardiac pigment attributes and reversible material ownership', () => {
  const s = context.buildHeart(THREE), before = new Map();
  for (const p of s.parts.filter(p => p.mesh.userData.tissuePigment)) before.set(p.id, {
    colors: p.mesh.geometry.attributes.color, material: p.mesh.material,
  });
  const surface = context.createSurfaceDetail(THREE, s.parts, 'heart', s.group);
  surface.setDensity(0); surface.apply();
  for (const [id, old] of before) {
    const m = find(s, id).mesh;
    assert.equal(m.geometry.attributes.color, old.colors);
    assert.equal(m.material.vertexColors, true);
    assert.notEqual(m.material, old.material);
  }
  surface.dispose();
  for (const [id, old] of before) assert.equal(find(s, id).mesh.material, old.material);
});
