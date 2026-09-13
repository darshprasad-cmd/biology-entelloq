const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let THREE;
before(async () => { THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64')); });

class Surface {
  constructor() { this.listeners = new Map(); this.captured = new Set(); }
  addEventListener(k, fn) { if (!this.listeners.has(k)) this.listeners.set(k, new Set()); this.listeners.get(k).add(fn); }
  removeEventListener(k, fn) { this.listeners.get(k)?.delete(fn); }
  setPointerCapture(id) { this.captured.add(id); }
  hasPointerCapture(id) { return this.captured.has(id); }
  releasePointerCapture(id) { this.captured.delete(id); }
  emit(k, data = {}) { const e = { pointerType: 'touch', button: 0, pointerId: 1, clientX: 0, clientY: 0, preventDefault() { this.prevented = true; }, ...data }; this.listeners.get(k)?.forEach(fn => fn(e)); return e; }
}
function input(reduced = false) {
  const context = vm.createContext({ innerWidth: 1400, innerHeight: 900 });
  vm.runInContext('const KIT={clamp:(v,a,b)=>Math.max(a,Math.min(b,v))};' + fs.readFileSync(path.join(root, 'src/universe/core.js'), 'utf8'), context);
  const el = new Surface(), keyboard = new Surface(), deltas = [], jumps = [];
  const Z = { pos: 4, posTarget: 4, flingVel: 0, pxT: 0, pyT: 0 };
  let clock = 0;
  const dispose = context.bindUniverseInput(el, keyboard, Z, {
    count: 13, now: () => clock += 16, reduced: () => reduced, wake() {},
    nudge(d) { deltas.push(d); Z.posTarget = Math.max(0, Math.min(12, Z.posTarget + d)); },
    jumpTo(i, instant) { jumps.push([i, instant]); Z.posTarget = Z.pos = Math.max(0, Math.min(12, i)); Z.flingVel = 0; },
  });
  return { el, keyboard, Z, deltas, jumps, dispose };
}

test('spreading two fingers zooms inward exactly once, with no simultaneous drag', () => {
  const { el, deltas, Z } = input();
  el.emit('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
  el.emit('pointerdown', { pointerId: 2, clientX: 100, clientY: 200 });
  el.emit('pointermove', { pointerId: 2, clientX: 100, clientY: 250 });
  assert.equal(deltas.length, 1);
  assert.equal(deltas[0], Math.log(1.5) * 1.8);
  el.emit('pointerup', { pointerId: 2 });
  assert.equal(Z.flingVel, 0, 'pinch release does not fling');
  el.emit('pointermove', { pointerId: 1, clientX: 100, clientY: 99 });
  assert.equal(deltas[1], 0.009, 'remaining finger resumes from its own position');
});

test('third fingers and untracked releases do not reset the gesture', () => {
  const { el, deltas } = input();
  el.emit('pointerdown', { pointerId: 1, clientX: 0 });
  el.emit('pointerdown', { pointerId: 2, clientX: 100 });
  el.emit('pointerdown', { pointerId: 3, clientX: 200 });
  el.emit('pointermove', { pointerId: 3, clientY: 500 });
  el.emit('pointerup', { pointerId: 3 });
  assert.equal(deltas.length, 0);
  el.emit('pointermove', { pointerId: 2, clientX: 50 });
  assert.ok(deltas[0] < 0, 'two remaining tracked fingers still pinch out');
});

test('drag cancellation, lost capture, blur and teardown cannot leave momentum or listeners', () => {
  for (const end of ['pointercancel', 'lostpointercapture']) {
    const { el, Z } = input();
    el.emit('pointerdown', { clientY: 100 }); el.emit('pointermove', { clientY: 20 });
    el.emit(end); assert.equal(Z.flingVel, 0);
    const target = Z.posTarget; el.emit('pointermove', { clientY: 0 }); assert.equal(Z.posTarget, target);
  }
  const { el, keyboard, Z, dispose, deltas } = input();
  el.emit('pointerdown'); keyboard.emit('blur'); el.emit('pointermove', { clientY: -100 });
  assert.equal(deltas.length, 0); assert.equal(Z.flingVel, 0);
  dispose(); el.emit('wheel', { deltaY: 100 }); keyboard.emit('keydown', { key: 'End' });
  assert.equal(Z.pos, 4); assert.equal(deltas.length, 0);
});

test('trackpad spread, wheel modes and reduced motion have bounded consistent direction', () => {
  const { el, deltas, Z } = input(true);
  el.emit('wheel', { deltaY: -100, deltaMode: 0, ctrlKey: true });
  assert.ok(deltas[0] > 0); assert.equal(Z.flingVel, 0);
  el.emit('wheel', { deltaY: 1, deltaMode: 2 }); assert.ok(deltas[1] <= 0.9);
  el.emit('pointermove', { pointerType: 'mouse', clientX: 900, clientY: 900 });
  assert.equal(Z.pxT, 0); assert.equal(Z.pyT, 0);
  el.emit('pointerdown', { clientY: 100 }); el.emit('pointermove', { clientY: 0 }); el.emit('pointerup');
  assert.equal(Z.flingVel, 0);
});

test('keyboard shortcuts are immediate, prevent scrolling, and leave text fields alone', () => {
  const { keyboard, Z, jumps } = input();
  assert.equal(keyboard.emit('keydown', { key: 'ArrowUp' }).prevented, true);
  assert.equal(Z.pos, 4.5); assert.deepEqual(jumps[0], [4.5, true]);
  keyboard.emit('keydown', { key: 'End' }); assert.equal(Z.pos, 12);
  keyboard.emit('keydown', { key: 'Home' }); assert.equal(Z.pos, 0);
  keyboard.emit('keydown', { key: '0' }); assert.equal(Z.pos, 9);
  for (const data of [{ target: { tagName: 'SELECT' } }, { target: { isContentEditable: true } }, { ctrlKey: true }, { metaKey: true }]) {
    assert.equal(keyboard.emit('keydown', { key: 'Home', ...data }).prevented, undefined);
    assert.equal(Z.pos, 9);
  }
});

function kitContext() {
  const document = { createElement() { return { getContext() { return {
    createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; }, putImageData() {},
  }; } }; } };
  const context = vm.createContext({ THREE, document });
  vm.runInContext(fs.readFileSync(path.join(root, 'src/universe/kit.js'), 'utf8') + '\nthis.kit=KIT;', context);
  return context.kit;
}
test('stage fade disables depth occlusion and restores only authored opaque depth writing', () => {
  const KIT = kitContext(), group = new THREE.Group();
  const solid = KIT.surface(0x775544), translucent = KIT.glassy(0xabcdef), glow = KIT.additive(0xffaa44, 0.7);
  group.add(new THREE.Mesh(new THREE.BoxGeometry(), [solid, translucent, glow]));
  KIT.setGroupFade(group, 0.35);
  for (const material of [solid, translucent, glow]) assert.equal(material.depthWrite, false);
  assert.equal(solid.opacity, 0.35); assert.equal(glow.opacity, 0.7 * 0.35);
  KIT.setGroupFade(group, 1);
  assert.equal(solid.depthWrite, true); assert.equal(translucent.depthWrite, false); assert.equal(glow.depthWrite, false);
  KIT.setGroupFade(group, -1); assert.equal(solid.opacity, 0);
});

test('tissue defaults are restrained and roughness maps retain the authored finish', () => {
  const KIT = kitContext(), material = KIT.wet(0x93362c);
  assert.equal(material.emissive.getHex(), 0); assert.equal(material.emissiveIntensity, 0);
  assert.ok(material.clearcoat <= 0.3); assert.ok(material.roughness >= 0.6);
  assert.equal(material.roughnessMap.colorSpace, THREE.NoColorSpace);
  for (let i = 0; i < material.roughnessMap.image.data.length; i += 4) assert.ok(material.roughnessMap.image.data[i] >= 218);
  assert.equal(KIT.wet(0x93362c).roughnessMap, material.roughnessMap, 'cache prevents repeat allocation');
  const explicit = KIT.wet(0x93362c, { clear: 0.6, rough: 0.42, emissive: 0x112233, glow: 0.3 });
  assert.equal(explicit.roughness, 0.42); assert.equal(explicit.clearcoat, 0.6);
  assert.equal(explicit.emissive.getHex(), 0x112233); assert.equal(explicit.emissiveIntensity, 0.3);
});

test('organic displacement preserves shared seam positions and finite smooth geometry', () => {
  const KIT = kitContext(), geometry = new THREE.SphereGeometry(1, 24, 16);
  KIT.displace(geometry, 0.12, 2, 7);
  const pos = geometry.attributes.position;
  for (let y = 0; y <= 16; y++) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, y * 25), b = new THREE.Vector3().fromBufferAttribute(pos, y * 25 + 24);
    assert.ok(a.distanceTo(b) < 1e-6);
  }
  assert.ok([...pos.array, ...geometry.attributes.normal.array].every(Number.isFinite));
});
