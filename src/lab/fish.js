/*
 * fish.js — buildFish
 * Concatenated into one module scope with anatomy.js (the shared geometry
 * toolkit, SPECIMENS + buildSpecimen dispatcher). Uses those helpers directly;
 * every local helper below is declared INSIDE buildFish so it cannot collide
 * with another module's top-level names. The only top-level names this file adds
 * are `buildFish` and the single self-registration block at the bottom.
 *
 * A generalized mixed-teleost teaching model, not a species-accurate Labeo/carp.
 * The retained stomach/pyloric caeca and two-chamber bladder combination needs
 * a coherent species revision; see docs/dissection-realism/ANATOMY.md.
 * Dissection sequence: lay the fish on its side, lift
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
    // Enough samples for shallow real scale relief while the cuttable root
    // remains below the existing 9,000-vertex tissue-response ceiling.
    const seg = o.seg || (o.vcol ? 96 : 52), seg2 = o.seg2 || (o.vcol ? 72 : 38);
    const g = new THREE.SphereGeometry(1, seg, seg2);
    displace(THREE, g, o.amp != null ? o.amp : 0.03, 2.2, o.seed || 0);
    const p = g.attributes.position, v = new THREE.Vector3();
    const colors = o.vcol ? new Float32Array(p.count * 3) : null;
    const c = new THREE.Color();
    const dorsal = new THREE.Color(0x28383b);   // dark slate back
    const flank  = new THREE.Color(0x778980);   // muted silver-olive flank
    const belly  = new THREE.Color(0xbfb9a9);   // warm preserved underside
    const line   = new THREE.Color(0x405255);   // faint lateral-line stripe
    const stations = [
      [0, 0.28, 0.30], [0.10, 0.42, 0.44], [0.22, 0.82, 0.80],
      [0.40, 1.00, 1.02], [0.58, 1.13, 1.02], [0.76, 1.14, 1.00],
      [0.90, 1.00, 0.94], [1, 0.90, 0.90],
    ];
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const ux = v.x, uy = v.y, uz = v.z;         // unit coords, pre-scale
      const t = Math.max(0, Math.min(1, (uz + 1) / 2)); // 0 tail .. 1 snout
      // Girth: deepest just behind the head. pow(t,1.15) skews the peak forward.
      // Sphere radii already taper. A second vanishing sine produced a pointed
      // leaf and left the mouth/fin attachments outside the body silhouette.
      let girth = 0.72 + 0.28 * Math.sin(Math.PI * Math.pow(t, 1.15));
      if (t < 0.2) girth *= 0.28 + t * 3.6;        // thin caudal peduncle
      if (t > 0.88) girth *= 1 - (t - 0.88) / 0.12 * 0.15; // rounded snout
      const ydome = uy >= 0 ? 1.06 : 0.99;         // dorsum a touch more arched
      p.setXYZ(i, ux * girth * sx, uy * girth * sy * ydome, uz * sz);
      if (colors) {
        // Exterior-only shoulder, peduncle and blunt cranial profile. Keep the
        // internal myotome geometry exactly as authored in the non-vcol path.
        let k = 1; while (k < stations.length - 1 && t > stations[k][0]) k++;
        const lo = stations[k - 1], hi = stations[k], f = smooth((t - lo[0]) / (hi[0] - lo[0]));
        const wide = lo[1] + (hi[1] - lo[1]) * f, deep = lo[2] + (hi[2] - lo[2]) * f;
        // Gently shorten the extreme snout cap; this is not another vanishing
        // sine that pinches both ends into a flat pointed leaf.
        const z = uz > 0.87 ? 0.87 + (uz - 0.87) * 0.70 : uz;
        p.setXYZ(i, ux * sx * wide * 1.16, uy * sy * deep * ydome, z * sz);
        // Staggered, shallow overlapping scale edges are part of the actual
        // flank, so incision triangles remove them along with the skin. Leave
        // the cranial/opercular region smooth and fade relief at the peduncle.
        // The relief is illustrative, not measured cycloid/ctenoid morphology.
        const wrap = x => x - Math.floor(x);
        const around = wrap(Math.atan2(uy, ux) / (Math.PI * 2) + 0.5) * 18;
        const row = Math.floor(around), across = wrap(around);
        const along = wrap(t * 24 + (row % 2) * 0.5);
        const span = Math.pow(Math.sin(Math.PI * across), 2);
        const edge = Math.exp(-Math.pow((along - (0.50 + 0.19 * Math.cos((across - 0.5) * Math.PI))) / 0.075, 2)) * span;
        const mask = smooth(Math.max(0, Math.min(1, (t - 0.10) / 0.15)))
          * smooth(Math.max(0, Math.min(1, (0.77 - t) / 0.13)));
        const scaleRelief = mask * (0.006 * edge + 0.002 * span * Math.pow(Math.sin(Math.PI * along), 2));
        const radial = Math.hypot(ux, uy) || 1;
        p.setX(i, p.getX(i) + ux / radial * scaleRelief);
        p.setY(i, p.getY(i) + uy / radial * scaleRelief);
        const up = Math.max(0, Math.min(1, (uy + 1) / 2));   // 0 belly .. 1 dorsal
        c.copy(belly).lerp(flank, smooth(Math.min(1, up * 1.7)));
        c.lerp(dorsal, smooth(Math.max(0, (up - 0.56) / 0.44)));
        const ll = Math.exp(-Math.pow((uy - 0.02) / 0.05, 2));  // mid-flank stripe
        c.lerp(line, ll * 0.22);
        const m = vnoise(ux * 11 + 2, uy * 6, uz * 6 + 5);      // faint scale mottle
        c.offsetHSL(0, 0, (m - 0.5) * 0.05);
        c.multiplyScalar(1 - mask * edge * 0.10 + mask * span * 0.035);
        colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
      }
    }
    if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    seal(g);
    return g;
  }

  // Merge same-material ray geometry once at construction; fin detail costs one
  // draw call per fin, not one per ray. No external geometry utility required.
  function finRays(geometries) {
    const positions = [], normals = [], indices = [];
    geometries.forEach(g => {
      const offset = positions.length / 3;
      positions.push(...g.attributes.position.array); normals.push(...g.attributes.normal.array);
      indices.push(...Array.from(g.index.array, index => index + offset)); g.dispose();
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); g.setIndex(indices); seal(g);
    return g;
  }

  // Root and free edge are independently authored curves. A shallow camber and
  // scalloped membrane between curved rays make an actual fin, not a plane fan.
  function fin(name, roots, tips, o = {}) {
    const rows = 8, positions = [], uvs = [], colors = [], indices = [], rayGeometries = [];
    const point = (i, t) => new THREE.Vector3().fromArray(roots[i]).lerp(new THREE.Vector3().fromArray(tips[i]), t)
      .add(new THREE.Vector3((o.camber || 0.055) * Math.sin(Math.PI * t), 0, 0));
    const columns = roots.length * 2 - 1;
    for (let column = 0; column < columns; column++) {
      const i = Math.floor(column / 2), between = column % 2;
      for (let j = 0; j <= rows; j++) {
        const t = j / rows, v = point(i, t);
        if (between) {
          v.lerp(point(i + 1, t), 0.5);
          const anchor = new THREE.Vector3().fromArray(roots[i]).lerp(new THREE.Vector3().fromArray(roots[i + 1]), 0.5);
          // The free membrane edge recedes slightly between supporting rays.
          v.lerp(anchor, 0.045 * Math.pow(t, 6));
        }
        positions.push(...v.toArray()); uvs.push(column / (columns - 1), t);
        const shade = 0.76 + 0.18 * t + 0.035 * Math.sin(column * 0.71 + t * 3);
        colors.push(shade, shade * 0.98, shade * (0.90 + 0.08 * t));
      }
      if (column < columns - 1) for (let j = 0; j < rows; j++) {
        const a = column * (rows + 1) + j, b = a + rows + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    for (let i = 0; i < roots.length; i++) {
      const path = new THREE.CatmullRomCurve3([0, 0.3, 0.65, 1].map(t => point(i, t)));
      const ray = new THREE.TubeGeometry(path, 10, 0.009, 4, false), rp = ray.attributes.position;
      for (let k = 0; k < rp.count; k++) {
        const t = ray.attributes.uv.getX(k), centre = path.getPointAt(t);
        const v = new THREE.Vector3().fromBufferAttribute(rp, k).sub(centre).multiplyScalar(1 - t * 0.65).add(centre);
        rp.setXYZ(k, v.x, v.y, v.z);
      }
      seal(ray); rayGeometries.push(ray);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.setIndex(indices); seal(g);
    const m = new THREE.Mesh(g, mat(THREE, 0x89989a, { vcol: true, trans: true, opacity: 0.74,
      rough: 0.48, clear: 0.35, side: THREE.DoubleSide, transmission: 0.20, thickness: 0.06, sheen: 0xcbd1cb }));
    m.name = name; m.userData.exteriorTissue = 'fin'; m.userData.exteriorDetail = 'fin';
    m.userData.finRoots = roots.map(p => p.slice()); m.material.depthWrite = false;
    const rays = new THREE.Mesh(finRays(rayGeometries), mat(THREE, 0x72817d, { rough: 0.58, clear: 0.28 }));
    rays.name = name + '-rays'; rays.userData.exteriorDetail = 'fin-ray'; m.add(rays);
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
      sheen: 0xd6dcc8, sheenAmt: 0.7, transmission: 0, specular: 0.55 }));

  // Head detail — a large lateral eye, a nostril, and the inferior mouth with the
  // fleshy lips typical of a bottom-feeding cyprinid. All decorative children.
  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16),
    mat(THREE, 0xa39d76, { rough: 0.26, clear: 0.9, clearRough: 0.14, sheen: 0xd4d7bf }));
  iris.scale.set(0.52, 0.9, 0.9); iris.userData.exteriorDetail = 'eye';
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12),
    mat(THREE, 0x080a06, { rough: 0.18, clear: 1, clearRough: 0.08 }));
  childMesh(iris, pupil, -0.1, 0, 0);
  childMesh(skin, iris, -0.42, 0.42, 2.55);
  // Both flanks must remain coherent when the student rotates the specimen.
  // Mirror only the existing external detail; anatomy and pick targets stay put.
  const farIris = iris.clone(true);
  farIris.position.x = 0.42;
  farIris.children[0].position.x = 0.1;
  skin.add(farIris);
  const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat(THREE, 0x15170f, { rough: 0.6 }));
  childMesh(skin, nostril, -0.34, 0.5, 2.95);
  const farNostril = nostril.clone(); farNostril.position.x = 0.34; skin.add(farNostril);
  // Subterminal mouth follows the snout instead of a large pink hook off its tip.
  const lip = tube(THREE, 0x777c70,
    [[-0.23, -0.19, 3.10], [-0.20, -0.27, 3.13], [-0.07, -0.31, 3.14], [0.10, -0.28, 3.12]],
    0.025, { rough: 0.48, clear: 0.4, rad: 5, seg: 14 });
  lip.name = 'subterminal-lip'; skin.add(lip);

  // Seat roots on the actual shaped skin. These queries run once at build time,
  // before any child fins exist; no frame-time raycast or detached insertions.
  const surfacePoint = (origin, direction) => {
    const hit = new THREE.Raycaster(new THREE.Vector3(...origin), new THREE.Vector3(...direction)).intersectObject(skin, false)[0];
    return hit ? hit.point.toArray() : [0, 0, origin[2]];
  };
  for (const s of [-1, 1]) {
    for (const [name, y, z, length, spread] of [['pectoral', -0.45, 1.18, 1.05, 0.72], ['pelvic', -1.00, -0.15, 0.68, 0.47]]) {
      const root = surfacePoint([s * 2, y, z], [-s, 0, 0]), roots = [], tips = [];
      for (let i = 0; i < 8; i++) {
        const t = i / 7;
        roots.push([root[0], root[1] + (t - 0.5) * 0.08, root[2] - t * 0.10]);
        // The tray-side paired fins lie against the right flank instead of
        // acting as rigid stilts that lift the entire fish off its support.
        const tipX = s < 0 ? root[0] - (0.16 + 0.18 * Math.sin(t * Math.PI))
          : Math.min(root[0] + 0.025, skinGeo.boundingBox.max.x - 0.025);
        tips.push([tipX, y - t * spread,
          z - length * (0.48 + 0.52 * Math.sin(t * Math.PI * 0.85))]);
      }
      skin.add(fin(name + (s < 0 ? '-left' : '-right'), roots, tips, { camber: s < 0 ? -0.08 : -0.025 }));
    }
  }
  for (const [name, sign, start, end, height, nr] of [['dorsal-fin', 1, 1.10, -1.65, 0.72, 14], ['anal-fin', -1, -1.00, -2.45, 0.56, 9]]) {
    const roots = [], tips = [];
    for (let i = 0; i < nr; i++) {
      const t = i / (nr - 1), z = start + (end - start) * t;
      const root = surfacePoint([0, sign * 4, z], [0, -sign, 0]); roots.push(root);
      tips.push([0.025 * Math.sin(t * Math.PI), root[1] + sign * height * Math.pow(Math.sin(Math.PI * t), 0.65),
        z - 0.28 * Math.sin(Math.PI * t)]);
    }
    skin.add(fin(name, roots, tips));
  }
  // A continuous forked caudal fan, split only at the center seam for the two
  // lobes. Both share an embedded peduncle root, not two floating paper triangles.
  for (const s of [-1, 1]) {
    const roots = [], tips = [];
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      roots.push([0, s * t * 0.12, 0]);
      tips.push([0.018 * Math.sin(t * Math.PI), s * t * 1.08, -0.60 - 0.90 * smooth(t)]);
    }
    const caudal = fin(s > 0 ? 'caudal-upper' : 'caudal-lower', roots, tips, { camber: s * 0.045 });
    childMesh(skin, caudal, 0, 0, -3.12);
  }

  add({
    id: 'body-wall', name: 'Skin & flank body wall', layer: 0, system: 'integument',
    cuttable: true, detachable: false,
    note: 'Silver-olive above shading to a pale belly, covered in overlapping scales along a faint lateral line. Cut a flap from behind the operculum along the belly to the vent, then reflect it to open the cavity.',
    mesh: skin,
    incision: [[-0.5, -0.9, 1.2], [-0.52, -1.18, 0.3], [-0.52, -1.22, -0.8],
               [-0.5, -1.05, -2.1], [-0.46, -0.25, -2.3]],
  });

  // The operculum is a fitted bony cover, not a domed circular medallion. Keep
  // the original part transform while conforming its closed, thin surface to
  // the actual left flank; the outer face stays just proud enough to be picked.
  const opGeo = new THREE.SphereGeometry(1, 40, 28);
  const operculum = new THREE.Mesh(opGeo,
    mat(THREE, 0xffffff, { vcol: true, rough: 0.48, clear: 0.32, clearRough: 0.35,
      sheen: 0xdfe6da, sheenAmt: 0.45, transmission: 0, specular: 0.55 }));
  operculum.position.set(-0.62, 0.05, 1.62);
  operculum.rotation.set(0, 0.12, 0.05);
  operculum.updateMatrix(); const opInverse = operculum.matrix.clone().invert();
  const opRay = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(1, 0, 0)), opSamples = new Map();
  const flankAt = (y, z) => {
    const key = y.toFixed(5) + ':' + z.toFixed(5);
    if (opSamples.has(key)) return opSamples.get(key);
    opRay.ray.origin.set(-2, y, z);
    const hit = opRay.intersectObject(skin, false)[0];
    const color = new THREE.Color(0xa6b1b5);
    if (hit) {
      const c = skinGeo.attributes.color;
      color.setRGB((c.getX(hit.face.a) + c.getX(hit.face.b) + c.getX(hit.face.c)) / 3,
        (c.getY(hit.face.a) + c.getY(hit.face.b) + c.getY(hit.face.c)) / 3,
        (c.getZ(hit.face.a) + c.getZ(hit.face.b) + c.getZ(hit.face.c)) / 3);
    }
    const sample = { x: hit ? hit.point.x : -0.40, color }; opSamples.set(key, sample); return sample;
  };
  const opPositions = opGeo.attributes.position, opColors = [], opPoint = new THREE.Vector3();
  for (let i = 0; i < opPositions.count; i++) {
    opPoint.fromBufferAttribute(opPositions, i);
    const y = 0.035 + opPoint.y * (1.00 - 0.16 * Math.max(0, opPoint.z));
    const z = 1.68 + opPoint.z * 0.72, sample = flankAt(y, z);
    opPoint.set(sample.x - 0.012 + opPoint.x * 0.025, y, z).applyMatrix4(opInverse);
    opPositions.setXYZ(i, opPoint.x, opPoint.y, opPoint.z);
    opColors.push(sample.color.r, sample.color.g, sample.color.b);
  }
  opGeo.setAttribute('color', new THREE.Float32BufferAttribute(opColors, 3)); seal(opGeo);
  operculum.userData.exteriorDetail = 'conforming-operculum';
  // The free posterior edge is a restrained crescent; no circular raised rim.
  const seamPoints = [];
  for (let i = 0; i <= 18; i++) {
    const angle = i / 18 * Math.PI, y = 0.035 + Math.cos(angle), z = 1.68 - 0.72 * Math.sin(angle);
    seamPoints.push(new THREE.Vector3(flankAt(y, z).x - 0.022, y, z).applyMatrix4(opInverse).toArray());
  }
  const seam = tube(THREE, 0x687674, seamPoints, 0.006, { rough: 0.58, clear: 0.25, rad: 4, seg: 28 });
  seam.name = 'opercular-margin'; seam.userData.exteriorDetail = 'opercular-seam'; operculum.add(seam);
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
  // sac() is already z-long. Keep every chamber dorsal and extend toward -z,
  // the tail; the former rotated -x offset put the second chamber in the belly.
  const sbPost = sac(THREE, 0xd6dce0, 1.4, 0.5, { ...sbOpts, seed: 13 });
  childMesh(swimBladder, sbPost, 0, 0, -2.05);        // posterior chamber, larger
  const sbNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.4, 14),
    mat(THREE, 0xd2d8dc, sbOpts));
  childMesh(swimBladder, sbNeck, 0, 0, -0.825, Math.PI / 2, 0, 0);
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
    hint: 'Forceps (3). Grip the gill cover and draw it clear of the flank.',
    done: (s) => s.removed.has('operculum') },
  { id: 'gills', text: 'Examine the <b>gills</b> — count the four arches and find the red <b>filaments</b> and white <b>rakers</b>.',
    hint: 'Probe (1) each of the four arches, then the filaments and the rakers.',
    done: (s, seen) => ['gill-arch-1', 'gill-arch-2', 'gill-arch-3', 'gill-arch-4', 'gill-filaments', 'gill-rakers']
      .every((id) => seen.has(id)) },
  { id: 'incise', text: 'Cut a flap of the <b>flank body wall</b>, from behind the operculum along the belly to the vent.',
    hint: 'Scalpel (2). One smooth stroke — do not saw.',
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
