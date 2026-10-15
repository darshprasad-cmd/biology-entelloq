/*
 * heart.js — buildHeart
 * Concatenated into one module scope with anatomy.js (the shared geometry
 * toolkit, SPECIMENS and buildSpecimen dispatcher). Uses those helpers directly.
 *
 * Generalized mammalian teaching heart with illustrative human arch branches.
 * This is not a species-validated sheep reconstruction; see ANATOMY.md.
 * Its authored relationships include:
 *  - a blunt cone: broad BASE superior (great vessels emerge), tapering to an
 *    APEX that points infero-LATERALLY (down and to the anatomical left);
 *  - the LEFT ventricle a thick, firm, full cone of revolution; the RIGHT
 *    ventricle a thin crescent wrapped over the anterior-right flank, not
 *    reaching the apex (the apex is all LV);
 *  - great vessels correctly arranged: the PULMONARY TRUNK front-most, spiralling
 *    up and to the left off the RV; the AORTA immediately behind it, arching to
 *    the anatomical left with illustrative human-pattern branches; SVC and IVC into the right
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

// One authored outer profile is shared by the ventricular walls and their
// adherent membrane. These are relative model coordinates, not patient data.
function HEART_radius(y) {
  const stations = [[-3.55, 0], [-3.35, .24], [-2.8, .72], [-2.0, 1.30],
    [-1.0, 1.84], [0, 2.18], [1.1, 2.36], [1.9, 2.20], [2.6, 1.62], [3.15, .66], [3.4, 0]];
  if (y <= stations[0][0] || y >= stations.at(-1)[0]) return 0;
  let i = 1; while (y > stations[i][0]) i++;
  const a = stations[i - 1], b = stations[i], t = (y - a[0]) / (b[0] - a[0]);
  // Cubic Hermite interpolation with centred, bounded tangents avoids terraces.
  const prev = stations[Math.max(0, i - 2)], next = stations[Math.min(stations.length - 1, i + 1)];
  const m0 = (b[1] - prev[1]) / (b[0] - prev[0]), m1 = (next[1] - a[1]) / (next[0] - a[0]);
  return Math.max(0, (2*t*t*t-3*t*t+1)*a[1] + (t*t*t-2*t*t+t)*(b[0]-a[0])*m0
    + (-2*t*t*t+3*t*t)*b[1] + (t*t*t-t*t)*(b[0]-a[0])*m1);
}

function HEART_surfacePoint(THREE, y, phi, right = false, envelope = false) {
  let radius = HEART_radius(y);
  const lo = -.12 * Math.PI, hi = .58 * Math.PI;
  const edge = Math.max(0, Math.min(1, (phi-lo)/.34, (hi-phi)/.34));
  const ends = smooth(Math.max(0, Math.min(1, (y+1.85)/.65, (2.9-y)/.55)));
  const rightOffset = .465 * smooth(edge) * ends - .065;
  if (right) radius += envelope ? Math.max(0, rightOffset) : rightOffset;
  // Anterior interventricular furrow and a flatter posterior face distinguish
  // the oblique ventricular mass from an ellipsoid with a second bowl on top.
  const groovePhi = -.20 + (1.5-y)*.025;
  const groove = Math.exp(-Math.pow((phi-groovePhi)/.09, 2))
    * smooth(Math.max(0, Math.min(1, (y+3.2)/.7, (2.65-y)/.5)));
  radius *= 1 - .045 * groove;
  const lean = Math.max(0, 1.4-y)*.16;
  const x = Math.sin(phi)*radius - lean;
  const z = Math.cos(phi)*radius*(Math.cos(phi) >= 0 ? .87 : .75) + lean*.32;
  return new THREE.Vector3(x, y, z);
}

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
    // Only the closed ventricular wall has a UV seam rather than a free edge.
    // Keep both UV vertices, but share the lighting normal after deformation.
    if (Math.abs(phiLen - Math.PI * 2) < 1e-8) g.userData.smoothClosedLathe = true;
    // Our ventricular profiles run from base to apex (descending Y), opposite
    // LatheGeometry's outward winding. Reverse faces, not the authored points:
    // shape, displacement, UVs and transforms stay exact, while the front wall
    // becomes the visible/pickable surface instead of the far inner wall.
    if (prof.length > 1 && prof[0].y > prof[prof.length - 1].y) {
      const indices = g.index.array;
      for (let i = 0; i < indices.length; i += 3) {
        const second = indices[i + 1]; indices[i + 1] = indices[i + 2]; indices[i + 2] = second;
      }
      g.index.needsUpdate = true;
    }
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const phi = Math.atan2(pos.getX(i), pos.getZ(i));
      const y = pos.getY(i);
      const right = phi >= -.12*Math.PI-1e-6 && phi <= .58*Math.PI+1e-6 && y >= -1.85-1e-6 && y <= 2.9+1e-6;
      const v = HEART_surfacePoint(THREE, y, phi, right, true);
      const grain = (vnoise(v.x*3.1+2, v.y*2.8, v.z*3.1)-.5)*.018;
      pos.setXYZ(i, v.x + Math.sin(phi)*grain, v.y, v.z + Math.cos(phi)*grain);
    }
    seal(g);
    return new THREE.Mesh(g, mat(THREE, color, {
      rough: 0.67, clear: 0.16, clearRough: 0.48, transmission: 0,
      sheen: 0xb99a8a, sheenAmt: 0.20, ...(o.mat || {}) }));
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

  // Spatial pigment belongs to the actual cuttable wall, not a decorative shell.
  // Three-dimensional fields keep duplicate UV seam vertices the same colour.
  // Muted variation is an art-directed preserved-tissue cue, not a histology map
  // or an assertion about a particular fixative, disease or blood oxygenation.
  function heartTissuePigment(mesh, fatty = false) {
    const g = mesh.geometry, p = g.attributes.position;
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const broad = vnoise(x * 1.9 + 2.7, y * 1.6 - 1.4, z * 1.8 + 4.1);
      const fine = vnoise(x * 8.3 - 3.2, y * 7.9 + 6.1, z * 8.1 - 1.7);
      const strands = 0.5 + 0.5 * Math.sin(y * 21 + x * 5 + z * 3 + broad * 2);
      const shade = fatty ? 0.81 + broad * 0.16 + fine * 0.03
        : 0.56 + broad * 0.36 + fine * 0.06 + strands * 0.02;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = shade * (fatty ? 0.96 + fine * 0.04 : 0.93 + fine * 0.06);
      colors[i * 3 + 2] = shade * (fatty ? 0.85 + broad * 0.10 : 0.90 + broad * 0.08);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    mesh.material.vertexColors = true;
    mesh.material.needsUpdate = true;
    mesh.userData.tissuePigment = fatty ? 'lobulated-fat' : 'preserved-myocardium';
    mesh.userData.spatialPigment = true;
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
    mat(THREE, 0xe4cfbc, { trans: true, opacity: 0.065, rough: 0.32, clear: 0.18, clearRough: 0.35,
      side: THREE.DoubleSide, transmission: 0, noTex: true }));
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
  for (let i = 0; i <= 48; i++) {
    const y = 3.15 - i / 48 * 6.65;
    lvProf.push(new THREE.Vector2(Math.max(.025, HEART_radius(y)), y));
  }

  function foldAuricle(mesh, side) {
    const p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
      const tip = Math.max(0, side*x);
      const crease = Math.sin(x*9 + y*3) * .035 * Math.max(0, 1-Math.abs(y)/.7);
      p.setXYZ(i, x, y + tip*tip*.28, z*.76 + tip*tip*.30 + crease);
    }
    seal(mesh.geometry);
  }
  // Both walls meet on the same sampled boundary. The LV does not remain a
  // closed second shell beneath the anterior RV patch: that caused a hard
  // overlapping lip and self-shadow in the original intact model.
  for (const y of [2.9, -1.85]) lvProf.push(new THREE.Vector2(HEART_radius(y), y));
  lvProf.sort((a,b)=>b.y-a.y);
  const lv = heartWall(lvProf, 80, -1.12*Math.PI, Math.PI * 2, 0x9c7b6d, { tissue: 'muscle' });
  const lvIndices = [], lvRows = lvProf.length;
  for (let i=0; i<lv.geometry.index.count; i+=3) {
    const tri=[lv.geometry.index.getX(i),lv.geometry.index.getX(i+1),lv.geometry.index.getX(i+2)];
    const columns=tri.map(index=>Math.floor(index/lvRows));
    const y=tri.reduce((sum,index)=>sum+lvProf[index%lvRows].y,0)/3;
    if(Math.min(...columns)>=40 && Math.max(...columns)<=68 && y> -1.85 && y<2.9) continue;
    lvIndices.push(...tri);
  }
  lv.geometry.setIndex(lvIndices); seal(lv.geometry);
  add({ id: 'lv-free-wall', name: 'Left ventricle — free wall', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: lv,
        note: 'Thick, firm and dark. Its wall is 3–6× the right\'s — compliance is how you tell left from right.',
        incision: [[-1.7, 1.6, 1.4], [-2.0, 0.1, 1.6], [-1.6, -1.6, 1.3]] });

  // Right ventricle: a thinner, paler crescent over the anterior-right flank,
  // stopping short of the apex (the apex belongs to the LV).
  const rvProf = lvProf.filter(p=>p.y<=2.9 && p.y>=-1.85).map(p=>p.clone());
  const rv = heartWall(rvProf, 28, -Math.PI * 0.12, Math.PI * 0.70, 0x9c7b6d,
    { right: true, mat: { rough: 0.66, side: THREE.DoubleSide } });
  const wallSeams = new Map();
  for (const wall of [lv,rv]) {
    wall.userData.exteriorDetail='joined-ventricular-wall';
    wall.userData.sharedTissueBoundary='ventricular';
    const p=wall.geometry.attributes.position,n=wall.geometry.attributes.normal;
    const used=new Set(wall.geometry.index.array);
    for(let i=0;i<p.count;i++) {
      if(!used.has(i)) continue;
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');
      if(!wallSeams.has(key)) wallSeams.set(key,[]);
      wallSeams.get(key).push({wall,n,i});
    }
  }
  for(const matches of wallSeams.values()) {
    if(new Set(matches.map(v=>v.wall)).size<2) continue;
    const normal=new THREE.Vector3();
    matches.forEach(({n,i})=>normal.add(new THREE.Vector3().fromBufferAttribute(n,i)));
    normal.normalize(); matches.forEach(({n,i})=>n.setXYZ(i,normal.x,normal.y,normal.z));
  }
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
  foldAuricle(rAur, -1);
  add({ id: 'right-auricle', name: 'Right auricle', layer: 1, system: 'circulatory',
        cuttable: true, detachable: false, mesh: rAur,
        note: 'The ear-like flap of the right atrium, curling forward over the aortic root.' });

  const lAur = lobe(THREE, 0x883833, 0.92, 0.55, 0.3,
    { amp: 0.14, seed: 8, rough: 0.62, clear: 0.35, sheen: 0xbe564c });
  lAur.position.set(-1.35, 3.0, 0.35); lAur.rotation.set(0.6, 0.5, -0.4);
  foldAuricle(lAur, 1);
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
  // anatomical LEFT (-x) and back. The three branches illustrate the human
  // pattern, not every mammalian species; the brachiocephalic trunk heads right.
  const aorta = vessel(THREE, 0xcbb49b,
    [[-0.1, 2.9, 0.05], [-0.05, 4.05, -0.15], [-0.4, 4.95, -0.35], [-1.15, 4.95, -0.7], [-1.7, 4.4, -0.95]], 0.42, 0.34,
    { rough: 0.5, clear: 0.5, clearRough: 0.4, sheen: 0xead8c0, rad: 16, seg: 32 });
  [ [[-0.35, 4.9, -0.4], [0.4, 5.7, -0.45]],                        // brachiocephalic trunk
    [[-0.75, 5.0, -0.55], [-0.85, 5.75, -0.6]],                    // left common carotid
    [[-1.2, 4.9, -0.7], [-1.35, 5.6, -0.75]] ]                     // left subclavian
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

  function cardiacSurfacePath(points, lift = .018) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    return Array.from({length: 33}, (_, i) => {
      const p = curve.getPoint(i/32), lean = Math.max(0, 1.4-p.y)*.16;
      const phi = Math.atan2(p.x+lean, p.z-lean*.32);
      const front = phi > -.12*Math.PI && phi < .58*Math.PI && p.y >= -1.85 && p.y <= 2.9;
      return HEART_surfacePoint(THREE, p.y, phi, front, true)
        .add(new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi)).multiplyScalar(lift)).toArray();
    });
  }

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
    const m = tube(THREE, 0x846651, cardiacSurfacePath(pts), 0.055,
      { rough: 0.63, clear: 0.16, transmission: 0, sheen: 0xb68a72, rad: 8, seg: 64 });
    // Branch tubes are built in the same (group) space as the trunk and attached
    // as CHILDREN of the trunk mesh, which sits at the origin with an identity
    // transform. That keeps them geometrically correct AND makes them inherit the
    // trunk's visibility, so revealLayer(1) shows the whole vessel at once.
    (branches || []).forEach((bp) => {
      m.add(tube(THREE, 0x846651, cardiacSurfacePath(bp, .012), 0.029,
        { rough: 0.63, clear: 0.16, transmission: 0, sheen: 0xb68a72, rad: 6, seg: 32 }));
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
    cardiacSurfacePath([[-1.35, 0.6, -1.8], [-0.4, 0.35, -2.15], [0.6, 0.25, -1.95], [1.4, 0.55, -1.15]], .04), 0.13,
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
  // Keep the septal attachment/descriptor, but fit its distal muscle inside the
  // revised ventricular mass; the old straight cylinder pierced the tapered wall.
  const septalPos = sep.geometry.attributes.position;
  for (let i=0; i<septalPos.count; i++) {
    const y=septalPos.getY(i)+sep.position.y, lean=Math.max(0,1.4-y)*.16;
    let x=septalPos.getX(i)+sep.position.x+lean;
    let z=septalPos.getZ(i)+sep.position.z-lean*.32;
    const radial=Math.hypot(x,z/(z>=0?.87:.75));
    const factor=Math.min(1,HEART_radius(y)*.88/Math.max(.001,radial));
    x*=factor; z*=factor;
    septalPos.setXYZ(i,x-lean-sep.position.x,y-sep.position.y,z+lean*.32-sep.position.z);
  }
  seal(sep.geometry);
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

  /* Exterior preparation. Keep every internal anchor and part ID, but replace
   * the spherical outer veils with a conforming sac and localized fatty tissue.
   * This is an authored visual approximation, not a measured preserved specimen. */
  const radialAt = (profile, y) => {
    if (y >= profile[0].y) return profile[0].x;
    for (let i = 1; i < profile.length; i++) if (y >= profile[i].y) {
      const a = profile[i - 1], b = profile[i], t = (a.y - y) / (a.y - b.y);
      return a.x + (b.x - a.x) * t;
    }
    return profile[profile.length - 1].x;
  };
  function envelopeRadius(y, phi) {
    let r = radialAt(lvProf, y);
    const lo = -Math.PI * .12, hi = Math.PI * .58;
    const band = Math.max(0, Math.min(1, (phi - lo) / .20, (hi - phi) / .20));
    if (y >= -1.85 && y <= 2.9) r = Math.max(r, radialAt(rvProf, y) * smooth(band));
    // Round over the atrial base, then close the sac at the vessel roots.
    if (y > 2.0) r = Math.max(r, 2.7 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 2.0) / 2.25, 2))));
    if (y > 3.9) r *= Math.sqrt(Math.max(0, (4.25 - y) / .35));
    if (y < -3.35) r *= Math.sqrt(Math.max(0, (y + 3.6) / .25));
    return r;
  }
  const sac = new THREE.SphereGeometry(1, 48, 36), sp = sac.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const y = .325 + sp.getY(i) * 3.925, phi = Math.atan2(sp.getX(i), sp.getZ(i));
    const r = envelopeRadius(y, phi) * 1.035;
    const point = HEART_surfacePoint(THREE, y, phi, y>=-1.85 && y<=2.9 && phi>-.12*Math.PI && phi<.58*Math.PI, true);
    const atrial = Math.max(0, r - HEART_radius(y)) * smooth(Math.max(0,Math.min(1,(y-1.8)/1.0)));
    const margin = HEART_radius(y) > .02 || atrial > .02 ? .09 : 0;
    sp.setXYZ(i, point.x + Math.sin(phi)*(margin+atrial), y / peri.scale.y,
      (point.z + Math.cos(phi)*(margin+atrial*.85)) / peri.scale.z);
  }
  seal(sac); peri.geometry.dispose(); peri.geometry = sac;
  peri.userData.exteriorDetail = 'conforming-sac';

  // Several irregular pads share one pickable fat mesh: no transparent ball
  // wrapped around the heart, and forceps still removes the original fat ID.
  const fatPositions = [], fatNormals = [], fatUvs = [], fatIndices = [];
  group.updateMatrixWorld(true);
  const fatRay = new THREE.Raycaster(), fatHosts = [lv, rv, ra, la, rAur, lAur];
  for (const [y0, y1, phi0, phi1, radius] of [
    [2.9, 1.1, -.95, -1.3, .17], [2.85, 1.35, .55, 1.45, .18],
    [2.6, .45, -.1, -.2, .13], [3.0, 2.3, -1.0, .75, .19],
  ]) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, y = y0 + (y1 - y0) * t, phi = phi0 + (phi1 - phi0) * t;
      const lean = Math.max(0, 1.4 - y) * .155;
      const out = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
      const start = new THREE.Vector3(-lean, y, lean * .32).addScaledVector(out, 12);
      fatRay.set(start, out.clone().negate());
      const hit = fatRay.intersectObjects(fatHosts, false)[0];
      if (hit) pts.push(hit.point.clone().addScaledVector(out, radius * .12));
      else pts.push(new THREE.Vector3(-lean, y, lean * .32).addScaledVector(out, envelopeRadius(y, phi)));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 44, radius, 12, false);
    const pos = g.attributes.position, normal = g.attributes.normal, uv = g.attributes.uv, offset = fatPositions.length / 3;
    for (let i = 0; i < pos.count; i++) {
      // Flattened, irregular pads follow the sampled myocardium. Correlated
      // radius variation avoids the old uniformly round cable appearance.
      // Ends taper into the host instead of finishing as an abrupt pipe stump.
      const t = uv.getX(i), centre = g.parameters.path.getPointAt(t);
      const offsetV = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(centre);
      const phi = phi0 + (phi1 - phi0) * t;
      const outward = new THREE.Vector3(Math.sin(phi), 0, Math.cos(phi));
      const relief = offsetV.dot(outward);
      offsetV.addScaledVector(outward, -relief * 0.40);
      const lobulation = 0.87 + 0.15 * Math.sin(t * 37 + y0)
        + 0.09 * Math.sin(t * 79 + phi0 * 3);
      const shoulder = 0.42 + 0.58 * Math.pow(Math.sin(Math.PI * t), 0.35);
      offsetV.multiplyScalar(lobulation * shoulder);
      const finalV = centre.add(offsetV);
      const bulge = .007 * Math.sin(finalV.x * 25 + finalV.y * 17)
        * Math.cos(finalV.z * 21 + finalV.y * 13);
      fatPositions.push((finalV.x + normal.getX(i) * bulge) / fat.scale.x,
        (finalV.y + normal.getY(i) * bulge) / fat.scale.y,
        (finalV.z + normal.getZ(i) * bulge) / fat.scale.z);
      fatNormals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
      fatUvs.push(uv.getX(i), uv.getY(i));
    }
    for (const index of g.index.array) fatIndices.push(index + offset);
    g.dispose();
  }
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(fatPositions, 3));
  fg.setAttribute('normal', new THREE.Float32BufferAttribute(fatNormals, 3));
  fg.setAttribute('uv', new THREE.Float32BufferAttribute(fatUvs, 2));
  fg.setIndex(fatIndices); seal(fg); fat.geometry.dispose(); fat.geometry = fg;
  fat.material.opacity = 1; fat.material.transparent = false; fat.material.depthWrite = true;
  fat.material.transmission = 0; fat.material.color.setHex(0xdbc493);
  fat.userData.exteriorDetail = 'localized-fat';
  heartTissuePigment(fat, true);
  [lv, rv, ra, la, rAur, lAur].forEach(mesh => heartTissuePigment(mesh));

  // A visible vessel stump needs a wall and a dark lumen, not an infinitely
  // thin open polygon. Collars are children of their real vessel, never parts.
  for (const p of parts.filter(p => /^(aorta|pulmonary-trunk|svc|ivc|pulmonary-veins)$/.test(p.id))) {
    const stems = []; p.mesh.traverse(m => { if (m.isMesh && m.geometry.parameters?.path) stems.push(m); });
    for (const stem of stems) {
      const g = stem.geometry, prm = g.parameters, end = prm.path.getPointAt(1), axis = prm.path.getTangentAt(1);
      const v = new THREE.Vector3().fromBufferAttribute(g.attributes.position, g.attributes.position.count - 1);
      const r = v.distanceTo(end); if (!Number.isFinite(r) || r < .06) continue;
      const collar = new THREE.Mesh(new THREE.RingGeometry(r * .73, r * 1.01, 24),
        mat(THREE, 0xbd8a70, { rough: .46, clear: .18, side: THREE.DoubleSide, transmission: 0, noTex: true }));
      collar.position.copy(end); collar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);
      collar.userData.exteriorDetail = 'vessel-rim'; stem.add(collar);
      const inner = new THREE.Mesh(new THREE.CylinderGeometry(r * .73, r * .68, r * .8, 20, 1, true),
        mat(THREE, 0x542d2a, { rough: .60, clear: .12, side: THREE.DoubleSide, transmission: 0, noTex: true }));
      inner.position.copy(end).addScaledVector(axis, -r * .4);
      inner.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
      inner.userData.exteriorDetail = 'vessel-lumen'; stem.add(inner);
    }
  }
  // Surface anatomy can be seen through the prepared sac, but the dissection
  // picker still gates access by layer. Internal valves/chordae stay hidden.
  parts.forEach(p => { if (p.layer === 1) p.mesh.visible = true; });

  // Rest on the posterior surface, with the anterior face (+z locally) up.
  // One whole-specimen transform preserves every vessel/valve relationship.
  group.rotation.x = -Math.PI / 2;
  group.scale.setScalar(0.9);
  return { group, parts };
}
