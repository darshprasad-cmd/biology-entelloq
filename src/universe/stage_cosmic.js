/*
 * stage_cosmic.js — the five largest scales: UNIVERSE → EARTH → BIOME →
 * ECOSYSTEM → ORGANISM.
 *
 * The top two scales are built on REAL public-domain photography (see
 * _textures.js): the universe is the Hubble eXtreme Deep Field — every smudge in
 * it is an actual galaxy — and Earth is the NASA Blue Marble wrapped on a true 3D
 * sphere, with the Earth-at-Night city lights glowing on its dark side. Below the
 * biome, photographs stop being the honest medium and the scenes are modelled in
 * 3D instead, which is what scientific visualisation does.
 */

UNI.register('universe', ({ THREE, KIT, meta }) => {
  const root = KIT.group(); const H = KIT.HEX;

  // ── the sky IS the real deep field. A large inward-facing sphere puts the
  //    camera inside the actual Hubble XDF rather than in front of a picture.
  const skyMat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'deepField'), side: THREE.BackSide,
    transparent: true, opacity: 0.95, depthWrite: false,
  }));
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5.2, 48, 32), skyMat);
  root.add(sky);

  // a second, counter-rotating copy adds real parallax depth to the field
  const sky2Mat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'deepField'), side: THREE.BackSide, transparent: true,
    opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  const sky2 = new THREE.Mesh(new THREE.SphereGeometry(3.6, 32, 24), sky2Mat);
  sky2.rotation.set(1.1, 2.2, 0.4); root.add(sky2);

  // ── our galaxy: a real Hubble spiral, billboarded and lit from within
  const galMat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'galaxy'), transparent: true, opacity: 0.98,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const milky = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.2), galMat);
  milky.rotation.set(-0.5, 0.2, 0.3);
  root.add(milky);
  // a warm core glow so it reads as luminous, not as a flat cut-out
  const core = KIT.sphere(0.16, 20, KIT.additive(0xfff0d0, 0.55)); root.add(core);

  // ── a real nebula (Carina pillars), off to one side and slowly drifting
  const nebMat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'nebula'), transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const neb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.4), nebMat);
  neb.position.set(-2.1, 1.2, -2.4); neb.rotation.z = 0.5; root.add(neb);
  const neb2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.9), nebMat.clone());
  KIT.track(neb2.material); neb2.material.opacity = 0.3;
  neb2.position.set(2.4, -1.4, -2.0); neb2.rotation.z = -1.1; root.add(neb2);

  // ── foreground stars, so moving through the field has real depth
  const N = 900, sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(1.6 + Math.random() * 2.6);
    sp[i * 3] = v.x; sp[i * 3 + 1] = v.y; sp[i * 3 + 2] = v.z;
  }
  const stars = KIT.points(sp, H.ink, 0.016, { opacity: 0.75 });
  root.add(stars);

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'uni-milkyway', get: (v) => milky.getWorldPosition(v), meta: HS.milkyway },
    { id: 'uni-elements', get: (v) => neb.getWorldPosition(v), meta: HS.elements },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt, d, camera) {
    clock += dt;
    // billboard the flat plates so they never reveal themselves as planes
    milky.quaternion.copy(camera.quaternion); milky.rotateZ(clock * 0.02);
    neb.quaternion.copy(camera.quaternion); neb2.quaternion.copy(camera.quaternion);
    sky.rotation.y += dt * 0.004; sky2.rotation.y -= dt * 0.010;
    stars.rotation.y += dt * 0.006;
    core.scale.setScalar(1 + Math.sin(clock * 0.8) * 0.06);
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


UNI.register('earth', ({ THREE, KIT, meta }) => {
  const root = KIT.group(); const H = KIT.HEX;
  const globe = KIT.group(); root.add(globe);

  // ── the planet: real Blue Marble colour + real city lights as the emissive
  //    map, so the night side lights up exactly where humans actually live.
  const earthMat = KIT.track(new THREE.MeshStandardMaterial({
    map: texLoad(THREE, 'earthDay'),
    emissiveMap: texLoad(THREE, 'earthNight'),
    emissive: 0xffd9a0, emissiveIntensity: 0.85,
    roughness: 0.82, metalness: 0.0, transparent: true,
  }));
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1.35, 96, 64), earthMat);
  earth.rotation.y = -1.2;   // start on Africa/Europe, the classic framing
  globe.add(earth);

  // ── atmosphere: a rim-lit shell. Backside + additive gives the blue limb glow
  //    you see from orbit without needing a custom shader.
  const atmoMat = KIT.track(new THREE.MeshBasicMaterial({
    color: 0x5fa8e8, transparent: true, opacity: 0.13,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.44, 48, 32), atmoMat));
  const haloMat = KIT.track(new THREE.MeshBasicMaterial({
    color: 0x2f7fd0, transparent: true, opacity: 0.06,
    side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.62, 32, 24), haloMat));

  // ── cloud deck: a thin procedural shell that drifts against the surface
  const cloudTex = KIT.noiseTex(256, 11, 5);
  const cloudMat = KIT.track(new THREE.MeshStandardMaterial({
    map: cloudTex, alphaMap: cloudTex, transparent: true, opacity: 0.30,
    roughness: 1, metalness: 0, depthWrite: false, color: 0xffffff,
  }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.375, 64, 40), cloudMat);
  globe.add(clouds);

  // the deep field stays faintly behind the planet — we are still in space
  const bgMat = KIT.track(new THREE.MeshBasicMaterial({
    map: texLoad(THREE, 'deepField'), side: THREE.BackSide,
    transparent: true, opacity: 0.5, depthWrite: false,
  }));
  root.add(new THREE.Mesh(new THREE.SphereGeometry(6, 32, 24), bgMat));

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'earth-atmo', get: (v) => v.set(0, 1.5, 0.35).applyMatrix4(globe.matrixWorld), meta: HS.atmosphere },
    { id: 'earth-ocean', get: (v) => v.set(1.05, -0.45, 0.6).applyMatrix4(globe.matrixWorld), meta: HS.oceans },
    { id: 'earth-land', get: (v) => v.set(-0.55, 0.45, 1.1).applyMatrix4(globe.matrixWorld), meta: HS.land },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) {
    clock += dt;
    earth.rotation.y += dt * 0.035;          // a real, unhurried rotation
    clouds.rotation.y += dt * 0.048;         // weather outruns the ground
    clouds.rotation.x = Math.sin(clock * 0.05) * 0.01;
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


UNI.register('biome', ({ THREE, KIT, meta }) => {
  // A rainforest, modelled: layered canopy, sunlit haze, drifting pollen. Built
  // in 3D rather than photographed so you can move through it.
  const root = KIT.group(); const H = KIT.HEX;
  const world = KIT.group(0, -0.3, 0); root.add(world);

  const ground = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64),
    KIT.surface(0x14301f, { rough: 0.98, emissive: 0x05130a, glow: 0.25 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.6; world.add(ground);

  // mist layers give the forest real atmospheric depth
  const mistMat = KIT.track(new THREE.MeshBasicMaterial({
    color: 0x9fd8c0, transparent: true, opacity: 0.05,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), mistMat);
    m.rotation.x = -Math.PI / 2; m.position.y = -0.4 + i * 0.35; world.add(m);
  }

  // A rainforest crown is a cluster of irregular leaf masses, not a cone. Each tree
  // gets a tapered trunk and 3–5 displaced blobs at varied heights and tints, which
  // is what turns "green cones" into something that reads as canopy.
  const trunkMat = KIT.surface(0x33241a, { rough: 0.95 });
  // Foliage deliberately uses the CHEAP standard material, not the wet clearcoat
  // one: leaves aren't glossy, and ~300 clearcoat shaders in one scene was the
  // difference between 57fps and a comfortable 60+.
  const LEAF = [0x1f7a3a, 0x2b8f45, 0x17692f, 0x35a052].map((c) =>
    KIT.surface(c, { rough: 0.86, emissive: 0x0b2f16, glow: 0.22, flat: true }));
  // one shared blob geometry per tint keeps this cheap; scale/rotate makes it varied
  const blobGeo = KIT.displace(new THREE.SphereGeometry(1, 16, 12), 0.30, 2.4, 77);
  const trees = [];
  for (let i = 0; i < 74; i++) {
    const a = KIT.hash(i) * Math.PI * 2, r = 0.35 + KIT.hash(i + 3) * 2.7;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    const t = KIT.group(x, -0.6, z);
    const h = 0.55 + KIT.hash(i + 9) * 0.9;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.038, h, 7), trunkMat);
    trunk.position.y = h / 2; t.add(trunk);
    const n = 3 + Math.floor(KIT.hash(i + 21) * 3);
    for (let k = 0; k < n; k++) {
      const b = new THREE.Mesh(blobGeo, LEAF[(i + k) % LEAF.length]);
      const s = (0.12 + KIT.hash(i * 4 + k) * 0.11) * (1 - k * 0.13);
      b.scale.set(s * (1 + KIT.hash(i + k) * 0.4), s * 0.82, s * (1 + KIT.hash(i - k) * 0.35));
      b.position.set((KIT.hash(i * 3 + k) - 0.5) * 0.16, h + 0.06 + k * 0.13,
        (KIT.hash(i * 7 + k) - 0.5) * 0.16);
      b.rotation.set(KIT.hash(k + i) * 3, KIT.hash(k * 2 + i) * 3, 0);
      t.add(b);
    }
    world.add(t); trees.push({ t, ph: KIT.hash(i) * 6.28 });
  }

  // shafts of sunlight through the canopy — the signature of a real forest
  const sun = KIT.sphere(0.26, 24, KIT.additive(0xffe6a8, 0.5));
  sun.position.set(1.5, 1.7, -1.2); root.add(sun);
  const shaftMat = KIT.track(new THREE.MeshBasicMaterial({
    color: 0xffe0a0, transparent: true, opacity: 0.055,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  for (let i = 0; i < 5; i++) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 3.6), shaftMat);
    s.position.set(0.9 - i * 0.45, 0.6, -0.7 + i * 0.35);
    s.rotation.set(0.35, i * 0.5, 0.22); root.add(s);
  }

  const pollen = KIT.points((() => {
    const n = 200, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      p[i * 3] = (KIT.hash(i) - 0.5) * 5.5; p[i * 3 + 1] = KIT.hash(i + 1) * 2.4; p[i * 3 + 2] = (KIT.hash(i + 2) - 0.5) * 4.5;
    } return p;
  })(), 0xffe6a8, 0.022, { opacity: 0.5 });
  root.add(pollen);

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'biome-canopy', get: (v) => v.set(0, 0.95, 0.3).applyMatrix4(root.matrixWorld), meta: HS.canopy },
    { id: 'biome-soil', get: (v) => v.set(0.7, -0.62, 0.85).applyMatrix4(root.matrixWorld), meta: HS.soil },
    { id: 'biome-water', get: (v) => sun.getWorldPosition(v), meta: HS.water },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) {
    clock += dt; root.rotation.y += dt * 0.028;
    for (const o of trees) o.t.rotation.z = Math.sin(clock * 0.7 + o.ph) * 0.028;
    const pp = pollen.geometry.attributes.position.array;
    for (let i = 0; i < pp.length; i += 3) {
      pp[i + 1] += dt * 0.055; pp[i] += Math.sin(clock + i) * 0.0008;
      if (pp[i + 1] > 2.4) pp[i + 1] = -0.5;
    }
    pollen.geometry.attributes.position.needsUpdate = true;
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


UNI.register('ecosystem', ({ THREE, KIT, meta }) => {
  // the food web as an actual web: trophic nodes joined by flows of energy.
  const root = KIT.group(); const H = KIT.HEX; const spin = KIT.group(); root.add(spin);
  const NODES = [
    { id: 'producer', pos: [0, -1.05, 0], col: 0x34d399, r: 0.3, n: 5 },
    { id: 'herbivore', pos: [-1.15, 0, 0.3], col: 0x38e0d8, r: 0.23, n: 3 },
    { id: 'predator', pos: [0.45, 1.05, -0.2], col: 0xfb7185, r: 0.26, n: 1 },
    { id: 'decomposer', pos: [1.25, -0.45, 0.4], col: 0xf6c667, r: 0.21, n: 4 },
  ];
  const nodeObjs = {};
  for (const nd of NODES) {
    const g = KIT.group(nd.pos[0], nd.pos[1], nd.pos[2]);
    for (let k = 0; k < nd.n; k++) {
      const s = KIT.sphere(nd.r * (0.6 + KIT.hash(k) * 0.5), 24,
        KIT.surface(nd.col, { rough: 0.35, emissive: nd.col, glow: 0.55 }));
      const a = k / nd.n * 6.28;
      s.position.set(Math.cos(a) * nd.r, Math.sin(a) * nd.r, Math.sin(a * 2) * nd.r * 0.4);
      g.add(s);
    }
    g.add(KIT.sphere(nd.r * 1.7, 18, KIT.additive(nd.col, 0.2)));
    spin.add(g); nodeObjs[nd.id] = g;
  }
  const EDGES = [['producer', 'herbivore'], ['herbivore', 'predator'], ['producer', 'decomposer'], ['predator', 'decomposer'], ['producer', 'predator']];
  const flows = [];
  for (const [a, b] of EDGES) {
    const pa = new THREE.Vector3(...NODES.find((n) => n.id === a).pos);
    const pb = new THREE.Vector3(...NODES.find((n) => n.id === b).pos);
    spin.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([pa, pb]), KIT.additive(0x34d399, 0.22)));
    const F = 9, p = new Float32Array(F * 3);
    const pts = KIT.points(p, 0x38e0d8, 0.045, { opacity: 0.95 });
    flows.push({ pa, pb, pts, off: KIT.hash(EDGES.indexOf([a, b])) || Math.random(), n: F });
    spin.add(pts);
  }

  const HS = meta.hotspots || {};
  const hotspots = NODES.map((nd) => ({ id: 'eco-' + nd.id, get: (v) => nodeObjs[nd.id].getWorldPosition(v), meta: HS[nd.id] })).filter((h) => h.meta);

  let clock = 0;
  function update(dt) {
    clock += dt; spin.rotation.y += dt * 0.055; spin.rotation.x = Math.sin(clock * 0.12) * 0.06;
    for (const f of flows) {
      const arr = f.pts.geometry.attributes.position.array;
      for (let i = 0; i < f.n; i++) {
        const t = ((clock * 0.28 + f.off + i / f.n) % 1);
        arr[i * 3] = f.pa.x + (f.pb.x - f.pa.x) * t;
        arr[i * 3 + 1] = f.pa.y + (f.pb.y - f.pa.y) * t;
        arr[i * 3 + 2] = f.pa.z + (f.pb.z - f.pa.z) * t;
      }
      f.pts.geometry.attributes.position.needsUpdate = true;
    }
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


UNI.register('organism', ({ THREE, KIT, meta }) => {
  // a human, as a body of systems: a translucent form with a lit nervous system
  // and a beating circulatory tree threading through it.
  const root = KIT.group(); const H = KIT.HEX; const body = KIT.group(0, -0.1, 0); root.add(body);
  const skin = KIT.track(new THREE.MeshStandardMaterial({
    color: 0x9fd8e8, transparent: true, opacity: 0.10, roughness: 0.25, metalness: 0,
    emissive: 0x2a6a7a, emissiveIntensity: 0.18, side: THREE.DoubleSide, depthWrite: false,
  }));
  function limb(x, y, z, rz, len, rad) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len, 8, 16), skin);
    m.position.set(x, y, z); m.rotation.z = rz; body.add(m); return m;
  }
  limb(0, 0.35, 0, 0, 0.9, 0.34);
  const head = KIT.sphere(0.26, 32, skin); head.position.y = 1.15; body.add(head);
  limb(-0.42, 0.5, 0, 0.5, 0.7, 0.11); limb(0.42, 0.5, 0, -0.5, 0.7, 0.11);
  limb(-0.18, -0.55, 0, 0.06, 0.85, 0.14); limb(0.18, -0.55, 0, -0.06, 0.85, 0.14);

  const nerveMat = KIT.additive(0x34d399, 0.65);
  const spinePts = [new THREE.Vector3(0, 1.1, 0.1), new THREE.Vector3(0, 0.6, 0.05), new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0, -0.4, 0)];
  body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(spinePts), nerveMat));
  const brain = KIT.sphere(0.13, 24, KIT.emissive(0x34d399, { glow: 0.8, opacity: 0.65 }));
  brain.position.set(0, 1.15, 0.05); body.add(brain);
  const nervePulse = KIT.points(new Float32Array(40 * 3), 0x34d399, 0.03, { opacity: 0.95 }); body.add(nervePulse);

  const heart = KIT.sphere(0.1, 24, KIT.emissive(0xfb7185, { glow: 0.85 }));
  heart.position.set(-0.05, 0.45, 0.1); body.add(heart);
  const vesselMat = KIT.additive(0xfb7185, 0.42);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * 6.28;
    body.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      heart.position.clone(),
      new THREE.Vector3(Math.cos(a) * 0.42, 0.45 + Math.sin(a) * 0.55, 0.1),
    ]), vesselMat));
  }

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'org-nervous', get: (v) => brain.getWorldPosition(v), meta: HS.nervous },
    { id: 'org-circ', get: (v) => heart.getWorldPosition(v), meta: HS.circulatory },
    { id: 'org-skel', get: (v) => v.set(0, 0.1, 0).applyMatrix4(body.matrixWorld), meta: HS.skeleton },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) {
    clock += dt; body.rotation.y = Math.sin(clock * 0.14) * 0.42;
    const b = 1 + Math.sin(clock * 2.4) * 0.15; heart.scale.setScalar(b);
    brain.material.opacity = 0.45 + 0.3 * Math.sin(clock * 3);
    const arr = nervePulse.geometry.attributes.position.array;
    for (let i = 0; i < 40; i++) {
      const t = ((clock * 0.55 + i / 40) % 1);
      const seg = Math.min(2, Math.floor(t * 3));
      const a = spinePts[seg], bb = spinePts[seg + 1] || spinePts[seg];
      const lt = (t * 3) % 1;
      arr[i * 3] = a.x + (bb.x - a.x) * lt;
      arr[i * 3 + 1] = a.y + (bb.y - a.y) * lt;
      arr[i * 3 + 2] = a.z + (bb.z - a.z) * lt;
    }
    nervePulse.geometry.attributes.position.needsUpdate = true;
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});
