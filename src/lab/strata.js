/*
 * strata.js — the layers a blade actually passes through.
 *
 * THE PROBLEM THIS FIXES. A real ventral dissection is not skin -> muscle ->
 * organs. It is skin -> subcutaneous fat and superficial fascia -> body-wall
 * muscle -> deep fascia and PARIETAL PERITONEUM -> viscera. Students who only
 * ever meet the three-step version arrive at a cadaver lab and cannot find the
 * peritoneum, because nothing ever showed them that there IS one. The single
 * most memorable moment in a first dissection is the instant the peritoneum
 * parts: the gut stops being a smear seen through a wet film and snaps into
 * focus. That contrast is the entire payoff of this module, and it is why the
 * membrane is built with real transmission rather than painted-on alpha —
 * transmission blurs what is behind it by ITS OWN roughness, so cutting it is a
 * genuine optical change, not a fade.
 *
 * WHAT IT DOES.
 *   1. Re-indexes the EXISTING parts' `layer` fields to open room (dissect.js
 *      reveals by `p.layer === n` equality, so the final set must be 0..N with
 *      no gaps — a gap is a dissection that dead-ends silently).
 *   2. Builds the new strata, APPENDS their descriptors to the same `parts` array
 *      it was handed, and also returns them in `added`.
 *
 * CALL ORDER. After buildSpecimen(), before createDissection(). dissect.js
 * snapshots `parts` into its byId/meshes tables at construction and never looks
 * at the array again, so a stratum added afterwards is unreachable. If softbody.js
 * is in use, construct it after this too, or the new meshes get no soft response.
 *
 * The remap is computed from the specimen's own maximum layer and a list of
 * "insert after existing layer k" points. Hardcoding 1->2, 2->4, 3->5 would
 * break the day frog.js gains a fourth layer, and it would break QUIETLY.
 *
 * GEOMETRY DISCIPLINE. Both frog shells re-derive frog.js's own body profile
 * (the fusiform trunk with the neck pinch, cheek flare and vent taper) rather
 * than approximating it with an ellipsoid. A fascia sheet that floats 2mm above
 * the belly is worse than no fascia sheet at all — it reads as a bug, and the
 * whole illusion of standing over a specimen dies with it. If frogBody() in
 * frog.js ever changes its silhouette, ST_frogProfile() below must change with
 * it. That coupling is deliberate and is cheaper than the alternative.
 *
 * Contract:  buildStrata(THREE, specimenId, parts, group)
 *              -> { added:[partDescriptor], stack:[{layer,id,name}], dispose() }
 * Never throws. Every failure path — a bad layer plan, a missing browser feature,
 * a geometry error midway — returns the inert object with the specimen restored
 * exactly as it was handed over. main.js wraps construction in try/catch, but a
 * half-applied re-index would survive that catch and silently break the whole
 * dissection, so the rollback lives here.
 * Everything top-level is ST_-prefixed except the factory (one shared module
 * scope; see assemble.py's collision guard).
 */

const ST_CLAMP01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* Smoothstep band with soft shoulders — used to fade the right ventricle's
 * partial-arc contribution into the epicardial envelope without a crease. */
function ST_band(x, lo, hi, feather) {
  const a = smooth(ST_CLAMP01((x - lo) / feather));
  const b = smooth(ST_CLAMP01((hi - x) / feather));
  return Math.min(a, b);
}

/* ------------------------------------------------------------------------- *
 * The frog body profile — an EXACT mirror of frogBody() in frog.js.
 * t = 0 at the vent, 1 at the snout. Returns [profile, xProfile]; the y term
 * uses `prof`, the x term `xprof` (the head is wider than it is deep).
 * ------------------------------------------------------------------------- */
function ST_frogProfile(t) {
  let prof = Math.sin(t * Math.PI * 0.97 + 0.09);
  prof *= 1 - 0.17 * Math.exp(-Math.pow((t - 0.73) / 0.055, 2));   // neck pinch
  if (t < 0.08) prof *= 0.5 + t * 4.0;                             // vent taper
  let xprof = prof * (1 + 0.2 * Math.exp(-Math.pow((t - 0.84) / 0.075, 2))); // cheeks
  if (t > 0.9) { const s = (t - 0.9) / 0.1; prof *= 1 - s * 0.34; xprof *= 1 - s * 0.28; }
  return [prof, xprof];
}

/* Adipose is not "bumpy" — it is LOBULAR. Adipocytes pack into grape-like
 * clusters a few millimetres across, each parcelled off by a fibrous septum.
 * An unsharpened fbm gives bumpy rubber every time; thresholding a low-frequency
 * field into discrete domes is what turns noise into anatomy. A finer field adds
 * sub-lobules, but only INSIDE a lobule — septa are smooth, that is the tell. */
function ST_lobuleField(x, y, z) {
  const a = fbm(x * 4.2 + 4.1, y * 4.2 + 1.7, z * 4.2 + 8.3);
  const b = vnoise(x * 9.0 + 21.0, y * 9.0 + 3.3, z * 9.0 + 12.7);
  const dome = smooth(ST_CLAMP01((a - 0.44) / 0.30));
  const sub = smooth(ST_CLAMP01((b - 0.52) / 0.34));
  return ST_CLAMP01(dome * 0.84 + sub * 0.32 * dome);
}

/* Serosa relief: a ridge field (folded absolute-value noise gives creases, not
 * dents) plus a barely-there stipple. Amplitude here is tiny on purpose — a
 * serous membrane is two cells thick; anything you can SEE as relief is wrong. */
function ST_serosaField(x, y, z) {
  const crease = Math.abs(vnoise(x * 3.1 + 7.7, y * 3.1 + 2.2, z * 3.1 + 5.5) - 0.5);
  const stipple = fbm(x * 11 + 2.0, y * 11 + 9.0, z * 11 + 4.0) - 0.5;
  return (0.5 - crease) * 0.9 + stipple * 0.5;      // ~ -0.5 .. +0.5
}

/* ------------------------------------------------------------------------- *
 * A closed sleeve that follows the frog's ventral curvature.
 *
 * Built from a sphere so the ends close by themselves (at |v.z| = 1 the sphere's
 * x and y are already zero) — no hand-authored caps, no degenerate fan.
 *
 * THE TERM YOU MUST NOT DROP. frog.js builds skin and muscle wall from a sphere
 * too, and it reads its profile off the sphere's OWN z. So the half-width of
 * frog.js's shells at height z is sqrt(1 - (z/sz)^2) · prof(t) · s — the sphere's
 * circular cross-section AND the profile, multiplied. An earlier revision of this
 * function replaced the sqrt term with a fat super-ellipse cap (exponent 12) on
 * the theory that the sphere "narrows across the whole middle and would sink the
 * sleeve inside the muscle wall". It does not: it narrows exactly as much as the
 * muscle wall narrows, because they are the same sphere. Dropping it makes the
 * sleeve balloon straight OUT through the skin toward both ends — 11% proud of the
 * skin at z = -2.6 on the fascia, and the peritoneum out through the muscle wall
 * it is supposed to line. So carry the sqrt term, and leave the cap with exactly
 * one job: closing the two open ends. Exponent 40 keeps it at 1.0 until the last
 * ~3% of the span, where it takes the rim to zero as a hemisphere.
 *
 * cfg: { sx, sy, zRef, zMin, zMax, yvent, ydors, amp, field, colorAt, seg, seg2 }
 *   zRef  — the frog.js body z-scale this shell's profile is read against.
 *   yvent/ydors — separate ventral and dorsal y factors. The peritoneum needs a
 *   near-flat dorsal roof so the kidneys and aorta stay RETROPERITONEAL, i.e.
 *   outside it. That is not a shortcut; it is the anatomy.
 * ------------------------------------------------------------------------- */
function ST_frogSleeve(THREE, cfg) {
  const g = new THREE.SphereGeometry(1, cfg.seg || 88, cfg.seg2 || 60);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const colors = cfg.colorAt ? new Float32Array(p.count * 3) : null;
  const c = cfg.colorAt ? new THREE.Color() : null;
  const zMid = (cfg.zMin + cfg.zMax) / 2, zHalf = (cfg.zMax - cfg.zMin) / 2;

  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = Math.hypot(v.x, v.y);
    const ux = h > 1e-6 ? v.x / h : 0, uy = h > 1e-6 ? v.y / h : 0;
    const zL = zMid + v.z * zHalf;
    // The frog.js sphere cross-section, read against the same z-scale frog.js
    // uses. This is the term that keeps the sleeve INSIDE its neighbours; see the
    // block comment above before touching it.
    const uz = zL / cfg.zRef;
    const body = Math.sqrt(Math.max(0, 1 - uz * uz));
    // End closure only: 1.0 until |v.z| > ~0.97, then a hemispherical rim to zero.
    const cap = Math.sqrt(Math.max(0, 1 - Math.pow(Math.abs(v.z), 40)));
    const lob = cfg.field ? cfg.field(ux, uy, v.z) : 0;
    const rad = body * cap * (1 + lob * (cfg.amp || 0));
    const [prof, xprof] = ST_frogProfile(ST_CLAMP01((uz + 1) / 2));
    const ys = uy >= 0 ? cfg.yvent : cfg.ydors;
    p.setXYZ(i, ux * rad * xprof * cfg.sx, uy * rad * prof * ys * cfg.sy, zL);
    if (colors) {
      cfg.colorAt(c, lob, ux, uy, v.z);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
  }
  if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  seal(g);       // normals + BOTH bounding volumes; see the raycast trap below
  return g;
}

/* ------------------------------------------------------------------------- *
 * Heart: the myocardial envelope, re-derived from heart.js's own lathe profiles.
 * The visceral pericardium is bound to the myocardium — a sphere scaled to "about
 * right" would float off the right ventricle, which is a crescent over only part
 * of the circumference. So the envelope is evaluated per (height, azimuth).
 * ------------------------------------------------------------------------- */
function ST_heartLvR(y) {
  const t = (3.1 - y) / 6.55;                        // heart.js: y = 3.1 - t*6.55
  // Rounded shoulder above the base and below the apex so the film closes as a
  // dome instead of terminating in a flat disc of collapsed vertices.
  if (t < 0) return 0.399 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 3.1) / 0.30, 2)));
  if (t > 1) return 0.112 * Math.sqrt(Math.max(0, 1 - Math.pow((y + 3.45) / 0.15, 2)));
  let r = Math.sin(t * Math.PI * 0.92 + 0.13) * 2.46 * (1 - t * 0.10) + 0.08;
  if (t > 0.83) r *= 1 - (t - 0.83) * 4.0;
  return Math.max(0.05, r);
}
function ST_heartRvR(y) {
  const t = (2.9 - y) / 4.75;                        // heart.js: y = 2.9 - t*4.75
  if (t < 0 || t > 1) return 0;
  return Math.sin(t * Math.PI * 0.72 + 0.34) * 2.66 * (1 - t * 0.05) + 0.1;
}

/* Lean the apex infero-laterally exactly the way heart.js does to its walls
 * (k = 0.16 LV / 0.14 RV; the film that covers both takes the mean). */
function ST_heartLean(THREE, geo, k, pivotY) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    if (v.y < pivotY) { const d = pivotY - v.y; p.setXYZ(i, v.x - k * d, v.y, v.z + k * 0.32 * d); }
  }
  return geo;
}

function ST_heartFilm(THREE) {
  const g = new THREE.SphereGeometry(1, 72, 50);
  const p = g.attributes.position, v = new THREE.Vector3();
  const yTop = 3.40, yBot = -3.60;
  const yMid = (yTop + yBot) / 2, yHalf = (yTop - yBot) / 2;
  // LatheGeometry lays out x = r·sin(phi), z = r·cos(phi); the RV arc in heart.js
  // is phiStart -0.12π over 0.70π. Matching that convention is the difference
  // between the film hugging the RV and hugging the wrong side of the heart.
  const phi0 = -0.12 * Math.PI, phi1 = phi0 + 0.70 * Math.PI;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const h = Math.hypot(v.x, v.z);
    const dx = h > 1e-6 ? v.x / h : 0, dz = h > 1e-6 ? v.z / h : 1;
    const y = yMid + v.y * yHalf;
    const w = ST_band(Math.atan2(dx, dz), phi0, phi1, 0.30);
    const env = Math.max(ST_heartLvR(y), ST_heartRvR(y) * w);
    // Stand the film off the muscle by a hair (×1.03 + 0.05) — a serous membrane
    // is adherent, not floating, so this is about a millimetre at specimen scale.
    const r = env * 1.03 + (env > 0.02 ? 0.05 : 0)
            + ST_serosaField(dx * 2.2, y * 0.55, dz * 2.2) * 0.024;
    p.setXYZ(i, dx * r, y, dz * r);
  }
  ST_heartLean(THREE, g, 0.155, 1.4);
  seal(g);
  return g;
}

/* Displace a tube along its own normals so a fat pad reads as lobulated adipose
 * packed into a groove rather than a smooth sausage. TubeGeometry ships normals,
 * so this needs no extra pass. seal() then rebuilds normals AND both bounding
 * volumes — Raycaster rejects on the bounding SPHERE first, so a stale sphere
 * makes the pad silently unpickable with no error anywhere. */
function ST_lumpTube(THREE, mesh, amp, freq, seed) {
  const g = mesh.geometry, p = g.attributes.position, n = g.attributes.normal;
  if (!p || !n) return mesh;
  const v = new THREE.Vector3(), nv = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    nv.fromBufferAttribute(n, i);
    const l = ST_lobuleField(v.x * freq + seed, v.y * freq + seed * 0.7, v.z * freq + seed * 1.3);
    p.setXYZ(i, v.x + nv.x * l * amp, v.y + nv.y * l * amp, v.z + nv.z * l * amp);
  }
  seal(g);
  return mesh;
}

/* ------------------------------------------------------------------------- *
 * Generic layer re-indexing.
 *
 * `insertAfter` lists EXISTING layer indices to open a slot behind. An existing
 * layer L moves to L + (how many insertion points sit strictly before it); the
 * new layer created behind k lands at k + (insertions strictly before k) + 1.
 * For the frog, insertAfter [0,1] yields exactly 1->2, 2->4, 3->5 with the new
 * strata at 1 and 3 — but derived, so a fourth frog layer just works.
 * ------------------------------------------------------------------------- */
function ST_planLayers(parts, insertAfter) {
  const present = new Set(parts.map((p) => p.layer | 0));
  const maxLayer = Math.max(0, ...present);
  const cuts = insertAfter.filter((k) => present.has(k)).sort((a, b) => a - b);
  const shiftOf = (L) => cuts.reduce((n, k) => n + (k < L ? 1 : 0), 0);
  const remap = new Map();
  present.forEach((L) => remap.set(L, L + shiftOf(L)));
  const slots = cuts.map((k) => k + shiftOf(k) + 1);
  const total = maxLayer + cuts.length;
  // Belt and braces: prove the result is 0..total with no gaps BEFORE mutating
  // anything. dissect.js reveals with `p.layer === n`, so one gap turns into a
  // dissection that stops halfway with no error message at all.
  const final = new Set([...remap.values(), ...slots]);
  for (let i = 0; i <= total; i++) if (!final.has(i)) return null;
  return { remap, slots, total };
}

/* Shared finishing pass for every mesh this module contributes.
 *
 * `shadow` is false for the two serous membranes. A transmissive sheet that casts
 * a shadow map lays a hard dark copy of itself over every organ it is meant to
 * reveal, which is the exact opposite of the effect this module exists for — the
 * shadow does not know the surface is 85% transmissive. Fat pads DO cast: a lump
 * of adipose in a groove is opaque and its shadow is most of what sells the lump.
 */
function ST_adopt(THREE, group, mesh, id, layer, shadow) {
  mesh.userData.partId = id;
  // dissect.js drives material.emissive for hover and heart.js/frog.js both stash
  // baseColor here; match them. Guarded because a material without .color (never
  // produced by mat(), but cheap to survive) must not take the module down.
  if (mesh.material && mesh.material.color) mesh.userData.baseColor = mesh.material.color.clone();
  // Same rule frog.js/heart.js apply in their own add(): anything below the
  // surface starts hidden and dissect.js's revealLayer() turns it on.
  mesh.visible = layer === 0;
  mesh.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = !!shadow; o.receiveShadow = true;
    if (o.geometry) { o.geometry.computeBoundingSphere(); o.geometry.computeBoundingBox(); }
  });
  group.add(mesh);
  return mesh;
}

/* Membrane finishing, applied to both serous sheets.
 *
 * depthWrite off is the whole reason these drape instead of z-fighting. But
 * dissect.js's stepPeels() OVERWRITES it every frame of a peel
 * (`material.depthWrite = st.t < 0.5`), so for the first half of every reflection
 * the membrane starts writing depth again at ~0.03 units of clearance from the
 * wall — and the z-fight comes back exactly when the student is watching. A
 * polygon offset survives that, because dissect.js never touches it. */
function ST_membrane(mesh, order, irid, iridIOR) {
  const m = mesh.material;
  m.depthWrite = false;
  m.polygonOffset = true;
  m.polygonOffsetFactor = -2;
  m.polygonOffsetUnits = -2;
  // Thin-film iridescence gives the faint oil-on-water sheen a wet serosa throws
  // under a theatre lamp. Guarded: it landed in r152 and this app pins r160, but a
  // CDN serving an older build must not blank the page.
  if ('iridescence' in m) {
    m.iridescence = irid;
    m.iridescenceIOR = iridIOR;
    if (Array.isArray(m.iridescenceThicknessRange)) m.iridescenceThicknessRange = [120, 400];
  }
  mesh.renderOrder = order;
  return mesh;
}

/* Human-readable name for each final layer, so a HUD can label the stack. */
const ST_STACK_NAMES = {
  frog: ['Skin', 'Subcutaneous layer (superficial fascia & lymph sacs)',
         'Abdominal muscle wall', 'Parietal peritoneum',
         'Viscera (intraperitoneal)', 'Deep / retroperitoneal'],
  heart: ['Fibrous pericardium', 'Epicardium (visceral pericardium)',
          'Myocardium & coronary tree', 'Internal chambers & valves'],
};

/* ========================================================================== */
export function buildStrata(THREE, specimenId, parts, group) {
  const inert = { added: [], stack: [], dispose() {} };
  if (!THREE || !group || !Array.isArray(parts) || !parts.length) return inert;
  // Idempotence: a second call must not double-shift every layer in the specimen.
  // Stamped on the GROUP as well as the meshes, because the mesh test only fires
  // once the descriptors are in `parts`, and a caller that keeps `added` separate
  // would otherwise re-index the specimen a second time.
  if (group.userData && group.userData.ST_strata) return inert;
  if (parts.some((p) => p && p.mesh && p.mesh.userData && p.mesh.userData.stratum)) return inert;

  // This module's fat/fascia/peritoneum meshes are shaped and scaled for the frog
  // and heart specifically. Injecting frog-shaped subcutaneous fat into a fish or an
  // earthworm would be worse than nothing, so any specimen without a bespoke stack
  // here is left exactly as its own builder authored it (those builders define their
  // own consecutive layers directly).
  if (specimenId !== 'frog' && specimenId !== 'heart') return inert;

  const isHeart = specimenId === 'heart';
  const plan = ST_planLayers(parts, isHeart ? [0] : [0, 1]);
  if (!plan) {
    console.warn('strata: layer plan for "' + specimenId + '" would leave a gap; skipping');
    return inert;
  }

  // Snapshot before mutating so dispose() can genuinely undo.
  const original = parts.map((p) => ({ part: p, layer: p.layer }));
  parts.forEach((p) => { p.layer = plan.remap.get(p.layer | 0); });

  const added = [];
  const owned = [];
  const push = (d) => {
    ST_adopt(THREE, group, d.mesh, d.id, d.layer, d.shadow !== false);
    delete d.shadow;                          // not part of the part descriptor
    d.mesh.userData.stratum = true;
    owned.push(d.mesh);
    added.push(d);
    return d;
  };

  // Undo everything and hand back the inert object. Used by the catch below: a
  // throw partway through construction would otherwise leave the specimen
  // RE-INDEXED with the layers that justified the re-index missing — i.e. a gap,
  // which dissect.js turns into a dissection that dead-ends with no error at all.
  // That is far worse than having no strata.
  function abort(err) {
    console.warn('strata: construction failed for "' + specimenId + '"; specimen left unchanged', err);
    owned.forEach((m) => {
      group.remove(m);
      m.traverse((o) => {
        if (!o.isMesh) return;
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mm.dispose());
      });
    });
    owned.length = 0;
    added.length = 0;
    original.forEach(({ part, layer }) => { part.layer = layer; });
    return inert;
  }

  try {
  /* ===================== FROG ============================================ */
  if (!isHeart) {
    const [fasciaLayer, peritoneumLayer] = plan.slots;

    /* --- subcutaneous fat + superficial fascia (slot behind the skin) ------
     * Sized to live in the real gap between frog.js's skin (2.34, 1.42, 4.55)
     * and its muscle wall (2.14, 1.28, 4.32): base radii sit clear of the wall,
     * and the lobules only ever push OUTWARD (never inward), so no amount of
     * noise can let a lobule sink through the muscle beneath it. sx/sy leave 4.2%
     * of headroom under the skin because that is exactly the lobule amplitude —
     * at 2.24/1.35 the lobule peaks landed within 0.3% of the skin, i.e. one
     * rounding error away from poking through it.
     *
     * BIOLOGY. This is NOT a mammalian panniculus and it must not be taught as
     * one. A frog's subcutaneous space is a set of large, near-empty LYMPH SACS
     * separated by thin septa that tack the skin down along a few fixed lines —
     * which is why the skin lifts off in one glove-like sheet, and why the frog is
     * the specimen that makes the point that skin and body wall are two layers.
     * Adipose here is sparse; the frog's real fat store is the bright orange
     * abdominal FAT BODIES (corpora adiposa) on the gonads, which frog.js already
     * ships at the visceral layer. So the lobules are modelled small and the note
     * sends the student to the fat bodies for the fat. */
    const FAT = new THREE.Color(0xf2dd94);         // sparse adipose in the septa
    const FAT_DEEP = new THREE.Color(0xdcbc60);    // lobule centre, denser
    const SEPTUM = new THREE.Color(0xeceadc);      // whitish fibrous partition
    const fasciaGeo = ST_frogSleeve(THREE, {
      seg: 88, seg2: 60,
      sx: 2.22, sy: 1.34, zRef: 4.42, zMin: -3.30, zMax: 2.80,
      yvent: 0.58, ydors: 1.0, amp: 0.042,
      field: ST_lobuleField,
      colorAt: (c, lob) => { c.copy(SEPTUM).lerp(FAT, lob); c.lerp(FAT_DEEP, lob * lob * 0.45); },
    });
    // vcol carries the lobule/septum pattern, so mat() is told the tissue class
    // explicitly — its colour-based inference would read a vertex-tinted mesh as
    // skin and hand it the pebbled map.
    const fascia = new THREE.Mesh(fasciaGeo, mat(THREE, 0xffffff, {
      vcol: true, tissue: 'fat', rough: 0.74, clear: 0.2, clearRough: 0.55,
      sheen: 0xffe9ae, sheenAmt: 0.34, sheenRough: 0.62,
      transmission: 0.3, thickness: 0.34, attenDist: 0.7, atten: 0x7a5a24, ior: 1.44,
    }));
    push({
      id: 'subcutaneous-fascia', name: 'Subcutaneous layer (superficial fascia & lymph sacs)',
      layer: fasciaLayer, system: 'integument', cuttable: true, detachable: false,
      note: 'The space between skin and body wall — and the proof they are two layers, not one. In a frog it is a series of large subcutaneous LYMPH SACS: loose, near-empty chambers divided by thin whitish septa that anchor the skin along only a few lines. Divide those septa and the whole skin lifts off like a glove. Adipose here is sparse and pale; a frog stores its fat in the orange abdominal fat bodies on the gonads, not under the skin, so do not go looking for a mammalian layer of it.',
      mesh: fascia,
      incision: [[0, 0.49, 2.40], [0, 0.73, 1.20], [0, 0.82, 0.00], [0, 0.74, -1.40], [0, 0.55, -2.60]],
    });

    /* --- parietal peritoneum (slot behind the muscle wall) ----------------
     * The payoff layer. transmission 0.85 with a low thickness and a modest
     * roughness means the viscera behind it are REFRACTED and softly blurred —
     * an actual optical veil. When dissect.js reflects it (opacity -> 0.1) the
     * veil goes and the organs snap into focus. Painted alpha cannot do that.
     *
     * depthWrite off + renderOrder: at ~0.03 units of clearance from the muscle
     * wall, and with frog.js's own heart and lungs already bulging past the wall
     * anteriorly, z-fighting is a certainty. A membrane that does not write depth
     * drapes over everything instead of fighting it — which is also what a
     * membrane does.
     *
     * The dorsal factor is deliberately flat (0.33·prof against the wall's
     * 1.0·prof) so the kidneys, adrenals, dorsal aorta and spine all finish up
     * BEHIND it. That is the definition of retroperitoneal and it is the single
     * most valuable thing this membrane teaches. */
    const SEROSA = new THREE.Color(0xdae6ea);      // faint blue-grey
    const SEROSA_WARM = new THREE.Color(0xe8dcd6); // where it thickens over vessels
    const peritoneumGeo = ST_frogSleeve(THREE, {
      seg: 80, seg2: 54,
      sx: 2.04, sy: 1.24, zRef: 4.26, zMin: -3.10, zMax: 2.70,
      yvent: 0.5766, ydors: 0.266, amp: 0.014,
      field: ST_serosaField,
      colorAt: (c, f) => c.copy(SEROSA).lerp(SEROSA_WARM, ST_CLAMP01(f + 0.5) * 0.55),
    });
    const peritoneum = new THREE.Mesh(peritoneumGeo, mat(THREE, 0xffffff, {
      vcol: true, tissue: 'serous', trans: true, opacity: 0.96,
      rough: 0.26, clear: 0.92, clearRough: 0.1,
      transmission: 0.85, thickness: 0.06, ior: 1.35, attenDist: 2.4, atten: 0xcfe0e6,
      sheen: 0xcfe4ee, sheenAmt: 0.5, sheenRough: 0.3, side: THREE.DoubleSide,
    }));
    ST_membrane(peritoneum, 2, 0.35, 1.32);
    push({
      id: 'parietal-peritoneum', name: 'Parietal peritoneum',
      layer: peritoneumLayer, system: 'serous', cuttable: true, detachable: false, shadow: false,
      note: 'The glistening film lining the whole coelom — a single sheet of squamous mesothelium on a hair of connective tissue, thin enough to read newsprint through, and the last thing between you and the viscera. Tent it with forceps and nick the tent; cut onto a flat sheet and you take the gut with it. Then note what did NOT come into view: the kidneys, their adrenal streaks, the dorsal aorta and the spine all lie BEHIND this membrane, against the back wall. That is what retroperitoneal means, and it is why they stay put when you lift the gut out.',
      mesh: peritoneum,
      incision: [[0, 0.45, 2.30], [0, 0.67, 1.10], [0, 0.75, 0.00], [0, 0.68, -1.30], [0, 0.50, -2.50]],
    });
  }

  /* ===================== HEART =========================================== */
  else {
    const epiLayer = plan.slots[0];
    // remap.get(1) is undefined if this specimen happens to have no layer-1 parts.
    // An undefined layer never equals dissect.js's `p.layer === n`, so the fat pads
    // would be added, counted in the stack, and then never revealed by anything.
    const myoLayer = plan.remap.has(1) ? plan.remap.get(1) : epiLayer + 1;
    const have = new Set(parts.map((p) => p.id));

    /* --- epicardium / visceral pericardium --------------------------------
     * heart.js already ships the fibrous sac ('pericardium') and a bulk fat
     * shell ('epicardial-fat'), so neither is re-added. What is missing is the
     * membrane bound to the muscle itself — the frog peritoneum's exact
     * counterpart, and the same optical trick: the myocardium is already visible
     * at this specimen, so revealing the epicardium LAYS a wet film over it, and
     * cutting the film takes the haze away. */
    if (!have.has('epicardium')) {
      const epi = new THREE.Mesh(ST_heartFilm(THREE), mat(THREE, 0xe2e8e6, {
        tissue: 'serous', trans: true, opacity: 0.94,
        rough: 0.22, clear: 0.95, clearRough: 0.09,
        transmission: 0.85, thickness: 0.07, ior: 1.35, attenDist: 2.2, atten: 0xd8e4e0,
        sheen: 0xffd8cc, sheenAmt: 0.55, sheenRough: 0.3, side: THREE.DoubleSide,
      }));
      ST_membrane(epi, 2, 0.3, 1.3);
      push({
        id: 'epicardium', name: 'Epicardium (visceral pericardium)',
        layer: epiLayer, system: 'serous', cuttable: true, detachable: false, shadow: false,
        note: 'The serous membrane fused to the heart muscle itself. It is the SAME sheet as the sac you have just opened: the serous pericardium runs down the inside of the fibrous sac as the parietal layer, then folds back on itself at the great vessels and continues over the muscle as this visceral layer. Between the two leaves sits 15–50 ml of clear fluid, and that is the whole point — the heart beats inside a lubricated bag with almost no friction. Strip the epicardium and the coronaries, which run in the grooves just deep to it and buried in fat, come away with it.',
        mesh: epi,
        incision: [[-1.78, 1.70, 1.52], [-2.10, 0.15, 1.74], [-1.70, -1.70, 1.44]],
      });
    }

    /* --- subepicardial fat pads in the coronary grooves --------------------
     * The existing 'epicardial-fat' is a uniform shell — useful as a veil, but
     * it does not teach where fat actually lives. Real cardiac adipose fills the
     * ATRIOVENTRICULAR and INTERVENTRICULAR grooves, and the coronaries run
     * INSIDE it. These pads are built on heart.js's own coronary polylines, so
     * trimming them genuinely exposes the artery underneath instead of merely
     * implying it. They sit at the myocardial layer, not the sac layer, because
     * subepicardial fat is DEEP to the visceral pericardium. */
    const fatMat = { tissue: 'fat', rough: 0.76, clear: 0.24, clearRough: 0.55,
      sheen: 0xffe6a4, sheenAmt: 0.4, transmission: 0.3, thickness: 0.4,
      atten: 0x6a4a1e, attenDist: 0.85 };

    if (!have.has('av-groove-fat')) {
      // Left AV groove (over the circumflex) as the pickable body; the right AV
      // groove rides as a child so the whole ring reveals and hides as one — the
      // same trick heart.js uses for coronary branches.
      const cx = tube(THREE, 0xecd08a,
        [[-0.85, 2.90, 1.30], [-1.80, 2.25, 0.40], [-2.05, 1.30, -0.85], [-1.40, 0.60, -1.80]],
        0.30, { ...fatMat, seg: 48, rad: 12 });
      ST_lumpTube(THREE, cx, 0.11, 2.2, 3);
      const rc = tube(THREE, 0xe8ca80,
        [[0.70, 2.85, 1.35], [1.70, 2.15, 0.50], [2.05, 1.20, -0.70], [1.60, 0.40, -1.60], [0.60, -0.05, -2.00]],
        0.28, { ...fatMat, seg: 54, rad: 12 });
      ST_lumpTube(THREE, rc, 0.10, 2.2, 7);
      cx.add(rc);
      push({
        id: 'av-groove-fat', name: 'Atrioventricular groove fat',
        layer: myoLayer, system: 'circulatory', cuttable: true, detachable: true,
        note: 'A ring of pale-yellow fat filling the AV groove — the external marker of the plane between atria and ventricles. The circumflex on the left and the right coronary artery run buried inside it. Tease it away with closed forceps; a blade here severs the vessel you were trying to find.',
        mesh: cx,
      });
    }

    if (!have.has('iv-groove-fat')) {
      const lad = tube(THREE, 0xefd694,
        [[-0.15, 2.90, 1.75], [-0.35, 1.60, 2.05], [-0.50, 0.20, 1.95], [-0.62, -1.20, 1.50], [-0.55, -2.50, 0.85]],
        0.25, { ...fatMat, seg: 52, rad: 12 });
      ST_lumpTube(THREE, lad, 0.09, 2.4, 11);
      const piv = tube(THREE, 0xe9cd88,
        [[0.60, -0.05, -2.00], [0.25, -1.10, -1.70], [-0.05, -2.25, -1.10]],
        0.22, { ...fatMat, seg: 30, rad: 10 });
      ST_lumpTube(THREE, piv, 0.08, 2.4, 13);
      lad.add(piv);
      push({
        id: 'iv-groove-fat', name: 'Interventricular groove fat',
        layer: myoLayer, system: 'circulatory', cuttable: true, detachable: true,
        note: 'Fat in the anterior and posterior interventricular grooves, carrying the left anterior descending in front and the posterior interventricular branch behind. Those two grooves are the interventricular SEPTUM drawn on the outside of the heart — trace them and you know exactly where the internal wall stands before you open a single chamber, and you know which side of it your blade is on. Where the posterior groove meets the AV groove is the crux; in this right-dominant heart the posterior branch springs from the right coronary there.',
        mesh: lad,
      });
    }

    /* The fibrous sac is already present in heart.js; adding a second one would
     * put two membranes in the same place and make the first cut ambiguous. */
  }
  } catch (err) { return abort(err); }

  /* ---- the finished stack, for a layer HUD ------------------------------- */
  const names = ST_STACK_NAMES[specimenId] || [];
  const stack = [];
  for (let L = 0; L <= plan.total; L++) {
    const anchor = added.find((p) => p.layer === L) || parts.find((p) => p.layer === L);
    stack.push({ layer: L, id: anchor ? anchor.id : null, name: names[L] || (anchor ? anchor.name : 'Layer ' + L) });
  }

  /* ---- put the new strata into the specimen's own part list --------------
   * This is not optional bookkeeping. dissect.js's revealLayer() iterates the
   * `parts` array it was constructed with, and its byId/meshes tables are
   * snapshotted at construction — a descriptor that is only ever returned in
   * `added` is a mesh that is invisible (ST_adopt hid it), unpickable, and never
   * revealed by anything. The re-index above would then have opened two empty
   * slots in the layer stack for nothing.
   *
   * So: buildStrata must run AFTER buildSpecimen and BEFORE createDissection, and
   * it inserts into `parts` itself rather than trusting the caller to remember.
   * The stack above is built first, so nothing is counted twice. dispose()
   * splices these back out. */
  added.forEach((d) => { if (parts.indexOf(d) < 0) parts.push(d); });
  if (group.userData) group.userData.ST_strata = true;

  function dispose() {
    owned.forEach((m) => {
      group.remove(m);
      m.traverse((o) => {
        if (!o.isMesh) return;
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mm.dispose());
      });
    });
    owned.length = 0;
    // Undo the re-index too. dispose() that leaves the specimen re-indexed but
    // missing the layers that justified the re-index is worse than not disposing.
    original.forEach(({ part, layer }) => { part.layer = layer; });
    added.forEach((d) => {
      const i = parts.indexOf(d);
      if (i >= 0) parts.splice(i, 1);
    });
    added.length = 0;
    if (group.userData) group.userData.ST_strata = false;
  }

  return { added, stack, dispose };
}
