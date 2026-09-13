const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
let THREE, build;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
test.before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  const source = ['anatomy', 'frog', 'heart', 'fish', 'earthworm', 'cockroach']
    .map(name => fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8')).join('\n');
  build = new Function('THREE', source.replace(/^export\s+/gm, '') + '\nreturn buildSpecimen;')(THREE);
});

// Captured from the accepted pre-exterior builders. Includes complete part
// metadata, incision anchors and transforms; no fixture of rendered appearance.
const baseline = {
  fish: { contracts: 'bc278d019b0735f959ed4702f9fd50c67b77d656e647b5844a7d7b06a978d2cd',
    interiors: '10630ae3b56f12966f0963d52c050eadc73d583c9541abb6682160cd447bef8c' },
  cockroach: { contracts: '77ce83635391bd3f1f71ba51909110c1641882db459c2cd324b38fb2a5f903fa',
    interiors: '6e33c61f9e3c4d6fe7cef54754e7be772c073c4b1165f5bc8752ca2e23c6720a' },
};

for (const id of ['fish', 'cockroach']) {
  test(`${id}: all original part metadata, cut/lift/pin contracts, anchors and interior geometry are identical`, () => {
    const { parts } = build(THREE, id);
    assert.equal(hash(parts.map(({ mesh, ...part }) => ({ ...part, position: mesh.position.toArray(),
      rotation: mesh.quaternion.toArray(), scale: mesh.scale.toArray() }))), baseline[id].contracts);
    assert.equal(hash(parts.filter(part => part.layer > 0).map(part => {
      const arrays = [];
      part.mesh.traverse(mesh => {
        if (mesh.geometry) arrays.push([mesh.position.toArray(), mesh.quaternion.toArray(), mesh.scale.toArray(),
          Array.from(mesh.geometry.attributes.position.array)]);
      });
      return [part.id, arrays];
    })), baseline[id].interiors);
  });

  test(`${id}: exterior geometry is finite, bounded, and never creates extra pick targets`, () => {
    const { group, parts } = build(THREE, id), pickable = new Set(parts.map(part => part.mesh));
    let triangles = 0, meshes = 0;
    group.traverseVisible(mesh => {
      if (!mesh.geometry) return;
      meshes++;
      triangles += (mesh.geometry.index?.count || mesh.geometry.attributes.position.count) / 3;
      for (const attribute of Object.values(mesh.geometry.attributes)) assert.ok(attribute.array.every(Number.isFinite));
      mesh.geometry.computeBoundingSphere();
      assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius) && mesh.geometry.boundingSphere.radius < 15);
      if (!pickable.has(mesh)) assert.equal(mesh.userData.partId, undefined);
      if (mesh.userData.exteriorDetail === 'eye') assert.equal(mesh.userData.exteriorTissue, undefined, 'surface finishes must not recolor an eye');
    });
    assert.ok(triangles < 30000, 'fine details stay within the fixed exterior budget');
    assert.ok(meshes < 40, 'rays, spines and veins are batched, not hundreds of draw calls');
  });

  test(`${id}: decorative geometry inherits its owner visibility and temporary batches are disposed`, () => {
    const created = new Set(), disposed = new Set();
    const originalSet = THREE.BufferGeometry.prototype.setAttribute, originalDispose = THREE.BufferGeometry.prototype.dispose;
    THREE.BufferGeometry.prototype.setAttribute = function (name, attribute) {
      if (name === 'position') created.add(this);
      return originalSet.call(this, name, attribute);
    };
    THREE.BufferGeometry.prototype.dispose = function () { disposed.add(this); return originalDispose.call(this); };
    try {
      const { group, parts } = build(THREE, id), owned = new Set();
      group.traverse(mesh => { if (mesh.geometry) owned.add(mesh.geometry); });
      assert.ok(disposed.size > 30, 'temporary ray/segment buffers are explicitly released');
      for (const geometry of created) assert.ok(owned.has(geometry) || disposed.has(geometry), 'no orphaned intermediate geometry');
      for (const part of parts.filter(part => part.layer === 0)) {
        part.mesh.visible = false;
        const visible = new Set(); group.traverseVisible(mesh => visible.add(mesh));
        part.mesh.traverse(child => assert.ok(!visible.has(child), 'a removed owner leaves no floating decoration'));
        part.mesh.visible = true;
      }
      group.traverse(mesh => { if (mesh.geometry) mesh.geometry.dispose(); });
      for (const geometry of created) assert.ok(disposed.has(geometry), 'all builder geometry is reachable for disposal');
    } finally {
      THREE.BufferGeometry.prototype.setAttribute = originalSet;
      THREE.BufferGeometry.prototype.dispose = originalDispose;
    }
  });
}

test('fish fins have seated roots, true camber, curved rays and a shared forked-tail insertion', () => {
  const { parts } = build(THREE, 'fish'), skin = parts.find(part => part.id === 'body-wall').mesh;
  skin.updateMatrixWorld(true);
  const fins = skin.children.filter(child => child.userData.exteriorDetail === 'fin');
  assert.equal(fins.length, 8, 'four paired fins plus dorsal, anal and two joined caudal lobes');
  for (const fin of fins) {
    assert.equal(fin.userData.exteriorTissue, 'fin');
    assert.ok(fin.geometry.index.count > 150);
    assert.equal(fin.children.length, 1, 'all rays share one batch');
    assert.equal(fin.children[0].userData.exteriorDetail, 'fin-ray');
    const bounds = fin.geometry.boundingBox;
    assert.ok(bounds.max.x - bounds.min.x > 0.02, 'membrane has modeled camber, not a flat plane');
    if (fin.name.endsWith('-right')) assert.ok(bounds.max.x <= skin.geometry.boundingBox.max.x,
      'tray-side fins must not lift the whole fish like rigid stilts');
    if (fin.name === 'dorsal-fin' || fin.name === 'anal-fin') {
      const sign = fin.name === 'dorsal-fin' ? 1 : -1;
      for (const coordinates of fin.userData.finRoots) {
        const origin = new THREE.Vector3(...coordinates).add(new THREE.Vector3(0, sign * 0.2, 0));
        const hit = new THREE.Raycaster(origin, new THREE.Vector3(0, -sign, 0)).intersectObject(skin, false)[0];
        assert.ok(hit && Math.abs(hit.distance - 0.2) < 1e-5, 'every median fin root touches the shaped body');
      }
    }
  }
  const upper = skin.getObjectByName('caudal-upper'), lower = skin.getObjectByName('caudal-lower');
  assert.deepEqual(upper.position.toArray(), lower.position.toArray());
  assert.ok(upper.geometry.boundingBox.max.y > 1 && lower.geometry.boundingBox.min.y < -1);
  assert.ok(upper.geometry.boundingBox.min.z < -1.4 && lower.geometry.boundingBox.min.z < -1.4);
  const p = skin.geometry.attributes.position;
  let shoulder = 0, peduncle = 0;
  for (let i = 0; i < p.count; i++) {
    if (p.getZ(i) > 0.4 && p.getZ(i) < 1.4) shoulder = Math.max(shoulder, Math.abs(p.getX(i)));
    if (p.getZ(i) < -2.65) peduncle = Math.max(peduncle, Math.abs(p.getX(i)));
  }
  assert.ok(shoulder > 0.52 && shoulder > peduncle * 3, 'shoulder volume transitions to a distinct narrow peduncle');
});

test('cockroach retains six articulated legs, segmented antennae/cerci and folded wings above the terga', () => {
  const { group, parts } = build(THREE, 'cockroach'); group.updateMatrixWorld(true);
  const abdomen = parts.find(part => part.id === 'exoskeleton').mesh;
  const legs = abdomen.children.filter(child => child.userData.exteriorDetail === 'jointed-leg');
  assert.equal(legs.length, 6);
  assert.ok(legs.every(leg => leg.userData.jointCount === 7 && leg.userData.tarsalSegments === 5));
  assert.equal(abdomen.children.filter(child => child.userData.exteriorDetail === 'cercus').length, 2);
  const head = parts.find(part => part.id === 'head').mesh;
  assert.equal(head.children.filter(child => child.userData.exteriorDetail === 'antenna').length, 2);
  assert.equal(head.children.filter(child => child.userData.exteriorDetail === 'mouthpart').length, 2);
  const pronotum = parts.find(part => part.id === 'pronotum').mesh;
  assert.ok(pronotum.geometry.boundingBox.max.x - pronotum.geometry.boundingBox.min.x < 3);
  for (const id of ['wing-left', 'wing-right']) {
    const wing = parts.find(part => part.id === id).mesh;
    assert.equal(wing.userData.exteriorDetail, 'cambered-tegmen');
    assert.equal(wing.children.length, 1);
    const z = -2.2, x = id === 'wing-left' ? -0.65 : 0.65;
    const ray = new THREE.Raycaster(new THREE.Vector3(x, 4, z), new THREE.Vector3(0, -1, 0));
    const wingHit = ray.intersectObject(wing, false)[0], bodyHit = ray.intersectObject(abdomen, false)[0];
    assert.ok(wingHit && bodyHit && wingHit.distance < bodyHit.distance, 'folded tegmen is outside its supporting abdomen');
  }
});

test('fish gill cover conforms to the flank and remains a thin reachable lift target', () => {
  const { group, parts } = build(THREE, 'fish');
  // Authoring coordinates: the runtime will still apply its unchanged tray roll.
  group.rotation.set(0, 0, 0); group.updateMatrixWorld(true);
  const skin = parts.find(part => part.id === 'body-wall').mesh;
  const cover = parts.find(part => part.id === 'operculum').mesh;
  assert.equal(cover.userData.exteriorDetail, 'conforming-operculum');
  assert.equal(cover.material.vertexColors, true, 'cover uses sampled body tint, not a separate beige disc');
  assert.equal(cover.children.length, 1);
  assert.equal(cover.children[0].name, 'opercular-margin', 'only the restrained posterior seam remains');
  for (const y of [-0.65, 0, 0.65]) for (const z of [1.3, 1.7, 2.05]) {
    const ray = new THREE.Raycaster(new THREE.Vector3(-2, y, z), new THREE.Vector3(1, 0, 0));
    const bodyHit = ray.intersectObject(skin, false)[0], coverHit = ray.intersectObject(cover, false)[0];
    assert.ok(bodyHit && coverHit, 'gill cover spans the authored chamber');
    const separation = bodyHit.distance - coverHit.distance;
    assert.ok(separation > 0 && separation < 0.055, 'the cover is reachable but sits within 0.055 units of the actual flank');
  }
});

test('cockroach anterior shield covers the cervical connection and wing bases tuck beneath it', () => {
  const { group, parts } = build(THREE, 'cockroach'); group.updateMatrixWorld(true);
  const pronotum = parts.find(part => part.id === 'pronotum').mesh;
  const head = parts.find(part => part.id === 'head').mesh;
  const neck = head.getObjectByName('cervical-connection');
  const neckRay = new THREE.Raycaster(new THREE.Vector3(0, 3, 4.35), new THREE.Vector3(0, -1, 0));
  const shieldHit = neckRay.intersectObject(pronotum, false)[0], neckHit = neckRay.intersectObject(neck, false)[0];
  assert.ok(shieldHit && neckHit && shieldHit.distance < neckHit.distance, 'shield hides the bead-like neck from above');
  for (const id of ['wing-left', 'wing-right']) {
    const wing = parts.find(part => part.id === id).mesh, side = id === 'wing-left' ? -1 : 1;
    const rootRay = new THREE.Raycaster(new THREE.Vector3(side * 0.55, 3, 1.79), new THREE.Vector3(0, -1, 0));
    const pronHit = rootRay.intersectObject(pronotum, false)[0], rootHit = rootRay.intersectObject(wing, false)[0];
    assert.ok(pronHit && rootHit && pronHit.distance < rootHit.distance, 'the broad forewing insertion is beneath the posterior shield');
    const box = wing.geometry.boundingBox.clone().applyMatrix4(wing.matrixWorld);
    assert.ok(box.min.z > -5.1 && box.min.z < -4.5, 'distal wing no longer overextends the abdominal tip');
  }
});
