/*
 * earthworm.js — buildEarthworm
 * Concatenated into one module scope with anatomy.js (the shared geometry toolkit,
 * SPECIMENS + buildSpecimen dispatcher). Uses those helpers directly; every local
 * helper lives INSIDE buildEarthworm so it can never collide with another module's
 * top-level names. The ONLY top-level names this file adds are `buildEarthworm`
 * and the single self-registration block at the bottom.
 *
 * Anatomy grounded in the standard annelid (Pheretima / Lumbricus) laboratory
 * dissection (CBSE/ICSE/IGCSE). A long, soft, METAMERICALLY SEGMENTED cylinder,
 * ~100+ segments in life; the anterior third (segments 1–~26) carries everything a
 * student examines, so it is modelled in detail and the rest tapers away. Dorsum is
 * darker (pigment / chloragogen over the dorsal vessel), venter paler; a swollen
 * glandular CLITELLUM girdles segments 14–16 (Pheretima) as the landmark students
 * must find. Prostomium overhangs the mouth at the anterior tip; a terminal anus
 * closes the posterior.
 *
 * DISSECTION REALITY the layering reproduces: the worm is pinned dorsal-side UP and
 * a MID-DORSAL longitudinal incision is drawn a little OFF the exact midline (to
 * spare the dorsal blood vessel that runs the midline), then the body wall is
 * reflected and pinned back to open the coelom. So the surface facing the camera is
 * the DORSUM, and requiresPinning:true.
 *
 * Coordinate convention for the (un-rotated) group — authored directly in the
 * final, camera-facing frame, so no group rotation is needed:
 *   +z = anterior (prostomium / mouth)     -z = posterior (anus)
 *   +y = dorsal  (the incision + dorsal blood vessel run here; faces the camera)
 *   -y = ventral (the nerve cord runs here, on the floor of the coelom)
 *   +x = the worm's RIGHT                   -x = the worm's LEFT
 *
 * Layer plan (consecutive, no gaps):
 *   0 body wall / integument (segmented cylinder, prostomium, clitellum, anal seg)
 *   1 coelom opened: transverse SEPTA + the dorsal blood vessel (do NOT cut)
 *   2 the gut through-line (pharynx→oesophagus→crop→gizzard→intestine+typhlosole),
 *     the paired lateral "hearts" arching over the gut, the oesophageal glands
 *   3 deep floor: ventral nerve cord + brain, segmental nephridia, and the
 *     clitellar reproductive organs (seminal vesicles, spermathecae)
 */

function buildEarthworm(THREE) {
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

  // Parent a mesh whose geometry is baked in ABSOLUTE coordinates (tube/vessel) to
  // a root that sits away from the origin: cancel the root's own offset so the baked
  // vertices still land where they were authored.
  const bakeChild = (root, m) => { m.position.copy(root.position).multiplyScalar(-1); root.add(m); return m; };

  /* --- the segmented body wall ------------------------------------------------
   * An OPEN-ended cylinder along its own y-axis (so every side vertex sits on a
   * clean unit circle — no cap-vertex singularities), profiled into a worm: faint
   * annular intersegmental grooves, tapered ends, a smooth clitellar swell, and a
   * dorsal-dark / ventral-cream vertex tint. The whole geometry is finally rolled
   * a quarter turn so its length runs along +z (anterior) and its dorsum along +y
   * (up, toward the camera). */
  function ewBody(rad, halfLen, o = {}) {
    o = o || {};
    const radialSeg = o.radialSeg || 26, lenSeg = o.lenSeg || 200;
    const g = new THREE.CylinderGeometry(1, 1, 2, radialSeg, lenSeg, true); // axis y ∈ [-1,1]
    displace(THREE, g, o.amp != null ? o.amp : 0.02, 3.0, o.seed || 0);     // faint organic lumpiness
    const p = g.attributes.position, v = new THREE.Vector3();
    const colors = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    const dorsal   = new THREE.Color(0x7d5342);   // pinkish-brown back
    const dorsalDk = new THREE.Color(0x5c3a2e);   // darker mid-dorsal pigment stripe
    const flank    = new THREE.Color(0xa9805f);
    const ventral  = new THREE.Color(0xd8c2a1);   // cream underside
    const nSeg  = o.nSeg  || 44;                  // number of visible annuli
    const clitT = o.clitT != null ? o.clitT : 0.68; // clitellum centre, in length-fraction t
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const uy = v.y;                             // -1..1 along the body; +1 = anterior
      const t = Math.max(0, Math.min(1, (uy + 1) / 2)); // 0 posterior .. 1 anterior
      const rr = Math.hypot(v.x, v.z) || 1e-6;
      const rz = v.z / rr;                        // radial z: -1 = dorsal (becomes +y up)
      // longitudinal radius profile
      let prof = 1;
      if (t > 0.9)  prof *= Math.max(0.26, 1 - (t - 0.9) / 0.1 * 0.86);   // taper to the mouth
      if (t < 0.05) prof *= 0.45 + (t / 0.05) * 0.55;                     // blunt posterior taper
      prof *= 1 - 0.05 * (0.5 - 0.5 * Math.cos(2 * Math.PI * nSeg * t));  // faint annular grooves
      prof *= 1 + 0.13 * Math.exp(-Math.pow((t - clitT) / 0.03, 2));      // smooth clitellar swell
      p.setXYZ(i, v.x * prof, uy, v.z * prof);
      // vertex tint: dorsal dark → ventral cream
      const dorsalF = smooth(Math.max(0, Math.min(1, -rz * 0.5 + 0.5)));
      c.copy(ventral).lerp(flank, smooth(Math.max(0, Math.min(1, -rz * 0.85 + 0.5))));
      c.lerp(dorsal, dorsalF);
      const midline = Math.exp(-Math.pow((rz + 1) / 0.16, 2));            // darker over the dorsal vessel
      c.lerp(dorsalDk, midline * 0.55);
      const banding = 0.5 - 0.5 * Math.cos(2 * Math.PI * nSeg * t);       // groove shadowing
      c.multiplyScalar(1 - banding * 0.05);
      const m = vnoise(v.x * 5 + 2, uy * 9, v.z * 5 + 6);                 // mottle
      c.multiplyScalar(0.97 + m * 0.06);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.scale(rad, halfLen, rad);        // radius on x/z, length on y
    g.rotateX(Math.PI / 2);            // length y → +z; dorsal (-z) → +y (up)
    seal(g);
    return g;
  }

  const HALF = 7.0;                    // body half-length (anterior tip ≈ +7, posterior ≈ -7)
  const RAD  = 0.55;                   // body radius

  /* ---- LAYER 0 · integument / external landmarks --------------------------- */

  const bodyGeo = ewBody(RAD, HALF, { seed: 1 });
  const body = new THREE.Mesh(bodyGeo, mat(THREE, 0xffffff, {
    vcol: true, rough: 0.6, clear: 0.5, clearRough: 0.45, sheen: 0xc79a72, sheenAmt: 0.5,
    side: THREE.DoubleSide }));

  // Representative ventrolateral setae: four pairs of tiny chitinous bristles on a
  // handful of anterior segments (Lumbricus arrangement). Decorative children only.
  function ewSetae(parent) {
    const setaMat = mat(THREE, 0x6a5540, { rough: 0.5, clear: 0.3, sheen: 0x9a8468, noTex: true });
    const zs = [6.0, 5.4, 4.8, 4.2, 3.0, 1.8, 0.4, -1.0, -2.4];
    zs.forEach((z) => {
      [12, 24, 37, 50].forEach((deg) => {                 // 4 pairs, spreading off the ventral midline
        const phi = deg * Math.PI / 180;
        [1, -1].forEach((side) => {
          const bxn = Math.sin(phi) * side, byn = -Math.cos(phi); // outward radial (ventrolateral)
          const seta = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.15, 5), setaMat);
          childMesh(parent, seta, bxn * RAD * 1.02, byn * RAD * 1.02, z);
          seta.rotation.z = Math.atan2(-bxn, byn);        // point the cone outward along the radial
        });
      });
    });
  }
  ewSetae(body);

  add({
    id: 'body-wall', name: 'Body wall', layer: 0, system: 'integument', cuttable: true, detachable: false,
    note: 'A soft, metamerically segmented muscular tube — pigmented dorsally, pale below, with faint intersegmental grooves. Cut it a little to one side of the mid-dorsal line: the dorsal blood vessel runs the exact midline.',
    mesh: body,
    // dorsal incision, drawn just behind the clitellum to the posterior end, offset
    // to the worm's LEFT (-x) to spare the mid-dorsal blood vessel.
    incision: [[-0.16, 0.5, 1.6], [-0.16, 0.52, -0.2], [-0.15, 0.5, -2.6], [-0.14, 0.47, -4.6], [-0.12, 0.42, -6.2]],
  });

  // Prostomium: a small fleshy lobe overhanging the mouth at the anterior tip — no
  // eyes, no jaws. A pin anchor for the anterior end.
  const prostomium = organ(THREE, 0x8a5c49, 0.34, 0.30, 0.44,
    { amp: 0.14, rough: 0.6, clear: 0.45, sheen: 0xc79a80, seed: 3 });
  prostomium.position.set(0, 0.06, 7.15);
  prostomium.rotation.x = 0.25;                            // droops over the mouth
  // mouth crease as a dark child slit on the underside
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12),
    mat(THREE, 0x261a12, { rough: 0.7, side: THREE.DoubleSide, noTex: true }));
  childMesh(prostomium, mouth, 0, -0.24, -0.1, Math.PI / 2, 0, 0);
  add({
    id: 'prostomium', name: 'Prostomium', layer: 0, system: 'integument', cuttable: false, detachable: false,
    note: 'The fleshy, sensory lobe overhanging the mouth at the anterior tip — the worm has no head capsule, eyes or jaws. Anchor a pin here to stretch the specimen.',
    mesh: prostomium,
  });

  // Clitellum: the swollen, glandular, saddle-to-girdle band over segments 14–16 in
  // Pheretima — secretes the egg cocoon and marks sexual maturity. Smooth, distinctly
  // coloured, raised above the annulated body. A pin/identify landmark.
  const clitellum = organ(THREE, 0xb5825e, 0.64, 0.63, 0.52,
    { amp: 0.045, rough: 0.48, clear: 0.55, clearRough: 0.4, sheen: 0xd8b088, seed: 5 });
  clitellum.position.set(0, 0, 2.6);
  add({
    id: 'clitellum', name: 'Clitellum', layer: 0, system: 'integument', cuttable: false, detachable: false,
    note: 'A swollen glandular girdle over segments 14–16 that secretes the cocoon in which eggs are laid — the landmark that fixes the anterior end and orients the whole worm.',
    mesh: clitellum,
  });

  // Terminal segment bearing the anus (periproct). A pin anchor for the posterior end.
  const anal = organ(THREE, 0x835a48, 0.42, 0.40, 0.44,
    { amp: 0.12, rough: 0.6, sheen: 0xbf9075, seed: 7 });
  anal.position.set(0, 0, -6.95);
  const anus = new THREE.Mesh(new THREE.CircleGeometry(0.14, 12),
    mat(THREE, 0x2a1c14, { rough: 0.75, side: THREE.DoubleSide, noTex: true }));
  childMesh(anal, anus, 0, 0, -0.42, 0, Math.PI, 0);      // faces posteriorly (-z)
  add({
    id: 'anal-segment', name: 'Anal segment', layer: 0, system: 'digestive', cuttable: false, detachable: false,
    note: 'The last segment, the periproct, pierced by the terminal anus where the gut opens to the outside. Anchor a pin here to hold the posterior end taut.',
    mesh: anal,
  });

  /* ---- LAYER 1 · the opened coelom ----------------------------------------- */

  // Dorsal blood vessel: the dark-red, contractile midline vessel lying on the roof
  // of the gut — it drives blood forward and lies exactly where a naive cut would
  // fall. The vessel you must NOT sever; that is why the incision is offset.
  const dvPts = [];
  for (let i = 0; i <= 12; i++) {
    const z = 6.4 - i * (6.4 + 6.6) / 12;
    dvPts.push([0, 0.34 - 0.015 * Math.sin(i * 1.3), z]);
  }
  const dorsalVessel = tube(THREE, 0x9c2c27, dvPts, 0.07,
    { rough: 0.42, clear: 0.55, clearRough: 0.35, sheen: 0xd0554a, rad: 8, seg: 90 });
  add({
    id: 'dorsal-blood-vessel', name: 'Dorsal blood vessel', layer: 1, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'The dark-red, pulsating vessel running the dorsal midline over the gut; it collects blood and drives it forward. It lies in the line of the cut — offset the incision to spare it.',
    mesh: dorsalVessel,
  });

  // Septa: the thin transverse membranes that partition the coelom between adjacent
  // segments. One pickable membrane plus a run of decorative siblings; breaking them
  // frees the gut, so this part is detachable and opening it reveals layer 2.
  const septaZ0 = -0.5;
  const septum = new THREE.Mesh(new THREE.RingGeometry(0.16, RAD * 0.92, 22, 1),
    mat(THREE, 0xd8c3ad, { trans: true, opacity: 0.5, rough: 0.6, clear: 0.2,
      side: THREE.DoubleSide, transmission: 0.5, thickness: 0.18 }));
  septum.material.depthWrite = false;
  septum.position.set(0, 0, septaZ0);                     // RingGeometry normal is +z → transverse
  for (let z = 5.6; z >= -6.2; z -= 0.82) {
    if (Math.abs(z - septaZ0) < 0.4) continue;
    const s2 = new THREE.Mesh(new THREE.RingGeometry(0.15, RAD * 0.9, 20, 1), septum.material);
    childMesh(septum, s2, 0, 0, z - septaZ0);
  }
  add({
    id: 'septa', name: 'Septa', layer: 1, system: 'muscular', cuttable: true, detachable: true,
    note: 'Thin muscular partitions dividing the coelom into segment-by-segment compartments, each with its own fluid. Break them to free and lift the gut tube beneath.',
    mesh: septum,
  });

  /* ---- LAYER 2 · the gut through-line, hearts and glands -------------------- */

  // Pharynx: the muscular anterior bulb that draws in soil and food (buccal cavity
  // lies just in front of it, at the mouth).
  const pharynx = organ(THREE, 0xc39a86, 0.35, 0.32, 0.62,
    { tissue: 'muscle', amp: 0.08, rough: 0.5, clear: 0.5, sheen: 0xdcae98, seed: 11 });
  pharynx.position.set(0, -0.02, 6.0);
  add({
    id: 'pharynx', name: 'Pharynx', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A thick muscular bulb behind the mouth that sucks in soil and food and pumps it back; the buccal cavity opens into its front.',
    mesh: pharynx,
  });

  // Oesophagus: the narrow conducting tube linking pharynx to crop.
  const oeso = tube(THREE, 0xcdb094, [[0, -0.02, 5.0], [0, -0.02, 5.35], [0, -0.02, 5.65]], 0.13,
    { rough: 0.5, clear: 0.4, sheen: 0xe0c6a8, rad: 8, seg: 16 });
  add({
    id: 'oesophagus', name: 'Oesophagus', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A short, narrow tube carrying food back from the pharynx; its wall bears the calciferous (oesophageal) glands.',
    mesh: oeso,
  });

  // Crop: a thin-walled dilation that stores food before the gizzard grinds it.
  const crop = organ(THREE, 0xd7c1a2, 0.29, 0.27, 0.40,
    { amp: 0.06, rough: 0.46, clear: 0.5, sheen: 0xe8d4b6, seed: 12 });
  crop.position.set(0, -0.02, 4.6);
  add({
    id: 'crop', name: 'Crop', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A thin-walled, softer storage chamber that holds food briefly before it passes into the muscular gizzard.',
    mesh: crop,
  });

  // Gizzard: the hard, pale, thick-walled muscular mill that grinds soil and food
  // against ingested grit — firm to the probe, the toughest part of the gut.
  const gizzard = organ(THREE, 0xd9cbb2, 0.34, 0.33, 0.42,
    { tissue: 'muscle', amp: 0.04, rough: 0.44, clear: 0.6, clearRough: 0.3, sheen: 0xefe4cf, seed: 13 });
  gizzard.position.set(0, -0.02, 3.85);
  add({
    id: 'gizzard', name: 'Gizzard', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A hard, pale, thick muscular mill that grinds food against swallowed grit — noticeably firmer and paler than the rest of the gut.',
    mesh: gizzard,
  });

  // Intestine: the long absorptive tube from the gizzard to the anus, widening a
  // little posteriorly, its lumen ridged by the dorsal TYPHLOSOLE (an internal fold
  // that increases absorptive area) — hinted as a crest along the dorsal surface.
  const intPts = [];
  for (let i = 0; i <= 14; i++) {
    const z = 3.4 - i * (3.4 + 6.5) / 14;
    intPts.push([0, -0.03 - 0.02 * Math.sin(i * 0.8), z]);
  }
  const intestine = vessel(THREE, 0xc9a67e, intPts, 0.26, 0.33,
    { rough: 0.5, clear: 0.42, sheen: 0xe2ba98, seg: 110, rad: 10 });
  const typh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 9.4),
    mat(THREE, 0xb8946b, { rough: 0.5, clear: 0.35, sheen: 0xd0a882 }));
  childMesh(intestine, typh, 0, 0.29, -1.55);             // dorsal crest hinting the typhlosole
  add({
    id: 'intestine', name: 'Intestine', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'The long absorptive tube running to the anus; its roof is folded inward as the typhlosole, which increases the surface for digestion. Lift it to reach the coelomic floor.',
    mesh: intestine,
  });

  // Lateral "hearts": paired contractile commissural vessels (Pheretima, segments
  // 7,9,12,13) that arch around the gut linking the dorsal vessel above to the
  // ventral vessel below. Not true chambered hearts — a teaching point. Built as one
  // pickable root with four pairs of arches wrapping the gut.
  const heartsRoot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10),
    mat(THREE, 0xa8322c, { rough: 0.45, clear: 0.5, sheen: 0xd0554a }));
  heartsRoot.position.set(0, 0.3, 4.55);
  [5.55, 4.95, 4.35, 3.95].forEach((hz) => {
    [1, -1].forEach((side) => {
      const arch = tube(THREE, 0xb0362f, [
        [0, 0.33, hz],                     // dorsal vessel
        [side * 0.36, 0.10, hz],           // over the flank of the gut
        [side * 0.40, -0.18, hz],          // down the side
        [side * 0.10, -0.34, hz],          // to the ventral vessel
      ], 0.055, { rough: 0.45, clear: 0.5, sheen: 0xd0554a, rad: 6, seg: 14 });
      bakeChild(heartsRoot, arch);
    });
  });
  add({
    id: 'lateral-hearts', name: 'Lateral "hearts"', layer: 2, system: 'circulatory',
    cuttable: true, detachable: true,
    note: 'Paired contractile vessels arching over the gut that pump blood from the dorsal to the ventral vessel — called "hearts" but not chambered organs like a vertebrate heart.',
    mesh: heartsRoot,
  });

  // Oesophageal (calciferous) glands: paired glands on the oesophagus that shed
  // excess calcium and buffer the blood. One pickable body plus its partner.
  const oesoGland = organ(THREE, 0xc99a84, 0.20, 0.17, 0.24,
    { amp: 0.1, rough: 0.5, sheen: 0xdcac96, seed: 14 });
  oesoGland.position.set(-0.3, 0.05, 4.95);
  const og2 = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 14),
    mat(THREE, 0xc99a84, { rough: 0.5, sheen: 0xdcac96 }));
  og2.geometry.scale(0.20, 0.17, 0.24); seal(og2.geometry);
  childMesh(oesoGland, og2, 0.6, 0, 0);                   // partner on the +x side
  add({
    id: 'oesophageal-glands', name: 'Oesophageal glands', layer: 2, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'Paired calciferous glands on the oesophagus that excrete surplus calcium and keep the blood and gut fluids buffered.',
    mesh: oesoGland,
  });

  /* ---- LAYER 3 · the deep floor: nervous, excretory, reproductive ---------- */

  // Ventral nerve cord: the solid white double cord on the floor of the coelom, with
  // a segmental ganglion swelling in each segment. Runs the whole length; stays put.
  const ncPts = [];
  for (let i = 0; i <= 12; i++) ncPts.push([0, -0.36, 6.1 - i * (6.1 + 6.7) / 12]);
  const nerveCord = tube(THREE, 0xe7e0d0, ncPts, 0.05,
    { rough: 0.55, clear: 0.3, sheen: 0xf2ecdd, rad: 7, seg: 100 });
  for (let z = 5.7; z >= -6.4; z -= 0.86) {               // segmental ganglia
    const gang = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8),
      mat(THREE, 0xdfd6c4, { rough: 0.55, sheen: 0xf0e6d6, noTex: true }));
    childMesh(nerveCord, gang, 0, -0.36, z);
  }
  add({
    id: 'nerve-cord', name: 'Ventral nerve cord', layer: 3, system: 'nervous',
    cuttable: true, detachable: false,
    note: 'The solid, white, double nerve cord on the floor of the coelom, swollen into a ganglion in every segment — the annelid runs a ventral, not a dorsal, central nervous system.',
    mesh: nerveCord,
  });

  // Brain (suprapharyngeal ganglion): the small bilobed mass over the pharynx,
  // joined to the ventral cord by the circumpharyngeal connectives.
  const brain = organ(THREE, 0xe4dccb, 0.12, 0.10, 0.13,
    { amp: 0.08, rough: 0.5, sheen: 0xf0e8d8, seed: 16 });
  brain.position.set(0.09, 0.14, 6.5);
  const brain2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10),
    mat(THREE, 0xe4dccb, { rough: 0.5, sheen: 0xf0e8d8, noTex: true }));
  childMesh(brain, brain2, -0.18, 0, 0);                  // bilobed
  [1, -1].forEach((side) => {                             // circumpharyngeal connectives → ventral cord
    const conn = tube(THREE, 0xe7e0d0, [
      [0.0, 0.14, 6.5], [side * 0.28, -0.05, 6.45], [side * 0.2, -0.3, 6.3], [0, -0.36, 6.1],
    ], 0.035, { rough: 0.5, sheen: 0xf2ecdd, rad: 5, seg: 14 });
    bakeChild(brain, conn);
  });
  add({
    id: 'brain', name: 'Brain (cerebral ganglia)', layer: 3, system: 'nervous',
    cuttable: true, detachable: true,
    note: 'The bilobed suprapharyngeal ganglion — the worm\'s "brain" — lying on top of the pharynx and linked down to the ventral cord by nerve-ring connectives.',
    mesh: brain,
  });

  // Nephridia: the paired excretory tubules, one pair per segment — fine, pale,
  // coiled. A few representative pairs stand for the ~100 the worm carries.
  const nephRoot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8),
    mat(THREE, 0xd8cbb8, { rough: 0.55, sheen: 0xe8ddc8, noTex: true }));
  nephRoot.position.set(-0.42, -0.2, 1.4);
  [2.2, 1.4, 0.4, -0.6, -1.6, -2.8, -4.0].forEach((z) => {
    [1, -1].forEach((side) => {
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const u = i / 6;
        pts.push([side * (0.4 + Math.sin(u * Math.PI * 3) * 0.05),
                  -0.16 - 0.05 * Math.sin(u * Math.PI * 2), z - 0.12 + u * 0.24]);
      }
      const tub = tube(THREE, 0xd8cbb8, pts, 0.02, { rough: 0.55, sheen: 0xe8ddc8, rad: 5, seg: 12, noTex: true });
      bakeChild(nephRoot, tub);
    });
  });
  add({
    id: 'nephridia', name: 'Nephridia', layer: 3, system: 'excretory',
    cuttable: true, detachable: true,
    note: 'Fine, pale, coiled excretory tubules — a pair in nearly every segment — that filter coelomic fluid and drain wastes to the exterior; the annelid kidney.',
    mesh: nephRoot,
  });

  // Seminal vesicles: the large, cream, lobed sperm-storage bodies of the anterior
  // reproductive region (Pheretima, around segments 11–12). Paired.
  const semVes = organ(THREE, 0xd9c6a4, 0.27, 0.22, 0.30,
    { amp: 0.12, freq: 5, rough: 0.5, clear: 0.45, sheen: 0xe8d6b6, seed: 18 });
  semVes.position.set(-0.34, 0.12, 3.95);
  const sv2 = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16),
    mat(THREE, 0xd9c6a4, { rough: 0.5, clear: 0.45, sheen: 0xe8d6b6 }));
  sv2.geometry.scale(0.27, 0.22, 0.30);
  displace(THREE, sv2.geometry, 0.12, 5, 19); seal(sv2.geometry);
  childMesh(semVes, sv2, 0.68, 0, 0);                     // partner on the +x side
  add({
    id: 'seminal-vesicles', name: 'Seminal vesicles', layer: 3, system: 'urogenital',
    cuttable: true, detachable: true,
    note: 'Large, cream, lobed sacs that store and mature sperm before copulation — prominent in the segments just ahead of the clitellum. The earthworm is hermaphrodite.',
    mesh: semVes,
  });

  // Spermathecae: the small paired sacs that RECEIVE and store a partner\'s sperm at
  // copulation (Pheretima, segments 6–9). Several small pairs, ventrolateral.
  const spermRoot = organ(THREE, 0xd2bf9e, 0.12, 0.11, 0.13,
    { amp: 0.1, rough: 0.5, sheen: 0xe2d0af, seed: 20 });
  spermRoot.position.set(-0.36, -0.12, 5.5);
  [[0.4, 5.9], [0.4, 5.5], [0.4, 5.1], [0.4, 4.7]].forEach(([xr, z]) => {
    [1, -1].forEach((side) => {
      if (side === -1 && Math.abs(z - 5.5) < 0.05) return; // the root already stands for the -x/5.5 sac
      const sac = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 11),
        mat(THREE, 0xd2bf9e, { rough: 0.5, sheen: 0xe2d0af }));
      sac.geometry.scale(0.11, 0.1, 0.12); seal(sac.geometry);
      childMesh(spermRoot, sac, side * xr + 0.36, 0.02, z - 5.5);
    });
  });
  add({
    id: 'spermathecae', name: 'Spermathecae', layer: 3, system: 'urogenital',
    cuttable: true, detachable: true,
    note: 'Small paired sacs in the anterior segments that receive and store the partner\'s sperm during mutual cross-fertilisation, to be used later when the cocoon is formed.',
    mesh: spermRoot,
  });

  // Authored directly dorsal-side-up in the camera frame, so no group rotation is
  // needed: the dorsum (the surface the student cuts) already faces +y / the camera.
  return { group, parts };
}

/* ===== self-registration (the one allowed top-level block besides the builder) === */
SPECIMEN_BUILDERS.earthworm = buildEarthworm;
SPECIMENS.earthworm = {
  id: 'earthworm', name: 'Earthworm',
  blurb: 'The classic annelid. Pin it dorsal-up, open the coelom just off the midline to spare the dorsal vessel, and trace the gut.',
  // Long and thin — framed down its length, camera high and pulled back along +z.
  camera: { pos: [0, 17, 17.5], target: [0, -0.5, -0.5] },
  requiresPinning: true,
};
SPECIMEN_OBJECTIVES.earthworm = [
  { id: 'pin', text: 'Pin the worm out <b>dorsal-side up</b> — anchor the anterior tip, the clitellum and the tail so the body wall comes under tension.',
    hint: 'Pins tool (4). Grip on the prostomium, the clitellum band, the body and the anal end.',
    done: (s) => s.pinned.size >= 4 },
  { id: 'incise', text: 'Make a shallow <b>mid-dorsal incision</b>, kept just off the midline so the blade misses the dorsal blood vessel.',
    hint: 'Scalpel (3). One smooth stroke down the dorsum from behind the clitellum — do not saw or plunge.',
    done: (s) => s.incisions.has('body-wall') && s.incisions.get('body-wall').length > 1.1 },
  { id: 'open', text: 'Reflect the <b>body wall</b> and pin the flaps back to open the coelom.',
    hint: 'Forceps (2) on the cut edge, or the retractor with two hands.',
    done: (s) => s.opened.has('body-wall') },
  { id: 'coelom', text: 'Identify the transverse <b>septa</b> and the <b>dorsal blood vessel</b> — the vessel you must never cut.',
    hint: 'Probe (1) each. The dark-red midline vessel over the gut is the dorsal vessel.',
    done: (s, seen) => seen.has('dorsal-blood-vessel') && seen.has('septa') },
  { id: 'septa', text: 'Break through the <b>septa</b> to free the gut tube beneath them.',
    hint: 'Forceps. Grip the membranes and draw them clear of the gut.',
    done: (s) => s.removed.has('septa') },
  { id: 'gut', text: 'Trace the gut — the muscular <b>pharynx</b>, the <b>crop</b>, the hard <b>gizzard</b> and the <b>intestine</b> — and find the paired lateral <b>"hearts"</b> arching over it.',
    hint: 'Probe (1) along the gut front-to-back; the gizzard is the pale, firm one.',
    done: (s, seen) => ['pharynx', 'crop', 'gizzard', 'intestine', 'lateral-hearts'].every((id) => seen.has(id)) },
  { id: 'lift', text: 'Lift the <b>intestine</b> aside to reach the floor of the coelom.',
    hint: 'Forceps. Draw the gut out onto the tray to expose the structures beneath.',
    done: (s) => s.removed.has('intestine') },
  { id: 'deep', text: 'On the floor, expose the ventral <b>nerve cord</b> and the segmental <b>nephridia</b>.',
    hint: 'Probe the white, ganglionated cord on the midline floor and the fine, pale excretory tubules beside it.',
    done: (s, seen) => seen.has('nerve-cord') && (seen.has('nephridia') || seen.has('brain')) },
];
