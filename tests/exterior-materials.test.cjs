/* CPU-only contracts for the actual Three.js material/texture implementation.
   Mipmap settings are checked before upload; this does not measure GPU memory,
   frame rate, rendered seams, photographic similarity or anatomical accuracy. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { before, test } = require('node:test');
const root = path.resolve(__dirname, '..');
let THREE, context;

before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  context = vm.createContext({ THREE });
  for (const name of ['anatomy', 'surface']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8').replace(/\bexport\s+/g, ''), context, { filename: name + '.js' });
  }
});

function disposed(resource) {
  let count = 0;
  resource.addEventListener('dispose', () => { count++; });
  return () => count;
}
function texture() {
  return new THREE.DataTexture(new Uint8Array([128, 140, 152, 255]), 1, 1, THREE.RGBAFormat);
}
function mesh(material) {
  return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
}
function releaseGeometry(group) {
  group.traverse(object => { if (object.geometry) object.geometry.dispose(); });
}
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('nested tagged details share finish-class maps, keep authored pigment maps and restore owned resources exactly once', () => {
  const generated = [];
  // A real DataTexture subclass observes even generated maps that an authored
  // colour map leaves unused. No material or texture behaviour is substituted.
  class ObservedTexture extends THREE.DataTexture {
    constructor(...args) { super(...args); generated.push({ texture: this, disposals: disposed(this) }); }
  }
  const observedThree = { ...THREE, DataTexture: ObservedTexture };
  const authored = [texture(), texture(), texture(), texture()];
  const authoredDisposals = authored.map(disposed);
  const rootMaterial = new THREE.MeshPhysicalMaterial({ color: 0xb5b48a, map: authored[0], normalMap: authored[1], roughnessMap: authored[2] });
  const sharedMaterial = new THREE.MeshPhysicalMaterial({ color: 0x537344, transparent: true, opacity: 0.73, transmission: 0.11, emissive: 0x050703 });
  const paintedMaterial = sharedMaterial.clone(); paintedMaterial.map = authored[3];
  const eyeMaterial = new THREE.MeshPhysicalMaterial({ color: 0x1b2013 });
  const group = new THREE.Group(), skin = mesh(rootMaterial), nested = new THREE.Group();
  group.add(skin); skin.add(nested); skin.castShadow = true;
  const details = [mesh(sharedMaterial), mesh(sharedMaterial), mesh(paintedMaterial), mesh(sharedMaterial)];
  details.forEach((child, i) => {
    child.userData.exteriorTissue = i === 3 ? 'fin' : 'frog-hide';
    child.castShadow = i % 2 === 0; nested.add(child);
  });
  const eye = mesh(eyeMaterial), unsupported = mesh(eyeMaterial);
  unsupported.userData.exteriorTissue = 'unknown-tissue';
  nested.add(eye, unsupported);
  const before = [skin, ...details].map(object => ({
    object, material: object.material, shadow: object.castShadow,
    colour: object.material.color.toArray(), opacity: object.material.opacity,
    transmission: object.material.transmission, emissive: object.material.emissive.toArray(),
    position: Array.from(object.geometry.attributes.position.array),
  }));
  const originals = new Set(before.map(s => s.material)); originals.add(eyeMaterial);
  const originalDisposals = [...originals].map(disposed);
  const surface = context.createSurfaceDetail(observedThree, [{ id: 'skin', mesh: skin, layer: 0, system: 'integument' }], 'frog', group);
  surface.setDensity(0); surface.apply();
  const applied = before.map(s => s.object.material), appliedDisposals = applied.map(disposed);
  assert.equal(new Set(applied).size, 5, 'each mesh receives its own finish material even when originals are shared');
  assert.equal(generated.length, 9, 'one rough/tint/normal set each for belly, tagged hide and tagged fin');
  assert.equal(skin.material.map, authored[0], 'root authored pigment map is retained');
  assert.equal(details[2].material.map, authored[3], 'tagged authored pigment map is retained');
  for (const key of ['roughnessMap', 'clearcoatRoughnessMap', 'normalMap']) {
    assert.equal(details[0].material[key], details[1].material[key], key + ': same-class children share textures');
    assert.equal(details[0].material[key], details[2].material[key], key + ': authored pigment does not duplicate relief maps');
    assert.notEqual(details[0].material[key], details[3].material[key], key + ': a different tagged finish has its own textures');
  }
  assert.equal(details[0].material.map, details[1].material.map, 'generated same-class pigment map is shared');
  assert.equal(eye.material, eyeMaterial, 'untagged eye excluded from skin finishing');
  assert.equal(unsupported.material, eyeMaterial, 'unknown tags do not acquire a nearby finish');
  for (const s of before.slice(1)) {
    assert.deepEqual(s.object.material.color.toArray(), s.colour, 'tagged authored colour retained');
    assert.equal(s.object.material.opacity, s.opacity); assert.equal(s.object.material.transmission, s.transmission);
    assert.deepEqual(s.object.material.emissive.toArray(), s.emissive);
    assert.deepEqual(Array.from(s.object.geometry.attributes.position.array), s.position, 'tagged detail geometry unchanged');
    assert.equal(s.object.castShadow, s.shadow); assert.equal(s.object.parent, nested);
  }
  surface.apply(); surface.setDensity(0); surface.apply();
  before.forEach((s, i) => assert.equal(s.object.material, applied[i], 'repeat application does not clone twice'));
  assert.equal(generated.length, 9, 'repeat application does not allocate more textures');
  assert.ok(generated.every(s => s.disposals() === 0));
  surface.dispose(); surface.dispose();
  before.forEach(s => { assert.equal(s.object.material, s.material); assert.equal(s.object.castShadow, s.shadow); });
  assert.ok(appliedDisposals.every(count => count() === 1), 'all cloned materials released exactly once');
  assert.ok(generated.every(s => s.disposals() === 1), 'all generated maps, including normals and unused tint, released exactly once');
  assert.ok(originalDisposals.every(count => count() === 0), 'builder-owned materials remain alive');
  assert.ok(authoredDisposals.every(count => count() === 0), 'builder-owned colour/normal/roughness textures remain alive');
  releaseGeometry(group); originals.forEach(m => m.dispose()); authored.forEach(t => t.dispose());
});

test('a translucent pericardial sac stops casting an opaque shadow and restores its exact original shadow state on disposal', () => {
  for (const sample of [
    { opacity: 0.065, transparent: true, shadow: true, expected: false },
    { opacity: 0.065, transparent: true, shadow: false, expected: false },
    { opacity: 0.94, transparent: true, shadow: true, expected: true },
    { opacity: 0.065, transparent: false, shadow: true, expected: true },
  ]) {
    const original = new THREE.MeshPhysicalMaterial({ opacity: sample.opacity, transparent: sample.transparent });
    const sac = mesh(original), group = new THREE.Group(); group.add(sac);
    sac.userData.exteriorDetail = 'conforming-sac'; sac.castShadow = sample.shadow;
    const originalPositions = Array.from(sac.geometry.attributes.position.array);
    const surface = context.createSurfaceDetail(THREE, [{ id: 'pericardium', mesh: sac, layer: 0, system: 'serous' }], 'heart', group);
    surface.setDensity(0); surface.apply();
    assert.notEqual(sac.material, original);
    assert.equal(sac.castShadow, sample.expected, JSON.stringify(sample));
    assert.equal(sac.material.opacity, sample.opacity); assert.equal(sac.material.transparent, sample.transparent);
    assert.deepEqual(Array.from(sac.geometry.attributes.position.array), originalPositions, 'conforming sac is not displaced through the muscle');
    surface.dispose();
    assert.equal(sac.castShadow, sample.shadow, 'original true/false shadow restored');
    assert.equal(sac.material, original);
    surface.dispose(); assert.equal(sac.castShadow, sample.shadow);
    releaseGeometry(group); original.dispose();
  }
});

test('all seven exterior finish classes produce varied distinct mipmap-ready pigment/relief fields with normalized encoded normals', () => {
  const kinds = ['frog-hide', 'frog-belly', 'scales', 'chitin', 'worm-cuticle', 'myocardium', 'fin'];
  const hashes = { rough: new Set(), tint: new Set(), normal: new Set() };
  for (const kind of kinds) {
    const maps = context.SUR_finishMaps(THREE, kind);
    try {
      for (const [role, map] of Object.entries(maps)) {
        assert.ok(map && map.isDataTexture, kind + '/' + role);
        assert.equal(map.image.width, 256); assert.equal(map.image.height, 256);
        assert.equal(map.image.data.length, 256 * 256 * 4);
        assert.equal(map.wrapS, THREE.RepeatWrapping); assert.equal(map.wrapT, THREE.RepeatWrapping);
        assert.equal(map.magFilter, THREE.LinearFilter); assert.equal(map.minFilter, THREE.LinearMipmapLinearFilter);
        assert.equal(map.generateMipmaps, true); assert.equal(map.anisotropy, 2);
        assert.ok(map.version > 0, 'texture has been marked for upload');
        const values = new Set(), data = map.image.data;
        for (let i = 0; i < data.length; i += 4) { values.add(data[i]); assert.equal(data[i + 3], 255); }
        assert.ok(values.size > 4, kind + '/' + role + ' is not a uniform field');
        hashes[role].add(digest(data));
      }
      const data = maps.normal.image.data;
      for (let i = 0; i < data.length; i += 4) {
        const x = data[i] / 127.5 - 1, y = data[i + 1] / 127.5 - 1, z = data[i + 2] / 127.5 - 1;
        assert.ok(Math.abs(Math.hypot(x, y, z) - 1) < 0.012, kind + ': quantized normal remains unit length');
        assert.ok(z > 0, kind + ': outward-facing relief normal');
      }
    } finally { Object.values(maps).forEach(t => t.dispose()); }
  }
  for (const [role, values] of Object.entries(hashes)) {
    // Frog hide and belly deliberately share pore relief but not pigment.
    assert.equal(values.size, role === 'normal' ? 6 : 7, role + ': class-specific fields, with only the intended frog relief reuse');
  }
});
