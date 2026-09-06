/* Real production router; no camera permission or detector stub is needed to
   verify the tracker's published left/right-slot contract. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/lab/main.js'), 'utf8');
const router = source.slice(source.indexOf('function drivingHandSlot('), source.indexOf('/* ---- events from the dissection engine'));

function hand(x, y, gripping = false) {
  return { present: true, cursor: { x, y }, cursorS: { x, y }, isPinching: gripping,
    pinchStrength: gripping ? .95 : 0, span: .58, gesture: gripping ? 'pinch' : 'point', roll: 0 };
}
function fixture(slots) {
  const ctx = { handMode: true, handDrive: { slot: -1 }, hands: { snapshot: { active: true, health: 0, hands: slots } },
    input: { x: .5, y: .5, grip: 0, gripping: false, span: 0, source: 'mouse' }, mouse: { x: .1, y: .2, down: false },
    xr: null, controls: { enabled: true }, handViz: null, currentTool: 'scalpel', TCH: { claimed: -1 },
    performance, drawCursor() {}, dialReset() {}, flickReset() {}, detectToolFlick() { return 0; }, detectToolDial() { return 0; } };
  vm.createContext(ctx); vm.runInContext(router, ctx);
  return ctx;
}

for (const slot of [0, 1]) test(`an isolated ${slot ? 'right' : 'left'} hand aims and grips the tool`, () => {
  const hs = [{ present: false }, { present: false }]; hs[slot] = hand(.62, .39, true);
  const ctx = fixture(hs); ctx.routeInput();
  assert.equal(ctx.input.source, 'hand'); assert.equal(ctx.input.gripping, true);
  assert.equal(ctx.input.x, .62); assert.equal(ctx.input.y, .39); assert.equal(ctx.handDrive.slot, slot);
});

test('the active gripping hand stays stable when the other hand appears', () => {
  const ctx = fixture([{ present: false }, hand(.7, .5, true)]); ctx.routeInput();
  ctx.hands.snapshot.hands[0] = hand(.2, .3, true); ctx.routeInput();
  assert.equal(ctx.handDrive.slot, 1); assert.equal(ctx.input.x, .7);
});

test('two-hand retraction reads per-hand span, without a nonexistent top-level field', () => {
  const ctx = fixture([hand(.2, .3), hand(.7, .5)]); ctx.routeInput();
  assert.equal(ctx.input.span, .58); assert.equal(ctx.hands.snapshot.span, undefined);
  ctx.hands.snapshot.hands[1].present = false; ctx.routeInput(); assert.equal(ctx.input.span, 0);
});

test('switching hands releases at the previous contact before moving the tool', () => {
  const ctx = fixture([hand(.2, .3, true), hand(.7, .5)]); ctx.routeInput();
  ctx.hands.snapshot.hands[0].present = false; ctx.hands.snapshot.hands[1].isPinching = true;
  ctx.routeInput(); assert.equal(ctx.input.gripping, false); assert.equal(ctx.input.x, .2);
  ctx.routeInput(); assert.equal(ctx.input.gripping, true); assert.equal(ctx.input.x, .7);
});

test('tracking loss finishes a cut before mouse fallback, with no connector slash', () => {
  const ctx = fixture([hand(.6, .4, true)]); ctx.routeInput();
  ctx.hands.snapshot.hands[0].present = false;
  ctx.routeInput(); assert.equal(ctx.input.gripping, false); assert.equal(ctx.input.x, .6);
  ctx.routeInput(); assert.equal(ctx.input.source, 'mouse'); assert.equal(ctx.input.x, .1);
  assert.equal(ctx.controls.enabled, true);
});

test('switching ungripped hands discards old flick and wrist-dial history', () => {
  const ctx = fixture([hand(.2, .3), hand(.7, .5)]); ctx.routeInput();
  let flicks = 0, dials = 0;
  ctx.flickReset = () => flicks++; ctx.dialReset = () => dials++;
  ctx.hands.snapshot.hands[0].present = false; ctx.routeInput();
  assert.equal(ctx.handDrive.slot, 1); assert.equal(flicks, 1); assert.equal(dials, 1);
});

test('non-finite tracking data cannot drive a tool; off camera never consumes a snapshot', () => {
  const ctx = fixture([hand(NaN, .3), hand(.4, .6)]); ctx.routeInput();
  assert.equal(ctx.handDrive.slot, 1);
  ctx.handMode = false; ctx.routeInput(); assert.equal(ctx.input.source, 'mouse');
});

test('snapshot test entry uses the actual router and refuses to override a live camera', () => {
  assert.match(source, /feedHandSnapshot[\s\S]*?if \(handMode\) throw[\s\S]*?routeInput\(\);[\s\S]*?dissection\.update\(input, dt\)/);
});
