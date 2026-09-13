/* Actual main.js startup, with deterministic module/timer and renderer/shell
 * boundaries. No network, WebGL, webcam, asset appearance or tracker claims.
 * Geometry/interaction integration has its own prepared-frog-interactions test.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const main = fs.readFileSync(path.join(root, 'src/lab/main.js'), 'utf8');
let THREE;
test.before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
});
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = () => new Promise(resolve => setImmediate(resolve));
function harness(options = {}) {
  const elements = [], timers = new Map(), calls = [], warnings = [], messages = [];
  const handlers = new Map(), events = new Map(); let nextTimer = 1, disposals = 0, roachDisposals = 0;
  const loaded = { prepared: { marker: 'test parsed frog' }, dispose() { disposals++; } };
  const roachLoaded = { prepared: { marker: 'test parsed cockroach' }, dispose() { roachDisposals++; } };
  const loader = { loadPreparedSpecimen: async (three, args) => {
    calls.push({ kind: 'load', args });
    const resource = args.specimenId === 'cockroach' ? roachLoaded : loaded;
    return options.load ? options.load(resource, args) : resource;
  } };
  const adapter = { installPreparedExterior: (three, args) => { calls.push({ kind: 'install', args }); return { restore() {} }; } };
  const body = { appendChild: node => elements.push(node), classList: { add() {}, remove() {} } };
  const document = { body, getElementById: () => ({ id: 'stage' }), createElement: tag => ({
    tag, style: {}, attributes: {}, children: [], setAttribute(key, value) { this.attributes[key] = value; },
    appendChild(child) { this.children.push(child); },
    remove() { this.removed = true; },
  }) };
  const ctx = {
    THREE, document, window: {}, location: { search: '?instant=1' }, performance, AbortController, DOMException,
    console: { warn: (...a) => warnings.push(a), error: (...a) => warnings.push(a), log() {} },
    setTimeout(fn, ms) { const id = nextTimer++; timers.set(id, { fn, ms }); return id; },
    clearTimeout(id) { timers.delete(id); }, addEventListener(name, handler) { if (!events.has(name)) events.set(name, []); events.get(name).push(handler); },
    SPECIMENS: { frog: { name: 'Frog' }, cockroach: { name: 'Cockroach' }, fish: { name: 'Fish' }, heart: { name: 'Heart' }, earthworm: { name: 'Earthworm' } },
    normalizeSpecimenId: id => ['frog', 'cockroach', 'fish', 'heart', 'earthworm'].includes(id) ? id : 'frog',
    createHands() { calls.push({ kind: 'camera' }); throw new Error('Camera must not be requested by specimen lifecycle'); },
    __importModule: async name => {
      calls.push({ kind: 'import', name });
      if (options.importModule) return options.importModule(name, { loader, adapter });
      return name.includes('prepared-loader') ? loader : adapter;
    },
    buildShell: () => ({ mountCards() {}, on: (name, handler) => handlers.set(name, handler), say: text => messages.push(text), setTool: tool => calls.push({ kind: 'tool', tool }), setHandState: state => calls.push({ kind: 'handState', state }) }),
    __renderer: { setAnimationLoop(fn) { calls.push({ kind: 'loop', fn }); } },
    __scene: {}, __camera: {}, __controls: {}, __group: {}, __parts: [{ id: 'skin' }], __dissection: { state: {} },
    __boot: () => { calls.push({ kind: 'boot' }); if (options.bootError) throw options.bootError; },
    __load: id => { if (!calls.some(call => call.kind === 'specimen')) assert.equal(ctx.window.__LAB.ready, false, 'ready cannot precede initial specimen creation'); calls.push({ kind: 'specimen', id }); },
  };
  vm.createContext(ctx);
  const executable = main.replace(/^export\s+/gm, '').replace(/\bimport\s*\(/g, '__importModule(');
  // Replace only expensive external boundaries, retaining the complete actual
  // startup body, async preparation, event wiring, readiness and error handler.
  vm.runInContext(executable + `
    bootScene = function(root) { __boot(root); renderer=__renderer; scene=__scene; camera=__camera; controls=__controls; };
    loadSpecimen = function(id) { __load(id); specimenId=id; group=__group; parts=__parts; dissection=__dissection;
      const asset = id === 'frog' ? preparedFrog : preparedSpecimens.get(id);
      preparedInstall = asset && installExterior ? installExterior(THREE, { specimenId:id, parts, prepared:asset.prepared }) : null; };
    drawCursor = function() {};
  `, ctx, { filename: 'main-startup-under-test.js' });
  return { ctx, calls, messages, warnings, elements, timers, handlers, events, loaded, roachLoaded, get disposals() { return disposals; }, get roachDisposals() { return roachDisposals; },
    run(code) { return vm.runInContext(code, ctx); },
    start() {
      const pending = ctx.startApp();
      // The preserved assembled wrapper reports synchronous module evaluation
      // with ok; readiness must remain separate while the imports are pending.
      ctx.window.__LAB.ok = true;
      return pending;
    },
    expire() {
      const entry = [...timers].find(([, timer]) => timer.ms === 20000);
      assert.ok(entry, 'the bounded preparation deadline must be installed');
      timers.delete(entry[0]); entry[1].fn();
    },
  };
}
function ready(h) {
  assert.equal(h.ctx.window.__LAB.ready, true);
  assert.ok(h.ctx.window.__LAB.dissection);
  assert.equal(h.ctx.window.__LAB.parts, h.ctx.__parts);
  assert.equal(h.elements.filter(e => e.attributes.role === 'status' && !e.removed).length, 0);
  assert.equal(h.timers.size, 0, 'deadline is cleared on completion');
}

test('slow preparation cannot publish ready or boot a scene; success installs before ready', async () => {
  const pendingAsset = deferred();
  const h = harness({ load: () => pendingAsset.promise });
  const pending = h.start(); await flush();
  assert.equal(h.ctx.window.__LAB.ok, true);
  assert.equal(h.ctx.window.__LAB.ready, false);
  assert.equal(h.calls.filter(c => c.kind === 'boot').length, 0);
  assert.equal(h.elements.filter(e => e.attributes.role === 'status' && !e.removed).length, 1);
  pendingAsset.resolve(h.loaded); await pending;
  ready(h);
  assert.deepEqual(h.calls.filter(c => ['boot', 'specimen', 'install'].includes(c.kind)).map(c => c.kind), ['boot', 'specimen', 'install']);
  assert.equal(h.disposals, 0, 'successful shared source stays available for specimen resets');
  assert.equal(h.messages.some(text => /unavailable|Original interactive/.test(text)), false);
  assert.equal(h.handlers.has('hands'), true, 'opt-in handler registered, never invoked by startup');
});

test('failed download boots the interactive fallback and tells the student it is not the scanned exterior', async () => {
  const h = harness({ load: async () => { throw new Error('offline'); } });
  await h.start(); ready(h);
  assert.equal(h.calls.filter(c => c.kind === 'install').length, 0);
  assert.equal(h.messages.filter(text => /Original interactive frog.*unavailable.*Reload to retry/.test(text)).length, 1);
  assert.equal(h.warnings.length, 1);
});

test('fatal scene failure is caught after the async boundary and never publishes ready', async () => {
  const h = harness({ bootError: new Error('WebGL unavailable') });
  await h.start();
  assert.equal(h.ctx.window.__LAB.ready, false); assert.equal(h.ctx.window.__LAB.ok, false);
  assert.equal(h.ctx.window.__LAB.error, 'WebGL unavailable');
  assert.equal(h.elements.filter(e => e.attributes.role === 'alert').length, 1);
  assert.equal(h.elements.filter(e => e.attributes.role === 'status' && !e.removed).length, 0);
  assert.equal(h.calls.filter(c => c.kind === 'loop').length, 0);
  assert.equal(h.timers.size, 0);
});

test('a stalled module import reaches fallback at the deadline and never starts a late asset download', async () => {
  const moduleGate = deferred();
  const h = harness({ importModule: async (name, modules) => {
    await moduleGate.promise; return name.includes('prepared-loader') ? modules.loader : modules.adapter;
  } });
  const pending = h.start(); await flush(); h.expire(); await pending; ready(h);
  assert.equal(h.calls.filter(c => c.kind === 'load').length, 0);
  moduleGate.resolve(); await flush();
  assert.equal(h.calls.filter(c => c.kind === 'load').length, 0);
  assert.equal(h.calls.filter(c => c.kind === 'boot').length, 1);
});

test('late parsed resources after timeout are disposed once without replacing the fallback attempt', async () => {
  const assetGate = deferred();
  const h = harness({ load: () => assetGate.promise });
  const pending = h.start(); await flush(); h.expire(); await pending; ready(h);
  const call = h.calls.find(c => c.kind === 'load'); assert.equal(call.args.signal.aborted, true);
  assetGate.resolve(h.loaded); await flush();
  assert.equal(h.disposals, 1);
  assert.equal(h.calls.filter(c => c.kind === 'install').length, 0);
  assert.equal(h.calls.filter(c => c.kind === 'boot').length, 1);
  assert.equal(h.messages.filter(text => /Original interactive frog/.test(text)).length, 1);
});

test('cockroach lazy preparation installs only after decode, then reuses cached resources for reselection and reset without a camera', async () => {
  const gate = deferred();
  const h = harness({ load: (resource, args) => args.specimenId === 'cockroach' ? gate.promise : resource });
  await h.start(); ready(h);
  const pending = h.ctx.window.__LAB.requestSpecimen('cockroach'); await flush();
  assert.equal(h.ctx.window.__LAB.ready, false);
  assert.equal(h.calls.filter(call => call.kind === 'loop').at(-1).fn, null, 'renderer pauses to free decode resources');
  assert.deepEqual(h.calls.filter(call => call.kind === 'specimen').map(call => call.id), ['frog']);
  gate.resolve(h.roachLoaded); await pending; ready(h);
  assert.equal(typeof h.calls.filter(call => call.kind === 'loop').at(-1).fn, 'function', 'renderer resumes after install');
  assert.equal(h.calls.filter(call => call.kind === 'install').at(-1).args.prepared, h.roachLoaded.prepared);
  await h.ctx.window.__LAB.requestSpecimen('frog');
  await h.ctx.window.__LAB.requestSpecimen('cockroach');
  h.ctx.window.__LAB.loadSpecimen('cockroach');
  assert.equal(h.calls.filter(call => call.kind === 'load' && call.args.specimenId === 'cockroach').length, 1);
  assert.equal(h.roachDisposals, 0, 'cached source is borrowed across resets, not discarded after install');
  assert.equal(h.calls.some(call => call.kind === 'camera'), false);
});

test('cockroach timeout boots explicit interactive fallback and releases a late result without replacing the selected specimen', async () => {
  const gate = deferred();
  const h = harness({ load: (resource, args) => args.specimenId === 'cockroach' ? gate.promise : resource });
  await h.start();
  const pending = h.ctx.window.__LAB.requestSpecimen('cockroach'); await flush(); h.expire(); await pending; ready(h);
  assert.equal(h.calls.filter(call => call.kind === 'specimen').at(-1).id, 'cockroach');
  assert.equal(h.messages.filter(text => /Original interactive cockroach.*unavailable.*again to retry/.test(text)).length, 1);
  const call = h.calls.find(call => call.kind === 'load' && call.args.specimenId === 'cockroach'); assert.equal(call.args.signal.aborted, true);
  await h.ctx.window.__LAB.requestSpecimen('fish');
  gate.resolve(h.roachLoaded); await flush();
  assert.equal(h.roachDisposals, 1);
  assert.equal(h.calls.filter(call => call.kind === 'specimen').at(-1).id, 'fish');
  assert.equal(h.calls.some(call => call.kind === 'install' && call.args.specimenId === 'cockroach'), false);
  assert.equal(h.calls.some(call => call.kind === 'camera'), false);
});

test('superseding cockroach requests cannot install an old surface or remove the current loading state', async () => {
  const first = deferred(), second = deferred(); let request = 0, staleDisposals = 0;
  const stale = { prepared: { marker: 'stale roach' }, dispose() { staleDisposals++; } };
  const h = harness({ load: (resource, args) => args.specimenId === 'cockroach' ? (++request === 1 ? first.promise : second.promise) : resource });
  await h.start();
  const older = h.ctx.window.__LAB.requestSpecimen('cockroach'); await flush();
  const newer = h.ctx.window.__LAB.requestSpecimen('cockroach'); await flush(); await older;
  assert.equal(h.ctx.window.__LAB.ready, false);
  assert.equal(h.elements.filter(element => element.attributes.role === 'status' && !element.removed).length, 1);
  assert.equal(h.calls.filter(call => call.kind === 'loop').at(-1).fn, null, 'superseded request must not restart the newer paused renderer');
  first.resolve(stale); await flush();
  assert.equal(staleDisposals, 1);
  assert.equal(h.ctx.window.__LAB.ready, false);
  second.resolve(h.roachLoaded); await newer; ready(h);
  const installs = h.calls.filter(call => call.kind === 'install' && call.args.specimenId === 'cockroach');
  assert.equal(installs.length, 1); assert.equal(installs[0].args.prepared, h.roachLoaded.prepared);
  assert.equal(h.warnings.length, 0, 'superseding a selection is not a user-facing asset failure');
});

test('failed lazy cockroach download remains retryable and changing to an unprepared specimen does not download an asset', async () => {
  let failures = 0;
  const h = harness({ load: (resource, args) => { if (args.specimenId === 'cockroach' && failures++ === 0) throw new Error('offline'); return resource; } });
  await h.start(); await h.ctx.window.__LAB.requestSpecimen('cockroach'); ready(h);
  assert.equal(h.messages.filter(text => /Original interactive cockroach/.test(text)).length, 1);
  await h.ctx.window.__LAB.requestSpecimen('cockroach'); ready(h);
  assert.equal(h.calls.filter(call => call.kind === 'load' && call.args.specimenId === 'cockroach').length, 2);
  assert.equal(h.calls.filter(call => call.kind === 'install').at(-1).args.prepared, h.roachLoaded.prepared);
  for (const id of ['fish', 'heart', 'earthworm']) await h.ctx.window.__LAB.requestSpecimen(id);
  assert.equal(h.calls.filter(call => call.kind === 'load').length, 3);
  assert.equal(h.calls.some(call => call.kind === 'camera'), false);
});

test('superseded cockroach module imports do not begin a late download', async () => {
  const gate = deferred(); let imports = 0;
  const h = harness({ importModule: async (name, modules) => {
    if (++imports > 2) await gate.promise;
    return name.includes('prepared-loader') ? modules.loader : modules.adapter;
  } });
  await h.start();
  const pending = h.ctx.window.__LAB.requestSpecimen('cockroach'); await flush();
  await h.ctx.window.__LAB.requestSpecimen('frog'); await pending; ready(h);
  gate.resolve(); await flush();
  assert.equal(h.calls.filter(call => call.kind === 'load').length, 1);
  assert.equal(h.calls.filter(call => call.kind === 'specimen').at(-1).id, 'frog');
  assert.equal(h.roachDisposals, 0);
});

test('loading blocks tool keys and pointer grips; held hand input needs a released frame before the new specimen accepts it', async () => {
  const gate = deferred();
  const h = harness({ load: (resource, args) => args.specimenId === 'cockroach' ? gate.promise : resource });
  await h.start();
  h.ctx.__snapshot = { active: true, hands: [{ present: true, isPinching: true, pinchStrength: .9, cursor: { x: .5, y: .5 }, gesture: 'pinch', roll: 0 }] };
  h.run('hands = {snapshot: __snapshot}; handMode = true; routeInput();');
  assert.equal(h.ctx.window.__LAB.input.gripping, true);
  const pending = h.ctx.window.__LAB.requestSpecimen('cockroach'); await flush();
  h.run('routeInput();'); assert.equal(h.ctx.window.__LAB.input.gripping, false);
  assert.equal(h.ctx.window.__LAB.input.grip, 0);
  for (const handler of h.events.get('keydown') || []) handler({ key: '2' });
  assert.equal(h.calls.some(call => call.kind === 'tool'), false, 'no tool changes behind loading overlay');
  const target = { closest: () => null };
  for (const handler of h.events.get('pointerdown') || []) handler({ pointerType: 'mouse', target });
  assert.equal(h.run('mouse.down'), false, 'overlay pointer must not latch a grip');
  gate.resolve(h.roachLoaded); await pending; ready(h);
  h.run('routeInput();'); assert.equal(h.ctx.window.__LAB.input.gripping, false, 'held pinch cannot become a new cut');
  h.ctx.__snapshot.hands[0].isPinching = false; h.ctx.__snapshot.hands[0].pinchStrength = 0;
  h.run('routeInput();'); assert.equal(h.ctx.window.__LAB.input.gripping, false);
  h.ctx.__snapshot.hands[0].isPinching = true; h.ctx.__snapshot.hands[0].pinchStrength = .8;
  h.run('routeInput();'); assert.equal(h.ctx.window.__LAB.input.gripping, true, 'fresh pinch is accepted after neutral handoff');
  assert.equal(h.calls.some(call => call.kind === 'camera'), false);
});

for (const method of ['button', 'Escape']) test(`${method} cancels preparation immediately, preserves the current attempt and permits camera stop; late resources are discarded`, async () => {
  const gate = deferred(); let stops = 0;
  const h = harness({ load: (resource, args) => args.specimenId === 'cockroach' ? gate.promise : resource });
  await h.start();
  h.ctx.__dissection.state.keptAttempt = { pinned: ['forelimb-left'], cutLength: 1.2 };
  const attempt = h.ctx.__dissection.state.keptAttempt;
  h.ctx.__fakeHands = { snapshot: { active: true, hands: [] }, stop() { stops++; } };
  h.run('hands = __fakeHands; handMode = true;');
  const pending = h.ctx.window.__LAB.requestSpecimen('cockroach'); await flush();
  const panel = h.elements.find(element => element.attributes.role === 'status' && !element.removed);
  assert.ok(panel && panel.children.some(child => child.tag === 'button' && child.textContent === 'Cancel and return'));
  if (method === 'button') panel.children.find(child => child.tag === 'button').onclick();
  else for (const handler of h.events.get('keydown') || []) handler({ key: 'Escape' });
  assert.equal(panel.removed, true, 'dismiss is synchronous, not held behind decode');
  assert.equal(h.ctx.window.__LAB.ready, true);
  assert.equal(typeof h.calls.filter(call => call.kind === 'loop').at(-1).fn, 'function');
  await h.handlers.get('hands')(false); assert.equal(stops, 1, 'existing camera Stop control works as soon as the overlay is gone');
  await pending; ready(h);
  assert.deepEqual(h.calls.filter(call => call.kind === 'specimen').map(call => call.id), ['frog']);
  assert.equal(h.ctx.__dissection.state.keptAttempt, attempt);
  assert.equal(h.messages.filter(text => /Preparation cancelled.*unchanged/.test(text)).length, 1);
  gate.resolve(h.roachLoaded); await flush();
  assert.equal(h.roachDisposals, 1);
  assert.equal(h.calls.some(call => call.kind === 'install' && call.args.specimenId === 'cockroach'), false);
  assert.equal(h.calls.some(call => call.kind === 'camera'), false);
  assert.equal(h.warnings.length, 0);
});
