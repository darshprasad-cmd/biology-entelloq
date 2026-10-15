/* Geometry checks on the shipped offline Three.js runtime. These establish
 * spatial continuity and clearances, not a validated species reconstruction. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { before, test } = require('node:test');
const root = path.resolve(__dirname, '..');
let THREE, built, si, li, gut;

before(async () => {
  const read = name => fs.readFileSync(path.join(root, 'src/lab', name), 'utf8');
  THREE = await import('data:text/javascript;base64,' + Buffer.from(read('vendor/three.module.min.js')).toString('base64'));
  const source = ['anatomy.js', 'frog.js'].map(read).join('\n').replace(/^export\s+/gm, '');
  built = new Function('THREE', source + '\nreturn buildFrog(THREE);')(THREE);
  si = part('small-intestine'); li = part('large-intestine');
  gut = si.geometry.parameters.path;
});
const part = id => built.parts.find(p => p.id === id).mesh;

test('frog ileum and rectum share a junction and the distal rectum enters the cloaca', () => {
  assert.ok(gut.getPoint(1).distanceTo(li.geometry.parameters.path.getPoint(0)) < 1e-7,
    'the two gut centerlines must meet rather than merely pass near one another');
  assert.ok(li.geometry.parameters.radius > si.geometry.parameters.radius * 1.5,
    'rectum remains visibly wider than the slender ileum');
  const outlet = li.geometry.parameters.path.getPoint(1);
  const cloaca = part('cloaca');
  // Casting forward from the embedded endpoint must exit the actual sac mesh.
  // Casting back must also exit: a bounding-box overlap alone is insufficient.
  cloaca.updateMatrixWorld(true);
  const previousSide = cloaca.material.side; cloaca.material.side = THREE.DoubleSide;
  for (const direction of [1, -1]) {
    const hit = new THREE.Raycaster(outlet, new THREE.Vector3(0, 0, direction)).intersectObject(cloaca, false)[0];
    assert.ok(hit && hit.distance > 0.04 && hit.distance < 0.6, 'rectal outlet sits inside the closed cloacal surface');
  }
  cloaca.material.side = previousSide;
  assert.deepEqual(part('stomach').position.toArray(), [-0.5, 0, 0.35]);
  assert.deepEqual(part('spleen').position.toArray(), [0.5, -0.06, -0.55]);
  assert.deepEqual(cloaca.position.toArray(), [0, -0.16, -3.28]);
  assert.equal(built.parts.length, 27, 'no decorative sheet becomes a new selectable organ');
});

test('distant ileal folds have room for both walls, including surface-relief allowance', () => {
  const samples = gut.getSpacedPoints(1000), arcStep = gut.getLength() / 1000;
  const radius = si.geometry.parameters.radius;
  let nearest = Infinity;
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      // Nearby pieces of the same bend are naturally close; compare separated
      // gut lengths so this detects the former planar crossings.
      if ((j - i) * arcStep < radius * 6) continue;
      nearest = Math.min(nearest, samples[i].distanceTo(samples[j]));
    }
  }
  assert.ok(nearest > radius * 2.6, 'independent loops must not occupy the same space');
  const spleen = part('spleen');
  spleen.geometry.computeBoundingSphere();
  const spleenRadius = spleen.geometry.boundingSphere.radius;
  const gap = Math.min(...samples.map(p => p.distanceTo(spleen.position)));
  assert.ok(gap > spleenRadius + radius * 1.15, 'ileum clears the unchanged splenic body');
  assert.ok(samples.some(p => p.y < -0.2) && samples.some(p => p.y > 0.3),
    'loops occupy depth rather than crossing in a flattened plane');
});

test('ileal bends are broad enough to carry the tube without folding its inner wall through itself', () => {
  const samples = gut.getSpacedPoints(1800), radius = si.geometry.parameters.radius;
  let smallestBend = Infinity;
  for (let i = 2; i < samples.length - 2; i++) {
    const a = samples[i].clone().sub(samples[i - 2]);
    const b = samples[i + 2].clone().sub(samples[i]);
    const c = samples[i + 2].clone().sub(samples[i - 2]);
    const twiceArea = a.clone().cross(b).length();
    if (twiceArea > 1e-8) smallestBend = Math.min(smallestBend, a.length() * b.length() * c.length() / (2 * twiceArea));
  }
  assert.ok(smallestBend > radius * 1.08, 'tube radius must be smaller than its tightest centerline bend');
});

test('the folded membrane follows the dorsal gut border and its visible branches end on the bowel', () => {
  const sheet = si.getObjectByName('ileal-mesentery');
  assert.ok(sheet, 'an attached mesentery is present');
  const vertices = sheet.geometry.attributes.position;
  const p = new THREE.Vector3();
  for (let i = 0; i <= 12; i++) {
    const t = 0.34 + i / 12 * 0.58, centre = gut.getPointAt(t), tangent = gut.getTangentAt(t);
    const dorsal = new THREE.Vector3(0, -1, 0);
    dorsal.addScaledVector(tangent, -dorsal.dot(tangent)).normalize();
    const boundary = centre.clone().addScaledVector(dorsal, si.geometry.parameters.radius * 0.88);
    let distance = Infinity;
    for (let j = 0; j < vertices.count; j++) distance = Math.min(distance, p.fromBufferAttribute(vertices, j).distanceTo(boundary));
    assert.ok(distance < 0.065, 'mesentery must reach the coiled bowel rather than float beneath it');
  }
  const branches = si.children.filter(mesh => mesh.name === 'mesenteric-branch');
  assert.ok(branches.length >= 3);
  const sampledGut = gut.getSpacedPoints(1400);
  for (const branch of branches) {
    const endpoint = branch.geometry.parameters.path.getPoint(1);
    const distance = Math.min(...sampledGut.map(p => p.distanceTo(endpoint)));
    assert.ok(distance < si.geometry.parameters.radius, 'membrane vessel endpoint lies within its bowel attachment');
  }
  assert.equal(sheet.material.depthWrite, false, 'thin transparent membrane cannot obscure deeper structures with a depth shield');
  built.group.traverse(mesh => {
    if (!mesh.geometry?.attributes.position) return;
    assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));
    if (mesh.geometry.attributes.normal) assert.ok(mesh.geometry.attributes.normal.array.every(Number.isFinite));
  });
});
