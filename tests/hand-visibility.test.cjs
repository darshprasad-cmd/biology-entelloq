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

function element(text = '') {
  const classes = new Set();
  let writes = 0;
  return {
    style: {}, dataset: {}, attributes: {},
    get textContent() { return text; },
    set textContent(value) { text = value; writes++; },
    get writes() { return writes; },
    setAttribute(name, value) { this.attributes[name] = value; },
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
  assert.equal(ui.handBtn.textContent, 'Stop camera');
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
  const context = {
    handBox: element(), handBtn: element(), handPreview: element(),
    fire: (...args) => events.push(args),
  };
  vm.createContext(context);
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

test('phone preview can collapse without hiding stop or error status; motion preference is respected', () => {
  assert.match(css, /body\.bioq-phone #hand:not\(\.preview-open\) #selfwrap,/);
  assert.doesNotMatch(css, /#hand:not\(\.preview-open\) #hand(?:btn|stat)/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\s*#hand \*,#coach/);
});
