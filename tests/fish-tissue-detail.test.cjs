const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { before, test } = require('node:test');
const root = path.resolve(__dirname, '..');
let THREE, context, spec, skin;
before(async () => {
  THREE = await import('data:text/javascript;base64,' + fs.readFileSync(path.join(root, 'src/lab/vendor/three.module.min.js')).toString('base64'));
  context = vm.createContext({ THREE });
  for (const name of ['anatomy', 'fish']) vm.runInContext(fs.readFileSync(path.join(root, 'src/lab', name + '.js'), 'utf8').replace(/^export\s+/gm, ''), context);
  spec = context.buildFish(THREE); skin = spec.parts.find(p => p.id === 'body-wall').mesh;
});

test('scale relief lives in the cuttable flank, stays shallow and fades away from the cranial region', () => {
  const g = skin.geometry, p = g.attributes.position;
  assert.equal(p.count, 7081); assert.ok(p.count < 9000);
  const unshaped = new THREE.SphereGeometry(1, 96, 72);
  context.displace(THREE, unshaped, 0.03, 2.2, 0);
  const source = unshaped.attributes.position;
  const stations = [[0,.28,.30],[.10,.42,.44],[.22,.82,.80],[.40,1,1.02],[.58,1.13,1.02],[.76,1.14,1],[.90,1,.94],[1,.90,.90]];
  let relieved = 0, cranial = 0;
  for (let i = 0; i < p.count; i++) {
    const x = source.getX(i), y = source.getY(i), z = source.getZ(i), t = Math.max(0, Math.min(1, (z + 1) / 2));
    let k = 1; while (k < stations.length - 1 && t > stations[k][0]) k++;
    const lo = stations[k - 1], hi = stations[k], f = context.smooth((t - lo[0]) / (hi[0] - lo[0]));
    const bx = x * .5 * (lo[1] + (hi[1] - lo[1]) * f) * 1.16;
    const by = y * 1.7 * (lo[2] + (hi[2] - lo[2]) * f) * (y >= 0 ? 1.06 : .99);
    const dx = p.getX(i) - bx, dy = p.getY(i) - by, d = Math.hypot(dx, dy);
    assert.ok(d < .0081, 'scale relief never becomes thick armour');
    assert.ok(dx * x + dy * y > -1e-6, 'raised relief does not excavate the body cavity');
    if (t > .77) { assert.ok(d < 1e-6, 'no scales applied over the smooth cranial surface'); cranial++; }
    if (d > .002) relieved++;
  }
  assert.ok(relieved > 300 && cranial > 500, 'check the actual body field and scale-free head, not metadata');
  unshaped.dispose();
});

test('each fin membrane is scalloped between its supporting rays and has a restrained pigment gradient', () => {
  const fins = skin.children.filter(m => m.userData.exteriorDetail === 'fin');
  assert.equal(fins.length, 8);
  for (const fin of fins) {
    const p = fin.geometry.attributes.position, color = fin.geometry.attributes.color;
    assert.equal(fin.material.vertexColors, true); assert.equal(color.count, p.count);
    assert.ok(color.array.every(x => Number.isFinite(x) && x > .5 && x <= 1));
    const roots = fin.userData.finRoots;
    assert.equal(p.count, (roots.length * 2 - 1) * 9);
    let scallops = 0;
    for (let i = 0; i < roots.length - 1; i++) {
      const tip0 = new THREE.Vector3().fromBufferAttribute(p, (i * 2) * 9 + 8);
      const tip1 = new THREE.Vector3().fromBufferAttribute(p, (i * 2 + 2) * 9 + 8);
      const between = new THREE.Vector3().fromBufferAttribute(p, (i * 2 + 1) * 9 + 8);
      const rootMid = new THREE.Vector3(...roots[i]).lerp(new THREE.Vector3(...roots[i + 1]), .5);
      const straightEdge = tip0.lerp(tip1, .5);
      if (straightEdge.distanceTo(rootMid) < .01) continue;
      assert.ok(between.distanceTo(rootMid) < straightEdge.distanceTo(rootMid), 'membrane recedes between rays'); scallops++;
    }
    assert.ok(scallops > 3);
    assert.equal(fin.children.length, 1, 'all rays remain one batched draw, not per-ray children');
    const rays = fin.children[0].geometry.attributes.position;
    assert.equal(rays.count, roots.length * 55);
    for (let i = 0; i < roots.length; i++) {
      const sectionRadius = row => {
        const c = new THREE.Vector3(), points = [];
        for (let j = 0; j < 4; j++) { const v = new THREE.Vector3().fromBufferAttribute(rays, i * 55 + row * 5 + j); points.push(v); c.add(v); }
        c.multiplyScalar(.25); return points.reduce((sum, v) => sum + v.distanceTo(c), 0) / 4;
      };
      assert.ok(sectionRadius(10) < sectionRadius(0) * .45, 'ray tips taper instead of ending as uniform wire');
    }
  }
});

test('both lateral eyes follow the body when rotated without adding extra pick targets', () => {
  const eyes = skin.children.filter(m => m.userData.exteriorDetail === 'eye');
  assert.equal(eyes.length, 2);
  assert.ok(eyes[0].position.x < 0 && eyes[1].position.x > 0);
  assert.equal(eyes[0].position.y, eyes[1].position.y); assert.equal(eyes[0].position.z, eyes[1].position.z);
  assert.ok(eyes[0].children[0].position.x < 0 && eyes[1].children[0].position.x > 0);
  for (const eye of eyes) eye.traverse(m => assert.equal(m.userData.partId, undefined));
  assert.equal(spec.parts.length, 22);
  assert.equal(vm.runInContext('SPECIMENS.fish.name', context), 'Bony fish');
});

test('opaque flank and gill cover keep a dark-backed silver-olive pigment range rather than a translucent white shell', () => {
  for (const id of ['body-wall', 'operculum']) {
    const mesh = spec.parts.find(p => p.id === id).mesh;
    assert.equal(mesh.material.transmission, 0, id + ': tray and hidden organs do not shine through opaque tissue');
    assert.equal(mesh.material.transparent, false); assert.equal(mesh.material.opacity, 1);
    assert.equal(mesh.material.vertexColors, true);
    assert.equal(mesh.material.specularIntensity, .55, 'restrained surface reflection');
  }
  const p = skin.geometry.attributes.position, c = skin.geometry.attributes.color;
  const regions = { dorsal: [], flank: [], ventral: [] };
  const luminance = i => c.getX(i) * .2126 + c.getY(i) * .7152 + c.getZ(i) * .0722;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getZ(i)) > 1) continue;
    if (p.getY(i) > 1.3) regions.dorsal.push(luminance(i));
    else if (p.getY(i) < -1.3) regions.ventral.push(luminance(i));
    else if (Math.abs(p.getY(i)) < .25) regions.flank.push(luminance(i));
  }
  const mean = values => values.reduce((sum, v) => sum + v, 0) / values.length;
  for (const values of Object.values(regions)) assert.ok(values.length > 20);
  assert.ok(mean(regions.dorsal) < mean(regions.flank) * .55, 'back stays distinctly darker than flank');
  assert.ok(mean(regions.flank) > .12 && mean(regions.flank) < .30, 'flank albedo does not wash out near white');
  assert.ok(mean(regions.ventral) > mean(regions.flank) * 1.5, 'belly-to-back contrast survives');
});
