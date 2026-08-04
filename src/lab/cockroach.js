/*
 * cockroach.js — buildCockroach
 * Concatenated into one module scope with anatomy.js (the shared geometry toolkit,
 * SPECIMENS + buildSpecimen dispatcher). Every local helper is declared INSIDE
 * buildCockroach so it cannot collide with another module's top-level names; the
 * only top-level names this file adds are `buildCockroach` and the single
 * self-registration block at the bottom.
 *
 * Anatomy grounded in the standard Periplaneta americana laboratory dissection
 * (CBSE/ICSE zoology): the roach is laid dorsal-side up, the wings are removed,
 * and the dorsal TERGA are cut along both lateral margins and lifted to expose the
 * interior from ABOVE. So the surface facing the camera is the DORSUM.
 *
 * Coordinate convention for the un-rotated group (then laid dorsum-up on the tray):
 *   +z = head (anterior)          -z = tip of abdomen / cerci (posterior)
 *   +y = dorsal (the terga; the cavity opens upward toward +y and the camera)
 *   -y = ventral (legs, ventral nerve cord, sternal plates)
 *   -x = the animal's LEFT        +x = the animal's RIGHT
 * The insect is dorsoventrally FLATTENED — the y (height) half-scale is far smaller
 * than x (width) and z (length). Three tagmata: HEAD (antennae, compound eyes),
 * THORAX (pronotal shield, three leg pairs, two wing pairs), ABDOMEN (ten terga,
 * terminal cerci).
 *
 * Layer plan (consecutive, dense):
 *   0  exoskeleton — the reddish-brown dorsal TERGA of the abdomen (the cuttable
 *      plate), the PRONOTUM shield over the thorax, the HEAD capsule, and the two
 *      pairs of WINGS (liftable/removable, folded over the back)
 *   1  immediately beneath the terga: the pale-yellow FAT BODY that fills the
 *      haemocoel, and the dorsal tubular HEART running the midline with its ostia
 *   2  the DIGESTIVE tract — oesophagus -> thin-walled CROP -> muscular GIZZARD
 *      (proventriculus) -> midgut/mesenteron ringed by finger-like GASTRIC CAECA
 *      -> hindgut (ileum/colon/rectum); the fine MALPIGHIAN TUBULES at the
 *      midgut-hindgut junction; the salivary glands
 *   3  deep/ventral: the double VENTRAL NERVE CORD with its segmental GANGLIA, the
 *      silvery branching TRACHEAE, and the posterior reproductive organs
 */

function buildCockroach(THREE) {
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

  // Palette — a real dissected roach: glossy reddish-brown chitin, creamy fat body,
  // pale wet gut, silvery tracheae, white nerve cord.
  const CHITIN = 0x6b3a1e;      // reddish-brown exoskeleton
  const CHITIN_D = 0x532c16;    // darker sternal / margin
  const FAT = 0xe6d99a;         // pale creamy-yellow fat body
  const HEART_C = 0xc99a8a;     // dorsal vessel, faintly pink
  const CROP_C = 0xcaa878;      // thin-walled crop, tan
  const GIZZARD_C = 0xb18a58;   // firm muscular proventriculus
  const CAECA_C = 0xcdb384;     // gastric caeca, pale
  const MIDGUT_C = 0xb99a6a;    // mesenteron
  const HINDGUT_C = 0xa8905e;   // colon/rectum
  const MALPIGHIAN_C = 0xd8c25e; // yellowish excretory threads
  const NERVE_C = 0xe9e4d6;     // ventral nerve cord, white
  const TRACHEA_C = 0xc6cfd4;   // silvery air tubes

  // Whole-body span (local units before final lay-flat): head at z ~ +5.4, abdomen
  // tip at z ~ -6.2, so the insect is ~11.6 long, ~3.2 wide, ~1.1 tall (flat).

  /* ---------- layer 0: exoskeleton ------------------------------------------ *
   * Everything the student sees before cutting: the plated dorsum. The abdominal
   * terga are the cuttable plate; the pronotum, head and wings are their own
   * structures. Antennae, eyes, legs and cerci hang off these as decorative
   * CHILD meshes so they are never in the pick list. */

  // Abdominal terga — the broad, gently domed, segmented dorsal plate the incision
  // runs down. Ten overlapping segments suggested by transverse grooves.
  const abdG = new THREE.SphereGeometry(1, 44, 28);
  displace(THREE, abdG, 0.03, 3.0, 7);
  {
    const p = abdG.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const uz = v.z;
      // flatten dorsoventrally, widen, and taper toward the posterior tip
      const taper = 1 - 0.28 * Math.max(0, -uz);
      v.x *= 1.55 * taper;
      v.y *= 0.42;                        // FLAT
      v.z *= 3.1;
      // segment ridges
      v.y += Math.sin(v.z * 3.1) * 0.018 * (v.y > 0 ? 1 : 0);
      if (v.y < 0) v.y *= 0.5;            // shallow ventral
      p.setXYZ(i, v.x, v.y, v.z);
    }
    p.needsUpdate = true; abdG.computeVertexNormals();
  }
  const abd = new THREE.Mesh(abdG, mat(THREE, CHITIN, { rough: 0.32, clear: 0.7, clearRough: 0.2, sheen: 0x8a5a34 }));
  abd.position.set(0, 0.08, -2.2);
  add({
    id: 'exoskeleton', name: 'Abdominal terga (exoskeleton)', layer: 0, system: 'integument',
    cuttable: true, detachable: false,
    note: 'The glossy reddish-brown dorsal plates. Cut along BOTH lateral margins and lift the terga off to open the body from above.',
    mesh: abd,
    incision: [[0, 0.5, 0.9], [0, 0.52, -0.4], [0, 0.5, -1.8], [0, 0.46, -3.2], [0, 0.42, -4.4]],
  });
  // cerci — two segmented sensory appendages at the tail tip
  for (let s = -1; s <= 1; s += 2) {
    const cerc = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.9, 6),
      mat(THREE, CHITIN_D, { rough: 0.6 }));
    childMesh(abd, cerc, s * 0.22, 0.02, -1.62, Math.PI * 0.62, 0, s * 0.3);
  }

  // Pronotum — the shield-shaped plate over the prothorax, a landmark.
  const pronG = new THREE.SphereGeometry(1, 32, 20);
  {
    const p = pronG.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      v.x *= 1.9; v.y *= 0.4; v.z *= 1.35;
      if (v.y < 0) v.y *= 0.4;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    p.needsUpdate = true; pronG.computeVertexNormals();
  }
  const pron = new THREE.Mesh(pronG, mat(THREE, CHITIN, { rough: 0.3, clear: 0.72, sheen: 0x8a5a34 }));
  pron.position.set(0, 0.16, 2.7);
  add({
    id: 'pronotum', name: 'Pronotum (thoracic shield)', layer: 0, system: 'integument',
    cuttable: false, detachable: false,
    note: 'The broad shield covering the prothorax. Behind it lie the wing bases and the three pairs of legs.',
    mesh: pron,
  });

  // Head capsule with antennae and compound eyes (decorative children).
  const head = organ(THREE, CHITIN_D, 0.6, 0.34, 0.5, { rough: 0.4, clear: 0.5, seed: 3 });
  head.position.set(0, 0.14, 4.9);
  add({
    id: 'head', name: 'Head capsule', layer: 0, system: 'integument',
    cuttable: false, detachable: false,
    note: 'Bears the long segmented antennae, the compound eyes and the biting mouthparts. Hypognathous — held under the pronotum.',
    mesh: head,
  });
  for (let s = -1; s <= 1; s += 2) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10),
      mat(THREE, 0x2a1c14, { rough: 0.25, clear: 0.9 }));
    childMesh(head, eye, s * 0.42, 0.12, 0.16);
    // antenna — a long thin curved chain of many short segments
    const apts = [];
    for (let k = 0; k <= 14; k++) {
      const t = k / 14;
      apts.push([s * (0.5 + t * 2.4), 0.1 + Math.sin(t * 2.2) * 0.5 + t * 0.3, 0.4 + t * 2.6]);
    }
    const ant = tube(THREE, CHITIN_D, apts, 0.035, { rough: 0.55, rad: 6, seg: 40 });
    childMesh(head, ant, 0, 0, 0);
  }
  // three pairs of legs off the thorax (children of the pronotum region, purely
  // decorative — flattened jointed spikes splayed to the sides)
  for (let s = -1; s <= 1; s += 2) {
    for (let L = 0; L < 3; L++) {
      const z = 2.4 - L * 1.05;
      const lpts = [
        [s * 0.7, -0.1, z], [s * 1.5, 0.15, z - 0.1],
        [s * 2.3, -0.2, z - 0.35], [s * 2.7, -0.5, z - 0.7],
      ];
      const leg = tube(THREE, CHITIN_D, lpts, 0.06, { rough: 0.55, rad: 6, seg: 20 });
      childMesh(abd, leg, 0, 0.02, 0);
    }
  }

  // Wings — two pairs folded flat over the back: leathery brown tegmina over
  // membranous hindwings. Removable (the first real step of the dissection).
  const mkWing = (s, membranous) => {
    const g = new THREE.PlaneGeometry(2.0, 4.6, 10, 22);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      // taper to a rounded tip, curve down at the outer edge
      const t = (v.y + 2.3) / 4.6;               // 0 base .. 1 tip
      v.x *= (0.5 + 0.6 * Math.sin(t * Math.PI));
      p.setXYZ(i, v.x, v.y, -Math.abs(v.x) * 0.06);
    }
    p.needsUpdate = true; g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat(THREE,
      membranous ? 0x8a6a44 : 0x6f4526,
      { rough: membranous ? 0.35 : 0.5, clear: 0.5, trans: membranous ? 0.5 : 0.12,
        thickness: 0.3, side: THREE.DoubleSide, sheen: 0x9a6a3a }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(s * 0.85, 0.28 + (membranous ? -0.03 : 0), -1.9);
    m.rotation.z = s * 0.16;
    // wing venation as fine raised veins
    for (let k = -2; k <= 2; k++) {
      const vpts = [[k * 0.28, 0.02, 2.2], [k * 0.34, 0.02, 0], [k * 0.26, 0.02, -2.2]];
      const vein = tube(THREE, 0x4a2c16, vpts, 0.015, { rough: 0.6, rad: 4, seg: 16 });
      childMesh(m, vein, 0, 0.01, 0, Math.PI / 2, 0, 0);
    }
    return m;
  };
  add({
    id: 'wing-left', name: 'Left tegmen (forewing)', layer: 0, system: 'integument',
    cuttable: false, detachable: true,
    note: 'The leathery reddish-brown forewing. Lift both wings clear before cutting the terga.',
    mesh: mkWing(-1, false),
  });
  add({
    id: 'wing-right', name: 'Right tegmen (forewing)', layer: 0, system: 'integument',
    cuttable: false, detachable: true,
    note: 'The leathery reddish-brown forewing. The membranous hindwings fold fanwise beneath.',
    mesh: mkWing(1, false),
  });

  /* ---------- layer 1: fat body + dorsal heart ------------------------------ */
  // Fat body — irregular pale-yellow lobules filling the haemocoel. The FIRST
  // thing seen when the terga come off, and a headline structure.
  const fatLobes = [
    [-0.9, 0.6, 'l'], [0.9, 0.4, 'r'], [-0.5, -1.4, 'l'], [0.55, -1.7, 'r'],
    [0, 1.4, 'c'], [-0.7, -3.0, 'l'], [0.7, -3.1, 'r'], [0, -0.5, 'c'],
  ];
  fatLobes.forEach(([x, z, sfx], i) => {
    const f = organ(THREE, FAT, 0.62, 0.2, 0.9, { amp: 0.12, rough: 0.6, clear: 0.35, sheen: 0xfff0b0, seed: i * 4 });
    f.position.set(x, 0.02, z);
    f.rotation.y = (i % 2 ? 0.3 : -0.3);
    add({
      id: 'fat-body-' + sfx + '-' + i, name: 'Fat body', layer: 1, system: 'endocrine',
      cuttable: true, detachable: true,
      note: 'Pale creamy-yellow lobules of nutrient-storage tissue that fill the body cavity — the insect equivalent of liver plus adipose. Nudge it aside to reach the gut.',
      mesh: f,
    });
  });
  // Dorsal tubular heart — runs the midline just under the terga, with paired ostia
  // and alary muscles. Not a chambered pump; a peristaltic tube.
  const heartPts = [];
  for (let k = 0; k <= 16; k++) { const t = k / 16; heartPts.push([0, 0.28, 3.0 - t * 8.4]); }
  const heart = tube(THREE, HEART_C, heartPts, 0.09, { rough: 0.4, clear: 0.55, sheen: 0xd8a898, rad: 8, seg: 60 });
  add({
    id: 'dorsal-heart', name: 'Dorsal tubular heart', layer: 1, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'A slender pulsatile tube along the mid-dorsal line, chambered by segmental ostia through which haemolymph enters. It drives an OPEN circulation — no arteries to the organs.',
    mesh: heart,
  });
  for (let k = 0; k < 6; k++) {
    const z = 1.6 - k * 1.15;
    for (let s = -1; s <= 1; s += 2) {
      const alary = tube(THREE, 0xd8b0a0, [[0, 0.28, z], [s * 0.9, 0.14, z - 0.1]], 0.02, { rough: 0.6, rad: 4, seg: 8 });
      childMesh(heart, alary, 0, 0, 0);
    }
  }

  /* ---------- layer 2: digestive tract -------------------------------------- */
  // One continuous through-gut from the head to the tail, in real order.
  // Oesophagus (narrow, anterior).
  const oes = tube(THREE, CROP_C, [[0, -0.05, 4.2], [0, -0.05, 3.2], [0, -0.05, 2.4]], 0.11,
    { rough: 0.5, clear: 0.4, rad: 8, seg: 20 });
  add({
    id: 'oesophagus', name: 'Oesophagus', layer: 2, system: 'digestive', cuttable: true, detachable: false,
    note: 'Carries food back from the pharynx to the crop. The salivary glands drain into the foregut here.',
    mesh: oes,
  });
  // Crop — a large thin-walled distensible sac (foregut storage), the biggest gut
  // structure, sitting in the thorax/anterior abdomen.
  const crop = bag(THREE, CROP_C, 1.5, 0.5, { amp: 0.06, rough: 0.5, clear: 0.45, trans: 0.32, thickness: 0.5, atten: 0xcaa878, sheen: 0xe0c090 });
  crop.position.set(0, -0.02, 1.5); crop.rotation.x = Math.PI / 2;
  add({
    id: 'crop', name: 'Crop', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A thin-walled distensible storage sac of the foregut. Food is held and partly digested here by enzymes carried forward from the midgut.',
    mesh: crop,
  });
  // Gizzard / proventriculus — small, firm, muscular, with internal chitinous teeth.
  const giz = organ(THREE, GIZZARD_C, 0.28, 0.24, 0.34, { amp: 0.04, rough: 0.42, clear: 0.5, sheen: 0xc8a068, seed: 5 });
  giz.position.set(0, -0.02, 0.3);
  add({
    id: 'gizzard', name: 'Gizzard (proventriculus)', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A short, firm, muscular grinding chamber armed with chitinous teeth that triturate food before it passes to the midgut.',
    mesh: giz,
  });
  // Midgut / mesenteron, ringed at its anterior end by finger-like gastric caeca.
  const midgut = tube(THREE, MIDGUT_C, [[0, -0.04, -0.1], [0, -0.04, -1.0], [0, -0.04, -1.9]], 0.19,
    { rough: 0.48, clear: 0.4, rad: 8, seg: 24 });
  add({
    id: 'midgut', name: 'Midgut (mesenteron)', layer: 2, system: 'digestive', cuttable: true, detachable: false,
    note: 'The stomach of the insect and the main site of enzyme secretion and absorption. A peritrophic membrane lines it and wraps the food.',
    mesh: midgut,
  });
  // Gastric caeca — 6-8 blind finger-like pouches encircling the midgut origin.
  // The pick target is a real torus ring MESH (dissect.js raycasts a part's own
  // geometry non-recursively, so a bare Group would be invisible to the probe);
  // the eight fingers hang off it as decorative children.
  const caeca = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 20),
    mat(THREE, CAECA_C, { rough: 0.5, clear: 0.42, sheen: 0xe0c890 }));
  caeca.position.set(0, -0.02, 0.02); caeca.rotation.x = Math.PI / 2;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const c = organ(THREE, CAECA_C, 0.06, 0.06, 0.26, { rough: 0.5, clear: 0.4, seed: k });
    childMesh(caeca, c, Math.cos(a) * 0.28, 0.05, Math.sin(a) * 0.12,
      Math.PI / 2 + Math.sin(a) * 0.2, 0, a);
  }
  add({
    id: 'gastric-caeca', name: 'Gastric caeca', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A ring of eight blind finger-like pouches at the front of the midgut. They enlarge the secretory and absorptive surface — a diagnostic cockroach feature.',
    mesh: caeca,
  });
  // Hindgut — ileum, colon and the wider rectum, ending at the anus.
  const hindgut = tube(THREE, HINDGUT_C,
    [[0, -0.04, -2.0], [0, -0.04, -3.2], [0.05, -0.04, -4.2], [0, -0.06, -5.0]], 0.17,
    { rough: 0.5, clear: 0.38, rad: 8, seg: 28 });
  add({
    id: 'hindgut', name: 'Hindgut (ileum, colon, rectum)', layer: 2, system: 'digestive', cuttable: true, detachable: false,
    note: 'Reabsorbs water and ions from the faeces; the rectal glands make it a superb water conserver. Ends at the anus beneath the cerci.',
    mesh: hindgut,
  });
  // Malpighian tubules — a tuft of fine yellowish threads at the midgut-hindgut
  // junction (excretory — the insect kidney). A small flattened blob carries the
  // material and gives the probe something to hover; the fine threads are children.
  // Sits a touch proud of the gut (higher y, a larger blob) so the probe can
  // actually reach this small structure from the top-down view.
  const malp = organ(THREE, MALPIGHIAN_C, 0.34, 0.18, 0.34, { amp: 0.14, rough: 0.55, clear: 0.4, seed: 11 });
  malp.position.set(0, 0.1, -1.95);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const wob = 0.3 + (k % 3) * 0.14;
    const mpts = [
      [0, 0, 0], [Math.cos(a) * 0.4, Math.sin(a) * 0.18, wob * 0.6],
      [Math.cos(a) * 0.7, Math.sin(a) * 0.3 + 0.1, wob], [Math.cos(a + 0.5) * 0.6, Math.sin(a) * 0.2, wob + 0.4],
    ];
    const mt = tube(THREE, MALPIGHIAN_C, mpts, 0.018, { rough: 0.55, rad: 4, seg: 16 });
    childMesh(malp, mt, 0, 0, 0);
  }
  add({
    id: 'malpighian-tubules', name: 'Malpighian tubules', layer: 2, system: 'excretory', cuttable: false, detachable: true,
    note: 'A tuft of fine yellow threads arising at the midgut-hindgut junction. They are the insect kidney — drawing nitrogenous waste (uric acid) from the haemolymph into the gut.',
    mesh: malp,
  });
  // Salivary glands — paired lobed glands in the thorax beside the crop.
  for (let s = -1; s <= 1; s += 2) {
    const sal = organ(THREE, 0xd8cba0, 0.24, 0.1, 0.5, { amp: 0.1, rough: 0.55, clear: 0.4, seed: s + 6 });
    sal.position.set(s * 0.5, -0.06, 2.1);
    add({
      id: 'salivary-gland-' + (s < 0 ? 'l' : 'r'), name: 'Salivary gland', layer: 2, system: 'digestive',
      cuttable: true, detachable: true,
      note: 'Paired lobed glands in the thorax that secrete saliva forward into the mouth to begin digestion.',
      mesh: sal,
    });
  }

  /* ---------- layer 3: nervous / tracheal / reproductive -------------------- */
  // Ventral nerve cord — a double chain along the FLOOR of the body with segmental
  // ganglia, plus the sub-/supra-oesophageal ganglia in the head.
  const cordPts = [];
  for (let k = 0; k <= 18; k++) { const t = k / 18; cordPts.push([0, -0.32, 4.6 - t * 10.4]); }
  const cord = tube(THREE, NERVE_C, cordPts, 0.05, { rough: 0.4, clear: 0.5, sheen: 0xffffff, rad: 6, seg: 60 });
  add({
    id: 'nerve-cord', name: 'Ventral nerve cord', layer: 3, system: 'nervous', cuttable: true, detachable: false,
    note: 'A paired (double) chain of white nerve running along the ventral floor — three thoracic and six abdominal ganglia, quite unlike the single dorsal cord of a vertebrate.',
    mesh: cord,
  });
  // ganglia as swellings along the cord (decorative children)
  const gangZ = [3.4, 2.4, 1.4, 0.4, -0.7, -1.8, -2.9, -4.0, -4.9];
  gangZ.forEach((z, i) => {
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(THREE, 0xf2eede, { rough: 0.4, clear: 0.5 }));
    childMesh(cord, g, 0, 0, 0);
    g.position.set(0, -0.32, z);
  });
  // supra-oesophageal ganglion ("brain") in the head
  const brain = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mat(THREE, 0xefe9d6, { rough: 0.4, clear: 0.55 }));
  brain.position.set(0, -0.06, 4.7);
  add({
    id: 'brain-ganglion', name: 'Supra-oesophageal ganglion (brain)', layer: 3, system: 'nervous', cuttable: false, detachable: true,
    note: 'The "brain" — a fused ganglion above the oesophagus that innervates the eyes and antennae. A decapitated cockroach still walks: the thoracic ganglia are largely autonomous.',
    mesh: brain,
  });
  // Tracheae — silvery branching air tubes radiating from the lateral spiracles.
  // The two longitudinal tracheal TRUNKS (left + right) are one real carrier mesh;
  // the fine transverse branches to the organs hang off it as children.
  const trunkPts = [];
  for (let k = 0; k <= 10; k++) { const t = k / 10; trunkPts.push([-1.25, -0.08, 2.0 - t * 6.6]); }
  const trach = tube(THREE, TRACHEA_C, trunkPts, 0.045, { rough: 0.3, clear: 0.7, sheen: 0xf0f6f8, rad: 6, seg: 40 });
  // the right-side trunk, mirrored, as a child
  const rTrunkPts = trunkPts.map(([x, y, z]) => [-x, y, z]);
  childMesh(trach, tube(THREE, TRACHEA_C, rTrunkPts, 0.045, { rough: 0.3, clear: 0.7, sheen: 0xf0f6f8, rad: 6, seg: 40 }), 0, 0, 0);
  for (let s = -1; s <= 1; s += 2) {
    for (let k = 0; k < 5; k++) {
      const z = 1.6 - k * 1.1;
      const tpts = [
        [s * 1.3, -0.08, z], [s * 0.8, -0.04, z - 0.1],
        [s * 0.3, 0.0, z - 0.05], [0, 0.04, z],
      ];
      childMesh(trach, tube(THREE, TRACHEA_C, tpts, 0.028, { rough: 0.3, clear: 0.7, sheen: 0xf0f6f8, rad: 5, seg: 14 }), 0, 0, 0);
    }
  }
  add({
    id: 'tracheae', name: 'Tracheal system', layer: 3, system: 'respiratory', cuttable: false, detachable: true,
    note: 'Silvery branching air tubes that carry oxygen DIRECTLY to every tissue from the lateral spiracles — the blood plays no part in gas transport. The reason insects stay small.',
    mesh: trach,
  });
  // Reproductive organs at the posterior abdomen (generic paired bodies + a duct).
  const gonad = organ(THREE, 0xdcc9a2, 0.3, 0.16, 0.5, { amp: 0.12, rough: 0.55, clear: 0.4, seed: 9 });
  gonad.position.set(0, -0.1, -4.4);
  add({
    id: 'reproductive', name: 'Reproductive organs', layer: 3, system: 'urogenital', cuttable: true, detachable: true,
    note: 'Paired gonads with their ducts in the posterior abdomen — testes with a mushroom gland in the male, or ovaries of tapering ovarioles in the female.',
    mesh: gonad,
  });

  // Lay the insect dorsum-up on the tray for a top-down camera (already built with
  // +y dorsal, so only a slight tilt to sit it flat and square to the lens).
  group.rotation.x = -Math.PI / 2;
  return { group, parts };
}

/* ---- self-registration (the one allowed top-level block besides the builder) -- */
SPECIMEN_BUILDERS.cockroach = buildCockroach;
SPECIMENS.cockroach = {
  id: 'cockroach', name: 'Cockroach',
  blurb: 'The classic insect dissection: lift the wings, cut the terga, and find the fat body, gizzard and Malpighian tubules.',
  camera: { pos: [0, 15.5, 9.5], target: [0, 0, -0.6] },
  requiresPinning: false,
};
SPECIMEN_OBJECTIVES.cockroach = [
  { id: 'wings', text: 'Remove the <b>wings</b> to clear the back.',
    hint: 'Forceps (2). Grip each tegmen and lift it away.',
    done: (s) => s.removed.has('wing-left') || s.removed.has('wing-right') },
  { id: 'terga', text: 'Cut the <b>abdominal terga</b> along the midline of the back.',
    hint: 'Scalpel (3). One smooth stroke down the dorsal midline — do not saw.',
    done: (s) => s.incisions.has('exoskeleton') && s.incisions.get('exoskeleton').length > 1.1 },
  { id: 'open', text: 'Reflect the exoskeleton to open the body cavity.',
    hint: 'Forceps on the cut edge, folding the plate aside.',
    done: (s) => s.opened.has('exoskeleton') },
  { id: 'fat', text: 'Identify the pale-yellow <b>fat body</b> and the dorsal <b>heart</b>.',
    hint: 'Probe (1) on the fat lobules and on the mid-dorsal vessel.',
    done: (s, seen) => [...seen].some((id) => id.startsWith('fat-body-')) && seen.has('dorsal-heart') },
  { id: 'gut', text: 'Trace the gut: find the <b>crop</b>, the <b>gizzard</b> and the <b>gastric caeca</b>.',
    hint: 'Nudge the fat body aside, then probe each part of the digestive tube.',
    done: (s, seen) => seen.has('crop') && seen.has('gizzard') && seen.has('gastric-caeca') },
  { id: 'malpighian', text: 'Find the fine <b>Malpighian tubules</b> at the midgut–hindgut junction.',
    hint: 'They are the insect kidney — a tuft of yellow threads where midgut meets hindgut.',
    done: (s, seen) => seen.has('malpighian-tubules') },
  { id: 'nerve', text: 'Move the gut aside and find the ventral <b>nerve cord</b>.',
    hint: 'It runs along the FLOOR of the body — a double white chain of ganglia.',
    done: (s, seen) => seen.has('nerve-cord') },
  { id: 'tracheae', text: 'Identify the silvery <b>tracheae</b> — how the insect breathes.',
    hint: 'Fine branching air tubes running to every organ from the side of the body.',
    done: (s, seen) => seen.has('tracheae') },
];
