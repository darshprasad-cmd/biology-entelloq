/*
 * stage_body.js — the ORGAN (a beating heart) and the TISSUE it is built from.
 *
 * Both were rebuilt for realism. The heart is no longer two squashed spheres: it
 * is a real cardiac silhouette — a tapered mass drawn down to an apex, pinched by
 * the interventricular groove the coronary artery actually sits in, then displaced
 * so no surface is mathematically smooth, and finished in a wet clearcoated
 * material that catches the rim light the way live muscle does. The tissue uses
 * the same treatment at cell scale, and both beat on one shared cardiac phase so
 * the two magnifications are visibly the same organ.
 */

/* A cardiac silhouette from a sphere: taper to an apex, deepen the septal groove. */
function BODY_heartGeo(THREE, KIT) {
  const g = new THREE.SphereGeometry(1, 72, 52);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = (y + 1) / 2;                       // 0 at the apex, 1 at the base
    const taper = Math.pow(Math.max(0, t), 0.6); // narrow below, full above
    x *= 0.55 + 0.60 * taper;
    z *= 0.52 + 0.55 * taper;
    y = y * 1.18 - 0.10;
    // the interventricular groove — a real anterior furrow, not a paint line
    const across = (x * 0.92 + z * 0.38);
    const groove = Math.exp(-Math.pow(across / 0.26, 2)) * 0.11 * (1 - Math.abs(y) * 0.35);
    const len = Math.hypot(x, z) || 1;
    x -= (x / len) * groove; z -= (z / len) * groove;
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
  KIT.displace(g, 0.022, 3.4, 2);               // organic irregularity
  return g;
}

UNI.register('organ', ({ THREE, KIT, meta }) => {
  const root = KIT.group(); const H = KIT.HEX; const heart = KIT.group(); root.add(heart);
  heart.rotation.z = 0.16;

  const myoMat = KIT.wet(0x93362c, { rough: 0.5, clear: 0.7, glow: 0.1, bump: 0.02, seed: 3,
    sheenColor: 0xff8f7a });
  const body = new THREE.Mesh(BODY_heartGeo(THREE, KIT), myoMat);
  body.scale.setScalar(0.78); heart.add(body);

  // atria: softer, duskier masses seated on the base
  const atrMat = KIT.wet(0x6f2a26, { rough: 0.58, clear: 0.5, glow: 0.08, seed: 7 });
  function atrium(x, z, s) {
    const a = new THREE.Mesh(KIT.displace(new THREE.SphereGeometry(1, 40, 28), 0.05, 3.0, x * 10), atrMat);
    a.scale.set(0.30 * s, 0.24 * s, 0.27 * s); a.position.set(x, 0.62, z); heart.add(a); return a;
  }
  const la = atrium(-0.30, -0.06, 1), ra = atrium(0.32, 0.06, 1.05);

  // great vessels — thicker, tapered, and actually rooted in the base
  const aortaMat = KIT.wet(0xbf6a58, { rough: 0.45, clear: 0.55, seed: 11 });
  const paMat = KIT.wet(0x4f6f9e, { rough: 0.45, clear: 0.55, seed: 13 });
  const aorta = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.06, 0.55, 0.02), new THREE.Vector3(-0.02, 0.95, -0.08),
    new THREE.Vector3(-0.24, 1.22, -0.04), new THREE.Vector3(-0.56, 1.10, 0.04)]), 60, 0.115, 16, false), aortaMat);
  heart.add(aorta);
  heart.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.18, 0.56, 0.10), new THREE.Vector3(0.34, 1.00, 0.02),
    new THREE.Vector3(0.58, 1.14, -0.06)]), 44, 0.095, 14, false), paMat));
  // venae cavae behind
  heart.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.40, 0.78, -0.10), new THREE.Vector3(0.58, 1.02, -0.26)]), 24, 0.07, 12, false), paMat));

  // coronary arteries laid INTO the groove, branching as real vessels do
  const coroMat = KIT.wet(0xd8543f, { rough: 0.4, clear: 0.7, glow: 0.35, seed: 17 });
  const coroMain = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.04, 0.50, 0.40), new THREE.Vector3(-0.16, 0.16, 0.44),
    new THREE.Vector3(-0.14, -0.22, 0.38), new THREE.Vector3(-0.02, -0.52, 0.26)]);
  heart.add(new THREE.Mesh(new THREE.TubeGeometry(coroMain, 60, 0.021, 10, false), coroMat));
  [[0.12, 0.30], [0.02, -0.06], [-0.06, -0.34]].forEach(([sx, sy], i) => {
    heart.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx - 0.16, sy, 0.42), new THREE.Vector3(sx + 0.10, sy - 0.05, 0.40),
      new THREE.Vector3(sx + 0.30, sy - 0.14, 0.30)]), 30, 0.012 - i * 0.001, 8, false), coroMat));
  });

  // a faint pericardial sheen so the organ sits in something, not in a void
  const peri = new THREE.Mesh(new THREE.SphereGeometry(1.02, 32, 24),
    KIT.glassy(0xbfe4ff, { opacity: 0.05, glow: 0.02 }));
  peri.scale.set(0.86, 1.02, 0.84); peri.position.y = -0.04; heart.add(peri);

  const valve = KIT.sphere(0.055, 16, KIT.emissive(H.amber, { glow: 0.6 }));
  valve.position.set(0.0, 0.30, 0.22); heart.add(valve);

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'organ-atrium', get: (v) => la.getWorldPosition(v), meta: HS.atrium },
    { id: 'organ-ventricle', get: (v) => body.getWorldPosition(v), meta: HS.ventricle },
    { id: 'organ-valve', get: (v) => valve.getWorldPosition(v), meta: HS.valve },
    { id: 'organ-coronary', get: (v) => v.copy(coroMain.getPoint(0.5)).applyMatrix4(heart.matrixWorld), meta: HS.coronary },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) {
    clock += dt; heart.rotation.y += dt * 0.13;
    // quick systole, long diastole — the real rhythm, not a sine
    const t = (clock * 1.05) % 1;
    const sq = t < 0.16 ? Math.sin((t / 0.16) * Math.PI) : 0;
    const s = 1 - sq * 0.085;
    body.scale.set(0.78 * s, 0.78 * (1 - sq * 0.055), 0.78 * s);
    la.scale.set(0.30 * (1 + sq * 0.09), 0.24 * (1 + sq * 0.09), 0.27 * (1 + sq * 0.09));
    ra.scale.set(0.315 * (1 + sq * 0.09), 0.252 * (1 + sq * 0.09), 0.284 * (1 + sq * 0.09));
    valve.material.emissiveIntensity = 0.35 + sq * 1.4;
    coroMat.emissiveIntensity = 0.25 + sq * 0.35;
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


UNI.register('tissue', ({ THREE, KIT, meta }) => {
  // cardiac muscle: branched, striated, wet cells packed into a sheet, joined by
  // intercalated discs and threaded by a capillary carrying real red cells.
  const root = KIT.group(); const H = KIT.HEX; const sheet = KIT.group(); root.add(sheet);
  const cellMat = KIT.wet(0xa8503f, { rough: 0.48, clear: 0.62, glow: 0.1, bump: 0.02, seed: 23 });
  const stripeMat = KIT.emissive(0xe0a08c, { glow: 0.32, opacity: 0.42 });
  const discMat = KIT.emissive(H.amber, { glow: 0.55, opacity: 0.75 });
  const nucMat = KIT.wet(0x5e2a30, { rough: 0.6, clear: 0.3, glow: 0.06, seed: 29 });

  const cells = [];
  const COLS = 4, ROWS = 3;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = (c - (COLS - 1) / 2) * 0.64, y = (r - (ROWS - 1) / 2) * 0.6;
    const g = KIT.group(x, y, (KIT.hash(r * 9 + c) - 0.5) * 0.16);
    g.rotation.z = (KIT.hash(c * 3 + r) - 0.5) * 0.2;
    // an irregular, slightly branched fibre rather than a clean capsule
    const fibre = new THREE.Mesh(
      KIT.displace(new THREE.CapsuleGeometry(0.135, 0.44, 10, 20), 0.014, 5.5, c * 7 + r), cellMat);
    fibre.rotation.z = Math.PI / 2; g.add(fibre);
    // sarcomere striations
    for (let s = -3; s <= 3; s++) {
      const st = new THREE.Mesh(new THREE.TorusGeometry(0.137, 0.009, 6, 20), stripeMat);
      st.position.x = s * 0.068; st.rotation.y = Math.PI / 2; g.add(st);
    }
    // a nucleus, because a real cardiomyocyte visibly has one
    const nuc = new THREE.Mesh(KIT.displace(new THREE.SphereGeometry(0.055, 16, 12), 0.008, 8, c), nucMat);
    nuc.position.set(0.02, 0.05, 0.06); g.add(nuc);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.137, 18), discMat);
    disc.position.x = 0.35; disc.rotation.y = Math.PI / 2; g.add(disc);
    sheet.add(g); cells.push({ g, ph: (c + r) * 0.3 });
  }

  const capCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.25, -0.92, 0.22), new THREE.Vector3(-0.32, -0.2, 0.18),
    new THREE.Vector3(0.5, 0.32, 0.22), new THREE.Vector3(1.25, 0.92, 0.12)]);
  sheet.add(new THREE.Mesh(new THREE.TubeGeometry(capCurve, 70, 0.062, 12, false),
    KIT.glassy(0xff9aa6, { opacity: 0.16, glow: 0.05 })));
  // red cells as real biconcave discs, not points
  const rbcMat = KIT.wet(0xd1465a, { rough: 0.4, clear: 0.6, glow: 0.18, seed: 31 });
  const rbcs = [];
  for (let i = 0; i < 9; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), rbcMat);
    d.scale.set(1, 0.42, 1); sheet.add(d); rbcs.push(d);
  }

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'tis-cardio', get: (v) => cells[5].g.getWorldPosition(v), meta: HS.cardiomyocyte },
    { id: 'tis-disc', get: (v) => v.set(0.35, 0, 0).applyMatrix4(cells[5].g.matrixWorld), meta: HS.disc },
    { id: 'tis-cap', get: (v) => v.copy(capCurve.getPoint(0.5)).applyMatrix4(sheet.matrixWorld), meta: HS.capillary },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) {
    clock += dt;
    sheet.rotation.y = Math.sin(clock * 0.1) * 0.16; sheet.rotation.x = Math.sin(clock * 0.13) * 0.08;
    const t = (clock * 1.05) % 1;
    const sq = t < 0.16 ? Math.sin((t / 0.16) * Math.PI) : 0;
    for (const c of cells) { const s = 1 - sq * 0.13; c.g.scale.set(1, s, s); }
    for (let i = 0; i < rbcs.length; i++) {
      const tt = ((clock * 0.16 + i / rbcs.length) % 1);
      const p = capCurve.getPoint(tt);
      rbcs[i].position.copy(p);
      rbcs[i].rotation.z = tt * 6.0;
    }
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});
