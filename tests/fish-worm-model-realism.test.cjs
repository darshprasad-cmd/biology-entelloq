const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
let THREE, buildFish, buildEarthworm, createSurfaceDetail;
test.before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  const source = ['anatomy', 'fish', 'earthworm', 'surface'].map(name => fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8')).join('\n');
  ({ buildFish, buildEarthworm, createSurfaceDetail } = new Function(source.replace(/^export\s+/gm, '')
    + '\nreturn {buildFish, buildEarthworm, createSurfaceDetail};')());
});

test('fish pigment has fine flank detail and a smooth head, survives finishing, and is shared across reloads', () => {
  const a = buildFish(THREE), b = buildFish(THREE);
  const skin = a.parts.find(p => p.id === 'body-wall').mesh;
  const atlas = skin.material.map, { data, width, height } = atlas.image;
  assert.equal(atlas, b.parts.find(p => p.id === 'body-wall').mesh.material.map, 'no per-reload atlas allocation');
  assert.equal(atlas.colorSpace, THREE.SRGBColorSpace);
  assert.ok(width * height <= 131072, 'bounded one-time pigment atlas');
  const head = [], flank = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const theta = (1 - y / (height - 1)) * Math.PI;
    const py = Math.cos(theta), pz = Math.sin(x / width * Math.PI * 2) * Math.sin(theta), t = (pz + 1) / 2;
    const brightness = data[(y * width + x) * 4 + 1];
    if (t > .86) head.push(brightness);
    if (t > .22 && t < .65 && Math.abs(py) < .7) flank.push(brightness);
  }
  const spread = values => Math.max(...values) - Math.min(...values);
  assert.ok(head.length > 500 && flank.length > 500);
  assert.ok(spread(head) < 12, 'cranial pigment never inherits high-contrast scale arcs');
  assert.ok(spread(flank) > 30, 'scales and lateral line remain visible on the actual flank map');
  const material = skin.material, position = skin.geometry.attributes.position;
  const finish = createSurfaceDetail(THREE, a.parts, 'fish', a.group);
  finish.setDensity(0); finish.apply();
  assert.equal(skin.material.map, atlas, 'surface module preserves the authored scale mask');
  assert.equal(skin.geometry.attributes.position, position, 'pigment does not add a pick shield');
  finish.dispose(); assert.equal(skin.material, material);
});

test('fish eyes sit against both actual flanks with pigmented irises and shallow corneal profiles', () => {
  const s = buildFish(THREE); s.group.rotation.set(0, 0, 0); s.group.updateMatrixWorld(true);
  const skin = s.parts.find(p => p.id === 'body-wall').mesh;
  const eyes = skin.children.filter(m => m.userData.exteriorDetail === 'eye');
  assert.equal(eyes.length, 2);
  for (const eye of eyes) {
    const sign = Math.sign(eye.position.x);
    const hit = new THREE.Raycaster(new THREE.Vector3(sign * 2, eye.position.y, eye.position.z), new THREE.Vector3(-sign, 0, 0))
      .intersectObject(skin, false)[0];
    assert.ok(hit && Math.abs(hit.point.x - eye.position.x) < .04, 'eye root remains seated in the head');
    assert.ok(eye.scale.x < eye.scale.y * .45, 'iris is a shallow surface, not a spherical button');
    const colours = eye.geometry.attributes.color;
    assert.equal(colours.count, eye.geometry.attributes.position.count);
    const values = Array.from({ length: colours.count }, (_, i) => colours.getX(i));
    assert.ok(Math.max(...values) - Math.min(...values) > .08, 'radial pigment and limbal edge break the flat gold bead');
    eye.traverse(m => assert.equal(m.userData.partId, undefined));
  }
});

test('worm annuli remain visible in dorsal pigment while the clitellum stays smooth and the wall opaque', () => {
  const s = buildEarthworm(THREE), mesh = s.parts.find(p => p.id === 'body-wall').mesh;
  const p = mesh.geometry.attributes.position, c = mesh.geometry.attributes.color;
  const stride = mesh.geometry.parameters.radialSegments + 1, dorsal = Math.floor((stride - 1) / 2);
  const samples = [];
  for (let row = 0; row <= mesh.geometry.parameters.heightSegments; row++) {
    const i = row * stride + dorsal, z = p.getZ(i);
    if (z > -4.5 && z < 1.6) samples.push(c.getX(i));
  }
  const troughDepths = [];
  for (let i = 1; i < samples.length - 1; i++) {
    if (samples[i] < samples[i - 1] && samples[i] < samples[i + 1]) {
      const neighbors = samples.slice(Math.max(0, i - 3), Math.min(samples.length, i + 4));
      troughDepths.push(Math.max(...neighbors) - samples[i]);
    }
  }
  assert.ok(troughDepths.filter(depth => depth > .004).length >= 12, 'segmentation is legible in pigment as well as specular highlights');
  for (const part of s.parts.filter(p => p.layer === 0)) assert.equal(part.mesh.material.transmission, 0);
  assert.equal(p.count, 8745, 'same cuttable mesh stays below the soft-body vertex ceiling');
});
