/*
 * stage_cell.js — the two scales at the heart of the journey: the CELL and, one
 * step deeper, the MITOCHONDRION. This is where the brief's "nothing is
 * decorative, everything teaches" bites hardest, so every organelle is a real,
 * clickable object that does its actual job: mitochondria spit animated ATP,
 * ribosomes crawl along mRNA translating it, the Golgi buds vesicles.
 *
 * A stage factory receives { THREE, KIT, meta } and returns
 * { root, update(dt,d,camera,fade), hotspots[], dispose }. Hotspots expose a
 * get(v)=>worldPosition so the DOM marker layer can float a label on each one.
 */

UNI.register('cell', ({ THREE, KIT, meta }) => {
  const root = KIT.group();
  const H = KIT.HEX;
  const spin = KIT.group(); root.add(spin);   // slow overall drift, minus the membrane

  // ── plasma membrane: a glassy bilayer sphere, faintly mottled, with receptors.
  // A real cell is a soft irregular bag, not a ball. Displace the membrane so its
  // silhouette wobbles, and give it a wet translucent skin that catches the rim
  // light — the single biggest difference between "sphere" and "cell".
  const memMat = KIT.wet(0x2fbf90, { rough: 0.32, clear: 0.85, clearRough: 0.18,
    opacity: 0.20, glow: 0.05, translucent: 0.35, thickness: 0.8, seed: 41,
    sheenColor: 0x9affd8 });
  memMat.side = THREE.DoubleSide; memMat.depthWrite = false;
  const membrane = new THREE.Mesh(
    KIT.displace(new THREE.SphereGeometry(1.5, 72, 48), 0.055, 1.9, 4), memMat);
  const memInner = new THREE.Mesh(
    KIT.displace(new THREE.SphereGeometry(1.44, 48, 32), 0.05, 1.9, 4), KIT.additive(H.cy, 0.045));
  root.add(membrane); root.add(memInner);
  const rest = new Float32Array(membrane.geometry.attributes.position.array);   // for the breath
  // receptors dotted over the surface
  const receptors = KIT.points(KIT.fibSphere(120, 1.5), H.cy, 0.045, { opacity: 0.5 });
  root.add(receptors);

  // ── cytoplasm motes
  const moteN = 140, motePos = new Float32Array(moteN * 3);
  for (let i = 0; i < moteN; i++) { const r = 1.35 * Math.cbrt(Math.random()); const a = KIT.fibSphere(1, 1)[0]; const v = new THREE.Vector3().randomDirection().multiplyScalar(r); motePos[i * 3] = v.x; motePos[i * 3 + 1] = v.y; motePos[i * 3 + 2] = v.z; }
  const motes = KIT.points(motePos, H.em, 0.02, { opacity: 0.35 });
  spin.add(motes);

  // ── nucleus (centred so the dive continues straight into DNA)
  const nucleus = KIT.group(0, 0, 0);
  const nucMat = KIT.wet(0x1d9a90, { rough: 0.45, clear: 0.55, emissive: 0x0e4f49, glow: 0.3,
    opacity: 0.96, bump: 0.02, seed: 47 });
  const nucBody = new THREE.Mesh(
    KIT.displace(new THREE.SphereGeometry(0.62, 56, 40), 0.022, 4.2, 9), nucMat);
  nucleus.add(nucBody);
  const envelope = new THREE.Mesh(
    KIT.displace(new THREE.SphereGeometry(0.665, 40, 28), 0.02, 4.2, 9),
    KIT.glassy(H.cy, { opacity: 0.11, glow: 0.06 })); nucleus.add(envelope);
  nucleus.add(KIT.points(KIT.fibSphere(70, 0.66), H.ink, 0.028, { opacity: 0.55 }));  // nuclear pores
  // chromatin: faint strands inside the nucleus so it isn't a blank ball
  const chrMat = KIT.emissive(0x0a2f2c, { glow: 0.35, opacity: 0.5 });
  for (let i = 0; i < 7; i++) {
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const a = (i * 1.7 + k * 0.8), r = 0.18 + KIT.hash(i * 5 + k) * 0.32;
      pts.push(new THREE.Vector3(Math.cos(a) * r, (KIT.hash(i + k) - 0.5) * 0.7, Math.sin(a) * r));
    }
    nucleus.add(new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.012, 5, false), chrMat));
  }
  const nucleolus = new THREE.Mesh(
    KIT.displace(new THREE.SphereGeometry(0.2, 24, 18), 0.015, 7, 3),
    KIT.wet(0x0c3b37, { rough: 0.5, clear: 0.4, glow: 0.35, opacity: 0.85, seed: 53 }));
  nucleolus.position.set(0.12, 0.08, 0.1); nucleus.add(nucleolus);
  spin.add(nucleus);

  // ── mitochondria: bean bodies with cristae, each an ATP source ─────────────
  const mitoGroup = KIT.group(); spin.add(mitoGroup);
  const mitoMat = KIT.wet(0x8a3550, { rough: 0.44, clear: 0.7, emissive: 0x5a2233, glow: 0.35,
    bump: 0.018, seed: 59 });
  const cristaeMat = KIT.emissive(H.rose, { glow: 0.7, opacity: 0.85 });
  const mitoAnchors = [];
  const MITO = [[0.95, 0.35, 0.3, 0.4], [-0.8, -0.5, 0.4, -0.7], [0.2, 0.95, -0.4, 1.1], [-0.5, 0.6, -0.7, 2.0]];
  for (const [x, y, z, rot] of MITO) {
    const m = KIT.group(x, y, z); m.rotation.z = rot; m.scale.setScalar(0.9);
    const body = new THREE.Mesh(
      KIT.displace(new THREE.CapsuleGeometry(0.14, 0.3, 10, 20), 0.012, 6, x * 13), mitoMat);
    body.rotation.z = Math.PI / 2; m.add(body);
    for (let c = -3; c <= 3; c++) { const cr = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 6, 14, Math.PI), cristaeMat); cr.position.x = c * 0.06; cr.rotation.y = Math.PI / 2; m.add(cr); }
    mitoGroup.add(m); mitoAnchors.push(m);
  }
  // one shared ATP particle system streaming from the mitochondria
  const ATP_N = 90, atpPos = new Float32Array(ATP_N * 3), atpLife = new Float32Array(ATP_N), atpSrc = new Float32Array(ATP_N * 3);
  for (let i = 0; i < ATP_N; i++) seedATP(i, true);
  function seedATP(i, initial) {
    const a = mitoAnchors[i % mitoAnchors.length];
    atpSrc[i * 3] = a.position.x; atpSrc[i * 3 + 1] = a.position.y; atpSrc[i * 3 + 2] = a.position.z;
    atpPos[i * 3] = a.position.x; atpPos[i * 3 + 1] = a.position.y; atpPos[i * 3 + 2] = a.position.z;
    atpLife[i] = initial ? Math.random() : 0;
  }
  const atp = KIT.points(atpPos, H.amber, 0.05, { opacity: 0.95 });
  spin.add(atp);
  const _dir = new THREE.Vector3();

  // ── endoplasmic reticulum: a wandering tube near the nucleus, ribosome-studded
  const erPts = [];
  for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 3; const r = 0.85 + Math.sin(a * 2) * 0.12; erPts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 1.3) * 0.5, Math.sin(a) * r)); }
  const erCurve = new THREE.CatmullRomCurve3(erPts);
  const er = new THREE.Mesh(new THREE.TubeGeometry(erCurve, 120, 0.03, 6, false), KIT.surface(H.indigo, { rough: 0.4, emissive: 0x2a2f6a, glow: 0.4, opacity: 0.9 }));
  spin.add(er);
  const erRibo = KIT.points((() => { const n = 80, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const v = erCurve.getPoint(i / n); p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z; } return p; })(), H.ink, 0.028, { opacity: 0.7 });
  spin.add(erRibo);

  // ── free ribosome translating an mRNA strand (a bead crawling a line) ───────
  const mrnaCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.9, -0.9, 0.6), new THREE.Vector3(-0.3, -1.0, 0.4), new THREE.Vector3(0.3, -0.85, 0.5), new THREE.Vector3(0.9, -0.95, 0.3)]);
  const mrna = new THREE.Mesh(new THREE.TubeGeometry(mrnaCurve, 40, 0.008, 5, false), KIT.emissive(H.cy, { glow: 0.5, opacity: 0.7 }));
  spin.add(mrna);
  const ribosome = KIT.sphere(0.05, 16, KIT.surface(H.ink, { rough: 0.4, emissive: 0x334, glow: 0.3 })); spin.add(ribosome);
  const peptide = KIT.points(new Float32Array(30 * 3), H.em, 0.03, { opacity: 0.8 }); spin.add(peptide);   // growing protein chain
  let ribT = 0;

  // ── Golgi: stacked curved cisternae that bud vesicles ──────────────────────
  const golgi = KIT.group(-0.7, 0.7, -0.3); golgi.rotation.set(0.4, 0, 0.5); spin.add(golgi);
  const golgiMat = KIT.surface(H.amber, { rough: 0.4, emissive: 0x6a5a20, glow: 0.4, opacity: 0.92 });
  for (let s = 0; s < 4; s++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.14 - s * 0.02, 0.018, 8, 22, Math.PI * 1.2), golgiMat); c.position.y = s * 0.05; golgi.add(c); }
  const VES_N = 6, vesPos = new Float32Array(VES_N * 3), vesLife = new Float32Array(VES_N);
  for (let i = 0; i < VES_N; i++) vesLife[i] = Math.random();
  const vesicles = KIT.points(vesPos, H.amber, 0.06, { opacity: 0.9 }); spin.add(vesicles);

  // ── lysosomes: small acidic spheres digesting a particle ───────────────────
  const lyso = KIT.group(0.6, -0.6, 0.5); spin.add(lyso);
  lyso.add(KIT.sphere(0.12, 24, KIT.surface(0x8b3a62, { rough: 0.5, emissive: 0x4a1e33, glow: 0.5, opacity: 0.9 })));
  const prey = KIT.sphere(0.05, 12, KIT.emissive(H.rose, { glow: 0.5 })); lyso.add(prey);
  let lysoT = 0;

  // ── hotspots (world-position accessors + teaching meta) ────────────────────
  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'cell-membrane', get: (v) => membrane.getWorldPosition(v).add(_dir.set(1.05, 0.5, 0)), meta: HS.membrane },
    { id: 'cell-nucleus', get: (v) => nucleus.getWorldPosition(v), meta: HS.nucleus },
    { id: 'cell-mito', get: (v) => mitoAnchors[0].getWorldPosition(v), meta: HS.mito },
    { id: 'cell-er', get: (v) => er.getWorldPosition(v).add(_dir.set(0.85, 0.2, 0)), meta: HS.er },
    { id: 'cell-golgi', get: (v) => golgi.getWorldPosition(v), meta: HS.golgi },
    { id: 'cell-ribosome', get: (v) => ribosome.getWorldPosition(v), meta: HS.ribosome },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt, d, camera, fade) {
    clock += dt;
    spin.rotation.y += dt * 0.05; spin.rotation.x = Math.sin(clock * 0.1) * 0.05;

    // membrane breath
    const pos = membrane.geometry.attributes.position; const arr = pos.array; const amp = 1 + Math.sin(clock * 0.7) * 0.012;
    for (let i = 0; i < arr.length; i++) arr[i] = rest[i] * amp;
    pos.needsUpdate = true;

    // ATP stream: drift outward from each mitochondrion, recycle at end of life
    const ap = atp.geometry.attributes.position.array;
    for (let i = 0; i < ATP_N; i++) {
      atpLife[i] += dt * 0.5;
      if (atpLife[i] >= 1) seedATP(i, false);
      const t = atpLife[i]; const i3 = i * 3;
      _dir.set(atpSrc[i3], atpSrc[i3 + 1], atpSrc[i3 + 2]).normalize().multiplyScalar(0.55 * t);
      ap[i3] = atpSrc[i3] + _dir.x * (1 + Math.sin(i) * 0.2);
      ap[i3 + 1] = atpSrc[i3 + 1] + _dir.y + Math.sin(clock * 2 + i) * 0.03;
      ap[i3 + 2] = atpSrc[i3 + 2] + _dir.z;
    }
    atp.geometry.attributes.position.needsUpdate = true;
    atp.material.opacity = fade * (0.6 + 0.4 * Math.sin(clock * 3));

    // ribosome crawling the mRNA + peptide growing behind it
    ribT = (ribT + dt * 0.14) % 1;
    ribosome.position.copy(mrnaCurve.getPoint(ribT));
    const pp = peptide.geometry.attributes.position.array;
    for (let i = 0; i < 30; i++) { const base = mrnaCurve.getPoint(Math.max(0, ribT - i * 0.008)); pp[i * 3] = base.x; pp[i * 3 + 1] = base.y + 0.06 + i * 0.006; pp[i * 3 + 2] = base.z + Math.sin(i + clock) * 0.01; }
    peptide.geometry.attributes.position.needsUpdate = true;

    // Golgi vesicles budding off toward the membrane
    const vp = vesicles.geometry.attributes.position.array; const g = golgi.position;
    for (let i = 0; i < VES_N; i++) { vesLife[i] += dt * 0.3; if (vesLife[i] >= 1) vesLife[i] = 0; const t = vesLife[i]; vp[i * 3] = g.x + (g.x * 0.4) * t + Math.sin(i) * 0.05; vp[i * 3 + 1] = g.y - 0.1 - t * 0.3; vp[i * 3 + 2] = g.z + Math.cos(i) * 0.05; }
    vesicles.geometry.attributes.position.needsUpdate = true;

    // lysosome pulsing as it digests
    lysoT += dt; const s = 1 + Math.sin(lysoT * 3) * 0.15; prey.scale.setScalar(Math.max(0.2, 1 - (lysoT % 3) / 3)); lyso.children[0].scale.setScalar(s * 0.5 + 0.5);
  }

  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});


UNI.register('organelle', ({ THREE, KIT, meta }) => {
  // The mitochondrion, up close: outer + inner membranes, deep cristae folds, ATP
  // synthase turbines studding the inner membrane, and its own little genome.
  const root = KIT.group();
  const H = KIT.HEX;
  const spin = KIT.group(); root.add(spin);

  const outer = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.4, 16, 40), KIT.glassy(0x8a3550, { opacity: 0.14, glow: 0.1 }));
  outer.rotation.z = Math.PI / 2; spin.add(outer);
  const matrixMat = KIT.surface(0x3a1f2c, { rough: 0.6, emissive: 0x5a2436, glow: 0.4, opacity: 0.85 });
  const matrix = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 1.3, 12, 30), matrixMat); matrix.rotation.z = Math.PI / 2; spin.add(matrix);

  // cristae — deep folded inner membrane (a stack of rings running the length)
  const cMat = KIT.emissive(H.rose, { glow: 0.6, opacity: 0.8 });
  const synMat = KIT.emissive(H.amber, { glow: 0.9 });
  const synapses = [];
  for (let i = -6; i <= 6; i++) {
    const fold = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 30), cMat);
    fold.position.x = i * 0.11; fold.rotation.y = Math.PI / 2; fold.scale.y = 0.75 + Math.sin(i) * 0.15; spin.add(fold);
    // ATP synthase turbines around each crista
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + i; const t = KIT.sphere(0.03, 8, synMat); t.position.set(i * 0.11, Math.cos(a) * 0.55 * fold.scale.y, Math.sin(a) * 0.55); spin.add(t); synapses.push({ t, a, i }); }
  }
  // mtDNA — a small glowing loop
  const mtdna = new THREE.Mesh(new THREE.TorusKnotGeometry(0.12, 0.015, 60, 6, 2, 3), KIT.emissive(H.cy, { glow: 0.7 }));
  mtdna.position.set(0, 0, 0); spin.add(mtdna);
  // protons rushing through the turbines (particles converging on synthase)
  const P_N = 60, pPos = new Float32Array(P_N * 3), pTgt = [];
  for (let i = 0; i < P_N; i++) { const s = synapses[i % synapses.length]; pTgt.push(s); }
  const protons = KIT.points(pPos, H.amber, 0.03, { opacity: 0.8 }); spin.add(protons);
  const _v = new THREE.Vector3();

  const HS = meta.hotspots || {};
  const hotspots = [
    { id: 'org-cristae', get: (v) => v.set(0.3, 0.55, 0).applyMatrix4(spin.matrixWorld), meta: HS.cristae },
    { id: 'org-matrix', get: (v) => v.set(0, 0, 0).applyMatrix4(spin.matrixWorld), meta: HS.matrix },
    { id: 'org-synthase', get: (v) => synapses[0].t.getWorldPosition(v), meta: HS.atpsynthase },
    { id: 'org-mtdna', get: (v) => mtdna.getWorldPosition(v), meta: HS.mtdna },
  ].filter((h) => h.meta);

  let clock = 0;
  function update(dt, d, camera, fade) {
    clock += dt; spin.rotation.y += dt * 0.06; spin.rotation.x = Math.sin(clock * 0.15) * 0.06;
    mtdna.rotation.z += dt * 0.5; mtdna.rotation.x += dt * 0.3;
    const pp = protons.geometry.attributes.position.array;
    for (let i = 0; i < P_N; i++) { const s = pTgt[i]; const ph = (clock * 0.8 + i * 0.13) % 1; const y = Math.cos(s.a) * 0.55, z = Math.sin(s.a) * 0.55; pp[i * 3] = s.i * 0.11; pp[i * 3 + 1] = y * (1.6 - ph); pp[i * 3 + 2] = z * (1.6 - ph); }
    protons.geometry.attributes.position.needsUpdate = true;
    for (const s of synapses) { const pulse = 0.5 + 0.5 * Math.sin(clock * 4 + s.i); s.t.scale.setScalar(0.7 + pulse * 0.6); }
  }
  return { root, update, hotspots, dispose: () => KIT.dispose(root) };
});
