'use strict';
/* Synthetic binary inputs exercise the offline checker, not renderer/anatomy. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const { inspectGLB, inspectFile, LIMITS } = require('../scripts/inspect-specimen-asset.cjs');
const script = path.resolve(__dirname, '../scripts/inspect-specimen-asset.cjs');

function pack(json, bin) {
  const raw = Buffer.from(typeof json === 'string' ? json : JSON.stringify(json));
  const jsonChunk = Buffer.alloc(Math.ceil(raw.length / 4) * 4, 32); raw.copy(jsonChunk);
  const binChunk = bin === undefined ? null : Buffer.alloc(Math.ceil(bin.length / 4) * 4);
  if (binChunk) bin.copy(binChunk);
  const result = Buffer.alloc(20 + jsonChunk.length + (binChunk ? 8 + binChunk.length : 0));
  result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(jsonChunk.length, 12); result.writeUInt32LE(0x4e4f534a, 16); jsonChunk.copy(result, 20);
  if (binChunk) { const at = 20 + jsonChunk.length; result.writeUInt32LE(binChunk.length, at); result.writeUInt32LE(0x004e4942, at + 4); binChunk.copy(result, at + 8); }
  return result;
}
function triangle() {
  const bin = Buffer.alloc(42);
  [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((v, i) => bin.writeFloatLE(v, i * 4));
  [0, 1, 2].forEach((v, i) => bin.writeUInt16LE(v, 36 + i * 2));
  const json = {
    asset: { version: '2.0', generator: 'synthetic fixture' },
    buffers: [{ byteLength: 42 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 }, { buffer: 0, byteOffset: 36, byteLength: 6, target: 34963 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] }, { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' }],
    meshes: [{ name: 'test exterior', primitives: [{ attributes: { POSITION: 0 }, indices: 1, material: 0 }] }],
    materials: [{ name: 'cuticle' }], nodes: [{ name: 'Specimen', mesh: 0 }], scenes: [{ nodes: [0] }], scene: 0,
  };
  return { json, bin };
}
function reject(change, pattern) { const fixture = triangle(); change(fixture.json, fixture.bin); assert.throws(() => inspectGLB(pack(fixture.json, fixture.bin)), pattern); }

test('reports a valid embedded indexed triangle and exact source hash without runtime approval', () => {
  const { json, bin } = triangle(), bytes = pack(json, bin), result = inspectGLB(bytes);
  assert.equal(result.valid, true); assert.equal(result.sourceSHA256, crypto.createHash('sha256').update(bytes).digest('hex'));
  assert.equal(result.counts.triangles, 1); assert.equal(result.counts.vertices, 3); assert.equal(result.counts.nodes, 1);
  assert.equal(result.counts.materials, 1); assert.equal(result.meshes[0].name, 'test exterior');
  assert.deepEqual(result.meshes[0].primitives[0].attributes, ['POSITION']);
  assert.ok(result.limitations.some(v => v.includes('Not anatomical')));
  assert.ok(result.limitations.some(v => v.includes('not scene instances')));
  assert.equal(result.uriPolicy, 'BIN only; all URIs forbidden');
});

test('accepts interleaved position/normal accessors and counts strip/fan primitives separately', () => {
  const { json } = triangle(), bin = Buffer.alloc(72);
  for (let row = 0; row < 3; row++) { bin.writeFloatLE(row === 1 ? 1 : 0, row * 24); bin.writeFloatLE(row === 2 ? 1 : 0, row * 24 + 4); bin.writeFloatLE(1, row * 24 + 20); }
  json.buffers[0].byteLength = 72; json.bufferViews = [{ buffer: 0, byteLength: 72, byteStride: 24, target: 34962 }];
  json.accessors[1] = { bufferView: 0, byteOffset: 12, componentType: 5126, count: 3, type: 'VEC3' };
  json.meshes[0].primitives = [5, 6].map(mode => ({ attributes: { POSITION: 0, NORMAL: 1 }, mode }));
  const result = inspectGLB(pack(json, bin)); assert.equal(result.counts.triangles, 2); assert.equal(result.counts.primitives, 2);
});

test('supports sparse zero-base geometry with checked replacement indices and values', () => {
  const { json } = triangle(), bin = Buffer.alloc(20); bin.writeUInt16LE(2, 0); bin.writeFloatLE(1, 8);
  [0, 1, 2].forEach((v, i) => bin.writeUInt16LE(v, 14 + i * 2));
  json.buffers[0].byteLength = 20;
  json.bufferViews = [{ buffer: 0, byteLength: 2 }, { buffer: 0, byteOffset: 4, byteLength: 12 }, { buffer: 0, byteOffset: 14, byteLength: 6 }];
  json.accessors[0] = { componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [0, 1, 0], sparse: { count: 1, indices: { bufferView: 0, componentType: 5123 }, values: { bufferView: 1 } } };
  json.accessors[1].bufferView = 2;
  const bytes = pack(json, bin); assert.equal(inspectGLB(bytes).counts.triangles, 1);
  bin.writeUInt16LE(3, 0); assert.throws(() => inspectGLB(pack(json, bin)), /Sparse indices/);
});

test('matrix accessors include column padding but permit omitted final trailing padding', () => {
  const json = { asset: { version: '2.0' }, buffers: [{ byteLength: 23 }], bufferViews: [{ buffer: 0, byteLength: 23 }], accessors: [{ bufferView: 0, componentType: 5121, type: 'MAT3', count: 2 }] };
  assert.equal(inspectGLB(pack(json, Buffer.alloc(23))).counts.accessors, 1);
  json.bufferViews[0].byteLength = 22; assert.throws(() => inspectGLB(pack(json, Buffer.alloc(23))), /exceeds/);
});

test('rejects malformed headers, lengths, chunk order, duplicate chunks and invalid UTF-8/JSON', () => {
  const { json, bin } = triangle(), source = pack(json, bin);
  for (const [offset, value, pattern] of [[0, 0, /magic/], [4, 1, /version/], [8, source.length + 4, /declared length/], [12, 0xfffffffc, /payload/], [12, 3, /aligned/], [16, 0x004e4942, /JSON first/]]) {
    const bytes = Buffer.from(source); bytes.writeUInt32LE(value, offset); assert.throws(() => inspectGLB(bytes), pattern);
  }
  assert.throws(() => inspectGLB(Buffer.alloc(8)), /size/);
  assert.throws(() => inspectGLB(pack('{bad json}')), /Invalid UTF-8 or JSON/);
  const invalidUTF8 = pack(json); invalidUTF8[20] = 255; assert.throws(() => inspectGLB(invalidUTF8), /UTF-8/);
  const extra = Buffer.concat([source, Buffer.alloc(8)]); extra.writeUInt32LE(extra.length, 8); assert.throws(() => inspectGLB(extra), /extra or duplicate/);
  const shortHeader = Buffer.concat([source, Buffer.alloc(4)]); shortHeader.writeUInt32LE(shortHeader.length, 8); assert.throws(() => inspectGLB(shortHeader), /Chunk header/);
  assert.throws(() => inspectGLB(pack(JSON.stringify(json) + '\n', bin)), /JSON chunk padding/);
});

test('rejects missing BIN, excessive padding, invalid padding and wrong buffer declarations', () => {
  const { json, bin } = triangle(); assert.throws(() => inspectGLB(pack(json)), /BIN chunk/);
  json.buffers[0].byteLength = 37; assert.throws(() => inspectGLB(pack(json, bin)), /BIN length/);
  json.buffers[0].byteLength = 42; const padding = pack(json, bin); padding[padding.length - 1] = 1; assert.throws(() => inspectGLB(padding), /padding/);
  json.buffers.push({ byteLength: 1 }); assert.throws(() => inspectGLB(pack(json, bin)), /Only buffer 0/);
});

test('rejects network, relative, file and default data URIs without ever resolving them', () => {
  for (const uri of ['https://example.invalid/model.bin', '//example.invalid/model.bin', '../private.bin', 'file:///C:/secret.bin', 'data:application/octet-stream;base64,AAAA']) {
    reject(json => { json.buffers[0].uri = uri; }, /URIs are blocked/);
    const { json, bin } = triangle(); json.images = [{ uri }];
    assert.throws(() => inspectGLB(pack(json, bin)), /URIs are blocked/);
    if (!uri.startsWith('data:')) assert.throws(() => inspectGLB(pack(json, bin), { allowEmbeddedData: true }), /URIs are blocked/);
  }
});

test('explicit embedded-data mode accepts strict base64 buffers and image headers, never active MIME or external URIs', () => {
  const { json, bin } = triangle(); json.buffers[0].uri = 'data:application/octet-stream;base64,' + bin.toString('base64');
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  json.images = [{ uri: 'data:image/png;base64,' + png.toString('base64') }]; json.textures = [{ source: 0 }];
  json.materials[0].pbrMetallicRoughness = { baseColorTexture: { index: 0 } };
  assert.equal(inspectGLB(pack(json), { allowEmbeddedData: true }).counts.textures, 1);
  json.images[0].uri = 'data:image/svg+xml;base64,' + Buffer.from('<svg/>').toString('base64');
  assert.throws(() => inspectGLB(pack(json), { allowEmbeddedData: true }), /MIME/);
  json.images[0].uri = 'data:image/png;base64,YQ=='; assert.throws(() => inspectGLB(pack(json), { allowEmbeddedData: true }), /signature/);
  json.images[0].uri = 'data:image/png;base64,AAA'; assert.throws(() => inspectGLB(pack(json), { allowEmbeddedData: true }), /base64/);
  delete json.images; delete json.textures; delete json.materials[0].pbrMetallicRoughness;
  json.extras = { uri: 'data:text/html;base64,PGgxLz4=' }; assert.throws(() => inspectGLB(pack(json), { allowEmbeddedData: true }), /outside supported/);
});

test('bufferView/accessor offsets, integer ranges and strides cannot escape their declared byte windows', () => {
  reject(json => { json.bufferViews[0].byteLength = 100; }, /bufferView 0 exceeds/);
  reject(json => { json.bufferViews[0].buffer = 7; }, /bufferView.buffer/);
  reject(json => { json.bufferViews[0].byteOffset = -1; }, /byteOffset/);
  reject(json => { json.bufferViews[0].byteStride = 8; }, /byteStride smaller/);
  reject(json => { json.bufferViews[0].byteStride = 14; }, /multiple of four/);
  reject(json => { json.bufferViews[1].byteStride = 4; }, /Index bufferView/);
  reject(json => { json.accessors[0].byteOffset = 2; }, /misaligned/);
  reject(json => { json.accessors[0].count = 4; }, /accessor 0 exceeds/);
  reject(json => { json.accessors[0].count = LIMITS.values + 1; }, /integer in range/);
  reject(json => { json.accessors[0].count = 1.5; }, /integer in range/);
  reject(json => { json.accessors[0].componentType = '5126'; }, /unsupported componentType/);
});

test('rejects non-finite binary geometry and finite-but-false accessor bounds', () => {
  reject((json, bin) => { bin.writeFloatLE(Infinity, 0); }, /non-finite binary/);
  reject((json, bin) => { bin.writeFloatLE(NaN, 0); }, /non-finite binary/);
  reject(json => { json.accessors[0].min = [2, 0, 0]; }, /min exceeds max/);
  reject(json => { json.accessors[0].max = [0.5, 1, 0]; }, /above declared max/);
  reject(json => { json.accessors[0].min = [0, 0]; }, /finite numbers/);
  const { json, bin } = triangle(); const text = JSON.stringify(json).replace('"max":[1,1,0]', '"max":[1e400,1,0]');
  assert.throws(() => inspectGLB(pack(text, bin)), /non-finite number/);
});

test('rejects invalid primitive indices, component formats, mismatched attributes and incomplete triangles', () => {
  reject((json, bin) => { bin.writeUInt16LE(3, 36); }, /index exceeds/);
  reject(json => { json.accessors[1].normalized = true; }, /Invalid index/);
  reject(json => { json.meshes[0].primitives[0].attributes.NORMAL = 1; }, /vertex layout|Invalid NORMAL/);
  reject(json => { json.accessors[1].count = 2; }, /divisible by three/);
  reject(json => { delete json.accessors[0].min; }, /POSITION/);
  reject(json => { json.meshes[0].primitives[0].material = 5; }, /material/);
  reject(json => { json.meshes[0].primitives[0].mode = 7; }, /primitive.mode/);
});

test('sparse replacements reject strided, unordered, out-of-range and undersized windows', () => {
  reject(json => { json.accessors[0].sparse = { count: 1, indices: { bufferView: 1, componentType: 5123 }, values: { bufferView: 0 } }; }, /sparse views/);
  reject(json => { json.accessors[0].sparse = { count: 4, indices: {}, values: {} }; }, /sparse.count/);
  const json = { asset: { version: '2.0' }, buffers: [{ byteLength: 12 }], bufferViews: [{ buffer: 0, byteLength: 2 }, { buffer: 0, byteOffset: 4, byteLength: 8 }], accessors: [{ componentType: 5126, type: 'SCALAR', count: 3, sparse: { count: 2, indices: { bufferView: 0, componentType: 5121 }, values: { bufferView: 1 } } }] };
  const bin = Buffer.alloc(12); bin[0] = 1; bin[1] = 1; assert.throws(() => inspectGLB(pack(json, bin)), /increasing/);
  bin[1] = 2; json.bufferViews[1].byteLength = 7; assert.throws(() => inspectGLB(pack(json, bin)), /sparse values exceeds/);
});

test('hierarchies reject self-cycles, longer cycles, multiple parents and invalid scene/mesh references', () => {
  reject(json => { json.nodes[0].children = [0]; }, /self-cycle/);
  reject(json => { json.nodes = [{ children: [1] }, { children: [0] }]; }, /cycle/);
  reject(json => { json.nodes = [{ children: [2] }, { children: [2] }, {}]; }, /multiple parents/);
  reject(json => { json.nodes[0].mesh = 2; }, /node.mesh/);
  reject(json => { json.scenes[0].nodes = [3]; }, /scene node/);
  reject(json => { json.nodes[0].matrix = Array(16).fill(0); json.nodes[0].translation = [0, 0, 0]; }, /matrix and TRS/);
});

test('reports core animation/skin inventory and rejects invalid sampler output counts and joint references', () => {
  const { json, bin: old } = triangle(), bin = Buffer.alloc(76); old.copy(bin); bin.writeFloatLE(0, 44); bin.writeFloatLE(1, 48); bin.writeFloatLE(1, 64);
  json.buffers[0].byteLength = 76; json.bufferViews.push({ buffer: 0, byteOffset: 44, byteLength: 8 }, { buffer: 0, byteOffset: 52, byteLength: 24 });
  json.accessors.push({ bufferView: 2, componentType: 5126, type: 'SCALAR', count: 2, min: [0], max: [1] }, { bufferView: 3, componentType: 5126, type: 'VEC3', count: 2 });
  json.nodes.push({ name: 'joint' }); json.skins = [{ joints: [1] }];
  json.animations = [{ name: 'move', samplers: [{ input: 2, output: 3 }], channels: [{ sampler: 0, target: { node: 0, path: 'translation' } }] }];
  const result = inspectGLB(pack(json, bin)); assert.equal(result.counts.animations, 1); assert.equal(result.counts.skins, 1); assert.equal(result.animations[0].channels, 1);
  json.accessors[3].count = 1; assert.throws(() => inspectGLB(pack(json, bin)), /output shape\/count/);
  json.accessors[3].count = 2; json.skins[0].joints = [4]; assert.throws(() => inspectGLB(pack(json, bin)), /skin joint/);
});

test('required/compressed extensions and excessive JSON nesting fail closed', () => {
  reject(json => { json.extensionsRequired = ['KHR_draco_mesh_compression']; }, /Required extensions/);
  reject(json => { json.extensionsUsed = ['EXT_meshopt_compression']; }, /Compressed geometry/);
  reject(json => { json.bufferViews[0].extensions = { EXT_meshopt_compression: {} }; }, /Compressed geometry/);
  reject(json => { json.extras = {}; let current = json.extras; for (let i = 0; i < LIMITS.depth + 1; i++) { current.next = {}; current = current.next; } }, /complexity/);
});

test('CLI and file API are read-only, return JSON, and signal invalid intake with nonzero exit status', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'biology-asset-intake-'));
  try {
    const filename = path.join(dir, 'fixture.glb'), { json, bin } = triangle(), bytes = pack(json, bin); fs.writeFileSync(filename, bytes);
    const initial = fs.readFileSync(filename), report = inspectFile(filename); assert.equal(report.valid, true);
    const result = spawnSync(process.execPath, [script, filename], { encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).sourceSHA256, report.sourceSHA256);
    assert.deepEqual(fs.readFileSync(filename), initial); assert.deepEqual(fs.readdirSync(dir), ['fixture.glb']);
    fs.writeFileSync(filename, Buffer.alloc(24));
    const failed = spawnSync(process.execPath, [script, filename], { encoding: 'utf8', timeout: 10000 });
    assert.equal(failed.status, 1); assert.equal(JSON.parse(failed.stdout).valid, false);
    const help = spawnSync(process.execPath, [script, '--help'], { encoding: 'utf8', timeout: 10000 }); assert.equal(help.status, 0); assert.match(help.stdout, /read.only|Read.only/);
  } finally {
    const relative = path.relative(os.tmpdir(), dir); assert.ok(relative.startsWith('biology-asset-intake-') && !relative.includes(path.sep));
    fs.rmSync(dir, { recursive: true });
  }
});
