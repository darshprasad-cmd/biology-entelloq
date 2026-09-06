/* Headless geometry contracts, using the Three.js already shipped in lab.html.
   No network, browser, renderer, new dependency, or scientific-data fixture. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { before, test } = require('node:test');

const root = path.resolve(__dirname, '..');
let THREE;
const specimens = {};
before(async () => {
  const html = fs.readFileSync(path.join(root, 'lab.html'), 'utf8');
  const imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.ok(imports.three.startsWith('data:text/javascript;base64,'), 'Use the existing offline runtime only');
  THREE = await import(imports.three);
  const context = vm.createContext({ THREE });
  for (const name of ['anatomy', 'frog', 'heart', 'fish', 'earthworm', 'cockroach']) {
    const source = fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8');
    vm.runInContext(source.replace(/\bexport\s+/g, ''), context, { filename: name + '.js' });
  }
  for (const id of ['frog', 'heart', 'fish', 'earthworm', 'cockroach']) {
    specimens[id] = vm.runInContext(`buildSpecimen(THREE, '${id}')`, context);
  }
});

const part = (id, name) => {
  const found = specimens[id].parts.find(p => p.id === name);
  assert.ok(found, `${id}: ${name} is still available`);
  return found.mesh;
};
const curve = mesh => mesh.geometry.parameters.path;
function localBounds(mesh) {
  mesh.updateMatrix();
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix);
}
function nearestSurfaceVertex(mesh, point) {
  mesh.updateMatrix();
  const positions = mesh.geometry.attributes.position;
  const vertex = new THREE.Vector3();
  let nearest = Infinity;
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrix);
    nearest = Math.min(nearest, vertex.distanceTo(point));
  }
  return nearest;
}

test('all five builders retain their parts and finite geometry without a DOM', () => {
  const counts = { frog: 27, heart: 32, fish: 22, earthworm: 18, cockroach: 27 };
  for (const [id, specimen] of Object.entries(specimens)) {
    assert.equal(specimen.parts.length, counts[id], id);
    assert.equal(new Set(specimen.parts.map(p => p.id)).size, counts[id], id + ' IDs');
    specimen.group.traverse(mesh => {
      if (!mesh.geometry?.attributes.position) return;
      assert.ok(mesh.geometry.attributes.position.array.every(Number.isFinite), id + ' positions');
      if (mesh.geometry.attributes.normal) {
        assert.ok(mesh.geometry.attributes.normal.array.every(Number.isFinite), id + ' normals');
      }
      mesh.geometry.computeBoundingSphere();
      assert.ok(Number.isFinite(mesh.geometry.boundingSphere.radius), id + ' bounds');
    });
  }
});

test('the complete specimens retain the root orientation chosen for the tray', () => {
  for (const id of ['frog', 'earthworm', 'cockroach']) {
    assert.equal(specimens[id].group.rotation.x, 0, id);
  }
  assert.equal(specimens.heart.group.rotation.x, -Math.PI / 2);
  assert.equal(specimens.fish.group.rotation.z, -Math.PI / 2);
});

test('frog stomach joins the oesophagus and duodenum on its actual deformed surface', () => {
  const stomach = part('frog', 'stomach');
  const cardiac = curve(part('frog', 'oesophagus')).getPoint(1);
  const pyloric = curve(part('frog', 'small-intestine')).getPoint(0);
  assert.ok(nearestSurfaceVertex(stomach, cardiac) < 1e-6, 'cardiac connection must touch the stomach');
  assert.ok(nearestSurfaceVertex(stomach, pyloric) < 1e-6, 'pyloric connection must touch the stomach');
  const inverse = stomach.matrix.clone().invert();
  const inlet = cardiac.clone().applyMatrix4(inverse), outlet = pyloric.clone().applyMatrix4(inverse);
  const bounds = stomach.geometry.boundingBox;
  assert.ok(Math.abs(inlet.z - bounds.min.z) < 1e-6, 'oesophagus meets the cardiac end, not another wall surface');
  assert.ok(Math.abs(outlet.z - bounds.max.z) < 1e-6, 'duodenum begins at the pyloric end');
  assert.ok(cardiac.z > pyloric.z, 'cardiac end is anterior to pylorus');
  assert.ok(cardiac.x < 0, 'cardiac stomach remains on the anatomical left');
  assert.ok(part('frog', 'kidney-left').position.y < stomach.position.y, 'kidney remains dorsal to gut');
});

test('frog skin has a rounded broad head instead of a second vanishing longitudinal taper', () => {
  const skin = part('frog', 'skin');
  const vertices = skin.geometry.attributes.position;
  let headWidth = 0, trunkWidth = 0;
  for (let i = 0; i < vertices.count; i++) {
    const z = vertices.getZ(i) / 4.55, x = Math.abs(vertices.getX(i));
    if (z > 0.6 && z < 0.8) headWidth = Math.max(headWidth, x);
    if (Math.abs(z) < 0.15) trunkWidth = Math.max(trunkWidth, x);
  }
  assert.ok(headWidth / trunkWidth > 0.6, 'head must not be pinched into the former leaf tip');
  assert.ok(headWidth / trunkWidth < 1.1, 'bounded shaping must not inflate the head beyond the trunk');
  const bounds = localBounds(skin);
  assert.ok(bounds.max.z > 4.4 && bounds.max.z < 4.7);
  assert.ok(bounds.min.z < -4.4 && bounds.min.z > -4.7);
});

test('heart aorta arches anatomically left and posterior, with branches still connected', () => {
  const aorta = part('heart', 'aorta'), path = curve(aorta);
  const start = path.getPoint(0), end = path.getPoint(1);
  assert.ok(end.x < start.x - 1, '−x is anatomical left, not the viewer screen left');
  assert.ok(end.z < start.z, 'descending arch is posterior');
  assert.ok(curve(part('heart', 'pulmonary-trunk')).getPoint(0).z > start.z, 'pulmonary root stays anterior');
  assert.equal(aorta.children.length, 3, 'keep the existing illustrative human branching pattern');
  for (const branch of aorta.children) {
    const inlet = curve(branch).getPoint(0);
    let distance = Infinity;
    for (let i = 0; i <= 200; i++) distance = Math.min(distance, inlet.distanceTo(path.getPoint(i / 200)));
    assert.ok(distance < 0.34, 'branch inlet must intersect the parent vessel radius');
  }
  assert.ok(curve(aorta.children[0]).getPoint(1).x > 0, 'brachiocephalic outlet heads right');
  assert.ok(aorta.children.slice(1).every(mesh => curve(mesh).getPoint(1).x < 0), 'left branches stay left');
});

test('fish swim-bladder chambers and neck run longitudinally beneath the kidney', () => {
  const bladder = part('fish', 'swim-bladder');
  const posterior = bladder.children.find(mesh => mesh.geometry.type === 'SphereGeometry');
  const neck = bladder.children.find(mesh => mesh.geometry.type === 'CylinderGeometry');
  assert.ok(posterior.position.z < -1, 'posterior chamber is towards −z, not ventral');
  assert.equal(posterior.position.x, 0);
  assert.equal(posterior.position.y, 0);
  assert.equal(bladder.rotation.z, 0, 'sac helper already has a z long axis');
  const a = bladder.geometry.boundingBox, b = localBounds(posterior), n = localBounds(neck);
  assert.ok(n.intersectsBox(a) && n.intersectsBox(b), 'neck meets both chamber bounds');
  const size = n.getSize(new THREE.Vector3());
  assert.ok(size.z > size.y, 'neck cylinder is aligned along z');
  assert.ok(bladder.position.y > part('fish', 'stomach').position.y, 'bladder is dorsal to gut');
  assert.ok(part('fish', 'kidney').position.y > bladder.position.y, 'kidney is dorsal to bladder');
});

test('cockroach crop lies along the foregut and reaches both adjacent organ regions', () => {
  const crop = part('cockroach', 'crop');
  const bounds = localBounds(crop), size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.z > size.y * 2, 'storage sac follows the z-running gut, not the dorsoventral axis');
  assert.ok(bounds.containsPoint(curve(part('cockroach', 'oesophagus')).getPoint(1)), 'oesophagus enters crop');
  assert.ok(bounds.intersectsBox(localBounds(part('cockroach', 'gizzard'))), 'crop reaches the gizzard region');
  assert.ok(crop.position.z > part('cockroach', 'gizzard').position.z, 'crop remains anterior to gizzard');
  assert.ok(curve(part('cockroach', 'dorsal-heart')).getPoint(0).y > crop.position.y, 'heart remains dorsal');
  assert.ok(curve(part('cockroach', 'nerve-cord')).getPoint(0).y < crop.position.y, 'nerve cord remains ventral');
});

test('earthworm retains the dorsal vessel, through-gut and ventral nerve relationship', () => {
  const vessel = curve(part('earthworm', 'dorsal-blood-vessel')).getPoint(0.5);
  const gut = curve(part('earthworm', 'intestine')).getPoint(0.5);
  const nerve = curve(part('earthworm', 'nerve-cord')).getPoint(0.5);
  assert.ok(vessel.y > gut.y && gut.y > nerve.y);
  assert.ok(part('earthworm', 'pharynx').position.z > part('earthworm', 'gizzard').position.z);
  // This relationship check is not a species-validation claim; see ANATOMY.md.
});

test('cockroach exterior has connected thoracic and cervical regions', () => {
  const pron = part('cockroach', 'pronotum'), head = part('cockroach', 'head');
  const thorax = pron.getObjectByName('thoracic-bridge'), neck = head.getObjectByName('cervical-connection');
  specimens.cockroach.group.updateMatrixWorld(true);
  const bounds = mesh => new THREE.Box3().setFromObject(mesh, true);
  assert.ok(bounds(thorax).intersectsBox(bounds(part('cockroach', 'exoskeleton'))));
  assert.ok(bounds(neck).intersectsBox(bounds(pron)));
});

test('fish tail lobes share an attached root and extend posteriorly', () => {
  const skin = part('fish', 'body-wall');
  const upper = skin.getObjectByName('caudal-upper'), lower = skin.getObjectByName('caudal-lower');
  assert.deepEqual(upper.position.toArray(), lower.position.toArray());
  assert.ok(localBounds(skin).containsPoint(upper.position));
  for (const fin of [upper, lower]) {
    assert.ok(localBounds(fin).min.z < fin.position.z - 0.5, 'free edge extends behind the root');
  }
});
