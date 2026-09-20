const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let THREE, harness;

before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  const source = fs.readFileSync(path.join(root, 'src/lab/zoomverse.js'), 'utf8');
  const boundary = source.indexOf('  const STAGES = [];');
  assert.ok(boundary > source.indexOf('  function buildNucleosome('), 'complete real builder prefix ends before UI and lifecycle code');
  // Execute the real factory prefix, including stageMat, track, rnd and all
  // builder dependencies. No DOM/WebGL stubs replace geometry or materials.
  const prefix = source.slice(0, boundary).replace('export function createZoomverse', 'function createZoomverse');
  const context = vm.createContext({ THREE, matchMedia: () => ({ matches:false, addEventListener(){}, removeEventListener(){} }) });
  vm.runInContext(prefix + '\nreturn {buildTissue,buildCell,buildNucleus,buildChromatin,buildNucleosome,buildAtom,owned};\n}\nthis.harness=createZoomverse(THREE,{});', context, { filename: 'zoomverse-builder-prefix.js' });
  harness = context.harness;
});

const part = (model, id) => model.userData.parts.find(p => p.id === id).object;
function allMeshes(model) { const out = []; model.traverse(o => { if (o.isMesh) out.push(o); }); return out; }
function connectedComponents(geometry) {
  const index = geometry.index.array, neighbors = new Map(), seen = new Set();
  for (let i = 0; i < index.length; i += 3) for (let j = 0; j < 3; j++) {
    const a = index[i + j], b = index[i + (j + 1) % 3];
    if (!neighbors.has(a)) neighbors.set(a, []); if (!neighbors.has(b)) neighbors.set(b, []);
    neighbors.get(a).push(b); neighbors.get(b).push(a);
  }
  let count = 0;
  for (const vertex of neighbors.keys()) if (!seen.has(vertex)) {
    count++; const queue = [vertex]; seen.add(vertex);
    while (queue.length) for (const n of neighbors.get(queue.pop())) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }
  return count;
}

test('six detailed scale builders have real selectable parts, bounded finite geometry and owned GPU resources', () => {
  const expected = { buildTissue:3, buildCell:10, buildNucleus:5, buildChromatin:3, buildNucleosome:5, buildAtom:4 };
  let totalDrawObjects = 0;
  for (const [name, count] of Object.entries(expected)) {
    const model = harness[name]({}), owned = new Set(harness.owned), parts = model.userData.parts;
    assert.equal(parts.length, count, name); assert.equal(new Set(Array.from(parts, p => p.id)).size, count, 'part IDs are unique');
    model.updateMatrixWorld(true); const descendants = new Set(); let vertexCount = 0;
    model.traverse(object => {
      descendants.add(object); assert.ok(object.matrixWorld.elements.every(Number.isFinite), name + ' finite transform');
      if (!object.isMesh) return;
      totalDrawObjects++; const geometry = object.geometry, position = geometry.attributes.position;
      vertexCount += position.count; assert.ok(Array.from(position.array).every(Number.isFinite), name + ' finite vertices');
      assert.ok(owned.has(geometry), name + ' owns geometry');
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        assert.ok(owned.has(material), name + ' owns materials');
        assert.ok(Number.isFinite(material.userData.baseOpacity), name + ' uses fade-aware stageMat');
      }
      if (object.isInstancedMesh) {
        assert.ok(owned.has(object), 'instance buffers have an owned disposable mesh');
        assert.ok(object.count > 0 && object.count <= 2000, 'bounded instanced population');
        assert.ok(Array.from(object.instanceMatrix.array).every(Number.isFinite), 'finite instance matrices');
      }
    });
    assert.ok(vertexCount > 1000 && vertexCount < 100000, name + ' bounded vertex budget: ' + vertexCount);
    for (const p of parts) {
      assert.ok(descendants.has(p.object), name + ' scene owns selectable object ' + p.id);
      assert.ok(p.label.length > 2 && p.note.length > 40, name + ' explains ' + p.id);
      const bounds = new THREE.Box3().setFromObject(p.object), size = bounds.getSize(new THREE.Vector3());
      assert.ok(size.toArray().every(Number.isFinite) && size.length() > 0, p.id + ' contains geometry');
    }
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    assert.ok(Math.max(...size.toArray()) < 5, name + ' fits a bounded display field');
  }
  assert.ok(totalDrawObjects < 500, 'six stages stay well below 1000 draw objects: ' + totalDrawObjects);
});

test('cell ER stays outside the nucleus, cristae remain connected and the nuclear stage shows interphase architecture', () => {
  const cell = harness.buildCell({}); cell.updateMatrixWorld(true);
  const nucleus = part(cell, 'cell-nucleus'), nucleusCenter = nucleus.getWorldPosition(new THREE.Vector3()), radius = 1.6 * nucleus.scale.x;
  const er = part(cell, 'cell-rer'), sheets = er.children.filter(o => o.geometry?.type === 'SphereGeometry' && o.geometry.parameters.radius > 0.1);
  assert.equal(sheets.length, 4, 'four flattened rough-ER sacs');
  for (const sheet of sheets) {
    const positions = sheet.geometry.attributes.position, vertex = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(sheet.matrixWorld);
      assert.ok(vertex.distanceTo(nucleusCenter) > radius, 'ER cannot cross the open nuclear interior');
    }
    sheet.geometry.computeBoundingBox(); const extent = sheet.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(extent.x > extent.y * 3 && extent.z > extent.y * 2, 'cisternae are sheets, not tubes');
  }
  for (const mito of part(cell, 'cell-mito').children) {
    assert.equal(mito.children.length, 2, 'distinct outer and inner boundaries');
    assert.equal(connectedComponents(mito.children[1].geometry), 1, 'cristae are folds of one connected mesh');
    assert.ok(mito.children.every(o => o.geometry.type !== 'TorusGeometry'), 'no disconnected crista rings');
  }
  const model = harness.buildNucleus({}), meshes = allMeshes(model);
  assert.match(model.userData.model, /interphase/i);
  assert.equal(meshes.filter(o => o.geometry.type === 'CapsuleGeometry').length, 0, 'no condensed chromosome arms');
  assert.ok(part(model, 'nucleus-chromatin').children.length >= 12, 'diffuse chromatin paths');
  assert.equal(part(model, 'nucleus-pores').children.length, 4);
  const envelopes = part(model, 'nucleus-envelope').children.filter(o => o.geometry.type === 'SphereGeometry');
  assert.equal(envelopes.length, 2, 'double envelope');
  const unperforated = new THREE.SphereGeometry(1.6, 48, 32, Math.PI, Math.PI);
  envelopes.forEach(o => assert.ok(o.geometry.index.count < unperforated.index.count, 'actual envelope openings at pores'));
  unperforated.dispose();
  assert.ok(part(model, 'nucleus-nucleolus').children.length > 0);
});

test('chromatin and nucleosome details preserve histone octamer composition and explanatory packing limits', () => {
  const chromatin = harness.buildChromatin({});
  assert.equal(part(chromatin, 'cores').children.length, part(chromatin, 'wrapped-dna').children.length, 'every visible core has a DNA wrap');
  assert.match(chromatin.userData.parts.find(p => p.id === 'wrapped-dna').note, /not a universal chromatin fibre/);
  chromatin.updateMatrixWorld(true);
  const wraps = part(chromatin, 'wrapped-dna').children, links = part(chromatin, 'linker').children;
  assert.equal(links.length, wraps.length - 1, 'one linker between each pair of adjacent wraps');
  links.forEach((link, i) => {
    const previousEnd = wraps[i].geometry.parameters.path.getPoint(1).applyMatrix4(wraps[i].matrixWorld);
    const nextStart = wraps[i+1].geometry.parameters.path.getPoint(0).applyMatrix4(wraps[i+1].matrixWorld);
    assert.ok(link.geometry.parameters.path.getPoint(0).distanceTo(previousEnd) < 1e-8, 'linker begins at actual wrapped DNA');
    assert.ok(link.geometry.parameters.path.getPoint(1).distanceTo(nextStart) < 1e-8, 'linker reaches next wrap instead of core centre');
  });
  const nucleosome = harness.buildNucleosome({}), histoneParts = nucleosome.userData.parts.filter(p => p.id.startsWith('histone-'));
  assert.deepEqual(Array.from(histoneParts, p => p.id), ['histone-h2a','histone-h2b','histone-h3','histone-h4']);
  assert.equal(histoneParts.reduce((n, p) => n + p.object.children.length, 0), 8, 'two copies each of four core histones');
  histoneParts.forEach(p => assert.equal(p.object.children.length, 2));
  assert.equal(part(nucleosome, 'core-dna').children.length, 2, 'two DNA backbones');
  assert.match(nucleosome.userData.parts.find(p => p.id === 'core-dna').note, /1\.65/);
});

test('highlighting one selectable cell part cannot recolour another part through shared emissive materials', () => {
  const model = harness.buildCell({}), owners = new Map();
  for (const entry of model.userData.parts) entry.object.traverse(object => {
    for (const material of object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : []) {
      if (!material.emissive) continue;
      if (owners.has(material)) assert.equal(owners.get(material), entry.id, 'selection material belongs to one part');
      else owners.set(material, entry.id);
      assert.ok(harness.owned.includes(material), 'isolated material participates in disposal');
    }
  });
  for (const [selected, unaffected] of [['cell-golgi','cell-vesicles'],['cell-ribosomes','cell-rer']]) {
    const remaining = allMeshes(part(model,unaffected)).map(o => ({ material:o.material, hex:o.material.emissive.getHex(), intensity:o.material.emissiveIntensity }));
    part(model,selected).traverse(o => { if (o.material?.emissive) { o.material.emissive.setHex(0x53bba2); o.material.emissiveIntensity = 0.42; } });
    for (const entry of remaining) { assert.equal(entry.material.emissive.getHex(), entry.hex, unaffected + ' keeps its colour'); assert.equal(entry.material.emissiveIntensity, entry.intensity); }
  }
});

test('carbon-12 has six protons and neutrons with deterministic stationary probability clouds, not classical orbits', () => {
  const first = harness.buildAtom({}), second = harness.buildAtom({}), nucleus = part(first, 'atom-nucleus');
  assert.equal(nucleus.children.filter(o => o.userData.nucleon === 'proton').length, 6);
  assert.equal(nucleus.children.filter(o => o.userData.nucleon === 'neutron').length, 6);
  assert.equal(first.userData.configuration, '1s2 2s2 2p2'); assert.equal(first.userData.electrons, undefined);
  assert.equal(allMeshes(first).filter(o => o.geometry.type === 'TorusGeometry').length, 0, 'no orbit rings');
  assert.match(first.userData.parts[0].label, /enlarged/i); assert.match(first.userData.model, /not classical orbits or a computed carbon wavefunction/);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), radialMeans = [];
  for (const [id, expected] of [['atom-1s',420],['atom-2s',560],['atom-2p',720]]) {
    const cloud = part(first,id), repeated = part(second,id); assert.ok(cloud.isInstancedMesh); assert.equal(cloud.count,expected);
    assert.deepEqual(Array.from(cloud.instanceMatrix.array), Array.from(repeated.instanceMatrix.array), id + ' reproducible population');
    let radial = 0, xy = 0, z = 0;
    for (let i = 0; i < cloud.count; i++) { cloud.getMatrixAt(i,matrix); position.setFromMatrixPosition(matrix); radial += position.lengthSq(); xy += position.x ** 2 + position.y ** 2; z += position.z ** 2; }
    radialMeans.push(radial / cloud.count);
    if (id === 'atom-2p') assert.ok(xy > z * 2.2, 'chosen p basis has directional probability lobes');
  }
  assert.ok(radialMeans[0] < radialMeans[1] * 0.25 && radialMeans[0] < radialMeans[2] * 0.25, '1s probability samples are compact relative to valence samples');
  const resources = new Set(harness.owned); let disposed = 0;
  for (const resource of resources) { resource.addEventListener('dispose', () => disposed++); resource.dispose(); }
  assert.equal(disposed,resources.size,'all owned geometry, materials and instance buffers dispose');
});
