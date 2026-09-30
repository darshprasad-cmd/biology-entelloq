const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/lab/cutting.js'), 'utf8');
const createCutting = new Function(source.replace(/^export\s+/gm, '') + '\nreturn createCutting;')();
let THREE;
test.before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
});

function specimen(partId, metadata = {}) {
  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4, 32, 32), new THREE.MeshPhysicalMaterial());
  Object.assign(mesh.userData, metadata);
  scene.add(mesh);
  const cuts = createCutting(THREE, scene);
  const rest = mesh.geometry.attributes.position.array.slice();
  const points = [-1, 0, 1].map(x => new THREE.Vector3(x, 0, 0));
  const open = depth => {
    assert.ok(cuts.open({ partId, mesh, rest, points, depth, amount: 1 }));
    for (let i = 0; i < 12; i++) cuts.update(64);
    return mesh.children.find(child => child.name === 'cut:' + partId).children[0];
  };
  return { scene, mesh, cuts, rest, open };
}

test('a shallow incision only renders reached layers and the learning labels agree with the cut face', () => {
  const s = specimen('skin');
  const shallow = s.open(.03);
  assert.deepEqual(shallow.geometry.userData.cutFace.exposedStrata, ['Epidermis']);
  assert.deepEqual(s.cuts.strataOf('skin').filter(layer => layer.breached).map(layer => layer.name), ['Epidermis']);
  const shallowFloor = shallow.geometry.boundingBox.min.z;
  const deep = s.open(1);
  assert.ok(deep.geometry.boundingBox.min.z < shallowFloor - .2);
  assert.deepEqual(deep.geometry.userData.cutFace.exposedStrata,
    s.cuts.strataOf('skin').filter(layer => layer.breached).map(layer => layer.name));
  assert.equal(deep.geometry.userData.cutFace.schematic, true, 'rendered bands never claim measured histology');
  s.cuts.dispose();
});

test('both frog exterior paths render amphibian dermis and lymph space without a mammalian fat or muscle layer', () => {
  for (const metadata of [{ exteriorTissue: 'frog-hide' }, { preparedExterior: { schemaVersion: 1, specimenId: 'frog', partId: 'skin' } }]) {
    const s = specimen('skin', metadata);
    const lining = s.open(1), layers = lining.geometry.userData.cutFace.exposedStrata;
    assert.equal(lining.geometry.userData.cutFace.tissue, 'amphibianSkin');
    assert.deepEqual(layers, ['Epidermis', 'Spongy dermis (gland-bearing)', 'Compact dermis',
      'Hypodermis (loose connective tissue)', 'Subcutaneous lymph space']);
    assert.ok(!layers.some(name => /fat|muscle|papillary|reticular/i.test(name)));
    assert.deepEqual(s.cuts.strataFor({ partId: 'skin', mesh: s.mesh }).map(layer => layer.name), layers);
    s.cuts.dispose();
  }
});

test('membrane and firm cuticle keep shallow edges while muscle opens with a deeper, wetter cut face', () => {
  const membrane = specimen('pericardium'), cuticle = specimen('exoskeleton'), muscle = specimen('muscle-wall');
  const m = membrane.open(1), c = cuticle.open(1), f = muscle.open(1);
  assert.ok(Math.abs(m.geometry.boundingBox.min.z) < Math.abs(f.geometry.boundingBox.min.z) * .25);
  assert.ok(Math.abs(c.geometry.boundingBox.min.z) < Math.abs(f.geometry.boundingBox.min.z) * .35);
  assert.ok(c.geometry.boundingBox.getSize(new THREE.Vector3()).y < f.geometry.boundingBox.getSize(new THREE.Vector3()).y * .4);
  assert.ok(c.material.clearcoat < f.material.clearcoat && c.material.roughness > f.material.roughness);
  assert.ok(!m.geometry.userData.cutFace.exposedStrata.some(name => /air|lung|congest/i.test(name)));
  assert.ok(c.geometry.userData.cutFace.exposedStrata.includes('Exocuticle'));
  for (const s of [membrane, cuticle, muscle]) s.cuts.dispose();
});

test('specific fascia anatomy wins over a broad integumentary system label', () => {
  const s = specimen('subcutaneous-fascia');
  const layers = s.cuts.strataFor({ partId: 'subcutaneous-fascia', system: 'integumentary' });
  assert.equal(layers[0].name, 'Aponeurotic surface');
  assert.ok(layers.every(layer => !/dermis|epidermis/i.test(layer.name)));
  s.cuts.dispose();
});

test('nerve cut-face colours retain their tissue hue all the way to the floor instead of acquiring a red blood pool', () => {
  const s = specimen('sciatic-nerve');
  const face = s.open(1), colours = face.geometry.attributes.color;
  const column = s.cuts.strataOf('sciatic-nerve');
  // Shade and fine relief can change brightness, not the ratios of the authored
  // tissue pigment. Each face vertex must match one named layer's chromaticity.
  const hues = column.map(layer => new THREE.Color(layer.hex));
  for (let i = 0; i < colours.count; i++) {
    const r = colours.getX(i), g = colours.getY(i), b = colours.getZ(i);
    assert.ok(hues.some(hue => Math.abs(g / r - hue.g / hue.r) < 2e-6
      && Math.abs(b / r - hue.b / hue.r) < 2e-6));
  }
  s.cuts.dispose();
});

test('cut depth and amphibian classification survive undo with stable buffers at both quality settings', () => {
  const s = specimen('skin', { exteriorTissue: 'frog-hide' });
  const originalIndex = s.mesh.geometry.index, originalPosition = s.mesh.geometry.attributes.position;
  s.open(.37);
  const saved = s.cuts.snapshot('skin');
  const expected = s.cuts.strataOf('skin');
  assert.equal(saved.depth, .37);
  assert.ok(s.cuts.remove('skin'));
  assert.equal(s.mesh.geometry.index, originalIndex);
  assert.ok(s.cuts.restore('skin', saved, s.rest));
  for (const quality of [0, 1]) {
    s.cuts.setQuality(quality);
    for (let i = 0; i < 20; i++) s.cuts.update(64);
    assert.deepEqual(s.cuts.strataOf('skin'), expected);
    assert.equal(s.mesh.geometry.attributes.position, originalPosition);
    const lining = s.mesh.children.find(child => child.name === 'cut:skin').children[0];
    assert.ok(lining.geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(lining.geometry.attributes.normal.array.every(Number.isFinite));
    assert.deepEqual(lining.geometry.userData.cutFace.exposedStrata, expected.filter(layer => layer.breached).map(layer => layer.name));
    assert.equal(new THREE.Raycaster(new THREE.Vector3(0, 0, 3), new THREE.Vector3(0, 0, -1)).intersectObject(lining).length, 0);
  }
  s.cuts.clear();
  assert.equal(s.mesh.geometry.index, originalIndex);
  assert.ok(s.rest.every((value, i) => Math.abs(value - originalPosition.array[i]) < 2e-6));
  s.cuts.dispose();
});
