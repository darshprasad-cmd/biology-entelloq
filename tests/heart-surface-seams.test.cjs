/* Render-artifact regressions, not anatomical validation. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { before, test } = require('node:test');
const root = path.resolve(__dirname, '..');
let THREE, context;
before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  context = vm.createContext({ THREE });
  for (const name of ['anatomy', 'heart', 'surface', 'softbody'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8').replace(/^export\s+/gm, ''), context, { filename: name + '.js' });
});
const wall = s => s.parts.find(p => p.id === 'lv-free-wall').mesh;
function assertSeam(g) {
  const p = g.attributes.position, n = g.attributes.normal, rows = g.parameters.points.length;
  for (let a = 0; a < rows; a++) {
    const b = g.parameters.segments * rows + a;
    const pa = new THREE.Vector3().fromBufferAttribute(p, a), pb = new THREE.Vector3().fromBufferAttribute(p, b);
    const na = new THREE.Vector3().fromBufferAttribute(n, a), nb = new THREE.Vector3().fromBufferAttribute(n, b);
    assert.ok(pa.distanceTo(pb) < 1e-5, 'UV vertices remain position-coincident');
    assert.ok(na.distanceTo(nb) < 1e-6, 'UV seam must not split the lighting normal');
    assert.ok(Math.abs(na.length() - 1) < 1e-6, 'finite unit seam normal');
  }
}

test('closed LV shares seam normals without welding its positions, UVs or indices', () => {
  const s = context.buildHeart(THREE), g = wall(s).geometry;
  assert.equal(g.userData.smoothClosedLathe, true); assertSeam(g);
  const positions = g.attributes.position.array.slice(), uv = g.attributes.uv.array.slice(), indices = g.index.array.slice();
  g.computeVertexNormals(); context.smoothClosedLatheSeam(g);
  assertSeam(g);
  assert.deepEqual(g.attributes.position.array, positions); assert.deepEqual(g.attributes.uv.array, uv); assert.deepEqual(g.index.array, indices);
  const rv = s.parts.find(p => p.id === 'rv-free-wall').mesh.geometry;
  assert.equal(rv.userData.smoothClosedLathe, undefined, 'the RV has intentional free edges');
  const normals = rv.attributes.normal.array.slice(); context.smoothClosedLatheSeam(rv);
  assert.deepEqual(rv.attributes.normal.array, normals);
});

test('separated wound edges and unmarked closed lathes are not smoothed together', () => {
  const s = context.buildHeart(THREE), g = wall(s).geometry, rows = g.parameters.points.length;
  const a = 12, b = g.parameters.segments * rows + a, n = g.attributes.normal, p = g.attributes.position;
  p.setX(b, p.getX(b) + .03); n.setXYZ(a, 1, 0, 0); n.setXYZ(b, 0, 0, 1);
  context.smoothClosedLatheSeam(g);
  assert.deepEqual([n.getX(a), n.getY(a), n.getZ(a)], [1, 0, 0]);
  assert.deepEqual([n.getX(b), n.getY(b), n.getZ(b)], [0, 0, 1]);
  const unmarked = new THREE.LatheGeometry([new THREE.Vector2(1, 0), new THREE.Vector2(1, 1)], 12);
  const before = unmarked.attributes.normal.array.slice(); context.smoothClosedLatheSeam(unmarked);
  assert.deepEqual(unmarked.attributes.normal.array, before);
});

test('surface detailing and soft-body life/press retain the normal seam and exact release state', () => {
  const s = context.buildHeart(THREE), m = wall(s), g = m.geometry;
  const surface = context.createSurfaceDetail(THREE, s.parts, 'heart', s.group); surface.apply(); assertSeam(g);
  const rest = g.attributes.position.array.slice(), soft = context.createSoftBody(THREE, s.parts);
  s.group.updateMatrixWorld(true);
  soft.setLife(true); for (let i = 0; i < 80; i++) { soft.update(16); assertSeam(g); }
  soft.setLife(false); soft.update(16);
  soft.press('lv-free-wall', m.localToWorld(new THREE.Vector3(0, 0, 2.4)), .5, 1);
  for (let i = 0; i < 24; i++) { soft.update(16); assertSeam(g); }
  assert.ok(g.attributes.position.array.some((v, i) => Math.abs(v - rest[i]) > .001));
  soft.release('lv-free-wall'); for (let i = 0; i < 400; i++) soft.update(16);
  assert.deepEqual(g.attributes.position.array, rest); assertSeam(g); soft.dispose(); surface.dispose();
});

test('ventricular vessel refinement shortens each segment without changing branch reach or taper', () => {
  const s = context.buildHeart(THREE), proj = context.SUR_projector(THREE, wall(s).geometry);
  const grow = context.SUR_grow, calls = []; context.SUR_grow = (three, projection, builder, cfg) => calls.push(cfg);
  try {
    const spec = { hilum: [-.15, .92, .55], seeds: 1, steps: 5, stepK: .11, tort: .3, taper: .945, gens: 3 };
    context.SUR_seedTree(THREE, proj, context.SUR_builder(), spec, 1, 1, .02);
    context.SUR_seedTree(THREE, proj, context.SUR_builder(), { ...spec, substeps: 3 }, 1, 1, .02);
    const [coarse, fine] = calls;
    assert.equal(fine.steps, coarse.steps * 3); assert.equal(fine.gens, coarse.gens);
    assert.ok(Math.abs(fine.step * fine.steps - coarse.step * coarse.steps) < 1e-9);
    assert.ok(Math.abs(Math.pow(fine.taper, fine.steps) - Math.pow(coarse.taper, coarse.steps)) < 1e-9);
    assert.equal(fine.tort, coarse.tort / 3);
    assert.equal(context.SUR_match('lv-free-wall').tree.substeps, 3); assert.equal(context.SUR_match('rv-free-wall').tree.substeps, 3);
  } finally { context.SUR_grow = grow; }
});

test('ventricles retain named coronary anatomy and fine veins without a second generic orange artery network', () => {
  const s = context.buildHeart(THREE), named = ['lad', 'rca', 'circumflex', 'posterior-iv-branch'];
  const original = named.map(id => s.parts.find(p => p.id === id).mesh);
  const surface = context.createSurfaceDetail(THREE, s.parts, 'heart', s.group); surface.apply();
  for (const id of ['lv-free-wall', 'rv-free-wall']) {
    const kids = s.parts.find(p => p.id === id).mesh.children;
    assert.equal(kids.filter(m => m.userData.SUR_vesselClass === 'artery').length, 0);
    assert.equal(kids.filter(m => m.userData.SUR_vesselClass === 'vein').length, 1);
  }
  named.forEach((id, i) => assert.equal(s.parts.find(p => p.id === id).mesh, original[i], id + ' remains the real coronary part'));
  surface.dispose();
});
