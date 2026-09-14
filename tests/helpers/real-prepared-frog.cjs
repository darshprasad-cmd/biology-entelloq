/* Real shipped geometry/material parsing. Bitmap dimensions are decoded from
 * headers only: this CPU fixture does not prove texture rendering or camera IO. */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = name => fs.readFileSync(path.join(root, 'src/lab', name), 'utf8');
const dataURL = text => 'data:text/javascript;base64,' + Buffer.from(text).toString('base64');
async function loadRealPreparedFrog() {
  const threeURL = dataURL(read('vendor/three.module.min.js')), THREE = await import(threeURL);
  const utilsURL = dataURL(read('vendor/utils/BufferGeometryUtils.js').replace("from 'three'", `from '${threeURL}'`));
  const vendor = await import(dataURL(read('vendor/loaders/GLTFLoader.js').replace("from 'three'", `from '${threeURL}'`).replace("from '../utils/BufferGeometryUtils.js'", `from '${utilsURL}'`)));
  const { createPreparedSpecimenLoader } = await import(dataURL(read('prepared-loader.js')));
  const { installPreparedExterior } = await import(dataURL(read('specimen-assets.js')));
  const previousSelf = globalThis.self, previousBitmap = globalThis.createImageBitmap;
  globalThis.self = globalThis;
  globalThis.createImageBitmap = async blob => {
    const b = new DataView(await blob.arrayBuffer()); let width, height;
    if (b.getUint32(0) === 0x89504e47) { width = b.getUint32(16); height = b.getUint32(20); }
    else for (let offset = 2; offset + 9 < b.byteLength;) {
      const marker = b.getUint8(offset + 1); if (marker === 0xff) { offset++; continue; }
      if ([0xc0, 0xc1, 0xc2].includes(marker)) { height = b.getUint16(offset + 5); width = b.getUint16(offset + 7); break; }
      offset += 2 + b.getUint16(offset + 2);
    }
    if (!width || !height) throw new Error('Unsupported test bitmap header');
    return { width, height, close() {} };
  };
  let loaded;
  try {
    const bytes = fs.readFileSync(path.join(root, 'assets/specimens/frog.glb'));
    const loader = createPreparedSpecimenLoader({ pageURL: () => 'https://biology.test/lab.html',
      fetchImpl: async () => new Response(bytes), importLoader: async () => vendor });
    loaded = await loader(THREE, { specimenId: 'frog', url: './assets/specimens/frog.glb' });
  } finally { globalThis.self = previousSelf; globalThis.createImageBitmap = previousBitmap; }
  const source = ['anatomy', 'frog', 'heart', 'fish', 'earthworm', 'cockroach', 'strata', 'surface', 'pathology', 'softbody', 'cutting', 'dissect']
    .map(name => read(name + '.js')).join('\n').replace(/^export\s+/gm, '');
  const api = new Function('THREE', source + '\nreturn {buildSpecimen,buildStrata,createSurfaceDetail,createPathology,createSoftBody,createCutting,createDissection,PAT_CASES};')(THREE);
  return { THREE, loaded, ...api, fixture(specimen = 'frog', detail = false) {
    const built = api.buildSpecimen(THREE, specimen);
    const handle = specimen === 'frog' ? installPreparedExterior(THREE, { specimenId: 'frog', parts: built.parts, prepared: loaded.prepared }) : null;
    const scene = new THREE.Scene(); scene.add(built.group);
    const strata = detail ? api.buildStrata(THREE, specimen, built.parts, built.group) : null;
    const surface = detail ? api.createSurfaceDetail(THREE, built.parts, specimen, built.group) : null;
    surface?.apply(); scene.updateMatrixWorld(true);
    return { ...built, scene, handle, surface, strata, dispose() { surface?.dispose(); strata?.dispose(); handle?.restore(); } };
  } };
}
module.exports = { loadRealPreparedFrog };
