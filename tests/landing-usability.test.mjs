import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8').replace(/\r\n/g, '\n');
const script = id => html.match(new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`))[1];
const digest = text => crypto.createHash('sha256').update(text).digest('hex');

function node() {
  return {
    value: '', innerHTML: '', textContent: '', children: [], attributes: {}, events: {}, dataset: {}, disabled: false,
    addEventListener(type, fn) { this.events[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
    append(...children) { this.children.push(...children); },
    replaceChildren() { this.children = []; },
    focus(options) { this.focused = true; this.focusOptions = options; },
    scrollIntoView(options) { this.scrollOptions = options; },
    getBoundingClientRect() { return { width: 0, height: 0, left: 0, top: 0 }; },
    classList: { add() {}, remove() {}, toggle() {} },
  };
}

function environment({ reduced = false, context = {}, savedMotion = null } = {}) {
  const nodes = new Map(), callbacks = new Map(), globals = {}, stores = new Map();
  const get = id => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  get('pe-substrate').value = '1';
  get('pe-orbit-canvas').getContext = () => context;
  get('bio-search').showModal = function() { this.open = true; };
  get('bio-search').close = function() { this.open = false; };
  const styles = new Map();
  get('bio-welcome').style = { setProperty(key, value) { styles.set(key, value); } };
  get('bio-welcome').getBoundingClientRect = () => ({ width: 100, height: 100, left: 0, top: 0 });
  if (savedMotion) stores.set('bioq_landing_motion', savedMotion);
  const preference = { matches: reduced, addEventListener(type, fn) { this.change = fn; } };
  const document = {
    hidden: false, events: {},
    getElementById: get,
    querySelector: selector => get(selector),
    querySelectorAll: () => [],
    createElement: () => node(),
    addEventListener(type, fn) { this.events[type] = fn; },
  };
  let nextFrame = 0;
  const sandbox = vm.createContext({
    document, innerHeight: 800, devicePixelRatio: 1,
    matchMedia: query => query.includes('prefers-reduced-motion') ? preference : { matches: true },
    requestAnimationFrame(fn) { const id = ++nextFrame; callbacks.set(id, fn); return id; },
    cancelAnimationFrame(id) { callbacks.delete(id); },
    addEventListener(type, fn) { globals[type] = fn; },
    localStorage: { getItem: key => stores.get(key), setItem: (key, value) => stores.set(key, value) },
  });
  return { get, document, sandbox, callbacks, preference, globals, stores, styles };
}

test('cinematic landing has a keyboard main target, actual entry routes and native disclosures', () => {
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<\/main>/g) || []).length, 1);
  assert.match(html, /<a class="pe-skip" href="#pe-main">Skip to content<\/a>/);
  assert.match(html, /<main id="pe-main" tabindex="-1">/);
  assert.equal((html.match(/<a class="bio-teaser"/g) || []).length, 4);
  assert.equal((html.match(/<details><summary>/g) || []).length, 4);
  assert.match(html, /<div data-bioq-account><\/div>/);
  assert.doesNotMatch(html, /500K|Watch the Film|Real Research\. Real Data/);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  const routes = new Set(['home', 'learn', 'lessons', 'reason', 'labs', 'solve', 'explore', 'me', 'about', 'lab', 'universe']);
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (href.startsWith('#')) assert.ok(ids.has(href.slice(1)), `Missing anchor ${href}`);
    if (href.startsWith('app.html#')) assert.ok(routes.has(href.split('#')[1]), `Unknown route ${href}`);
  }
  assert.match(html, /href="app.html\?tutorial=dissection"/);
  for (const name of ['dna-hero', 'cells', 'leaf', 'neurons', 'wing']) {
    assert.ok(fs.existsSync(new URL(`assets/biology-${name}.webp`, root)));
    assert.ok(html.includes(`assets/biology-${name}.webp`));
  }
});

test('shared atmosphere, authentication and ecosystem navigation retain their deployed implementations', () => {
  // Frozen from the pre-redesign Biology main tree; only newline conventions are normalized.
  assert.equal(digest(script('atmo-js')), '4b0b2ab59cac6a1dca6d7ee98e3a9dc075b385b373adb6bcb2fa1f03186694c8');
  assert.equal(digest(script('auth-js')), '223931103e78d278e187b66f8c222014306d7707a4a39c254cc0ed62ce12d83e');
  const switcher = html.match(/<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:START -->[\s\S]*?<!-- ENTELLOQ-ECOSYSTEM-SWITCHER:END -->/)[0];
  assert.equal(digest(switcher), '89543835a17307f5c8e7e9488f426c12312e841e221a33b1b68be88b3caf7f84');
});

test('enzyme slider reports zero without substrate, half maximum at Km, and saturation at high concentration', () => {
  const e = environment();
  vm.runInContext(script('biology-landing-experiment'), e.sandbox);
  const slider = e.get('pe-substrate');
  assert.equal(e.get('.pe-orbit-fallback').attributes.hidden, '', 'Hide the SVG using its attribute so it is removed from the accessibility tree');
  for (const [substrate, percentage, state] of [[0, '0.0', 'NO SUBSTRATE'], [1, '50.0', 'HALF THE MAXIMUM'], [10, '90.9', 'APPROACHING SATURATION']]) {
    slider.value = String(substrate);
    slider.events.input();
    assert.ok(e.get('pe-rate').innerHTML.startsWith(percentage + ' '));
    assert.ok(e.get('pe-enzyme-state').textContent.includes(state));
    assert.ok(slider.attributes['aria-valuetext'].includes(percentage + ' percent'));
  }
});

test('enzyme pause, visibility and reduced-motion preferences stop scheduled animation', () => {
  const e = environment();
  vm.runInContext(script('biology-landing-experiment'), e.sandbox);
  assert.equal(e.callbacks.size, 1);
  const pause = e.get('pe-pause');
  pause.events.click();
  assert.equal(e.callbacks.size, 0);
  assert.equal(pause.attributes['aria-pressed'], 'true');
  assert.equal(pause.attributes['aria-label'], 'Play molecular animation');
  pause.events.click();
  assert.equal(e.callbacks.size, 1);
  e.document.hidden = true;
  e.document.events.visibilitychange();
  assert.equal(e.callbacks.size, 0);
  e.document.hidden = false;
  e.document.events.visibilitychange();
  assert.equal(e.callbacks.size, 1);
  e.preference.change({ matches: true });
  assert.equal(e.callbacks.size, 0);
  const reduced = environment({ reduced: true });
  vm.runInContext(script('biology-landing-experiment'), reduced.sandbox);
  assert.equal(reduced.callbacks.size, 0);
  assert.ok(reduced.get('pe-rate').innerHTML.startsWith('50.0'));
});

test('a missing canvas preserves the static enzyme illustration and scientific readout', () => {
  const e = environment({ context: null });
  vm.runInContext(script('biology-landing-experiment'), e.sandbox);
  assert.equal(e.get('pe-orbit-canvas').hidden, true);
  assert.equal(e.get('pe-pause').disabled, true);
  assert.equal(e.get('pe-pause').attributes['aria-label'], 'Molecular animation unavailable');
  assert.notEqual(e.get('.pe-orbit-fallback').hidden, true);
  assert.equal(e.callbacks.size, 0);
  assert.ok(e.get('pe-rate').innerHTML.startsWith('50.0'));
});

test('search opens an accessible dialog, finds existing learning routes, and skip moves keyboard focus', () => {
  const e = environment();
  vm.runInContext(script('biology-landing-search'), e.sandbox);
  e.get('bio-open-search').events.click();
  assert.equal(e.get('bio-search').open, true);
  assert.equal(e.get('bio-search-input').focused, true);
  assert.equal(e.get('bio-search-results').children.length, 9);
  e.get('bio-search-input').value = 'enzyme';
  e.get('bio-search-input').events.input();
  assert.equal(e.get('bio-search-results').children.length, 1);
  assert.equal(e.get('bio-search-results').children[0].href, 'app.html#labs');
  e.get('bio-search-input').value = '<script>alert(1)</script>';
  e.get('bio-search-input').events.input();
  assert.match(e.get('bio-search-results').children[0].textContent, /^No match yet/);
  let prevented = false;
  e.get('.pe-skip').events.click({ preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(e.get('pe-main').focused, true);
  assert.equal(e.get('pe-main').focusOptions.preventScroll, true);
  assert.equal(e.get('pe-main').scrollOptions.block, 'start');
});

test('background motion can be paused persistently and pointer motion is bounded and batched', () => {
  const e = environment();
  vm.runInContext(script('biology-landing-motion'), e.sandbox);
  assert.equal(e.get('lnd').dataset.motion, 'running');
  const hero = e.get('bio-welcome');
  hero.events.pointermove({ clientX: 9999, clientY: -9999 });
  hero.events.pointermove({ clientX: 9999, clientY: -9999 });
  assert.equal(e.callbacks.size, 1);
  [...e.callbacks.values()][0]();
  assert.equal(e.styles.get('--bio-px'), '4.00px');
  assert.equal(e.styles.get('--bio-py'), '-4.00px');
  e.get('bio-motion-toggle').events.click();
  assert.equal(e.get('lnd').dataset.motion, 'paused');
  assert.equal(e.get('bio-motion-toggle').attributes['aria-pressed'], 'true');
  assert.equal(e.stores.get('bioq_landing_motion'), 'paused');
  assert.equal(e.styles.get('--bio-px'), '0px');
  const restored = environment({ savedMotion: 'paused' });
  vm.runInContext(script('biology-landing-motion'), restored.sandbox);
  assert.equal(restored.get('lnd').dataset.motion, 'paused');
  const reduced = environment({ reduced: true });
  vm.runInContext(script('biology-landing-motion'), reduced.sandbox);
  assert.equal(reduced.get('lnd').dataset.motion, 'paused');
  assert.equal(reduced.get('bio-motion-toggle').disabled, true);
  assert.match(html, /@media\(prefers-reduced-motion:reduce\)/);
});
