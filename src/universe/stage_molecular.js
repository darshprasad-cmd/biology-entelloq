/*
 * stage_molecular.js — the four smallest scales: PROTEIN → DNA → NUCLEOTIDE → ATOM.
 * Here the visuals become literal molecular models — a folded protein, the double
 * helix, a single base pair as ball-and-stick, and a carbon atom — so the journey
 * ends on real chemistry rather than metaphor.
 */

// CPK-ish atom colours so ball-and-stick reads like a textbook.
const MOL_ATOM = { C: 0x2b2f36, N: 0x4b7bec, O: 0xe8735e, P: 0xf6a640, H: 0xdfe8ec, Fe: 0xd06a3a };

UNI.register('protein', ({ THREE, KIT, meta }) => {
  // Haemoglobin, stylised: alpha-helix coils, a beta-sheet, and a heme group with
  // its iron — the exact spot oxygen binds.
  const root = KIT.group(); const H = KIT.HEX; const spin = KIT.group(); root.add(spin);

  // two alpha helices as coiled tubes
  const helixMat = KIT.surface(H.em, { rough: 0.4, emissive: 0x0e5140, glow: 0.4 });
  function coil(cx, cy, turns, len, r) {
    const pts = []; for (let i = 0; i <= 80; i++) { const a = i / 80 * turns * Math.PI * 2; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy - len / 2 + (i / 80) * len, Math.sin(a) * r)); }
    return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 100, 0.055, 8, false), helixMat);
  }
  const helix = coil(-0.5, 0, 5, 1.4, 0.22); helix.rotation.z = 0.3; spin.add(helix);
  spin.add((() => { const c = coil(0.55, 0.1, 4, 1.1, 0.2); c.rotation.z = -0.4; return c; })());

  // a beta-sheet — a few flat strands side by side
  const sheetMat = KIT.surface(H.indigo, { rough: 0.5, emissive: 0x272c66, glow: 0.35, side: THREE.DoubleSide });
  const sheet = KIT.group(0.1, -0.7, 0.3); sheet.rotation.set(0.4, 0.3, 0);
  for (let s = 0; s < 3; s++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.14), sheetMat); st.position.z = s * 0.18; spin.add(st); sheet.add(st); }
  spin.add(sheet);

  // heme group: a flat porphyrin ring with an iron at centre, and a bound O2
  const heme = KIT.group(0.2, 0.55, 0.2); heme.rotation.x = 0.5; spin.add(heme);
  heme.add(new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 24), KIT.emissive(H.rose, { glow: 0.6 })));
  const iron = KIT.sphere(0.06, 16, KIT.surface(MOL_ATOM.Fe, { rough: 0.2, metal: 0.6, emissive: 0x5a2a12, glow: 0.4 })); heme.add(iron);
  const o2 = KIT.sphere(0.035, 12, KIT.emissive(MOL_ATOM.O, { glow: 0.6 })); o2.position.set(0, 0, 0.12); heme.add(o2);

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'pro-helix', get: (v) => helix.getWorldPosition(v), meta: HS.helix },
    { id: 'pro-sheet', get: (v) => sheet.getWorldPosition(v), meta: HS.sheet },
    { id: 'pro-heme', get: (v) => heme.getWorldPosition(v), meta: HS.heme },
    { id: 'pro-active', get: (v) => iron.getWorldPosition(v), meta: HS.active },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) { clock += dt; spin.rotation.y += dt * 0.18; spin.rotation.x = Math.sin(clock * 0.2) * 0.1; const b = 1 + Math.sin(clock * 2) * 0.15; o2.position.z = 0.12 + Math.sin(clock * 2) * 0.02; iron.scale.setScalar(b * 0.6 + 0.4); }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


UNI.register('dna', ({ THREE, KIT, meta }) => {
  // The B-form double helix: 10.5 base-pairs per turn, coloured rungs, two
  // sugar-phosphate backbones. Centred and vertical so the dive from the nucleus
  // arrives right down its axis.
  const root = KIT.group(); const H = KIT.HEX; const helix = KIT.group(); root.add(helix);
  const RUNGS = 42, RISE = 0.052, TWIST = (Math.PI * 2) / 10.5, RAD = 0.42;
  const baseCols = [H.em, H.cy, H.amber, H.indigo];   // A T G C
  const backA = [], backB = [];
  const rungMat = baseCols.map((c) => KIT.emissive(c, { glow: 0.6, opacity: 0.95 }));
  const rungGeo = new THREE.CylinderGeometry(0.02, 0.02, RAD * 2, 6);
  for (let i = 0; i < RUNGS; i++) {
    const a = i * TWIST, y = (i - RUNGS / 2) * RISE;
    const x1 = Math.cos(a) * RAD, z1 = Math.sin(a) * RAD, x2 = Math.cos(a + Math.PI) * RAD, z2 = Math.sin(a + Math.PI) * RAD;
    backA.push(new THREE.Vector3(x1, y, z1)); backB.push(new THREE.Vector3(x2, y, z2));
    // rung split into two half-bases meeting in the middle (A–T / G–C)
    const pair = (i % 3 === 0) ? [2, 3] : [0, 1];   // sprinkle some G-C
    const rung = new THREE.Mesh(rungGeo, rungMat[pair[0]]);
    rung.position.set(0, y, 0); rung.rotation.z = Math.PI / 2; rung.rotation.y = -a; helix.add(rung);
    helix.add(KIT.mesh(new THREE.SphereGeometry(0.035, 8, 8), rungMat[pair[0]], x1, y, z1));
    helix.add(KIT.mesh(new THREE.SphereGeometry(0.035, 8, 8), rungMat[pair[1]], x2, y, z2));
  }
  const bbMat = KIT.surface(0x9fb2bc, { rough: 0.35, metal: 0.2, emissive: 0x30414a, glow: 0.3 });
  helix.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(backA), 200, 0.03, 6, false), bbMat));
  helix.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(backB), 200, 0.03, 6, false), bbMat));

  const HS = meta.hotspots || {};
  const _t = new THREE.Vector3();
  const hotspots = [
    { id: 'dna-helix', get: (v) => v.set(RAD * 1.3, 0.4, 0).applyMatrix4(helix.matrixWorld), meta: HS.helix },
    { id: 'dna-basepair', get: (v) => v.set(0, 0, 0).applyMatrix4(helix.matrixWorld), meta: HS.basepair },
    { id: 'dna-backbone', get: (v) => v.copy(backA[Math.floor(RUNGS * 0.7)]).applyMatrix4(helix.matrixWorld), meta: HS.backbone },
    { id: 'dna-gene', get: (v) => v.set(-RAD, -0.5, 0).applyMatrix4(helix.matrixWorld), meta: HS.gene },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) { clock += dt; helix.rotation.y += dt * 0.35; helix.position.y = Math.sin(clock * 0.5) * 0.03; }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


UNI.register('nucleotide', ({ THREE, KIT, meta }) => {
  // One rung as ball-and-stick: an A–T pair with sugar-phosphate backbones and the
  // hydrogen bonds holding the bases together.
  const root = KIT.group(); const H = KIT.HEX; const spin = KIT.group(); root.add(spin);
  const mats = {}; for (const k in MOL_ATOM) mats[k] = KIT.surface(MOL_ATOM[k], { rough: 0.3, metal: 0.1, emissive: MOL_ATOM[k], glow: 0.25 });
  const bondMat = KIT.surface(0x8091a0, { rough: 0.5, emissive: 0x30414a, glow: 0.2 });
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function atom(el, x, y, z, r) { const m = KIT.sphere(r || 0.11, 16, mats[el] || mats.C); m.position.set(x, y, z); spin.add(m); return m; }
  function bond(p, q, rad) { _a.copy(p); _b.copy(q); const mid = _a.clone().add(_b).multiplyScalar(0.5); const len = _a.distanceTo(_b); const m = new THREE.Mesh(new THREE.CylinderGeometry(rad || 0.03, rad || 0.03, len, 6), bondMat); m.position.copy(mid); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _b.clone().sub(_a).normalize()); spin.add(m); return m; }
  // a compact base pair: purine ring (left) + pyrimidine ring (right)
  function ring(cx, n, eln) { const a = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; const p = new THREE.Vector3(cx + Math.cos(t) * 0.28, Math.sin(t) * 0.28, 0); a.push(atom(i % 2 ? 'N' : 'C', p.x, p.y, p.z)); } for (let i = 0; i < n; i++) bond(a[i].position, a[(i + 1) % n].position); return a; }
  const left = ring(-0.55, 6, 'N'); const right = ring(0.55, 5, 'N');
  // sugar (pentose) + phosphate on each side
  const sugarL = atom('C', -1.15, -0.1, 0, 0.13); const phosL = atom('P', -1.55, -0.5, 0, 0.15); atom('O', -1.55, -0.9, 0.2, 0.1); bond(sugarL.position, phosL.position, 0.035); bond(left[0].position, sugarL.position, 0.035);
  const sugarR = atom('C', 1.15, -0.1, 0, 0.13); const phosR = atom('P', 1.55, -0.5, 0, 0.15); atom('O', 1.55, -0.9, 0.2, 0.1); bond(sugarR.position, phosR.position, 0.035); bond(right[0].position, sugarR.position, 0.035);
  // hydrogen bonds across the middle (dashed look via thin bright cylinders)
  const hbonds = [];
  for (let i = 0; i < 2; i++) { const y = 0.12 - i * 0.24; const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 5), KIT.emissive(H.cy, { glow: 0.6, opacity: 0.8 })); hb.position.set(0, y, 0); hb.rotation.z = Math.PI / 2; spin.add(hb); hbonds.push(hb); }

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'nuc-base', get: (v) => left[0].getWorldPosition(v), meta: HS.base },
    { id: 'nuc-sugar', get: (v) => sugarL.getWorldPosition(v), meta: HS.sugar },
    { id: 'nuc-phos', get: (v) => phosL.getWorldPosition(v), meta: HS.phosphate },
    { id: 'nuc-hbond', get: (v) => v.set(0, 0, 0).applyMatrix4(spin.matrixWorld), meta: HS.hbond },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) { clock += dt; spin.rotation.y = Math.sin(clock * 0.3) * 0.4; spin.rotation.x = Math.sin(clock * 0.22) * 0.15; for (let i = 0; i < hbonds.length; i++) hbonds[i].material.opacity = 0.5 + 0.4 * Math.sin(clock * 4 + i); }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


UNI.register('atom', ({ THREE, KIT, meta }) => {
  // A carbon atom: 6 protons + 6 neutrons in a tight nucleus, two electron shells
  // (2 + 4) with electrons orbiting on tilted rings.
  const root = KIT.group(); const H = KIT.HEX;
  const nucleus = KIT.group(); root.add(nucleus);
  const pMat = KIT.surface(H.rose, { rough: 0.3, emissive: 0x7a2233, glow: 0.5 });
  const nMat = KIT.surface(0x9fb2bc, { rough: 0.4, emissive: 0x30414a, glow: 0.3 });
  for (let i = 0; i < 12; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(0.12 + Math.random() * 0.05); const s = KIT.sphere(0.1, 16, i % 2 ? pMat : nMat); s.position.copy(v); nucleus.add(s); }
  nucleus.add(KIT.sphere(0.34, 24, KIT.additive(H.rose, 0.25)));   // nuclear glow

  // electron shells: rings + orbiting electrons
  const shells = [];
  const shellDef = [[0.75, 2], [1.35, 4]];
  const eMat = KIT.emissive(H.cy, { glow: 1.0 });
  shellDef.forEach(([r, count], si) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.006, 6, 90), KIT.additive(H.cy, 0.18));
    ring.rotation.x = Math.PI / 2 + si * 0.5; ring.rotation.y = si * 0.7; root.add(ring);
    const es = [];
    for (let k = 0; k < count; k++) { const e = KIT.sphere(0.06, 12, eMat); root.add(e); es.push({ e, phase: k / count * Math.PI * 2 }); }
    shells.push({ r, ring, es, tiltX: ring.rotation.x, tiltY: ring.rotation.y, speed: 0.8 - si * 0.3 });
  });

  const HS = meta.hotspots || {};
  const _q = new THREE.Vector3();
  const hotspots = [
    { id: 'atom-nucleus', get: (v) => nucleus.getWorldPosition(v), meta: HS.nucleus },
    { id: 'atom-electron', get: (v) => shells[1].es[0].e.getWorldPosition(v), meta: HS.electron },
    { id: 'atom-valence', get: (v) => shells[1].es[2].e.getWorldPosition(v), meta: HS.valence },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt) {
    clock += dt; nucleus.rotation.y += dt * 0.4; nucleus.rotation.x += dt * 0.25;
    for (const sh of shells) {
      for (const o of sh.es) {
        const a = clock * sh.speed + o.phase;
        _q.set(Math.cos(a) * sh.r, Math.sin(a) * sh.r, 0);
        _q.applyEuler(new THREE.Euler(sh.tiltX, sh.tiltY, 0));
        o.e.position.copy(_q);
      }
    }
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});
