/* Exterior contracts use real geometry, not source-string presence. The hashes
   below freeze the pre-pass skin envelope and hidden anatomy, not new visuals. */
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto');
const { before, test } = require('node:test');
const root = path.resolve(__dirname, '..');
let THREE, frog;
before(async () => {
  const html = fs.readFileSync(path.join(root, 'lab.html'), 'utf8');
  const imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert.ok(imports.three.startsWith('data:text/javascript;base64,'));
  THREE = await import(imports.three);
  const context = vm.createContext({ THREE });
  for (const name of ['anatomy', 'frog']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8').replace(/\bexport\s+/g, ''), context, { filename: name + '.js' });
  }
  frog = context.buildFrog(THREE); frog.group.updateMatrixWorld(true);
});
const part = id => frog.parts.find(p => p.id === id);
const child = name => frog.group.getObjectByName(name);
const hashArray = array => crypto.createHash('sha256').update(Buffer.from(array.buffer)).digest('hex');

test('the complete cuttable skin envelope and every internal organ stay unchanged', () => {
  assert.equal(frog.parts.length, 27);
  assert.equal(new Set(frog.parts.map(p => p.id)).size, 27);
  assert.equal(hashArray(part('skin').mesh.geometry.attributes.position.array), '7464beab80109f9d9e278e6c86d8bd7fe77f52dd7f45ee52ef76136862d0ae59');
  const hash = crypto.createHash('sha256');
  for (const p of frog.parts.filter(p => p.layer > 0)) {
    p.mesh.updateMatrix(); hash.update(p.id); hash.update(JSON.stringify(p.mesh.matrix.elements));
    p.mesh.traverse(o => { if (o.geometry?.attributes.position) hash.update(Buffer.from(o.geometry.attributes.position.array.buffer)); });
  }
  assert.equal(hash.digest('hex'), '95146dda76f1494a22118bd4dc4a68c4a8a9582773fdea67b861c56f4fb96c31');
  assert.deepEqual(JSON.parse(JSON.stringify(part('skin').incision)), [[0, .98, 3.2], [0, 1.02, 1.6], [0, 1.02, -.4], [0, .96, -2.3], [0, .82, -3.5]]);
  assert.equal(frog.group.rotation.x, 0);
});

test('eyes are small inset dorsolateral domes with narrow pupils, not exposed gold spheres', () => {
  const skin = part('skin').mesh;
  for (const side of [-1, 1]) {
    const suffix = side < 0 ? 'left' : 'right';
    const eye = child('eye-' + suffix), pupil = child('pupil-' + suffix), iris = child('iris-' + suffix);
    assert.ok(eye && pupil && iris);
    assert.equal(eye.parent, skin); assert.equal(pupil.parent, eye); assert.equal(iris.parent, eye);
    assert.equal(eye.userData.exteriorTissue, undefined, 'hide finish must not overwrite the eye');
    assert.ok(eye.position.y < 0 && eye.position.z > 3, 'eye remains dorsal/anterior');
    eye.geometry.computeBoundingBox(); const size = eye.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(size.z < size.x * .5 && size.x <= .51, 'flattened smaller dome');
    const hit = new THREE.Raycaster(new THREE.Vector3(side * 6, -.42, 3.25), new THREE.Vector3(-side, 0, 0)).intersectObject(skin, false)[0];
    assert.ok(hit); const normal = hit.face.normal.clone().normalize();
    assert.ok(new THREE.Vector3().subVectors(hit.point, eye.position).dot(normal) > .04, 'dome base is buried inside skin');
    const vertex = new THREE.Vector3(); let proud = -Infinity;
    for (let i = 0; i < eye.geometry.attributes.position.count; i++) {
      vertex.fromBufferAttribute(eye.geometry.attributes.position, i).applyQuaternion(eye.quaternion).add(eye.position).sub(hit.point);
      proud = Math.max(proud, vertex.dot(normal));
    }
    assert.ok(proud > .05 && proud < .09, 'only a low orbital cap protrudes');
    pupil.geometry.computeBoundingBox(); const pupilSize = pupil.geometry.boundingBox.getSize(new THREE.Vector3());
    assert.ok(pupilSize.x > pupilSize.y * 3 && pupilSize.x < .17);
    assert.ok(iris.geometry.attributes.color && new Set(iris.geometry.attributes.color.array).size > 25, 'iris has a restrained fibre pattern');
  }
});

test('the jaw margin is projected onto the real head surface and tissue folds are explicitly tagged', () => {
  const skin = part('skin').mesh;
  for (const name of ['closed-mouth-seam', 'labial-fold']) {
    const mesh = child(name); assert.equal(mesh.parent, skin);
    const points = mesh.geometry.parameters.path.points;
    assert.equal(points.length, 31);
    for (const p of points) {
      const hit = new THREE.Raycaster(new THREE.Vector3(p.x, 6, p.z), new THREE.Vector3(0, -1, 0)).intersectObject(skin, false)[0];
      assert.ok(hit && hit.point.distanceTo(p) < 1e-6, name + ': no floating centreline');
      assert.ok(p.z > 3 && p.z < 4.5, name + ': head-only, not an abdominal cut');
    }
  }
  assert.equal(child('labial-fold').userData.exteriorTissue, 'frog-hide');
  assert.equal(child('upper-eyelid-left').userData.exteriorTissue, 'frog-hide');
  assert.equal(child('tympanum-right').userData.exteriorTissue, 'frog-hide');
});

test('four/five unequal splayed digits begin inside their palms and carry attached rounded tips', () => {
  for (const id of ['forelimb-left', 'forelimb-right', 'hindlimb-left', 'hindlimb-right']) {
    const limb = part(id), long = id.startsWith('hind');
    assert.equal(limb.mesh.userData.partId, id); assert.equal(limb.cuttable, false); assert.equal(limb.detachable, false);
    const foot = limb.mesh.children[0], digits = foot.children.filter(o => /^digit-\d$/.test(o.name));
    assert.equal(digits.length, long ? 5 : 4);
    assert.equal(foot.userData.exteriorTissue, 'frog-hide');
    const tips = [];
    for (const digit of digits) {
      const curve = digit.geometry.parameters.path, start = curve.getPointAt(0), end = curve.getPointAt(1);
      const rx = long ? .24 : .2, rz = long ? .85 : .34;
      assert.ok((start.x / rx) ** 2 + (start.y / .1) ** 2 + (start.z / rz) ** 2 < .7, 'digit begins within actual palm ellipsoid');
      assert.equal(digit.children.length, 1);
      assert.ok(digit.children[0].position.distanceTo(end) < 1e-8, 'rounded tip attached at toe end');
      tips.push(end);
    }
    assert.ok(Math.max(...tips.map(p => p.x)) - Math.min(...tips.map(p => p.x)) > .7, 'digits splay instead of parallel capsules');
    assert.ok(new Set(tips.map(p => p.z.toFixed(2))).size >= 4, 'digit lengths are unequal');
  }
});

test('hindfoot web edges follow both adjoining toes rather than a detached circular fan', () => {
  for (const id of ['hindlimb-left', 'hindlimb-right']) {
    const foot = part(id).mesh.children[0];
    const digits = foot.children.filter(o => /^digit-\d$/.test(o.name));
    const webs = foot.children.filter(o => o.name.startsWith('interdigital-web-'));
    assert.equal(webs.length, 4);
    for (let i = 0; i < webs.length; i++) {
      const positions = webs[i].geometry.attributes.position;
      assert.equal(positions.count, 45);
      for (let row = 0; row <= 8; row++) {
        const t = row / 8 * .68;
        for (const [column, digit] of [[0, digits[i]], [4, digits[i + 1]]]) {
          const actual = new THREE.Vector3().fromBufferAttribute(positions, row * 5 + column);
          assert.ok(actual.distanceTo(digit.geometry.parameters.path.getPointAt(t)) < 1e-6, 'web margin seated along toe');
        }
      }
    }
  }
});

test('all exterior geometry is finite and fits a bounded rendering budget', () => {
  let triangles = 0;
  for (const p of frog.parts.filter(p => p.layer === 0)) p.mesh.traverse(o => {
    if (!o.geometry?.attributes.position) return;
    assert.ok(o.geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(o.geometry.attributes.normal.array.every(Number.isFinite));
    triangles += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3;
  });
  assert.ok(triangles < 26000, 'exterior remains below 26k triangles');
});
