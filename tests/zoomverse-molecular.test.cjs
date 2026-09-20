const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');
let THREE, molecular, reference, owned;

before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  const source = fs.readFileSync(path.join(root, 'src/lab/zoomverse.js'), 'utf8');
  const start = source.indexOf('  function buildDNA(spec)'), end = source.indexOf('  function buildAtom(spec)', start);
  assert.ok(start >= 0 && end > start, 'real molecular builder boundaries exist');
  owned = new Set();
  const track = value => { owned.add(value); return value; };
  const stageMat = (color, options = {}) => {
    const material = track(new THREE.MeshStandardMaterial({ color, roughness: options.rough ?? 0.55, transparent: true, opacity: 1 }));
    material.userData.baseOpacity = 1;
    return material;
  };
  const context = vm.createContext({ THREE, track, stageMat });
  vm.runInContext(source.slice(start, end) + '\nthis.molecular={buildDNA,buildBasePair,zoomDnaSource,zoomDnaGraph};', context);
  molecular = context.molecular;
  const universe = fs.readFileSync(path.join(root, 'src/universe/stage_molecular.js'), 'utf8');
  reference = JSON.parse(universe.match(/const MOL_STRUCTURES = (.+);/)[1]).dna;
});

const plain = value => JSON.parse(JSON.stringify(value));
function components(count, bonds) {
  const seen = new Set(), neighbors = Array.from({ length: count }, () => []);
  for (const [a, b] of bonds) { neighbors[a].push(b); neighbors[b].push(a); }
  let result = 0;
  for (let i = 0; i < count; i++) if (!seen.has(i)) {
    result++; seen.add(i); const queue = [i];
    while (queue.length) for (const n of neighbors[queue.pop()]) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }
  return result;
}

test('lab DNA retains every validated 1BNA coordinate and source provenance exactly', () => {
  const source = molecular.zoomDnaSource();
  assert.deepEqual(plain(source), reference);
  assert.equal(source.atoms.length, 486);
  assert.equal(source.sha256, 'df42f1506792f191b957227b061360652adcf6f813eb69d9ec553067ea584670');
  assert.equal(molecular.zoomDnaSource(), source, 'one bounded cached coordinate source per viewer');
});

test('DNA connectivity has two complete antiparallel strands and 32 noncovalent pair guides', () => {
  const rows = molecular.zoomDnaSource().atoms, graph = molecular.zoomDnaGraph(rows);
  assert.equal(graph.residues.size, 24);
  assert.equal(components(rows.length, graph.bonds), 2);
  assert.equal(graph.hbonds.length, 32);
  const degree = new Array(rows.length).fill(0);
  for (const [a, b] of graph.bonds) {
    assert.equal(rows[a][0], rows[b][0]); degree[a]++; degree[b]++;
    const length = new THREE.Vector3(...rows[a].slice(5)).distanceTo(new THREE.Vector3(...rows[b].slice(5)));
    assert.ok(length > 1.1 && length < 1.95, 'covalent distance in angstroms: ' + length);
  }
  assert.ok(degree.every(n => n > 0), 'no detached atoms');
  for (const [a, b] of graph.hbonds) {
    assert.notEqual(rows[a][0], rows[b][0]);
    assert.equal(rows[a][1] + rows[b][1], 25, 'A1 pairs B24, A6 pairs B19');
    assert.ok(new THREE.Vector3(...rows[a].slice(5)).distanceTo(new THREE.Vector3(...rows[b].slice(5))) < 3.5);
  }
});

test('A6/B19 detail contains 41 heavy atoms, complete sugar/base rings and exactly two hydrogen bonds', () => {
  const rows = molecular.zoomDnaSource().atoms.filter(r => (r[0] === 'A' && r[1] === 6) || (r[0] === 'B' && r[1] === 19));
  const graph = molecular.zoomDnaGraph(rows), model = molecular.buildBasePair({});
  assert.equal(rows.length, 41); assert.equal(graph.hbonds.length, 2);
  assert.equal(components(rows.length, graph.bonds), 2);
  assert.deepEqual(plain(model.userData.structure.residues), ['DA A6', 'DT B19']);
  assert.equal(model.userData.structure.atoms, 41); assert.equal(model.userData.structure.hydrogenBonds, 2);
  for (const type of ['DA', 'DT']) {
    const ids = rows.map((r, i) => r[2] === type ? i : -1).filter(i => i >= 0), set = new Set(ids);
    const edges = graph.bonds.filter(([a, b]) => set.has(a) && set.has(b)).length;
    assert.equal(edges - ids.length + 1, type === 'DA' ? 3 : 2, 'purine/pyrimidine plus pentose cycles');
  }
  assert.match(model.userData.parts.find(p => p.id === 'sugars').note, /four carbon atoms and one oxygen/);
  assert.match(model.userData.parts.find(p => p.id === 'phosphates').note, /backbone fragments/);
});

test('real Three builders preserve molecular distances, render every atom once and stay below 100 draw objects', () => {
  for (const name of ['buildDNA', 'buildBasePair']) {
    const model = molecular[name]({}), meta = model.userData.structure;
    const rows = name === 'buildDNA' ? molecular.zoomDnaSource().atoms : molecular.zoomDnaSource().atoms.filter(r => (r[0] === 'A' && r[1] === 6) || (r[0] === 'B' && r[1] === 19));
    const graph = molecular.zoomDnaGraph(rows), positions = new Map();
    let drawObjects = 0, covalentInstances = 0, dashedInstances = 0;
    model.updateMatrixWorld(true);
    model.traverse(object => {
      assert.ok(object.matrixWorld.elements.every(Number.isFinite));
      if (!object.isMesh) return;
      drawObjects++;
      assert.ok(object.isInstancedMesh, 'molecular geometry is batched');
      assert.ok(owned.has(object) && owned.has(object.geometry) && owned.has(object.material), 'viewer owns every GPU resource, including instance buffers');
      assert.ok(Array.from(object.geometry.attributes.position.array).every(Number.isFinite));
      assert.ok(Array.from(object.instanceMatrix.array).every(Number.isFinite));
      if (object.userData.molecularKind === 'covalent-bonds') covalentInstances += object.count;
      if (object.userData.molecularKind === 'hydrogen-bond-guides') dashedInstances += object.count;
      for (const [i, atom] of (object.userData.atomIndices || []).entries()) {
        assert.ok(!positions.has(atom), 'each source atom occurs once');
        const matrix = new THREE.Matrix4(); object.getMatrixAt(i, matrix);
        positions.set(atom, new THREE.Vector3().setFromMatrixPosition(matrix));
      }
    });
    assert.ok(drawObjects > 10 && drawObjects < 100, name + ' draw objects: ' + drawObjects);
    assert.equal(positions.size, rows.length);
    assert.equal(covalentInstances, graph.bonds.length);
    assert.equal(dashedInstances, graph.hbonds.length * 5);
    for (const [a, b] of [...graph.bonds, ...graph.hbonds]) {
      const expected = new THREE.Vector3(...rows[a].slice(5)).distanceTo(new THREE.Vector3(...rows[b].slice(5)));
      assert.ok(Math.abs(positions.get(a).distanceTo(positions.get(b)) / meta.sceneUnitsPerAngstrom - expected) < 1e-5, 'uniform normalization preserves distances');
    }
    assert.equal(meta.coordinateUnit, 'angstrom'); assert.equal(meta.sourceUrl, 'https://www.rcsb.org/structure/1BNA');
    assert.ok(meta.hydrogensOmitted && meta.watersOmitted && meta.bondOrdersOmitted);
    assert.equal(model.userData.parts.length, 5);
    assert.equal(new Set(model.userData.parts.map(p => p.id)).size, 5);
    for (const part of model.userData.parts) {
      assert.equal(part.object.parent, model); assert.ok(part.object.children.length > 0);
      assert.ok(part.label && part.note.length > 40, 'every inspectable group has an explanatory note');
      assert.ok(new THREE.Box3().setFromObject(part.object).getSize(new THREE.Vector3()).length() > 0);
    }
  }
});

test('viewer ownership disposes every molecular instance buffer, shared geometry and material once', () => {
  for (const name of ['buildDNA', 'buildBasePair']) {
    const prior = new Set(owned), model = molecular[name]({}), expected = new Set(), events = new Map();
    model.traverse(object => {
      if (object.isInstancedMesh) {
        expected.add(object); expected.add(object.geometry); expected.add(object.material);
      }
    });
    const created = new Set([...owned].filter(resource => !prior.has(resource)));
    assert.equal(created.size, expected.size, 'all and only this model\'s owned GPU resources');
    for (const resource of expected) {
      assert.ok(created.has(resource));
      events.set(resource, 0);
      resource.addEventListener('dispose', () => events.set(resource, events.get(resource) + 1));
    }
    // Exercise the same owned-resource disposal contract used by the viewer.
    for (const resource of created) resource.dispose();
    for (const [resource, count] of events) assert.equal(count, 1, resource.type || 'geometry');
  }
});
