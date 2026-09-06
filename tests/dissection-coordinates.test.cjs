const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/lab/dissect.js'), 'utf8');
const createDissection = new Function(source.replace(/^export\s+/gm, '') + '\nreturn createDissection;')();
let THREE;
test.before(async () => {
  const vendor = fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js'));
  THREE = await import('data:text/javascript;base64,' + vendor.toString('base64'));
});

function close(actual, expected, message) {
  assert.ok(actual.distanceTo(expected) < 1e-6, `${message}: ${actual.toArray()} vs ${expected.toArray()}`);
}
function scenario(kind, options = {}) {
  const scene = new THREE.Scene(), group = new THREE.Group();
  group.position.set(1.2, 2.8, -1.4);
  group.scale.setScalar(kind === 'heart' ? 0.9 : 1);
  if (kind === 'heart') group.rotation.x = -Math.PI / 2;
  if (kind === 'fish') group.rotation.z = -Math.PI / 2;
  scene.add(group);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 1.3), new THREE.MeshPhysicalMaterial());
  mesh.position.set(0.4, 0.65, -0.35);
  mesh.scale.set(1.1, 0.75, 0.9);
  mesh.userData.partId = 'test-organ';
  group.add(mesh);
  const part = { id: 'test-organ', name: 'Test organ', mesh, layer: 0, cuttable: true, detachable: true };
  const deepMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), new THREE.MeshPhysicalMaterial());
  deepMesh.userData.partId = 'underneath';
  deepMesh.visible = false;
  group.add(deepMesh);
  const deeper = { id: 'underneath', name: 'Underneath', mesh: deepMesh, layer: 1 };
  const camera = new THREE.PerspectiveCamera(45, 1.5, 0.1, 100);
  camera.position.set(4, 16, 20);
  camera.lookAt(group.position);
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld();
  const events = [];
  const api = createDissection(THREE, { scene, camera, group, parts: [part, deeper], requiresPinning: false,
    onEvent: (event) => events.push(event), ...options });
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
  const world = () => { scene.updateMatrixWorld(true); return mesh.getWorldPosition(new THREE.Vector3()); };
  const screen = (point) => {
    const projected = point.clone().project(camera);
    return { x: (projected.x + 1) / 2, y: (1 - projected.y) / 2 };
  };
  const start = screen(world().addScaledVector(right, 0.16));
  const hit = api.pick(start.x, start.y);
  assert.ok(hit, `${kind} fixture must be pickable`);
  const contact = hit.point.clone();
  const act = (position, gripping, dt = 16) => {
    scene.updateMatrixWorld(true);
    api.update({ ...position, gripping, grip: gripping ? 0.5 : 0, span: 0 }, dt);
  };
  return { scene, group, mesh, part, deeper, camera, api, events, right, up, screen, start, contact, act, world };
}

for (const kind of ['flat', 'fish', 'heart']) {
  test(`${kind}: off-center forceps grip has no jump and drag preserves its world contact offset`, () => {
    const s = scenario(kind);
    const localHome = s.mesh.position.clone(), worldHome = s.world();
    s.api.setTool('forceps');
    s.act(s.start, true);
    close(s.mesh.position, localHome, 'initial grip preserves authored local origin');
    const offset = s.right.clone().multiplyScalar(0.6).addScaledVector(s.up, 0.4);
    const destination = s.screen(s.contact.clone().add(offset));
    s.act(destination, true);
    close(s.world(), worldHome.clone().add(offset), 'drag follows the camera plane rather than a radius');
    s.act(destination, false);
    close(s.mesh.position, localHome, 'short drag replaces at exact home');
    assert.equal(s.api.state.removed.size, 0);
    assert.equal(s.events.filter((e) => e.kind === 'replace').length, 1);
    s.api.dispose();
  });

  test(`${kind}: removed organ lands on world tray support without changing its parent or scale`, () => {
    const calls = [], support = { x: 6.2, y: -1.38, z: -0.8 };
    const s = scenario(kind, { getRemovalSupport: (part, slot) => { calls.push({ part, slot }); return support; } });
    const rotation = s.mesh.quaternion.clone(), scale = s.mesh.scale.clone();
    s.api.setTool('forceps');
    s.act(s.start, true);
    const destination = s.screen(s.contact.clone().addScaledVector(s.right, 4.2));
    s.act(destination, true);
    s.act(destination, false);
    s.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(s.mesh, true);
    const center = bounds.getCenter(new THREE.Vector3());
    assert.ok(Math.abs(bounds.min.y - support.y - 0.015) < 1e-6, 'bottom touches tray with only the small contact clearance');
    assert.ok(Math.abs(center.x - support.x) < 1e-6 && Math.abs(center.z - support.z) < 1e-6);
    assert.equal(s.mesh.parent, s.group);
    assert.ok(s.mesh.quaternion.equals(rotation));
    close(s.mesh.scale, scale, 'removal does not resize the organ');
    assert.deepEqual(calls, [{ part: s.part, slot: 0 }]);
    assert.ok(s.api.state.removed.has(s.part.id));
    assert.ok(s.deeper.mesh.visible, 'existing next-layer reveal remains intact');
    assert.equal(s.events.filter((e) => e.kind === 'lift').length, 1);
    s.api.dispose();
  });

  test(`${kind}: forceps lifts in world up then removes the sheet without a ghost or transform drift`, () => {
    const s = scenario(kind), home = s.mesh.position.clone(), worldHome = s.world(), scale = s.mesh.scale.clone();
    const pivot = s.contact.clone().addScaledVector(s.right, -3);
    s.mesh.userData.peelable = true;
    s.api.state.incisions.set(s.part.id, { points: [pivot, pivot.clone().add(s.right)], length: 3, opened: false });
    s.api.setTool('forceps');
    s.act(s.start, true, 0);
    close(s.mesh.position, home, 'peel begins at base position');
    close(s.mesh.scale, scale, 'peel begins at base scale');
    assert.equal(s.api.state.opened.size, 0, 'clicking far from the incision start is not a pull');
    const partial = s.screen(s.contact.clone().addScaledVector(s.right, 0.7));
    s.act(partial, true, 140);
    close(s.world(), worldHome.clone().add(new THREE.Vector3(0, 0.45, 0)), 'partial flap rises in world up');
    close(s.mesh.scale, scale, 'peeling does not inflate tissue');
    assert.equal(s.mesh.material.opacity, 1, 'pulling does not fade the material');
    const full = s.screen(s.contact.clone().addScaledVector(s.right, 1.6));
    s.act(full, true, 140);
    close(s.mesh.position, home, 'hidden source returns home for its uncut residual');
    assert.equal(s.mesh.visible, false, 'completed sheet is absent, not a pale overlay');
    s.act(full, false, 140);
    close(s.mesh.position, home, 'completion does not accumulate offsets');
    assert.ok(s.api.state.opened.has(s.part.id));
    assert.ok(s.api.state.removed.has(s.part.id));
    assert.ok(s.deeper.mesh.visible);
    assert.equal(s.events.filter((e) => e.kind === 'peel').length, 1);
    s.api.dispose();
  });
}

test('invalid or unavailable tray support returns the organ safely without awarding removal', () => {
  for (const getRemovalSupport of [() => null, () => ({ x: 0, y: NaN, z: 0 }), () => { throw new Error('unavailable'); }]) {
    const s = scenario('heart', { getRemovalSupport }), home = s.mesh.position.clone();
    s.api.setTool('forceps');
    s.act(s.start, true);
    const destination = s.screen(s.contact.clone().addScaledVector(s.right, 4.2));
    s.act(destination, true);
    s.act(destination, false);
    close(s.mesh.position, home, 'unsupported drop restores home');
    assert.equal(s.api.state.removed.size, 0);
    assert.equal(s.deeper.mesh.visible, false);
    assert.equal(s.events.filter((e) => e.kind === 'lift').length, 0);
    s.api.dispose();
  }
});

test('legacy embedders without support callback retain local tray placement', () => {
  const s = scenario('flat'), homeY = s.mesh.position.y;
  s.api.setTool('forceps');
  s.act(s.start, true);
  const destination = s.screen(s.contact.clone().addScaledVector(s.right, 4.2));
  s.act(destination, true);
  s.act(destination, false);
  close(s.mesh.position, new THREE.Vector3(4.6, homeY, -0.3), 'old local tray slot remains the optional fallback');
  assert.ok(s.api.state.removed.has(s.part.id));
  s.api.dispose();
});
