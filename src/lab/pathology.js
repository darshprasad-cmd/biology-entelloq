/*
 * pathology.js — the disease library.
 *
 * Every dissection up to now has been a healthy specimen, and healthy specimens
 * teach anatomy, not medicine. This module turns the same two bodies into
 * PATHOLOGICAL specimens: the heart of a man who died 26 hours into an anterior
 * infarct, the heart of a woman whose mitral valve was scarred by a streptococcal
 * throat thirty years ago, the frog that a failed tank filter killed.
 *
 * THE PEDAGOGICAL CONTRACT — and it is the whole point of the module:
 *
 *   vignette()  gives the student the history. Age, presentation, exposure.
 *               It NEVER names the diagnosis.
 *   apply()     changes what the eye SEES — colour, size, surface, added masses,
 *               regional wall geometry. The lesion is discovered by dissecting,
 *               not read off a label.
 *   the notes   are edited only with GROSS DESCRIPTION ("soft, yellow-tan, sharply
 *               demarcated, with a dark red rim"), never with a diagnosis. That is
 *               precisely the discipline a pathologist works under: describe what
 *               is in front of you, then reason to a diagnosis. Giving the answer
 *               in hover text destroys the exercise.
 *   findings()  is the marking scheme. The tutor grades the student's account
 *               against it; the shell must not render it as a hint.
 *
 * CLINICAL ACCURACY IS NON-NEGOTIABLE HERE. Two things get faked constantly in
 * teaching software and are got right in this file:
 *
 *   1. THE TIMELINE OF AN INFARCT. A myocardial infarct does not look like "a
 *      pale patch" — it looks like nothing at all for the first half day, dark
 *      mottling at ~24 h, a soft yellow-tan centre with a hyperaemic rim at 5–7
 *      days (the softest and most rupture-prone the wall ever is), and a firm,
 *      thin, grey-white scar at 2 months. Three separate cases here, because the
 *      appearance IS the age and reading it is the skill.
 *   2. THE FROG IS A FROG. Transplanting human cirrhosis into an amphibian would
 *      be a lie a veterinary pathologist would spot instantly. The frog cases are
 *      real amphibian diseases — chytridiomycosis, Aeromonas septicaemia, hepatic
 *      lipidosis, mycobacteriosis, hydrocoelom — each with the human comparison
 *      stated explicitly in its mechanism, so a medical student still gets the
 *      transferable pathology (steatosis is steatosis; a granuloma is a granuloma).
 *
 * REVERSIBILITY. Everything touched is snapshotted before it is touched: material
 * colour and every surface parameter, mesh scale/position/rotation, the raw vertex
 * array (only when a case actually deforms), and the teaching note. clear()
 * restores all of it and disposes every added mesh. A student must be able to run
 * eight cases in a row on one specimen without the fifth inheriting the third.
 *
 * THE ONE TRAP THAT WILL BITE THE INTEGRATOR (see _wire/pathology.md): softbody.js
 * caches `rest` vertex positions at construction. If a case deforms geometry after
 * softbody was built, softbody springs the organ back to the HEALTHY shape on the
 * next animated frame and the nodules vanish. main.js must dispose and rebuild the
 * soft body around every apply()/clear(). The ordering matters and is spelled out
 * in the wiring note.
 *
 * PERFORMANCE. There is no per-frame work here at all — apply()/clear() are user
 * actions measured in tens of milliseconds, so the usual "hoist your scratch
 * vectors" rule does not apply and (since THREE arrives as a parameter, not an
 * import) module-scope THREE objects are not even constructible. Nothing in this
 * file runs inside the render loop.
 */

/* ========================================================================== *
 * Small toolkit. anatomy.js is concatenated ahead of this file, so `mat` and
 * `fbm` are already in scope — but they are guarded anyway, so that if anatomy
 * ever fails to build, pathology degrades to plain materials instead of taking
 * the whole page down with a ReferenceError at module-evaluation time.
 * ========================================================================== */

function PAT_mat(THREE, hex, o) {
  const opts = Object.assign({ tone: false }, o || {});
  // tone:false — anatomy's tisTone() deliberately desaturates and deepens candy
  // colours toward fixed-specimen tones. That is right for healthy tissue and
  // WRONG here: the chalky white of dystrophic calcification and the yellow-tan
  // of a five-day infarct are diagnostic hues. Preserve them exactly as authored.
  if (typeof mat === 'function') return mat(THREE, hex, opts);
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(hex), metalness: 0,
    roughness: opts.rough != null ? opts.rough : 0.5,
    clearcoat: opts.clear != null ? opts.clear : 0.4,
  });
}

function PAT_fbm(x, y, z) {
  if (typeof fbm === 'function') return fbm(x, y, z);
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// Deterministic PRNG. Cases must look IDENTICAL every time they are applied —
// a student comparing their drawing with a classmate's, or a teacher projecting
// the same case twice, must see the same specimen. Math.random() would make the
// granulomas dance between runs.
function PAT_rng(seed) {
  let s = (seed | 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 8) & 0xffffff) / 0xffffff; };
}

function PAT_disposeTree(obj) {
  if (!obj || typeof obj.traverse !== 'function') return;
  obj.traverse((o) => {
    if (o.geometry && o.geometry.dispose) o.geometry.dispose();
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      if (!m) return;
      // Only textures THIS module minted are ours to free. anatomy.js's tisMaps()
      // are SHARED across every organ of a tissue class — disposing one of those
      // would blank the roughness/normal relief on the entire specimen, on every
      // organ, permanently. Ownership is marked at creation, never inferred.
      if (m.map && m.map.userData && m.map.userData.PAT_owned && m.map.dispose) m.map.dispose();
      if (m.dispose) m.dispose();
    });
  });
}

/* ---- bench label ----------------------------------------------------------
 * A canvas-drawn caption for laid-out sections. Canvas 2D rather than a font
 * loader because this module must stay dependency-free and offline-safe; if the
 * browser refuses a 2D context we return null and the caller simply gets an
 * unlabelled slice rather than throwing mid-build. */
function PAT_labelPlane(THREE, text, width) {
  let cv, ctx;
  try {
    cv = document.createElement('canvas');
    cv.width = 512; cv.height = 96;
    ctx = cv.getContext('2d');
  } catch (e) { return null; }
  if (!ctx) return null;
  ctx.clearRect(0, 0, 512, 96);
  ctx.font = '600 44px ui-monospace, Menlo, Consolas, monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(4,7,10,0.72)';
  ctx.fillText(String(text), 258, 54);            // faint drop shadow for contrast
  ctx.fillStyle = '#dfe8ec';
  ctx.fillText(String(text), 256, 52);
  const tex = new THREE.CanvasTexture(cv);
  // r0.160: Texture.encoding was removed in favour of .colorSpace.
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.PAT_owned = true;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, width * 96 / 512),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false,
                                  side: THREE.DoubleSide }));
  mesh.castShadow = false; mesh.receiveShadow = false;
  return mesh;
}

/* ---- conformal lesion skin ------------------------------------------------
 * A regional colour change (infarct, hyperaemic border, scar) has to HUG the
 * wall it sits on, or it reads as a sticker. So the lesion is built from the
 * organ's OWN triangles: keep every face whose centroid falls inside the lesion
 * volume, lift it a hair along its normal, and hand it back as a separate mesh.
 *
 * The boundary radius is perturbed by fbm, because a real infarct border is
 * sharply demarcated but geographically irregular — a perfect circle would look
 * synthetic while a soft gradient would misteach (the sharp border is a genuine
 * gross feature and the reason you can outline an infarct with a scalpel).
 *
 * Handles indexed and non-indexed geometry. Returns null if the lesion volume
 * misses the mesh entirely, so a bad centre degrades to "no patch" rather than
 * an empty-geometry NaN bounding sphere. */
function PAT_lesionSkin(THREE, srcGeo, centre, radius, material, lift, seed) {
  if (!srcGeo || !srcGeo.attributes) return null;
  const pos = srcGeo.attributes.position;
  const nrm = srcGeo.attributes.normal;
  if (!pos || !nrm) return null;
  if (!Array.isArray(centre) || !Number.isFinite(radius) || radius <= 0) return null;
  const uvs = srcGeo.attributes.uv || null;
  const idx = srcGeo.index;
  const triCount = idx ? (idx.count / 3) : (pos.count / 3);
  const out = [], outN = [], outUV = [];
  const cx = centre[0], cy = centre[1], cz = centre[2];
  const ix = new Array(3);

  for (let t = 0; t < triCount; t++) {
    ix[0] = idx ? idx.getX(t * 3) : t * 3;
    ix[1] = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    ix[2] = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    const ax = pos.getX(ix[0]), ay = pos.getY(ix[0]), az = pos.getZ(ix[0]);
    const bx = pos.getX(ix[1]), by = pos.getY(ix[1]), bz = pos.getZ(ix[1]);
    const dx = pos.getX(ix[2]), dy = pos.getY(ix[2]), dz = pos.getZ(ix[2]);
    const mx = (ax + bx + dx) / 3, my = (ay + by + dy) / 3, mz = (az + bz + dz) / 3;

    // Irregular but SHARP border: perturb the threshold, do not feather the edge.
    const wob = 0.76 + 0.46 * PAT_fbm(mx * 1.55 + seed, my * 1.55 + seed * 1.3, mz * 1.55 + seed * 0.7);
    const rr = radius * wob;
    const ddx = mx - cx, ddy = my - cy, ddz = mz - cz;
    if (ddx * ddx + ddy * ddy + ddz * ddz > rr * rr) continue;

    for (let k = 0; k < 3; k++) {
      const i = ix[k];
      const nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i);
      out.push(pos.getX(i) + nx * lift, pos.getY(i) + ny * lift, pos.getZ(i) + nz * lift);
      outN.push(nx, ny, nz);
      if (uvs) outUV.push(uvs.getX(i), uvs.getY(i));
    }
  }
  if (!out.length) return null;

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(outN, 3));
  // Carry UVs across when the source has them. A textured material on a geometry
  // with NO uv attribute is not merely flat-looking: three.js's normal-map path
  // builds its tangent frame from dFdx(vUv), and with vUv constant at (0,0) that
  // is a normalize() of a zero vector — NaN normals, and the patch renders black.
  if (uvs && outUV.length === (out.length / 3) * 2) {
    g.setAttribute('uv', new THREE.Float32BufferAttribute(outUV, 2));
  }
  g.computeBoundingSphere();
  g.computeBoundingBox();
  const m = new THREE.Mesh(g, material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ---- regional wall deformation --------------------------------------------
 * Bulge (aneurysm) or draw in (thinning) a REGION of a wall, along the surface
 * normal with a smooth cosine falloff. Along the normal, not radially from the
 * origin: several organs here carry a baked non-uniform scale (lobe(), bean()),
 * and a radial push on those produces bumps whose height depends on which way
 * they happen to face. */
function PAT_regionDeform(THREE, geo, centre, radius, amount) {
  if (!geo || !geo.attributes) return;
  const pos = geo.attributes.position, nrm = geo.attributes.normal;
  if (!pos || !nrm) return;
  // A single non-finite operand here writes NaN into the vertex buffer, and a NaN
  // vertex gives a NaN bounding sphere, and a NaN bounding sphere makes the organ
  // permanently unpickable with no error anywhere. Refuse the whole operation.
  if (!Array.isArray(centre) || centre.length < 3) return;
  if (!Number.isFinite(centre[0]) || !Number.isFinite(centre[1]) || !Number.isFinite(centre[2])) return;
  if (!Number.isFinite(radius) || radius <= 0 || !Number.isFinite(amount)) return;
  const r2 = radius * radius;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const dx = x - centre[0], dy = y - centre[1], dz = z - centre[2];
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r2) continue;
    const f = 0.5 + 0.5 * Math.cos(Math.sqrt(d2 / r2) * Math.PI);   // 1 at centre -> 0 at rim
    const w = amount * f;
    pos.setXYZ(i, x + nrm.getX(i) * w, y + nrm.getY(i) * w, z + nrm.getZ(i) * w);
  }
  PAT_seal(geo);
}

/* ---- nodularity ------------------------------------------------------------
 * Discrete surface nodules (granulomas, calcific heaps, the coarse grain of a
 * cirrhotic-style capsule) rather than general lumpiness. The trick is the
 * THRESHOLD: take fbm, subtract a floor, clamp at zero. Below the floor the
 * surface is untouched and stays smooth; above it a nodule rises. General
 * displacement gives you a lumpy potato; thresholded displacement gives you an
 * organ studded with discrete masses, which is what a granulomatous organ is. */
function PAT_nodulate(THREE, geo, amp, freq, threshold, seed) {
  if (!geo || !geo.attributes) return;
  const pos = geo.attributes.position, nrm = geo.attributes.normal;
  if (!pos || !nrm) return;
  // Same NaN contract as PAT_regionDeform — see the note there.
  if (!Number.isFinite(amp) || !Number.isFinite(freq) || !Number.isFinite(threshold)) return;
  if (amp === 0) return;
  const inv = 1 / Math.max(1e-3, 1 - threshold);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = PAT_fbm(x * freq + seed, y * freq + seed * 1.7, z * freq + seed * 0.4);
    const t = Math.max(0, n - threshold) * inv;
    if (t <= 0) continue;
    const w = amp * Math.pow(t, 0.7);
    pos.setXYZ(i, x + nrm.getX(i) * w, y + nrm.getY(i) * w, z + nrm.getZ(i) * w);
  }
  PAT_seal(geo);
}

/* THE trap this codebase has already paid for once. Raycaster does a bounding-
 * SPHERE rejection before it looks at a single triangle, so mutating vertices
 * without recomputing bounds makes the organ silently unpickable — no error, no
 * warning, hover just stops working on the one organ you diseased. Never edit
 * vertices in this file without coming through here. */
function PAT_seal(geo) {
  if (!geo || !geo.attributes || !geo.attributes.position) return;
  geo.attributes.position.needsUpdate = true;
  geo.computeVertexNormals();                    // this sets normal.needsUpdate itself
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  // Last line of defence. If anything upstream let a NaN through, the sphere is
  // NaN and every raycast against this organ silently misses forever. Say so
  // loudly and leave a finite (if wrong) sphere, so hover still works.
  const bs = geo.boundingSphere;
  if (bs && !Number.isFinite(bs.radius)) {
    console.warn('pathology: non-finite bounding sphere after vertex write; picking would break');
    bs.center.set(0, 0, 0);
    bs.radius = 1;
  }
}

/* ---- surface sampling ------------------------------------------------------
 * Pick well-spaced points on an organ's surface, optionally restricted by a
 * predicate on the local-space vertex (used to put vegetations on a valve's line
 * of closure, plaques on the proximal segment of an artery, and petechiae on the
 * ventral skin only). Greedy minimum-distance rejection keeps them from clumping
 * into one blob. Deterministic — see PAT_rng. */
function PAT_surfacePoints(THREE, geo, count, minDist, pick, seed) {
  if (!geo || !geo.attributes) return [];
  const pos = geo.attributes.position, nrm = geo.attributes.normal;
  if (!pos) return [];
  const rnd = PAT_rng(seed);
  const cand = [];
  const stride = Math.max(1, Math.floor(pos.count / 900));
  for (let i = 0; i < pos.count; i += stride) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (pick && !pick(x, y, z)) continue;
    cand.push([x, y, z, nrm ? nrm.getX(i) : 0, nrm ? nrm.getY(i) : 1, nrm ? nrm.getZ(i) : 0]);
  }
  // Shuffle deterministically so the accepted set is spread over the whole
  // eligible surface instead of marching along the geometry's vertex order.
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = cand[i]; cand[i] = cand[j]; cand[j] = t;
  }
  const out = [], md2 = minDist * minDist;
  for (const c of cand) {
    if (out.length >= count) break;
    let ok = true;
    for (const o of out) {
      const dx = c[0] - o[0], dy = c[1] - o[1], dz = c[2] - o[2];
      if (dx * dx + dy * dy + dz * dz < md2) { ok = false; break; }
    }
    if (ok) out.push(c);
  }
  return out;
}

/* An irregular little mass: granuloma, vegetation, calcific heap, thrombus.
 * `flat` squashes it into a plaque/flake (sloughing skin, atheromatous plaque
 * raised into a lumen); `friable` cranks the irregularity, because the single
 * most useful gross descriptor of an infective vegetation is that it is friable
 * and crumbles — a smooth bead would teach the wrong thing. */
function PAT_stud(THREE, r, hex, o, seed) {
  o = o || {};
  if (!Number.isFinite(r) || r <= 0) r = 0.1;
  const g = new THREE.SphereGeometry(r, o.seg || 14, o.seg2 || 10);
  const pos = g.attributes.position;
  const amp = o.friable ? 0.42 : 0.16;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = PAT_fbm(x * 5.5 + seed, y * 5.5 + seed * 1.4, z * 5.5 + seed * 0.6) - 0.5;
    const s = 1 + n * amp * 2;
    pos.setXYZ(i, x * s, y * s, z * s);
  }
  if (o.flat) g.scale(1, 0.28, 1);
  PAT_seal(g);
  const m = new THREE.Mesh(g, PAT_mat(THREE, hex, o.mat || {}));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/* ========================================================================== *
 * THE CASES
 *
 * Each case is data + a build function. `diagnosis` and `mechanism` are the
 * answer and are only ever released through findings() — the tutor's marking
 * scheme — never through list(), vignette() or a part note.
 * ========================================================================== */

const PAT_CASES = [

  /* ---------------------------------------------------------------- HEART -- */

  {
    id: 'mi-24h', specimen: 'heart', system: 'circulatory',
    label: '58 M · crushing chest pain, 26 hours',
    diagnosis: 'Acute myocardial infarction, approximately 24 hours old, in the territory of the left anterior descending artery.',
    vignette: {
      age: 58, sex: 'male',
      presentation: 'Twenty-six hours of crushing central chest pain radiating to the left jaw and arm, with sweating and nausea. It began while he was clearing snow and never fully settled.',
      history: 'Thirty pack-years. Treated hypertension, poorly adherent. Father died suddenly at 55. He did not call an ambulance on the first day.',
      examination: 'Found collapsed at home the following evening. Resuscitation was unsuccessful.',
      prompt: 'Open the pericardium, inspect the epicardial surface and the coronary arteries, then open the ventricles. Describe what you find and state how old the lesion is.',
    },
    mechanism: 'Thrombosis on a ruptured atheromatous plaque in the proximal LAD occluded the vessel, producing coagulative necrosis throughout its territory — the anterior left ventricular wall, the apex and the anterior two-thirds of the interventricular septum. The critical teaching point is TIME: for the first 4–12 hours there is NOTHING to see with the naked eye, and at 12–24 hours only dark mottling. This is why an early infarct is demonstrated with triphenyltetrazolium chloride, which stains viable dehydrogenase-containing myocardium brick red and leaves the infarct unstained and pale. A student who reports "a pale yellow patch" at 24 hours has read the timeline wrong by four days.',
    findings: [
      { partId: 'lv-free-wall', finding: 'Anterior wall and apex show ill-defined DARK MOTTLING with subtle loss of the normal sheen. No yellow discolouration, no softening you can be confident of, no scar. Wall thickness is normal.' },
      { partId: 'septum', finding: 'The anterior part of the interventricular septum is mottled in continuity with the anterior wall — the LAD supplies the anterior two-thirds of the septum.' },
      { partId: 'lad', finding: 'Proximal LAD is occluded: a firm plug fills the lumen at a yellow intimal plaque.' },
      { partId: 'pericardium', finding: 'PERTINENT NEGATIVE — the pericardium is smooth and glistening. Fibrinous pericarditis over an infarct does not appear until day 2–3.', negative: true },
      { partId: 'rca', finding: 'PERTINENT NEGATIVE — the right coronary artery and circumflex are patent. A single-vessel event.', negative: true },
    ],
    histology: {
      'lv-free-wall': 'myocardium-coagulative-early',
      septum: 'myocardium-coagulative-early',
      lad: 'artery-thrombus-on-plaque',
    },
    build: (fx) => {
      // LAD territory: anterior LV wall carried down onto the apex. Two nested
      // patches — a broader darker mottle over a slightly duskier core — because
      // a 24 h infarct is blotchy, not a clean geographic block.
      fx.patch('lv-free-wall', [-0.5, -0.7, 2.0], 2.05, 0x5b3b36, { lift: 0.026, seed: 3, rough: 0.7, clear: 0.24 });
      fx.patch('lv-free-wall', [-0.55, -1.1, 1.9], 1.25, 0x4d3230, { lift: 0.042, seed: 11, rough: 0.74, clear: 0.2 });
      fx.patch('septum', [0, 0.6, -1.35], 1.35, 0x573934, { lift: 0.03, seed: 7, rough: 0.7, clear: 0.24, side: 'double' });
      // The occlusion itself: a short pale-yellow swelling on the proximal LAD.
      fx.studs('lad', { count: 1, size: 0.15, color: 0xd9c37a, minDist: 0.4, seed: 21,
                        pick: (x, y) => y > 1.9, mat: { rough: 0.62, clear: 0.2 } });
      fx.observe('lv-free-wall', 'Over the front of this wall and down onto the apex the muscle is dark and blotchy and has lost its shine. It is not yet soft and it is not yellow.');
      fx.observe('septum', 'The front part of the septum is mottled in continuity with the wall in front of it.');
      fx.observe('lad', 'A firm plug fills the lumen a short way down from the origin, at a raised yellow patch in the wall.');
    },
  },

  {
    id: 'mi-7d', specimen: 'heart', system: 'circulatory',
    label: '71 F · six days after a late-presenting infarct, sudden collapse',
    diagnosis: 'Myocardial infarction 5–7 days old in the right coronary territory, complicated by free-wall rupture and haemopericardium (cardiac tamponade).',
    vignette: {
      age: 71, sex: 'female',
      presentation: 'Admitted six days ago with an inferior ST-elevation infarct. She had waited two days before coming in, so reperfusion was never attempted. She had been recovering on the ward.',
      history: 'Type 2 diabetes for eighteen years — her infarct pain was atypical and mild, which is why she waited.',
      examination: 'This morning she became suddenly hypotensive with a raised jugular venous pressure and muffled heart sounds, and arrested in pulseless electrical activity within minutes.',
      prompt: 'Open the pericardial sac first and note its contents before you touch the heart. Then find the lesion, age it, and explain the terminal event.',
    },
    mechanism: 'Days 3–7 are the softest the infarcted wall ever is. Neutrophils and then macrophages have digested the dead myocytes, but granulation tissue has not yet laid down collagen — so the necrotic segment has lost its old strength and not yet gained its new one. This is the peak window for the three mechanical catastrophes of infarction: free-wall rupture (tamponade, as here), papillary muscle rupture (acute mitral regurgitation) and septal rupture (acute left-to-right shunt). The hyperaemic rim is granulation tissue with its new capillaries growing in from the viable edge — the border is where healing is happening.',
    findings: [
      { partId: 'lv-free-wall', finding: 'Inferior wall bears a sharply demarcated SOFT, YELLOW-TAN area with a HYPERAEMIC DARK RED BORDER. The centre gives under the finger and bulges. A slit-like tear runs full thickness through it.' },
      { partId: 'pericardium', finding: 'The pericardial sac is tense and filled with blood and clot — haemopericardium. This, not the infarct itself, killed her.' },
      { partId: 'rca', finding: 'Occlusion of the mid right coronary artery — the inferior wall and posterior septum are RCA territory.' },
      { partId: 'posterior-iv-branch', finding: 'The posterior interventricular branch beyond the occlusion is empty and collapsed.' },
      { partId: 'lv-free-wall', finding: 'AGEING THE LESION: yellow-tan with a hyperaemic rim = 5–7 days. Not the dark mottling of day 1, not the grey-white scar of two months.' },
    ],
    histology: {
      'lv-free-wall': 'myocardium-macrophage-granulation',
      pericardium: 'pericardium-haemorrhagic',
      rca: 'artery-thrombus-on-plaque',
    },
    build: (fx) => {
      // Hyperaemic border laid down first and wider; the yellow-tan necrotic
      // centre sits on top of it with more lift, so the rim reads as a ring.
      fx.patch('lv-free-wall', [-0.45, -1.5, -1.7], 1.62, 0x7d201c, { lift: 0.026, seed: 5, rough: 0.52, clear: 0.5 });
      fx.patch('lv-free-wall', [-0.45, -1.5, -1.7], 1.12, 0xbfa055, { lift: 0.05, seed: 5, rough: 0.72, clear: 0.16 });
      // Softening bulges outward, and the rupture tract runs through the centre.
      fx.bulge('lv-free-wall', [-0.45, -1.5, -1.7], 1.5, 0.14);
      fx.blob('lv-free-wall', [-0.62, -1.62, -2.1], 0.2, 0x1a0708, { flat: true, seed: 33, rot: [0.5, 0.3, 1.1],
              scale: [2.4, 1, 0.35], mat: { rough: 0.9, clear: 0 } });
      // The sac is full of blood: darken it and take away its transparency.
      fx.tint('pericardium', 0x5e1b1c, { opacity: 0.72, transmission: 0.06, rough: 0.42, clear: 0.35 });
      fx.scale('pericardium', 1.07, 1.05, 1.09);
      fx.observe('pericardium', 'The sac is tense. It is full of dark fluid and soft clot, and the heart inside it is compressed.');
      fx.observe('lv-free-wall', 'Low on the back of this wall the muscle is soft, yellow-tan and sharply outlined, ringed by a band of dark red. The centre gives under the probe and a slit runs right through it.');
      fx.observe('rca', 'The vessel is firm and cord-like from the middle of its course onward, and the branch beyond is empty.');
    },
  },

  {
    id: 'mi-old', specimen: 'heart', system: 'circulatory',
    label: '66 M · "heart attack two summers ago", now breathless on one flight',
    diagnosis: 'Healed (remote) anterior myocardial infarction with a true left ventricular aneurysm and mural thrombus.',
    vignette: {
      age: 66, sex: 'male',
      presentation: 'Breathless climbing a single flight of stairs; ankles swell by evening; sleeps on three pillows.',
      history: 'A large anterior infarct two summers ago, treated late. An echocardiogram this spring reported a big akinetic anterior segment. Last year he had a stroke affecting his right arm, and no source was ever found.',
      examination: 'A displaced, diffuse apex beat. He died of progressive heart failure.',
      prompt: 'Find the old lesion. Judge the wall thickness there against the wall elsewhere. Then explain his stroke.',
    },
    mechanism: 'By two months the granulation tissue of a healing infarct has matured into dense collagen. Collagen is strong in tension but cannot contract — so the segment is permanently akinetic. Under systolic pressure it thins and stretches (Laplace: wall stress rises as the radius grows and the thickness falls, which drives further thinning) until it bulges as a true aneurysm, with all layers still present and the neck wide. Blood stagnates in that dyskinetic pouch, satisfying two of Virchow\'s three requirements at once — stasis and endothelial injury — so laminated mural thrombus forms on its lining and embolises into the systemic circulation. That is his stroke.',
    findings: [
      { partId: 'lv-free-wall', finding: 'Anterior wall and apex replaced by a firm, GREY-WHITE, glistening fibrous scar. The wall there is markedly THINNED against the normal wall elsewhere, and it BULGES outward — a true aneurysm.' },
      { partId: 'lv-free-wall', finding: 'A laminated red-brown MURAL THROMBUS is adherent to the endocardial surface within the aneurysm. This is the embolic source for his stroke.' },
      { partId: 'lad', finding: 'Proximal LAD occluded and recanalised — a firm, cord-like segment with a narrow channel through it.' },
      { partId: 'left-atrium', finding: 'Enlarged, from chronically raised left ventricular filling pressure.' },
      { partId: 'lv-free-wall', finding: 'AGEING THE LESION: grey-white, firm, thinned, contracted = months to years. There is no yellow and no hyperaemic rim left.' },
    ],
    histology: {
      'lv-free-wall': 'myocardium-scar',
      lad: 'artery-recanalised',
    },
    build: (fx) => {
      // An aneurysm is a BULGE **and** a THINNING, and reporting only the bulge is
      // the commonest student error — so both have to be legible on the specimen.
      // The bulge is geometry. The thinning cannot be: this ventricle is modelled
      // as a single lathed SURFACE, so there is no inner wall to move and no
      // thickness to reduce. It is carried instead on the material, which is how
      // you actually read a thin aneurysm sac at the bench — a thinned, collagenous
      // wall TRANSILLUMINATES, and in a real specimen you can see the mural
      // thrombus as a shadow through it. Hence transmission on the scar and none
      // on the myocardium around it: the difference between the two IS the sign.
      // Deform before patching so the lesion skin is cut from the deformed surface.
      fx.bulge('lv-free-wall', [-0.5, -0.8, 1.95], 1.9, 0.22);
      fx.bulge('lv-free-wall', [-0.52, -1.0, 1.9], 0.95, 0.12);   // dyskinetic dome at the centre
      // Fibrous scar: grey-white, and crucially NOT wet — collagen is glistening
      // but matte-dense, so roughness up and the wet clearcoat comes off. Getting
      // the sheen wrong is what makes CG scar tissue look like painted muscle.
      fx.patch('lv-free-wall', [-0.5, -0.8, 1.95], 1.85, 0xc9c4b6,
               { lift: 0.03, seed: 9, rough: 0.66, clear: 0.18, clearRough: 0.6,
                 transmission: 0.1, thickness: 0.28, sheen: 0xf0ece2 });
      fx.patch('lv-free-wall', [-0.55, -1.4, 1.75], 0.95, 0xd6d1c2,
               { lift: 0.05, seed: 17, rough: 0.62, clear: 0.15, transmission: 0.2, thickness: 0.18 });
      // Laminated mural thrombus on the endocardial side of the aneurysm — found
      // only once the ventricle is opened, which is exactly right. Pushed out to
      // sit AGAINST the wall: a mural thrombus is adherent to the endocardium, and
      // one floating in mid-cavity would be a ball thrombus, a different lesion.
      fx.blob('lv-free-wall', [-0.68, -1.2, 1.55], 0.55, 0x4a1f1c,
              { seed: 41, scale: [1.5, 1.35, 0.6], mat: { rough: 0.78, clear: 0.12, transmission: 0 } });
      fx.tint('lad', 0xb8a184, { rough: 0.66, clear: 0.2 });
      fx.scale('left-atrium', 1.22, 1.16, 1.22);
      fx.observe('lv-free-wall', 'The front of this wall and the apex are grey-white, firm and puckered, and thinner than the wall behind. The area bulges outward and does not move with the rest. On the inside face a layered red-brown mass is stuck to the lining.');
      fx.observe('lad', 'The proximal vessel is a firm pale cord with only a narrow channel through it.');
    },
  },

  {
    id: 'cad-atheroma', specimen: 'heart', system: 'circulatory',
    label: '62 M · tight chest pain walking uphill, relieved by rest',
    diagnosis: 'Severe three-vessel coronary atherosclerosis causing stable angina — demand ischaemia without infarction.',
    vignette: {
      age: 62, sex: 'male',
      presentation: 'Two years of tight retrosternal pain, reproducibly brought on by walking uphill or hurrying after a meal, easing within two or three minutes of stopping. Glyceryl trinitrate relieves it.',
      history: 'Total cholesterol 7.8 mmol/L. Forty pack-years. Type 2 diabetes. Never had a rise in troponin.',
      examination: 'He died of an unrelated cause. This heart is being examined for the coronary arteries.',
      prompt: 'Trim the epicardial fat, then cut the coronaries transversely at 3 mm intervals and lay the slices out. Estimate the worst cross-sectional narrowing. Then examine the myocardium.',
    },
    mechanism: 'Lipid accumulates in the intima and is walled off under a fibrous cap. The plaque grows outward first (Glagov remodelling) and only later encroaches on the lumen. Once about 75% of the cross-sectional area is lost, coronary flow reserve is exhausted: resting flow is still adequate, but flow cannot rise to meet demand. Hence pain at a reproducible workload, relieved by rest — stable angina is DEMAND ischaemia, and it produces no necrosis. The crucial negative in this case is that the muscle is normal. Infarction requires plaque RUPTURE and thrombosis, which is a different event from stenosis.',
    findings: [
      { partId: 'lad', finding: 'Firm, raised YELLOW intimal plaques along the proximal and mid vessel. On transverse section the lumen is an eccentric narrow crescent — well over 75% of the cross-sectional area is lost.' },
      { partId: 'rca', finding: 'Similar yellow plaques with moderate to severe narrowing.' },
      { partId: 'circumflex', finding: 'Plaques with moderate narrowing.' },
      { partId: 'lv-free-wall', finding: 'PERTINENT NEGATIVE — the myocardium is uniformly dark red-brown. No mottling, no yellow softening, no scar. There has been no infarct.', negative: true },
      { partId: 'epicardial-fat', finding: 'The coronaries are buried in this fat. Trim it carefully — the classic novice error is to sever the vessel you came to examine.' },
    ],
    histology: {
      lad: 'artery-atheroma',
      rca: 'artery-atheroma',
      circumflex: 'artery-atheroma',
    },
    build: (fx) => {
      // Plaques as flattened yellow studs raised into the wall of each vessel.
      [['lad', 6, 22], ['rca', 5, 23], ['circumflex', 4, 24]].forEach(([id, n, seed]) => {
        fx.studs(id, { count: n, size: 0.105, color: 0xdcc47e, minDist: 0.42, seed,
                       flat: true, mat: { rough: 0.6, clear: 0.22, transmission: 0 } });
        fx.tint(id, 0xc26050, { rough: 0.56 });
      });
      // The pathologist's bench: transverse slices of each vessel laid out in a
      // row. Cheap to build and it is exactly how coronary disease is DEMONSTRATED
      // — you cannot judge a stenosis from the outside of an artery, and the whole
      // point of this case is that the student cuts across rather than eyeballing.
      // The labels are load-bearing, not decoration: three unlabelled discs
      // presented as three different vessels teaches nothing, and the residual
      // lumen only means something once you know which artery you are looking at.
      fx.cutFace('lad', [3.05, 1.5, 1.9], 0.34, 0.10, [-0.05, 0.05], 'LAD');
      fx.cutFace('lad', [3.05, 0.6, 1.9], 0.30, 0.13, [0.06, -0.04], 'RCA');
      fx.cutFace('lad', [3.05, -0.3, 1.9], 0.27, 0.15, [-0.03, -0.06], 'Cx');
      fx.observe('lad', 'Firm, raised, pale yellow patches sit in the wall along most of its length. Cut across it: the channel left open is a narrow off-centre crescent.');
      fx.observe('rca', 'Firm pale yellow patches in the wall; the vessel does not flatten under the forceps the way a healthy artery does.');
      fx.observe('circumflex', 'Scattered raised yellow patches in the wall.');
      fx.observe('lv-free-wall', 'The muscle is an even dark red-brown throughout. Nothing here is mottled, soft, yellow or white.');
    },
  },

  {
    id: 'rheumatic-ms', specimen: 'heart', system: 'circulatory',
    label: '43 F · twenty years of worsening breathlessness, now coughing blood',
    diagnosis: 'Chronic rheumatic mitral stenosis with a "fish-mouth" valve, left atrial dilatation and secondary pulmonary hypertension.',
    vignette: {
      age: 43, sex: 'female',
      presentation: 'Twenty years of slowly worsening breathlessness, now unable to lie flat, with episodes of coughing up blood. In atrial fibrillation.',
      history: 'Aged eleven, in a region where penicillin was hard to get, she had a feverish illness with a rash and painful joints that migrated from knee to elbow to wrist over a fortnight.',
      examination: 'A tapping apex beat, a loud first heart sound, an opening snap and a rumbling mid-diastolic murmur at the apex. Malar flush.',
      prompt: 'Open the left atrium from behind and look down onto the mitral valve from above. Then cut into the left ventricle and examine the chordae and the papillary muscles. Compare the thickness of the left ventricular wall with normal.',
    },
    mechanism: 'Group A streptococcal pharyngitis provokes antibodies against the M protein that cross-react with cardiac myosin and valve glycoproteins — molecular mimicry. Repeated attacks of valvulitis over decades heal by fibrosis, neovascularisation and calcification. The result is the triad that defines rheumatic mitral disease: commissural FUSION, leaflet THICKENING and chordal SHORTENING AND FUSION, converting the valve into a rigid funnel with a fixed slit orifice — the "fish-mouth" or "buttonhole" valve. The obstruction is at the valve, so the pressure load falls UPSTREAM: the left atrium dilates (hence atrial fibrillation and appendage thrombus), pulmonary venous pressure rises (hence orthopnoea and haemoptysis from ruptured bronchial venules), and eventually the right ventricle hypertrophies. The left ventricle is protected and stays normal — a finding that surprises students and is the key to the diagnosis.',
    findings: [
      { partId: 'mitral-leaflet', finding: 'Cusps grossly THICKENED, rigid and opaque, FUSED at the commissures. The orifice is a fixed narrow slit — the "fish-mouth" valve. Viewed from the atrium it will not open.' },
      { partId: 'chordae-1', finding: 'Chordae tendineae THICKENED, SHORTENED and fused into sheets, tethering the leaflets down toward the papillary muscles. The valve is a funnel, not a curtain.' },
      { partId: 'left-atrium', finding: 'Grossly DILATED with a thickened, opaque endocardium. Look in the appendage for thrombus — she is in atrial fibrillation.' },
      { partId: 'left-auricle', finding: 'Dilated; thrombus within it.' },
      { partId: 'lv-free-wall', finding: 'PERTINENT NEGATIVE — left ventricular wall thickness and cavity size are NORMAL. The stenosis protects the left ventricle; the load is all upstream.', negative: true },
      { partId: 'rv-free-wall', finding: 'Right ventricle hypertrophied — secondary pulmonary hypertension.' },
      { partId: 'pulmonary-trunk', finding: 'Dilated pulmonary trunk.' },
    ],
    histology: {
      'mitral-leaflet': 'valve-rheumatic',
      'chordae-1': 'valve-rheumatic',
      'left-atrium': 'endocardium-fibroelastosis',
    },
    build: (fx) => {
      // Thickened, opaque, rigid leaflets drawn down into a funnel: taller skirt,
      // creamy-grey, transmission off (a healthy leaflet is translucent when held
      // to the light and a rheumatic one is not — that is a real bench test).
      fx.scale('mitral-leaflet', 1.16, 1.42, 1.16);
      fx.move('mitral-leaflet', 0, -0.26, 0);
      fx.tint('mitral-leaflet', 0xd9d0bd, { rough: 0.7, clear: 0.2, clearRough: 0.55, transmission: 0, opacity: 1 });
      fx.nodular('mitral-leaflet', { amp: 0.05, freq: 7, threshold: 0.42, seed: 12 });
      // The fish-mouth orifice: a dark slit where a wide oval opening should be.
      // It has to sit IN the plane of the leaflet's free edge and span nearly the
      // whole annulus, or it reads as a speck floating below the valve rather than
      // as "this is all that is left open". heartLeaflet() is a partial sphere of
      // radius 0.9 swept to 0.44*PI, so its rim lies at local y = 0.9*cos(79.2 deg)
      // ~ 0.17 with a radius of ~0.88 — the slit is placed and sized against that.
      fx.blob('mitral-leaflet', [0, 0.19, 0], 0.2, 0x120a08,
              { flat: true, seed: 51, scale: [4.0, 1, 0.55], mat: { rough: 0.9, clear: 0 } });
      // Chordae: thickened and SHORTENED. Scaling a cord's own long axis shortens
      // it about its midpoint, which pulls both the leaflet edge and the muscle
      // tip together — precisely the tethering that makes the valve a funnel.
      for (let i = 1; i <= 5; i++) {
        fx.scale('chordae-' + i, 2.4, 0.62, 2.4);
        fx.tint('chordae-' + i, 0xd4c9b2, { rough: 0.72, clear: 0.15, transmission: 0 });
      }
      fx.scale('left-atrium', 1.62, 1.44, 1.62);
      fx.tint('left-atrium', 0x8a6b60, { rough: 0.66, clear: 0.28 });
      fx.scale('left-auricle', 1.5, 1.35, 1.5);
      fx.blob('left-auricle', [0, -0.1, -0.1], 0.3, 0x3d1a1a, { seed: 53, scale: [1.3, 0.9, 1.5] });
      fx.scale('rv-free-wall', 1.1, 1.0, 1.1);
      fx.tint('rv-free-wall', 0x7b4f45, { rough: 0.6 });
      fx.scale('pulmonary-trunk', 1.32, 1.0, 1.32);
      fx.observe('mitral-leaflet', 'The cusps are thick, stiff, opaque and stuck together at their corners. What should be a wide oval opening is a narrow slit that will not admit a fingertip.');
      fx.observe('chordae-1', 'The cords are thick, short and matted into sheets, holding the cusps down toward the muscle.');
      fx.observe('left-atrium', 'This chamber is far larger than it should be, and its lining is thickened and opaque.');
      fx.observe('lv-free-wall', 'This wall measures the same as a normal heart of this size. It is neither thickened nor thinned.');
    },
  },

  {
    id: 'endocarditis', specimen: 'heart', system: 'circulatory',
    label: '34 · ten days of fever and night sweats, new murmur',
    diagnosis: 'Acute infective endocarditis of the tricuspid valve (Staphylococcus aureus), with septic pulmonary emboli.',
    vignette: {
      age: 34, sex: 'male',
      presentation: 'Ten days of fever to 39.5 °C with drenching night sweats and weight loss, then pleuritic chest pain and breathlessness. A new loud murmur was heard on admission.',
      // Given data, deliberately one step short of the answer: the student is told
      // what grew and has to recognise it, rather than being handed the organism.
      history: 'Injects heroin into femoral veins. Three separate sets of blood cultures, taken hours apart from different sites, all grew the same Gram-positive coccus in clusters. The chest film showed multiple round shadows scattered through both lung fields.',
      examination: 'Large v waves in the jugular venous pulse and a pansystolic murmur at the left sternal edge that got louder on inspiration.',
      prompt: 'Open the right atrium and inspect the tricuspid valve from above, along its line of closure. Then look at the left-sided valves. Explain why the emboli went to his lungs and not his brain.',
    },
    mechanism: 'Bacteraemia seeds a valve, and platelets and fibrin build a vegetation over the organisms. Staphylococcus aureus is virulent enough to infect a PREVIOUSLY NORMAL valve, unlike viridans streptococci, which need pre-existing endothelial damage — which is why acute staphylococcal endocarditis presents in days rather than months. Injected material and organisms enter a peripheral vein, so the FIRST valve they meet is the tricuspid: right-sided endocarditis is the intravenous drug user\'s pattern. The vegetations sit on the LINE OF CLOSURE on the atrial surface, where the leaflets meet and the shear is highest. They are avascular, so antibiotics reach them poorly and treatment takes weeks; they are friable, so they crumble and embolise — and because they are on the right side of the heart, the emboli lodge in the LUNGS, giving septic infarcts and abscesses rather than stroke.',
    findings: [
      { partId: 'tricuspid-leaflet', finding: 'Bulky, irregular, red-tan VEGETATIONS along the LINE OF CLOSURE on the atrial surface of the leaflets. They are FRIABLE — they crumble when touched. One leaflet is PERFORATED beneath a vegetation.' },
      { partId: 'right-atrium', finding: 'Dilated; the endocardium behind the valve shows a satellite vegetation where the regurgitant jet strikes it.' },
      { partId: 'pulmonary-trunk', finding: 'Fragments of vegetation in the pulmonary trunk — the route to the septic pulmonary emboli seen on his chest film.' },
      { partId: 'mitral-leaflet', finding: 'PERTINENT NEGATIVE — the mitral and aortic valves are clean. Right-sided disease is the injecting drug user\'s pattern and explains why he had lung lesions and not a stroke.', negative: true },
      { partId: 'rv-free-wall', finding: 'Dilated right ventricle from acute severe tricuspid regurgitation.' },
    ],
    histology: {
      'tricuspid-leaflet': 'valve-vegetation',
      'pulmonary-trunk': 'artery-septic-embolus',
    },
    build: (fx) => {
      // Vegetations on the line of closure: the free-edge rim of the leaflet skirt.
      // The leaflet is a partial sphere rotated by PI, so its rim sits at low local
      // y — hence the pick predicate. `friable` cranks the surface irregularity,
      // because friability is the single most useful descriptor of a vegetation.
      fx.studs('tricuspid-leaflet', { count: 7, size: 0.13, color: 0x9c5240, minDist: 0.17, seed: 31,
        friable: true, pick: (x, y) => y < 0.26,
        mat: { rough: 0.82, clear: 0.1, transmission: 0 } });
      fx.tint('tricuspid-leaflet', 0xdcc9b4, { rough: 0.6, clear: 0.25, transmission: 0.12 });
      // Perforation under a vegetation: a dark hole in the leaflet BODY (not at the
      // edge — a perforation is destruction of the cusp substance, which is what
      // makes the regurgitation severe and irreversible). Pushed out to the shell
      // radius (0.72) and aligned to the local surface, or it is buried inside the
      // cup and invisible.
      fx.blob('tricuspid-leaflet', [0.23, 0.53, 0.43], 0.09, 0x0e0808,
              { flat: true, align: true, seed: 61, mat: { rough: 0.95, clear: 0 } });
      fx.scale('right-atrium', 1.3, 1.2, 1.3);
      // Satellite ("jet") lesion on the atrial endocardium where the regurgitant
      // stream strikes — on the surface, not floating inside the chamber.
      fx.blob('right-atrium', [-0.82, -0.28, 0.76], 0.13, 0x9c5240,
              { friable: true, align: true, seed: 63 });
      fx.scale('rv-free-wall', 1.12, 1.0, 1.12);
      fx.studs('pulmonary-trunk', { count: 2, size: 0.09, color: 0x8e4c3c, minDist: 0.5, seed: 65, friable: true });
      fx.observe('tricuspid-leaflet', 'Bulky irregular red-tan masses sit along the edge where the cusps meet, on the side facing the atrium. They crumble under the forceps, and there is a hole in the cusp beneath one of them.');
      fx.observe('right-atrium', 'The chamber is dilated, and there is a small satellite mass on the lining opposite the valve.');
      fx.observe('mitral-leaflet', 'These cusps are thin, translucent and clean along their whole line of closure.');
    },
  },

  {
    id: 'dcm', specimen: 'heart', system: 'circulatory',
    label: '29 M · six months of breathlessness and swollen ankles, EF 18%',
    diagnosis: 'Dilated cardiomyopathy (alcohol-related, on a probable familial background) with apical mural thrombus.',
    vignette: {
      age: 29, sex: 'male',
      presentation: 'Six months of progressive breathlessness, orthopnoea and ankle swelling. Ejection fraction 18% on echocardiography, with global hypokinesia.',
      history: 'Drinks around a bottle of spirits a day for eight years. His brother died suddenly at 34 and was never investigated. ECG shows left bundle branch block.',
      examination: 'Displaced, diffuse apex beat; third heart sound; a soft pansystolic murmur at the apex that was not there a year ago.',
      prompt: 'Weigh the heart and look at its SHAPE before you cut. Then open all four chambers, and measure the wall thickness. Examine the coronary arteries and the valves before you commit to a mechanism.',
    },
    mechanism: 'Diffuse myocyte injury — ethanol and acetaldehyde toxicity here, on a background that in a third of cases is genetic (titin truncations, lamin A/C) — impairs contraction. The ventricle dilates to preserve stroke volume by the Frank–Starling mechanism, but by Laplace\'s law wall stress rises with radius, so dilatation begets more dilatation. This is ECCENTRIC hypertrophy: sarcomeres are added in series, the heart is heavy (often over 600 g), yet the wall is normal or THIN, because all the added mass has gone into a bigger chamber rather than a thicker wall. The mitral and tricuspid leaflets are structurally normal but their annuli are stretched, giving FUNCTIONAL regurgitation — the murmur is a consequence of the dilatation, not its cause. Stagnant blood in the dilated apex forms mural thrombus. The two negatives that define the diagnosis are normal coronaries and normal valves.',
    findings: [
      { partId: 'lv-free-wall', finding: 'The heart is HEAVY and GLOBULAR — the normal cone is lost and the apex is rounded. The left ventricular cavity is dilated into a sphere and the wall is of normal thickness or THINNER than normal despite the weight.' },
      { partId: 'rv-free-wall', finding: 'Right ventricle also dilated with a thin wall — all four chambers are involved.' },
      { partId: 'left-atrium', finding: 'Dilated.' },
      { partId: 'right-atrium', finding: 'Dilated.' },
      { partId: 'lv-free-wall', finding: 'Laminated MURAL THROMBUS in the dilated apex.' },
      { partId: 'mitral-leaflet', finding: 'PERTINENT NEGATIVE — leaflets are thin, mobile and structurally normal. The regurgitation is functional, from a stretched annulus.', negative: true },
      { partId: 'lad', finding: 'PERTINENT NEGATIVE — coronary arteries are widely patent with no significant plaque. This is NOT ischaemic cardiomyopathy.', negative: true },
    ],
    histology: {
      'lv-free-wall': 'myocardium-dcm',
      'rv-free-wall': 'myocardium-dcm',
    },
    build: (fx) => {
      // Globular, not conical: widen in x/z and shorten in y, on both ventricles.
      // The silhouette change is the diagnosis here — a student should see it from
      // across the room, before touching the specimen.
      fx.scale('lv-free-wall', 1.3, 0.86, 1.3);
      fx.scale('rv-free-wall', 1.26, 0.9, 1.26);
      fx.tint('lv-free-wall', 0x7d5a50, { rough: 0.62, clear: 0.42 });
      fx.tint('rv-free-wall', 0x936a5c, { rough: 0.64, clear: 0.42 });
      // Round off the apex — the pointed apex of a normal heart is lost.
      fx.bulge('lv-free-wall', [-0.9, -3.3, 0.5], 1.3, 0.3);
      fx.scale('left-atrium', 1.4, 1.3, 1.4);
      fx.scale('right-atrium', 1.4, 1.3, 1.4);
      fx.scale('left-auricle', 1.25, 1.2, 1.25);
      fx.scale('right-auricle', 1.25, 1.2, 1.25);
      fx.blob('lv-free-wall', [-0.7, -2.5, 0.3], 0.5, 0x47201d,
              { seed: 71, scale: [1.4, 1.1, 1.2], mat: { rough: 0.78, clear: 0.12, transmission: 0 } });
      fx.observe('lv-free-wall', 'The whole heart is heavy and globe-shaped; the apex is rounded rather than pointed. This chamber is a dilated sphere and its wall is no thicker than normal — if anything thinner. A layered dark mass sits in the apex.');
      fx.observe('rv-free-wall', 'Dilated and thin-walled, like the left.');
      fx.observe('lad', 'The artery is soft, compressible and widely open along its whole length.');
      fx.observe('mitral-leaflet', 'The cusps themselves are thin, translucent and freely mobile. It is the ring they hang from that is stretched.');
    },
  },

  {
    id: 'aortic-stenosis', specimen: 'heart', system: 'circulatory',
    label: '79 F · blackouts on the stairs, harsh murmur to the carotids',
    diagnosis: 'Calcific (degenerative) aortic stenosis of a tricuspid valve, with concentric left ventricular hypertrophy.',
    vignette: {
      age: 79, sex: 'female',
      presentation: 'Two blackouts while climbing stairs, chest tightness on exertion, and increasing breathlessness over a year.',
      history: 'No rheumatic fever. Hypertension. Chronic kidney disease.',
      examination: 'A harsh crescendo–decrescendo systolic murmur at the right sternal edge radiating to both carotids, a slow-rising low-volume pulse, and a heaving, non-displaced apex beat.',
      prompt: 'Open the aorta down to the valve and look at the cusps from above. Count them, and check whether the commissures are fused. Then open the left ventricle and compare the wall thickness and the cavity size with the previous specimen.',
    },
    mechanism: 'Decades of mechanical stress on a normal three-cusped valve trigger an active, atherosclerosis-like process in the cusps — lipid entry, chronic inflammation, osteoblast-like differentiation of valve interstitial cells and dystrophic calcification. Heaped calcific masses pile onto the OUTFLOW surface of each cusp and stop it opening. The distinguishing feature from rheumatic disease is that the COMMISSURES ARE NOT FUSED: degenerative calcific stenosis stiffens cusps in place, whereas rheumatic disease glues their edges together. The ventricle must now generate a much higher pressure, so sarcomeres are added IN PARALLEL — CONCENTRIC hypertrophy, a thick wall around a small slit-like cavity (contrast the eccentric pattern of dilated cardiomyopathy, where mass goes into cavity size instead). The thick wall outgrows its own subendocardial blood supply, giving angina despite normal coronaries, and the fixed obstruction prevents cardiac output rising on exertion, giving exertional syncope.',
    findings: [
      { partId: 'aortic-cusp-1', finding: 'Heaped, rock-hard, chalky NODULAR CALCIFIC MASSES on the outflow surface of each of the three cusps, distorting and immobilising them. The cusps grate on the knife.' },
      { partId: 'aortic-cusp-2', finding: 'THE KEY DISCRIMINATOR — the commissures are NOT fused. Three separate cusps, each stiffened in place. Commissural fusion would mean rheumatic (or congenitally bicuspid) disease instead.' },
      { partId: 'lv-free-wall', finding: 'CONCENTRIC left ventricular hypertrophy: the wall is greatly thickened and the cavity is small and slit-like. Contrast the dilated, thin-walled pattern of a cardiomyopathy.' },
      { partId: 'papillary-a', finding: 'Papillary muscles hypertrophied and crowded into the small cavity.' },
      { partId: 'aorta', finding: 'Post-stenotic dilatation of the ascending aorta, where the high-velocity jet strikes the wall.' },
      { partId: 'lad', finding: 'PERTINENT NEGATIVE — coronaries only mildly atheromatous. Her angina came from a hypertrophied wall outgrowing its subendocardial supply.', negative: true },
    ],
    histology: {
      'aortic-cusp-1': 'valve-calcific',
      'aortic-cusp-2': 'valve-calcific',
      'aortic-cusp-3': 'valve-calcific',
      'lv-free-wall': 'myocardium-hypertrophy',
    },
    build: (fx) => {
      for (let i = 1; i <= 3; i++) {
        const id = 'aortic-cusp-' + i;
        fx.scale(id, 1.28, 1.15, 1.28);
        // Chalky: high roughness, no clearcoat, no transmission. Calcium is the
        // one thing in a heart that is NOT wet-looking, and reading that off the
        // specular response is how you spot it from across the bench.
        fx.tint(id, 0xe6e1d2, { rough: 0.88, clear: 0.06, clearRough: 0.8, transmission: 0, opacity: 1 });
        fx.nodular(id, { amp: 0.09, freq: 11, threshold: 0.4, seed: 80 + i });
        fx.studs(id, { count: 3, size: 0.075, color: 0xf0ece0, minDist: 0.17, seed: 84 + i,
                       mat: { rough: 0.9, clear: 0.05, transmission: 0 } });
        fx.observe(id, 'Hard, chalky, heaped-up masses sit on the upper surface of this cusp and hold it open. Its edges are free of the cusps beside it.');
      }
      // Concentric hypertrophy: a thicker wall, NOT a bigger chamber. Widening the
      // outer surface slightly while keeping the height reads as a thick, heavy,
      // non-dilated ventricle — the opposite silhouette to the dcm case, which is
      // the comparison the whole pair of cases exists to teach.
      fx.scale('lv-free-wall', 1.14, 1.0, 1.14);
      fx.tint('lv-free-wall', 0x63423b, { rough: 0.58, clear: 0.48 });
      fx.scale('papillary-a', 1.45, 1.1, 1.45);
      fx.scale('papillary-b', 1.45, 1.1, 1.45);
      fx.scale('aorta', 1.22, 1.0, 1.22);
      fx.observe('lv-free-wall', 'This wall is strikingly thick and firm, and the cavity inside it is a narrow slit. The muscle bundles on the inner surface are coarse and heaped.');
      fx.observe('aorta', 'The first part of the vessel, just beyond the valve, is wider than the rest.');
    },
  },

  /* ----------------------------------------------------------------- FROG -- */
  /* Real amphibian pathology, not human disease wearing a frog costume. Each
   * mechanism names the human counterpart explicitly, so the transferable
   * pathology (steatosis, granuloma, septicaemia, oedema) is still taught. */

  {
    id: 'chytrid', specimen: 'frog', system: 'integument',
    label: 'Wild adult · lethargic at a montane stream, sheds skin in sheets',
    diagnosis: 'Chytridiomycosis (Batrachochytrium dendrobatidis) — cutaneous infection causing fatal electrolyte disturbance.',
    vignette: {
      age: 'adult', sex: 'unknown',
      presentation: 'Found sitting in the open at the edge of a montane stream, lethargic, with the hind legs held away from the body. It would not right itself when turned over, and it was shedding skin in grey sheets.',
      history: 'This population has crashed over two breeding seasons. Several dead adults have been found at the water\'s edge; tadpoles are still present and appear healthy.',
      examination: 'Died overnight in a holding container. Body condition is good — this animal was not starving.',
      prompt: 'Examine the SKIN carefully, especially the ventrum, the pelvic drink patch and the toe webbing, before you make any incision. Then open the coelom and survey every organ. Report the negatives as carefully as the positives.',
    },
    mechanism: 'Batrachochytrium dendrobatidis colonises KERATINISED epidermis — in adults that is most of the skin, and in tadpoles only the keratinised mouthparts, which is exactly why the tadpoles in this pond are still alive while the adults are dying. Zoosporangia in the stratum corneum cause hyperkeratosis and disrupt cutaneous ion transport. Amphibian skin is an osmoregulatory organ, not just a covering: it takes up sodium and chloride from fresh water through the ventral pelvic patch. Blocked, plasma sodium and potassium fall, and the animal dies of asystolic cardiac arrest. The teaching point that makes this case worth doing is that the COELOM IS UNREMARKABLE. A student who opens the belly first and reports "no abnormality detected" has missed a disease that has driven amphibian species to extinction, because the entire lesion was in the skin they cut through to get there.',
    findings: [
      { partId: 'skin', finding: 'Excessive shedding — grey-white sheets of loosened epidermis lifting from the surface. The skin is THICKENED and roughened, has lost its normal wet gloss, and the ventral pelvic patch and toe webbing are reddened.' },
      { partId: 'frog-heart', finding: 'Arrested in diastole; no gross abnormality of the chambers themselves.' },
      { partId: 'liver-right', finding: 'PERTINENT NEGATIVE — normal dark red-brown, normal size, sharp edges.', negative: true },
      { partId: 'stomach', finding: 'PERTINENT NEGATIVE — normal, and there is food in the gut. This animal was eating until shortly before death.', negative: true },
      { partId: 'kidney-left', finding: 'PERTINENT NEGATIVE — normal.', negative: true },
      { partId: 'skin', finding: 'THE POINT OF THE CASE: the lesion is confined to keratinised skin. A normal coelom does not exclude a fatal disease.' },
    ],
    histology: {
      skin: 'skin-hyperkeratosis-bd',
    },
    build: (fx) => {
      // The skin loses its WETNESS. That is the single most telling change, and it
      // lives in the specular response rather than in colour: roughness up,
      // clearcoat down. Colour desaturates toward grey at the same time.
      fx.tint('skin', 0x8f9484, { rough: 0.86, clear: 0.12, clearRough: 0.75, transmission: 0.04 });
      fx.nodular('skin', { amp: 0.035, freq: 9, threshold: 0.46, seed: 91 });
      // Sloughing sheets lifting off the VENTRAL surface. frog.js builds the body
      // with +y ventral (belly cream at uy>0, eyes bulging at -y) and +z toward
      // the snout, and the pick predicate is in that local frame — so this is an
      // anatomical restriction, not a camera-facing one. Ventral is right on the
      // merits: the pelvic patch and ventrum carry the heaviest Bd burden.
      fx.studs('skin', { count: 14, size: 0.28, color: 0xcfcfc0, minDist: 0.85, seed: 93,
        flat: true, pick: (x, y) => y > 0.1,
        mat: { rough: 0.9, clear: 0.05, trans: true, opacity: 0.72, transmission: 0.3 } });
      // Reddened ventral pelvic drink patch — the osmoregulatory surface, and the
      // single most heavily colonised site on the animal.
      fx.patch('skin', [0, 0.75, -1.9], 1.5, 0x9c4a42, { lift: 0.012, seed: 95, rough: 0.8, clear: 0.15 });
      // Bd colonises KERATINISED epidermis, and the most heavily keratinised skin
      // on a frog is the hindfoot and toe webbing. Both the vignette and the
      // findings say the webbing is reddened, so the hindlimbs must show it —
      // they are separate parts and were previously left untouched and healthy.
      ['hindlimb-left', 'hindlimb-right'].forEach((id, i) => {
        fx.tint(id, 0x8d9482, { rough: 0.86, clear: 0.12, clearRough: 0.75 });
        fx.studs(id, { count: 5, size: 0.13, color: 0xcfcfc0, minDist: 0.6, seed: 96 + i,
                       flat: true, mat: { rough: 0.9, clear: 0.05, trans: true, opacity: 0.72, transmission: 0.3 } });
        fx.observe(id, 'Dull and roughened, with loosened grey-white skin lifting off it. The webbing between the toes is reddened.');
      });
      fx.observe('skin', 'The skin is dull, thickened and roughened, and grey-white sheets of it are lifting away. It has lost its wet shine. The underside over the hips and the webbing between the toes are reddened.');
      fx.observe('liver-right', 'Dark red-brown, normal size, edges sharp.');
      fx.observe('stomach', 'Normal, and it still contains food.');
    },
  },

  {
    id: 'red-leg', specimen: 'frog', system: 'circulatory',
    label: 'Captive · tank filter failed a week ago, found dead with a swollen belly',
    diagnosis: 'Aeromonas hydrophila septicaemia ("red-leg syndrome") with coelomic effusion and splenomegaly.',
    vignette: {
      age: 'adult', sex: 'female',
      presentation: 'Off food for three days, then sat listlessly in the shallows rather than on the land area. Found dead with a visibly swollen belly.',
      history: 'The filter on the group tank failed a week ago and was not noticed for four days; ammonia was high when it was finally tested. Two tank-mates died the same week with the same appearance.',
      examination: 'The underside of the body and the ventral surface of the thighs are diffusely red.',
      prompt: 'Note the colour of the ventral skin and thighs before you cut. Open the coelom carefully and record what escapes. Then look at the spleen and the liver, and consider whether the redness alone gives you a diagnosis.',
    },
    mechanism: 'Aeromonas hydrophila is a Gram-negative organism that lives in essentially every freshwater system — it is not an exotic pathogen but an OPPORTUNIST. Poor water quality and crowding raise corticosterone and suppress immunity; the organism crosses the skin or gut and produces bacteraemia. Endotoxin drives vasodilatation, capillary leak and disseminated haemorrhage: hence the diffuse dermal hyperaemia and petechiae that give the syndrome its name, the coelomic effusion, and the reactive splenomegaly. The single most important thing to understand about "red-leg" is that IT IS A SIGN, NOT A DIAGNOSIS. Ranavirus, Chlamydia, other Gram-negatives and even simple terminal congestion produce an identical carcass. Culture and histology, not colour, make the diagnosis — the same discipline as never diagnosing "sepsis" in a human from a rash alone.',
    findings: [
      { partId: 'skin', finding: 'Intense diffuse HYPERAEMIA of the ventral skin and the undersurface of the thighs, with pinpoint PETECHIAE. This is blood in the dermis, not pigment — it does not blanch and it does not follow the pigment pattern.' },
      { partId: 'muscle-wall', finding: 'Petechial haemorrhages on the inner surface of the body wall.' },
      { partId: 'spleen', finding: 'Markedly ENLARGED, dark and soft — reactive splenomegaly.' },
      { partId: 'liver-right', finding: 'Congested and dark, with pinpoint pale foci.' },
      { partId: 'urinary-bladder', finding: 'The coelom contains straw-coloured to blood-tinged effusion — this is the swollen belly seen from outside.' },
      { partId: 'skin', finding: 'THE POINT OF THE CASE: "red-leg" is a syndrome, not an organism. Identical gross findings follow ranavirus and several other septicaemias. Culture is required.' },
    ],
    histology: {
      skin: 'skin-haemorrhage',
      spleen: 'spleen-septic',
      'liver-right': 'liver-congestion',
      'liver-left': 'liver-congestion',
    },
    build: (fx) => {
      fx.tint('skin', 0xa9564a, { rough: 0.52, clear: 0.5 });
      fx.patch('skin', [0, 0.8, -1.4], 2.6, 0x9b3a34, { lift: 0.012, seed: 101, rough: 0.5, clear: 0.5 });
      fx.studs('skin', { count: 22, size: 0.075, color: 0x5e100f, minDist: 0.5, seed: 103,
        flat: true, pick: (x, y) => y > 0.1, mat: { rough: 0.55, clear: 0.4 } });
      fx.tint('muscle-wall', 0xa85b4e, { rough: 0.55 });
      fx.studs('muscle-wall', { count: 12, size: 0.06, color: 0x63120f, minDist: 0.45, seed: 105, flat: true });
      // THE THIGHS. The syndrome is named for them and both the vignette and the
      // findings say the undersurface of the thighs is red — so the thighs have to
      // actually change. They are separate part meshes (hindlimb-*), not part of
      // `skin`, and tinting only `skin` left them a healthy olive green while the
      // marking scheme asked the student to report them as red.
      ['hindlimb-left', 'hindlimb-right'].forEach((id, i) => {
        fx.tint(id, 0x9e4f44, { rough: 0.55, clear: 0.48 });
        fx.studs(id, { count: 6, size: 0.055, color: 0x5e100f, minDist: 0.55, seed: 107 + i,
                       flat: true, pick: (x, y) => y > -0.08, mat: { rough: 0.55, clear: 0.4 } });
        fx.observe(id, 'The undersurface of this thigh is diffusely red, with pinpoint darker spots.');
      });
      // Reactive splenomegaly — a small bead becomes an obvious dark mass. This is
      // the finding a student will miss unless they were told to look for it.
      fx.scale('spleen', 2.0, 1.9, 2.0);
      fx.tint('spleen', 0x3a1620, { rough: 0.5, clear: 0.5 });
      ['liver-right', 'liver-left', 'liver-median'].forEach((id, i) => {
        fx.tint(id, 0x4a1a18, { rough: 0.5, clear: 0.55 });
        fx.studs(id, { count: 6, size: 0.055, color: 0xc9b494, minDist: 0.32, seed: 110 + i, flat: true });
      });
      fx.scale('urinary-bladder', 1.5, 1.5, 1.5);
      fx.tint('urinary-bladder', 0xc4a878, { transmission: 0.6, opacity: 0.7 });
      fx.observe('skin', 'The underside of the body and the undersurface of the thighs are diffusely red, with pinpoint darker spots. The redness is in the skin itself and does not follow the mottled pattern of the pigment.');
      fx.observe('spleen', 'Far larger than a bead — dark, soft and rounded.');
      fx.observe('liver-right', 'Dark and engorged, with scattered pinpoint pale spots on the surface.');
    },
  },

  {
    id: 'hepatic-lipidosis', specimen: 'frog', system: 'digestive',
    label: 'Long-term captive · heavy and sluggish, died after two weeks off food',
    diagnosis: 'Hepatic lipidosis with coelomic fat body hypertrophy — the amphibian counterpart of human hepatic steatosis.',
    vignette: {
      age: '6 years, captive-bred', sex: 'female',
      presentation: 'Noticeably heavy and sluggish for the past year, with a broad, doughy body. Stopped eating a fortnight ago and died despite assisted feeding.',
      history: 'Fed dusted crickets daily for six years, never fasted, and never given a seasonal cool period. Housed alone, with little room to move.',
      examination: 'Body condition score well above normal. No skin lesions.',
      prompt: 'Open the coelom and note what fills it before you displace anything. Then lift the liver lobes and judge their colour, their size and — this is the discriminating sign — the shape of their EDGES.',
    },
    mechanism: 'Chronic positive energy balance with no seasonal mobilisation of fat. In the wild, fat bodies are laid down before hibernation and consumed during it; a captive that is fed year-round and never cooled never spends them. Triglyceride accumulates within hepatocytes as large macrovesicular vacuoles that displace the nucleus to the edge of the cell. The organ enlarges, PALES (fat is pale and less dense than parenchyma, which is why steatotic liver floats in formalin), and its normally sharp edges become ROUNDED as the swollen capsule is pushed outward — the same sign, from the same mechanism, as the rounded edge of a fatty human liver. Once anorexia begins, the sudden mobilisation of that fat overwhelms hepatocyte export of triglyceride and the animal decompensates, the amphibian equivalent of feline hepatic lipidosis.',
    findings: [
      { partId: 'liver-right', finding: 'ENLARGED, PALE YELLOW-TAN instead of dark red-brown, with ROUNDED rather than sharp edges. The cut surface is greasy and leaves fat on the blade.' },
      { partId: 'liver-left', finding: 'Same change — the process is diffuse, not focal. Focal pale lesions would suggest granulomas or neoplasia instead.' },
      { partId: 'liver-median', finding: 'Same change.' },
      { partId: 'fat-body-left', finding: 'ENORMOUS — the finger-like fat bodies fill much of the coelom and must be displaced before the viscera can be seen.' },
      { partId: 'fat-body-right', finding: 'Enormous, as on the left.' },
      { partId: 'gall-bladder', finding: 'PERTINENT NEGATIVE — unremarkable. There is no biliary obstruction.', negative: true },
    ],
    histology: {
      'liver-right': 'liver-steatosis-macrovesicular',
      'liver-left': 'liver-steatosis-macrovesicular',
      'liver-median': 'liver-steatosis-macrovesicular',
      'fat-body-left': 'adipose-hypertrophy',
      'fat-body-right': 'adipose-hypertrophy',
    },
    build: (fx) => {
      ['liver-right', 'liver-left', 'liver-median'].forEach((id, i) => {
        // ROUNDED EDGE is the discriminating sign, so it gets the biggest scale
        // factor: anatomy's lobe() bakes flattening into the geometry along y, so
        // inflating y preferentially blunts the thin leading edge into a curve.
        // That is the difference between "a yellow liver" and a diagnosable one.
        fx.scale(id, 1.16, 1.62, 1.14);
        fx.tint(id, 0xc9a95f, {
          rough: 0.68, clear: 0.2, clearRough: 0.6,   // greasy and dull, not wet and glossy
          transmission: 0.03, thickness: 0.4, atten: 0x6a5220, sheen: 0xe8d49a,
        });
        fx.nodular(id, { amp: 0.02, freq: 5, threshold: 0.5, seed: 120 + i });
        fx.observe(id, 'This lobe is enlarged, pale yellow-tan rather than dark red-brown, and its free edge is rounded and blunt instead of sharp. It feels greasy.');
      });
      ['fat-body-left', 'fat-body-right'].forEach((id) => {
        fx.scale(id, 1.75, 1.75, 1.5);
        fx.tint(id, 0xe8a83c, { rough: 0.6 });
        fx.observe(id, 'Grossly enlarged — these fill much of the cavity and have to be lifted aside to see anything behind them.');
      });
    },
  },

  {
    id: 'mycobacteriosis', specimen: 'frog', system: 'digestive',
    label: 'Colony animal · wasted over four months despite eating, non-healing ulcer',
    diagnosis: 'Disseminated amphibian mycobacteriosis (Mycobacterium marinum / M. liflandii) — granulomatous disease of liver, spleen, kidney and lung. ZOONOTIC.',
    vignette: {
      age: 'adult', sex: 'male',
      presentation: 'Progressive wasting over four months despite a good appetite. A firm, raised, non-healing ulcer on one thigh that has not responded to two courses of antibiotics.',
      history: 'From a research colony with three similar losses over a year. The keeper has a persistent raised nodule on his forearm where he cut himself on a tank rim three months ago.',
      examination: 'Severely wasted, with prominent urostyle and pelvic girdle.',
      prompt: 'Open the coelom and survey every organ for FOCAL lesions. Press each nodule with the probe — record whether it collapses. Note that the keeper needs advice as well as the frog.',
    },
    mechanism: 'Acid-fast mycobacteria are ingested by macrophages but resist killing inside the phagolysosome, so the macrophage becomes their habitat rather than their executioner. Persistently stimulated macrophages transform into epithelioid cells, fuse into multinucleate giant cells and are walled off by fibroblasts — a GRANULOMA, the immune system\'s answer to something it cannot digest. Because the organism spreads haematogenously the granulomas are DISSEMINATED and appear simultaneously in liver, spleen, kidney and lung. Amphibian granulomas differ from mammalian tuberculosis in being poorly organised and typically lacking central caseous necrosis — so they are firm and solid, and a granuloma does NOT collapse under the probe, which is how it is told from a cyst or an abscess at the bench. Treatment is not practical and colonies are usually culled. Mycobacterium marinum causes "fish tank granuloma" in humans, which is what the keeper has on his forearm — this is a genuine zoonosis and the reason gloves are not optional.',
    findings: [
      { partId: 'liver-right', finding: 'Studded with firm, pale GREY-WHITE NODULES 1–3 mm across, of varying size, distorting the capsule so the surface is irregular and knobbly. They do NOT collapse under the probe.' },
      { partId: 'liver-left', finding: 'Same nodules.' },
      { partId: 'spleen', finding: 'Enlarged and studded with the same pale nodules.' },
      { partId: 'kidney-left', finding: 'Pale nodules through the substance, distorting the normally smooth dark-red ribbon.' },
      { partId: 'kidney-right', finding: 'Same nodules.' },
      { partId: 'lung-left', finding: 'Nodules through the wall of the sac.' },
      { partId: 'hindlimb-right', finding: 'A firm, raised, ulcerated nodule on the thigh — the likely portal of entry or a cutaneous focus. It does not collapse either.' },
      { partId: 'liver-right', finding: 'THE BENCH TEST: a granuloma is SOLID and does not collapse; a cyst or abscess does. And DISSEMINATED lesions in several organs at once means haematogenous spread, not local infection.' },
    ],
    histology: {
      'liver-right': 'liver-granuloma',
      'liver-left': 'liver-granuloma',
      'liver-median': 'liver-granuloma',
      spleen: 'spleen-granuloma',
      'kidney-left': 'kidney-granuloma',
      'kidney-right': 'kidney-granuloma',
      'lung-left': 'lung-granuloma',
      'lung-right': 'lung-granuloma',
      'hindlimb-right': 'skin-granuloma',
    },
    build: (fx) => {
      // The nodularity showcase. Thresholded normal-displacement raises DISCRETE
      // masses that distort the capsule, and pale studs sit on top of them so the
      // colour and the relief agree. Both paths recompute bounds (PAT_seal) —
      // without that the raycaster's bounding-sphere reject silently makes every
      // one of these organs unpickable, which is the bug this codebase already
      // paid for once.
      const organs = [
        ['liver-right', 0.055, 9, 10, 131], ['liver-left', 0.055, 9, 9, 132], ['liver-median', 0.05, 10, 8, 133],
        ['spleen', 0.06, 12, 6, 134],
        ['kidney-left', 0.05, 11, 6, 135], ['kidney-right', 0.05, 11, 6, 136],
        ['lung-left', 0.05, 10, 6, 137], ['lung-right', 0.05, 10, 6, 138],
      ];
      organs.forEach(([id, amp, freq, count, seed]) => {
        fx.nodular(id, { amp, freq, threshold: 0.55, seed });
        fx.studs(id, { count, size: 0.075, color: 0xd8d2bd, minDist: 0.3, seed: seed + 40,
                       mat: { rough: 0.8, clear: 0.14, transmission: 0 } });
        fx.observe(id, 'The surface is knobbly and irregular, studded with firm pale grey-white lumps of different sizes. They do not collapse when pressed.');
      });
      fx.scale('spleen', 1.6, 1.6, 1.6);
      // Cutaneous focus ON THE THIGH — the presenting lesion in the history. It was
      // previously placed on `skin` with a predicate that lands on the posterior
      // flank of the body wall, because `skin` is the trunk only; the thigh is its
      // own part. The frog's local +z is the snout, so the proximal thigh is the
      // less-negative-z end of the hindlimb path.
      fx.studs('hindlimb-right', { count: 1, size: 0.3, color: 0xc7bda4, minDist: 1, seed: 141,
        pick: (x, y, z) => z > -2.5 && y > -0.15, mat: { rough: 0.82, clear: 0.1 } });
      fx.observe('hindlimb-right', 'A firm raised nodule with a broken, ulcerated surface sits on this thigh. It has not healed.');
    },
  },

  {
    id: 'hydrocoelom', specimen: 'frog', system: 'urogenital',
    label: 'Captive 3 years · progressively swollen and doughy over six weeks',
    diagnosis: 'Hydrocoelom and generalised subcutaneous oedema ("dropsy") secondary to renal disease.',
    vignette: {
      age: '3 years, captive', sex: 'male',
      presentation: 'Over six weeks the animal has become progressively swollen. The skin over the back and thighs is puffed and doughy and pits when pressed; the belly is tight and rounded. It can no longer right itself.',
      history: 'Long-term captive on a hard-water supply. Chalky white urate deposits have been seen in the water bowl. No skin lesions, and it has continued to eat.',
      examination: 'Weight up by 40% with no increase in body condition. Buoyant in water.',
      prompt: 'Press the skin over the back and thighs before you cut, and record whether it pits. Open the coelom and measure what escapes. Then examine the kidneys and the bladder — and say why the heart matters here even though you expect it to be normal.',
    },
    mechanism: 'Amphibians move most of their extracellular fluid through large SUBCUTANEOUS LYMPH SACS, driven by paired lymph hearts rather than by skeletal muscle — a system with no mammalian equivalent, and one that fails visibly. When renal excretion falls (here, chronic tubulointerstitial disease with urate deposition), or when the lymph hearts fail, fluid accumulates in those sacs and in the coelom, and the animal inflates. Hydrocoelom is a SIGN, not a diagnosis: the differential is renal, cardiac, hepatic, lymphatic, neoplastic and infectious, which is exactly why you examine the heart and liver in an animal you already suspect of kidney failure. The parallel in human medicine is generalised oedema — nephrotic, cardiac and hepatic causes look identical from the end of the bed and are separated by examining the organs.',
    findings: [
      { partId: 'skin', finding: 'Generalised SUBCUTANEOUS OEDEMA — the dorsal lymph sacs are ballooned, tense and translucent, and the skin PITS under the probe. The whole animal is inflated without being fat.' },
      { partId: 'hindlimb-right', finding: 'The thighs are swollen, tense and doughy and pit on pressure — the lesion is GENERALISED, not confined to the coelom. That distinction is what separates oedema from simple ascites.' },
      { partId: 'kidney-left', finding: 'PALE and SWOLLEN, with loss of the normal dark-red ribbon appearance; chalky white deposits within the substance.' },
      { partId: 'kidney-right', finding: 'Same change — bilateral, as renal disease usually is.' },
      { partId: 'urinary-bladder', finding: 'Grossly distended.' },
      { partId: 'lung-left', finding: 'Compressed and collapsed by the coelomic fluid — the mechanical cause of the animal\'s respiratory distress.' },
      { partId: 'frog-heart', finding: 'PERTINENT NEGATIVE — the heart is normal in size and wall thickness. Cardiac failure is a genuine differential for hydrocoelom and has to be excluded, not assumed.', negative: true },
      { partId: 'liver-right', finding: 'PERTINENT NEGATIVE — liver normal, so hepatic hypoproteinaemia is not the cause either.', negative: true },
    ],
    histology: {
      'kidney-left': 'kidney-tubulointerstitial',
      'kidney-right': 'kidney-tubulointerstitial',
      skin: 'skin-oedema',
    },
    build: (fx) => {
      // Inflated, tense and translucent: scale up, push transmission up and
      // opacity down so light passes through fluid-filled sacs the way it does in
      // a living oedematous frog held to a lamp.
      fx.scale('skin', 1.1, 1.24, 1.08);
      fx.tint('skin', 0xa8b294, { transmission: 0.34, thickness: 1.2, opacity: 0.94, rough: 0.4, clear: 0.62 });
      fx.nodular('skin', { amp: 0.03, freq: 3.2, threshold: 0.35, seed: 151 });
      // The presenting sign is that the WHOLE ANIMAL is inflated, and the history
      // and findings both name the thighs specifically. The limbs are separate
      // parts, so a trunk-only swelling left the frog with a ballooned body on
      // normal legs — which reads as bloat, not as generalised oedema. Radial
      // swelling only (x/z): the hindlimb tube runs along its own path, and
      // scaling its long axis would tear the leg away from the hip.
      ['hindlimb-left', 'hindlimb-right', 'forelimb-left', 'forelimb-right'].forEach((id, i) => {
        fx.scale(id, 1.3, 1.3, 1.0);
        fx.tint(id, 0xa8b294, { transmission: 0.3, thickness: 1.0, opacity: 0.94, rough: 0.4, clear: 0.6 });
        fx.nodular(id, { amp: 0.03, freq: 3.0, threshold: 0.4, seed: 157 + i });
        fx.observe(id, 'This limb is puffed and doughy; the sac under the skin is tense and translucent, and a fingertip leaves a pit that stays.');
      });
      ['kidney-left', 'kidney-right'].forEach((id, i) => {
        fx.scale(id, 1.3, 1.45, 1.12);
        fx.tint(id, 0xb59a86, { rough: 0.6, clear: 0.32, transmission: 0.04 });
        fx.studs(id, { count: 5, size: 0.05, color: 0xece7d6, minDist: 0.28, seed: 153 + i,
                       mat: { rough: 0.88, clear: 0.05, transmission: 0 } });
        fx.observe(id, 'Pale, swollen and rounded rather than a flat dark-red ribbon, with chalky white specks in the substance.');
      });
      fx.scale('urinary-bladder', 1.85, 1.7, 1.85);
      fx.tint('urinary-bladder', 0xcfd8c4, { transmission: 0.72, opacity: 0.66 });
      ['lung-left', 'lung-right'].forEach((id) => {
        fx.scale(id, 0.74, 0.6, 0.86);
        fx.tint(id, 0xb0776e, { transmission: 0.3, opacity: 0.9 });
        fx.observe(id, 'Small and collapsed — squeezed flat rather than inflated.');
      });
      fx.observe('skin', 'The whole animal is puffed and doughy. The sacs under the skin of the back and thighs are tense and translucent, and a fingertip leaves a pit that stays.');
      fx.observe('frog-heart', 'Normal size, normal wall thickness, chambers not dilated.');
    },
  },
];

/* ========================================================================== */

export function createPathology(THREE, parts, specimenId) {
  // main.js wraps construction in try/catch, so throwing here costs the student
  // the whole disease library rather than one case. A malformed part is skipped
  // instead: every fx entry already no-ops on a missing id, so the cases that do
  // not touch it still work.
  const byId = new Map();
  (Array.isArray(parts) ? parts : []).forEach((p) => {
    if (p && p.id && p.mesh) byId.set(p.id, p);
  });
  const snaps = new Map();     // partId -> snapshot of everything we touched
  const added = [];            // {parent, mesh} for every mesh we attached
  let active = null;           // the live case record

  /* ---- snapshotting ------------------------------------------------------
   * Taken lazily, once per part, the first time a case reaches for it — and
   * ALWAYS before the first mutation of that part. Object.assign is deliberately
   * avoided on the material: several of these are accessor-backed in three.js and
   * a shallow copy would capture a live object we then mutate through. Colours
   * are cloned, numbers are copied by value. */
  function snap(part) {
    let s = snaps.get(part.id);
    if (s) return s;
    const m = part.mesh;
    // An array material (multi-material mesh) would make `mt.color = ...` a silent
    // no-op on write and a crash on read. Nothing in anatomy.js builds one today,
    // but a snapshot that cannot be restored is worse than no case at all.
    const mt = m && (Array.isArray(m.material) ? m.material[0] : m.material);
    if (!mt) return null;
    s = {
      part,
      color: mt.color ? mt.color.clone() : null,
      emissive: mt.emissive ? mt.emissive.clone() : null,
      sheenColor: mt.sheenColor ? mt.sheenColor.clone() : null,
      attenuationColor: mt.attenuationColor ? mt.attenuationColor.clone() : null,
      roughness: mt.roughness, clearcoat: mt.clearcoat, clearcoatRoughness: mt.clearcoatRoughness,
      sheen: mt.sheen, transmission: mt.transmission, thickness: mt.thickness,
      attenuationDistance: mt.attenuationDistance, ior: mt.ior,
      opacity: mt.opacity, transparent: mt.transparent, depthWrite: mt.depthWrite,
      scale: m.scale.clone(), position: m.position.clone(), quaternion: m.quaternion.clone(),
      note: part.note,
      mat: mt,                                       // restore the material we snapped
      geo: null,                                     // filled only if we deform
    };
    snaps.set(part.id, s);
    return s;
  }

  // Vertex snapshot. Separate and lazy because it is the expensive one — most
  // cases only recolour and rescale, and copying a Float32Array per part for
  // nothing is exactly the sort of waste that shows up on a school laptop.
  function snapGeo(part) {
    const s = snap(part);
    if (!s) return null;
    if (!s.geo) {
      const geo = part.mesh.geometry;
      const pos = geo && geo.attributes && geo.attributes.position;
      if (!pos) return null;                         // nothing to deform, nothing to restore
      s.geo = new Float32Array(pos.array);
    }
    return s;
  }

  function get(id) {
    const p = byId.get(id);
    return p || null;
  }

  /* ---- the effect toolkit handed to each case's build() -------------------
   * Every entry snapshots before it mutates, so a case author cannot forget to.
   * Order within a build() matters in exactly one place: DEFORM BEFORE PATCHING,
   * because a lesion skin is cut from the surface as it stands and will not
   * follow a later deformation. */
  const fx = {

    tint(id, hex, o) {
      const p = get(id); if (!p) return;
      const s = snap(p); if (!s) return;
      const mt = s.mat;
      o = o || {};
      if (mt.color) mt.color.setHex(hex);
      if (o.rough != null) mt.roughness = o.rough;
      if (o.clear != null) mt.clearcoat = o.clear;
      if (o.clearRough != null) mt.clearcoatRoughness = o.clearRough;
      if (o.sheen != null && mt.sheenColor) mt.sheenColor.setHex(o.sheen);
      if (o.transmission != null) mt.transmission = o.transmission;
      if (o.thickness != null) mt.thickness = o.thickness;
      if (o.atten != null && mt.attenuationColor) mt.attenuationColor.setHex(o.atten);
      if (o.attenDist != null) mt.attenuationDistance = o.attenDist;
      if (o.opacity != null) { mt.opacity = o.opacity; mt.transparent = o.opacity < 1 || mt.transparent; }
      mt.needsUpdate = true;
    },

    scale(id, sx, sy, sz) {
      const p = get(id); if (!p) return;
      if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sz)) return;
      if (!snap(p)) return;
      p.mesh.scale.set(p.mesh.scale.x * sx, p.mesh.scale.y * sy, p.mesh.scale.z * sz);
    },

    move(id, dx, dy, dz) {
      const p = get(id); if (!p) return;
      if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dz)) return;
      if (!snap(p)) return;
      p.mesh.position.set(p.mesh.position.x + dx, p.mesh.position.y + dy, p.mesh.position.z + dz);
    },

    // Discrete surface nodules (granulomas, calcific heaps, a coarse capsule).
    nodular(id, o) {
      const p = get(id); if (!p) return;
      o = o || {};
      if (!snapGeo(p)) return;                       // no vertices => nothing to undo, so do not deform
      PAT_nodulate(THREE, p.mesh.geometry, o.amp, o.freq, o.threshold != null ? o.threshold : 0.5, o.seed || 1);
    },

    // Regional bulge (positive amount) or wall thinning (negative amount).
    bulge(id, centre, radius, amount) {
      const p = get(id); if (!p) return;
      if (!snapGeo(p)) return;
      PAT_regionDeform(THREE, p.mesh.geometry, centre, radius, amount);
    },

    /* A conformal lesion skin cut from the organ's own triangles. Added as a
     * CHILD of the part mesh, which buys three things for free: it inherits the
     * part's transform, it inherits the part's VISIBILITY (Object3D.visible is
     * inherited, so a lesion vanishes with the layer it sits on — note this is
     * `.visible`, not `.layers`, which three.js does NOT inherit and which this
     * codebase does not use), and — because every raycast in the app passes
     * `recursive = false` (dissect.js, blood.js, imaging.js, xr.js were all
     * checked) — it can never steal a pick from the organ it sits on.
     *
     * It does NOT follow softbody.js's per-vertex dent or the systolic squeeze of
     * a beating ventricle, so an infarct patch rides slightly proud of a
     * contracting wall. That turns out to be right rather than wrong: infarcted
     * and scarred myocardium is AKINETIC, and regional wall-motion abnormality is
     * the earliest sign of occlusion — earlier than the ECG. The artefact is the
     * physiology. */
    patch(id, centre, radius, hex, o) {
      const p = get(id); if (!p) return;
      o = o || {};
      const m = PAT_mat(THREE, hex, {
        rough: o.rough, clear: o.clear, clearRough: o.clearRough,
        transmission: o.transmission, thickness: o.thickness, sheen: o.sheen,
        side: o.side === 'double' ? THREE.DoubleSide : undefined,
        // noTex: anatomy's mat() would otherwise hang a shared roughness/normal map
        // on this material. A lesion skin is welded from loose triangles and only
        // carries UVs when the donor did; where it does not, the normal-map path
        // builds its tangent frame from dFdx(vUv), which for a constant vUv is a
        // normalize() of a zero vector — NaN normals and a black patch. The micro-
        // relief of the parent organ is visible right beside it anyway.
        noTex: true,
      });
      const mesh = PAT_lesionSkin(THREE, p.mesh.geometry, centre, radius, m,
                                  o.lift != null ? o.lift : 0.03, o.seed || 1);
      if (!mesh) { m.dispose(); return; }
      mesh.renderOrder = (p.mesh.renderOrder || 0) + 1;
      p.mesh.add(mesh);
      added.push({ parent: p.mesh, mesh });
    },

    /* Scattered masses ON the surface: granulomas, atheromatous plaques, calcific
     * heaps, petechiae, sloughing flakes, and vegetations along a valve's line of
     * closure (via `pick`). One primitive, because they are one gross idea. */
    studs(id, o) {
      const p = get(id); if (!p) return;
      const pts = PAT_surfacePoints(THREE, p.mesh.geometry, o.count || 5,
                                    o.minDist != null ? o.minDist : 0.3, o.pick, o.seed || 1);
      const rnd = PAT_rng((o.seed || 1) + 977);
      pts.forEach((pt, i) => {
        const r = (o.size || 0.1) * (0.72 + rnd() * 0.6);
        const s = PAT_stud(THREE, r, o.color != null ? o.color : 0xd8d2bd,
                           { flat: o.flat, friable: o.friable, mat: o.mat }, (o.seed || 1) + i * 7);
        // Sit the mass ON the surface, half-buried, so it reads as arising from
        // the organ rather than resting on it.
        s.position.set(pt[0] + pt[3] * r * 0.35, pt[1] + pt[4] * r * 0.35, pt[2] + pt[5] * r * 0.35);
        if (o.flat) {
          // Lay a flake/plaque flat against the surface: +y of the stud onto the
          // local surface normal.
          s.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(pt[3], pt[4], pt[5]).normalize());
        }
        p.mesh.add(s);
        added.push({ parent: p.mesh, mesh: s });
      });
    },

    // A single discrete mass at a known local position: mural thrombus, the dark
    // slit of a fish-mouth orifice, a rupture tract, a leaflet perforation.
    blob(id, pos, r, hex, o) {
      const p = get(id); if (!p) return;
      o = o || {};
      if (!Array.isArray(pos) || pos.length < 3) return;
      const m = PAT_stud(THREE, r, hex, { flat: o.flat, friable: o.friable, mat: o.mat }, o.seed || 1);
      m.position.set(pos[0], pos[1], pos[2]);
      // `align` lays the mass flat against the surface, using the direction from
      // the mesh origin as a stand-in for the local normal. That is exact on the
      // sphere-derived parts (valve leaflets, atria, auricles) — which are the only
      // ones that need it, because a flat lesion on a curved shell that ignores the
      // curvature reads as a decal hovering off the tissue.
      if (o.align) {
        const n = new THREE.Vector3(pos[0], pos[1], pos[2]);
        if (n.lengthSq() > 1e-8) {
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n.normalize());
        }
      }
      if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
      if (o.scale) m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
      p.mesh.add(m);
      added.push({ parent: p.mesh, mesh: m });
    },

    /* A transverse slice of a vessel, laid out beside the specimen the way a
     * pathologist lays out serial coronary sections on the bench. You cannot
     * judge a stenosis from the outside of an artery — the whole point of the
     * atheroma case is that the student CUTS ACROSS. Built as an outer disc of
     * plaque-yellow wall with a small dark eccentric disc for the residual lumen,
     * because eccentricity is itself a finding. */
    cutFace(id, pos, outerR, lumenR, lumenOffset, label) {
      const p = get(id); if (!p) return;
      if (!Array.isArray(pos) || !Number.isFinite(outerR) || !Number.isFinite(lumenR)) return;
      const off = Array.isArray(lumenOffset) ? lumenOffset : [0, 0];
      const grp = new THREE.Group();
      // DoubleSide throughout: these are flat discs standing beside the specimen,
      // and the student orbits. Single-sided, half the orbit shows nothing at all
      // and the bench layout appears to have vanished.
      const wall = new THREE.Mesh(new THREE.CircleGeometry(outerR, 28),
        PAT_mat(THREE, 0xd8c27c, { rough: 0.62, clear: 0.22, transmission: 0, side: THREE.DoubleSide }));
      const rim = new THREE.Mesh(new THREE.RingGeometry(outerR * 0.94, outerR, 28),
        PAT_mat(THREE, 0x9b5a4c, { rough: 0.6, clear: 0.3, transmission: 0, side: THREE.DoubleSide }));
      rim.position.z = 0.004;
      const lumen = new THREE.Mesh(new THREE.CircleGeometry(lumenR, 20),
        new THREE.MeshBasicMaterial({ color: 0x0a0607, side: THREE.DoubleSide }));
      lumen.position.set(off[0], off[1], 0.008);
      grp.add(wall, rim, lumen);
      // The caption. Without it the bench is three anonymous discs, and "which
      // vessel is worst" — the entire question the layout exists to answer — is
      // unanswerable. Degrades to an unlabelled slice if canvas is unavailable.
      if (label) {
        const lab = PAT_labelPlane(THREE, label, outerR * 3.2);
        if (lab) { lab.position.set(outerR * 2.3, 0, 0.01); grp.add(lab); }
      }
      grp.position.set(pos[0], pos[1], pos[2]);
      grp.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
      p.mesh.add(grp);
      added.push({ parent: p.mesh, mesh: grp });
    },

    /* Append a GROSS DESCRIPTION to a part's teaching note.
     *
     * This is the line the whole module walks. The student must be able to feel
     * that something is wrong with this organ — colour-blind students especially,
     * for whom "yellow-tan with a hyperaemic rim" is not available by eye — but
     * they must NOT be handed the diagnosis. So these strings are written the way
     * a pathologist writes a macroscopic report: soft, pale, thickened, rounded,
     * does not collapse. Never "infarct", "granuloma", "stenosis". If you add a
     * case, read your observe() strings back and delete any word that names a
     * disease. */
    observe(id, text) {
      const p = get(id); if (!p) return;
      if (!snap(p)) return;
      p.note = (p.note || '') + '  —  ' + text;
    },
  };

  /* ---- public API --------------------------------------------------------- */

  function list() {
    return PAT_CASES.map((c) => ({
      id: c.id,
      specimen: c.specimen,
      system: c.system,
      label: c.label,                   // deliberately NOT the diagnosis
      applicable: c.specimen === specimenId,
    }));
  }

  function apply(caseId) {
    const c = PAT_CASES.find((x) => x.id === caseId);
    if (!c) return null;
    // Refuse silently rather than half-applying a heart case to a frog: every
    // partId would miss, the student would see nothing change, and the vignette
    // would still claim a diagnosis is present.
    if (c.specimen !== specimenId) return null;
    clear();
    active = c;
    // A build() that throws half way leaves the specimen partly diseased with a
    // partly-populated snapshot — and since `active` is set, findings() would then
    // grade the student against lesions that were never rendered. Roll the whole
    // thing back instead. clear() restores everything snapped so far, which is
    // exactly the set of parts the failed build had touched.
    try {
      c.build(fx);
    } catch (e) {
      console.warn('pathology: case "' + c.id + '" failed to build; specimen left healthy', e);
      clear();
      return null;
    }
    return { id: c.id, label: c.label, specimen: c.specimen };
  }

  function clear() {
    // Each part is restored inside its own try/catch. One bad part must not abort
    // the loop: everything after it would stay diseased forever, with its snapshot
    // discarded by snaps.clear() below and therefore unrecoverable.
    snaps.forEach((s) => {
      try { restore(s); }
      catch (e) { console.warn('pathology: could not restore "' + (s.part && s.part.id) + '"', e); }
    });
    snaps.clear();
    added.forEach(({ parent, mesh }) => {
      try { parent.remove(mesh); PAT_disposeTree(mesh); }
      catch (e) { console.warn('pathology: could not dispose an added lesion mesh', e); }
    });
    added.length = 0;
    active = null;
  }

  function restore(s) {
      const m = s.part.mesh, mt = s.mat;
      if (!m || !mt) return;
      if (s.color && mt.color) mt.color.copy(s.color);
      if (s.emissive && mt.emissive) mt.emissive.copy(s.emissive);
      if (s.sheenColor && mt.sheenColor) mt.sheenColor.copy(s.sheenColor);
      if (s.attenuationColor && mt.attenuationColor) mt.attenuationColor.copy(s.attenuationColor);
      mt.roughness = s.roughness; mt.clearcoat = s.clearcoat;
      mt.clearcoatRoughness = s.clearcoatRoughness; mt.sheen = s.sheen;
      mt.transmission = s.transmission; mt.thickness = s.thickness;
      mt.attenuationDistance = s.attenuationDistance; mt.ior = s.ior;
      mt.opacity = s.opacity; mt.transparent = s.transparent; mt.depthWrite = s.depthWrite;
      mt.needsUpdate = true;
      m.scale.copy(s.scale); m.position.copy(s.position); m.quaternion.copy(s.quaternion);
      s.part.note = s.note;
      if (s.geo) {
        const geo = m.geometry;
        const pos = geo && geo.attributes && geo.attributes.position;
        // Length check: another module (cutting.js) may legitimately have replaced
        // this geometry since the snapshot was taken, and TypedArray.set() throws
        // RangeError on a size mismatch — which, before the per-part try/catch
        // above, would have aborted the restore of every remaining part.
        if (pos && pos.array.length === s.geo.length) {
          pos.array.set(s.geo);
          PAT_seal(geo);               // never restore vertices without resealing bounds
        }
      }
  }

  function current() {
    return active ? { id: active.id, label: active.label, specimen: active.specimen, system: active.system } : null;
  }

  /* The marking scheme. This is the ONLY route by which the diagnosis leaves the
   * module, and it exists for the tutor to grade against — the shell must not
   * render it as a hint panel while the student is still dissecting. */
  function findings() {
    if (!active) return null;
    return {
      caseId: active.id,
      diagnosis: active.diagnosis,
      mechanism: active.mechanism,
      items: (active.findings || []).map((f) => ({
        partId: f.partId,
        part: (byId.get(f.partId) || {}).name || f.partId,
        finding: f.finding,
        negative: !!f.negative,
      })),
    };
  }

  // The history, and nothing but the history.
  function vignette() {
    if (!active) return null;
    const v = active.vignette || {};
    return {
      caseId: active.id, specimen: active.specimen, label: active.label,
      age: v.age, sex: v.sex,
      presentation: v.presentation, history: v.history,
      examination: v.examination, prompt: v.prompt,
    };
  }

  /* Cross-link for histology.js. Returns a TISSUE KEY, not a diagnosis: with a
   * case active, asking for a section of the liver must yield the DISEASED
   * section — macrovesicular fat with displaced nuclei, or a granuloma with
   * epithelioid and giant cells — rather than a textbook lobule. Returns null
   * when the part is not involved in the active case, which is the signal to
   * render normal histology (and is itself a teaching moment: uninvolved organs
   * are normal down the microscope too).
   *
   * Key vocabulary produced by the cases in this file:
   *   myocardium-coagulative-early · myocardium-macrophage-granulation
   *   myocardium-scar · myocardium-dcm · myocardium-hypertrophy
   *   artery-atheroma · artery-thrombus-on-plaque · artery-recanalised
   *   artery-septic-embolus · valve-rheumatic · valve-vegetation · valve-calcific
   *   endocardium-fibroelastosis · pericardium-haemorrhagic
   *   liver-steatosis-macrovesicular · liver-granuloma · liver-congestion
   *   spleen-septic · spleen-granuloma · adipose-hypertrophy
   *   kidney-granuloma · kidney-tubulointerstitial · lung-granuloma
   *   skin-hyperkeratosis-bd · skin-haemorrhage · skin-oedema */
  function histologyFor(partId) {
    if (!active || !active.histology) return null;
    return active.histology[partId] || null;
  }

  function dispose() {
    clear();
  }

  return { list, apply, clear, current, findings, vignette, histologyFor, dispose };
}
