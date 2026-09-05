import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../src/lab/vendor/three.module.min.js';

// Execute the production builder and its real shared geometry helpers. This
// matches the assembler's module scope; no GPU, generated HTML or npm install.
const sources = await Promise.all(['anatomy', 'frog', 'pin-state'].map((name) =>
  readFile(new URL(`../src/lab/${name}.js`, import.meta.url), 'utf8')));
const { buildFrog, createPinState } = new Function(
  sources.join('\n').replace(/^export\s+/gm, '') + '\nreturn { buildFrog, createPinState };'
)();

const expectedIds = [
  'skin', 'forelimb-left', 'forelimb-right', 'hindlimb-left', 'hindlimb-right',
  'muscle-wall', 'ventral-abdominal-vein', 'liver-right', 'liver-left', 'liver-median',
  'gall-bladder', 'frog-heart', 'lung-left', 'lung-right', 'stomach', 'oesophagus',
  'small-intestine', 'large-intestine', 'cloaca', 'urinary-bladder', 'spleen',
  'fat-body-left', 'fat-body-right', 'kidney-left', 'kidney-right', 'dorsal-aorta',
  'vertebral-column',
];
const epsilon = 1e-6;

function specimen(t) {
  const built = buildFrog(THREE);
  built.group.updateMatrixWorld(true);
  t.after(() => {
    built.pinning.dispose();
    const geometry = new Set(), materials = new Set();
    built.group.traverse((node) => {
      if (node.geometry) geometry.add(node.geometry);
      if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) => materials.add(m));
    });
    geometry.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose());
  });
  return built;
}

function settle(built) {
  // 1.6 seconds of simulated time, no wall-clock waiting. The adapter snaps
  // sub-0.0001 residual motion to the requested position within these frames.
  for (let i = 0; i < 25; i++) built.pinning.update(64);
}

function positions(part) { return part.mesh.geometry.attributes.position.array; }

function assertFiniteMesh(mesh) {
  for (const key of ['position', 'normal']) {
    const data = mesh.geometry.attributes[key];
    assert.ok(data, `${mesh.name}: missing ${key}`);
    assert.ok(data.array.every(Number.isFinite), `${mesh.name}: nonfinite ${key}`);
  }
  mesh.geometry.computeBoundingBox();
  assert.ok(mesh.geometry.boundingBox.min.toArray().every(Number.isFinite));
  assert.ok(mesh.geometry.boundingBox.max.toArray().every(Number.isFinite));
}

function assertRootUnchanged(part, rest) {
  // The first 17 vertices are the actual proximal 16-sided loft ring, embedded
  // in the torso. Check the complete ring, not a possibly empty radius query.
  assert.deepEqual(positions(part).slice(0, 17 * 3), rest.slice(0, 17 * 3), `${part.id}: root ring drifted`);
}

function assertAboveTray(part, tray) {
  const box = part.mesh.geometry.boundingBox;
  assert.ok(box.min.y >= tray.y + 0.014 - epsilon, `${part.id}: penetrated liner (${box.min.y})`);
  assert.ok(box.min.x >= tray.minX && box.max.x <= tray.maxX, `${part.id}: outside tray width`);
  assert.ok(box.min.z >= tray.minZ && box.max.z <= tray.maxZ, `${part.id}: outside tray length`);
}

// Merged limb meshes retain distinct indexed cap surfaces. Locate those actual
// small terminal ellipsoids topologically, so digitCount metadata alone cannot
// make a missing finger/toe pass. This is an authored-topology regression, not
// a claim that the overlapping surface pieces form a watertight scan.
function terminalCaps(geometry, palmZ, direction, requireDistal = true) {
  const p = geometry.attributes.position, index = geometry.index.array;
  const parent = Int32Array.from({ length: p.count }, (_, i) => i);
  const used = new Set();
  function root(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i], b = index[i + 1], c = index[i + 2];
    parent[root(b)] = root(a); parent[root(c)] = root(a);
    used.add(a); used.add(b); used.add(c);
  }
  const components = new Map(), point = new THREE.Vector3();
  used.forEach((i) => {
    const id = root(i);
    if (!components.has(id)) components.set(id, new THREE.Box3());
    components.get(id).expandByPoint(point.fromBufferAttribute(p, i));
  });
  return [...components.values()].filter((box) => {
    const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
    return Math.max(size.x, size.y, size.z) < 0.1 && (!requireDistal || (center.z - palmZ) * direction > 0.25);
  });
}

function boundsOf(parts) {
  const box = new THREE.Box3();
  parts.forEach((part) => box.union(new THREE.Box3().setFromObject(part.mesh, true)));
  return { min: box.min.toArray(), max: box.max.toArray() };
}

test('identity root, named 27-part compatibility and finite geometry inventory', (t) => {
  const built = specimen(t);
  assert.deepEqual(built.parts.map((p) => p.id), expectedIds);
  assert.equal(built.group.name, 'frog-specimen');
  assert.deepEqual(built.group.position.toArray(), [0, 0, 0]);
  assert.deepEqual(built.group.quaternion.toArray(), [0, 0, 0, 1]);
  assert.deepEqual(built.group.scale.toArray(), [1, 1, 1]);
  let meshes = 0, triangles = 0, exteriorTriangles = 0;
  const geometries = new Set(), materials = new Set();
  built.parts.forEach((part) => {
    assert.equal(part.mesh.name, part.id);
    assert.equal(part.mesh.userData.partId, part.id);
    assert.equal(part.mesh.visible, part.layer === 0);
    part.mesh.traverse((node) => {
      assert.ok(!node.isBone && !node.isSkinnedMesh, 'unexpected skeleton dependency');
      if (!node.isMesh) return;
      assertFiniteMesh(node);
      meshes++; geometries.add(node.geometry); materials.add(node.material);
      const count = (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
      triangles += count;
      if (part.layer === 0) exteriorTriangles += count;
    });
  });
  assert.ok(exteriorTriangles < 50000, 'exterior triangle budget regression');
  assert.ok(triangles < 120000, 'whole builder triangle budget regression');
  t.diagnostic(JSON.stringify({ parts: built.parts.length, meshes, geometries: geometries.size,
    materials: materials.size, triangles, exteriorTriangles,
    allBounds: boundsOf(built.parts), exteriorBounds: boundsOf(built.parts.filter((p) => p.layer === 0)) }));
});

test('belly-up skin and four limbs contact the liner within the tray', (t) => {
  const built = specimen(t), tray = built.pinning.tray;
  assert.deepEqual(tray, { y: -1.22, minX: -5.8, maxX: 5.8, minZ: -6.9, maxZ: 6.9 });
  const skin = built.parts.find((p) => p.id === 'skin');
  assert.ok(skin.mesh.geometry.boundingBox.min.y >= tray.y);
  assert.ok(skin.mesh.geometry.boundingBox.min.y - tray.y < 0.03, 'body floating above liner');
  assert.equal(built.pinning.targets.length, 4);
  built.pinning.targets.forEach((target) => {
    assert.equal(target.center[1], tray.y);
    assert.equal(target.rest[1], tray.y);
    assert.equal(target.id, target.partId);
    const part = built.parts.find((p) => p.id === target.id);
    assert.equal(part.mesh.userData.authoredPinLimb, true);
    assert.equal(part.mesh.userData.frogAuthored, true);
    assert.equal(part.mesh.children.length, 0, 'limb has independently drifting child anatomy');
    assertAboveTray(part, tray);
    assert.ok(part.mesh.geometry.boundingBox.min.y - tray.y < 0.03, `${part.id}: floating limb`);
  });
});

test('each forelimb has four modeled fingertips and each hindlimb has five modeled toe tips', (t) => {
  const built = specimen(t);
  built.pinning.targets.forEach((target) => {
    const part = built.parts.find((p) => p.id === target.id), hind = target.id.startsWith('hind');
    const expected = hind ? 5 : 4;
    assert.equal(part.mesh.userData.digitCount, expected);
    assert.equal(terminalCaps(part.mesh.geometry, target.rest[2], hind ? -1 : 1).length, expected,
      `${target.id}: missing or extra geometric digit cap`);
  });
});

test('all target boundaries deform actual digits, retain fixed roots and undo exactly', (t) => {
  const built = specimen(t);
  const state = createPinState({ specimenId: 'frog', targets: built.pinning.targets, tray: built.pinning.tray });
  const skinRest = positions(built.parts[0]).slice();
  for (const target of built.pinning.targets) {
    const part = built.parts.find((p) => p.id === target.id), rest = positions(part).slice();
    const caps = terminalCaps(part.mesh.geometry, target.rest[2], target.id.startsWith('hind') ? -1 : 1);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      // Stay infinitesimally inside the circle to avoid roundoff at sqrt/radius.
      const radius = target.radius * (1 - 1e-10);
      const anchor = [target.center[0] + radius * Math.cos(angle), target.center[1], target.center[2] + radius * Math.sin(angle)];
      assert.equal(state.place(target.id, anchor).ok, true);
      assert.equal(built.pinning.setAnchor(target.id, state.snapshot().anchors[target.id]), true);
      settle(built);
      assertFiniteMesh(part.mesh); assertAboveTray(part, built.pinning.tray); assertRootUnchanged(part, rest);
      const moved = positions(part);
      let maxDisplacement = 0;
      for (let j = 0; j < moved.length; j += 3) {
        maxDisplacement = Math.max(maxDisplacement, Math.hypot(moved[j] - rest[j], moved[j + 1] - rest[j + 1], moved[j + 2] - rest[j + 2]));
      }
      assert.ok(maxDisplacement > 0.1 && maxDisplacement <= 0.850001, `${part.id}: invalid displacement ${maxDisplacement}`);
      // Count the same small indexed surfaces after movement without a rest-
      // pose z filter: inward placement can carry short digits across that line.
      const movedCaps = terminalCaps(part.mesh.geometry, target.rest[2], 0, false);
      assert.equal(movedCaps.length, caps.length, `${part.id}: digit cap lost under deformation`);
      movedCaps.forEach((box, k) => assert.ok(
        box.getCenter(new THREE.Vector3()).distanceTo(caps[k].getCenter(new THREE.Vector3())) > 0.1,
        `${part.id}: fingertip stayed behind its moved foot`));
      assert.equal(state.undo().ok, true);
      assert.equal(state.snapshot().count, 0);
      assert.equal(built.pinning.setAnchor(target.id, null), true); settle(built);
      assert.deepEqual(positions(part), rest, `${part.id}: undo did not restore exact vertex positions`);
      assert.deepEqual(positions(built.parts[0]), skinRest, 'pinning changed the torso');
    }
  }
});

test('adapter guards nonfinite input and bounds oversize displacement; disposal restores rest', (t) => {
  const built = specimen(t), target = built.pinning.targets[0];
  const part = built.parts.find((p) => p.id === target.id), rest = positions(part).slice();
  assert.equal(built.pinning.setAnchor('missing-limb', target.center), false);
  for (const invalid of [[NaN, 0, 0], [0, Infinity, 0], [0, 0], { x: 0, y: 0, z: NaN }]) {
    assert.equal(built.pinning.setAnchor(target.id, invalid), false);
  }
  // Public procedure validation rejects this point. Exercise the geometry's
  // additional safety clamp directly, not as permission for an out-of-tray pin.
  built.pinning.setAnchor(target.id, new THREE.Vector3(-1000, -1000, 1000)); settle(built);
  assertFiniteMesh(part.mesh); assertRootUnchanged(part, rest); assertAboveTray(part, built.pinning.tray);
  const moved = positions(part);
  for (let i = 0; i < moved.length; i += 3) assert.ok(
    Math.hypot(moved[i] - rest[i], moved[i + 1] - rest[i + 1], moved[i + 2] - rest[i + 2]) <= 0.850001);
  built.pinning.dispose();
  assert.deepEqual(positions(part), rest);
});

test('authored exterior geometry and vertex color are deterministic across fresh builds', (t) => {
  const a = specimen(t), b = specimen(t);
  a.parts.filter((p) => p.layer === 0).forEach((part) => {
    const other = b.parts.find((p) => p.id === part.id);
    assert.deepEqual(positions(part), positions(other), `${part.id}: nondeterministic shape`);
    assert.deepEqual(part.mesh.geometry.attributes.color.array, other.mesh.geometry.attributes.color.array, `${part.id}: nondeterministic color`);
  });
});
