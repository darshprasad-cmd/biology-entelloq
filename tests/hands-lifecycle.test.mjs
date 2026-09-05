import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const handsSource = await readFile(new URL('../src/lab/hands.js', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../src/lab/main.js', import.meta.url), 'utf8');
// Execute the actual assembled module while replacing only its lazy network
// import. These tests never request a device, model download, browser or GPU.
const importPattern = /import\(\s*\/\* @vite-ignore \*\/ HND_TASKS_VISION_URL\s*\)/;
assert.match(handsSource, importPattern);
const makeFactory = new Function('document', 'navigator', 'window', 'loadVision',
  handsSource.replace(/^export\s+/gm, '').replace(importPattern, 'loadVision()') + '\nreturn createHands;');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function until(check) {
  for (let i = 0; i < 30; i++) {
    if (check()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.ok(check(), 'Expected asynchronous startup checkpoint');
}
function fakeStream() {
  const value = { stops: 0, getTracks: () => [{ stop: () => { value.stops++; } }] };
  return value;
}
function harness(overrides = {}) {
  const listeners = new Map();
  const video = {
    readyState: 2, srcObject: null, setAttribute() {},
    play: async () => {}, pause() {},
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => { if (listeners.get(name) === fn) listeners.delete(name); },
    ...overrides.video,
  };
  const models = [], requests = [];
  const vision = {
    FilesetResolver: { forVisionTasks: overrides.fileset || (async () => ({})) },
    HandLandmarker: { createFromOptions: overrides.model || (async () => {
      const model = { closes: 0, close() { this.closes++; } };
      models.push(model);
      return model;
    }) },
  };
  let imports = 0;
  const createHands = makeFactory(
    { createElement: () => video },
    { mediaDevices: { getUserMedia: () => { const req = deferred(); requests.push(req); return req.promise; } } },
    { isSecureContext: true },
    () => { imports++; return overrides.library ? overrides.library(vision) : Promise.resolve(vision); },
  );
  const hands = createHands();
  return { hands, video, requests, models, listeners, get imports() { return imports; } };
}

test('construction is inert; Off during library loading never reaches the camera', async () => {
  const library = deferred();
  let vision;
  const h = harness({ library: value => { vision = value; return library.promise; } });
  assert.equal(h.imports, 0);
  assert.equal(h.requests.length, 0);
  const start = h.hands.start();
  h.hands.stop();
  library.resolve(vision);
  assert.equal((await start).code, 'cancelled');
  assert.equal(h.requests.length, 0);
  assert.equal(h.hands.isRunning, false);
  assert.equal(h.hands.snapshot.active, false);
});

test('Off during runtime loading never starts a model or camera', async () => {
  const fileset = deferred();
  let loading = false;
  const h = harness({ fileset: () => { loading = true; return fileset.promise; } });
  const start = h.hands.start();
  await until(() => loading);
  h.hands.stop();
  fileset.resolve({});
  assert.equal((await start).code, 'cancelled');
  assert.equal(h.models.length, 0);
  assert.equal(h.requests.length, 0);
});

test('dispose closes a model created after cancellation without requesting a camera', async () => {
  const candidate = deferred();
  let creating = false;
  const h = harness({ model: () => { creating = true; return candidate.promise; } });
  const start = h.hands.start();
  await until(() => creating);
  h.hands.dispose();
  const model = { closes: 0, close() { this.closes++; } };
  candidate.resolve(model);
  assert.equal((await start).code, 'cancelled');
  assert.equal(model.closes, 1);
  assert.equal(h.requests.length, 0);
});

test('cancelled GPU initialization does not retry on CPU', async () => {
  const candidate = deferred();
  let calls = 0;
  const h = harness({ model: () => { calls++; return candidate.promise; } });
  const start = h.hands.start();
  await until(() => calls === 1);
  h.hands.stop();
  candidate.reject(new Error('GPU unavailable'));
  assert.equal((await start).code, 'cancelled');
  assert.equal(calls, 1);
  assert.equal(h.requests.length, 0);
});

test('Off stops a stream acquired after the permission dialog resolves', async () => {
  const h = harness();
  const start = h.hands.start();
  await until(() => h.requests.length === 1);
  h.hands.stop();
  const stream = fakeStream();
  h.requests[0].resolve(stream);
  assert.equal((await start).code, 'cancelled');
  assert.equal(stream.stops, 1);
  assert.equal(h.video.srcObject, null);
  assert.equal(h.hands.isRunning, false);
  assert.equal(h.hands.snapshot.active, false);
});

test('Off then On preserves the newer stream when the old permission resolves last', async () => {
  const h = harness();
  const oldStart = h.hands.start();
  await until(() => h.requests.length === 1);
  h.hands.stop();
  const newStart = h.hands.start();
  await until(() => h.requests.length === 2);
  const current = fakeStream(), stale = fakeStream();
  h.requests[1].resolve(current);
  assert.equal((await newStart).ok, true);
  h.requests[0].resolve(stale);
  assert.equal((await oldStart).code, 'cancelled');
  assert.equal(stale.stops, 1);
  assert.equal(current.stops, 0);
  assert.equal(h.video.srcObject, current);
  assert.equal(h.hands.isRunning, true);
  assert.equal(h.hands.snapshot.active, true);
  h.hands.dispose();
  assert.equal(current.stops, 1);
});

test('stale rejection cannot retry permission or clear a newer startup guard', async () => {
  const h = harness();
  const oldStart = h.hands.start();
  await until(() => h.requests.length === 1);
  h.hands.stop();
  const newStart = h.hands.start();
  await until(() => h.requests.length === 2);
  h.requests[0].reject({ name: 'OverconstrainedError' });
  assert.equal((await oldStart).code, 'cancelled');
  assert.equal((await h.hands.start()).code, 'already-starting');
  assert.equal(h.requests.length, 2);
  const current = fakeStream();
  h.requests[1].resolve(current);
  assert.equal((await newStart).ok, true);
  h.hands.dispose();
});

test('Off during video playback startup prevents late activation', async () => {
  const playback = deferred();
  let playing = false;
  const h = harness({ video: { play: () => { playing = true; return playback.promise; } } });
  const start = h.hands.start();
  await until(() => h.requests.length === 1);
  const stream = fakeStream();
  h.requests[0].resolve(stream);
  await until(() => playing);
  h.hands.stop();
  playback.resolve();
  assert.equal((await start).code, 'cancelled');
  assert.equal(stream.stops, 1);
  assert.equal(h.video.srcObject, null);
  assert.equal(h.hands.isRunning, false);
});

test('Off cancels the first-frame timeout and removes its listener immediately', async () => {
  const h = harness({ video: { readyState: 0 } });
  const start = h.hands.start();
  await until(() => h.requests.length === 1);
  const stream = fakeStream();
  h.requests[0].resolve(stream);
  await until(() => h.listeners.has('loadeddata'));
  h.hands.stop();
  assert.equal((await start).code, 'cancelled');
  assert.equal(h.listeners.size, 0);
  assert.equal(stream.stops, 1);
  assert.equal(h.hands.isRunning, false);
});

test('main ignores stale startup results without disabling a newer authorized camera', async () => {
  const begin = mainSource.indexOf('  let handRequestGeneration =');
  const end = mainSource.indexOf('  // pointer', begin);
  assert.ok(begin > 0 && end > begin);
  const states = [], starts = [], classes = new Set();
  let callback, stops = 0;
  const hands = { videoEl: {}, start() { const pending = deferred(); starts.push(pending); return pending.promise; }, stop() { stops++; } };
  const shell = { on: (name, fn) => { assert.equal(name, 'hands'); callback = fn; }, setHandState: value => states.push(value), say() {} };
  const readMode = new Function('shell', 'hands', 'document',
    'let handMode = false; const handViz = null; function drawCursor() {} function applyCameraPref() {}\n' +
    mainSource.slice(begin, end) + '\nreturn () => handMode;')(
    shell, hands, { body: { classList: { add: key => classes.add(key), remove: key => classes.delete(key) } } },
  );
  const oldStart = callback(true);
  await callback(true);
  assert.equal(starts.length, 1, 'Repeated On does not invalidate the current request');
  await callback(false);
  assert.equal(readMode(), false);
  const newStart = callback(true);
  starts[1].resolve({ ok: true });
  await newStart;
  starts[0].resolve({ ok: true });
  await oldStart;
  assert.equal(readMode(), true);
  assert.equal(stops, 1, 'Only the explicit Off may stop the tracker');
  assert.ok(classes.has('handmode'));
  assert.deepEqual(states.map(state => state.status || 'off'), ['starting', 'off', 'starting', 'tracking']);
  await callback(false);
  assert.equal(readMode(), false);
  assert.equal(classes.has('handmode'), false);
});

test('main stays Off when a pending start resolves without a later opt-in', async () => {
  const begin = mainSource.indexOf('  let handRequestGeneration =');
  const end = mainSource.indexOf('  // pointer', begin);
  let callback;
  const pending = deferred(), states = [];
  const readMode = new Function('shell', 'hands', 'document',
    'let handMode = false; const handViz = null; function drawCursor() {} function applyCameraPref() {}\n' +
    mainSource.slice(begin, end) + '\nreturn () => handMode;')(
    { on: (name, fn) => { callback = fn; }, setHandState: state => states.push(state), say() {} },
    { start: () => pending.promise, stop() {} },
    { body: { classList: { add() { assert.fail('A stale result cannot enable the camera UI'); }, remove() {} } } },
  );
  const start = callback(true);
  await callback(false);
  pending.resolve({ ok: true });
  await start;
  assert.equal(readMode(), false);
  assert.deepEqual(states.at(-1), { on: false });
});
