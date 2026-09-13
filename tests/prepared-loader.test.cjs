const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
let THREE, createPreparedSpecimenLoader, installPreparedExterior, realLoader;
const dataURL = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
test.before(async () => {
  const read = name => fs.readFileSync(path.join(root, 'src/lab', name), 'utf8');
  const threeURL = dataURL(read('vendor/three.module.min.js')); THREE = await import(threeURL);
  ({ createPreparedSpecimenLoader } = await import(dataURL(read('prepared-loader.js'))));
  ({ installPreparedExterior } = await import(dataURL(read('specimen-assets.js'))));
  const utilsURL = dataURL(read('vendor/utils/BufferGeometryUtils.js').replace("from 'three'", `from '${threeURL}'`));
  realLoader = await import(dataURL(read('vendor/loaders/GLTFLoader.js').replace("from 'three'", `from '${threeURL}'`).replace("from '../utils/BufferGeometryUtils.js'", `from '${utilsURL}'`)));
});
const ids = ['skin', 'forelimb-left', 'forelimb-right', 'hindlimb-left', 'hindlimb-right'];
function documentGLB() {
  const arrays = [new Float32Array([-1, -1, 0, 1, -1, 0, 0, 1, 0]), new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]),
    new Float32Array([0, 0, 1, 0, 0.5, 1]), new Uint16Array([0, 1, 2])];
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=', 'base64');
  const bin = Buffer.alloc(176); let offset = 0;
  const bufferViews = arrays.map(a => { const byteOffset = offset; Buffer.from(a.buffer).copy(bin, offset); offset += a.byteLength; offset = Math.ceil(offset / 4) * 4; return { buffer: 0, byteOffset, byteLength: a.byteLength }; });
  bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: png.length }); png.copy(bin, offset);
  const json = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ name: 'Prepared frog fixture', extras: { schemaVersion: 1, specimenId: 'frog' }, children: [1, 2, 3, 4, 5] }, ...ids.map((name, i) => ({ name, mesh: i }))],
    meshes: ids.map(() => ({ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] })),
    materials: [{ name: 'Frog PBR', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.4 } }],
    textures: [{ source: 0 }], images: [{ bufferView: 4, mimeType: 'image/png' }], bufferViews,
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [-1, -1, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5126, count: 3, type: 'VEC3' }, { bufferView: 2, componentType: 5126, count: 3, type: 'VEC2' },
      { bufferView: 3, componentType: 5123, count: 3, type: 'SCALAR' }], buffers: [{ byteLength: bin.length }] };
  return { json, bin };
}
function pack({ json, bin }) {
  const text = Buffer.from(JSON.stringify(json)), n = Math.ceil(text.length / 4) * 4;
  const result = Buffer.alloc(28 + n + bin.length); result.writeUInt32LE(0x46546c67); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(n, 12); result.writeUInt32LE(0x4e4f534a, 16); result.fill(32, 20, 20 + n); text.copy(result, 20);
  result.writeUInt32LE(bin.length, 20 + n); result.writeUInt32LE(0x004e4942, 24 + n); bin.copy(result, 28 + n); return result;
}
function parsed() {
  const scene = new THREE.Group(), prepared = new THREE.Group(); prepared.userData = { schemaVersion: 1, specimenId: 'frog' }; scene.add(prepared);
  const image = { width: 1, height: 1, closes: 0, close() { this.closes++; } }, texture = new THREE.Texture(image);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ map: texture })); prepared.add(mesh);
  return { scene, scenes: [scene], animations: [], texture, mesh, image };
}
function mockModule(result, delay) {
  return { GLTFLoader: class {
    constructor(manager) { this.manager = manager; }
    register(hook) { this.parser = { getDependency: () => Promise.resolve(result.scene) }; hook(this.parser); }
    async parseAsync() { if (delay) await delay(); await this.parser.getDependency('scene', 0); return result; }
  } };
}
function loader(bytes, module = mockModule(parsed()), track = {}) {
  return createPreparedSpecimenLoader({ pageURL: () => 'https://biology.test/lab.html', fetchImpl: async (url, options) => {
    track.fetch = { url, options }; return new Response(bytes, { status: 200 });
  }, importLoader: async () => { track.imported = true; return module; } });
}
const args = { specimenId: 'frog', url: './assets/specimens/frog.glb' };

test('official pinned vendor files match documented r160 source hashes and local revision', () => {
  assert.equal(THREE.REVISION, '160');
  const hashes = { 'loaders/GLTFLoader.js': 'd073b438e6a07e1359741dd5d6c76c953420cc0d4fd84eb1bdde94315540e6a3',
    'utils/BufferGeometryUtils.js': '9be041e96308775d00e2695cc607645b9a9b64fd7c0e759dd8f7c00a8d92becb',
    'THREE-LICENSE.txt': '852e0e8699169bf9f6fdc6bda3e682d078dcbc738b5d33e74df594721bff271d' };
  // Git may check text out with CRLF on Windows; compare the pinned canonical
  // source bytes rather than treating line-ending conversion as a vendor edit.
  for (const [file, hash] of Object.entries(hashes)) {
    const canonical = fs.readFileSync(path.join(root, 'src/lab/vendor', file), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(crypto.createHash('sha256').update(canonical).digest('hex'), hash);
  }
});
test('local success returns a detached Group and releases shared parsed resources exactly once', async () => {
  const result = parsed(), track = {}, counts = new Map();
  for (const resource of [result.mesh.geometry, result.mesh.material, result.texture]) resource.addEventListener('dispose', () => counts.set(resource, (counts.get(resource) || 0) + 1));
  const loaded = await loader(pack(documentGLB()), mockModule(result), track)(THREE, args);
  assert.equal(loaded.prepared.parent, null); assert.equal(track.fetch.url, 'https://biology.test/assets/specimens/frog.glb');
  assert.equal(track.fetch.options.redirect, 'error'); assert.equal(track.fetch.options.credentials, 'omit');
  loaded.dispose(); loaded.dispose(); assert.deepEqual([...counts.values()], [1, 1, 1]); assert.equal(result.image.closes, 1);
});
test('non-local schemes, origin-relative escapes, traversal, encoded paths and unprepared species fail without fetching', async () => {
  for (const url of ['https://biology.test/frog.glb', '//evil.test/frog.glb', '../frog.glb', 'assets/../frog.glb', '%2e%2e/frog.glb', 'data:a.glb', 'frog.glb?q=1', 'a\\frog.glb']) {
    const track = {}; await assert.rejects(loader(pack(documentGLB()), undefined, track)(THREE, { ...args, url }), /relative GLB URL/); assert.equal(track.fetch, undefined);
  }
  for (const specimenId of ['fish', 'heart', 'earthworm']) await assert.rejects(loader(pack(documentGLB()))(THREE, { ...args, specimenId }), /only frog and cockroach/);
});
test('cross-specimen metadata fails before any vendor parser import', async () => {
  const track = {};
  await assert.rejects(loader(pack(documentGLB()), undefined, track)(THREE, { ...args, specimenId: 'cockroach' }), /matching prepared specimen/);
  assert.equal(track.imported, undefined);
});
const mutations = {
  uri: d => { d.json.images[0].uri = 'https://evil.test/a.png'; }, dataURI: d => { d.json.buffers[0].uri = 'data:application/octet-stream;base64,AA=='; },
  extension: d => { d.json.meshes[0].primitives[0].extensions = { KHR_draco_mesh_compression: {} }; },
  animation: d => { d.json.animations = [{}]; }, skin: d => { d.json.skins = [{}]; },
  lightExtension: d => { d.json.extensionsUsed = ['KHR_lights_punctual']; },
  nodeCycle: d => { d.json.nodes[1].children = [0]; }, camera: d => { d.json.nodes[1].camera = 0; },
  morph: d => { d.json.meshes[0].primitives[0].targets = [{}]; },
  excessiveAccessor: d => { d.json.accessors[0].count = 1e9; }, sparse: d => { d.json.accessors[0].sparse = {}; },
  externalBuffer: d => { d.json.bufferViews[0].buffer = 1; }, overflowView: d => { d.json.bufferViews[0].byteLength = 1e9; },
  extraUV: d => { d.json.meshes[0].primitives[0].attributes.TEXCOORD_1 = 2; },
  decodeBomb: d => { d.bin.writeUInt32BE(100000, d.json.bufferViews[4].byteOffset + 16); },
  untextured: d => { d.json.materials[0].pbrMetallicRoughness.baseColorTexture = undefined; },
};
for (const [name, mutate] of Object.entries(mutations)) test(`preflight blocks ${name} before vendor parser import`, async () => {
  const d = documentGLB(); mutate(d); const track = {};
  await assert.rejects(loader(pack(d), undefined, track)(THREE, args)); assert.equal(track.imported, undefined);
});
test('invalid framing and declared oversized HTTP body fail early', async () => {
  for (const corrupt of [b => b.writeUInt32LE(1, 4), b => b.writeUInt32LE(0, 8), b => b.writeUInt32LE(0xffffffff, 12)]) {
    const bytes = pack(documentGLB()); corrupt(bytes); await assert.rejects(loader(bytes)(THREE, args), /Prepared loader/);
  }
  const load = createPreparedSpecimenLoader({ pageURL: () => 'https://biology.test/lab.html', fetchImpl: async () => new Response('x', { headers: { 'content-length': '999999999' } }) });
  await assert.rejects(load(THREE, args), /size budget/);
});
test('cancellation before fetch and during parsing releases late resources', async () => {
  const already = new AbortController(); already.abort(); const track = {};
  await assert.rejects(loader(pack(documentGLB()), undefined, track)(THREE, { ...args, signal: already.signal }), { name: 'AbortError' }); assert.equal(track.fetch, undefined);
  const controller = new AbortController(), result = parsed();
  const load = loader(pack(documentGLB()), mockModule(result, async () => controller.abort()));
  await assert.rejects(load(THREE, { ...args, signal: controller.signal }), { name: 'AbortError' }); assert.equal(result.image.closes, 1);
});
test('abort rejects without waiting for the decoder; eventual parsed resources are still released', async () => {
  const controller = new AbortController(), result = parsed(); let finish, started;
  const ready = new Promise(resolve => { started = resolve; });
  const module = mockModule(result, () => new Promise(resolve => { finish = resolve; started(); }));
  const pending = loader(pack(documentGLB()), module)(THREE, { ...args, signal: controller.signal });
  await ready; controller.abort(); await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(result.image.closes, 0); finish(); await new Promise(resolve => setImmediate(resolve)); assert.equal(result.image.closes, 1);
});
test('real r160 parser fixture and available prepared frog asset pass the adapter without dropping authored data', async () => {
  // CPU image-decoder stub only: real GLTFLoader parses binary geometry/materials.
  // Browser QA remains responsible for actual PNG/JPEG decoding and appearance.
  const priorSelf = globalThis.self, priorBitmap = globalThis.createImageBitmap;
  globalThis.self = globalThis; globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} });
  try {
    const asset = path.join(root, 'assets/specimens/frog.glb');
    const candidates = [pack(documentGLB())]; if (fs.existsSync(asset)) candidates.push(fs.readFileSync(asset));
    for (const bytes of candidates) {
      const loaded = await loader(bytes, realLoader)(THREE, args);
      assert.deepEqual(loaded.prepared.children.map(m => m.name).sort(), [...ids].sort());
      const parts = ids.map(id => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); mesh.userData.partId = id; return { id, mesh }; });
      const handle = installPreparedExterior(THREE, { specimenId: 'frog', parts, prepared: loaded.prepared });
      handle.restore(); loaded.dispose();
    }
    const authored = documentGLB(); authored.json.nodes[0].extras.name = 'Deliberate authored name extra';
    const loaded = await loader(pack(authored), realLoader)(THREE, args);
    assert.equal(loaded.prepared.userData.name, 'Deliberate authored name extra', 'authored extras must never be stripped to pass validation');
    const parts = ids.map(id => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial()); mesh.userData.partId = id; return { id, mesh }; });
    assert.throws(() => installPreparedExterior(THREE, { specimenId: 'frog', parts, prepared: loaded.prepared }), /root extras/);
    loaded.dispose();
  } finally { globalThis.self = priorSelf; globalThis.createImageBitmap = priorBitmap; }
});
