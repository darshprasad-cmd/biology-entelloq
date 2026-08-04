/*
 * frog.js — buildFrog
 * Concatenated into one module scope with anatomy.js (the shared geometry
 * toolkit, SPECIMENS and buildSpecimen dispatcher). Uses those helpers directly;
 * every local helper below is declared INSIDE buildFrog so it cannot collide
 * with another module's top-level names.
 *
 * Anatomy grounded in standard amphibian (Rana) dissection references — see the
 * builder's return note. Coordinate convention for the un-rotated group:
 *   +z = snout (anterior)      -z = vent (posterior)
 *   +y = ventral (the cavity opens here; viscera sit toward +y)
 *   -y = dorsal (kidneys, aorta, spine — retroperitoneal, on the roof)
 *   -x = the animal's LEFT     +x = the animal's RIGHT
 * The whole group is finally laid supine (ventral up) on the tray.
 */

function buildFrog(THREE) {
  const group = new THREE.Group();
  const parts = [];

  const add = (p) => {
    p.mesh.userData.partId = p.id;
    p.mesh.userData.baseColor = p.mesh.material.color.clone();
    if (p.mesh.geometry) { p.mesh.geometry.computeBoundingSphere(); p.mesh.geometry.computeBoundingBox(); }
    if (p.layer > 0) p.mesh.visible = false;
    group.add(p.mesh);
    parts.push(p);
    return p;
  };

  /* Body: a dorsoventrally FLATTENED fusiform trunk with a broad TRIANGULAR head.
   * A neck pinch behind the jaw hinge, cheeks that flare then taper to a blunt
   * snout, a domed dorsum and a flat belly. Returns a geometry carrying a
   * mottled-olive-dorsal / cream-ventral vertex tint. */
  function frogBody(sx, sy, sz, o) {
    o = o || {};
    const seg = o.seg || 48, seg2 = o.seg2 || 36;
    const g = new THREE.SphereGeometry(1, seg, seg2);
    displace(THREE, g, o.amp != null ? o.amp : 0.045, 2.0, o.seed || 0);
    const p = g.attributes.position, v = new THREE.Vector3();
    const colors = o.vcol ? new Float32Array(p.count * 3) : null;
    const c = new THREE.Color();
    const dorsal = new THREE.Color(0x4f6330);   // olive back
    const flank  = new THREE.Color(0x7c8a49);   // lighter flank stripe
    const belly  = new THREE.Color(0xd9d7b0);   // cream underside
    const spot   = new THREE.Color(0x28331a);   // dark dorsal mottle
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const uy = v.y, uz = v.z;                   // unit coords, pre-scale
      const t = Math.max(0, Math.min(1, (uz + 1) / 2)); // 0 vent .. 1 snout
      let prof = Math.sin(t * Math.PI * 0.97 + 0.09);
      prof *= 1 - 0.17 * Math.exp(-Math.pow((t - 0.73) / 0.055, 2)); // neck pinch
      if (t < 0.08) prof *= 0.5 + t * 4.0;         // vent taper
      // Head: broad triangle. Cheeks flare just ahead of the neck pinch, then the
      // profile tapers to a blunt (not pointed) snout.
      let xprof = prof;
      const cheek = 0.2 * Math.exp(-Math.pow((t - 0.84) / 0.075, 2)); // jaw flare
      xprof *= 1 + cheek;
      if (t > 0.9) { const s = (t - 0.9) / 0.1; prof *= 1 - s * 0.34; xprof *= 1 - s * 0.28; }
      const yscale = uy >= 0 ? 0.58 : 1.0;         // ventral flat, dorsal domed
      p.setXYZ(i, v.x * xprof * sx, uy * prof * yscale * sy, uz * sz);
      if (colors) {
        const vent = smooth(Math.max(0, Math.min(1, uy * 0.85 + 0.5)));
        c.copy(dorsal).lerp(flank, smooth(Math.max(0, Math.min(1, uy * 1.6 + 0.75))));
        c.lerp(belly, vent);
        const m = vnoise(v.x * 6 + 3, uy * 6, uz * 6 + 9);
        if (vent < 0.55 && m > 0.6) c.lerp(spot, (m - 0.6) * 2.4 * (1 - vent));
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
    }
    if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    seal(g);
    return g;
  }

  /* --- layer 0: skin ---------------------------------------------------- */
  const skinGeo = frogBody(2.34, 1.42, 4.55, { vcol: true, amp: 0.05 });
  const skin = new THREE.Mesh(skinGeo,
    mat(THREE, 0xffffff, { vcol: true, rough: 0.5, clear: 0.6, clearRough: 0.5,
      sheen: 0xaec07a, sheenAmt: 0.72 }));

  /* Head detail: dorsally-bulging eyes (low domes seen from the ventral side),
   * a tympanum disc behind each eye, and a nostril near the snout. All decorative
   * children of the skin — never picked. */
  function frogEye(side) {
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16),
      mat(THREE, 0xbf9a34, { rough: 0.28, clear: 0.9, clearRough: 0.15, sheen: 0xffe08a }));
    iris.scale.set(1, 0.82, 1);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12),
      mat(THREE, 0x0a0d08, { rough: 0.2, clear: 1, clearRough: 0.08 }));
    childMesh(iris, pupil, 0, 0.07, 0.22);
    // Eyes bulge dorsally (-y), high on the widest part of the head.
    childMesh(skin, iris, side * 0.86, -0.5, 3.05);
    const tym = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20),
      mat(THREE, 0x475226, { rough: 0.8, clear: 0.2, side: THREE.DoubleSide }));
    childMesh(skin, tym, side * 1.22, -0.28, 2.4, 0.15, side * 0.95, 0);
    const nos = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mat(THREE, 0x1a1c12, { rough: 0.6 }));
    childMesh(skin, nos, side * 0.24, -0.34, 4.2);
  }
  frogEye(-1); frogEye(1);

  add({
    id: 'skin', name: 'Skin', layer: 0, system: 'integument', cuttable: true, detachable: false,
    note: 'Moist, permeable, mottled olive above and cream below — used for cutaneous gas exchange. Your first incision runs the ventral midline.',
    mesh: skin,
    incision: [[0, 0.98, 3.2], [0, 1.02, 1.6], [0, 1.02, -0.4], [0, 0.96, -2.3], [0, 0.82, -3.5]],
  });

  /* limbs — the pinning targets. Each is one tube following a jointed path with a
   * flattened webbed foot and splayed digits as decorative children. Forelimbs
   * are short with 4 digits; hindlimbs long, sharply folded, with 5 long webbed
   * digits. A frog at rest folds its limbs — it is not a starfish. */
  function frogDigit(parent, x, y, z, len, rad, spread, tilt) {
    const d = new THREE.Mesh(new THREE.CapsuleGeometry(rad, len, 4, 8),
      mat(THREE, 0x54682f, { rough: 0.62, sheen: 0xaec07a }));
    childMesh(parent, d, x, y, z, Math.PI / 2 + tilt, 0, spread);
    return d;
  }
  function limb(lid, nm, sx, long, seed) {
    let path, r, foot, footPos, footRot, nDig, digLen, webW, webL;
    if (long) {
      // hindlimb: long, sharply folded — thigh forward, shank back, big webbed foot
      path = [
        [sx * 1.85, 0.05, -2.25],
        [sx * 3.05, -0.12, -1.25],   // knee (thrust forward)
        [sx * 2.7, -0.2, -3.35],     // ankle (folded back)
        [sx * 2.15, -0.16, -4.4],    // heel
      ];
      r = 0.34;
      foot = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), mat(THREE, 0x54682f, { rough: 0.62, sheen: 0xaec07a }));
      foot.geometry.scale(0.24, 0.1, 0.85); seal(foot.geometry);
      footPos = [sx * 1.95, -0.18, -5.2]; footRot = [0.1, -sx * 0.26, 0];
      nDig = 5; digLen = 0.95; webW = 0.9; webL = 1.05;
    } else {
      // forelimb: shorter, folded, small 4-digit hand
      path = [
        [sx * 1.85, 0.06, 2.05],
        [sx * 2.6, -0.06, 2.6],      // elbow
        [sx * 2.3, -0.12, 3.35],     // wrist
      ];
      r = 0.26;
      foot = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat(THREE, 0x54682f, { rough: 0.62, sheen: 0xaec07a }));
      foot.geometry.scale(0.2, 0.09, 0.34); seal(foot.geometry);
      footPos = [sx * 2.15, -0.14, 3.85]; footRot = [0.1, sx * 0.4, 0];
      nDig = 4; digLen = 0.34; webW = 0; webL = 0;
    }
    const m = tube(THREE, 0x5a6b33, path, r, { rough: 0.62, sheen: 0xaec07a, clear: 0.4, seg: 40, rad: 9, seed });
    childMesh(m, foot, ...footPos, ...footRot);
    // splayed digits fanning off the far end of the foot
    for (let i = 0; i < nDig; i++) {
      const f = (i - (nDig - 1) / 2) / Math.max(1, nDig - 1);   // -0.5 .. 0.5
      const dz = (long ? -5.9 : 4.15);
      frogDigit(m, footPos[0] + f * 0.34, footPos[1] + 0.02,
        (footRot ? dz : dz), digLen, long ? 0.06 : 0.05, f * (long ? 0.55 : 0.5), 0);
    }
    if (long && webW) {
      // toe webbing: a thin translucent triangular fan between the digits
      const web = new THREE.Mesh(new THREE.CircleGeometry(webL, 5, Math.PI * 0.15, Math.PI * 0.7),
        mat(THREE, 0x59692f, { trans: true, opacity: 0.5, rough: 0.6, side: THREE.DoubleSide }));
      web.scale.set(webW, 1, 1);
      childMesh(m, web, footPos[0], footPos[1] - 0.02, -5.75, Math.PI / 2, 0, 0);
    }
    return add({
      id: lid, name: nm, layer: 0, system: 'muscular', cuttable: false, detachable: false,
      note: long ? 'Long and sharply folded — the powerhouse for the leap. Pin it out splayed so the body wall comes under tension.'
                 : 'Short, four-digit — used to prop the body and cushion landing. Pin it out so the wall is taut.',
      mesh: m,
    });
  }
  limb('forelimb-left', 'Left forelimb', -1, false, 1);
  limb('forelimb-right', 'Right forelimb', 1, false, 2);
  limb('hindlimb-left', 'Left hindlimb', -1, true, 3);
  limb('hindlimb-right', 'Right hindlimb', 1, true, 4);

  /* --- layer 1: abdominal muscle wall ----------------------------------- */
  const wallGeo = frogBody(2.14, 1.28, 4.32, { amp: 0.04, seed: 4 });
  const wall = new THREE.Mesh(wallGeo,
    mat(THREE, 0xb9756a, { rough: 0.72, clear: 0.22, sheen: 0xd88f7f, sheenAmt: 0.6 }));
  // linea alba: a pale tendinous seam down the ventral midline, as a child strip
  const linea = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 5.6, 1, 20),
    mat(THREE, 0xd8b7a4, { rough: 0.7, side: THREE.DoubleSide }));
  {
    const lp = linea.geometry.attributes.position, lv = new THREE.Vector3();
    for (let i = 0; i < lp.count; i++) {
      lv.fromBufferAttribute(lp, i);
      const t = (lv.y / 5.6) + 0.5;
      lp.setXYZ(i, lv.x, lv.y, Math.sin(t * Math.PI) * 0.86 + 0.02);  // hug the belly dome
    }
    seal(linea.geometry);
  }
  childMesh(wall, linea, 0, 0.9, 0, 0, 0, Math.PI / 2);
  add({
    id: 'muscle-wall', name: 'Abdominal muscle wall', layer: 1, system: 'muscular',
    cuttable: true, detachable: false,
    note: 'Thin sheet of body-wall muscle. Cut in the midline along the linea alba — but the ventral abdominal vein runs right down it.',
    mesh: wall,
    incision: [[0, 0.86, 3.0], [0, 0.9, 1.4], [0, 0.9, -0.6], [0, 0.82, -2.4]],
  });

  // The documented classic first-attempt failure: cutting this blind. It runs in
  // the midline of the ventral body wall, draining into the liver.
  const vav = tube(THREE, 0x3f5fa8,
    [[0, 0.82, 3.0], [0, 0.9, 1.2], [0, 0.9, -0.8], [0, 0.8, -2.5]], 0.07,
    { rough: 0.4, clear: 0.6, sheen: 0x6f8fd0, rad: 8, seg: 44 });
  add({
    id: 'ventral-abdominal-vein', name: 'Ventral abdominal vein', layer: 1, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'Runs in the midline of the muscle wall, on its inner face. Cutting it blind on the first stroke is the classic first-attempt failure.',
    mesh: vav,
  });

  /* --- layer 2: viscera -------------------------------------------------- */
  // The liver DOMINATES the anterior cavity and hides the stomach and duodenum —
  // that is the teaching point. Three lobes: a large right lobe, a left lobe, and
  // a central median lobe that overlaps the heart. Dark red-brown, glossy capsule.
  const liverMat = { rough: 0.4, clear: 0.74, clearRough: 0.26, sheen: 0x9a4b45, sheenAmt: 0.72 };
  const liverLobes = [
    // id, name, colour, x, y, z, len, wide, thick, yaw, seed
    ['liver-right',  'Liver — right lobe',  0x6c2822,  1.02, 0.3,  0.95, 1.85, 1.12, 0.42,  0.34, 0],
    ['liver-left',   'Liver — left anterior lobe',  0x72302a, -1.0,  0.3,  1.0,  1.6,  1.02, 0.42, -0.3,  1],
    ['liver-median', 'Liver — left posterior lobe', 0x7c362c, -0.62, 0.28, 0.65, 1.2,  0.86, 0.38, -0.34, 2],
  ];
  liverLobes.forEach(([lid, nm, col, x, y, z, len, wide, thick, yaw, seed]) => {
    const m = lobe(THREE, col, len, wide, thick, { ...liverMat, seed: seed * 3 });
    m.position.set(x, y, z);
    m.rotation.set(-0.16, yaw, 0);                // free tip lifts toward the snout
    add({
      id: lid, name: nm, layer: 2, system: 'digestive', cuttable: true, detachable: true,
      note: 'Dark red-brown with a wet capsule. Three lobes fill the front of the cavity; lift them to reveal the stomach and gall bladder beneath.',
      mesh: m,
    });
  });

  // Gall bladder: a small green translucent sac on the UNDERSIDE of the liver,
  // between the right and median lobes. Only seen when the liver is lifted, so it
  // sits deeper (lower y) and further back than the lobes that cover it.
  const gall = organ(THREE, 0x2f7d3e, 0.19, 0.23, 0.29,
    { amp: 0.05, rough: 0.3, clear: 0.85, trans: 0.4, thickness: 0.5, atten: 0x3f9a52, sheen: 0x8fe0a0 });
  gall.position.set(0.42, 0.02, 1.05);
  // bile/cystic duct running up between the lobes toward the gut
  const gduct = tube(THREE, 0x3f7a4a, [[0, 0.04, 0.12], [-0.06, 0.14, -0.32], [-0.14, 0.2, -0.7]], 0.038,
    { rough: 0.4, rad: 6, seg: 12 });
  gall.add(gduct);
  add({
    id: 'gall-bladder', name: 'Gall bladder', layer: 2, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'A small green translucent sac tucked under the liver, between the right and median lobes. Lift the liver to find it.', mesh: gall,
  });

  // Three-chambered frog heart: a single conical ventricle (apex pointing
  // POSTERIORLY) with two atria at the anterior base, a dark sinus venosus on the
  // dorsal surface, and a conus arteriosus that leaves ventrally and forks into
  // the paired truncus/aortic arches. Triangular and reddish. One pickable body;
  // every named sub-structure is a decorative child.
  const heartF = organ(THREE, 0x8c4038, 0.42, 0.4, 0.56,
    { amp: 0.055, rough: 0.4, clear: 0.7, clearRough: 0.3, sheen: 0xff9a86, seed: 5 });
  heartF.position.set(0, 0.56, 2.42);
  heartF.rotation.x = 0.16;
  // ventricular apex (points posteriorly, -z) — gives the triangular silhouette
  const apex = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 18),
    mat(THREE, 0x7e3b34, { tissue: 'muscle', sheen: 0xa85f4e }));
  childMesh(heartF, apex, 0, -0.02, -0.56, -Math.PI / 2, 0, 0);
  // two atria, thin-walled, at the anterior base (+z). Animal's left = -x.
  [[-0.26, 0.2, 0.32], [0.26, 0.2, 0.32]].forEach(([ax, ay, az]) => {
    const atrium = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), mat(THREE, 0x743036, { tissue: 'muscle' }));
    atrium.geometry.scale(0.27, 0.25, 0.26); seal(atrium.geometry);
    childMesh(heartF, atrium, ax, ay, az);
  });
  // sinus venosus: dark, thin-walled, on the DORSAL surface (-y), posterior
  const sinus = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat(THREE, 0x5a2530, { rough: 0.55, clear: 0.3 }));
  sinus.geometry.scale(0.24, 0.16, 0.3); seal(sinus.geometry);
  childMesh(heartF, sinus, 0, -0.3, 0.14);
  // conus arteriosus: muscular outflow, leaves ventrally (+y) and runs forward
  const conus = tube(THREE, 0xc0684f, [[0, 0.16, 0.42], [0.05, 0.3, 0.64], [0.1, 0.36, 0.86]], 0.1,
    { rough: 0.45, rad: 8, seg: 14, sheen: 0xff9a86 });
  heartF.add(conus);
  // truncus / paired aortic arches sweeping laterally-posteriorly off the conus
  [1, -1].forEach((sd) => {
    const arch = tube(THREE, 0xb85246,
      [[0.1, 0.36, 0.86], [sd * 0.22, 0.34, 0.7], [sd * 0.4, 0.24, 0.42], [sd * 0.42, 0.12, 0.12]], 0.06,
      { rough: 0.45, rad: 6, seg: 16 });
    heartF.add(arch);
  });
  add({
    id: 'frog-heart', name: 'Heart', layer: 2, system: 'circulatory',
    cuttable: true, detachable: true,
    note: 'Three chambers — two atria and a single conical ventricle whose apex points back. The conus arteriosus leaves ventrally and forks into the aortic arches.',
    mesh: heartF,
  });

  // Paired lungs: thin translucent sacs DORSOLATERAL to the heart, partly deflated
  // on a fixed specimen, so they sit deeper (lower y) and lateral to it.
  [['lung-left', -0.92, 12], ['lung-right', 0.92, 13]].forEach(([lid, x, seed]) => {
    const m = sac(THREE, 0xcf9a92, 1.0, 0.42,
      { amp: 0.17, freq: 4.2, seed, rough: 0.5, clear: 0.4, trans: 0.42, thickness: 0.6,
        atten: 0xd89890, attenDist: 1.4, sheen: 0xffb0a0, side: THREE.DoubleSide });
    m.position.set(x, 0.28, 2.15);
    m.rotation.set(0, x > 0 ? -0.14 : 0.14, -0.05);
    add({
      id: lid, name: lid === 'lung-left' ? 'Left lung' : 'Right lung', layer: 2, system: 'respiratory',
      cuttable: true, detachable: true,
      note: 'A thin translucent sac, dorsolateral to the heart. Frogs inflate them by positive pressure — swallowing air from the buccal floor.',
      mesh: m,
    });
  });

  // Stomach: a curved J-shaped bag on the animal's LEFT. Wide cardiac end anterior
  // (continuous with the oesophagus), narrowing to the pylorus posteriorly. Hidden
  // by the liver until it is reflected, so it sits below/behind the left lobe.
  const stomach = bag(THREE, 0xcbb094, 1.15, 0.42,
    { seed: 7, rough: 0.55, clear: 0.45, sheen: 0xe8c8a8, bend: 0.55 });
  stomach.position.set(-0.5, 0.0, 0.35);
  stomach.rotation.set(0.1, 2.25, 0.2);            // narrow (pyloric) end points back
  add({
    id: 'stomach', name: 'Stomach', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A curved, whitish J-shaped bag on the animal\'s left. Wide cardiac end above, narrowing to the pylorus below. You only see it once the liver is lifted.',
    mesh: stomach,
  });

  // Oesophagus (added): a short pale tube from the pharynx down to the cardiac end
  // of the stomach, lying dorsal to the liver.
  const oeso = tube(THREE, 0xd8c0a8,
    [[0, 0.22, 2.65], [-0.14, 0.12, 1.9], [-0.3, 0.06, 1.25], [-0.42, 0.02, 0.78]], 0.11,
    { rough: 0.55, clear: 0.35, sheen: 0xe8d0b8, rad: 8, seg: 22 });
  add({
    id: 'oesophagus', name: 'Oesophagus', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A short muscular tube carrying food from the pharynx to the cardiac end of the stomach. Runs dorsal to the liver.',
    mesh: oeso,
  });

  // Small intestine: a straight DUODENUM leaving the pylorus and running forward
  // parallel to the stomach (the U-loop), then a long, highly-coiled ILEUM held in
  // a translucent mesentery, enlarging posteriorly to join the rectum.
  const siPts = [
    [-0.42, 0.02, -0.35],   // pylorus
    [-0.18, 0.0, 0.05],     // duodenum ascending
    [0.12, -0.01, 0.48],    // duodenal apex (U-turn)
    [0.46, -0.02, 0.46],
    [0.5, -0.03, 0.12],     // descending into the coil
  ];
  for (let i = 0; i <= 42; i++) {
    const t = i / 42;
    const ang = t * Math.PI * 2 * 2.8;             // ~2.8 loops
    const rad = 0.72 * (1 - 0.3 * t);
    siPts.push([
      Math.cos(ang) * rad * 0.94,
      -0.05 + Math.cos(ang * 1.3) * 0.06,
      0.05 - t * 1.6 + Math.sin(ang) * rad * 0.52,
    ]);
  }
  const si = tube(THREE, 0xd2a37e, siPts, 0.17, { rough: 0.5, clear: 0.4, sheen: 0xe8b8a0, seg: 170, rad: 9 });
  // translucent mesentery fan holding the coil, with fine vessels painted on it
  const mesGeo = new THREE.PlaneGeometry(2.0, 1.5, 12, 9);
  {
    const mp = mesGeo.attributes.position, mv = new THREE.Vector3();
    for (let i = 0; i < mp.count; i++) {
      mv.fromBufferAttribute(mp, i);
      mp.setXYZ(i, mv.x, mv.y, vnoise(mv.x * 2 + 5, mv.y * 2, 0) * 0.14 - 0.07);
    }
    seal(mesGeo);
  }
  const mesentery = new THREE.Mesh(mesGeo,
    mat(THREE, 0xe7c7b6, { trans: true, opacity: 0.2, rough: 0.6, clear: 0.3, side: THREE.DoubleSide, transmission: 0.42, thickness: 0.2 }));
  mesentery.material.depthWrite = false;
  childMesh(si, mesentery, 0, -0.2, -0.7, Math.PI / 2, 0, 0);
  // mesenteric vessels: a couple of fine red lines converging on the root
  [-0.5, 0.0, 0.5].forEach((sx, k) => {
    const vsl = tube(THREE, 0xc24a3e, [[sx, -0.18, -1.4], [sx * 0.5, -0.16, -0.9], [0.05, -0.14, -0.55]], 0.02,
      { rough: 0.5, rad: 5, seg: 12 });
    si.add(vsl);
  });
  add({
    id: 'small-intestine', name: 'Small intestine', layer: 2, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'A straight duodenum forms a U-loop off the pylorus, then the ileum coils tightly in a transparent mesentery. Tease the mesentery, never cut it.', mesh: si,
  });

  // Large intestine (rectum): distinctly WIDER than the ileum, running straight
  // back to the cloaca at the posterior midline.
  const li = tube(THREE, 0xc09472,
    [[0.1, -0.06, -1.55], [0.16, -0.06, -2.0], [0.05, -0.1, -2.5], [0, -0.14, -2.95]],
    0.27, { rough: 0.52, clear: 0.4, sheen: 0xd8a888, seg: 44, rad: 10 });
  add({
    id: 'large-intestine', name: 'Large intestine (rectum)', layer: 2, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'Markedly wider than the small intestine, running straight back to the cloaca.', mesh: li,
  });

  const cloaca = organ(THREE, 0xa87a68, 0.27, 0.23, 0.29, { amp: 0.05, rough: 0.55, seed: 9 });
  cloaca.position.set(0, -0.16, -3.28);
  add({
    id: 'cloaca', name: 'Cloaca', layer: 2, system: 'urogenital', cuttable: true, detachable: false,
    note: 'The common chamber where the gut, the urinary tract and the gonads all discharge to the vent.', mesh: cloaca,
  });

  // Urinary bladder (added): a thin-walled bilobed sac at the posterior midline,
  // ventral, opening into the cloaca. Collapsed and translucent on a fixed frog.
  const bladder = organ(THREE, 0xd6a8ae, 0.34, 0.2, 0.26,
    { amp: 0.08, rough: 0.5, clear: 0.5, trans: 0.4, thickness: 0.4, atten: 0xe0b0b8, sheen: 0xf0c0c8 });
  bladder.position.set(0, 0.18, -2.95);
  // second lobe of the bilobed bladder
  const bl2 = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12),
    mat(THREE, 0xd6a8ae, { rough: 0.5, clear: 0.5, trans: 0.4, thickness: 0.4, sheen: 0xf0c0c8 }));
  bl2.geometry.scale(0.24, 0.16, 0.2); seal(bl2.geometry);
  childMesh(bladder, bl2, 0.16, -0.02, 0.12);
  add({
    id: 'urinary-bladder', name: 'Urinary bladder', layer: 2, system: 'urogenital', cuttable: true, detachable: true,
    note: 'A thin bilobed sac at the posterior midline, ventral to the rectum. Collapses when empty; opens into the cloaca.', mesh: bladder,
  });

  // Spleen: a small dark-red spherical bead in the mesentery near the stomach-gut
  // junction. Easy to lose to a careless cut.
  const spleen = organ(THREE, 0x7d2436, 0.18, 0.18, 0.19,
    { amp: 0.05, rough: 0.4, clear: 0.6, sheen: 0xb04a68, seed: 8 });
  spleen.position.set(0.5, -0.06, -0.55);
  add({
    id: 'spleen', name: 'Spleen', layer: 2, system: 'circulatory', cuttable: true, detachable: true,
    note: 'A small dark-red round bead in the mesentery near the stomach-intestine junction.', mesh: spleen,
  });

  // Fat bodies: bright orange, clearly FINGER-LIKE (spaghetti-shaped) processes at
  // the anterior pole of each kidney/gonad — a signature frog structure. Built as a
  // small root with several radiating finger children.
  [['fat-body-left', -1.12, 14], ['fat-body-right', 1.12, 15]].forEach(([fid, x, seed]) => {
    const m = organ(THREE, 0xf1c53a, 0.2, 0.16, 0.24,
      { tissue: 'fat', amp: 0.14, freq: 6, sheen: 0xffe58a, seed });
    m.position.set(x, 0.08, -0.5);
    // 5 finger-like lobes fanning anteriorly from the root
    for (let f = 0; f < 5; f++) {
      const a = (f - 2) / 2;                       // -1 .. 1
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.55 + Math.abs(a) * -0.12 + 0.6, 4, 8),
        mat(THREE, 0xeaba30, { tissue: 'fat', sheen: 0xffe58a }));
      childMesh(m, finger, a * 0.16, 0.02 - Math.abs(a) * 0.03, 0.5 + Math.abs(a) * -0.04,
        -0.2, 0, a * 0.4);
    }
    add({
      id: fid, name: fid.includes('left') ? 'Left fat body' : 'Right fat body', layer: 2,
      system: 'urogenital', cuttable: true, detachable: true,
      note: 'Bright orange finger-like fat stores at the front of the gonad, tethered near the kidney. Largest just before hibernation.', mesh: m,
    });
  });

  /* --- layer 3: dorsal / retroperitoneal --------------------------------- */
  // Kidneys: paired elongated dark-red ribbons on the dorsal wall, either side of
  // the midline, retroperitoneal — they stay put when the gut is removed. A yellow
  // adrenal streak runs on the ventral face of each.
  [['kidney-left', -0.66, 21], ['kidney-right', 0.66, 22]].forEach(([kid, x, seed]) => {
    const m = bean(THREE, 0x8a3d38, 1.55, 0.32, 0.2,
      { amp: 0.06, rough: 0.45, clear: 0.55, clearRough: 0.35, sheen: 0xc06a5a, seed, bend: x > 0 ? -0.14 : 0.14 });
    m.position.set(x, -0.6, -1.05);
    // adrenal gland: a yellow-orange streak on the ventral (+y) face
    const adren = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 1.05, 3, 6), mat(THREE, 0xe0a83a, { rough: 0.5, sheen: 0xffd77a }));
    childMesh(m, adren, 0, 0.16, 0, Math.PI / 2, 0, 0);
    add({
      id: kid, name: kid.includes('left') ? 'Left kidney' : 'Right kidney', layer: 3,
      system: 'urogenital', cuttable: true, detachable: true,
      note: 'A flat, dark-red elongated ribbon stuck to the dorsal wall — retroperitoneal, so it stays put. A yellow adrenal streak runs along its ventral face.',
      mesh: m,
    });
  });

  const aorta = vessel(THREE, 0xb03a30,
    [[0, -0.72, 2.2], [0, -0.82, 0.6], [0, -0.88, -1.0], [0, -0.84, -2.4]], 0.11, 0.07,
    { rough: 0.45, clear: 0.5, sheen: 0xd85a48, rad: 9, seg: 44 });
  add({
    id: 'dorsal-aorta', name: 'Dorsal aorta', layer: 3, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'Runs the midline along the roof of the cavity, between the two kidneys.', mesh: aorta,
  });

  // Vertebral column: a short, stiff bony rod with segmented vertebra rings.
  const spine = tube(THREE, 0xd8d2c4,
    [[0, -0.98, 3.2], [0, -1.03, 1.0], [0, -1.08, -1.2], [0, -1.03, -3.2]], 0.16,
    { rough: 0.72, clear: 0.15, sheen: 0xefe8d8, rad: 8, seg: 44 });
  for (let i = 0; i < 9; i++) {                     // 9 presacral vertebrae
    const zt = 3.0 - i * 0.72;
    const yt = -1.03 - Math.cos(zt * 0.4) * 0.03;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 6, 12),
      mat(THREE, 0xe4ddce, { rough: 0.7, clear: 0.15 }));
    childMesh(spine, ring, 0, yt, zt, Math.PI / 2, 0, 0);
  }
  add({
    id: 'vertebral-column', name: 'Vertebral column', layer: 3, system: 'skeletal',
    cuttable: false, detachable: false,
    note: 'Short and stiff — a frog has only nine presacral vertebrae plus the rod-like urostyle.', mesh: spine,
  });

  group.rotation.x = -Math.PI / 2.35;   // lay it supine (ventral up) on the tray
  return { group, parts };
}
