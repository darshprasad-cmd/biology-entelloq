/*
 * heart.js — buildHeart
 * Concatenated into one module scope with anatomy.js (the shared geometry
 * toolkit, SPECIMENS and buildSpecimen dispatcher). Uses those helpers directly.
 *
 * Built to genuine mammalian (sheep / human teaching) heart anatomy, grounded in
 * dissection references rather than a symmetric lump:
 *  - a blunt cone: broad BASE superior (great vessels emerge), tapering to an
 *    APEX that points infero-LATERALLY (down and to the anatomical left);
 *  - the LEFT ventricle a thick, firm, full cone of revolution; the RIGHT
 *    ventricle a thin crescent wrapped over the anterior-right flank, not
 *    reaching the apex (the apex is all LV);
 *  - great vessels correctly arranged: the PULMONARY TRUNK front-most, spiralling
 *    up and to the left off the RV; the AORTA immediately behind it, arching to
 *    the right with its brachiocephalic branches; SVC and IVC into the right
 *    atrium; pulmonary veins into the left atrium; the two ear-like AURICLES;
 *  - the coronary tree lying in the grooves: LAD in the anterior interventricular
 *    groove, circumflex in the left AV groove, RCA in the right AV groove to the
 *    crux, continuing as the posterior interventricular branch (right dominance),
 *    and the coronary sinus in the posterior AV groove;
 *  - internal, revealed when the LV is opened: the thick muscular interventricular
 *    SEPTUM, the bicuspid MITRAL valve on discrete CHORDAE TENDINEAE to two
 *    PAPILLARY MUSCLES, the three semilunar AORTIC CUSPS, plus the tricuspid
 *    leaflets and the moderator band in the RV.
 *
 * Coordinate convention (matches the specimen camera): +z anterior (toward the
 * viewer), -x anatomical LEFT, +x anatomical RIGHT, +y superior (base),
 * -y inferior (apex).
 */

function buildHeart(THREE) {
  const group = new THREE.Group();
  const parts = [];
  const add = (p) => {
    p.mesh.userData.partId = p.id;
    p.mesh.userData.baseColor = p.mesh.material.color.clone();
    // Guarantee valid bounds on every pickable body (see buildFrog's add()).
    if (p.mesh.geometry) { p.mesh.geometry.computeBoundingSphere(); p.mesh.geometry.computeBoundingBox(); }
    if (p.layer > 0) p.mesh.visible = false;
    group.add(p.mesh);
    parts.push(p);
    return p;
  };

  /* ---- heart-local helpers (unique names; the toolkit is reused, not redefined) ---- */

  // Revolve a profile into a ventricular wall, with organic surface noise.
  function heartWall(prof, seg, phiStart, phiLen, color, o) {
    o = o || {};
    const g = new THREE.LatheGeometry(prof, seg, phiStart, phiLen);
    displace(THREE, g, o.amp != null ? o.amp : 0.024, o.freq || 2.4, o.seed || 0);
    seal(g);
    return new THREE.Mesh(g, mat(THREE, color, {
      rough: 0.6, clear: 0.5, clearRough: 0.36, sheen: 0xff6a55, sheenAmt: 0.5, ...(o.mat || {}) }));
  }

  // Swing the lower half of a body toward -x (and slightly anterior) so the apex
  // points infero-laterally the way a real heart hangs, while the base stays put.
  function heartApexLean(geo, k, pivotY) {
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      if (v.y < pivotY) { const d = pivotY - v.y; p.setXYZ(i, v.x - k * d, v.y, v.z + k * 0.32 * d); }
    }
    return seal(geo);
  }

  // A single tensile cord between two world-space points (chordae tendineae).
  function heartCord(from, to, r0, r1, color) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const g = new THREE.CylinderGeometry(r1, r0, dir.length(), 7);
    g.computeBoundingSphere(); g.computeBoundingBox();
    const m = new THREE.Mesh(g, mat(THREE, color, { rough: 0.45, clear: 0.4, sheen: 0xfff0dc }));
    m.position.copy(from).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return m;
  }

  // A thin cupped valve leaflet / semilunar cusp (a partial sphere skirt).
  function heartLeaflet(rad, arc, color) {
    const g = new THREE.SphereGeometry(rad, 22, 14, 0, Math.PI * 2, 0, arc);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return new THREE.Mesh(g, mat(THREE, color, {
      rough: 0.38, clear: 0.55, clearRough: 0.28, side: THREE.DoubleSide, sheen: 0xfff2e6 }));
  }

  /* ---- LAYER 0 : pericardium + epicardial fat --------------------------------- */

  const peri = new THREE.Mesh(new THREE.SphereGeometry(4.0, 40, 30),
    mat(THREE, 0xdce6e0, { trans: true, opacity: 0.1, rough: 0.14, clear: 1, clearRough: 0.1,
      side: THREE.DoubleSide, transmission: 0.45, thickness: 0.3, atten: 0xdfeee8 }));
  peri.scale.set(1, 1.22, 0.95); peri.material.depthWrite = false; peri.renderOrder = 3;
  add({ id: 'pericardium', name: 'Fibrous pericardium', layer: 0, system: 'circulatory',
        cuttable: true, detachable: false, mesh: peri,
        note: 'A tough fibrous sac around the whole heart. Open it as a flap before you touch anything else.',
        incision: [[0, 3.4, 2.6], [0, 1.0, 3.2], [0, -1.4, 2.9]] });

  const fat = new THREE.Mesh(new THREE.SphereGeometry(3.35, 32, 24),
    mat(THREE, 0xe8cf8e, { trans: true, opacity: 0.24, rough: 0.85, clear: 0.3, side: THREE.DoubleSide }));
  fat.scale.set(1, 1.13, 0.92); fat.material.depthWrite = false; fat.renderOrder = 2;
  add({ id: 'epicardial-fat', name: 'Epicardial fat', layer: 0, system: 'circulatory',
        cuttable: true, detachable: true, mesh: fat,
        note: 'Pale yellow fat that fills the grooves. The coronaries run inside it — trim carefully or you will sever them.' });

  /* ---- LAYER 1 : myocardium (the specimen surface) --------------------------- */

  // Left ventricle: a full, thick-walled cone drawn to a fine apex.
  const lvProf = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const y = 3.1 - t * 6.55;                         // base 3.1  ->  apex -3.45
    let r = Math.sin(t * Math.PI * 0.92 + 0.13) * 2.46 * (1 - t * 0.10) + 0.08;
    if (t > 0.83) r *= 1 - (t - 0.83) * 4.0;          // draw the apex to a point
    lvProf.push(new THREE.Vector2(Math.max(0.05, r), y));
  }
  const lv = heartWall(lvProf, 54, 0, Math.PI * 2, 0x6e4b42, { tissue: 'muscle', amp: 0.026, seed: 1 });
  heartApexLean(lv.geometry, 0.16, 1.4);
  add({ id: 'lv-free-wall', name: 'Left ventricle — free wall', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: lv,
        note: 'Thick, firm and dark. Its wall is 3–6× the right\'s — compliance is how you tell left from right.',
        incision: [[-1.7, 1.6, 1.4], [-2.0, 0.1, 1.6], [-1.6, -1.6, 1.3]] });

  // Right ventricle: a thinner, paler crescent over the anterior-right flank,
  // stopping short of the apex (the apex belongs to the LV).
  const rvProf = [];
  for (let i = 0; i <= 22; i++) {
    const t = i / 22;
    const y = 2.9 - t * 4.75;                          // base 2.9  ->  -1.85 (no apex)
    const r = Math.sin(t * Math.PI * 0.72 + 0.34) * 2.66 * (1 - t * 0.05) + 0.1;
    rvProf.push(new THREE.Vector2(Math.max(0.05, r), y));
  }
  const rv = heartWall(rvProf, 48, -Math.PI * 0.12, Math.PI * 0.70, 0x855a4e,
    { amp: 0.02, seed: 2, mat: { rough: 0.62, side: THREE.DoubleSide } });
  heartApexLean(rv.geometry, 0.14, 1.4);
  add({ id: 'rv-free-wall', name: 'Right ventricle — free wall', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: rv,
        note: 'Thin-walled, paler and compliant, wrapped over the front-right. It only has to reach the lungs.' });
  lv.visible = true; rv.visible = true;                // the myocardium is the specimen's surface

  /* ---- LAYER 1 : atria + auricles at the base -------------------------------- */

  const ra = organ(THREE, 0x74534a, 1.15, 1.0, 1.25,
    { amp: 0.09, seed: 5, rough: 0.6, clear: 0.4, sheen: 0xc25a4e });
  ra.position.set(1.55, 3.0, -0.05);
  add({ id: 'right-atrium', name: 'Right atrium', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: ra,
        note: 'Duskier and thin-walled. It receives the venae cavae and the coronary sinus.' });

  const la = organ(THREE, 0x6d4d45, 1.1, 0.95, 1.15,
    { amp: 0.09, seed: 6, rough: 0.6, clear: 0.4, sheen: 0xb8544a });
  la.position.set(-0.95, 3.15, -1.15);
  add({ id: 'left-atrium', name: 'Left atrium', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: la,
        note: 'The most posterior chamber. Four pulmonary veins open into it from behind.' });

  const rAur = lobe(THREE, 0x8a3a34, 1.0, 0.62, 0.34,
    { amp: 0.14, seed: 7, rough: 0.62, clear: 0.35, sheen: 0xc25a4e });
  rAur.position.set(1.55, 2.95, 0.95); rAur.rotation.set(0.5, -0.4, 0.4);
  add({ id: 'right-auricle', name: 'Right auricle', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: rAur,
        note: 'The ear-like flap of the right atrium, curling forward over the aortic root.' });

  const lAur = lobe(THREE, 0x883833, 0.92, 0.55, 0.3,
    { amp: 0.14, seed: 8, rough: 0.62, clear: 0.35, sheen: 0xbe564c });
  lAur.position.set(-1.35, 3.0, 0.35); lAur.rotation.set(0.6, 0.5, -0.4);
  add({ id: 'left-auricle', name: 'Left auricle', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: lAur,
        note: 'The hooked ear-flap of the left atrium, reaching over the pulmonary trunk.' });

  /* ---- LAYER 1 : great vessels at the base ----------------------------------- */

  // Pulmonary trunk — front-most, arising from the RV outflow and spiralling up
  // and to the left, then bifurcating into left & right pulmonary arteries.
  const pulm = vessel(THREE, 0x8f7286,
    [[-0.35, 2.95, 1.0], [-0.55, 3.9, 0.9], [-0.7, 4.6, 0.35], [-0.8, 4.75, -0.2]], 0.44, 0.36,
    { rough: 0.55, clear: 0.4, sheen: 0xa88fa0, rad: 16, seg: 32 });
  [ [[-0.75, 4.75, -0.15], [-1.5, 4.9, -0.3], [-2.1, 4.7, -0.6]],   // left pulmonary a.
    [[-0.75, 4.75, -0.15], [-0.2, 5.0, -0.8], [0.4, 4.85, -1.3]] ]  // right pulmonary a.
    .forEach((bp) => pulm.add(vessel(THREE, 0x8f7286, bp, 0.26, 0.2,
      { rough: 0.55, clear: 0.4, sheen: 0xa88fa0, rad: 12, seg: 20 })));
  add({ id: 'pulmonary-trunk', name: 'Pulmonary trunk', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: pulm,
        note: 'The front-most vessel. It leaves the right ventricle, spirals around the aorta and forks to both lungs — deoxygenated, so duskier.' });

  // Aorta — immediately behind the pulmonary trunk, ascending then arching to the
  // right and back, giving off the brachiocephalic branches.
  const aorta = vessel(THREE, 0xcbb49b,
    [[-0.1, 2.9, 0.05], [-0.05, 4.05, -0.15], [0.4, 4.95, -0.35], [1.15, 4.95, -0.7], [1.7, 4.4, -0.95]], 0.42, 0.34,
    { rough: 0.5, clear: 0.5, clearRough: 0.4, sheen: 0xead8c0, rad: 16, seg: 32 });
  [ [[0.35, 4.9, -0.4], [0.4, 5.7, -0.45]],                         // brachiocephalic trunk
    [[0.75, 5.0, -0.55], [0.85, 5.75, -0.6]],                       // left common carotid
    [[1.2, 4.9, -0.7], [1.35, 5.6, -0.75]] ]                        // left subclavian
    .forEach((bp) => aorta.add(vessel(THREE, 0xcbb49b, bp, 0.14, 0.11,
      { rough: 0.5, clear: 0.5, sheen: 0xead8c0, rad: 10, seg: 12 })));
  add({ id: 'aorta', name: 'Aorta', layer: 1, system: 'circulatory', cuttable: true, detachable: false,
        mesh: aorta, note: 'Thick, pale and elastic, tucked just behind the pulmonary trunk. The coronaries arise from its root — probe it, do not eyeball it.' });

  // Superior vena cava — into the right atrium from above.
  const svc = vessel(THREE, 0x6f5566,
    [[1.75, 2.9, 0.15], [1.9, 3.9, 0.0], [1.9, 4.9, -0.2]], 0.36, 0.32,
    { rough: 0.55, clear: 0.3, sheen: 0x8a6f82, rad: 14, seg: 24 });
  add({ id: 'svc', name: 'Superior vena cava', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: svc,
        note: 'Thin-walled and dark, entering the right atrium from above beside the right auricle.' });

  // Inferior vena cava — into the right atrium from below/behind.
  const ivc = vessel(THREE, 0x6d5464,
    [[1.5, 2.5, -0.25], [1.65, 1.5, -0.55], [1.7, 0.7, -0.75]], 0.4, 0.34,
    { rough: 0.55, clear: 0.3, sheen: 0x886c80, rad: 14, seg: 22 });
  add({ id: 'ivc', name: 'Inferior vena cava', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: ivc,
        note: 'The wide, thin-walled vein returning blood from the body, opening into the floor of the right atrium.' });

  // Pulmonary veins — four short stubs into the left atrium from behind.
  const pv = vessel(THREE, 0x7a5560,
    [[-0.5, 3.55, -1.5], [-0.6, 3.35, -2.05], [-0.7, 3.15, -2.5]], 0.2, 0.17,
    { rough: 0.55, clear: 0.3, sheen: 0x986c86, rad: 12, seg: 16 });
  [ [[-1.5, 3.4, -1.4], [-1.75, 3.25, -2.0]],
    [[0.05, 3.3, -1.7], [0.15, 3.1, -2.25]],
    [[-1.55, 2.75, -1.35], [-1.85, 2.55, -1.9]] ]
    .forEach((bp) => pv.add(vessel(THREE, 0x7a5560, bp, 0.19, 0.15,
      { rough: 0.55, clear: 0.3, sheen: 0x986c86, rad: 10, seg: 12 })));
  add({ id: 'pulmonary-veins', name: 'Pulmonary veins', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: pv,
        note: 'Four veins returning oxygenated blood from the lungs to the left atrium — the only veins that carry oxygenated blood.' });

  /* ---- LAYER 1 : coronary tree in the grooves -------------------------------- */

  const cors = [
    ['lad', 'Left anterior descending artery',
      [[-0.15, 2.9, 1.75], [-0.35, 1.6, 2.05], [-0.5, 0.2, 1.95], [-0.62, -1.2, 1.5], [-0.55, -2.5, 0.85]],
      [[[-0.42, 0.8, 2.02], [0.2, 0.55, 2.05], [0.75, 0.4, 1.75]],   // diagonal branch
       [[-0.55, -0.7, 1.75], [-1.05, -1.0, 1.35]]]],                 // second diagonal
    ['rca', 'Right coronary artery',
      [[0.7, 2.85, 1.35], [1.7, 2.15, 0.5], [2.05, 1.2, -0.7], [1.6, 0.4, -1.6], [0.6, -0.05, -2.0]],
      [[[1.95, 1.5, -0.05], [2.25, 0.9, 0.25]]]],                    // right marginal branch
    ['circumflex', 'Circumflex artery',
      [[-0.85, 2.9, 1.3], [-1.8, 2.25, 0.4], [-2.05, 1.3, -0.85], [-1.4, 0.6, -1.8]],
      [[[-2.0, 1.55, -0.55], [-2.25, 0.95, -0.95]]]],                // obtuse marginal branch
    ['posterior-iv-branch', 'Posterior interventricular branch',
      [[0.6, -0.05, -2.0], [0.25, -1.1, -1.7], [-0.05, -2.25, -1.1]],
      null],
  ];
  cors.forEach(([cid, nm, pts, branches]) => {
    const m = tube(THREE, 0xd4564a, pts, 0.085, { rough: 0.5, clear: 0.5, sheen: 0xe87868, rad: 8, seg: 48 });
    // Branch tubes are built in the same (group) space as the trunk and attached
    // as CHILDREN of the trunk mesh, which sits at the origin with an identity
    // transform. That keeps them geometrically correct AND makes them inherit the
    // trunk's visibility, so revealLayer(1) shows the whole vessel at once.
    (branches || []).forEach((bp) => {
      m.add(tube(THREE, 0xd4564a, bp, 0.055, { rough: 0.5, clear: 0.5, sheen: 0xe87868, rad: 6, seg: 16 }));
    });
    const note = cid === 'posterior-iv-branch'
      ? 'Runs in the posterior interventricular groove from the crux to the apex. Here it springs from the RCA — this heart is right-dominant.'
      : cid === 'rca'
        ? 'Runs in the right AV groove to the crux of the heart, then continues as the posterior interventricular branch.'
        : cid === 'circumflex'
          ? 'Runs in the left AV groove, curving round to the back. Buried in epicardial fat until you trim it.'
          : 'Runs in the anterior interventricular groove toward the apex. Buried in epicardial fat until you trim it.';
    add({ id: cid, name: nm, layer: 1, system: 'circulatory', cuttable: true, detachable: false,
          mesh: m, note });
  });

  // Coronary sinus — the great cardiac vein in the posterior AV groove, draining
  // into the right atrium. Wider and darker than the arteries.
  const csinus = tube(THREE, 0x5a4a6a,
    [[-1.35, 0.6, -1.8], [-0.4, 0.35, -2.15], [0.6, 0.25, -1.95], [1.4, 0.55, -1.15]], 0.13,
    { rough: 0.55, clear: 0.3, sheen: 0x7a6a8a, rad: 10, seg: 36 });
  add({ id: 'coronary-sinus', name: 'Coronary sinus', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: csinus,
        note: 'The wide venous channel in the posterior AV groove that collects cardiac veins and empties into the right atrium.' });

  /* ---- LAYER 2 : internal structures, revealed when the LV is opened --------- */

  // Interventricular septum — a thick, complete muscular wall. Its concave face
  // (toward -x) forms the medial wall of the LV cavity; it bulges toward the RV.
  const sep = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.1, 4.9, 40, 1, true, Math.PI * 0.60, Math.PI * 0.80),
    mat(THREE, 0x8f3330, { side: THREE.DoubleSide, rough: 0.62, clear: 0.4, sheen: 0xd05a50 }));
  sep.position.set(0.2, 0.1, -0.05);
  add({ id: 'septum', name: 'Interventricular septum', layer: 2, system: 'circulatory',
        cuttable: false, detachable: false, mesh: sep,
        note: 'Thick, muscular and complete — no blood crosses it in a normal heart. The probe will not pass through.' });

  // Two papillary muscles projecting from the LV wall, tips toward the valve.
  const papA = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.25, 16),
    mat(THREE, 0x8a3a38, { rough: 0.55, clear: 0.4, sheen: 0xc85a50 }));
  papA.position.set(-1.15, -1.45, 0.35); papA.rotation.set(-0.28, 0, 0.18);
  add({ id: 'papillary-a', name: 'Anterolateral papillary muscle', layer: 2, system: 'circulatory',
        cuttable: true, detachable: false, mesh: papA,
        note: 'Pull it — the anterior mitral leaflet should tense through its chordae, not evert.' });

  const papB = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.15, 16),
    mat(THREE, 0x8a3a38, { rough: 0.55, clear: 0.4, sheen: 0xc85a50 }));
  papB.position.set(-0.95, -1.45, -0.55); papB.rotation.set(0.28, 0, 0.16);
  add({ id: 'papillary-b', name: 'Posteromedial papillary muscle', layer: 2, system: 'circulatory',
        cuttable: true, detachable: false, mesh: papB,
        note: 'The second mitral papillary muscle. Both anchor chordae from both leaflets, so a leaflet is never held by one muscle alone.' });

  // Mitral (bicuspid) valve — larger anterior leaflet as the pickable body, with
  // the smaller posterior leaflet as a decorative child.
  const mitral = heartLeaflet(0.9, Math.PI * 0.44, 0xf0e4d2);
  mitral.position.set(-0.72, 0.92, 0.05); mitral.rotation.set(Math.PI - 0.25, 0, 0.1);
  childMesh(mitral, heartLeaflet(0.66, Math.PI * 0.4, 0xf0e4d2), 0.05, -0.05, -0.55, 0.5, 0, 0);
  add({ id: 'mitral-leaflet', name: 'Mitral (bicuspid) valve', layer: 2, system: 'circulatory',
        cuttable: true, detachable: false, mesh: mitral,
        note: 'Two leaflets between left atrium and left ventricle. Held shut by the chordae; without them it everts into the atrium.' });

  // Chordae tendineae — five discrete cords: three from the anterolateral muscle,
  // two from the posteromedial, fanning to the leaflet free edges.
  const papATip = new THREE.Vector3(-1.02, -0.32, 0.28);
  const papBTip = new THREE.Vector3(-0.86, -0.35, -0.5);
  const chordaeTargets = [
    [papATip, new THREE.Vector3(-0.42, 0.5, 0.42)],
    [papATip, new THREE.Vector3(-0.72, 0.55, 0.2)],
    [papATip, new THREE.Vector3(-1.02, 0.5, -0.02)],
    [papBTip, new THREE.Vector3(-0.55, 0.5, -0.42)],
    [papBTip, new THREE.Vector3(-0.92, 0.5, -0.55)],
  ];
  chordaeTargets.forEach(([from, to], i) => {
    const m = heartCord(from, to, 0.036, 0.024, 0xe8dcc8);
    add({ id: 'chordae-' + (i + 1), name: 'Chordae tendineae — group ' + (i + 1), layer: 2,
          system: 'circulatory', cuttable: true, detachable: false, mesh: m,
          note: 'A tensile "heart-string" from a papillary muscle to a valve edge. Cutting it is irreversible and the valve will not hold.' });
  });

  // Aortic valve — three semilunar cusps at the aortic root, cupped upward.
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + 0.4;
    const m = heartLeaflet(0.34, Math.PI * 0.5, 0xf2e8da);
    m.position.set(-0.1 + Math.cos(a) * 0.3, 2.86, 0.02 + Math.sin(a) * 0.3);
    m.rotation.set(Math.PI, 0, 0);
    add({ id: 'aortic-cusp-' + (i + 1), name: 'Aortic semilunar cusp ' + (i + 1), layer: 2,
          system: 'circulatory', cuttable: true, detachable: false, mesh: m,
          note: 'One of three pocket-like cusps at the aortic root. Nick it and the water test runs straight back through.' });
  }

  // Tricuspid valve — three leaflets between right atrium and right ventricle.
  // One leaflet is the pickable body; the other two are decorative children.
  const tri = heartLeaflet(0.72, Math.PI * 0.42, 0xf0e4d2);
  tri.position.set(1.15, 0.95, 0.25); tri.rotation.set(Math.PI - 0.15, 0, -0.2);
  childMesh(tri, heartLeaflet(0.6, Math.PI * 0.4, 0xf0e4d2), 0.15, -0.05, -0.5, 0.45, 0, 0);
  childMesh(tri, heartLeaflet(0.58, Math.PI * 0.4, 0xf0e4d2), -0.5, -0.05, 0.2, 0, 0, -0.5);
  add({ id: 'tricuspid-leaflet', name: 'Tricuspid valve', layer: 2, system: 'circulatory',
        cuttable: true, detachable: false, mesh: tri,
        note: 'Three leaflets guard the right AV opening — one more than the mitral, the classic way to tell right from left inside.' });

  // Moderator band — the muscular strut across the RV cavity carrying the right
  // bundle branch, from the septum to the base of the anterior papillary muscle.
  const modBand = heartCord(
    new THREE.Vector3(0.55, -0.9, -0.1), new THREE.Vector3(1.45, -1.05, 0.65), 0.11, 0.11, 0x9a4038);
  add({ id: 'moderator-band', name: 'Moderator band', layer: 2, system: 'circulatory',
        cuttable: true, detachable: false, mesh: modBand,
        note: 'A muscular band spanning the right ventricle, carrying part of the conduction system to the anterior papillary muscle.' });

  group.position.y = 0.3;
  group.scale.setScalar(0.9);
  return { group, parts };
}
