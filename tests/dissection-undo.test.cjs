const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { loadRealPreparedFrog } = require('./helpers/real-prepared-frog.cjs');
let modules;
before(async () => { modules = await loadRealPreparedFrog(); });
after(() => modules?.loaded.dispose());

function session() {
  const { THREE } = modules, f = modules.fixture('frog', true);
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 100);
  camera.position.set(0, 30, .01); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const rest = new Map(f.parts.map(p => [p.id, p.mesh.geometry.attributes.position.array.slice()]));
  const cuts = modules.createCutting(THREE, f.scene), soft = modules.createSoftBody(THREE, f.parts), events = [];
  const open = (part, points) => cuts.open({ partId: part.id, mesh: part.mesh, points,
    rest: rest.get(part.id), system: part.system, depth: .55, amount: .62 });
  let api;
  api = modules.createDissection(THREE, { ...f, camera, requiresPinning: true,
    captureAction: id => ({ cut: cuts.snapshot(id) }),
    restoreAction: (id, saved) => { soft.settle(id); cuts.restore(id, saved?.cut, rest.get(id)); },
    onCutProgress: (part, points) => cuts.has(part.id) ? cuts.grow(part.id, points) : open(part, points),
    onEvent: e => {
      events.push(e);
      if (e.kind === 'incise' && !e.meta.refused) open(f.parts.find(p => p.id === e.partId), api.state.incisions.get(e.partId).points);
      if (e.kind === 'peel') { cuts.releaseSurface(e.partId); cuts.remove(e.partId); }
    },
  });
  const screen = point => { const p = point.clone().project(camera); return { x: (p.x + 1) / 2, y: (1 - p.y) / 2 }; };
  const act = (p, gripping, dt = 16) => {
    f.scene.updateMatrixWorld(true);
    api.update({ ...p, gripping, grip: gripping ? .7 : 0, span: 0 }, dt);
    soft.update(dt); cuts.update(dt);
  };
  const target = id => {
    f.scene.updateMatrixWorld(true);
    const mesh = f.parts.find(p => p.id === id).mesh, pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 700))) {
      const p = screen(mesh.localToWorld(new THREE.Vector3().fromBufferAttribute(pos, i)));
      if (api.pick(p.x, p.y)?.object === mesh) return p;
    }
    assert.fail('no visible target for ' + id);
  };
  function pinAll() {
    api.setTool('pins');
    for (const id of ['forelimb-left', 'forelimb-right', 'hindlimb-left', 'hindlimb-right']) {
      const p = target(id); act(p, true); act(p, false);
    }
  }
  function cut(x = 0, z0 = -2, z1 = 1.5, id = 'skin') {
    api.setTool('scalpel');
    const mesh = f.parts.find(p => p.id === id).mesh;
    if (id !== 'skin') {
      // Find an actual contiguous tool-accessible path; the abdominal vein can
      // legitimately intercept the precise muscle midline.
      f.scene.updateMatrixWorld(true); mesh.geometry.computeBoundingBox();
      const box = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
      const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
      let path;
      search: for (const axis of ['z', 'x']) for (const side of [0, -.2, .2, -.35, .35]) {
        const other = axis === 'z' ? 'x' : 'z'; let run = [];
        for (let i = 0; i < 31; i++) {
          const world = center.clone(); world[axis] += size[axis] * (-.4 + .8 * i / 30); world[other] += size[other] * side;
          const p = screen(world), hit = api.pick(p.x, p.y);
          if (hit?.object === mesh) {
            run.push({ p, point: hit.point.clone() });
            if (run.length >= 6 && run[0].point.distanceTo(hit.point) > 1.5) { path = run; break search; }
          } else run = [];
        }
      }
      assert.ok(path, 'an exposed path through ' + id);
      act(path[0].p, false); for (const { p } of path) act(p, true); act(path.at(-1).p, false);
      assert.ok(api.state.incisions.get(id)?.length > 1.1, id + ' is cuttable after exposure');
      return;
    }
    const ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0).transformDirection(mesh.matrixWorld);
    let last;
    for (let z = z0; z <= z1; z += .2) {
      ray.set(mesh.localToWorld(new THREE.Vector3(x, 10, z)), down);
      const hit = ray.intersectObject(mesh, false)[0];
      if (hit) { last = screen(hit.point); act(last, true); }
    }
    assert.ok(last); act(last, false);
    assert.ok(api.state.incisions.get(id)?.length > 1.1, id + ' is cuttable after exposure');
  }
  function peel(id = 'skin') {
    api.setTool('forceps'); act(target(id), false);
    const start = target(id), end = { x: start.x + .24, y: start.y };
    act(start, true); act(end, true, 140); act(end, false, 140);
    assert.ok(api.state.removed.has(id), 'deliberate pull removes ' + id);
  }
  return { ...f, THREE, camera, rest, api, cuts, soft, events, act, target, screen, pinAll, cut, peel,
    close() { api.dispose(); cuts.dispose(); soft.dispose(); f.dispose(); } };
}

function assertFinite(mesh) {
  for (const attr of Object.values(mesh.geometry.attributes)) assert.ok(attr.array.every(Number.isFinite));
  if (mesh.geometry.index) assert.ok(mesh.geometry.index.array.every(i => i < mesh.geometry.attributes.position.count));
}

function assertClearCavity(s) {
  s.scene.updateMatrixWorld(true);
  const mesh = s.parts.find(p => p.id === 'skin').mesh, residual = s.group.getObjectByName('uncut:skin');
  assert.ok(residual?.userData.accessWindow.preparedFrog, 'prepared frog keeps its authored PR14 window');
  const optical = new s.THREE.Mesh(residual.geometry, residual.material); optical.matrixWorld.copy(residual.matrixWorld);
  const ray = new s.THREE.Raycaster(), down = new s.THREE.Vector3(0, -1, 0).transformDirection(mesh.matrixWorld);
  for (const x of [-1, -.5, 0, .5, 1]) for (const z of [-3.2, -2.7, -2, -1, 0, 1, 2, 2.9]) {
    ray.set(mesh.localToWorld(new s.THREE.Vector3(x, 10, z)), down);
    const hit = ray.intersectObject(optical, false)[0];
    assert.ok(!hit || mesh.worldToLocal(hit.point.clone()).y <= -.0249, `clear at ${x}, ${z}`);
  }
  assertFinite(residual);
}

test('actual prepared frog: undo removes one pin, restores removed skin + incision, then restores intact topology', () => {
  const s = session(), skin = s.parts.find(p => p.id === 'skin').mesh;
  const geometry = skin.geometry, material = skin.material, texture = material.map;
  const index = geometry.index, normals = geometry.attributes.normal.array.slice(), drawRange = { ...geometry.drawRange };
  const deeper = s.parts.filter(p => p.layer > 0).map(p => [p.id, p.mesh.visible]);
  try {
    assert.equal(s.api.canUndo, false); s.pinAll();
    assert.equal(s.api.historyDepth, 4); assert.equal(s.api.state.pinned.size, 4);
    assert.ok(s.api.undo()); assert.equal(s.api.state.pinned.size, 3);
    assert.equal(s.scene.getObjectByName('dissection-pins').children.length, 3);
    // A held contact after undo cannot repin itself until a neutral packet arrives.
    const pin = s.target('hindlimb-right'); s.act(pin, true); assert.equal(s.api.state.pinned.size, 3);
    s.act(pin, false); s.act(pin, true); s.act(pin, false); assert.equal(s.api.state.pinned.size, 4);
    s.cut(); const incision = s.api.state.incisions.get('skin'), cutFaces = geometry.drawRange.count;
    assert.ok(cutFaces < index.count); s.peel(); assertClearCavity(s);
    assert.equal(skin.visible, false); assert.equal(s.api.state.maxLayerRevealed, 1);
    assert.ok(s.api.undo());
    assert.equal(skin.visible, true); assert.equal(s.api.state.removed.has('skin'), false);
    assert.equal(s.api.state.opened.has('skin'), false); assert.equal(s.api.state.maxLayerRevealed, 0);
    assert.equal(s.api.state.incisions.get('skin').opened, false);
    assert.deepEqual(s.api.state.incisions.get('skin').points, incision.points);
    assert.ok(s.cuts.has('skin')); assert.equal(geometry.drawRange.count, cutFaces);
    assert.equal(s.group.getObjectByName('uncut:skin'), undefined, 'no retained backing left behind the restored sheet');
    assert.deepEqual(s.parts.filter(p => p.layer > 0).map(p => [p.id, p.mesh.visible]), deeper);
    assert.equal(skin.geometry, geometry); assert.equal(skin.material, material); assert.equal(material.map, texture);
    assertFinite(skin);
    // Repeat forceps after restoration; there must be one clear access window,
    // never a second residual or the old oblique/pelvic obstruction.
    s.peel(); assertClearCavity(s); assert.ok(s.api.undo());
    assert.ok(s.api.undo());
    assert.equal(s.api.state.incisions.size, 0); assert.equal(skin.userData.peelable, undefined);
    assert.equal(s.cuts.count, 0); assert.equal(geometry.index, index); assert.deepEqual(geometry.drawRange, drawRange);
    assert.deepEqual(geometry.attributes.position.array, s.rest.get('skin'));
    assert.deepEqual(geometry.attributes.normal.array, normals, 'authored scanned normals restored exactly');
    assert.equal(s.api.state.pinned.size, 4, 'earlier pins survive both undos');
    assertFinite(skin);
  } finally { s.close(); }
});

test('undo during a live incision cancels its preview and keeps earlier action history', () => {
  const s = session(), mesh = s.parts.find(p => p.id === 'skin').mesh, index = mesh.geometry.index;
  try {
    s.pinAll(); s.api.setTool('scalpel');
    for (const z of [-1.2, -.6, 0, .6]) s.act(s.screen(mesh.localToWorld(new s.THREE.Vector3(0, 2, z))), true);
    assert.ok(s.cuts.has('skin')); assert.equal(s.api.historyDepth, 4);
    assert.ok(s.api.undo()); assert.equal(s.cuts.count, 0); assert.equal(mesh.geometry.index, index);
    assert.equal(s.api.state.incisions.size, 0); assert.equal(s.api.historyDepth, 4);
    assert.equal(s.api.state.pinned.size, 4); assertFinite(mesh);
  } finally { s.close(); }
});

test('Undo retains a system visibility preference changed after the saved action', () => {
  const s = session();
  try {
    s.pinAll();
    const hidden = s.parts.filter(p => p.system === 'integument');
    assert.ok(hidden.some(p => p.mesh.visible), 'the preference hides currently visible anatomy');
    for (const part of hidden) { part.mesh.userData.sysHidden = true; part.mesh.visible = false; }
    assert.ok(s.api.undo());
    assert.equal(s.api.state.pinned.size, 3, 'the actual pin action is still reversed');
    for (const part of hidden) {
      assert.equal(part.mesh.userData.sysHidden, true);
      assert.equal(part.mesh.visible, false, part.id + ' remains hidden after Undo');
    }
  } finally { s.close(); }
});

test('all four frog access layers restore independently and can be removed again without old residuals', () => {
  const s = session();
  try {
    s.pinAll();
    for (const id of ['skin', 'subcutaneous-fascia', 'muscle-wall', 'parietal-peritoneum']) {
      const mesh = s.parts.find(p => p.id === id).mesh, level = s.api.state.maxLayerRevealed;
      const olderResiduals = s.group.children.filter(o => o.name.startsWith('uncut:'));
      s.act(s.target(id), false); s.cut(0, -2, 1.5, id); s.peel(id);
      assert.equal(s.api.state.maxLayerRevealed, level + 1);
      assert.ok(s.api.undo()); assert.equal(s.api.state.maxLayerRevealed, level);
      assert.equal(mesh.visible, true); assert.ok(s.cuts.has(id)); assert.equal(s.api.state.removed.has(id), false);
      assert.equal(s.group.getObjectByName('uncut:' + id), undefined);
      for (const older of olderResiduals) assert.equal(s.group.getObjectByName(older.name), older, 'earlier removed layers stay removed');
      assertFinite(mesh); s.peel(id);
      assert.equal(s.api.state.maxLayerRevealed, level + 1);
      assert.equal(s.group.children.filter(o => o.name === 'uncut:' + id).length, /fascia|peritoneum/.test(id) ? 0 : 1);
      assertClearCavity(s);
    }
    assert.equal(s.api.state.maxLayerRevealed, 4);
  } finally { s.close(); }
});

test('a replacement incision undoes to its exact earlier path; history stays bounded and clearHistory creates a boundary', () => {
  const s = session();
  try {
    s.pinAll(); s.cut(-.6, -2, .5);
    const first = s.api.state.incisions.get('skin'), saved = s.cuts.snapshot('skin');
    s.cut(.6, -1, 1.5); assert.ok(s.api.undo());
    assert.deepEqual(s.api.state.incisions.get('skin').points, first.points);
    assert.deepEqual(s.cuts.snapshot('skin').local, saved.local);
    for (let i = 0; i < 28; i++) { s.act(s.target('skin'), false); s.cut(i % 2 ? -.6 : .6, -1, 1.5); }
    assert.ok(s.api.historyDepth <= 24);
    s.api.clearHistory(); assert.equal(s.api.historyDepth, 0); assert.equal(s.api.canUndo, false);
    assert.equal(s.api.undo(), false); assert.ok(s.api.state.incisions.has('skin'));
  } finally { s.close(); }
});

test('main Undo gate and shortcut preserve typing and wait for camera/specimen/inspection ownership', () => {
  const main = fs.readFileSync(path.join(__dirname, '../src/lab/main.js'), 'utf8');
  const undo = main.slice(main.indexOf('function canUndoAction()'), main.indexOf('/* ---- contextual depth'));
  const key = main.slice(main.indexOf('function onKey(e)'), main.indexOf('\nexport function startApp'));
  const context = { dissection: { canUndo: true, undoLabel: 'pin', undo: () => { context.undone++; return true; } },
    undone: 0, specimenAbort: null, handStartPromise: null, imaging: null, histology: null, zoomverse: null,
    shell: { inputOpen: () => false, setUndoState() {}, setStructure() {}, say() {} }, blood: null, mouse: { down: true },
    TCH: { claimed: 1 }, input: { gripping: true, grip: 1, span: .4 }, specimenGripRelease: false,
    dialReset() {}, flickReset() {} };
  vm.createContext(context); vm.runInContext(undo + '\n' + key, context);
  for (const owner of ['specimenAbort', 'handStartPromise']) {
    context[owner] = {}; assert.equal(context.canUndoAction(), false); assert.equal(context.undoAction(), false); context[owner] = null;
  }
  context.imaging = { mode: () => 'ct' }; assert.equal(context.undoAction(), false); context.imaging = null;
  let prevented = 0;
  for (const tagName of ['INPUT', 'TEXTAREA']) context.onKey({ key: 'z', ctrlKey: true, target: { tagName }, preventDefault() { prevented++; } });
  assert.equal(context.undone, 0);
  for (const modifier of ['ctrlKey', 'metaKey']) context.onKey({ key: 'z', [modifier]: true, target: {}, preventDefault() { prevented++; } });
  assert.equal(context.undone, 2); assert.equal(prevented, 2); assert.equal(context.mouse.down, false);
  assert.equal(context.TCH.claimed, -1); assert.equal(context.input.gripping, false); assert.equal(context.specimenGripRelease, true);
});

test('organ extraction, divided attachments and physiology damage retire older tissue snapshots', () => {
  const main = fs.readFileSync(path.join(__dirname, '../src/lab/main.js'), 'utf8');
  const code = main.slice(main.indexOf('function onEvent(evt)'), main.indexOf('/* ---- per-action undo'));
  const context = { dissection: { clearHistory: () => context.boundaries++, state: {}, hovered: null }, boundaries: 0,
    shell: { pushEvent() {}, say() {} }, narrator: null, soft: null, cutting: null, blood: null,
    physio: null, xr: null, sfx: null, strata: null, tutor: null };
  vm.createContext(context); vm.runInContext(code, context);
  for (const event of [{ kind: 'lift' }, { kind: 'sever' }, { kind: 'damage', tetherId: 'mesentery' },
    { kind: 'damage', meta: { physio: 'sever' } }]) context.onEvent({ meta: {}, ...event });
  assert.equal(context.boundaries, 4);
  context.onEvent({ kind: 'peel', meta: {} }); context.onEvent({ kind: 'pin', meta: {} });
  assert.equal(context.boundaries, 4, 'normal access-layer work retains Undo');
});
