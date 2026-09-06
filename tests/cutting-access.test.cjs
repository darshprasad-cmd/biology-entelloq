const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8');
const createCutting = new Function(read('cutting').replace(/^export\s+/gm, '') + '\nreturn createCutting;')();
const createDissection = new Function(read('dissect').replace(/^export\s+/gm, '') + '\nreturn createDissection;')();
let THREE, buildSpecimen;
test.before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  const builders = ['anatomy', 'frog', 'heart', 'fish', 'earthworm', 'cockroach'].map(read).join('\n').replace(/^export\s+/gm, '');
  buildSpecimen = new Function('THREE', builders + '\nreturn buildSpecimen;')(THREE);
});

function settle(cuts) { for (let i = 0; i < 12; i++) cuts.update(64); }
function plane() {
  const scene = new THREE.Scene(), mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4, 24, 24), new THREE.MeshPhysicalMaterial());
  scene.add(mesh);
  const cuts = createCutting(THREE, scene), rest = mesh.geometry.attributes.position.array.slice();
  const points = [-1, 0, 1].map(x => new THREE.Vector3(x, 0, 0));
  return { scene, mesh, cuts, rest, points };
}

test('incision removes crossed triangles, exposes geometric depth, and retains the softbody attribute contract', () => {
  const { scene, mesh, cuts, rest, points } = plane();
  const positions = mesh.geometry.attributes.position, originalIndex = mesh.geometry.index;
  assert.ok(cuts.open({ partId: 'skin', mesh, points, rest }));
  settle(cuts); scene.updateMatrixWorld(true);
  assert.equal(mesh.geometry.attributes.position, positions);
  assert.equal(positions.array.length, rest.length);
  assert.ok(mesh.geometry.drawRange.count < originalIndex.count, 'actual surface triangles are removed');
  assert.ok(mesh.geometry.drawRange.count > originalIndex.count * 0.8, 'the initial incision remains narrow');
  assert.ok(mesh.geometry.index.array.slice(mesh.geometry.drawRange.count).every(i => i === 0), 'unused index capacity cannot contaminate normals');
  const ray = new THREE.Raycaster(new THREE.Vector3(0.13, 0, 4), new THREE.Vector3(0, 0, -1));
  assert.equal(ray.intersectObject(mesh, false).length, 0, 'a ray can pass through the incision instead of hitting a painted bridge');
  const lining = mesh.children.find(c => c.name === 'cut:skin').children[0];
  assert.ok(lining.geometry.boundingBox.min.z < -0.12, 'cut edges have depth');
  assert.equal(lining.userData.partId, undefined);
  assert.equal(ray.intersectObject(lining, false).length, 0, 'decorative wound edges never intercept a tool');
  cuts.remove('skin');
  assert.equal(mesh.geometry.index, originalIndex);
  assert.equal(mesh.geometry.drawRange.count, Infinity);
  assert.ok(rest.every((value, i) => Math.abs(value - positions.array[i]) < 1e-6));
  assert.equal(cuts.count, 0);
  cuts.dispose();
});

test('reopening, changing detail, and repeated frames do not accumulate cuts or rebuild topology per frame', () => {
  const { mesh, cuts, rest, points } = plane();
  cuts.open({ partId: 'skin', mesh, points, rest }); settle(cuts);
  const index = mesh.geometry.index;
  for (let i = 0; i < 40; i++) cuts.update(16);
  assert.equal(mesh.geometry.index, index, 'index buffer is stable across frames');
  for (let i = 0; i < 5; i++) { cuts.open({ partId: 'skin', mesh, points, rest }); cuts.setQuality(i % 2); settle(cuts); }
  assert.equal(mesh.geometry.index, index, 'growth/detail changes reuse index capacity');
  assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite));
  cuts.clear();
  assert.ok(rest.every((value, i) => Math.abs(value - mesh.geometry.attributes.position.array[i]) < 2e-6));
  cuts.dispose();
});

for (const id of ['frog', 'heart', 'fish', 'earthworm', 'cockroach']) {
  test(`${id}: real incision and forceps removal preserve structural anatomy without leaving a membrane ghost`, () => {
    const scene = new THREE.Scene(), { group, parts } = buildSpecimen(THREE, id);
    scene.add(group); group.updateMatrixWorld(true);
    const pid = { frog: 'skin', heart: 'pericardium', fish: 'body-wall', earthworm: 'body-wall', cockroach: 'exoskeleton' }[id];
    const part = parts.find(p => p.id === pid), mesh = part.mesh;
    const originalIndex = mesh.geometry.index, rest = mesh.geometry.attributes.position.array.slice(), children = [...mesh.children];
    const cuts = createCutting(THREE, scene);
    const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld), center = bounds.getCenter(new THREE.Vector3());
    const span = bounds.max.z - bounds.min.z;
    const points = [];
    for (let i = 0; i < 13; i++) {
      const origin = new THREE.Vector3(center.x, bounds.max.y + 2, center.z + span * (-0.3 + 0.6 * i / 12));
      const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObject(mesh, false)[0];
      if (hit) points.push(hit.point);
    }
    assert.ok(points.length >= 6, 'authored exterior has an accessible top surface');
    assert.ok(cuts.open({ partId: pid, mesh, rest, points, system: part.system }));
    settle(cuts);
    assert.ok(mesh.geometry.drawRange.count < originalIndex.count, `${id} has real incision faces`);
    assert.equal(mesh.geometry.attributes.position.array.length, rest.length);
    mesh.visible = false; // exact completed-forceps contract, not a fade
    assert.ok(cuts.releaseSurface(pid));
    assert.ok(cuts.remove(pid));
    const residual = group.children.find(m => m.name === 'uncut:' + pid);
    assert.equal(mesh.geometry.index, originalIndex, 'hidden source topology is restorable');
    assert.equal(cuts.has(pid), false, 'no floating wound overlay remains');
    if (id === 'heart') {
      assert.equal(residual, undefined, 'the supplemental pericardial sac leaves no backing or hoop');
      assert.equal(mesh.visible, false);
      children.forEach(child => assert.equal(child.parent, mesh, 'membrane decorations stay hidden with their sheet'));
      assert.ok(parts.filter(p => p.id !== pid && p.mesh.visible).length > 0, 'the original heart preview remains intact');
      cuts.clear(); cuts.dispose();
      return;
    }
    assert.ok(residual && residual.visible);
    assert.equal(residual.userData.partId, undefined);
    assert.ok(residual.geometry.index.count < originalIndex.count, 'residual is only the uncut shell');
    assert.ok(residual.geometry.index.count > 0);
    assert.ok(residual.geometry.attributes.position.array.every(Number.isFinite));
    const rim = residual.children.find(child => child.name === 'access-rim');
    assert.ok(rim && rim.geometry.attributes.position.count > 0, 'opening has a thin geometric cut rim');
    const window = residual.userData.accessWindow, normal = new THREE.Vector3().fromArray(window.normal);
    const rimPoints = rim.geometry.attributes.position, point = new THREE.Vector3();
    for (let i = 0; i < rimPoints.count; i += 6) {
      for (const index of [i, i + 1]) {
        point.fromBufferAttribute(rimPoints, index);
        const plane = Math.abs(point.dot(normal) + window.constant) < 1e-5;
        const end = window.preserveEnds && (Math.abs(point.z - window.tailZ) < 1e-5 || Math.abs(point.z - window.headZ) < 1e-5);
        assert.ok(plane || end, 'cut edges lie on the exact access boundary, never jagged discarded-triangle centroids');
      }
    }
    children.forEach(child => assert.equal(child.parent, residual, 'eyes, fins, limbs and other authored decoration stay visible'));
    if (id === 'frog' || id === 'fish') {
      const active = residual.geometry.index.array;
      let maxZ = -Infinity, minZ = Infinity;
      for (const vi of active) { const z = residual.geometry.attributes.position.getZ(vi); maxZ = Math.max(maxZ, z); minZ = Math.min(minZ, z); }
      assert.ok(maxZ > mesh.geometry.boundingBox.max.z - 0.02, 'head endpoint is retained');
      assert.ok(minZ < mesh.geometry.boundingBox.min.z + 0.02, 'tail endpoint is retained');
    }
    cuts.clear();
    assert.equal(residual.parent, null);
    children.forEach(child => assert.equal(child.parent, mesh, 'reset returns decorative ownership'));
    cuts.dispose();
  });
}

for (const partId of ['pericardium', 'epicardium', 'parietal-peritoneum', 'subcutaneous-fascia']) {
  test(`${partId}: a fully removed access membrane leaves no residual film or opaque wire rim`, () => {
    const { scene, mesh, cuts, rest, points } = plane();
    mesh.material.transparent = true; mesh.material.opacity = 0.1;
    const originalIndex = mesh.geometry.index;
    const position = mesh.position.clone(), quaternion = mesh.quaternion.clone(), scale = mesh.scale.clone();
    const decoration = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial());
    mesh.add(decoration);
    assert.ok(cuts.open({ partId, mesh, points, rest })); settle(cuts);
    mesh.visible = false;
    assert.ok(cuts.releaseSurface(partId));
    assert.ok(cuts.remove(partId));
    assert.equal(mesh.visible, false);
    assert.equal(mesh.geometry.index, originalIndex);
    assert.ok(mesh.position.equals(position) && mesh.quaternion.equals(quaternion) && mesh.scale.equals(scale), 'removal leaves authored transforms untouched');
    assert.equal(decoration.parent, mesh, 'film decorations disappear with the removed membrane');
    const visible = []; scene.traverseVisible(object => visible.push(object));
    assert.ok(!visible.includes(mesh) && !visible.includes(decoration));
    assert.ok(!visible.some(object => object.name === 'uncut:' + partId || object.name === 'access-rim'));
    assert.equal(cuts.count, 0);
    cuts.clear(); cuts.dispose();
  });
}

for (const partId of ['lv-free-wall', 'rv-free-wall']) {
  test(`${partId}: ventricular faces point outward and a front-surface incision removes real faces`, () => {
    const scene = new THREE.Scene(), { group, parts } = buildSpecimen(THREE, 'heart');
    scene.add(group); group.updateMatrixWorld(true);
    const mesh = parts.find(part => part.id === partId).mesh, geometry = mesh.geometry;
    const positions = geometry.attributes.position, originalIndex = geometry.index, rest = positions.array.slice();
    const center = geometry.boundingSphere.center, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const normal = new THREE.Vector3(), radial = new THREE.Vector3(), edge = new THREE.Vector3();
    for (let i = 0; i < originalIndex.count; i += 3) {
      a.fromBufferAttribute(positions, originalIndex.getX(i));
      b.fromBufferAttribute(positions, originalIndex.getX(i + 1));
      c.fromBufferAttribute(positions, originalIndex.getX(i + 2));
      normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
      radial.copy(a).add(b).add(c).multiplyScalar(1 / 3).sub(center);
      assert.ok(normal.dot(radial) > 0, 'descending lathe profiles must not turn the ventricular wall inside out');
    }
    const worldBox = geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld), worldCenter = worldBox.getCenter(new THREE.Vector3());
    const span = worldBox.max.z - worldBox.min.z, points = [], rayDirection = new THREE.Vector3(0, -1, 0);
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < 13; i++) {
      const ray = new THREE.Raycaster(new THREE.Vector3(worldCenter.x, worldBox.max.y + 2,
        worldCenter.z + span * (-0.3 + 0.6 * i / 12)), rayDirection);
      const hit = ray.intersectObject(mesh, false)[0];
      if (hit) {
        assert.ok(hit.face.normal.clone().applyMatrix3(normalMatrix).normalize().dot(rayDirection) < 0,
          'the blade hits the outward-facing front surface, not the far interior');
        assert.ok(mesh.worldToLocal(hit.point.clone()).z > 0, 'front contact is on the authored anterior side');
        points.push(hit.point);
      }
    }
    assert.ok(points.length >= 6);
    const cuts = createCutting(THREE, scene);
    assert.ok(cuts.open({ partId, mesh, rest, points, system: 'circulatory' })); settle(cuts);
    assert.ok(geometry.drawRange.count < originalIndex.count, 'a real anterior incision opens ventricular triangles');
    assert.ok(geometry.drawRange.count > originalIndex.count * 0.9, 'the incision does not remove the opposite wall');
    assert.equal(geometry.attributes.position, positions);
    assert.ok(positions.array.every(Number.isFinite));
    cuts.remove(partId);
    assert.equal(geometry.index, originalIndex);
    assert.ok(rest.every((value, i) => Math.abs(value - positions.array[i]) < 2e-6));
    cuts.dispose();
  });
}

function interaction({ getCutDepth } = {}) {
  const scene = new THREE.Scene(), group = new THREE.Group(); scene.add(group);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4, 24, 24), new THREE.MeshPhysicalMaterial());
  mesh.userData.partId = 'skin'; group.add(mesh);
  const hidden = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshPhysicalMaterial());
  hidden.position.z = -0.5; hidden.visible = false; hidden.userData.partId = 'deeper'; group.add(hidden);
  const part = { id: 'skin', name: 'Skin', mesh, layer: 0, system: 'integument', cuttable: true, detachable: false };
  const below = { id: 'deeper', name: 'Deeper', mesh: hidden, layer: 1, cuttable: true };
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); camera.position.set(0, 0, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const cuts = createCutting(THREE, scene), rest = mesh.geometry.attributes.position.array.slice(), events = [];
  let api;
  api = createDissection(THREE, { scene, camera, group, parts: [part, below], requiresPinning: false, getCutDepth,
    onCutProgress(p, points) { if (cuts.has(p.id)) cuts.grow(p.id, points); else cuts.open({ partId: p.id, mesh: p.mesh, points, rest }); },
    onEvent(event) {
      events.push(event);
      if (event.kind === 'incise' && !event.meta.refused) cuts.open({ partId: part.id, mesh, points: api.state.incisions.get(part.id).points, rest });
      if (event.kind === 'peel') { cuts.releaseSurface(event.partId); cuts.remove(event.partId); }
    } });
  const at = (x, y = 0) => { const p = new THREE.Vector3(x, y, 0).project(camera); return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 }; };
  const act = (position, gripping, dt = 16, span = 0) => {
    scene.updateMatrixWorld(true); api.update({ ...position, grip: gripping ? 0.95 : 0, gripping, span }, dt); cuts.update(dt);
  };
  const cut = () => {
    api.setTool('scalpel');
    for (const x of [-1, -0.7, -0.4, -0.1, 0.2, 0.5, 0.8, 1]) act(at(x), true);
    act(at(1), false);
  };
  return { api, cuts, part, hidden, events, act, at, cut };
}

test('a firm normal grip makes a real cut but neither perforates nor removes the layer', () => {
  const s = interaction(); s.cut();
  assert.ok(s.api.state.incisions.get('skin').length > 1.1);
  assert.ok(s.cuts.has('skin'));
  assert.equal(s.api.state.damage.length, 0, 'pinch strength is not penetration depth');
  assert.equal(s.api.state.opened.size, 0);
  assert.equal(s.api.state.removed.size, 0);
  assert.equal(s.part.mesh.visible, true);
  assert.equal(s.hidden.visible, false, 'only forceps can expose the next layer');
  s.cuts.dispose(); s.api.dispose();
});

test('only explicitly measured/selected deep cutting can produce the retained perforation consequence', () => {
  const s = interaction({ getCutDepth: () => 0.95 }); s.cut();
  assert.ok(s.api.state.damage.some(d => d.kind === 'perforated'));
  s.cuts.dispose(); s.api.dispose();
});

test('forceps click does not auto-remove; off-surface pull completes and cannot leave a ghost wound', () => {
  const s = interaction(); s.cut();
  s.api.setTool('forceps');
  const grip = s.at(0.7, 0.35);
  s.act(grip, true, 140); s.act(grip, false, 140);
  assert.equal(s.api.state.removed.size, 0, 'clicking far along an incision is not a pull');
  s.api.setTool('retractor'); s.act(grip, false, 140, 0.6);
  assert.equal(s.api.state.removed.size, 0, 'retraction alone does not remove a sheet');
  s.api.setTool('forceps'); s.act(grip, true, 16);
  s.act(s.at(3.5, 0.35), true, 140); s.act(s.at(3.5, 0.35), false, 140);
  assert.ok(s.api.state.opened.has('skin') && s.api.state.removed.has('skin'));
  assert.equal(s.part.mesh.visible, false);
  assert.equal(s.cuts.has('skin'), false);
  assert.equal(s.hidden.visible, true);
  assert.equal(s.events.filter(e => e.kind === 'peel').length, 1);
  s.cuts.dispose(); s.api.dispose();
});

test('visible deeper preview cannot steal a ray until the covering layer is actually exposed', () => {
  const s = interaction();
  // Match the heart's intentional preview: a visible deeper mesh physically
  // nearer the camera than its covering membrane must still be depth-gated.
  s.hidden.visible = true;
  s.hidden.position.z = 0.4;
  s.hidden.updateWorldMatrix(true, false);
  const point = s.at(0, 0.35);
  assert.equal(s.api.pick(point.x, point.y).object.userData.partId, 'skin');
  assert.equal(s.hidden.visible, true, 'the original deep preview is not hidden');
  s.cut();
  assert.equal(s.api.state.incisions.has('deeper'), false);
  assert.equal(s.api.state.maxLayerRevealed, 0);
  s.api.setTool('forceps'); s.act(point, true);
  s.act(s.at(3.5, 0.35), true, 140); s.act(s.at(3.5, 0.35), false, 140);
  assert.equal(s.api.state.maxLayerRevealed, 1);
  assert.equal(s.api.pick(point.x, point.y).object.userData.partId, 'deeper', 'the same preview becomes pickable only after real exposure');
  assert.equal(s.hidden.visible, true);
  s.cuts.dispose(); s.api.dispose();
});
