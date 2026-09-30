const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/lab/env.js'), 'utf8');
let THREE;
test.before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
});
function environment(handheld = false) {
  // Exercise the real setup and fit with real Three geometry/lights. Canvas and
  // PMREM are CPU stubs: this checks placement/coverage, not rendered appearance.
  const gradient = () => ({ addColorStop() {} });
  const context = { createRadialGradient: gradient, createLinearGradient: gradient,
    fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} };
  const document = { createElement: () => ({ width: 1, height: 1, getContext: () => context }) };
  const runtime = { ...THREE, PMREMGenerator: class {
    compileEquirectangularShader() {}
    fromEquirectangular() { return { texture: new THREE.Texture(), dispose() {} }; }
    dispose() {}
  } };
  const setup = new Function('THREE', 'document', 'SH_PHONE',
    source.replace(/^export\s+/gm, '') + '\nreturn setupEnvironment;')(runtime, document, handheld);
  const scene = new THREE.Scene(), renderer = { shadowMap: {}, render() {} };
  const env = setup(runtime, {}, { scene, camera: new THREE.PerspectiveCamera(), renderer });
  return { ...env, fit: env.fitSpecimen, scene, renderer, pad: scene.getObjectByName('dissection-pad') };
}
test('support fit uses visible transformed exterior vertices, not hidden organs', () => {
  const group = new THREE.Group(), outer = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 4));
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(10, 40, 10)); hidden.visible = false;
  group.add(outer, hidden); group.rotation.x = -Math.PI / 2; group.scale.setScalar(0.9); group.position.set(1, 5, 2);
  const { fit, pad } = environment(), result = fit(group);
  const bounds = new THREE.Box3().setFromObject(outer, true);
  assert.ok(Math.abs(bounds.min.y + 1.38) < 1e-6);
  assert.ok(Math.abs(result.minY - result.supportY) < 1e-9);
  assert.ok(Math.abs(pad.position.y + pad.scale.y / 2 - .32) < 1e-6);
  assert.ok(result.width >= 7.5 && result.length >= 10);
  assert.ok(Math.abs(fit(group).offsetY) < 1e-6, 'repeated fitting does not accumulate an offset');
});
test('empty support geometry fails instead of producing NaN transforms', () => {
  const group = new THREE.Group();
  assert.throws(() => environment().fit(group), /finite exterior bounds/);
  assert.equal(group.position.y, 0);
});
test('the complete translated specimen fits inside both lamps bright cones without changing tissue', () => {
  const env = environment(), group = new THREE.Group();
  const skin = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 18), new THREE.MeshStandardMaterial({ color: 0x704428 }));
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(70, 70, 70)); hidden.visible = false;
  group.add(skin, hidden); group.position.set(7, 4, -11); group.rotation.y = .32;
  const positions = skin.geometry.attributes.position.array.slice(), material = skin.material;
  env.fit(group);
  const bounds = new THREE.Box3().setFromObject(skin, true), centre = bounds.getCenter(new THREE.Vector3());
  for (const name of ['specimen-key-light', 'specimen-satellite-light']) {
    const lamp = env.scene.getObjectByName(name), direction = lamp.target.position.clone().sub(lamp.position).normalize();
    assert.ok(lamp.target.position.distanceTo(centre) < 1e-7, name + ': follows actual specimen centre');
    for (let i = 0; i < skin.geometry.attributes.position.count; i++) {
      const point = new THREE.Vector3().fromBufferAttribute(skin.geometry.attributes.position, i).applyMatrix4(skin.matrixWorld);
      const ray = point.sub(lamp.position), angle = direction.angleTo(ray);
      assert.ok(angle < lamp.angle * (1 - lamp.penumbra), name + ': exterior is inside bright cone, not feathered edge');
      assert.ok(ray.length() < lamp.distance * .5, name + ': no strong distance-cutoff dimming at appendages');
    }
  }
  assert.deepEqual(skin.geometry.attributes.position.array, positions);
  assert.equal(skin.material, material, 'lighting does not recolour or replace tissue');
  const key = env.scene.getObjectByName('specimen-key-light'), fixture = env.scene.getObjectByName('specimen-lamp-fixture');
  assert.ok(fixture.position.distanceTo(key.position) < 1e-9, 'visible fixture remains at its light source');
  const firstPosition = key.position.clone(), firstIntensity = key.intensity;
  env.fit(group);
  assert.ok(firstPosition.distanceTo(key.position) < 1e-7);
  assert.equal(key.intensity, firstIntensity, 'repeat fit cannot compound intensity');
  env.dispose();
});

test('lighting refits between large and small specimens with the original desktop/mobile shadow budget', () => {
  for (const handheld of [false, true]) {
    const env = environment(handheld);
    const make = (x, z) => { const group = new THREE.Group(); group.add(new THREE.Mesh(new THREE.BoxGeometry(x, 2, z))); return group; };
    env.fit(make(40, 3));
    const lamp = env.scene.getObjectByName('specimen-key-light'), farIntensity = lamp.intensity;
    env.fit(make(3, 5));
    assert.ok(lamp.intensity < farIntensity, 'small specimens reset to near-field lighting');
    const casting = env.scene.children.filter(o => o.isLight && o.castShadow);
    assert.equal(casting.length, 1, 'no second shadow pass');
    assert.deepEqual(casting[0].shadow.mapSize.toArray(), handheld ? [512, 512] : [1024, 1024]);
    assert.equal(env.renderer.toneMappingExposure, 1.15, 'fill replaces exposure inflation');
    env.dispose();
  }
});
test('generated lab module parses without executing camera, imports or GPU code', () => {
  const html = fs.readFileSync(path.join(root, 'lab.html'), 'utf8');
  const module = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  assert.doesNotThrow(() => new AsyncFunction(module.replace(/^import\s+[^\n]+;\s*$/gm, '')));
});
test('resting tissue is not animated independently of optional physiology', () => {
  const main = fs.readFileSync(path.join(root, 'src/lab/main.js'), 'utf8');
  const load = main.slice(main.indexOf('function loadSpecimen(id)'), main.indexOf('function tick(t)'));
  assert.match(load, /soft\.setLife\(false\)/);
  assert.ok(load.indexOf('env.fitSpecimen(group)') < load.indexOf('dissection = createDissection'));
  assert.match(main, /if \(soft\) soft\.setLife\(!!on\)/);
});

test('large bench uses bounded tessellation without removing the original lamp', () => {
  const env = fs.readFileSync(path.join(root, 'src/lab/env.js'), 'utf8');
  assert.match(env, /new THREE\.PlaneGeometry\(70,\s*70,\s*12,\s*12\)/);
  assert.doesNotMatch(env, /fixture\.visible = false/);
  assert.match(env, /lamp\.castShadow = true/);
});
