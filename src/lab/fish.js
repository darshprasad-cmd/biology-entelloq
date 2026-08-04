/*
 * fish.js — buildFish
 * Concatenated into one module scope with anatomy.js (the shared geometry
 * toolkit, SPECIMENS + buildSpecimen dispatcher). Uses those helpers directly;
 * every local helper below is declared INSIDE buildFish so it cannot collide
 * with another module's top-level names. The only top-level names this file adds
 * are `buildFish` and the single self-registration block at the bottom.
 *
 * Anatomy grounded in a standard vertebrate (teleost / bony-fish, Labeo-type)
 * dissection — the CBSE/ICSE laboratory sequence: lay the fish on its side, lift
 * the operculum to count the gill arches, then cut a flap of the LEFT flank wall
 * and reflect it to open the peritoneal cavity. No pinning (it lies on its side).
 *
 * Coordinate convention for the un-rotated group:
 *   +z = snout (anterior)        -z = caudal peduncle / tail (posterior)
 *   +y = dorsal (back, dorsal fin, swim bladder, kidney, vertebral column)
 *   -y = ventral (belly — the peritoneal cavity opens along here; heart, gut)
 *   -x = the animal's LEFT flank (the surface the student opens; faces the camera)
 *   +x = the animal's RIGHT flank
 * A laterally-COMPRESSED, deep-bodied fusiform trunk: the x (thickness) half-scale
 * is ~3x smaller than the y (depth) half-scale. The whole group is finally rolled
 * onto its right side (rotation.z = -PI/2) so the LEFT flank faces up into a
 * broadside top-down camera, exactly as a fish lies on the dissecting tray.
 *
 * Layer plan (consecutive, dense):
 *   0  skin + flank body wall (cuttable flap) + the bony OPERCULUM (liftable)
 *   1  the GILLS — four arches per side bearing red FILAMENTS and white RAKERS —
 *      plus the muscular body-wall MYOTOMES (the reflectable muscle sheet)
 *   2  abdominal viscera — two-chambered HEART, LIVER, gut (oesophagus, stomach,
 *      intestine, pyloric caeca), SPLEEN, and the pearly SWIM BLADDER dorsally
 *   3  dorsal / retroperitoneal — dark KIDNEY on the vertebral column, paired
 *      GONADS, the VERTEBRAL COLUMN and the spinal cord
 */

function buildFish(THREE) {
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

  /* Body: a laterally-COMPRESSED, deep-bodied fusiform trunk. Widest girth just
   * behind the head (t~0.55), a thin caudal peduncle, a blunt snout. Carries a
   * silver-olive-dorsal / pale-belly vertex tint with a faint lateral-line stripe.
   * sx (thickness) << sy (depth) is what makes the fish read as slab-sided. */
  function fishBody(sx, sy, sz, o) {
    o = o || {};
    const seg = o.seg || 52, seg2 = o.seg2 || 38;
    const g = new THREE.SphereGeometry(1, seg, seg2);
    displace(THREE, g, o.amp != null ? o.amp : 0.03, 2.2, o.seed || 0);
    const p = g.attributes.position, v = new THREE.Vector3();
    const colors = o.vcol ? new Float32Array(p.count * 3) : null;
    const c = new THREE.Color();
    const dorsal = new THREE.Color(0x5c6a4a);   // olive-silver back
    const flank  = new THREE.Color(0xacb6a6);   // silver flank
    const belly  = new THREE.Color(0xdcdccc);   // pale cream underside
    const line   = new THREE.Color(0x475138);   // faint lateral-line stripe
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const ux = v.x, uy = v.y, uz = v.z;         // unit coords, pre-scale
      const t = Math.max(0, Math.min(1, (uz + 1) / 2)); // 0 tail .. 1 snout
      // Girth: deepest just behind the head. pow(t,1.15) skews the peak forward.
      let girth = Math.sin(Math.PI * Math.pow(t, 1.15));
      if (t < 0.2) girth *= 0.28 + t * 3.6;        // thin caudal peduncle
      if (t > 0.88) girth *= 1 - (t - 0.88) / 0.12 * 0.6; // blunt snout
      const ydome = uy >= 0 ? 1.06 : 0.99;         // dorsum a touch more arched
      p.setXYZ(i, ux * girth * sx, uy * girth * sy * ydome, uz * sz);
      if (colors) {
        const up = Math.max(0, Math.min(1, (uy + 1) / 2));   // 0 belly .. 1 dorsal
        c.copy(belly).lerp(flank, smooth(Math.min(1, up * 1.7)));
        c.lerp(dorsal, smooth(Math.max(0, (up - 0.56) / 0.44)));
        const ll = Math.exp(-Math.pow((uy - 0.02) / 0.05, 2));  // mid-flank stripe
        c.lerp(line, ll * 0.22);
        const m = vnoise(ux * 11 + 2, uy * 6, uz * 6 + 5);      // faint scale mottle
        c.offsetHSL(0, 0, (m - 0.5) * 0.05);
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
    }
    if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    seal(g);
    return g;
  }

  /* A thin translucent fin membrane on rays. Decorative only — always a child of
   * the body wall, never a pickable part. Base runs along local -x..+x (the
   * attached root at -x, the free scalloped edge at +x); the membrane spans local
   * y. Orient with rotation when attaching. */
  function fin(len, wide, o) {
    o = o || {};
    const g = new THREE.PlaneGeometry(len, wide, 6, 4);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const tx = (v.x / len) + 0.5;                 // 0 root .. 1 free edge
      p.setXYZ(i, v.x, v.y * (0.55 + tx * 0.7), Math.sin(v.y * 2.4) * 0.05 * tx);
    }
    seal(g);
    const m = new THREE.Mesh(g, mat(THREE, o.color || 0xa7b4a2, {
      trans: true, opacity: o.opacity != null ? o.opacity : 0.48, rough: 0.5, clear: 0.4,
      side: THREE.DoubleSide, transmission: 0.55, thickness: 0.12, sheen: 0xcdd6c6 }));
    m.material.depthWrite = false;
    const nr = o.rays || 6;                          // fin rays as fine child struts
    for (let i = 0; i < nr; i++) {
      const yy = (i / (nr - 1) - 0.5) * wide * 0.82;
      const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.014, len * 0.94, 4),
        mat(THREE, o.rayColor || 0x8a9885, { rough: 0.6 }));
      ray.position.set(0, yy, 0.012);
      ray.rotation.z = Math.PI / 2;
      m.add(ray);
    }
    return m;
  }

  /* A single curved gill arch (dorsal→ventral C-bar) as a pale bony tube. Its
   * bright-red filaments fan laterally (toward -x / the camera); pass filaments to
   * hang them as decorative children. */
  function gillArch(x, z, o) {
    o = o || {};
    const path = [
      [x + 0.02, 0.86, z - 0.04],
      [x - 0.03, 0.42, z + 0.06],
      [x - 0.04, 0.0, z + 0.09],
      [x - 0.03, -0.42, z + 0.06],
      [x + 0.02, -0.84, z - 0.04],
    ];
    const m = tube(THREE, 0xd7ccb6, path, 0.05,
      { rough: 0.6, clear: 0.3, sheen: 0xefe6d4, rad: 7, seg: 26 });
    if (o.filaments) {
      // two rows of fine red filaments (a holobranch) fanning laterally-posterior
      for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 11; i++) {
          const fy = 0.72 - i * 0.145;
          const fil = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.2, 3, 6),
            mat(THREE, 0xc11f22, { rough: 0.42, clear: 0.4, sheen: 0xf06a5a }));
          childMesh(m, fil, x - 0.12 - r * 0.05, fy, z + 0.02 + (r ? 0.08 : -0.05),
            0, 0, Math.PI / 2 + (r ? 0.25 : -0.25));
        }
      }
    }
    return m;
  }

  /* =====================================================================
   *  LAYER 0 — skin / flank body wall + the bony operculum
   * ===================================================================== */

  const skinGeo = fishBody(0.5, 1.7, 3.3, { vcol: true, amp: 0.03 });
  const skin = new THREE.Mesh(skinGeo,
    mat(THREE, 0xffffff, { vcol: true, rough: 0.42, clear: 0.62, clearRough: 0.4,
      sheen: 0xd6dcc8, sheenAmt: 0.7 }));

  // Head detail — a large lateral eye, a nostril, and the inferior mouth with the
  // fleshy lips typical of a bottom-feeding cyprinid. All decorative children.
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16),
    mat(THREE, 0xb59a3c, { rough: 0.26, clear: 0.9, clearRough: 0.14, sheen: 0xffe08a }));
  iris.scale.set(0.7, 1, 1);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12),
    mat(THREE, 0x080a06, { rough: 0.18, clear: 1, clearRough: 0.08 }));
  childMesh(iris, pupil, -0.1, 0, 0);
  childMesh(skin, iris, -0.42, 0.42, 2.55);
  const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(THREE, 0x15170f, { rough: 0.6 }));
  childMesh(skin, nostril, -0.34, 0.5, 2.95);
  // inferior mouth: a dark ventral gape with a thick fleshy lower lip
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 8, 18, Math.PI * 1.1),
    mat(THREE, 0x8a5a4e, { rough: 0.5, clear: 0.4, sheen: 0xc08878 }));
  childMesh(skin, lip, -0.18, -0.34, 3.02, 0.2, -0.5, 0.2);
  const gape = new THREE.Mesh(new THREE.CircleGeometry(0.13, 16, 0, Math.PI),
    mat(THREE, 0x120b09, { rough: 0.7, side: THREE.DoubleSide }));
  childMesh(skin, gape, -0.14, -0.28, 3.06, 0, -0.9, 0.15);

  // Fins as thin translucent child meshes on rays. Paired fins (pectoral, pelvic)
  // lie flat on the near LEFT flank facing the camera; median fins (dorsal, anal,
  // caudal) stand in the sagittal plane. Caudal is a forked two-lobe tail.
  const pectoral = fin(0.95, 0.62, { rays: 7, color: 0xb0bca6 });
  childMesh(skin, pectoral, -0.44, -0.5, 1.15, 0.15, -Math.PI / 2, -0.7);
  const pelvic = fin(0.6, 0.42, { rays: 5, color: 0xb0bca6 });
  childMesh(skin, pelvic, -0.38, -1.02, -0.15, 0.1, -Math.PI / 2, -0.5);
  const dorsalFin = fin(2.2, 0.85, { rays: 12, color: 0x9fae98, opacity: 0.5 });
  childMesh(skin, dorsalFin, 0, 1.85, 0.2, 0, -Math.PI / 2, Math.PI / 2);
  const analFin = fin(1.0, 0.5, { rays: 7, color: 0x9fae98 });
  childMesh(skin, analFin, 0, -1.15, -1.9, 0, -Math.PI / 2, Math.PI / 2);
  const caudalUp = fin(1.5, 0.7, { rays: 9, color: 0x93a48c, opacity: 0.52 });
  childMesh(skin, caudalUp, 0, 0.55, -3.9, 0, -Math.PI / 2, 0.55);
  const caudalLo = fin(1.5, 0.7, { rays: 9, color: 0x93a48c, opacity: 0.52 });
  childMesh(skin, caudalLo, 0, -0.55, -3.9, 0, -Math.PI / 2, -0.55);

  add({
    id: 'body-wall', name: 'Skin & flank body wall', layer: 0, system: 'integument',
    cuttable: true, detachable: false,
    note: 'Silver-olive above shading to a pale belly, covered in overlapping scales along a faint lateral line. Cut a flap from behind the operculum along the belly to the vent, then reflect it to open the cavity.',
    mesh: skin,
    incision: [[-0.5, -0.9, 1.2], [-0.52, -1.18, 0.3], [-0.52, -1.22, -0.8],
               [-0.5, -1.05, -2.1], [-0.46, -0.25, -2.3]],
  });

  // Operculum: the bony gill cover on the left flank, proud (lateral) of the skin
  // so it is the pick target over the gill chamber. Lift it to expose the gills.
  const opGeo = new THREE.SphereGeometry(1, 30, 22);
  displace(THREE, opGeo, 0.03, 2.4, 3);
  opGeo.scale(0.12, 1.05, 0.82);                    // a thin curved plate
  seal(opGeo);
  const operculum = new THREE.Mesh(opGeo,
    mat(THREE, 0xc7ccbf, { rough: 0.34, clear: 0.6, clearRough: 0.2, sheen: 0xdfe6da, sheenAmt: 0.7 }));
  operculum.position.set(-0.62, 0.05, 1.62);
  operculum.rotation.set(0, 0.12, 0.05);
  // faint radiating bony striae + the free posterior margin
  for (let i = 0; i < 5; i++) {
    const a = -0.6 + i * 0.3;
    const stria = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 1.2, 3, 5),
      mat(THREE, 0xb7bdb0, { rough: 0.5 }));
    childMesh(operculum, stria, 0.13, 0.1, 0, 0, 0, a);
  }
  add({
    id: 'operculum', name: 'Operculum (gill cover)', layer: 0, system: 'skeletal',
    cuttable: true, detachable: true,
    note: 'A bony plate of the opercular series covering the gill chamber. Water pumped over the gills leaves under its free rear margin. Lift it to expose the gills.',
    mesh: operculum,
  });

  /* =====================================================================
   *  LAYER 1 — gills (arches, filaments, rakers) + body-wall myotomes
   * ===================================================================== */

  // Four gill arches, stacked antero-posteriorly and receding medially into the
  // chamber. The outermost (arch 1) is left bare so its filaments and rakers can
  // be their own pickable bodies; arches 2–4 carry decorative filaments.
  const archX = [-0.58, -0.52, -0.47, -0.43];
  const archZ = [1.92, 1.72, 1.52, 1.32];
  for (let i = 0; i < 4; i++) {
    const m = gillArch(archX[i], archZ[i], { filaments: i > 0 });
    add({
      id: 'gill-arch-' + (i + 1), name: 'Gill arch ' + (i + 1), layer: 1, system: 'respiratory',
      cuttable: true, detachable: true,
      note: 'One of four bony branchial arches per side. Each bears a double row of respiratory filaments outward and food-straining rakers on its inner face — count all four.',
      mesh: m,
    });
  }

  // Gill filaments of arch 1 as their own pickable body: the bright oxygenated-red
  // respiratory surface, a dense feathery double comb fanning toward the camera.
  const filBase = tube(THREE, 0xbe1d21,
    [[-0.7, 0.72, 1.94], [-0.72, 0.0, 1.98], [-0.7, -0.72, 1.94]], 0.09,
    { rough: 0.42, clear: 0.42, sheen: 0xf06a5a, rad: 8, seg: 20 });
  // filBase is a tube at the group origin whose geometry is authored around
  // x≈-0.7; its filament children must be placed at that same lateral position
  // (fanning further out toward -x / the camera), NOT at the mesh origin — else
  // the whole red comb floats off to the body midline and, once the group is
  // rolled onto its side, sinks below the pickable bar into the viscera.
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 12; i++) {
      const fy = 0.7 - i * 0.13;
      const fil = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.24, 3, 6),
        mat(THREE, 0xc7222a, { rough: 0.4, clear: 0.42, sheen: 0xf47060 }));
      childMesh(filBase, fil, -0.82 - r * 0.05, fy, 1.96 + (r ? 0.1 : -0.06),
        0, 0, Math.PI / 2 + (r ? 0.28 : -0.28));
    }
  }
  add({
    id: 'gill-filaments', name: 'Gill filaments', layer: 1, system: 'respiratory',
    cuttable: true, detachable: true,
    note: 'The primary lamellae — bright red because they are packed with capillaries. This vast, thin, blood-rich surface is where oxygen is taken up from the water.',
    mesh: filBase,
  });

  // Gill rakers of arch 1: short white projections on the inner (pharyngeal) edge,
  // pointing into the buccal cavity to strain food from the respiratory stream.
  const rakBase = tube(THREE, 0xe7e2d4,
    [[-0.48, 0.66, 1.9], [-0.5, 0.0, 1.94], [-0.48, -0.66, 1.9]], 0.05,
    { rough: 0.5, clear: 0.35, sheen: 0xf4f0e6, rad: 7, seg: 18 });
  for (let i = 0; i < 9; i++) {
    const ry = 0.6 - i * 0.15;
    const rak = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.16, 3, 6),
      mat(THREE, 0xece7da, { rough: 0.5, clear: 0.3, sheen: 0xf6f2e8 }));
    rak.position.set(-0.4, ry, 1.9);
    rak.rotation.set(0, 0.5, Math.PI / 2 + 0.2);
    rakBase.add(rak);
  }
  add({
    id: 'gill-rakers', name: 'Gill rakers', layer: 1, system: 'respiratory',
    cuttable: true, detachable: true,
    note: 'White comb-like projections on the concave edge of the arch. They face the pharynx and sieve food particles so they are swallowed rather than lost across the gills.',
    mesh: rakBase,
  });

  // Body-wall muscle (myotomes): the reflectable muscle sheet deep to the skin.
  // Its W-shaped myomeres are the fish's "flakes". Cutting and reflecting it opens
  // the peritoneal cavity (reveals the viscera). Slightly inset from the skin.
  const wallGeo = fishBody(0.44, 1.5, 3.05, { amp: 0.028, seed: 6 });
  const myotome = new THREE.Mesh(wallGeo,
    mat(THREE, 0xba6f61, { rough: 0.6, clear: 0.3, sheen: 0xd88f7f, sheenAmt: 0.55 }));
  // myomere seams: a few pale chevron strips down the flank
  for (let i = 0; i < 7; i++) {
    const z = 1.6 - i * 0.62;
    const chev = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.02, 5, 14, Math.PI * 0.9),
      mat(THREE, 0xcaa093, { rough: 0.6 }));
    childMesh(myotome, chev, -0.34, 0.0, z, 0, 1.3, Math.PI / 2);
  }
  add({
    id: 'myotome-wall', name: 'Body-wall muscle (myotomes)', layer: 1, system: 'muscular',
    cuttable: true, detachable: false,
    note: 'The segmental swimming muscle, stacked in W-shaped myomeres. Cut this thin abdominal sheet and reflect it to open the peritoneal cavity beneath.',
    mesh: myotome,
    incision: [[-0.44, -0.82, 1.0], [-0.46, -1.02, 0.1], [-0.46, -1.0, -1.0], [-0.44, -0.85, -1.9]],
  });

  /* =====================================================================
   *  LAYER 2 — abdominal viscera
   * ===================================================================== */

  // Two-chambered heart: a single thick VENTRICLE with a thin-walled ATRIUM
  // dorsally, the dark sinus venosus behind it, and a pale bulbus arteriosus
  // leading forward into the ventral aorta toward the gills. Low and anterior,
  // in the pericardial cavity just behind the last gill arch.
  const ventricle = organ(THREE, 0x7c2530, 0.34, 0.32, 0.36,
    { tissue: 'muscle', amp: 0.06, rough: 0.5, clear: 0.55, sheen: 0xc0503f, seed: 2 });
  ventricle.position.set(-0.12, -1.05, 1.0);
  const atrium = organ(THREE, 0x652430, 0.28, 0.22, 0.26,
    { tissue: 'muscle', amp: 0.08, rough: 0.56, sheen: 0xa54452, seed: 3 });
  childMesh(ventricle, atrium, 0.02, 0.34, -0.12);
  const sinus = organ(THREE, 0x4c1e29, 0.2, 0.13, 0.18, { rough: 0.55, clear: 0.3, seed: 4 });
  childMesh(ventricle, sinus, 0.06, 0.24, -0.34);
  const bulbus = organ(THREE, 0xc98a76, 0.15, 0.15, 0.22, { rough: 0.44, clear: 0.5, sheen: 0xe0a894 });
  childMesh(ventricle, bulbus, -0.02, 0.06, 0.36);
  const ventralAorta = tube(THREE, 0xbf5a4a,
    [[-0.04, 0.1, 0.5], [-0.08, 0.45, 0.9], [-0.12, 0.72, 1.28]], 0.055,
    { rough: 0.45, clear: 0.4, sheen: 0xe07a68, rad: 7, seg: 16 });
  ventricle.add(ventralAorta);
  add({
    id: 'fish-heart', name: 'Heart', layer: 2, system: 'circulatory',
    cuttable: true, detachable: true,
    note: 'Only two chambers — one atrium and one thick ventricle (a single circuit). The ventricle pumps deoxygenated blood forward through the bulbus arteriosus and ventral aorta to the gills.',
    mesh: ventricle,
  });

  // Liver: a large, pale tan-pink multi-lobed gland filling the front of the
  // cavity and overlying the stomach and gut.
  const liver = lobe(THREE, 0xc9a184, 1.55, 1.1, 0.5,
    { rough: 0.42, clear: 0.72, clearRough: 0.28, sheen: 0xe2c2a6, seed: 5 });
  liver.position.set(-0.05, -0.7, 0.25);
  liver.rotation.set(-0.1, 0.3, 0.06);
  // a second, smaller lobe (decorative) makes the multi-lobed silhouette
  const liverLobe2 = lobe(THREE, 0xceaa8e, 1.0, 0.72, 0.4, { rough: 0.42, clear: 0.7, sheen: 0xe2c2a6, seed: 8 });
  childMesh(liver, liverLobe2, -0.55, -0.05, -0.55, 0.1, -0.6, 0);
  add({
    id: 'liver', name: 'Liver', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A large, soft, pale tan-pink gland in several lobes, dominating the front of the cavity. Lift it to expose the stomach and intestine beneath.',
    mesh: liver,
  });

  // Oesophagus → stomach → intestine (long, coiled) with pyloric caeca.
  const oeso = tube(THREE, 0xd6bfa6,
    [[-0.05, -0.25, 1.25], [-0.08, -0.55, 0.7], [-0.06, -0.8, 0.05]], 0.09,
    { rough: 0.5, clear: 0.35, sheen: 0xe8d0b8, rad: 8, seg: 18 });
  add({
    id: 'oesophagus', name: 'Oesophagus', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A short, wide muscular tube carrying swallowed food from the pharynx (behind the gills) back to the stomach.',
    mesh: oeso,
  });

  const stomach = bag(THREE, 0xcab094, 1.0, 0.4, { seed: 7, rough: 0.52, clear: 0.45, sheen: 0xe8c8a8, bend: 0.5 });
  stomach.position.set(-0.04, -0.9, -0.3);
  stomach.rotation.set(0.15, 2.1, 0.25);
  add({
    id: 'stomach', name: 'Stomach', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A muscular, whitish curved bag where digestion begins. Its narrow pyloric end passes to the intestine, ringed by the finger-like pyloric caeca.',
    mesh: stomach,
  });

  // Pyloric caeca: a cluster of blind finger-like pouches at the stomach–intestine
  // junction that add secretory/absorptive surface — a headline teleost feature.
  const caecaBase = organ(THREE, 0xcbb193, 0.13, 0.13, 0.15, { rough: 0.5, clear: 0.4, sheen: 0xe6cba4, seed: 9 });
  caecaBase.position.set(0.12, -0.86, -0.55);
  for (let i = 0; i < 6; i++) {
    const a = (i - 2.5) * 0.4;
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 4, 7),
      mat(THREE, 0xccb495, { rough: 0.5, clear: 0.4, sheen: 0xe6cba4 }));
    childMesh(caecaBase, finger, Math.sin(a) * 0.16, -0.05, -0.2 + Math.cos(a) * 0.05, -0.5, a, 0);
  }
  add({
    id: 'pyloric-caeca', name: 'Pyloric caeca', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A tuft of blind finger-like pouches at the pylorus. They greatly increase the absorptive and secretory surface where the stomach meets the intestine.',
    mesh: caecaBase,
  });

  // Intestine: a long tube coiling in the posterior-ventral cavity (a long gut is
  // typical of a plant-feeding cyprinid), enlarging toward the vent.
  const intPts = [
    [0.15, -0.9, -0.7], [0.3, -1.0, -0.35], [0.25, -1.05, 0.0], [-0.05, -1.08, 0.1],
  ];
  for (let i = 0; i <= 34; i++) {
    const t = i / 34;
    const ang = t * Math.PI * 2 * 2.2;
    const rad = 0.5 * (1 - 0.35 * t);
    intPts.push([
      Math.cos(ang) * rad * 0.55,
      -1.02 + Math.sin(ang * 1.2) * 0.06,
      -0.1 - t * 1.6 + Math.sin(ang) * rad,
    ]);
  }
  const intestine = tube(THREE, 0xc9a880, intPts, 0.15,
    { rough: 0.5, clear: 0.4, sheen: 0xe6b89e, seg: 150, rad: 9 });
  add({
    id: 'intestine', name: 'Intestine', layer: 2, system: 'digestive', cuttable: true, detachable: true,
    note: 'A long, coiled tube filling the floor of the cavity — the great length suits a diet of plant matter. It runs back to the vent, opening just ahead of the anal fin.',
    mesh: intestine,
  });

  // Spleen: a small dark-red bead near the stomach–intestine junction.
  const spleen = organ(THREE, 0x66202e, 0.16, 0.14, 0.2,
    { rough: 0.42, clear: 0.6, sheen: 0xa8465e, seed: 11 });
  spleen.position.set(0.26, -0.82, -0.35);
  add({
    id: 'spleen', name: 'Spleen', layer: 2, system: 'circulatory', cuttable: true, detachable: true,
    note: 'A small, dark-red organ tucked against the stomach. It is a blood store and part of the immune system — a circulatory, not a digestive, organ.',
    mesh: spleen,
  });

  // Swim bladder: the pearly, gas-filled hydrostatic organ lying dorsally against
  // the roof of the cavity. Two chambers (anterior smaller, posterior larger)
  // joined by a constriction — a headline teleost feature, silvery and iridescent.
  const sbOpts = { trans: true, opacity: 0.82, rough: 0.13, clear: 1, clearRough: 0.08,
    transmission: 0.34, thickness: 0.6, atten: 0xcfe0e6, sheen: 0xbcd2e2, sheenAmt: 0.72, amp: 0.05 };
  const swimBladder = sac(THREE, 0xd9dee2, 1.0, 0.42, { ...sbOpts, seed: 12 });
  swimBladder.position.set(0, 0.78, 0.55);
  swimBladder.rotation.set(0, 0, Math.PI / 2);        // long axis along z
  const sbPost = sac(THREE, 0xd6dce0, 1.4, 0.5, { ...sbOpts, seed: 13 });
  childMesh(swimBladder, sbPost, -1.55, 0, -0.05, 0, 0, 0);   // posterior chamber, larger
  const sbNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 14),
    mat(THREE, 0xd2d8dc, sbOpts));
  childMesh(swimBladder, sbNeck, -0.85, 0, 0, 0, 0, Math.PI / 2);
  swimBladder.renderOrder = 1;
  add({
    id: 'swim-bladder', name: 'Swim bladder', layer: 2, system: 'respiratory', cuttable: true, detachable: true,
    note: 'A pearly, gas-filled sac against the roof of the cavity, in two chambers. By adjusting its gas the fish tunes its buoyancy to hover at any depth. Lift it to reach the kidney behind.',
    mesh: swimBladder,
  });

  /* =====================================================================
   *  LAYER 3 — dorsal / retroperitoneal
   * ===================================================================== */

  // Kidney: a dark-red retroperitoneal strip fused along the midline directly
  // beneath the vertebral column, dorsal to the swim bladder. Stays put when the
  // viscera are removed.
  const kidney = organ(THREE, 0x561b21, 0.16, 0.26, 2.35,
    { amp: 0.05, rough: 0.45, clear: 0.5, sheen: 0x9a4038, seed: 14 });
  kidney.position.set(0, 1.05, -0.35);
  add({
    id: 'kidney', name: 'Kidney', layer: 3, system: 'urogenital', cuttable: true, detachable: true,
    note: 'A dark-red strip pressed against the underside of the backbone — retroperitoneal, so it stays put. Its front end (head kidney) also makes blood cells.',
    mesh: kidney,
  });

  // Paired gonads: elongate organs slung along the dorsal cavity, one each side.
  [['gonad-left', -0.24], ['gonad-right', 0.24]].forEach(([gid, x], k) => {
    const m = sac(THREE, 0xcaa892, 0.95, 0.2, { amp: 0.1, freq: 4, rough: 0.5, clear: 0.4, sheen: 0xe0c0a8, seed: 15 + k });
    m.position.set(x, 0.3, -0.55);
    m.rotation.set(0, 0, Math.PI / 2);
    add({
      id: gid, name: gid === 'gonad-left' ? 'Left gonad' : 'Right gonad', layer: 3, system: 'urogenital',
      cuttable: true, detachable: true,
      note: 'One of a pair of elongate gonads (ovary or testis) suspended in the dorsal cavity. They swell enormously in the breeding season and shed to the exterior through their own duct.',
      mesh: m,
    });
  });

  // Vertebral column: a bony rod of vertebrae along the dorsal midline, carrying
  // the neural canal above the centra.
  const spine = tube(THREE, 0xd8d2c4,
    [[0, 1.28, 2.7], [0, 1.32, 1.0], [0, 1.34, -1.0], [0, 1.3, -2.9]], 0.14,
    { rough: 0.7, clear: 0.15, sheen: 0xefe8d8, rad: 8, seg: 46 });
  for (let i = 0; i < 12; i++) {                     // segmented vertebrae
    const zt = 2.5 - i * 0.46;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.055, 6, 12),
      mat(THREE, 0xe4ddce, { rough: 0.7, clear: 0.15 }));
    childMesh(spine, ring, 0, 1.32, zt, 0, Math.PI / 2, 0);
  }
  add({
    id: 'vertebral-column', name: 'Vertebral column', layer: 3, system: 'skeletal',
    cuttable: false, detachable: false,
    note: 'The bony backbone of jointed vertebrae running the length of the fish, protecting the spinal cord in the neural canal above the centra.',
    mesh: spine,
  });

  // Spinal cord: a pale nerve cord in the neural canal, dorsal to the centra.
  const cord = tube(THREE, 0xe4ddcd,
    [[0, 1.52, 2.6], [0, 1.56, 0.8], [0, 1.58, -1.1], [0, 1.54, -2.8]], 0.06,
    { rough: 0.45, clear: 0.4, sheen: 0xf2ecdc, rad: 7, seg: 40 });
  add({
    id: 'spinal-cord', name: 'Spinal cord', layer: 3, system: 'nervous',
    cuttable: true, detachable: false,
    note: 'The pale central nerve cord, running in the neural canal above the vertebrae from the brain to the tail — the fish\'s main nervous highway.',
    mesh: cord,
  });

  // Roll the fish onto its right side so the LEFT flank (the surface the student
  // opens) faces up into the broadside top-down camera, as it lies on the tray.
  group.rotation.z = -Math.PI / 2;
  return { group, parts };
}

/* ---- self-registration (the one allowed top-level block besides the builder) -- */
SPECIMEN_BUILDERS.fish = buildFish;
SPECIMENS.fish = {
  id: 'fish', name: 'Bony fish',
  blurb: 'Open the left flank of a teleost: lift the operculum, count the four gill arches, and find the pearly swim bladder.',
  camera: { pos: [0, 12.8, 4.8], target: [0, -0.1, -0.6] },
  requiresPinning: false,
};
SPECIMEN_OBJECTIVES.fish = [
  { id: 'operculum', text: 'Lift the bony <b>operculum</b> to open the gill chamber.',
    hint: 'Forceps (2). Grip the gill cover and draw it clear of the flank.',
    done: (s) => s.removed.has('operculum') },
  { id: 'gills', text: 'Examine the <b>gills</b> — count the four arches and find the red <b>filaments</b> and white <b>rakers</b>.',
    hint: 'Probe (1) each of the four arches, then the filaments and the rakers.',
    done: (s, seen) => ['gill-arch-1', 'gill-arch-2', 'gill-arch-3', 'gill-arch-4', 'gill-filaments', 'gill-rakers']
      .every((id) => seen.has(id)) },
  { id: 'incise', text: 'Cut a flap of the <b>flank body wall</b>, from behind the operculum along the belly to the vent.',
    hint: 'Scalpel (3). One smooth stroke — do not saw.',
    done: (s) => s.incisions.has('body-wall') && s.incisions.get('body-wall').length > 1.1 },
  { id: 'reflect', text: 'Reflect the flap to expose the muscular <b>body wall (myotomes)</b>.',
    hint: 'Forceps. Grip the cut edge and fold it back.',
    done: (s) => s.opened.has('body-wall') },
  { id: 'open', text: 'Cut and reflect the <b>body-wall muscle</b> to open the abdominal cavity.',
    hint: 'Scalpel, then forceps — a shallow stroke; the viscera lie just beneath.',
    done: (s) => s.opened.has('myotome-wall') },
  { id: 'identify', text: 'Identify the <b>heart</b>, <b>liver</b>, <b>intestine</b> and the silvery <b>swim bladder</b>.',
    hint: 'Probe (1) on each organ to identify it.',
    done: (s, seen) => ['fish-heart', 'liver', 'intestine', 'swim-bladder'].every((id) => seen.has(id)) },
  { id: 'bladder', text: 'Lift the <b>swim bladder</b> clear to reach the dorsal structures.',
    hint: 'Forceps. Draw it out of the roof of the cavity.',
    done: (s) => s.removed.has('swim-bladder') || s.removed.has('liver') },
  { id: 'kidney', text: 'Find the dark <b>kidney</b> against the vertebral column.',
    hint: 'It is retroperitoneal — under the swim bladder, fused along the backbone.',
    done: (s, seen) => seen.has('kidney') },
];
