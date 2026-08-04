/*
 * cutting.js — a wound that OPENS.
 *
 * The thing this replaces (a dark tube drawn on top of the surface, plus a flap
 * that fades out) fails for one reason: nothing about it is *in* the tissue. A
 * real incision is a hole with a wall, and the wall is the only place a student
 * ever sees the layered architecture of an organ. That cut face is the teaching
 * payload. Everything here exists to make it legible.
 *
 * THE MODEL. One analytic displacement field, evaluated twice.
 *
 *   For a rest point at signed cross-track distance u from the cut line, at
 *   fractional position s along it:
 *       lateral(u,s) = u + sign(u)·G(s)·fall(|u|/Rpush)      (the lips part)
 *       height (u,s) = −D(s)·fall(|u|/Rs) + E(s)·bump(|u|/Rpush)   (trough + evert)
 *
 *   Evaluated over the PARENT mesh's vertices, it parts the tissue: the two
 *   halves separate, the margin sinks into a V-trough, and the lip immediately
 *   outside the margin rolls UP (cut skin under tension everts — that roll is
 *   most of what makes a wound read as a wound rather than a groove).
 *
 *   Evaluated densely over a strip, it produces the LINING: a skin that lies
 *   exactly on the parted parent surface (same function, same numbers, offset by
 *   one epsilon along the normal), banded by depth with the real colours of the
 *   strata the blade passed through. Because the lining is the parent's own
 *   displaced surface re-tessellated, it can never float above the tissue and can
 *   never sink behind it. That coincidence is the whole trick; do not "improve"
 *   one of the two evaluations without the other.
 *
 * THE LENS. Width and depth are tapered by sin(πs) raised to different powers —
 * width falls off fast (0.85), depth holds a plateau then drops (0.5). A blade
 * enters shallow, reaches depth quickly, rides, and lifts out. A constant-width
 * slot is a router cut; the taper is what makes it a knife.
 *
 * OWNERSHIP OF VERTICES — READ THIS BEFORE TOUCHING update().
 *   softbody.js also writes geometry.attributes.position on these same meshes,
 *   and it writes the FULL array from its own cached rest every frame for any
 *   part that is breathing/beating/pressed — which includes 'skin' and
 *   'muscle-wall', i.e. exactly the parts you cut. It therefore wipes us.
 *   Resolution: cutting runs AFTER softbody.update() in the frame and re-adds its
 *   own persistent offset array on top of whatever softbody just wrote. To stay
 *   idempotent when softbody is idle (and therefore did NOT rewrite), we keep a
 *   probe: the exact float we last wrote at the highest-magnitude affected
 *   vertex. If it is still there bit-for-bit, nobody rewrote and we subtract our
 *   previous offset before adding the new one. If it changed, the array is
 *   already clean. This is exact — no drift, no accumulation, no coupling to
 *   softbody's internals. ORDERING IS LOAD-BEARING: soft.update(dt) then
 *   cutting.update(dt).
 *
 * WHERE THE CUT LINE LIVES. The stroke arrives as dissect.js hit points, which are
 * raycast hits on the LIVE surface — and at the instant `incise` fires, that
 * surface is at its most deformed, because main.js has softbody pressing a dent
 * under the blade for as long as the student grips (up to ~0.30 world units, vs a
 * CUT_EPS stand-off of 0.010). Taken at face value the whole wound is authored
 * below the tissue and is left buried when the dent springs back. buildFrames
 * therefore SNAPS each frame origin along the surface normal onto the tangent
 * plane of the nearest rest vertex. Normal-only motion cannot shift the cut
 * sideways off the line the student drew — it only undoes the sink. If a caller
 * can supply the true undeformed vertex array it may pass `opts.rest`; absent
 * that, the snap is what keeps the invariant.
 *
 * PICKING. Wound meshes live in a Group parented to the cut mesh itself, so they
 * ride the flap through peel/lift for free — and dissect.js raycasts
 * NON-recursively over registered part meshes, so a child can never be hit. Belt
 * and braces: every wound mesh gets its `raycast` method replaced with a no-op,
 * so no raycaster anywhere in the app (present or future) can pick it, and it
 * carries no userData.partId.
 */

/* Strata columns. Colours are authored in sRGB and converted through
 * THREE.Color.setHex (r160 converts to the linear working space for us), and the
 * thickness fractions `t` are normalised at build time, so they only have to be
 * right relative to each other. These are the bands a student must be able to
 * name out loud from the screen — keep them defensible.
 *
 * Every band carries its own name (`n`). That is not decoration: strataOf() hands
 * the list to the shell and the viva, and a list of six anonymous hex ints cannot
 * be examined on. Order is ALWAYS outside-in, i.e. the order the blade meets them.
 */
const CUT_STRATA = {
  // Vertebrate integument. The frog's is thin, only lightly keratinised, and its
  // dermis holds mucous and granular (poison) glands rather than much fat — but
  // the column reads the same: epidermis, dermis, subcutis, deep fascia, muscle.
  skin: [
    { t: 0.07, c: 0xeadcc4, n: 'Epidermis' },              // keratinised, pale, avascular
    { t: 0.13, c: 0xd5817c, n: 'Papillary dermis' },       // capillary-rich, bright pink
    { t: 0.20, c: 0xb96a63, n: 'Reticular dermis' },       // dense collagen, duller rose
    { t: 0.28, c: 0xe7c263, n: 'Subcutis (hypodermis)' },  // adipose / lymph sac, buttery
    { t: 0.07, c: 0xedeae0, n: 'Deep fascia' },            // the white glint; it is a mirror
    { t: 0.25, c: 0x8c2b26, n: 'Skeletal muscle' },        // dark red
  ],
  fat: [
    { t: 0.05, c: 0xe8e4d6, n: 'Fascial film' },
    { t: 0.45, c: 0xefd07a, n: 'Adipose lobules' },        // pale, waxy
    { t: 0.38, c: 0xd8a94e, n: 'Deep lobules' },           // oil-stained
    { t: 0.12, c: 0xc08a6e, n: 'Fibrous septum' },         // carries the lobular vessel
  ],
  fascia: [
    { t: 0.30, c: 0xf1eee4, n: 'Aponeurotic surface' },    // glistening sheen
    { t: 0.34, c: 0xdcd6c4, n: 'Dense parallel collagen' },
    { t: 0.22, c: 0xe4c89a, n: 'Areolar layer' },          // loose tissue beneath
    { t: 0.14, c: 0x8c2b26, n: 'Muscle beneath' },
  ],
  muscle: [
    { t: 0.06, c: 0xe6decb, n: 'Epimysium' },
    { t: 0.40, c: 0x9c2f28, n: 'Muscle belly' },           // red, striated
    { t: 0.36, c: 0x7a211d, n: 'Deep fascicles' },         // better perfused: darker
    { t: 0.08, c: 0xd9b471, n: 'Perimysial fat' },
    { t: 0.10, c: 0xefe9d8, n: 'Tendon / aponeurosis' },   // the floor
  ],
  // Serosal-surfaced solid or air-filled viscus: lung, pericardium, gall bladder.
  serous: [
    { t: 0.14, c: 0xf0ede6, n: 'Mesothelium (serosa)' },   // glassy
    { t: 0.18, c: 0xe2c9a4, n: 'Subserosal areolar plane' },
    { t: 0.46, c: 0xc08e86, n: 'Septate air spaces' },     // frog lung is one faveolate sac
    { t: 0.22, c: 0x8e4a42, n: 'Congested base' },
  ],
  parenchyma: [
    { t: 0.06, c: 0xe4dac6, n: 'Capsule' },                // Glisson's, renal, splenic
    { t: 0.34, c: 0x8e4238, n: 'Cortex / superficial parenchyma' },
    { t: 0.40, c: 0x6a241e, n: 'Deep parenchyma' },        // blood-filled
    { t: 0.20, c: 0x3a1418, n: 'Interlobular venous plane' }, // nearly black
  ],
  // Hollow viscus wall — stomach, intestine, oesophagus, cloaca. This is the most
  // frequently cut column in a frog dissection and it is NOT muscle: the blade
  // enters from the peritoneal surface, so the canonical four coats appear in the
  // reverse of the order a histology text lists them, and the lumen is the floor.
  gut: [
    { t: 0.08, c: 0xf0ede6, n: 'Serosa (visceral peritoneum)' },
    { t: 0.16, c: 0xd9b9a4, n: 'Muscularis externa — longitudinal' },
    { t: 0.22, c: 0xc9967f, n: 'Muscularis externa — circular' },
    { t: 0.16, c: 0xe8d3b0, n: 'Submucosa' },              // loose; carries the plexus
    { t: 0.26, c: 0xa8564a, n: 'Mucosa' },                 // velvety, rugose, wettest
    { t: 0.12, c: 0x4a3a22, n: 'Lumen / contents' },
  ],
  // Great-vessel wall: dorsal aorta, ventral abdominal vein, the caval and
  // pulmonary trunks. The two elastic laminae are deliberately thin bright bands —
  // they are the landmark that tells media from intima on a real cut face.
  vessel: [
    { t: 0.26, c: 0xdcd2bd, n: 'Tunica adventitia' },      // collagen + vasa vasorum
    { t: 0.05, c: 0xf2ead6, n: 'External elastic lamina' },
    { t: 0.34, c: 0xc98f7e, n: 'Tunica media' },           // smooth muscle + elastin
    { t: 0.05, c: 0xf4ecdb, n: 'Internal elastic lamina' },
    { t: 0.08, c: 0xefe6e0, n: 'Tunica intima' },          // endothelium, glistening
    { t: 0.22, c: 0x39121a, n: 'Lumen (blood)' },          // near-black
  ],
  bone: [
    { t: 0.07, c: 0xe9e2d0, n: 'Periosteum' },
    { t: 0.30, c: 0xefe8d6, n: 'Cortical (compact) bone' },
    { t: 0.30, c: 0xdcc9a8, n: 'Trabecular (cancellous) bone' },
    { t: 0.23, c: 0x8e2b2a, n: 'Red marrow' },             // haematopoietic
    { t: 0.10, c: 0xe4c477, n: 'Yellow marrow' },
  ],
  // Peripheral nerve trunk. Cut across, it is pearly and does not bleed — the
  // single most useful visual for teaching why a nerve is not a vessel.
  nerve: [
    { t: 0.22, c: 0xe8dcbc, n: 'Epineurium' },             // fatty-fibrous sheath
    { t: 0.12, c: 0xf2eee2, n: 'Perineurium' },            // lamellar, glistening
    { t: 0.42, c: 0xeae4d6, n: 'Fascicle (myelinated axons)' },
    { t: 0.24, c: 0xd5bda6, n: 'Interfascicular tissue' }, // endoneurium + vasa nervorum
  ],
};

const CUT_OPEN_MS = 500;        // tissue does not snap open
const CUT_EPS = 0.010;          // lining stand-off along the surface normal
const CUT_GAPE_MAX = 0.12;      // world units of lateral parting at amount = 1
const CUT_RN = 0.42;            // reject the far side of a closed shell

const CUT_clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// Decreasing smoothstep: 1 at the cut line, 0 at the edge of influence.
const CUT_fall = (x) => (x >= 1 ? 0 : x <= 0 ? 1 : 1 - x * x * (3 - 2 * x));
// Exact inverse of CUT_fall. Closed form for the smoothstep inverse — we need it
// to place a ring at an exact DEPTH fraction (so band boundaries land on stratum
// boundaries) rather than at an arbitrary lateral position.
const CUT_fallInv = (phi) => 0.5 - Math.sin(Math.asin(CUT_clamp(2 * phi - 1, -1, 1)) / 3);
// Eversion hump: zero at the line and at the edge, peaking between — the lip roll.
const CUT_bump = (x) => (x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x));
const CUT_easeOut = (t) => 1 - Math.pow(1 - t, 3);
// Deterministic per-vertex mottle. Local rather than anatomy.js's vnoise so this
// module has no ordering dependency on another file's globals.
const CUT_hash = (a, b) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
// Installed on every wound mesh. A raycaster that walks into one finds nothing.
const CUT_noRaycast = function () {};

// Which stratum column a part is made of, when the caller does not say.
//
// ORDER IS THE WHOLE ALGORITHM. Every rule below is a substring test, and the
// specimen's ids overlap heavily ('aortic-cusp' vs 'aortic-root', 'gall-bladder'
// vs 'urinary-bladder', 'renal-vessels' vs 'kidney'), so the more specific
// structure must be claimed first. Two rules that matter in particular:
//   - fibrous cardiac structures (valve cusps, leaflets, chordae) are tested
//     BEFORE the vessel rule, or 'aortic-cusp' becomes a piece of aorta;
//   - the hollow viscera are tested before the muscle fallback, or the stomach and
//     both intestines — the most-cut structures in the whole dissection — come out
//     as slabs of skeletal muscle, which is what the previous version did.
function CUT_inferTissue(opts) {
  if (opts.tissue && CUT_STRATA[opts.tissue]) return opts.tissue;
  const id = String(opts.partId || '');
  const sys = String(opts.system || '');
  const both = id + ' ' + sys;

  if (/skin|integument|derm/i.test(both)) return 'skin';
  if (/fat|adipose/i.test(id)) return 'fat';
  if (/vertebra|skeletal|bone|femur|skull|cartilage|sternum|girdle/i.test(both)) return 'bone';
  if (/nerve|sciatic|ganglion|neural|vagus|spinal/i.test(id)) return 'nerve';
  // Fibrous sheets and cords: valve apparatus, tendon, ligament, aponeurosis,
  // mesentery. Deliberately ahead of the vessel rule.
  if (/valve|leaflet|cusp|chordae|tendon|ligament|fascia|linea|aponeur|peritone|mesent|fold|annulus/i.test(id)) return 'fascia';
  if (/aort|arter|vein|venous|vena|cava|svc|ivc|trunk|sinus|portal|iliac|carotid|brachial|circumflex|coronar|vessel|capillar|arch|\blad\b/i.test(id)) return 'vessel';
  if (/stomach|intestin|gut|oesophag|esophag|duoden|ileum|jejun|colon|rectum|cloaca|bladder|pylor|caec|cecum/i.test(id)) return 'gut';
  if (/lung|pericard|pleur|serosa|serous|omentum/i.test(both)) return 'serous';
  if (/liver|hepat|kidney|renal|spleen|splen|lobe|pancrea|testis|ovar|gonad|adrenal|thyroid|fat-body/i.test(id)) return 'parenchyma';
  if (/muscle|wall|ventricle|atrium|auricle|myocard|heart|papillar|septum|band|conus|muscular/i.test(both)) return 'muscle';

  // Weak system-level hint, last, before the default.
  if (/digestive/i.test(sys)) return 'gut';
  if (/circulatory/i.test(sys)) return 'vessel';
  if (/urogenital/i.test(sys)) return 'parenchyma';
  return 'muscle';
}

// Ring plan for one cross-section: two rings per stratum at identical depths give
// a HARD colour boundary (the shared-depth pair collapses to a zero-area quad the
// GPU discards, and the two colours never interpolate into each other). A gradient
// here would turn six named layers into one brown smear.
function CUT_ringPlan(strata, hi) {
  const rings = [];
  let acc = 0;
  for (let k = 0; k < strata.length; k++) {
    const t = Math.max(1e-4, strata[k].t);
    rings.push({ phi: acc, hex: strata[k].c });
    if (hi && t > 0.18) rings.push({ phi: acc + t * 0.5, hex: strata[k].c });
    acc += t;
    rings.push({ phi: acc, hex: strata[k].c });
  }
  const total = acc || 1;
  for (let i = 0; i < rings.length; i++) rings[i].phi /= total;
  return rings;
}

export function createCutting(THREE, scene) {
  const wounds = new Map();          // partId -> record. ONE per part, deliberately:
                                     // two records sharing a geometry would each
                                     // see the other's write and double-apply.
  const rests = new Map();           // partId -> pristine Float32Array of positions

  // Orphan parent, only used when a caller hands us a mesh with no parent. Never
  // registered as a part, never given a partId; nothing can pick out of it.
  const root = new THREE.Group();
  root.name = 'cut-wounds';
  root.userData.noPick = true;
  scene.add(root);

  let quality = 1;

  /* Scratch. Nothing in update() may allocate — this runs at 60fps next to hand
   * tracking on a school laptop. */
  const _v = new THREE.Vector3();
  const _t = new THREE.Vector3();
  const _n = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _c = new THREE.Color();
  const _p = new THREE.Vector3();
  // Dedicated, never borrowed. buildFrames used to fall back to `_p.set(0,0,0)`
  // for the mesh centre and then reuse _p inside the very loop that reads it —
  // so on any geometry without a bounding sphere the centre silently became the
  // last vertex offset computed, every normal flipped at random and the wound
  // buried itself inside the organ. Aliasing a scratch vector with a value that
  // outlives one statement is the bug; a separate vector is the fix.
  const _ctr = new THREE.Vector3();

  const baseMaterial = new THREE.MeshPhysicalMaterial({
    // White base: the bands live entirely in vertex colours, and multiplying them
    // by a tinted base would drag every stratum toward one hue.
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.55,
    metalness: 0,
    // A cut face is WET. The clearcoat is the single biggest cue that this is
    // living tissue and not a painted decal.
    clearcoat: 0.9,
    clearcoatRoughness: 0.18,
    sheen: 0.45,
    sheenColor: new THREE.Color(0xd8746a),
    sheenRoughness: 0.6,
    // DoubleSide: at oblique angles you look through the near lip at the far wall.
    // The mesh is a few thousand triangles; correctness is worth more than the
    // culling here, and it removes a whole class of "the wound vanished" bugs.
    side: THREE.DoubleSide,
    // Geometric epsilon + polygon offset. Belt and braces against z-fighting with
    // the parent surface the lining is deliberately coincident with.
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  baseMaterial.emissive = new THREE.Color(0x000000);   // house rule: black base emissive

  /* ---- frames along the stroke ------------------------------------------ */
  // Per-sample orthonormal frame (T along the cut, N out of the surface, B the
  // binormal the lips part along). N is taken from the parent's own vertex
  // normals — a hit normal from one frame of a hand-tracked stroke is noisy, and
  // "toward the camera" is useless here because the frog camera is nearly
  // top-down and any camera-relative axis foreshortens into nothing.
  function buildFrames(rec, localPts) {
    const K = rec.K;
    const O = rec.O, T = rec.T, N = rec.N, B = rec.B;

    // Resample the (jittery) stroke to K evenly-spaced points, then smooth. A
    // scalpel cut is smooth; a hand is not.
    const seg = [];
    let total = 0;
    for (let i = 1; i < localPts.length; i++) {
      const d = localPts[i].distanceTo(localPts[i - 1]);
      seg.push(d); total += d;
    }
    if (total < 1e-5) return false;
    for (let i = 0; i < K; i++) {
      const want = (i / (K - 1)) * total;
      let acc = 0, j = 0;
      while (j < seg.length - 1 && acc + seg[j] < want) { acc += seg[j]; j++; }
      const f = seg[j] > 1e-6 ? (want - acc) / seg[j] : 0;
      _v.copy(localPts[j]).lerp(localPts[j + 1], CUT_clamp(f, 0, 1));
      O[i * 3] = _v.x; O[i * 3 + 1] = _v.y; O[i * 3 + 2] = _v.z;
    }
    // Three passes of a 1-2-1 kernel: enough to kill tracker jitter, not enough
    // to pull the cut off the guide line the student was following.
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < K - 1; i++) {
        for (let k = 0; k < 3; k++) {
          O[i * 3 + k] = (O[(i - 1) * 3 + k] + 2 * O[i * 3 + k] + O[(i + 1) * 3 + k]) * 0.25;
        }
      }
    }

    const geo = rec.mesh.geometry;
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    // COPY, never alias: computeBoundingSphere() further down the frame replaces
    // the numbers inside geo.boundingSphere.center, and _p is scratch.
    if (geo.boundingSphere) _ctr.copy(geo.boundingSphere.center); else _ctr.set(0, 0, 0);
    const ctr = _ctr;
    const rest = rec.rest;
    const nrm = geo.attributes.normal;
    const vcount = rest.length / 3;
    // Sub-sample dense geometry: we only need the nearest vertex's NORMAL, and a
    // stride of a few thousand candidates is indistinguishable at this scale.
    const stride = Math.max(1, Math.floor(vcount / 3000));

    let px = 0, py = 0, pz = 0;      // previous binormal, for sign continuity
    for (let i = 0; i < K; i++) {
      const i3 = i * 3;
      // tangent by central difference
      const a = Math.max(0, i - 1) * 3, b2 = Math.min(K - 1, i + 1) * 3;
      _t.set(O[b2] - O[a], O[b2 + 1] - O[a + 1], O[b2 + 2] - O[a + 2]);
      if (_t.lengthSq() < 1e-10) _t.set(1, 0, 0);
      _t.normalize();

      // nearest rest vertex -> its normal
      let best = -1, bd = Infinity;
      for (let vi = 0; vi < vcount; vi += stride) {
        const dx = rest[vi * 3] - O[i3], dy = rest[vi * 3 + 1] - O[i3 + 1], dz = rest[vi * 3 + 2] - O[i3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bd) { bd = d2; best = vi; }
      }
      if (best >= 0 && nrm) _n.set(nrm.getX(best), nrm.getY(best), nrm.getZ(best));
      else _n.set(O[i3] - ctr.x, O[i3 + 1] - ctr.y, O[i3 + 2] - ctr.z);
      if (_n.lengthSq() < 1e-10) _n.set(0, 1, 0);
      _n.normalize();
      // Force it OUTWARD. An inward normal buries the whole wound inside the organ.
      _p.set(O[i3] - ctr.x, O[i3 + 1] - ctr.y, O[i3 + 2] - ctr.z);
      if (_n.dot(_p) < 0) _n.negate();

      // SNAP THE ORIGIN ONTO THE REST SURFACE.
      //
      // The stroke points are dissect.js hit points, i.e. raycast hits on the
      // LIVE surface — and at the instant an `incise` event fires, that surface is
      // at its most deformed: main.js has softbody pressing a dent under the blade
      // for as long as the student is gripping, up to ~0.30 world units straight
      // down at the contact point, and the ray hits the floor of that dent. So the
      // cut line was being authored 0.1-0.3 units BELOW the tissue it is supposed
      // to be in, while CUT_EPS — the stand-off that is meant to keep the lining
      // clear of the parent surface — is 0.010. When the dent springs back, the
      // whole wound is left buried inside the organ, which is precisely the
      // failure this file exists to prevent.
      //
      // The fix is local and needs nothing from softbody: slide the origin along
      // the surface normal until it lies in the tangent plane of the nearest REST
      // vertex. Normal-only motion cannot move the cut sideways off the line the
      // student drew; it only undoes the sink. It also quietly removes ordinary
      // raycast/breathing sampling error, so it is correct in the undented case
      // too, not just a special-case patch.
      //
      // Done in this loop rather than a pre-pass, which means the central-
      // difference tangent at sample i reads O[i+1] before it is snapped. The
      // error is the DIFFERENCE between two neighbouring snaps, not the snap
      // itself — the dent is smooth over the ~0.1-unit spacing of these samples,
      // and three 1-2-1 passes have already run — so it is second order. A
      // pre-pass would cost a second nearest-vertex sweep over the whole mesh on
      // every rebuild, and rebuild fires up to eleven times a second during a
      // drag. Not worth it for a term that does not survive the smoothing.
      if (best >= 0) {
        const b3 = best * 3;
        const dp = (rest[b3] - O[i3]) * _n.x
                 + (rest[b3 + 1] - O[i3 + 1]) * _n.y
                 + (rest[b3 + 2] - O[i3 + 2]) * _n.z;
        O[i3] += _n.x * dp; O[i3 + 1] += _n.y * dp; O[i3 + 2] += _n.z * dp;
      }

      _b.crossVectors(_t, _n);
      if (_b.lengthSq() < 1e-10) { _b.set(-_t.z, 0, _t.x); }
      _b.normalize();
      // Parallel-transport the SIGN. If B flips halfway along the stroke the lips
      // swap sides and the wound folds through itself.
      if (i > 0 && (_b.x * px + _b.y * py + _b.z * pz) < 0) _b.negate();
      px = _b.x; py = _b.y; pz = _b.z;
      // Re-orthogonalise N so the frame is exactly orthonormal (the vertex normal
      // is not generally perpendicular to the stroke tangent).
      _n.crossVectors(_b, _t).normalize();

      T[i3] = _t.x; T[i3 + 1] = _t.y; T[i3 + 2] = _t.z;
      N[i3] = _n.x; N[i3 + 1] = _n.y; N[i3 + 2] = _n.z;
      B[i3] = _b.x; B[i3 + 1] = _b.y; B[i3 + 2] = _b.z;
    }
    return true;
  }

  /* ---- the displacement field, per along-track sample -------------------- */
  // Returns nothing; fills rec.prof (4 floats per sample: gape, depth, troughRun,
  // evert). Both the parent push and the lining read from here, which is the only
  // reason they stay welded together.
  function buildProfile(rec) {
    const K = rec.K, prof = rec.prof;
    const D = rec.depthMax, G = CUT_GAPE_MAX, RS = rec.troughRun;
    for (let i = 0; i < K; i++) {
      const s = K > 1 ? i / (K - 1) : 0.5;
      const sn = Math.sin(Math.PI * s);
      const tw = Math.pow(sn, 0.85);          // width: falls away fast at the ends
      const td = Math.pow(sn, 0.5);           // depth: plateaus, then drops
      prof[i * 4] = G * tw;                                  // gape
      prof[i * 4 + 1] = D * td;                              // depth
      prof[i * 4 + 2] = RS * (0.30 + 0.70 * tw);             // trough half-run
      prof[i * 4 + 3] = 0.20 * D * td;                       // eversion amplitude
    }
  }

  /* ---- parent deformation ------------------------------------------------ */
  // Classify every parent vertex once, and bake its FULL-OPEN offset. Per frame we
  // only scale that offset by k — so the cost of an open wound is one multiply-add
  // over a couple of hundred vertices, not a re-solve.
  function buildParentOffsets(rec) {
    const rest = rec.rest, K = rec.K;
    const O = rec.O, T = rec.T, N = rec.N, B = rec.B, prof = rec.prof;
    const RP = rec.pushRun;
    const vcount = rest.length / 3;

    let minx = Infinity, miny = Infinity, minz = Infinity;
    let maxx = -Infinity, maxy = -Infinity, maxz = -Infinity;
    for (let i = 0; i < K; i++) {
      minx = Math.min(minx, O[i * 3]); maxx = Math.max(maxx, O[i * 3]);
      miny = Math.min(miny, O[i * 3 + 1]); maxy = Math.max(maxy, O[i * 3 + 1]);
      minz = Math.min(minz, O[i * 3 + 2]); maxz = Math.max(maxz, O[i * 3 + 2]);
    }
    const pad = RP + CUT_RN;
    minx -= pad; miny -= pad; minz -= pad; maxx += pad; maxy += pad; maxz += pad;

    const idx = [], off = [];
    for (let vi = 0; vi < vcount; vi++) {
      const v3 = vi * 3;
      const x = rest[v3], y = rest[v3 + 1], z = rest[v3 + 2];
      if (x < minx || x > maxx || y < miny || y > maxy || z < minz || z > maxz) continue;

      let bi = -1, bd = Infinity;
      for (let i = 0; i < K; i++) {
        const dx = x - O[i * 3], dy = y - O[i * 3 + 1], dz = z - O[i * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bd) { bd = d2; bi = i; }
      }
      if (bi < 0) continue;
      const i3 = bi * 3;
      const dx = x - O[i3], dy = y - O[i3 + 1], dz = z - O[i3 + 2];
      const u = dx * B[i3] + dy * B[i3 + 1] + dz * B[i3 + 2];
      const dn = dx * N[i3] + dy * N[i3 + 1] + dz * N[i3 + 2];
      const au = Math.abs(u), adn = Math.abs(dn);
      if (au > RP || adn > CUT_RN) continue;   // <- the adn test is what stops us
                                               //    from tearing the DORSAL surface
                                               //    of a closed shell open too.
      const wN = CUT_fall(adn / CUT_RN);
      const g = prof[bi * 4], d = prof[bi * 4 + 1], rs = prof[bi * 4 + 2], ev = prof[bi * 4 + 3];
      const sgn = u > 0 ? 1 : u < 0 ? -1 : 0;
      const lat = sgn * g * CUT_fall(au / RP) * wN;
      const hgt = (-d * CUT_fall(au / rs) + ev * CUT_bump(au / RP)) * wN;
      const ox = B[i3] * lat + N[i3] * hgt;
      const oy = B[i3 + 1] * lat + N[i3 + 1] * hgt;
      const oz = B[i3 + 2] * lat + N[i3 + 2] * hgt;
      if (Math.abs(ox) + Math.abs(oy) + Math.abs(oz) < 1e-5) continue;
      idx.push(vi); off.push(ox, oy, oz);
    }

    rec.idx = new Uint32Array(idx);
    rec.off = new Float32Array(off);
    rec.applied = new Float32Array(off.length);
    rec.probeAt = -1;
    rec.probeVal = NaN;
    // Probe = the affected vertex we displace HARDEST. Its x is the sentinel that
    // tells us next frame whether softbody rewrote the array behind our back.
    let bestMag = 0;
    for (let a = 0; a < rec.idx.length; a++) {
      const m = Math.abs(rec.off[a * 3]) + Math.abs(rec.off[a * 3 + 1]) + Math.abs(rec.off[a * 3 + 2]);
      if (m > bestMag) { bestMag = m; rec.probeAt = a; }
    }
  }

  // Write the parent's vertices. See the ownership note at the top of the file.
  function applyParent(rec, k) {
    const pos = rec.pos, arr = pos.array;
    const idx = rec.idx, off = rec.off, applied = rec.applied;
    if (!idx || !idx.length) return;

    // Bit-exact sentinel: if the float we left at the probe is still there, nobody
    // (softbody) rewrote this array since our last pass, so it still carries our
    // previous offset and we must remove it before adding the new one.
    const stale = rec.probeAt >= 0 && arr[idx[rec.probeAt] * 3] === rec.probeVal;

    for (let a = 0; a < idx.length; a++) {
      const i3 = idx[a] * 3, a3 = a * 3;
      let x = arr[i3], y = arr[i3 + 1], z = arr[i3 + 2];
      if (stale) { x -= applied[a3]; y -= applied[a3 + 1]; z -= applied[a3 + 2]; }
      const ox = off[a3] * k, oy = off[a3 + 1] * k, oz = off[a3 + 2] * k;
      arr[i3] = x + ox; arr[i3 + 1] = y + oy; arr[i3 + 2] = z + oz;
      applied[a3] = ox; applied[a3 + 1] = oy; applied[a3 + 2] = oz;
    }
    if (rec.probeAt >= 0) rec.probeVal = arr[idx[rec.probeAt] * 3];

    const geo = rec.mesh.geometry;
    pos.needsUpdate = true;
    // Raycaster does a bounding-SPHERE reject before it looks at a single
    // triangle. Skip these and the organ silently becomes unpickable — no error,
    // no warning, just "clicking stopped working". Cheap for the one or two parts
    // that actually carry a wound.
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
    // Normals only while the gape is actually changing: the displacement is a
    // shallow lateral shear and softbody recomputes them every frame anyway for
    // the living parts, so paying for it at rest buys nothing.
    if (rec.moving) geo.computeVertexNormals();
  }

  /* ---- the lining -------------------------------------------------------- */
  // Two vertex arrays: `base` is the wound fully CLOSED (a hairline score lying on
  // the surface) and `delta` carries it to fully open. Animating is then a scaled
  // add — no re-tessellation while it opens, which is what keeps a 500ms ease from
  // costing 30 geometry rebuilds.
  function buildLining(rec) {
    const K = rec.K;
    const rings = rec.rings, R = rings.length, cols = R * 2;
    const vcount = K * cols;
    const base = new Float32Array(vcount * 3);
    const delta = new Float32Array(vcount * 3);
    const colr = new Float32Array(vcount * 3);
    const O = rec.O, N = rec.N, B = rec.B, prof = rec.prof;
    const RP = rec.pushRun;

    for (let i = 0; i < K; i++) {
      const i3 = i * 3;
      const g = prof[i * 4], d = prof[i * 4 + 1], rs = prof[i * 4 + 2], ev = prof[i * 4 + 3];
      for (let c = 0; c < cols; c++) {
        // Columns run outer-left -> floor-left -> floor-right -> outer-right, so
        // the cross-section is one continuous polyline and the two innermost
        // columns bridge the floor between the lips.
        const side = c < R ? -1 : 1;
        const r = c < R ? c : (cols - 1 - c);
        const phi = rings[r].phi;
        const ur = rs * CUT_fallInv(phi);                 // rest cross-track for this DEPTH
        const lat = side * (ur + g * CUT_fall(ur / RP));  // ...displaced exactly as the parent is
        const hgt = -d * phi + ev * CUT_bump(ur / RP) + CUT_EPS;
        // Closed state: the same ring collapsed to a hairline on the surface.
        const lat0 = side * ur * 0.05;

        const o = (i * cols + c) * 3;
        const bx = O[i3] + B[i3] * lat0 + N[i3] * CUT_EPS;
        const by = O[i3 + 1] + B[i3 + 1] * lat0 + N[i3 + 1] * CUT_EPS;
        const bz = O[i3 + 2] + B[i3 + 2] * lat0 + N[i3 + 2] * CUT_EPS;
        base[o] = bx; base[o + 1] = by; base[o + 2] = bz;
        delta[o] = O[i3] + B[i3] * lat + N[i3] * hgt - bx;
        delta[o + 1] = O[i3 + 1] + B[i3 + 1] * lat + N[i3 + 1] * hgt - by;
        delta[o + 2] = O[i3 + 2] + B[i3 + 2] * lat + N[i3 + 2] * hgt - bz;

        // Colour. Ambient occlusion by depth is not decoration — without it the
        // bands read as a painted stripe. Light does not reach the floor of a
        // wound, and blood pools there, so the column also drifts venous with
        // depth.
        _c.setHex(rings[r].hex);
        const ao = 0.30 + 0.70 * Math.pow(1 - phi, 1.3);
        const mott = 1 + (CUT_hash(i * 0.7 + 3.1, r * 1.9) - 0.5) * 0.16;
        let rr = _c.r * ao * mott, gg = _c.g * ao * mott, bb = _c.b * ao * mott;
        const pool = phi * phi * 0.22;
        rr += (0.055 - rr) * pool; gg += (0.010 - gg) * pool; bb += (0.013 - bb) * pool;
        colr[o] = rr; colr[o + 1] = gg; colr[o + 2] = bb;
      }
    }

    const tri = new Uint32Array((K - 1) * (cols - 1) * 6);
    let w = 0;
    for (let i = 0; i < K - 1; i++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = i * cols + c, b2 = a + 1, dd = (i + 1) * cols + c, e = dd + 1;
        tri[w++] = a; tri[w++] = dd; tri[w++] = b2;
        tri[w++] = b2; tri[w++] = dd; tri[w++] = e;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(base), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    geo.setIndex(new THREE.BufferAttribute(tri, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.computeBoundingBox();

    rec.linBase = base;
    rec.linDelta = delta;
    if (rec.lining) {
      rec.group.remove(rec.lining);
      rec.lining.geometry.dispose();
      rec.lining.geometry = geo;
      rec.group.add(rec.lining);
    } else {
      const m = new THREE.Mesh(geo, baseMaterial.clone());
      // No partId, ever. Plus a hard no-op raycast so that no raycaster anywhere
      // in the app — including ones written after this file — can pick a wound.
      m.raycast = CUT_noRaycast;
      m.castShadow = false;
      m.receiveShadow = true;
      m.renderOrder = 2;
      m.userData.noPick = true;
      rec.lining = m;
      rec.group.add(m);
    }
    rec.linDirty = true;
  }

  function applyLining(rec, k) {
    if (!rec.lining) return;
    const geo = rec.lining.geometry;
    const pos = geo.attributes.position, arr = pos.array;
    const base = rec.linBase, del = rec.linDelta;
    for (let i = 0; i < arr.length; i++) arr[i] = base[i] + del[i] * k;
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    geo.computeBoundingBox();
  }

  /* ---- (re)build ---------------------------------------------------------- */
  function rebuild(rec) {
    // UNWIND FIRST. buildParentOffsets() throws away idx/off/applied and starts a
    // fresh accounting, so any displacement still sitting in the position array
    // from the previous plan becomes unattributable and can never be removed
    // again. On a part softbody does not animate (nothing in SB_LIFE matches it,
    // and it is not being pressed) nobody else ever rewrites that array either,
    // so every grow() during a drag — one every 90ms — used to laminate another
    // full gape onto the mesh permanently. Ten seconds of dragging tore the organ
    // apart. Zeroing through applyParent keeps the probe/`applied` bookkeeping
    // exact rather than guessing at the old numbers.
    applyParent(rec, 0);

    const hi = quality >= 0.5;
    let len = 0;
    for (let i = 1; i < rec.local.length; i++) len += rec.local[i].distanceTo(rec.local[i - 1]);
    rec.length = len;
    // Segment count follows the stroke's actual length so a 6-unit midline cut and
    // a 0.6-unit nick both get an honest silhouette; setQuality(0) halves it.
    rec.K = CUT_clamp(Math.round(len * (hi ? 11 : 5.5)), hi ? 14 : 8, hi ? 72 : 30);

    rec.O = new Float32Array(rec.K * 3);
    rec.T = new Float32Array(rec.K * 3);
    rec.N = new Float32Array(rec.K * 3);
    rec.B = new Float32Array(rec.K * 3);
    rec.prof = new Float32Array(rec.K * 4);
    rec.rings = CUT_ringPlan(CUT_STRATA[rec.tissue] || CUT_STRATA.muscle, hi);

    if (!buildFrames(rec, rec.local)) return false;
    buildProfile(rec);
    buildParentOffsets(rec);
    buildLining(rec);
    rec.linDirty = true;
    return true;
  }

  // Stroke points arrive in WORLD space (they are dissect.js contact points). The
  // wound is built in the parent mesh's LOCAL space so it rides the flap through
  // peel and lift without any per-frame transform bookkeeping.
  function toLocal(rec, worldPts) {
    // updateWorldMatrix(true, false), not updateMatrixWorld(): the mesh sits under
    // the specimen group, and updateMatrixWorld() composes against whatever the
    // PARENT's matrixWorld currently holds. If an ancestor moved this frame and
    // has not been flushed, that is stale and every stroke point lands in the
    // wrong place — the same class of bug as raycasting without updating the
    // camera. Walking the parents costs nothing at this call rate.
    if (rec.mesh.updateWorldMatrix) rec.mesh.updateWorldMatrix(true, false);
    else rec.mesh.updateMatrixWorld(true);
    const out = [];
    let last = null;
    for (let i = 0; i < worldPts.length; i++) {
      const src = worldPts[i];
      _p.set(src.x, src.y, src.z);
      rec.mesh.worldToLocal(_p);
      if (last && _p.distanceToSquared(last) < 1e-6) continue;
      last = _p.clone();
      out.push(last);
    }
    return out;
  }

  // softbody's idle physiology (breathe / beat / drift) is a RADIAL scale about
  // the mesh origin — `p *= 1 + amp`. So the ratio of the live geometry's radius
  // to its rest radius recovers that scale exactly, without reaching into
  // softbody's closure for a number it does not expose. Feeding it to the wound
  // group's scale welds the wound to a breathing surface; without it the skin
  // slides out from under the incision by ~0.02 units every breath, which at this
  // camera distance reads as the wound shimmering. Measured over a stride of the
  // whole mesh rather than one vertex so our own gape (a couple of hundred
  // vertices moved by <=0.12) cannot bias it.
  function currentBreath(rec) {
    const cur = rec.pos.array, rest = rec.rest;
    const n = rest.length / 3;
    const stride = Math.max(1, Math.floor(n / 220));
    let sc = 0, sr = 0;
    for (let vi = 0; vi < n; vi += stride) {
      const i3 = vi * 3;
      sc += cur[i3] * cur[i3] + cur[i3 + 1] * cur[i3 + 1] + cur[i3 + 2] * cur[i3 + 2];
      sr += rest[i3] * rest[i3] + rest[i3 + 1] * rest[i3 + 1] + rest[i3 + 2] * rest[i3 + 2];
    }
    if (!(sr > 1e-6)) return 1;
    return CUT_clamp(Math.sqrt(sc / sr), 0.85, 1.15);
  }

  function destroy(rec) {
    // Give the parent's vertices back before letting go. Subtracting our own
    // offset (rather than blitting rec.rest over the array) is deliberate: on a
    // breathing part the array belongs to softbody, and stamping a rest pose over
    // it would fight softbody for a frame and pop the organ. The cost is that the
    // restore is float32-exact rather than bit-exact — measured residual is ~1e-6
    // world units on a 3-unit organ, i.e. four orders of magnitude below anything
    // visible, and it does not accumulate because `rest` is snapshotted once.
    if (rec.idx && rec.idx.length) {
      applyParent(rec, 0);
      rec.idx = null; rec.off = null; rec.applied = null;
    }
    if (rec.lining) {
      rec.lining.geometry.dispose();
      if (rec.lining.material && rec.lining.material !== baseMaterial) rec.lining.material.dispose();
      rec.group.remove(rec.lining);
      rec.lining = null;
    }
    if (rec.group.parent) rec.group.parent.remove(rec.group);
  }

  /* ---- public ------------------------------------------------------------- */
  function open(opts) {
    if (!opts || !opts.mesh || !opts.points || opts.points.length < 2) return false;
    const partId = opts.partId || opts.mesh.userData.partId || ('cut-' + wounds.size);
    const geo = opts.mesh.geometry;
    if (!geo || !geo.attributes || !geo.attributes.position) return false;

    let rec = wounds.get(partId);
    const fresh = !rec;
    if (!rec) {
      // Snapshot the rest positions ONCE per part and never again: a second
      // snapshot taken while the wound is open would bake our own gape into the
      // "rest" pose and the next rebuild would compound it.
      //
      // CAVEAT, and it is a real one. open() fires on an `incise` event, which is
      // exactly the moment the tissue is at its most deformed — softbody has the
      // part dented under the blade (main.js presses while gripping) and, if it
      // breathes, swollen as well. Snapshotting the LIVE array then calls that
      // deformed pose "rest", and the lining is authored against it: when the dent
      // springs back the lining stays where the dent was, i.e. buried a couple of
      // tenths of a unit inside the organ. CUT_EPS is 0.010; the dent is up to
      // ~0.3. That defeats the entire premise of this file.
      //
      // So: if the caller can hand us the true undeformed array — softbody caches
      // exactly one, per part — we take it and copy it (never alias: softbody
      // writes its own copy and we must not follow). The live snapshot stays as
      // the fallback, and is correct whenever nothing is animating the part.
      if (!rests.has(partId)) {
        const supplied = opts.rest && opts.rest.length === geo.attributes.position.array.length
          ? opts.rest : geo.attributes.position.array;
        rests.set(partId, new Float32Array(supplied));
      }
      const group = new THREE.Group();
      group.name = 'cut:' + partId;
      group.userData.noPick = true;         // and deliberately NO partId
      (opts.mesh || root).add(group);
      rec = {
        partId, mesh: opts.mesh, group,
        pos: geo.attributes.position,
        rest: rests.get(partId),
        lining: null, linBase: null, linDelta: null, linDirty: false,
        idx: null, off: null, applied: null, probeAt: -1, probeVal: NaN,
        k: 0, kFrom: 0, kTo: 0, phase: 1, moving: false, grewAt: 0,
      };
      wounds.set(partId, rec);
    }

    // Re-seat the attribute reference on every open: a geometry the app rebuilt
    // between two incisions would leave us writing into an orphaned array, which
    // shows up as a wound that simply does nothing.
    rec.pos = geo.attributes.position;
    rec.mesh = opts.mesh;

    rec.tissue = CUT_inferTissue({ partId, tissue: opts.tissue, system: opts.system });
    // A frog's body wall is millimetres thick; a liver is not. depth 0..1 spans a
    // shallow score to a full-thickness incision through to the layer beneath.
    const depth = opts.depth == null ? 0.55 : CUT_clamp(opts.depth, 0, 1);
    rec.depthMax = 0.14 + depth * 0.30;
    rec.troughRun = rec.depthMax * 1.15;    // ~40 degree wall: steep enough to be a
                                            // cut, shallow enough that the bands are
                                            // not edge-on to a top-down camera.
    rec.pushRun = rec.troughRun * 2.1;      // tension distorts far wider than it parts
    rec.local = restSpace(rec, toLocal(rec, opts.points));
    if (rec.local.length < 2 || !rebuild(rec)) {
      // Only tear down a wound this call actually created; a failed re-open must
      // not delete the perfectly good incision that was already there.
      if (fresh) { wounds.delete(partId); destroy(rec); }
      return false;
    }

    setTarget(rec, opts.amount == null ? 0.62 : CUT_clamp(opts.amount, 0, 1));
    return true;
  }

  // The stroke points are sampled off the LIVE (breathing) surface, but the wound
  // is authored in rest space and the group scale re-applies the breath every
  // frame. Divide it out here or it gets counted twice.
  function restSpace(rec, pts) {
    const bs = currentBreath(rec);
    if (Math.abs(bs - 1) > 1e-4) for (let i = 0; i < pts.length; i++) pts[i].multiplyScalar(1 / bs);
    return pts;
  }

  function grow(partId, points) {
    const rec = wounds.get(partId);
    if (!rec || !points || points.length < 2) return false;
    // Rebuilding re-tessellates and re-classifies every affected parent vertex;
    // throttle it, because grow() is called from inside a live drag.
    const now = performance.now();
    if (now - (rec.grewAt || 0) < 90) return true;
    rec.grewAt = now;
    rec.local = restSpace(rec, toLocal(rec, points));
    if (rec.local.length < 2) return false;
    return rebuild(rec);
  }

  function setTarget(rec, target) {
    if (Math.abs(target - rec.kTo) < 1e-4) return;
    rec.kFrom = rec.k;
    rec.kTo = target;
    rec.phase = 0;
  }

  function gape(partId, amount) {
    const rec = wounds.get(partId);
    if (!rec) return false;
    setTarget(rec, CUT_clamp(amount == null ? 1 : amount, 0, 1));
    return true;
  }

  // A closed wound is not a deleted wound — it eases back to a fine pale score
  // line, which is exactly what a scalpel leaves before you retract. Use clear()
  // to actually free it.
  function close(partId) { return gape(partId, 0); }

  /* Frame state hoisted to closure scope. `stepWound` is ONE function object
   * created once, not an arrow literal rebuilt on every call to update() — at
   * 60fps that literal was 60 closures a second of pure garbage, in the one loop
   * whose whole design premise is that it does not allocate. `_dt` carries the
   * timestep in because Map.forEach gives the callback no room for it, and
   * `_dead` is a persistent scratch list that stays empty unless a wound
   * actually fails. */
  let _dt = 16;
  const _dead = [];

  function stepWound(rec) {
    // CONTAINMENT. main.js wraps construction in try/catch, but update() is called
    // from inside requestAnimationFrame: one throw here and the render loop stops
    // for good — black screen, no cursor, no recovery, for a cosmetic subsystem.
    // A wound that cannot step is retired and the rest of the frame continues.
    try {
      stepWoundInner(rec);
    } catch (err) {
      console.warn('cutting: wound failed and was retired', rec && rec.partId, err);
      _dead.push(rec);
    }
  }

  function stepWoundInner(rec) {
    const dt = _dt;
    if (rec.phase < 1) {
      rec.phase = Math.min(1, rec.phase + dt / CUT_OPEN_MS);
      rec.k = rec.kFrom + (rec.kTo - rec.kFrom) * CUT_easeOut(rec.phase);
      rec.moving = true;
    } else {
      rec.k = rec.kTo;
      rec.moving = false;
    }

    // Read the breath BEFORE we write our own offsets into the array it measures.
    // Measured after applyParent it was sampling a surface we had just displaced,
    // which fed a slice of our own gape back into the scale it drives.
    const bs = currentBreath(rec);

    if (rec.moving || rec.linDirty) { applyLining(rec, rec.k); rec.linDirty = false; }

    // MUST run every frame, moving or not: softbody rewrites the whole position
    // array from its own rest for any breathing/beating part, so an offset
    // applied once is gone by the next frame.
    applyParent(rec, rec.k);

    // Ride the parent's idle physiology so the wound never slides off the surface
    // it is in.
    if (Math.abs(bs - rec.group.scale.x) > 1e-4) rec.group.scale.setScalar(bs);

    // Follow the flap as dissect.js fades it during reflection — an opaque scar
    // hanging in the air over a ghosted flap is worse than no wound at all.
    const pm = Array.isArray(rec.mesh.material) ? rec.mesh.material[0] : rec.mesh.material;
    const lm = rec.lining && rec.lining.material;
    if (lm && pm) {
      const o = pm.transparent ? pm.opacity : 1;
      if (Math.abs(o - lm.opacity) > 1e-3) {
        lm.opacity = o;
        lm.depthWrite = o > 0.5;
        // needsUpdate ONLY when the transparent flag actually flips. Opacity is a
        // plain uniform and needs no recompile; `transparent` changes the shader
        // program. Setting it unconditionally recompiled the material on every
        // frame of every fade — a multi-millisecond stall per frame, precisely
        // while the app is trying to animate.
        const wantT = o < 0.999;
        if (lm.transparent !== wantT) { lm.transparent = wantT; lm.needsUpdate = true; }
      }
    }
  }

  function update(dtMs) {
    _dt = Math.min(64, dtMs || 16);
    wounds.forEach(stepWound);
    if (_dead.length) {
      for (let i = 0; i < _dead.length; i++) {
        wounds.delete(_dead[i].partId);
        try { destroy(_dead[i]); } catch (e) { /* already broken; do not cascade */ }
      }
      _dead.length = 0;
    }
  }

  function setQuality(n) {
    const q = CUT_clamp(n == null ? 1 : n, 0, 1);
    if ((q >= 0.5) === (quality >= 0.5)) { quality = q; return; }
    quality = q;
    wounds.forEach((rec) => { rebuild(rec); rec.linDirty = true; });
  }

  function clear() {
    wounds.forEach((rec) => destroy(rec));
    wounds.clear();
    rests.clear();
  }

  function dispose() {
    clear();
    baseMaterial.dispose();
    if (root.parent) root.parent.remove(root);
  }

  return {
    open, grow, gape, close, update, setQuality, clear, dispose,
    get count() { return wounds.size; },
    has: (partId) => wounds.has(partId),
    // Read-only peek for the shell / viva: which strata the blade actually
    // crossed, outermost first. Returns NAMED bands — a bare list of hex ints
    // (which is what this used to hand back) tells a student nothing and cannot
    // be turned into a question. `c` is kept alongside `hex` so any caller written
    // against the old shape still reads a colour off each entry.
    //
    // `depth` is how far down the column the blade actually reached, so a shallow
    // score reports the two layers it opened rather than the whole thickness.
    strataOf: (partId) => {
      const rec = wounds.get(partId);
      if (!rec) return null;
      const col = CUT_STRATA[rec.tissue] || CUT_STRATA.muscle;
      const reach = CUT_clamp((rec.depthMax - 0.14) / 0.30, 0, 1);
      let acc = 0, total = 0;
      for (let i = 0; i < col.length; i++) total += col[i].t;
      const out = [];
      for (let i = 0; i < col.length; i++) {
        const from = acc / (total || 1);
        acc += col[i].t;
        out.push({
          name: col[i].n,
          hex: col[i].c,
          c: col[i].c,
          fraction: +(col[i].t / (total || 1)).toFixed(3),
          // Did the blade open this band, or is it still intact under the floor?
          breached: from < 0.02 + reach * 0.98,
        });
      }
      out.tissue = rec.tissue;
      return out;
    },
    // The column itself, without needing an open wound — for the shell's
    // "what am I about to cut through" preview and for the viva's answer key.
    strataFor: (partIdOrOpts) => {
      const o = typeof partIdOrOpts === 'string' ? { partId: partIdOrOpts } : (partIdOrOpts || {});
      const key = CUT_inferTissue(o);
      return (CUT_STRATA[key] || CUT_STRATA.muscle).map((s) => ({ name: s.n, hex: s.c, c: s.c }));
    },
    get tissues() { return Object.keys(CUT_STRATA); },
  };
}
