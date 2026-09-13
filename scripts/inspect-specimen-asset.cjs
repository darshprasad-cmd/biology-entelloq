#!/usr/bin/env node
'use strict';
/* Offline intake preflight, NOT a complete Khronos conformance validator.
 * Specification: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
 * No fetching, extension execution, image decoding, rendering or file writes.
 * Strict supported subset: GLB 2, core uncompressed geometry, embedded BIN;
 * base64 buffers/PNG/JPEG are opt-in. Required extensions fail closed.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const LIMITS = Object.freeze({ fileBytes: 256 * 1024 * 1024, jsonBytes: 16 * 1024 * 1024, objects: 200000, values: 20000000, depth: 64 });
const COMPONENTS = { 5120: [1, 'readInt8', -128, 127], 5121: [1, 'readUInt8', 0, 255], 5122: [2, 'readInt16LE', -32768, 32767], 5123: [2, 'readUInt16LE', 0, 65535], 5125: [4, 'readUInt32LE', 0, 4294967295], 5126: [4, 'readFloatLE', -Infinity, Infinity] };
const SHAPES = { SCALAR: [1, 1], VEC2: [1, 2], VEC3: [1, 3], VEC4: [1, 4], MAT2: [2, 2], MAT3: [3, 3], MAT4: [4, 4] };
function fail(message) { throw new Error(message); }
function check(condition, message) { if (!condition) fail(message); }
function object(value, label) { check(value !== null && typeof value === 'object' && !Array.isArray(value), label + ' must be an object'); return value; }
function integer(value, label, min = 0, max = Number.MAX_SAFE_INTEGER) { check(Number.isSafeInteger(value) && value >= min && value <= max, label + ' must be an integer in range'); return value; }
function array(value, label, optional = true) { if (value === undefined && optional) return []; check(Array.isArray(value), label + ' must be an array'); return value; }
function ref(value, list, label) { return list[integer(value, label, 0, list.length - 1)]; }
function vector(value, size, label) { check(Array.isArray(value) && value.length === size && value.every(Number.isFinite), label + ' must contain ' + size + ' finite numbers'); }
function within(offset, length, available, label) { check(Number.isSafeInteger(offset + length) && offset <= available && length <= available - offset, label + ' exceeds its containing buffer'); }
function name(value) { return typeof value === 'string' ? value : null; }

function inspectGLB(bytes, options = {}) {
  check(Buffer.isBuffer(bytes), 'Input must be a Buffer');
  check(bytes.length >= 20 && bytes.length <= LIMITS.fileBytes, 'GLB size outside intake limit');
  check(bytes.readUInt32LE(0) === 0x46546c67, 'Invalid GLB magic');
  check(bytes.readUInt32LE(4) === 2, 'Only GLB version 2 is supported');
  check(bytes.readUInt32LE(8) === bytes.length, 'GLB declared length differs from actual length');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    within(offset, 8, bytes.length, 'Chunk header');
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    check(length % 4 === 0, 'Chunk length must be aligned to four bytes');
    within(offset + 8, length, bytes.length, 'Chunk payload');
    check(chunks.length < 2, 'Unsupported extra or duplicate GLB chunk');
    check(type === (chunks.length === 0 ? 0x4e4f534a : 0x004e4942), 'Expected JSON first and optional BIN second; other chunks unsupported');
    chunks.push({ type, length, data: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  check(chunks[0].length > 0 && chunks[0].length <= LIMITS.jsonBytes, 'JSON chunk size outside intake limit');
  const jsonEnd = chunks[0].data.lastIndexOf(125);
  check(jsonEnd !== -1 && chunks[0].data.subarray(jsonEnd + 1).every(value => value === 32), 'JSON chunk padding must contain only spaces');
  let gltf;
  try { gltf = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(chunks[0].data)); }
  catch { fail('Invalid UTF-8 or JSON in GLB JSON chunk'); }
  object(gltf, 'glTF'); object(gltf.asset, 'asset');
  check(gltf.asset.version === '2.0' && (gltf.asset.minVersion === undefined || gltf.asset.minVersion === '2.0'), 'Only glTF asset version 2.0 is supported');
  const pending = [{ value: gltf, depth: 0 }], uris = [], consumedUris = new Set(); let objectCount = 0;
  while (pending.length) {
    const { value, depth } = pending.pop();
    check(depth <= LIMITS.depth && ++objectCount <= LIMITS.objects, 'JSON complexity exceeds intake limit');
    if (typeof value === 'number') check(Number.isFinite(value), 'JSON contains a non-finite number');
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      if (key === 'extensions' && child && typeof child === 'object') check(!Object.keys(child).some(v => /draco|meshopt/i.test(v)), 'Compressed geometry requires separate reviewed decoding');
      if (key === 'uri') {
        check(typeof child === 'string', 'URI must be a string');
        check(options.allowEmbeddedData === true && child.startsWith('data:'), 'External, relative and data URIs are blocked by default; only explicit embedded data is allowed');
        uris.push(child);
      }
      pending.push({ value: child, depth: depth + 1 });
    }
  }
  const used = array(gltf.extensionsUsed, 'extensionsUsed'), required = array(gltf.extensionsRequired, 'extensionsRequired');
  check(used.every(v => typeof v === 'string') && required.every(v => typeof v === 'string'), 'Extension names must be strings');
  check(required.length === 0, 'Required extensions are unsupported by this core-only intake checker: ' + required.join(', '));
  // Optional compression also needs decoding to prove geometry/index ranges.
  check(!used.some(v => /draco|meshopt/i.test(v)), 'Compressed geometry requires separate reviewed decoding');
  const lists = {};
  for (const key of ['buffers', 'bufferViews', 'accessors', 'meshes', 'materials', 'textures', 'images', 'samplers', 'nodes', 'skins', 'animations', 'scenes', 'cameras']) {
    lists[key] = array(gltf[key], key); lists[key].forEach((v, i) => object(v, key + '[' + i + ']'));
  }
  const { bufferViews, accessors, meshes, materials, textures, images, samplers, nodes, skins, animations, scenes, cameras } = lists;
  let embeddedBytes = bytes.length;
  function dataURI(uri, kind, label) {
    check(options.allowEmbeddedData === true, label + ': embedded data requires --allow-embedded-data');
    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(uri);
    check(match && match[2].length % 4 === 0, label + ': only strict base64 data URIs are supported');
    const allowed = kind === 'buffer' ? ['application/octet-stream', 'application/gltf-buffer'] : ['image/png', 'image/jpeg'];
    check(allowed.includes(match[1]), label + ': unsupported embedded MIME type');
    check(embeddedBytes + match[2].length * 3 / 4 <= LIMITS.fileBytes, 'Embedded payload exceeds intake memory limit');
    const result = Buffer.from(match[2], 'base64');
    check(result.toString('base64') === match[2], label + ': invalid base64 padding');
    embeddedBytes += result.length;
    consumedUris.add(uri);
    return { data: result, mime: match[1] };
  }
  const buffers = lists.buffers.map((buffer, i) => {
    const length = integer(buffer.byteLength, 'buffer.byteLength', 1, LIMITS.fileBytes);
    if (buffer.uri !== undefined) {
      check(!(i === 0 && chunks[1]), 'GLB BIN buffer 0 must not have a URI');
      const data = dataURI(buffer.uri, 'buffer', 'buffer ' + i).data;
      check(data.length === length, 'Embedded buffer length does not match byteLength'); return data;
    }
    check(i === 0 && chunks[1], 'Only buffer 0 may reference the GLB BIN chunk');
    const data = chunks[1].data;
    check(data.length >= length && data.length - length <= 3, 'BIN length does not match buffer byteLength plus padding');
    for (let p = length; p < data.length; p++) check(data[p] === 0, 'BIN padding must be zero');
    return data.subarray(0, length);
  });
  check(!chunks[1] || (buffers.length > 0 && lists.buffers[0].uri === undefined), 'BIN chunk has no embedded buffer declaration');
  const views = bufferViews.map((view, i) => {
    const data = ref(view.buffer, buffers, 'bufferView.buffer'), offset = integer(view.byteOffset ?? 0, 'bufferView.byteOffset');
    const length = integer(view.byteLength, 'bufferView.byteLength', 1); within(offset, length, data.length, 'bufferView ' + i);
    if (view.byteStride !== undefined) { integer(view.byteStride, 'bufferView.byteStride', 4, 252); check(view.byteStride % 4 === 0, 'byteStride must be a multiple of four'); }
    if (view.target !== undefined) check([34962, 34963].includes(view.target), 'Invalid bufferView target');
    check(view.target !== 34963 || view.byteStride === undefined, 'Index bufferView cannot have byteStride');
    return { data, offset, length, stride: view.byteStride, target: view.target };
  });
  let valueCount = 0, visitedValues = 0;
  function range(viewIndex, offset, count, layout, label, sparse = false) {
    const view = ref(viewIndex, views, label + '.bufferView'); integer(offset, label + '.byteOffset');
    check(offset % layout.size === 0 && (view.offset + offset) % layout.size === 0, label + ': misaligned component offset');
    if (layout.matrix) check((view.offset + offset) % 4 === 0, label + ': matrix columns must be four-byte aligned');
    if (sparse) check(view.stride === undefined && view.target === undefined, label + ': sparse views cannot have stride or target');
    const stride = view.stride ?? layout.stride;
    check(stride >= layout.stride && stride % layout.size === 0, label + ': byteStride smaller than element or misaligned');
    within(offset, (count - 1) * stride + layout.tail, view.length, label);
    return { data: view.data, start: view.offset + offset, stride, view };
  }
  const compiled = accessors.map((accessor, i) => {
    check(Number.isInteger(accessor.componentType) && Object.hasOwn(COMPONENTS, accessor.componentType) && typeof accessor.type === 'string' && Object.hasOwn(SHAPES, accessor.type), 'accessor ' + i + ': unsupported componentType or type');
    const component = COMPONENTS[accessor.componentType], shape = SHAPES[accessor.type];
    check(component && shape, 'accessor ' + i + ': unsupported componentType or type');
    const count = integer(accessor.count, 'accessor.count', 1, LIMITS.values), [size, method, low, high] = component, [columns, rows] = shape;
    const columnStride = columns > 1 ? Math.ceil(rows * size / 4) * 4 : rows * size;
    const offsets = Array.from({ length: columns * rows }, (_, n) => Math.floor(n / rows) * columnStride + n % rows * size);
    const layout = { size, matrix: columns > 1, stride: columns * columnStride, tail: offsets.at(-1) + size };
    valueCount += count * offsets.length; check(valueCount <= LIMITS.values, 'Accessor scalar work exceeds intake limit');
    if (accessor.normalized !== undefined) check(typeof accessor.normalized === 'boolean', 'accessor.normalized must be boolean');
    check(!accessor.normalized || ![5125, 5126].includes(accessor.componentType), 'This accessor component type cannot be normalized');
    for (const key of ['min', 'max']) if (accessor[key] !== undefined) {
      vector(accessor[key], offsets.length, 'accessor.' + key);
      check(accessor[key].every(v => v >= low && v <= high && (accessor.componentType === 5126 || Number.isInteger(v))), 'Accessor bounds exceed component range');
    }
    if (accessor.min && accessor.max) check(accessor.min.every((v, j) => v <= accessor.max[j]), 'Accessor min exceeds max');
    const base = accessor.bufferView === undefined ? null : range(accessor.bufferView, accessor.byteOffset ?? 0, count, layout, 'accessor ' + i);
    check(base || (accessor.byteOffset === undefined || accessor.byteOffset === 0), 'Accessor without bufferView cannot have a byteOffset');
    let sparse = null;
    if (accessor.sparse !== undefined) {
      const s = object(accessor.sparse, 'accessor.sparse'), n = integer(s.count, 'sparse.count', 1, count);
      object(s.indices, 'sparse.indices'); object(s.values, 'sparse.values');
      check([5121, 5123, 5125].includes(s.indices.componentType), 'Invalid sparse index component type');
      const [isize, imethod] = COMPONENTS[s.indices.componentType];
      const ir = range(s.indices.bufferView, s.indices.byteOffset ?? 0, n, { size: isize, stride: isize, tail: isize }, 'sparse indices', true);
      const vr = range(s.values.bufferView, s.values.byteOffset ?? 0, n, layout, 'sparse values', true);
      const indices = new Uint32Array(n); let previous = -1;
      for (let k = 0; k < n; k++) { const index = ir.data[imethod](ir.start + k * isize); check(index > previous && index < count, 'Sparse indices must be increasing and in accessor range'); indices[k] = index; previous = index; }
      sparse = { indices, values: vr };
    }
    const result = { count, components: offsets.length, type: accessor.type, componentType: accessor.componentType, normalized: !!accessor.normalized, base, layout, min: accessor.min, max: accessor.max };
    function visit(callback) {
      visitedValues += count * offsets.length;
      check(visitedValues <= LIMITS.values, 'Repeated accessor scans exceed intake work limit');
      let k = 0;
      for (let row = 0; row < count; row++) {
        const override = sparse && k < sparse.indices.length && sparse.indices[k] === row;
        const source = override ? sparse.values : base, start = source ? source.start + (override ? k : row) * source.stride : 0;
        for (let col = 0; col < offsets.length; col++) callback(source ? source.data[method](start + offsets[col]) : 0, row, col);
        if (override) k++;
      }
    }
    result.visit = visit;
    visit((v, row, col) => {
      check(Number.isFinite(v), 'Accessor ' + i + ' contains non-finite binary values');
      const tolerance = accessor.componentType === 5126 ? Math.max(1, Math.abs(v)) * 1e-6 : 0;
      if (accessor.min) check(v >= accessor.min[col] - tolerance, 'Accessor binary value below declared min');
      if (accessor.max) check(v <= accessor.max[col] + tolerance, 'Accessor binary value above declared max');
    });
    return result;
  });
  function vertex(index, count, label) {
    const a = ref(index, compiled, label);
    if (count !== undefined) check(a.count === count, label + ': attribute counts differ');
    if (a.base) check((a.base.start - a.base.view.offset) % 4 === 0 && a.base.stride % 4 === 0 && a.base.view.target !== 34963, label + ': vertex layout must be four-byte aligned and not an index view');
    return a;
  }
  let totalTriangles = 0, totalVertices = 0, primitiveCount = 0;
  const meshReport = meshes.map((mesh, mi) => {
    const primitives = array(mesh.primitives, 'mesh.primitives', false); check(primitives.length > 0, 'Mesh must have primitives');
    const detail = primitives.map((primitive, pi) => {
      object(primitive, 'primitive'); object(primitive.attributes, 'primitive.attributes');
      check(!primitive.extensions || !Object.keys(primitive.extensions).some(v => /draco|meshopt/i.test(v)), 'Compressed primitive unsupported');
      const position = vertex(primitive.attributes.POSITION, undefined, 'POSITION');
      check(position.type === 'VEC3' && position.componentType === 5126 && position.min && position.max, 'Core POSITION must be float VEC3 with min/max');
      for (const [semantic, index] of Object.entries(primitive.attributes)) {
        const a = vertex(index, position.count, semantic);
        if (semantic === 'NORMAL' || semantic === 'TANGENT') check(a.type === (semantic === 'NORMAL' ? 'VEC3' : 'VEC4') && a.componentType === 5126, 'Invalid ' + semantic + ' format');
        else if (/^(TEXCOORD|COLOR|JOINTS|WEIGHTS)_\d+$/.test(semantic)) {
          const kind = semantic.split('_')[0], types = kind === 'COLOR' ? ['VEC3', 'VEC4'] : [kind === 'TEXCOORD' ? 'VEC2' : 'VEC4'];
          check(types.includes(a.type), 'Invalid ' + semantic + ' shape');
          check(kind === 'JOINTS' ? [5121, 5123].includes(a.componentType) && !a.normalized : a.componentType === 5126 || ([5121, 5123].includes(a.componentType) && a.normalized), 'Invalid ' + semantic + ' component format');
        } else check(['POSITION', 'NORMAL', 'TANGENT'].includes(semantic) || semantic.startsWith('_'), 'Unknown core attribute semantic');
      }
      let count = position.count;
      if (primitive.indices !== undefined) {
        const indices = ref(primitive.indices, compiled, 'primitive.indices');
        check(indices.type === 'SCALAR' && [5121, 5123, 5125].includes(indices.componentType) && !indices.normalized, 'Invalid index accessor format');
        check(!indices.base || (indices.base.view.stride === undefined && indices.base.view.target !== 34962), 'Indices must not be strided or use vertex target');
        indices.visit(v => check(v < position.count && v !== COMPONENTS[indices.componentType][3], 'Primitive index exceeds vertex range or uses restart sentinel'));
        count = indices.count;
      }
      const mode = integer(primitive.mode ?? 4, 'primitive.mode', 0, 6);
      if (mode === 4) check(count % 3 === 0, 'TRIANGLES index/vertex count must be divisible by three');
      if (mode === 1) check(count % 2 === 0, 'LINES count must be divisible by two');
      if ([2, 3].includes(mode)) check(count >= 2, 'Line primitive requires two vertices');
      if ([4, 5, 6].includes(mode)) check(count >= 3, 'Triangle primitive requires three vertices');
      if (primitive.material !== undefined) ref(primitive.material, materials, 'primitive.material');
      const targets = array(primitive.targets, 'primitive.targets');
      for (const target of targets) for (const [semantic, index] of Object.entries(object(target, 'morph target'))) {
        const a = vertex(index, position.count, 'morph target');
        check(['POSITION', 'NORMAL', 'TANGENT'].includes(semantic) && a.type === 'VEC3' && a.componentType === 5126, 'Unsupported morph target format');
      }
      const triangles = mode === 4 ? count / 3 : [5, 6].includes(mode) ? count - 2 : 0;
      totalTriangles += triangles; totalVertices += position.count; primitiveCount++;
      return { primitive: pi, mode, vertices: position.count, indices: primitive.indices === undefined ? 0 : count, triangles, attributes: Object.keys(primitive.attributes), morphTargets: targets.length, material: primitive.material ?? null, positionBounds: { min: position.min, max: position.max } };
    });
    return { mesh: mi, name: name(mesh.name), primitives: detail };
  });
  function imageSignature(data, mime) {
    check(mime === 'image/png' ? data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255, 'Embedded image signature does not match PNG/JPEG MIME');
  }
  images.forEach((image, i) => {
    check((image.uri !== undefined) !== (image.bufferView !== undefined), 'Image must have exactly one embedded URI or bufferView');
    if (image.uri !== undefined) { const embedded = dataURI(image.uri, 'image', 'image ' + i); if (image.mimeType !== undefined) check(image.mimeType === embedded.mime, 'Image MIME differs from data URI'); imageSignature(embedded.data, embedded.mime); }
    else {
      check(['image/png', 'image/jpeg'].includes(image.mimeType), 'Only embedded PNG/JPEG images are supported');
      const view = ref(image.bufferView, views, 'image.bufferView'); check(view.stride === undefined && view.target === undefined, 'Image view cannot have target or stride');
      imageSignature(view.data.subarray(view.offset, view.offset + view.length), image.mimeType);
    }
  });
  textures.forEach(texture => { ref(texture.source, images, 'texture.source'); if (texture.sampler !== undefined) ref(texture.sampler, samplers, 'texture.sampler'); });
  // Material extension semantics are not implemented; core texture references
  // must still be local and in range. Optional extensions remain review items.
  materials.forEach(material => {
    const infos = [material.normalTexture, material.occlusionTexture, material.emissiveTexture, material.pbrMetallicRoughness?.baseColorTexture, material.pbrMetallicRoughness?.metallicRoughnessTexture];
    infos.filter(v => v !== undefined).forEach(info => { object(info, 'texture info'); ref(info.index, textures, 'material texture index'); });
  });
  const parent = new Int32Array(nodes.length).fill(-1);
  nodes.forEach((node, i) => {
    if (node.mesh !== undefined) ref(node.mesh, meshes, 'node.mesh'); if (node.skin !== undefined) ref(node.skin, skins, 'node.skin'); if (node.camera !== undefined) ref(node.camera, cameras, 'node.camera');
    check(node.matrix === undefined || ['translation', 'rotation', 'scale'].every(k => node[k] === undefined), 'Node cannot combine matrix and TRS');
    for (const [key, size] of [['matrix', 16], ['translation', 3], ['rotation', 4], ['scale', 3]]) if (node[key] !== undefined) vector(node[key], size, 'node.' + key);
    for (const child of array(node.children, 'node.children')) { ref(child, nodes, 'node child'); check(parent[child] === -1 && child !== i, 'Node has duplicate/multiple parents or self-cycle'); parent[child] = i; }
  });
  const visited = new Uint8Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) {
    let current = i; const chain = [];
    while (current !== -1 && visited[current] === 0) { visited[current] = 1; chain.push(current); current = parent[current]; }
    check(current === -1 || visited[current] !== 1, 'Node hierarchy contains a cycle'); chain.forEach(index => { visited[index] = 2; });
  }
  if (gltf.scene !== undefined) ref(gltf.scene, scenes, 'default scene');
  scenes.forEach(scene => { const roots = array(scene.nodes, 'scene.nodes'); check(new Set(roots).size === roots.length, 'Duplicate scene root'); roots.forEach(index => { ref(index, nodes, 'scene node'); check(parent[index] === -1, 'Scene node must be a hierarchy root'); }); });
  skins.forEach(skin => {
    const joints = array(skin.joints, 'skin.joints', false); check(joints.length > 0 && new Set(joints).size === joints.length, 'Skin joints must be nonempty and unique'); joints.forEach(i => ref(i, nodes, 'skin joint'));
    if (skin.skeleton !== undefined) ref(skin.skeleton, nodes, 'skin.skeleton');
    if (skin.inverseBindMatrices !== undefined) { const a = ref(skin.inverseBindMatrices, compiled, 'inverseBindMatrices'); check(a.type === 'MAT4' && a.componentType === 5126 && a.count >= joints.length && (!a.base || a.base.view.stride === undefined), 'Invalid inverse bind matrix accessor'); }
  });
  animations.forEach(animation => {
    const tracks = array(animation.samplers, 'animation.samplers', false), channels = array(animation.channels, 'animation.channels', false);
    check(tracks.length > 0 && channels.length > 0, 'Animation needs samplers and channels');
    tracks.forEach(track => {
      object(track, 'animation sampler'); const input = ref(track.input, compiled, 'animation input'); ref(track.output, compiled, 'animation output');
      check(input.type === 'SCALAR' && input.componentType === 5126 && input.min && input.max && (!input.base || input.base.view.stride === undefined), 'Animation input must be bounded float SCALAR without stride');
      let previous = -Infinity; input.visit(value => { check(value >= 0 && value > previous, 'Animation times must be nonnegative and strictly increasing'); previous = value; });
      check(['LINEAR', 'STEP', 'CUBICSPLINE'].includes(track.interpolation ?? 'LINEAR'), 'Unsupported animation interpolation');
    });
    const targets = new Set();
    channels.forEach(channel => {
      object(channel, 'animation channel'); object(channel.target, 'animation target'); const track = ref(channel.sampler, tracks, 'animation sampler index');
      const node = ref(channel.target.node, nodes, 'animation target node'), target = channel.target.path;
      check(['translation', 'rotation', 'scale', 'weights'].includes(target), 'Unsupported animation target');
      check(node.matrix === undefined, 'Animated node cannot use a matrix');
      const key = channel.target.node + '/' + target; check(!targets.has(key), 'Duplicate animation channel target'); targets.add(key);
      const input = compiled[track.input], output = compiled[track.output], factor = (track.interpolation === 'CUBICSPLINE' ? 3 : 1);
      let width = 1;
      if (target === 'weights') { const mesh = ref(node.mesh, meshes, 'morph animation mesh'); width = array(mesh.primitives[0].targets, 'morph targets').length; check(width > 0, 'Weights animation needs morph targets'); }
      check(output.componentType === 5126 && output.type === (target === 'weights' ? 'SCALAR' : target === 'rotation' ? 'VEC4' : 'VEC3') && output.count === input.count * factor * width && (!output.base || output.base.view.stride === undefined), 'Animation output shape/count mismatch');
    });
  });
  check(uris.every(uri => consumedUris.has(uri)), 'URI outside supported embedded buffer/image fields requires separate review');
  return {
    valid: true, scope: 'Offline core GLB structural intake, not full glTF conformance or runtime approval',
    sourceSHA256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, glbVersion: 2,
    generator: name(gltf.asset.generator), copyright: name(gltf.asset.copyright),
    counts: { nodes: nodes.length, meshes: meshes.length, primitives: primitiveCount, vertices: totalVertices, triangles: totalTriangles, materials: materials.length, textures: textures.length, images: images.length, skins: skins.length, animations: animations.length, buffers: buffers.length, bufferViews: views.length, accessors: compiled.length },
    meshes: meshReport, nodes: nodes.map((node, i) => ({ node: i, name: name(node.name), mesh: node.mesh ?? null, skin: node.skin ?? null, children: node.children || [] })),
    materials: materials.map((m, i) => ({ material: i, name: name(m.name), alphaMode: m.alphaMode ?? 'OPAQUE', doubleSided: m.doubleSided === true })),
    textures: textures.map((t, i) => ({ texture: i, image: t.source, sampler: t.sampler ?? null })),
    skins: skins.map((s, i) => ({ skin: i, name: name(s.name), joints: s.joints.length })),
    animations: animations.map((a, i) => ({ animation: i, name: name(a.name), channels: a.channels.length, samplers: a.samplers.length })),
    extensions: { used, required }, uriPolicy: options.allowEmbeddedData ? 'Embedded base64 only; external references forbidden' : 'BIN only; all URIs forbidden',
    limitations: ['Not anatomical, visual, licensing or dissection-suitability approval.', 'Counts describe stored primitives, not scene instances, draw calls or GPU performance.', 'Image headers only; compressed image contents are not decoded or safety-certified.', 'Optional extension and full material/camera/skin semantics require separate review.', 'Bounds are mesh-local accessor bounds, not transformed scene dimensions.'],
  };
}

function inspectFile(filename, options = {}) {
  const fd = fs.openSync(filename, 'r');
  try {
    const stat = fs.fstatSync(fd); check(stat.isFile() && stat.size <= LIMITS.fileBytes, 'Input must be a regular file within intake size limit');
    // Bound allocation/read even if another process grows the file after stat.
    const bytes = Buffer.allocUnsafe(stat.size + 1); let total = 0;
    while (total < bytes.length) { const n = fs.readSync(fd, bytes, total, bytes.length - total, null); if (!n) break; total += n; }
    check(total === stat.size, 'Input length changed while reading');
    return inspectGLB(bytes.subarray(0, total), options);
  }
  finally { fs.closeSync(fd); }
}
function main(args) {
  if (args.includes('--help')) { process.stdout.write('Usage: node scripts/inspect-specimen-asset.cjs [--allow-embedded-data] specimen.glb\nRead-only core GLB preflight; report JSON on stdout. External URIs are always blocked.\n'); return; }
  const allowEmbeddedData = args.includes('--allow-embedded-data'), files = args.filter(v => v !== '--allow-embedded-data');
  try {
    check(files.length === 1 && !files[0].startsWith('--'), 'Supply exactly one local GLB path; use --help for usage');
    const filename = path.resolve(files[0]), report = inspectFile(filename, { allowEmbeddedData });
    process.stdout.write(JSON.stringify({ source: filename, ...report }, null, 2) + '\n');
  } catch (error) { process.stdout.write(JSON.stringify({ valid: false, error: error.message }, null, 2) + '\n'); process.exitCode = 1; }
}
module.exports = { inspectGLB, inspectFile, LIMITS };
if (require.main === module) main(process.argv.slice(2));
