/* Actual Three.js geometry/material contracts, using the shipped offline runtime.
   These tests do not certify anatomical accuracy or visual acceptance. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { before, test } = require('node:test');

const root = path.resolve(__dirname, '..');
let THREE, context;
before(async () => {
  const html = fs.readFileSync(path.join(root, 'lab.html'), 'utf8');
  const imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.ok(imports.three.startsWith('data:text/javascript;base64,'));
  THREE = await import(imports.three);
  context = vm.createContext({ THREE });
  for (const name of ['anatomy', 'frog', 'heart', 'fish', 'earthworm', 'cockroach', 'surface']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8').replace(/\bexport\s+/g, ''), context, { filename: name + '.js' });
  }
});
const build = id => context.buildSpecimen(THREE, id);
const find = (spec, id) => spec.parts.find(p => p.id === id);

test('all four pinnable frog limbs begin inside the actual trunk and taper into the feet', () => {
  const frog = build('frog'), skin = find(frog, 'skin').mesh;
  let limbTriangles = 0;
  frog.group.updateMatrixWorld(true);
  for (const name of ['forelimb-left', 'forelimb-right', 'hindlimb-left', 'hindlimb-right']) {
    const p = find(frog, name), side = name.endsWith('left') ? -1 : 1;
    assert.equal(p.cuttable, false); assert.equal(p.detachable, false); assert.equal(p.layer, 0);
    assert.equal(p.mesh.userData.partId, name);
    const geo = p.mesh.geometry, params = geo.parameters, positions = geo.attributes.position;
    assert.equal(params.radialSegments, 16, name + ': smoother cross-section');
    limbTriangles += geo.index.count / 3;
    const start = params.path.getPointAt(0), v = new THREE.Vector3();
    const hit = new THREE.Raycaster(new THREE.Vector3(side * 6, start.y, start.z), new THREE.Vector3(-side, 0, 0)).intersectObject(skin, false)[0];
    assert.ok(hit, name + ': flank ray intersects trunk');
    assert.ok(Math.abs(hit.point.x) - Math.abs(start.x) > 0.45, name + ': proximal centre buried in trunk');
    for (let i = 0; i <= params.radialSegments; i++) {
      v.fromBufferAttribute(positions, i);
      const surface = new THREE.Raycaster(new THREE.Vector3(side * 6, v.y, v.z), new THREE.Vector3(-side, 0, 0)).intersectObject(skin, false)[0];
      assert.ok(surface && side * v.x < side * surface.point.x, name + ': entire open proximal ring concealed');
    }
    const proximalRadius = new THREE.Vector3().fromBufferAttribute(positions, 0).distanceTo(start);
    const end = params.path.getPointAt(1);
    const distalRadius = new THREE.Vector3().fromBufferAttribute(positions, params.tubularSegments * (params.radialSegments + 1)).distanceTo(end);
    assert.ok(proximalRadius > distalRadius * 1.8, name + ': thigh/upper arm narrows distally');
    const foot = p.mesh.children[0]; foot.updateMatrix();
    foot.geometry.computeBoundingBox();
    assert.ok(foot.geometry.boundingBox.clone().applyMatrix4(foot.matrix).containsPoint(end), name + ': distal centre seated inside hand/foot bounds');
    assert.ok(positions.array.every(Number.isFinite));
    assert.ok(geo.attributes.normal.array.every(Number.isFinite));
  }
  assert.equal(limbTriangles, 5120, 'all four limb tubes use 5120 triangles, only 2240 more than the prior nine-sided tubes');
});

test('all five specimens receive distinct restrained finishes without changing part contracts or gradient attributes', () => {
  const targets = { frog: 'skin', fish: 'body-wall', cockroach: 'exoskeleton', earthworm: 'body-wall', heart: 'lv-free-wall' };
  const coats = new Set();
  for (const [id, partId] of Object.entries(targets)) {
    const spec = build(id), p = find(spec, partId), old = p.mesh.material;
    const colourAttribute = p.mesh.geometry.attributes.color;
    const eyeColour = id === 'frog' || id === 'fish' ? p.mesh.children[0].material.color.getHex() : null;
    const contracts = spec.parts.map(p => [p.id, p.layer, p.system, p.cuttable, p.detachable]);
    const surf = context.createSurfaceDetail(THREE, spec.parts, id, spec.group);
    surf.apply();
    const current = p.mesh.material;
    assert.notEqual(current, old, id + ': own finish material');
    assert.ok(current.roughness >= 0.55 && current.roughness <= 0.82, id);
    assert.ok(current.clearcoat >= 0.12 && current.clearcoat <= 0.34, id);
    assert.ok(current.clearcoatRoughness >= 0.38, id);
    assert.ok(current.sheen <= 0.24, id);
    assert.equal(current.opacity, old.opacity, id + ': opacity preserved');
    assert.equal(current.transmission, old.transmission, id + ': translucency preserved');
    assert.equal(current.emissive.getHex(), old.emissive.getHex(), id + ': selection channel untouched');
    assert.equal(p.mesh.geometry.attributes.color, colourAttribute, id + ': dorsal/ventral/segment tint preserved');
    assert.deepEqual(spec.parts.map(p => [p.id, p.layer, p.system, p.cuttable, p.detachable]), contracts);
    assert.ok(current.roughnessMap.isDataTexture);
    assert.ok(new Set(current.roughnessMap.image.data.filter((_, i) => i % 4 === 1)).size > 12, id + ': nonuniform highlight roughness');
    coats.add(current.clearcoat);
    surf.apply(); surf.setDensity(0); surf.apply();
    assert.equal(p.mesh.material, current, id + ': applying/density changes never clone or tint twice');
    if (eyeColour !== null) assert.equal(p.mesh.children[0].material.color.getHex(), eyeColour, id + ': eyes unchanged');
    surf.dispose();
    assert.equal(p.mesh.material, old, id + ': exact original material restored');
  }
  assert.ok(coats.size >= 4, 'hide, scales, chitin and myocardium do not all receive the same finish');
});

test('procedural scale relief and roughness are deterministic, bounded and local', () => {
  const a = context.SUR_finishMaps(THREE, 'scales'), b = context.SUR_finishMaps(THREE, 'scales');
  assert.deepEqual(a.rough.image.data, b.rough.image.data);
  assert.deepEqual(a.normal.image.data, b.normal.image.data);
  assert.equal(a.normal.image.width, 128);
  assert.ok(new Set(a.normal.image.data.filter((_, i) => i % 4 === 0)).size > 8, 'scale relief is not a flat normal');
  assert.ok(a.normal.image.data.every(Number.isFinite));
  assert.equal(a.rough.wrapS, THREE.RepeatWrapping);
  assert.equal(a.normal.wrapT, THREE.RepeatWrapping);
  for (const maps of [a, b]) for (const t of Object.values(maps)) if (t) t.dispose();
});

test('the low-opacity heart sac stays clearer without turning opaque membranes into glass', () => {
  const heart = build('heart'), sac = find(heart, 'pericardium');
  const clear = context.SUR_finishProfile('heart', sac);
  assert.equal(sac.mesh.material.opacity, 0.1);
  assert.equal(clear.rough, 0.32);
  assert.equal(clear.coat, 0.18);
  const opaque = { ...sac, mesh: { material: { transparent: true, opacity: 0.94 } } };
  assert.equal(context.SUR_finishProfile('heart', opaque).rough, 0.65, 'opaque serosal sheet retains moderate roughness');
  const peritoneum = { id: 'parietal-peritoneum', system: 'serous', mesh: { material: { transparent: true, opacity: 0.96 } } };
  assert.equal(context.SUR_finishProfile('frog', peritoneum), null, 'existing opaque peritoneum material is left intact');
});

test('shared builder materials never leak tint and finishing resources are disposed once', () => {
  const original = new THREE.MeshPhysicalMaterial({ color: 0x998877, clearcoat: 0.8 });
  const group = new THREE.Group();
  const parts = ['stomach', 'crop'].map(id => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), original);
    group.add(mesh); return { id, system: 'digestive', layer: 1, mesh };
  });
  const before = original.color.getHex();
  const surf = context.createSurfaceDetail(THREE, parts, 'cockroach', group);
  surf.apply();
  assert.notEqual(parts[0].mesh.material, parts[1].mesh.material);
  const right = parts[1].mesh.material.color.getHex();
  parts[0].mesh.material.color.setHex(0x123456);
  assert.equal(parts[1].mesh.material.color.getHex(), right);
  assert.equal(original.color.getHex(), before);
  const maps = new Set(parts.flatMap(p => [p.mesh.material.map, p.mesh.material.roughnessMap, p.mesh.material.clearcoatRoughnessMap]));
  const disposed = new Map(); let originalDisposed = 0;
  original.addEventListener('dispose', () => originalDisposed++);
  maps.forEach(t => { disposed.set(t, 0); t.addEventListener('dispose', () => disposed.set(t, disposed.get(t) + 1)); });
  surf.dispose(); surf.dispose();
  assert.ok(parts.every(p => p.mesh.material === original));
  assert.equal(originalDisposed, 0, 'builder-owned material remains owned by builder');
  assert.ok([...disposed.values()].every(n => n === 1), 'owned textures disposed exactly once');
});
