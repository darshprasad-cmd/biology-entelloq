const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/lab/env.js'), 'utf8');
let THREE;
test.before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
});
function environment() {
  const fit = source.slice(source.indexOf('  function fitSpecimen(group)'), source.indexOf('  /* ---- instrument tray'));
  const mesh = () => new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  const setup = new Function('THREE', 'specimenTray', 'trayBase', 'pad', 'rims', 'contactMesh',
    'const TABLE_Y=-1.7, supportY=-1.38; let placement=null, removalZ=-8, removalX=0, removalColumnWidth=0; const tray=new THREE.Group();\n' + fit + '\nreturn fitSpecimen;');
  const tray = new THREE.Group(), pad = mesh();
  return { fit: setup(THREE, tray, mesh(), pad, [mesh(), mesh(), mesh(), mesh()], mesh()), pad };
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
