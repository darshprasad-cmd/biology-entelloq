/* Embedded core GLB only. This boundary loads; specimen-assets.js validates the
 * exact prepared part contract before installation. It does not establish fit,
 * anatomical accuracy, licensing or visual acceptance. Imported as a local
 * module by lab.html, with its existing offline 'three' import map.
 */
const PL_MAX_BYTES = 32 * 1024 * 1024;
const PL_SPECIMENS = ['frog', 'cockroach'];
function PL_check(value, message) { if (!value) throw new Error('Prepared loader: ' + message); }
function PL_abort(signal) { if (signal?.aborted) throw new DOMException('Specimen load cancelled', 'AbortError'); }
function PL_list(value, limit, name) {
  PL_check(Array.isArray(value) && value.length <= limit, name + ' outside supported count'); return value;
}
function PL_integer(value, low, high) { return Number.isSafeInteger(value) && value >= low && value <= high; }
function PL_preflight(bytes, specimenId) {
  PL_check(bytes instanceof ArrayBuffer && bytes.byteLength >= 28 && bytes.byteLength <= PL_MAX_BYTES, 'GLB size limit');
  const view = new DataView(bytes), u32 = offset => view.getUint32(offset, true);
  PL_check(u32(0) === 0x46546c67 && u32(4) === 2 && u32(8) === bytes.byteLength, 'invalid GLB 2 header');
  const jsonLength = u32(12), binHeader = 20 + jsonLength;
  PL_check(jsonLength > 0 && jsonLength <= 1024 * 1024 && jsonLength % 4 === 0
    && u32(16) === 0x4e4f534a && binHeader + 8 <= bytes.byteLength, 'invalid JSON chunk');
  const binLength = u32(binHeader), binStart = binHeader + 8;
  PL_check(u32(binHeader + 4) === 0x004e4942 && binLength % 4 === 0 && binStart + binLength === bytes.byteLength, 'exactly JSON and BIN chunks required');
  const json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes, 20, jsonLength)));
  PL_check(json?.asset?.version === '2.0' && (!json.asset.minVersion || json.asset.minVersion === '2.0'), 'unsupported asset version');
  const pending = [[json, 0]]; let visited = 0;
  while (pending.length) {
    const [value, depth] = pending.pop();
    PL_check(++visited <= 20000 && depth <= 24, 'JSON complexity limit');
    if (typeof value === 'number') PL_check(Number.isFinite(value), 'non-finite JSON number');
    if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
      PL_check(key !== 'uri' && key !== 'extensions' && key !== '__proto__', 'external/data URI or extension unsupported');
      pending.push([child, depth + 1]);
    }
  }
  for (const key of ['extensionsUsed', 'extensionsRequired', 'animations', 'skins', 'cameras'])
    PL_check(json[key] === undefined || (Array.isArray(json[key]) && json[key].length === 0), key + ' unsupported');
  const buffers = PL_list(json.buffers, 1, 'buffers');
  PL_check(buffers.length === 1 && PL_integer(buffers[0].byteLength, 1, binLength)
    && binLength - buffers[0].byteLength <= 3, 'one embedded BIN buffer required');
  const views = PL_list(json.bufferViews, 64, 'bufferViews');
  for (const item of views) PL_check(item.buffer === 0 && item.byteStride === undefined
    && PL_integer(item.byteOffset ?? 0, 0, buffers[0].byteLength)
    && PL_integer(item.byteLength, 1, buffers[0].byteLength - (item.byteOffset ?? 0)), 'invalid packed bufferView');
  const accessors = PL_list(json.accessors, 32, 'accessors');
  for (const a of accessors) {
    const v = views[a.bufferView], size = a.componentType === 5126 || a.componentType === 5125 ? 4 : a.componentType === 5123 ? 2 : 0;
    const width = a.type === 'VEC3' ? 3 : a.type === 'VEC2' ? 2 : a.type === 'SCALAR' ? 1 : 0;
    PL_check(v && size && width && !a.sparse && !a.normalized && PL_integer(a.count, 1, width === 1 ? 54000 : 9000)
      && PL_integer(a.byteOffset ?? 0, 0, v.byteLength) && (a.byteOffset ?? 0) % size === 0
      && ((v.byteOffset ?? 0) + (a.byteOffset ?? 0)) % size === 0
      && (a.byteOffset ?? 0) + a.count * size * width <= v.byteLength, 'invalid or oversized static accessor');
  }
  const meshes = PL_list(json.meshes, 7, 'meshes');
  const materials = PL_list(json.materials, 7, 'materials');
  for (const mesh of meshes) {
    PL_check(!mesh.weights && Array.isArray(mesh.primitives) && mesh.primitives.length === 1, 'one static primitive per mesh required');
    const p = mesh.primitives[0], attrs = p.attributes;
    PL_check((p.mode === undefined || p.mode === 4) && !p.targets && attrs
      && Object.keys(attrs).sort().join(',') === 'NORMAL,POSITION,TEXCOORD_0', 'static position/normal/uv triangles required');
    const pos = accessors[attrs.POSITION], normal = accessors[attrs.NORMAL], uv = accessors[attrs.TEXCOORD_0], index = accessors[p.indices];
    PL_check(pos?.type === 'VEC3' && normal?.type === 'VEC3' && uv?.type === 'VEC2'
      && [pos, normal, uv].every(a => a.componentType === 5126 && a.count === pos.count)
      && index?.type === 'SCALAR' && [5123, 5125].includes(index.componentType) && index.count % 3 === 0
      && materials[p.material], 'invalid primitive references');
  }
  const nodes = PL_list(json.nodes, 8, 'nodes'), scenes = PL_list(json.scenes, 1, 'scenes');
  PL_check(scenes.length === 1 && (json.scene === undefined || json.scene === 0)
    && scenes[0].nodes?.length === 1, 'one scene with one prepared group required');
  const seen = new Set(), queue = [scenes[0].nodes[0]];
  while (queue.length) {
    const index = queue.pop(), node = nodes[index];
    PL_check(PL_integer(index, 0, nodes.length - 1) && !seen.has(index) && node
      && node.skin === undefined && node.camera === undefined && node.weights === undefined && node.isBone === undefined, 'invalid/cyclic/rigged node');
    seen.add(index);
    if (node.mesh !== undefined) PL_check(PL_integer(node.mesh, 0, meshes.length - 1), 'invalid mesh reference');
    if (node.children !== undefined) queue.push(...PL_list(node.children, 7, 'children'));
  }
  PL_check(seen.size === nodes.length, 'unreachable nodes unsupported');
  const group = nodes[scenes[0].nodes[0]];
  PL_check(group.mesh === undefined && group.extras?.schemaVersion === 1 && group.extras?.specimenId === specimenId, 'matching prepared specimen group metadata required');
  const images = PL_list(json.images, 16, 'images'), textures = PL_list(json.textures, 16, 'textures');
  let pixels = 0;
  for (const image of images) {
    const v = views[image.bufferView]; PL_check(v && ['image/png', 'image/jpeg'].includes(image.mimeType), 'embedded PNG/JPEG required');
    const data = new DataView(bytes, binStart + (v.byteOffset ?? 0), v.byteLength); let width = 0, height = 0;
    if (image.mimeType === 'image/png') {
      PL_check(data.byteLength >= 24 && data.getUint32(0) === 0x89504e47 && data.getUint32(4) === 0x0d0a1a0a
        && data.getUint32(12) === 0x49484452, 'invalid PNG header');
      width = data.getUint32(16); height = data.getUint32(20);
    } else {
      PL_check(data.byteLength >= 4 && data.getUint16(0) === 0xffd8, 'invalid JPEG header');
      let offset = 2;
      while (offset + 4 <= data.byteLength) {
        PL_check(data.getUint8(offset) === 0xff, 'invalid JPEG marker');
        const marker = data.getUint8(offset + 1); if (marker === 0xff) { offset++; continue; }
        const length = data.getUint16(offset + 2);
        PL_check(length >= 2 && offset + 2 + length <= data.byteLength, 'invalid JPEG segment');
        if ([0xc0, 0xc1, 0xc2].includes(marker)) {
          PL_check(length >= 8, 'invalid JPEG dimensions'); height = data.getUint16(offset + 5); width = data.getUint16(offset + 7); break;
        }
        offset += 2 + length;
      }
    }
    PL_check(PL_integer(width, 1, 4096) && PL_integer(height, 1, 4096), 'image dimensions exceed decode budget');
    pixels += width * height;
  }
  PL_check(pixels <= 64 * 1024 * 1024, 'combined image decode budget');
  for (const texture of textures) PL_check(PL_integer(texture.source, 0, images.length - 1), 'invalid texture source');
  for (const material of materials) {
    const color = material.pbrMetallicRoughness?.baseColorTexture;
    PL_check(color && textures[color.index], 'textured PBR material required');
  }
  return json;
}

function PL_resources() {
  const geometry = new Set(), materials = new Set(), textures = new Set(), images = new Set(); let disposed = false;
  function collect(value) {
    if (!value) return;
    if (Array.isArray(value)) { value.forEach(collect); return; }
    const set = value.isBufferGeometry ? geometry : value.isMaterial ? materials : value.isTexture ? textures : null;
    if (set && !set.has(value)) {
      set.add(value);
      if (value.isMaterial) Object.values(value).filter(v => v?.isTexture).forEach(collect);
      if (value.isTexture && value.image && !images.has(value.image)) { images.add(value.image); if (disposed) value.image.close?.(); }
      if (disposed) value.dispose();
    }
    if (value.isObject3D) value.traverse(node => { collect(node.geometry); collect(node.material); });
  }
  return { collect, dispose() {
    if (disposed) return; disposed = true;
    for (const set of [geometry, materials, textures]) set.forEach(value => value.dispose());
    images.forEach(image => image.close?.());
  } };
}

// Dependency injection is for CPU tests; production uses the local module only.
export function createPreparedSpecimenLoader({ fetchImpl = (...args) => fetch(...args),
  importLoader = () => import('./vendor/loaders/GLTFLoader.js'),
  pageURL = () => globalThis.location.href } = {}) {
  return async function load(THREE, { specimenId, url, signal } = {}) {
    PL_abort(signal); PL_check(PL_SPECIMENS.includes(specimenId) && THREE.REVISION === '160', 'only frog and cockroach with Three r160 supported');
    PL_check(typeof url === 'string' && /^(?!\/\/)[A-Za-z0-9_./-]+\.glb$/.test(url)
      && !url.split('/').includes('..'), 'same-origin relative GLB URL required');
    const base = new URL(pageURL()), resolved = new URL(url, base);
    PL_check(['http:', 'https:'].includes(base.protocol) && resolved.origin === base.origin, 'same-origin HTTP(S) required');
    const response = await fetchImpl(resolved.href, { signal, mode: 'same-origin', credentials: 'omit', redirect: 'error' });
    PL_abort(signal); PL_check(response.ok && !response.redirected && (!response.url || response.url === resolved.href), 'asset fetch failed or redirected');
    const declared = response.headers.get('content-length');
    PL_check(declared === null || (/^\d+$/.test(declared) && Number(declared) <= PL_MAX_BYTES), 'asset response exceeds size budget');
    const reader = response.body?.getReader(); PL_check(reader, 'streaming response required');
    const chunks = []; let size = 0;
    const cancel = () => { reader.cancel().catch(() => {}); };
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      while (true) {
        PL_abort(signal); const { value, done } = await reader.read(); PL_abort(signal); if (done) break;
        size += value.byteLength; PL_check(size <= PL_MAX_BYTES, 'asset stream exceeds size budget'); chunks.push(value);
      }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    finally { signal?.removeEventListener('abort', cancel); reader.releaseLock(); }
    const data = new Uint8Array(size); let offset = 0;
    chunks.forEach(chunk => { data.set(chunk, offset); offset += chunk.byteLength; });
    const definition = PL_preflight(data.buffer, specimenId); PL_abort(signal);
    const { GLTFLoader } = await importLoader(); PL_abort(signal);
    const owned = PL_resources(), manager = new THREE.LoadingManager();
    manager.setURLModifier(assetURL => { PL_check(assetURL.startsWith('blob:'), 'external parser request blocked'); return assetURL; });
    const loader = new GLTFLoader(manager);
    // Pinned r160 parser hook tracks resolved dependencies even after cancellation
    // or parse rejection, so late decoded textures are also released.
    loader.register(parser => {
      const get = parser.getDependency.bind(parser);
      parser.getDependency = (...args) => { const promise = get(...args); promise.then(owned.collect, () => {}); return promise; };
      return { name: 'PreparedOwnedResources' };
    });
    let rejectAbort;
    const cancelled = new Promise((resolve, reject) => { rejectAbort = reject; });
    const onAbort = () => { owned.dispose(); rejectAbort(new DOMException('Specimen load cancelled', 'AbortError')); };
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const parsing = loader.parseAsync(data.buffer, '').then(result => { owned.collect(result.scenes); return result; });
      const result = await Promise.race([parsing, cancelled]); PL_abort(signal);
      PL_check(result.animations?.length === 0 && result.scenes?.length === 1 && result.scene?.children.length === 1, 'unexpected parsed scene');
      const authored = result.scene.children[0];
      PL_check((authored.constructor === THREE.Object3D || authored.constructor === THREE.Group)
        && authored.userData.schemaVersion === 1 && authored.userData.specimenId === specimenId, 'missing prepared Group');
      // r160 represents a glTF empty parent as Object3D, and injects node.name
      // into userData. Normalize only these known parser artifacts; never strip
      // authored extras or change geometry/material data to pass the adapter.
      authored.traverse(node => {
        const raw = definition.nodes[result.parser?.associations?.get(node)?.nodes];
        if (raw && !Object.hasOwn(raw.extras || {}, 'name')
          && !Object.hasOwn(definition.meshes[raw.mesh]?.extras || {}, 'name')
          && node.userData.name === raw.name) delete node.userData.name;
      });
      const prepared = new THREE.Group().copy(authored, false);
      for (const child of [...authored.children]) prepared.add(child);
      result.scene.remove(authored);
      return Object.freeze({ prepared, dispose: owned.dispose });
    } catch (error) { owned.dispose(); throw error; }
    finally { signal?.removeEventListener('abort', onAbort); }
  };
}
export const loadPreparedSpecimen = createPreparedSpecimenLoader();
