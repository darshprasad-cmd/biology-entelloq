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

  // Same-material exterior pieces are batched at authoring time, with every
  // temporary geometry disposed. Articulation does not add one draw call per
  // spine, antennal ring or tarsal segment.
  function exteriorBatch(name, geometries, color, detail = 'chitin') {
    const positions = [], normals = [], indices = [];
    geometries.forEach(g => {
      const offset = positions.length / 3;
      positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array);
      indices.push(...Array.from(g.index.array, i => i + offset)); g.dispose();
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); g.setIndex(indices); seal(g);
    const mesh = new THREE.Mesh(g, mat(THREE, color, { rough: 0.46, clear: 0.38 }));
    mesh.name = name; mesh.userData.exteriorTissue = 'chitin'; mesh.userData.exteriorDetail = detail;
    return mesh;
  }
  function limbSegment(a, b, radiusA, radiusB, radial = 7) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), direction = end.clone().sub(start);
    const g = new THREE.CylinderGeometry(radiusB, radiusA, direction.length(), radial, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
    g.translate((start.x + end.x) / 2, (start.y + end.y) / 2, (start.z + end.z) / 2);
    return g;
  }

  // Whole-body span (local units before final lay-flat): head at z ~ +5.4, abdomen
  // tip at z ~ -6.2, so the insect is ~11.6 long, ~3.2 wide, ~1.1 tall (flat).

  /* ---------- layer 0: exoskeleton ------------------------------------------ *
   * Everything the student sees before cutting: the plated dorsum. The abdominal
   * terga are the cuttable plate; the pronotum, head and wings are their own
   * structures. Antennae, eyes, legs and cerci hang off these as decorative
   * CHILD meshes so they are never in the pick list. */

  // Abdominal terga — the broad, gently domed, segmented dorsal plate the incision
  // runs down. Ten overlapping segments suggested by transverse grooves.
  const abdG = new THREE.SphereGeometry(1, 72, 48);
  displace(THREE, abdG, 0.03, 3.0, 7);
  {
    const p = abdG.attributes.position, v = new THREE.Vector3(), colors = [], color = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const uz = v.z;
      // flatten dorsoventrally, widen, and taper toward the posterior tip
      const taper = 1 - 0.28 * Math.max(0, -uz);
      v.x *= 1.55 * taper;
      v.y *= 0.42;                        // FLAT
      v.z *= 3.1;
      // Ten low overlapping terga: shallow geometric transverse sulci and
      // scalloped lateral edges, not painted rings on a smooth oval.
      const phase = ((v.z + 3.1) / 0.62) % 1;
      const groove = Math.exp(-Math.pow((phase - 0.12) / 0.12, 2));
      if (v.y > 0) v.y *= 1 - 0.18 * groove;
      v.x *= 1 - 0.022 * groove;
      if (v.y < 0) v.y *= 0.5;            // shallow ventral
      p.setXYZ(i, v.x, v.y, v.z);
      color.setHex(0x8a4021).lerp(new THREE.Color(0x382219), groove * 0.44 + Math.min(0.22, Math.abs(v.x) * 0.10));
      colors.push(color.r, color.g, color.b);
    }
    abdG.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    p.needsUpdate = true; abdG.computeVertexNormals();
  }
  const abd = new THREE.Mesh(abdG, mat(THREE, 0xffffff, { vcol: true, rough: 0.44, clear: 0.48, clearRough: 0.28, sheen: 0x9a6843 }));
  abd.userData.exteriorDetail = 'segmented-abdomen';
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
    const segments = [];
    for (let i = 0; i < 10; i++) {
      const t = i / 10, next = (i + 0.87) / 10;
      segments.push(limbSegment([s * (0.23 + t * 0.25), 0.035 + t * 0.05, -2.93 - t * 0.78],
        [s * (0.23 + next * 0.25), 0.035 + next * 0.05, -2.93 - next * 0.78], 0.065 * (1 - t * 0.8), 0.06 * (1 - next * 0.8), 6));
    }
    abd.add(exteriorBatch('cercus-' + s, segments, CHITIN_D, 'cercus'));
  }

  // Pronotum — the shield-shaped plate over the prothorax, a landmark.
  const pronG = new THREE.SphereGeometry(1, 32, 20);
  {
    const p = pronG.attributes.position, v = new THREE.Vector3(), colors = [], color = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const anterior = v.z;
      // Broad posterior corners and a gently rolled anterior shield, not the
      // former oversized spherical button wider than the abdomen.
      v.x *= 1.40 * (1 - 0.13 * anterior); v.y *= 0.30;
      // The anterior hood overlaps the cervical region; an exposed bead-like
      // neck incorrectly separates the head from this protective shield.
      v.z = anterior > 0 ? anterior * 1.10 + Math.pow(anterior, 3) * 0.85 : anterior * 1.48;
      if (v.y < 0) v.y *= 0.4;
      p.setXYZ(i, v.x, v.y, v.z);
      const margin = Math.pow(Math.max(0, 1 - Math.abs(v.y) / 0.30), 4);
      color.setHex(0x633421).lerp(new THREE.Color(0xbc8a50), margin * 0.75);
      colors.push(color.r, color.g, color.b);
    }
    pronG.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    p.needsUpdate = true; pronG.computeVertexNormals();
  }
  const pron = new THREE.Mesh(pronG, mat(THREE, 0xffffff, { vcol: true, rough: 0.38, clear: 0.48, sheen: 0x9b6e44 }));
  pron.userData.exteriorDetail = 'pronotal-shield';
  pron.position.set(0, 0.16, 2.7);
  // The meso/metathorax joins the abdominal shell to the prothoracic shield.
  // Keep this unpickable bridge with the shield; the former empty gap exposed
  // the bench through an intact insect before any dissection step.
  const thorax = organ(THREE, CHITIN_D, 1.15, 0.26, 1.05, { rough: 0.5, clear: 0.3, seed: 21 });
  thorax.name = 'thoracic-bridge';
  thorax.userData.exteriorTissue = 'chitin';
  childMesh(pron, thorax, 0, -0.12, -1.4);
  add({
    id: 'pronotum', name: 'Pronotum (thoracic shield)', layer: 0, system: 'integument',
    cuttable: false, detachable: false,
    note: 'The broad shield covering the prothorax. Behind it lie the wing bases and the three pairs of legs.',
    mesh: pron,
  });

  // Head capsule with antennae and compound eyes (decorative children).
  const head = organ(THREE, CHITIN_D, 0.6, 0.34, 0.5, { rough: 0.4, clear: 0.5, seed: 3 });
  {
    const p = head.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const forward = Math.max(0, p.getZ(i) / 0.5);
      p.setXYZ(i, p.getX(i) * (1 - 0.32 * forward), p.getY(i) - forward * 0.08, p.getZ(i));
    }
    seal(head.geometry);
  }
  head.position.set(0, 0.14, 4.9);
  const neck = organ(THREE, CHITIN_D, 0.3, 0.2, 0.45, { rough: 0.6, clear: 0.2, seed: 22 });
  neck.geometry.scale(1, 0.65, 1); seal(neck.geometry);
  neck.name = 'cervical-connection';
  neck.userData.exteriorTissue = 'chitin';
  childMesh(head, neck, 0, -0.02, -0.57);
  add({
    id: 'head', name: 'Head capsule', layer: 0, system: 'integument',
    cuttable: false, detachable: false,
    note: 'Bears the long segmented antennae, the compound eyes and the biting mouthparts. Hypognathous — held under the pronotum.',
    mesh: head,
  });
  for (const side of [-1, 1]) {
    const jaw = [limbSegment([side * 0.16, -0.03, 0.35], [side * 0.23, -0.11, 0.52], 0.10, 0.055),
      limbSegment([side * 0.23, -0.11, 0.52], [side * 0.035, -0.14, 0.60], 0.055, 0.012)];
    head.add(exteriorBatch('mandible-' + side, jaw, 0x352117, 'mouthpart'));
  }
  for (let s = -1; s <= 1; s += 2) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10),
      mat(THREE, 0x2a1c14, { rough: 0.25, clear: 0.9 }));
    eye.scale.set(0.65, 1.10, 0.80); eye.userData.exteriorDetail = 'eye';
    childMesh(head, eye, s * 0.42, 0.12, 0.16);
    // Tapered, visibly segmented flagellum with a thicker basal scape.
    const antennaPoint = t => [s * (0.42 + t * 2.4), 0.1 + Math.sin(t * 2.2) * 0.24, 0.37 + t * 2.7];
    const antenna = [];
    for (let k = 0; k < 42; k++) {
      const t = k / 42, next = (k + 0.94) / 42;
      antenna.push(limbSegment(antennaPoint(t), antennaPoint(next), 0.040 * (1 - t * 0.80), 0.037 * (1 - next * 0.80), 5));
    }
    head.add(exteriorBatch('antenna-' + s, antenna, CHITIN_D, 'antenna'));
  }
  // Six articulated walking legs. Distinct coxa/femur/tibia/tarsus proportions,
  // knee joints, tibial spines and terminal claws replace the six curved sticks.
  for (let s = -1; s <= 1; s += 2) {
    for (let L = 0; L < 3; L++) {
      const z = 2.4 - L * 1.05;
      const spread = L === 0 ? 0.62 : L === 1 ? -0.18 : -0.82;
      const points = [[s * 0.70, -0.10, z], [s * 1.18, -0.02, z + 0.12],
        [s * (1.95 + L * 0.12), -0.05, z + spread], [s * (2.60 + L * 0.17), -0.27, z + spread - 0.82]];
      const segments = [limbSegment(points[0], points[1], 0.14, 0.12),
        limbSegment(points[1], points[2], 0.12, 0.075), limbSegment(points[2], points[3], 0.065, 0.035)];
      for (let joint = 1; joint <= 2; joint++) {
        const g = new THREE.SphereGeometry(joint === 1 ? 0.125 : 0.085, 9, 6); g.translate(...points[joint]); segments.push(g);
      }
      for (let k = 1; k <= 6; k++) {
        const t = k / 7, p = new THREE.Vector3(...points[2]).lerp(new THREE.Vector3(...points[3]), t);
        for (const side of [-1, 1]) segments.push(limbSegment(p.toArray(),
          [p.x + s * 0.11, p.y + side * 0.055, p.z + side * 0.13], 0.022, 0.003, 5));
      }
      let last = points[3];
      for (let k = 0; k < 5; k++) {
        const next = [last[0] + s * 0.105, last[1] - 0.012, last[2] - 0.085];
        segments.push(limbSegment(last, next, 0.037 - k * 0.004, 0.030 - k * 0.004, 6)); last = next;
      }
      for (const side of [-1, 1]) segments.push(limbSegment(last, [last[0] + s * 0.13, last[1] + 0.025, last[2] + side * 0.075], 0.021, 0.002, 5));
      const leg = exteriorBatch('walking-leg-' + (s < 0 ? 'left-' : 'right-') + L, segments, 0x714022, 'jointed-leg');
      leg.userData.jointCount = 7; leg.userData.tarsalSegments = 5;
      // Leg paths above are specimen-local. Compensate for the abdominal
      // parent's offset so the three pairs attach to the thorax, not the tail.
      childMesh(abd, leg, 0, 0.02, -abd.position.z);
    }
  }

  // Wings — two pairs folded flat over the back: leathery brown tegmina over
  // membranous hindwings. Removable (the first real step of the dissection).
  const mkWing = (s, membranous) => {
    const g = new THREE.BufferGeometry();
    const m = new THREE.Mesh(g, mat(THREE,
      membranous ? 0x8a6a44 : 0xffffff,
      { vcol: !membranous, rough: membranous ? 0.35 : 0.43, clear: 0.42, trans: membranous ? 0.5 : 0.06,
        thickness: 0.12, side: THREE.DoubleSide, sheen: 0xa87748 }));
    // Preserve the existing part transform and detachable-attachment contract;
    // author the new cambered surface in specimen space, then inverse-transform.
    m.rotation.x = -Math.PI / 2;
    m.position.set(s * 0.85, 0.28 + (membranous ? -0.03 : 0), -1.9);
    m.rotation.z = s * 0.16;
    m.updateMatrix(); const inverse = m.matrix.clone().invert();
    const wingPoint = (t, u, lift = 0) => {
      // Broad insertion, mostly parallel costal margins, rounded distal edge.
      // Slight overlap and unequal tip reach avoid two identical pointed leaves.
      const width = 0.50 + 0.16 * Math.sin(Math.PI * t) - 0.15 * Math.pow(t, 6);
      const x = s * (0.55 - 0.23 * t * t + u * width * (s > 0 ? 0.97 : 1));
      const emergence = smooth(Math.min(1, t / 0.18));
      const tip = smooth(Math.max(0, (t - 0.82) / 0.18));
      const y = 0.59 - 0.28 * (1 - emergence) + 0.035 * Math.sin(Math.PI * t)
        - 0.055 * Math.abs(u) - 0.09 * Math.pow(t, 8) + (s > 0 ? 0.008 : 0) + lift;
      const z = 1.80 - t * (s > 0 ? 6.49 : 6.62) + 0.30 * u * u * tip;
      return new THREE.Vector3(x, y, z).applyMatrix4(inverse);
    };
    const rows = 36, columns = 12, positions = [], uvs = [], colors = [], indices = [], color = new THREE.Color();
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++) {
      const t = i / rows, u = j / columns * 2 - 1;
      positions.push(...wingPoint(t, u).toArray()); uvs.push((u + 1) / 2, t);
      color.setHex(0x9b542c).lerp(new THREE.Color(0x4d2b1c), 0.22 * Math.abs(u) + 0.15 * t);
      colors.push(color.r, color.g, color.b);
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j, b = a + columns + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setIndex(indices); seal(g);
    m.userData.exteriorDetail = 'cambered-tegmen';
    const veins = [];
    for (let k = 0; k < 8; k++) {
      const u = -0.88 + k * 1.76 / 7;
      const path = new THREE.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => {
        const t = i / 12; return wingPoint(t, u * (0.28 + t * 0.72), 0.012);
      }));
      veins.push(new THREE.TubeGeometry(path, 24, 0.009, 4, false));
    }
    for (let k = 0; k < 11; k++) {
      const t = 0.14 + k * 0.065;
      const path = new THREE.CatmullRomCurve3([-0.80, -0.3, 0.3, 0.80].map(u => wingPoint(t + u * 0.022, u, 0.009)));
      veins.push(new THREE.TubeGeometry(path, 8, 0.0045, 3, false));
    }
    const venation = exteriorBatch('tegmen-venation', veins, 0x754328, 'wing-veins');
    // Keep low-contrast veins distinct; do not apply the parent's scale-like map.
    delete venation.userData.exteriorTissue;
    m.add(venation);
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
  const crop = bag(THREE, CROP_C, 1.5, 0.5, { bend: 0, amp: 0.06, rough: 0.5, clear: 0.45, trans: 0.32, thickness: 0.5, atten: 0xcaa878, sheen: 0xe0c090 });
  // The bag helper is z-long: keep the storage sac along the foregut, with its
  // narrow end posterior toward the gizzard, not standing through the dorsum.
  crop.position.set(0, -0.02, 1.5); crop.rotation.y = Math.PI;
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

  // +y is already dorsal. Keep it up; a quarter turn stood the abdomen on end.
  group.rotation.x = 0;
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
    hint: 'Forceps (3). Grip each tegmen and lift it away.',
    done: (s) => s.removed.has('wing-left') || s.removed.has('wing-right') },
  { id: 'terga', text: 'Cut the <b>abdominal terga</b> along the midline of the back.',
    hint: 'Scalpel (2). One smooth stroke down the dorsal midline — do not saw.',
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
