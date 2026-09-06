const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/lab/hands.js'), 'utf8')
  .replace(/^export /gm, '')
  .replace(/await import\(\s*\/\* @vite-ignore \*\/ HND_TASKS_VISION_URL\s*\)/, 'await __loadVision()');
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
function fixture({ model, camera, play } = {}) {
  let requests = 0, stops = 0;
  const stream = { getTracks: () => [{ stop: () => stops++ }] };
  const vision = { FilesetResolver: { forVisionTasks: async () => ({}) },
    HandLandmarker: { createFromOptions: async () => ({ close() {} }) } };
  const video = { setAttribute() {}, play: () => play ? play.promise : Promise.resolve(), pause() {}, readyState: 2, srcObject: null };
  const ctx = { performance, setTimeout, clearTimeout, window: { isSecureContext: true },
    document: { createElement: () => video },
    navigator: { mediaDevices: { getUserMedia: async () => { requests++; return camera ? camera.promise : stream; } } },
    __loadVision: () => model ? model.promise : Promise.resolve(vision) };
  vm.createContext(ctx); vm.runInContext(source, ctx);
  const api = ctx.createHands();
  return { api, stream, vision, video, requests: () => requests, stops: () => stops };
}
test('stopping during model loading never opens or requests a camera afterward', async () => {
  const model = deferred(), f = fixture({ model });
  const start = f.api.start(); f.api.stop(); model.resolve(f.vision);
  assert.equal((await start).code, 'cancelled');
  assert.equal(f.requests(), 0); assert.equal(f.api.snapshot.active, false);
});
test('late permission success after Stop immediately releases every camera track', async () => {
  const camera = deferred(), f = fixture({ camera });
  const start = f.api.start();
  for (let i = 0; i < 10 && !f.requests(); i++) await Promise.resolve();
  assert.equal(f.requests(), 1); f.api.stop(); camera.resolve(f.stream);
  assert.equal((await start).code, 'cancelled'); assert.equal(f.stops(), 1);
  assert.equal(f.video.srcObject, null); assert.equal(f.api.snapshot.active, false);
});
test('normal user start still runs and Stop releases the camera', async () => {
  const f = fixture(); assert.equal((await f.api.start()).ok, true);
  assert.equal(f.api.snapshot.active, true); assert.equal(f.requests(), 1);
  f.api.stop(); assert.equal(f.stops(), 1); assert.equal(f.api.snapshot.active, false);
});

test('Stop while video playback initializes cannot republish a live camera', async () => {
  const play = deferred(), f = fixture({ play }); const start = f.api.start();
  for (let i = 0; i < 12 && !f.video.srcObject; i++) await Promise.resolve();
  assert.equal(f.video.srcObject, f.stream); f.api.stop(); play.resolve();
  assert.equal((await start).code, 'cancelled'); assert.equal(f.api.snapshot.active, false);
  assert.equal(f.stops(), 1); assert.equal(f.video.srcObject, null);
});

test('main queues a fresh opt-in after cancelled initialization without reopening after a later Stop', async () => {
  const main = fs.readFileSync(path.join(__dirname, '../src/lab/main.js'), 'utf8');
  const begin = main.indexOf("  shell.on('hands', async (want) => {");
  const end = main.indexOf('\n  });', begin) + '\n  });'.length;
  const first = deferred(); let starts = 0, stops = 0, handler;
  const states = [], classes = new Set();
  const ctx = { handRequest: 0, handStartPromise: null, handMode: false, handDrive: { slot: -1 }, handViz: null, specimenId: 'frog',
    hands: { start: () => ++starts === 1 ? first.promise : Promise.resolve({ ok: true }), stop: () => stops++ },
    document: { body: { classList: { add: k => classes.add(k), remove: k => classes.delete(k) } } },
    drawCursor() {}, applyCameraPref() {}, shell: { on: (name, fn) => handler = fn, setHandState: s => states.push(s), say() {} } };
  vm.createContext(ctx); vm.runInContext(main.slice(begin, end), ctx);
  const original = handler(true); await handler(false); const restarted = handler(true);
  assert.equal(starts, 1); first.resolve({ ok: false, code: 'cancelled' });
  await Promise.all([original, restarted]);
  assert.equal(starts, 2); assert.equal(ctx.handMode, true); assert.equal(states.at(-1).status, 'tracking');
  await handler(false); assert.equal(ctx.handMode, false); assert.equal(stops, 2); assert.equal(classes.has('handmode'), false);
});
