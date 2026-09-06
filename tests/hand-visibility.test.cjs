/* Shell-only contracts. These exercise rendering/event projection with a small
   DOM facade; camera hardware and geometric overlap need the browser check. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/lab/shell.js'), 'utf8');
const css = vm.runInNewContext(source.match(/export const SHELL_CSS = (`[\s\S]*?`);/)[1]);
const markup = source.slice(source.indexOf('  const handBox = el('), source.indexOf('  const coach = el('));
const render = source.slice(source.indexOf('  function renderHand()'), source.indexOf('  function setHandState(s)'));
const clicks = source.slice(source.indexOf('  let handOn = false;'), source.indexOf('  /* ── show-camera preference'));
const stateUpdates = source.slice(source.indexOf('  function setHandState(s)'), source.indexOf('  /* ── the phone ─', source.indexOf('  function setHandState(s)')));

function element(text = '') {
  const classes = new Set();
  let writes = 0;
  return {
    style: {}, dataset: {}, attributes: {}, listeners: {},
    get textContent() { return text; },
    set textContent(value) { text = value; writes++; },
    get writes() { return writes; },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.listeners[name] = callback; },
    focus() { this.focused = true; },
    classList: {
      toggle(name, force) {
        const next = force === undefined ? !classes.has(name) : force;
        if (next) classes.add(name); else classes.delete(name);
        return next;
      },
      contains: name => classes.has(name),
    },
  };
}

function renderer(phone = false) {
  const status = element('Camera off');
  const context = {
    H: { on: false, status: 'off', health: 3, gesture: 'none', grip: 0, count: 0, reason: '' },
    SH_PHONE: phone, GST: { none: { t: '—', k: 'dim' }, pinch: { t: 'Pinching', k: 'grip' } },
    handBox: element(), handBtn: element(), handStat: { querySelector: () => status },
    handCount: element(), gchip: element(), gripfill: element(), handNote: element(), status,
    handPreview: element(), selfview: { srcObject: null }, hideCoach() {}, startPoll() {}, stopPoll() {},
    fire() {},
  };
  vm.createContext(context);
  vm.runInContext(render, context);
  return context;
}

test('shell remains standalone assemblable JavaScript', () => {
  assert.doesNotThrow(() => new vm.Script(source.replace(/^export /gm, '')));
});

test('camera action and honest status precede optional live video', () => {
  assert.match(markup, /<section id="hand"[^>]*aria-label="Hand controls"/);
  assert.match(markup, /id="handbtn"[^>]*type="button"[^>]*aria-describedby="handnote"/);
  assert.match(markup, /id="handstat" role="status" aria-live="polite"/);
  assert.ok(markup.indexOf('id="handbtn"') < markup.indexOf('id="selfwrap"'));
  assert.ok(markup.indexOf('id="handstat"') < markup.indexOf('id="handlive"'));
  assert.match(css, /#handbtn\{[^}]*min-height:44px/);
  assert.match(css, /#handbtn:focus-visible/);
});

test('phone keeps the actual hand control in the bottom stack, without a second camera pathway', () => {
  assert.doesNotMatch(css, /body\.bioq-phone #hand\{display:none/);
  assert.match(css, /body\.bioq-phone #hand\{position:relative;[^}]*display:flex/);
  assert.match(source, /rail\.appendChild\(handBox\)/);
  assert.doesNotMatch(source, /Hand tracking is a desktop feature/);
  assert.match(source, /Prop your phone securely with its front camera facing you/);
  assert.doesNotMatch(source, /getUserMedia\(/);
  assert.match(css, /body\.bioq-phone #eqx-fab\{[^}]*top:[^}]*bottom:auto/);
});

test('off, starting, tracking, and failed states keep the primary action and status honest', () => {
  const ui = renderer();
  ui.renderHand();
  assert.equal(ui.handBtn.textContent, 'Use my hands');
  assert.equal(ui.status.textContent, 'Camera off');
  assert.equal(ui.status.writes, 0);
  Object.assign(ui.H, { on: true, status: 'starting' });
  ui.renderHand();
  assert.equal(ui.status.textContent, 'Starting camera…');
  assert.equal(ui.handBtn.textContent, 'Stop');
  assert.equal(ui.handBtn.attributes['aria-label'], 'Stop camera');
  assert.equal(ui.handBox.classList.contains('compact'), true);
  Object.assign(ui.H, { status: 'tracking', health: 0, count: 2, gesture: 'pinch', grip: .8 });
  ui.renderHand();
  assert.equal(ui.handCount.textContent, '2 hands');
  assert.equal(ui.gchip.textContent, 'Pinching');
  assert.equal(ui.gripfill.style.transform, 'scaleX(0.800)');
  const changedWrites = ui.status.writes;
  ui.renderHand();
  assert.equal(ui.status.writes, changedWrites, 'identical frame must not reannounce the status');
  Object.assign(ui.H, { on: false, status: 'failed', reason: 'Camera permission denied' });
  ui.renderHand();
  assert.equal(ui.status.textContent, 'Camera permission denied');
  assert.equal(ui.handBtn.textContent, 'Use my hands');
  assert.equal(ui.handBox.classList.contains('live'), false);
});

test('phone guidance names supported setup, performance limits and touch fallback', () => {
  for (const on of [false, true]) {
    const ui = renderer(true);
    ui.H.on = on;
    ui.renderHand();
    assert.match(ui.handNote.textContent, /Prop your phone up/);
    assert.match(ui.handNote.textContent, /performance varies/);
    assert.match(ui.handNote.textContent, /Touch still works/);
  }
});

test('preview disclosure changes only presentation, and camera starts only via original hands event', () => {
  const events = [];
  const context = renderer();
  context.fire = (...args) => events.push(args);
  vm.runInContext(clicks, context);
  assert.equal(events.length, 0, 'no camera request on mount');
  context.handPreview.onclick();
  assert.equal(context.handPreview.attributes['aria-expanded'], 'true');
  assert.equal(context.handBox.classList.contains('preview-open'), true);
  context.handPreview.onclick();
  assert.equal(context.handPreview.attributes['aria-expanded'], 'false');
  assert.equal(context.handBox.classList.contains('preview-open'), false);
  assert.equal(events.length, 0, 'preview must not request camera');
  context.handBtn.onclick();
  context.handBtn.onclick();
  assert.deepEqual(events, [['hands', true], ['hands', false]]);
});

test('active settings collapse only at session boundaries, not on repeated tracking updates', () => {
  const ui = renderer();
  vm.runInContext(clicks + stateUpdates, ui);
  ui.setHandState({ on: true, status: 'starting' });
  assert.equal(ui.handBox.classList.contains('compact'), true);
  ui.handPreview.onclick();
  assert.equal(ui.handBox.classList.contains('preview-open'), true);
  for (let i = 0; i < 20; i++) ui.setHandState({ on: true, status: 'tracking', health: i % 4, grip: i / 20 });
  assert.equal(ui.handBox.classList.contains('preview-open'), true);
  assert.equal(ui.handBox.classList.contains('compact'), false);
  assert.equal(ui.handBtn.textContent, 'Stop camera');
  ui.handPreview.onclick();
  ui.setHandState({ on: true, status: 'tracking', health: 3 });
  assert.equal(ui.handBox.classList.contains('compact'), true);
  assert.equal(ui.status.textContent, 'No hand detected');
  ui.setHandState({ on: false, reason: 'Camera permission denied' });
  assert.equal(ui.handBox.classList.contains('compact'), false);
  assert.equal(ui.handPreview.attributes['aria-expanded'], 'false');
  assert.equal(ui.status.textContent, 'Camera permission denied');
  ui.setHandState({ on: true, status: 'starting' });
  assert.equal(ui.handBox.classList.contains('compact'), true);
});

test('Escape closes hand settings instantly and returns focus to Settings without stopping tracking', () => {
  const ui = renderer();
  const events = [];
  ui.fire = (...args) => events.push(args);
  vm.runInContext(clicks + stateUpdates, ui);
  ui.setHandState({ on: true, status: 'tracking', health: 0 });
  ui.handPreview.onclick();
  let prevented = false, stopped = false;
  ui.handBox.listeners.keydown({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  assert.ok(prevented && stopped);
  assert.equal(ui.handPreview.focused, true);
  assert.equal(ui.handBox.classList.contains('compact'), true);
  assert.equal(ui.H.on, true);
  assert.deepEqual(events, []);
});

test('disabled camera picture removes the preview plate entirely and retains settings access', () => {
  assert.match(css, /#hand #selfwrap\.nocam\{display:none\}/);
  assert.match(css, /#hand\.live\.preview-open #selfwrap:not\(\.nocam\)\{display:block\}/);
  assert.match(css, /#handpreview\{[^}]*min-height:44px/);
  assert.match(css, /#cambtn\{width:44px;height:44px/);
  assert.doesNotMatch(stateUpdates, /showCoach\(/);
});

test('render-rate meter follows the selected router slot and falls back without changing selection', () => {
  const helper = source.slice(source.indexOf('  function getDrivingHand(snap)'), source.indexOf('  function clearSkel()'));
  const ctx = { window: { __LAB: { drivingHandSlot: 1 } } };
  vm.createContext(ctx); vm.runInContext(helper, ctx);
  const left = { present: true, pinchStrength: .1 }, right = { present: true, pinchStrength: .9 };
  const snap = { hands: [left, right] };
  assert.equal(ctx.getDrivingHand(snap), right);
  assert.equal(ctx.window.__LAB.drivingHandSlot, 1);
  right.present = false;
  assert.equal(ctx.getDrivingHand(snap), left);
  assert.equal(ctx.window.__LAB.drivingHandSlot, 1, 'presentation must not mutate the router slot');
  delete ctx.window.__LAB;
  left.present = false; right.present = true;
  assert.equal(ctx.getDrivingHand(snap), right);
  right.present = false;
  assert.equal(ctx.getDrivingHand(snap), null);
  assert.equal(ctx.getDrivingHand(null), null);
  assert.match(source, /const driver = getDrivingHand\(snap\)/);
});

test('phone preview can collapse without hiding stop or error status; motion preference is respected', () => {
  assert.match(css, /body\.bioq-phone #hand:not\(\.preview-open\) #selfwrap,/);
  assert.doesNotMatch(css, /#hand:not\(\.preview-open\) #hand(?:btn|stat)/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\s*#hand \*,#coach/);
});

function objectiveFixture(id, index = 0) {
  const definition = source.slice(source.indexOf('const OBJECTIVES = '), source.indexOf('export function buildShell(root)'));
  const tools = source.slice(source.indexOf('const SHELL_TOOLS = '), source.indexOf('/* Teaching level.'));
  const refresh = source.slice(source.indexOf('  function refreshObjective(state)'), source.indexOf('  function pushEvent(evt)'));
  const labels = {};
  const ctx = { spec: { id }, objIdx: index, seen: new Set(), SH_PHONE: false,
    objBar: { querySelectorAll: () => [], querySelector: name => labels[name] || (labels[name] = {}) },
    hint: {}, objHint: {}, pushEvent() {} };
  vm.createContext(ctx); vm.runInContext(tools + definition + refresh, ctx);
  return { ctx, labels, state: { pinned: new Set(), incisions: new Map(), opened: new Set(), removed: new Set() } };
}

test('frog guide keeps eight steps and cannot skip fascia or identify organs behind peritoneum', () => {
  const { ctx, labels, state } = objectiveFixture('frog', 2);
  assert.equal(vm.runInContext('OBJECTIVES.frog.length', ctx), 8);
  state.opened.add('skin'); state.removed.add('skin');
  ctx.refreshObjective(state);
  assert.equal(ctx.objIdx, 2, 'removing only skin must not advance past the fascia');
  assert.match(labels['#objtxt'].innerHTML, /subcutaneous fascia/);
  state.opened.add('subcutaneous-fascia');
  ctx.refreshObjective(state);
  assert.equal(ctx.objIdx, 2, 'both covering layers must be removed, not merely started');
  state.removed.add('subcutaneous-fascia');
  ctx.refreshObjective(state);
  assert.equal(ctx.objIdx, 3);
  state.incisions.set('muscle-wall', { length: 2 });
  state.opened.add('muscle-wall'); state.removed.add('muscle-wall');
  ctx.refreshObjective(state);
  assert.equal(ctx.objIdx, 4, 'an intact peritoneum must hold the guide before Identify');
  assert.match(labels['#objtxt'].innerHTML, /parietal peritoneum/);
  state.opened.add('parietal-peritoneum');
  ctx.refreshObjective(state);
  assert.equal(ctx.objIdx, 5);
  assert.match(labels['#objtxt'].innerHTML, /Identify/);
});

test('heart guide does not advance while either covering layer remains unopened', () => {
  const { ctx, labels, state } = objectiveFixture('heart');
  state.incisions.set('pericardium', { length: 2 });
  ctx.refreshObjective(state);
  assert.equal(ctx.objIdx, 0);
  state.opened.add('pericardium');
  ctx.refreshObjective(state);
  assert.equal(ctx.objIdx, 0, 'pericardium alone does not expose the underlying heart wall');
  assert.match(labels['#objtxt'].innerHTML, /epicardium/);
  state.opened.add('epicardium');
  ctx.refreshObjective(state);
  assert.equal(ctx.objIdx, 1);
});

test('legacy species hints use the actual dock numbers instead of reversed shortcuts', () => {
  const { ctx, state } = objectiveFixture('registered');
  ctx.SPECIMEN_OBJECTIVES = { registered: [{ text: 'Open the surface',
    hint: 'Scalpel (3), then Forceps (2). Pins (4).', done: () => false }] };
  ctx.refreshObjective(state);
  assert.equal(ctx.hint.innerHTML, 'Scalpel (2), then Forceps (3). Pins (4).');
});
