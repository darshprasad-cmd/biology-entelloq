import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Match the production assembler's single module scope, without dependencies,
// generated HTML, a GPU or a network connection.
const pinSource = await readFile(new URL('../src/lab/pin-state.js', import.meta.url), 'utf8');
const dissectSource = await readFile(new URL('../src/lab/dissect.js', import.meta.url), 'utf8');
const { createPinState, createDissection } = new Function(
  (pinSource + '\n' + dissectSource).replace(/^export\s+/gm, '') + '\nreturn { createPinState, createDissection };'
)();
const THREE = await import('../src/lab/vendor/three.module.min.js');

function config() {
  return {
    specimenId: 'frog',
    tray: { y: -1.22, minX: -5.8, maxX: 5.8, minZ: -6.9, maxZ: 6.9 },
    targets: [
      { id: 'forelimb-left', partId: 'forelimb-left', label: 'left forelimb', center: [-3.53, -1.22, 2.82], radius: 0.46 },
      { id: 'forelimb-right', partId: 'forelimb-right', label: 'right forelimb', center: [3.53, -1.22, 2.82], radius: 0.46 },
      { id: 'hindlimb-left', partId: 'hindlimb-left', label: 'left hindlimb', center: [-3.7, -1.22, -4.72], radius: 0.55 },
      { id: 'hindlimb-right', partId: 'hindlimb-right', label: 'right hindlimb', center: [3.7, -1.22, -4.72], radius: 0.55 },
    ],
  };
}
function placeFour(model) {
  config().targets.forEach((target) => assert.equal(model.place(target.id, target.center).ok, true));
}

test('only four distinct valid distal anchors satisfy the pin prerequisite', () => {
  const model = createPinState(config());
  const first = config().targets[0];
  assert.equal(model.continueStep().ok, false);
  assert.equal(model.place(first.id, first.center).ok, true);
  assert.equal(model.place(first.id, first.center).changed, false);
  assert.equal(model.snapshot().count, 1);
  assert.equal(model.place('skin', [0, -1.22, 0]).ok, false);
  placeFour(model);
  assert.equal(model.snapshot().count, 4);
  assert.equal(model.snapshot().confirmed, false);
  assert.equal(model.snapshot().canContinue, true);
  assert.equal(model.continueStep().ok, true);
  assert.equal(model.snapshot().confirmed, true);
});

test('torso, joints, eyes, outside tray, wrong height and nonfinite points are rejected', () => {
  const model = createPinState(config());
  const cases = [
    ['forelimb-left', [0, -1.22, 0]], // torso
    ['forelimb-left', [-2.6, -1.22, 2.6]], // elbow, not distal target
    ['forelimb-left', [-0.86, -1.22, 3.05]], // projected eye
    ['forelimb-left', [-8, -1.22, 2.82]],
    ['forelimb-left', [-3.53, 0, 2.82]],
    ['forelimb-left', [NaN, -1.22, 2.82]],
    ['forelimb-left', [Infinity, -1.22, 2.82]],
    ['forelimb-left', [-3.53, -1.22]],
    ['forelimb-left', ['-3.53', -1.22, 2.82]],
    ['not-a-limb', [-3.53, -1.22, 2.82]],
  ];
  cases.forEach(([id, point]) => assert.equal(model.place(id, point).ok, false, String(point)));
  assert.equal(model.snapshot().count, 0);
  assert.equal(model.snapshot().history.length, 0);
  const edge = [-3.53 + 0.46, -1.22, 2.82];
  assert.equal(model.place('forelimb-left', edge).ok, true);
  assert.equal(model.place('forelimb-left', [edge[0] + 0.001, edge[1], edge[2]]).ok, false);
});

test('reposition, remove, undo and reset preserve exact anchors and relock Continue', () => {
  const model = createPinState(config());
  placeFour(model); model.continueStep();
  const point = [-3.41123456789, -1.22, 2.79321];
  assert.equal(model.place('forelimb-left', point).ok, true);
  assert.deepEqual(model.snapshot().anchors['forelimb-left'], point);
  assert.equal(model.snapshot().confirmed, false);
  model.undo();
  assert.deepEqual(model.snapshot().anchors['forelimb-left'], config().targets[0].center);
  model.remove('forelimb-left');
  assert.equal(model.snapshot().count, 3);
  assert.equal(model.continueStep().ok, false);
  model.undo();
  assert.equal(model.snapshot().count, 4);
  model.reset();
  assert.equal(model.snapshot().count, 0);
  assert.equal(model.snapshot().history.length, 0);
  assert.equal(model.undo().ok, false);
});

test('persistence restores exact valid anchors, confirmation and safe undo history', () => {
  const model = createPinState(config());
  placeFour(model);
  model.place('forelimb-left', [-3.41123456789, -1.22, 2.79321]);
  model.continueStep();
  const restored = createPinState(config(), model.serialize());
  assert.deepEqual(restored.snapshot(), model.snapshot());
  restored.undo();
  assert.deepEqual(restored.snapshot().anchors['forelimb-left'], config().targets[0].center);
  assert.equal(restored.snapshot().confirmed, false);
});

test('forged storage is rejected atomically, including hidden invalid undo history', () => {
  const model = createPinState(config()); placeFour(model); model.continueStep();
  const mutations = [
    (payload) => { payload.anchors['forelimb-left'] = [0, -1.22, 0]; },
    (payload) => { payload.anchors.skin = [0, -1.22, 0]; },
    (payload) => { payload.anchors['forelimb-left'][0] = null; },
    (payload) => { delete payload.anchors['hindlimb-left']; },
    (payload) => { payload.version = 99; },
    (payload) => { payload.specimenId = 'heart'; },
    (payload) => { payload.history = [{ anchors: { skin: [0, -1.22, 0] }, confirmed: false }]; },
  ];
  mutations.forEach((mutate) => {
    const payload = JSON.parse(model.serialize()); mutate(payload);
    const restored = createPinState(config(), JSON.stringify(payload)).snapshot();
    assert.equal(restored.count, 0);
    assert.equal(restored.confirmed, false);
    assert.ok(restored.restoreError);
  });
  assert.equal(createPinState(config(), '{broken').snapshot().count, 0);
  const changedConfig = config(); changedConfig.targets[0].center[0] -= 0.01;
  assert.equal(createPinState(changedConfig, model.serialize()).snapshot().count, 0);
});

test('invalid target configuration and duplicate limb IDs fail fast', () => {
  const cases = [
    (value) => { value.targets.pop(); },
    (value) => { value.targets[1].id = value.targets[0].id; },
    (value) => { value.targets[1].partId = value.targets[0].partId; },
    (value) => { value.targets[1].center = value.targets[0].center.slice(); },
    (value) => { value.targets[0].radius = -1; },
    (value) => { value.targets[0].center[1] = 0; },
    (value) => { value.tray.maxX = value.tray.minX; },
  ];
  cases.forEach((mutate) => { const value = config(); mutate(value); assert.throws(() => createPinState(value)); });
});

test('snapshot copies cannot forge completion or mutate anchors and history', () => {
  const model = createPinState(config()); placeFour(model);
  const exposed = model.snapshot();
  exposed.anchors['forelimb-left'][0] = 99;
  exposed.history[0].anchors.fake = [0, 0, 0];
  exposed.targets[0].center[0] = 99;
  exposed.confirmed = true;
  assert.equal(model.snapshot().confirmed, false);
  assert.equal(model.snapshot().anchors['forelimb-left'][0], -3.53);
  assert.equal(model.snapshot().targets[0].center[0], -3.53);
  assert.deepEqual(model.snapshot().history[0].anchors, {});
});

function engine(storage = null) {
  const scene = new THREE.Scene();
  const group = new THREE.Group(); scene.add(group);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 18, 0.01); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const data = config();
  const skin = { id: 'skin', name: 'Skin', layer: 0, system: 'integument', cuttable: true,
    mesh: new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshStandardMaterial()) };
  group.add(skin.mesh); skin.mesh.userData.partId = skin.id;
  const events = [], anchors = new Map();
  let disposed = false;
  const pinning = { ...data, setAnchor: (id, point) => anchors.set(id, point), update() {}, dispose() { disposed = true; } };
  const lab = createDissection(THREE, { scene, group, camera, parts: [skin], pinning,
    specimenId: 'frog', requiresPinning: true, pinStorage: storage, onEvent: (event) => events.push(event) });
  return { lab, scene, group, camera, events, anchors, get disposed() { return disposed; } };
}

test('engine cannot bypass prerequisites by mutating compatibility state or switching mode', () => {
  const value = engine();
  config().targets.forEach((target) => value.lab.state.pinned.add(target.id));
  assert.equal(value.lab.setTool('scalpel'), false);
  assert.equal(value.lab.canUseTool('forceps'), false);
  assert.equal(value.lab.continuePinning().ok, false);
  config().targets.forEach((target) => value.lab.guidePin(target.id));
  assert.equal(value.lab.canUseTool('scalpel'), false);
  value.lab.continuePinning();
  assert.equal(value.lab.canUseTool('scalpel'), true);
  value.lab.setMode('explore');
  assert.equal(value.lab.canUseTool('scalpel'), false);
  assert.equal(value.lab.canUseTool('forceps'), false);
  assert.equal(value.lab.canUseTool('probe'), true);
  assert.equal(value.lab.placePinAt('forelimb-left', [-3.4, -1.22, 2.82]).ok, false);
  value.lab.setMode('independent');
  assert.equal(value.lab.canUseTool('scalpel'), true);
  value.lab.state.incisions.set('skin', {});
  assert.equal(value.lab.undoPin().ok, false);
  assert.equal(value.lab.resetPins().ok, false);
  value.lab.dispose();
});

test('keyboard select, nudge and confirm share exactly the pointer validator', () => {
  const { lab } = engine();
  lab.setTool('pins');
  assert.equal(lab.selectPinTarget('forelimb-left').ok, true);
  assert.equal(lab.movePinPreview(0.1, -0.05).ok, true);
  assert.equal(lab.confirmPin().ok, true);
  assert.deepEqual(lab.pinning.anchors['forelimb-left'], [-3.4299999999999997, -1.22, 2.77]);
  lab.movePinPreview(2, 0);
  assert.equal(lab.confirmPin().ok, false);
  assert.equal(lab.pinning.count, 1);
  lab.undoPin();
  assert.equal(lab.pinning.count, 0);
  lab.dispose();
});

test('normalized tray ray rejects torso and projects anchors correctly under group transforms', () => {
  const value = engine();
  assert.equal(value.lab.projectPin(0.5, 0.5).valid, false);
  assert.equal(value.lab.projectPin(-0.5, 0.5), null);
  value.group.position.set(0.4, 0.5, -0.1);
  value.group.rotation.y = 0.15;
  value.group.scale.setScalar(0.8);
  value.group.updateMatrixWorld(true);
  const target = config().targets[0];
  const projected = new THREE.Vector3().fromArray(target.center).applyMatrix4(value.group.matrixWorld).project(value.camera);
  const nx = (projected.x + 1) / 2, ny = (1 - projected.y) / 2;
  const result = value.lab.projectPin(nx, ny);
  assert.equal(result.valid, true);
  target.center.forEach((coordinate, index) => assert.ok(Math.abs(result.position[index] - coordinate) < 1e-10));
  value.lab.setTool('pins');
  value.lab.update({ x: nx, y: ny, grip: 0, gripping: false, span: 0 }, 16);
  assert.ok(value.lab.contact);
  value.lab.update({ x: nx, y: ny, grip: 0.5, gripping: true, span: 0 }, 16);
  assert.equal(value.lab.pinning.count, 1);
  assert.equal(value.lab.pinning.targets[0].pinned, true);
  assert.deepEqual(value.anchors.get(target.id), value.lab.pinning.anchors[target.id]);
  assert.ok(value.group.getObjectByName('anchor-' + target.id));
  value.lab.dispose();
  assert.equal(value.disposed, true);
  assert.equal(value.group.getObjectByName('dissection-pins'), undefined);
});

test('preview events are change-driven and a valid save resumes without constructor events', () => {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key), setItem: (key, value) => memory.set(key, value) };
  const first = engine(storage);
  assert.equal(first.events.length, 0);
  first.lab.setTool('pins');
  for (let i = 0; i < 20; i++) first.lab.update({ x: 0.5, y: 0.5, grip: 0, gripping: false, span: 0 }, 16);
  assert.equal(first.events.filter((event) => event.kind === 'pin-preview').length, 1);
  for (let i = 0; i < 4; i++) first.lab.guidePin();
  first.lab.continuePinning();
  const second = engine(storage);
  assert.equal(second.events.length, 0);
  assert.equal(second.lab.pinning.confirmed, true);
  assert.deepEqual(second.lab.pinning.anchors, first.lab.pinning.anchors);
  first.lab.dispose(); second.lab.dispose();
});

test('storage failures do not prevent placement or falsely claim a saved session', () => {
  const { lab } = engine({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } });
  assert.equal(lab.guidePin().ok, true);
  assert.equal(lab.pinning.count, 1);
  assert.equal(lab.pinning.saveAvailable, false);
  lab.dispose();
});

function startTestIncision(value) {
  for (let i = 0; i < 4; i++) value.lab.guidePin();
  value.lab.continuePinning();
  assert.equal(value.lab.setTool('scalpel'), true);
  const drive = (x, gripping) => {
    const point = new THREE.Vector3(x, 0, 0).project(value.camera);
    value.lab.update({ x: (point.x + 1) / 2, y: (1 - point.y) / 2,
      grip: gripping ? 0.45 : 0, gripping, span: 0 }, 16);
  };
  drive(-0.65, true); drive(-0.25, true);
  assert.ok(value.scene.getObjectByName('incision-stroke'));
  return drive;
}

function watchMarkDisposal(mark) {
  const counts = { geometry: 0, material: 0 };
  mark.geometry.addEventListener('dispose', () => counts.geometry++);
  mark.material.addEventListener('dispose', () => counts.material++);
  return counts;
}

test('replacing a stroke releases its material and completed marks are disposed with the attempt', () => {
  const value = engine();
  const drive = startTestIncision(value);
  const intermediate = value.scene.getObjectByName('incision-stroke');
  const intermediateCounts = watchMarkDisposal(intermediate);
  drive(0.3, true);
  assert.equal(intermediate.parent, null);
  assert.deepEqual(intermediateCounts, { geometry: 1, material: 1 });
  drive(0.65, true); drive(0.65, false);
  assert.ok(value.lab.state.incisions.get('skin').length > 1.1);
  const completed = value.scene.getObjectByName('incision-stroke');
  const completedCounts = watchMarkDisposal(completed);
  value.lab.setTool('probe');
  assert.equal(completed.parent, value.scene, 'completed incision stays visible during this attempt');
  value.lab.dispose();
  assert.equal(completed.parent, null);
  assert.equal(value.scene.getObjectByName('incision-stroke'), undefined);
  assert.deepEqual(completedCounts, { geometry: 1, material: 1 });
  assert.deepEqual(intermediateCounts, { geometry: 1, material: 1 });
});

test('tool changes, mode changes and pin reset release an unfinished incision preview', () => {
  for (const cancel of [
    (lab) => lab.setTool('probe'),
    (lab) => lab.setMode('explore'),
    (lab) => lab.resetPins(),
  ]) {
    const value = engine();
    const drive = startTestIncision(value);
    const previewMark = value.scene.getObjectByName('incision-stroke');
    const counts = watchMarkDisposal(previewMark);
    cancel(value.lab);
    drive(0.65, false);
    assert.equal(value.scene.getObjectByName('incision-stroke'), undefined);
    assert.equal(value.lab.state.incisions.size, 0);
    assert.deepEqual(counts, { geometry: 1, material: 1 });
    value.lab.dispose();
    assert.deepEqual(counts, { geometry: 1, material: 1 });
  }
});
