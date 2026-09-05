/*
 * frog.js — buildFrog
 * Concatenated into one module scope with anatomy.js (the shared geometry
 * toolkit, SPECIMENS and buildSpecimen dispatcher). Uses those helpers directly;
 * every local helper below is declared INSIDE buildFrog so it cannot collide
 * with another module's top-level names.
 *
 * Anatomy grounded in standard amphibian (Rana) dissection references — see the
 * builder's return note. Coordinate convention for the un-rotated group:
 *   +z = snout (anterior)      -z = vent (posterior)
 *   +y = ventral (the cavity opens here; viscera sit toward +y)
 *   -y = dorsal (kidneys, aorta, spine — retroperitoneal, on the roof)
 *   -x = the animal's LEFT     +x = the animal's RIGHT
 * The whole group is finally laid supine (ventral up) on the tray.
 */

function buildFrog(THREE) {
  const group = new THREE.Group();
  const parts = [];

  const add = (p) => {
    p.mesh.name = p.id;
    p.mesh.userData.partId = p.id;
    p.mesh.userData.baseColor = p.mesh.material.color.clone();
    if (p.mesh.geometry) {
      p.mesh.geometry.computeBoundingSphere();
      p.mesh.geometry.computeBoundingBox();
    }
    if (p.layer > 0) p.mesh.visible = false;
    group.add(p.mesh);
    parts.push(p);
    return p;
  };

  /* Original authored external specimen, not a scanned or clinical reconstruction.
   * Rana-type adult proportions; sex is unspecified in the exterior. The ventral
   * surface faces +Y already, so this group must never receive a "supine" rotation.
   * Profile stations control actual anatomy instead of shrinking an ellipsoid twice. */
  const authoredLimbs = [];
  const pinTargets = [];
  const tray = { y: -1.22, minX: -5.8, maxX: 5.8, minZ: -6.9, maxZ: 6.9 };
  const skinOptions = {
    tissue: "skin",
    vcol: true,
    rough: 0.66,
    clear: 0.24,
    clearRough: 0.62,
    sheen: 0x89916a,
    sheenAmt: 0.16,
    transmission: 0.025,
    specular: 0.42,
  };
  const outerMaterial = mat(THREE, 0xffffff, skinOptions);
  if (outerMaterial.normalScale) outerMaterial.normalScale.set(0.18, 0.18);

  function profileValue(stations, z, column) {
    let i = 0;
    while (i < stations.length - 2 && z > stations[i + 1][0]) i++;
    const a = stations[i],
      b = stations[i + 1];
    const t = Math.max(0, Math.min(1, (z - a[0]) / (b[0] - a[0])));
    const m0 =
      (b[column] - stations[Math.max(0, i - 1)][column]) /
      (b[0] - stations[Math.max(0, i - 1)][0]);
    const m1 =
      (stations[Math.min(stations.length - 1, i + 2)][column] - a[column]) /
      (stations[Math.min(stations.length - 1, i + 2)][0] - a[0]);
    const span = b[0] - a[0],
      t2 = t * t,
      t3 = t2 * t;
    return Math.max(
      0.001,
      (2 * t3 - 3 * t2 + 1) * a[column] +
        (t3 - 2 * t2 + t) * span * m0 +
        (-2 * t3 + 3 * t2) * b[column] +
        (t3 - t2) * span * m1,
    );
  }

  function tintGeometry(geo, bellyBias) {
    const p = geo.attributes.position,
      n = geo.attributes.normal;
    const colors = new Float32Array(p.count * 3),
      c = new THREE.Color();
    const olive = new THREE.Color(0x596746),
      flank = new THREE.Color(0x838b60);
    const belly = new THREE.Color(0xb8b796),
      spot = new THREE.Color(0x465135);
    for (let i = 0; i < p.count; i++) {
      const ny = n ? n.getY(i) : 0;
      const ventral = smooth(Math.max(0, Math.min(1, (ny + 0.12) / 1.12)));
      const noise = vnoise(
        p.getX(i) * 3.4 + 4.2,
        p.getY(i) * 3.4 + 7.1,
        p.getZ(i) * 3.4 + 2.6,
      );
      c.copy(olive).lerp(flank, 0.33 + ventral * 0.28);
      c.lerp(belly, Math.min(1, ventral * (bellyBias || 1)));
      // A pale abdominal field grades into retained flank pigmentation; the
      // distal limbs are gently darker than the body, as on a prepared specimen.
      if (bellyBias === 1) {
        const flankWeight = Math.max(
          0,
          Math.min(0.36, (Math.abs(p.getX(i)) - 0.82) * 0.31),
        );
        c.lerp(olive, flankWeight * (0.78 + noise * 0.22));
      } else c.lerp(flank, 0.1 + noise * 0.1);
      if (ventral < 0.65 && noise > 0.57)
        c.lerp(spot, Math.min(0.48, (noise - 0.57) * 1.7) * (1 - ventral));
      if (noise > 0.54)
        c.lerp(spot, (noise - 0.54) * 0.62 * (0.34 + 0.66 * (1 - ventral)));
      const variation =
        0.93 +
        0.13 * vnoise(p.getX(i) * 11, p.getY(i) * 11 + 5, p.getZ(i) * 11);
      colors[i * 3] = c.r * variation;
      colors[i * 3 + 1] = c.g * variation;
      colors[i * 3 + 2] = c.b * variation;
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return geo;
  }

  function frogBody(sx, sy, sz, o) {
    o = o || {};
    // z, half-width, ventral height, dorsal depth. Broad jaw joins a real trunk.
    const stations = [
      [-3.76, 0.025, 0.025, 0.025],
      [-3.55, 0.62, 0.26, 0.33],
      [-3.15, 1.25, 0.46, 0.61],
      [-2.45, 1.77, 0.66, 0.91],
      [-1.1, 2.13, 0.8, 1.2],
      [0.35, 2.07, 0.78, 1.12],
      [1.45, 1.8, 0.61, 0.89],
      [2.0, 1.72, 0.43, 0.65],
      [2.7, 1.84, 0.35, 0.51],
      [3.3, 1.76, 0.28, 0.4],
      [3.9, 1.3, 0.2, 0.3],
      [4.32, 0.65, 0.13, 0.2],
      [4.55, 0.025, 0.025, 0.025],
    ];
    const rows = 88,
      cols = 64,
      pos = [],
      uv = [],
      idx = [];
    const scaleX = sx / 2.34,
      scaleY = sy / 1.42,
      scaleZ = sz / 4.55;
    for (let row = 0; row <= rows; row++) {
      const z = -3.76 + (row / rows) * 8.31;
      const width = profileValue(stations, z, 1);
      const top = profileValue(stations, z, 2),
        bottom = profileValue(stations, z, 3);
      for (let col = 0; col <= cols; col++) {
        const angle = (col / cols) * Math.PI * 2,
          sn = Math.sin(angle),
          cs = Math.cos(angle);
        const grain =
          1 + (vnoise(sn * width * 4 + 3, cs * 4 + 6, z * 4) - 0.5) * 0.016;
        const throat =
          cs > 0
            ? 0.025 *
              Math.exp(-Math.pow((z - 2.8) / 0.45, 2)) *
              Math.cos(angle * 3)
            : 0;
        const x = sn * width * scaleX * grain;
        const midline =
          cs > 0
            ? 0.014 *
              Math.exp(-Math.pow(x / 0.19, 2)) *
              Math.exp(-Math.pow((z + 0.5) / 2.15, 4))
            : 0;
        const y = (cs * (cs >= 0 ? top : bottom) + throat - midline) * scaleY;
        pos.push(x, Math.max(-1.205 * scaleY, y), z * scaleZ);
        uv.push(col / cols, row / rows);
      }
    }
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const a = row * (cols + 1) + col,
          b = a + cols + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    seal(geo);
    if (o.vcol) tintGeometry(geo, 1);
    geo.userData.authoredFrogSurface = true;
    return geo;
  }

  /* --- layer 0: skin and external landmarks ----------------------------- */
  const skinGeo = frogBody(2.34, 1.42, 4.55, { vcol: true });
  const skin = new THREE.Mesh(skinGeo, outerMaterial);
  skin.userData.frogAuthored = true;
  const landmarkMaterial = mat(THREE, 0x575d3c, {
    tissue: "skin",
    rough: 0.77,
    clear: 0.12,
    transmission: 0,
    noTex: true,
  });
  const eyeMaterial = mat(THREE, 0x8d7742, {
    rough: 0.45,
    clear: 0.3,
    transmission: 0,
    noTex: true,
  });
  const pupilMaterial = mat(THREE, 0x151c15, {
    rough: 0.3,
    clear: 0.3,
    transmission: 0,
    noTex: true,
  });

  function detail(mesh, name, x, y, z, rx, ry, rz) {
    mesh.name = name;
    childMesh(skin, mesh, x, y, z, rx, ry, rz);
    return mesh;
  }
  for (const side of [-1, 1]) {
    // Eyes are small lateral domes on the dorsal head, not forward-facing spheres.
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      eyeMaterial,
    );
    eye.scale.set(0.19, 0.13, 0.22);
    detail(eye, side < 0 ? "left-eye" : "right-eye", side * 1.74, -0.1, 3.3);
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(1, 14, 10),
      pupilMaterial,
    );
    pupil.scale.set(0.035, 0.07, 0.11);
    detail(
      pupil,
      side < 0 ? "left-pupil" : "right-pupil",
      side * 1.895,
      -0.09,
      3.32,
    );
    const tym = new THREE.Mesh(
      new THREE.CircleGeometry(0.19, 24),
      landmarkMaterial,
    );
    detail(
      tym,
      side < 0 ? "left-tympanum" : "right-tympanum",
      side * 1.84,
      -0.06,
      2.68,
      0,
      (side * Math.PI) / 2,
      0,
    );
    const nare = new THREE.Mesh(
      new THREE.SphereGeometry(0.036, 10, 8),
      pupilMaterial,
    );
    detail(
      nare,
      side < 0 ? "left-naris" : "right-naris",
      side * 0.29,
      -0.08,
      4.43,
    );
  }
  // The mouth follows the mandibular edge. Throat-fold relief is in the skin
  // surface itself; a drawn line across the jaw would suggest a cartoon mouth.
  const mouth = tube(
    THREE,
    0x686246,
    [
      [-1.4, 0.1, 3.65],
      [-0.88, 0.16, 4.06],
      [0, 0.14, 4.38],
      [0.88, 0.16, 4.06],
      [1.4, 0.1, 3.65],
    ],
    0.019,
    { rough: 0.85, clear: 0, transmission: 0, noTex: true, seg: 44, rad: 6 },
  );
  mouth.name = "mandibular-margin";
  skin.add(mouth);
  const vent = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    landmarkMaterial,
  );
  vent.scale.set(0.12, 0.018, 0.055);
  detail(vent, "external-cloacal-region", 0, 0.19, -3.6);
  add({
    id: "skin",
    name: "Skin",
    layer: 0,
    system: "integument",
    cuttable: true,
    detachable: false,
    note: "A preserved Rana-type frog, ventral side upward. Locate the broad lower jaw, throat, midline abdomen and posterior cloacal region before pinning the distal limbs.",
    mesh: skin,
    incision: [
      [0, 0.5, 2.1],
      [0, 0.76, 1.1],
      [0, 0.81, -0.4],
      [0, 0.67, -2.3],
      [0, 0.44, -3.4],
    ],
  });

  /* Each limb is ONE pickable geometry: a varying-radius continuous loft, palm,
   * connected curved digits and thin hind-foot webbing. No floating child feet.
   * Every vertex shares the same bounded anchor deformation, with a fixed root. */
  function combineGeometry(geometries) {
    const positions = [],
      normals = [],
      uvs = [],
      indices = [];
    let offset = 0;
    for (const geo of geometries) {
      const p = geo.attributes.position,
        n = geo.attributes.normal,
        uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        positions.push(p.getX(i), p.getY(i), p.getZ(i));
        normals.push(n ? n.getX(i) : 0, n ? n.getY(i) : 1, n ? n.getZ(i) : 0);
        uvs.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
      }
      if (geo.index)
        for (let i = 0; i < geo.index.count; i++)
          indices.push(geo.index.getX(i) + offset);
      else for (let i = 0; i < p.count; i++) indices.push(i + offset);
      offset += p.count;
      geo.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    seal(geo);
    tintGeometry(geo, 0.88);
    return geo;
  }
  function limbTube(points, radii, segments, radial) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "centripetal",
    );
    const geo = new THREE.TubeGeometry(curve, segments, 1, radial, false);
    const p = geo.attributes.position,
      v = new THREE.Vector3(),
      center = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const t = Math.floor(i / (radial + 1)) / segments;
      const f = t * (radii.length - 1),
        at = Math.min(radii.length - 2, Math.floor(f));
      const radius = radii[at] + (radii[at + 1] - radii[at]) * smooth(f - at);
      curve.getPointAt(t, center);
      v.fromBufferAttribute(p, i)
        .sub(center)
        .multiplyScalar(radius)
        .add(center);
      // Ventral-up specimen: no limb surface may pass through the tray liner.
      p.setXYZ(i, v.x, Math.max(tray.y + 0.018, v.y), v.z);
    }
    seal(geo);
    return { geo, curve };
  }
  function ellipsoidAt(center, scale) {
    const geo = new THREE.SphereGeometry(1, 24, 16);
    geo.scale(...scale);
    geo.translate(...center);
    seal(geo);
    return geo;
  }
  function limb(lid, name, side, hind) {
    const palm = hind ? [side * 3.58, -1.07, -4.6] : [side * 3.41, -1.07, 2.7];
    const path = hind
      ? [
          [side * 1.3, -0.26, -2.25],
          [side * 2.2, -0.55, -1.77],
          [side * 3.18, -0.77, -1.95],
          [side * 3.12, -0.97, -2.72],
          [side * 2.75, -1.04, -3.65],
          [side * 3.22, -1.06, -4.26],
          palm,
        ]
      : [
          [side * 1.42, -0.12, 1.92],
          [side * 2.15, -0.49, 1.67],
          [side * 2.66, -0.85, 1.63],
          [side * 2.93, -1.0, 2.14],
          palm,
        ];
    const radii = hind
      ? [0.54, 0.64, 0.57, 0.37, 0.25, 0.16, 0.18]
      : [0.38, 0.34, 0.25, 0.17, 0.16];
    const loft = limbTube(path, radii, hind ? 72 : 52, 16);
    const geos = [
      loft.geo,
      ellipsoidAt(palm, hind ? [0.27, 0.13, 0.4] : [0.26, 0.12, 0.25]),
    ];
    const digitPaths = [];
    const digits = hind ? 5 : 4;
    const lengths = hind
      ? [0.63, 0.91, 1.15, 1.25, 0.92]
      : [0.37, 0.56, 0.63, 0.47];
    for (let i = 0; i < digits; i++) {
      const spread = (i - (digits - 1) / 2) / (digits - 1);
      const start = [
        palm[0] + side * spread * (hind ? 0.34 : 0.31),
        -1.065,
        palm[2] + (hind ? -0.25 : 0.12),
      ];
      const dx = side * (0.22 + spread * (hind ? 0.7 : 0.7));
      const dz = (hind ? -1 : 1) * lengths[i];
      const points = [
        start,
        [start[0] + dx * 0.36, -1.09, start[2] + dz * 0.34],
        [start[0] + dx * 0.78, -1.105, start[2] + dz * 0.77],
        [start[0] + dx, -1.11, start[2] + dz],
      ];
      const digit = limbTube(
        points,
        hind ? [0.062, 0.052, 0.041, 0.026] : [0.053, 0.043, 0.033, 0.025],
        18,
        8,
      );
      geos.push(
        digit.geo,
        ellipsoidAt(points[3], [hind ? 0.032 : 0.03, 0.029, 0.036]),
      );
      digitPaths.push(points);
    }
    if (hind) {
      // Webbing stops before the toe tips. It is attached to adjacent proximal digits.
      const webPos = [],
        webIndex = [];
      for (let i = 0; i < digitPaths.length - 1; i++) {
        const a = digitPaths[i],
          b = digitPaths[i + 1],
          base = webPos.length / 3;
        const mid = [
          (a[2][0] + b[2][0]) / 2,
          -1.108,
          (a[2][2] + b[2][2]) / 2 + 0.12,
        ];
        for (const p of [a[0], a[2], mid, b[2], b[0]])
          webPos.push(p[0], p[1] - 0.015, p[2]);
        webIndex.push(
          base,
          base + 1,
          base + 2,
          base,
          base + 2,
          base + 4,
          base + 2,
          base + 3,
          base + 4,
        );
      }
      const web = new THREE.BufferGeometry();
      web.setAttribute("position", new THREE.Float32BufferAttribute(webPos, 3));
      web.setIndex(webIndex);
      seal(web);
      geos.push(web);
    }
    const geo = combineGeometry(geos),
      mesh = new THREE.Mesh(geo, outerMaterial.clone());
    mesh.material.side = THREE.DoubleSide;
    mesh.userData.frogAuthored = true;
    mesh.userData.authoredPinLimb = true;
    mesh.userData.jointRoot = path[0].slice();
    mesh.userData.digitCount = digits;
    const rest = new Float32Array(geo.attributes.position.array),
      weights = new Float32Array(rest.length / 3);
    const samples = loft.curve.getSpacedPoints(60);
    // Nearest centreline sample assigns a stable, authored blend weight. The
    // proximal 16 percent is completely fixed; distal digits translate together.
    for (let i = 0; i < weights.length; i++) {
      let best = Infinity,
        nearest = 0;
      for (let j = 0; j < samples.length; j++) {
        const p = samples[j],
          dx = rest[i * 3] - p.x,
          dy = rest[i * 3 + 1] - p.y,
          dz = rest[i * 3 + 2] - p.z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < best) {
          best = d;
          nearest = j / (samples.length - 1);
        }
      }
      weights[i] = smooth(Math.max(0, Math.min(1, (nearest - 0.16) / 0.72)));
    }
    const center = hind
      ? [side * 3.7, tray.y, -4.72]
      : [side * 3.53, tray.y, 2.82];
    pinTargets.push({
      id: lid,
      partId: lid,
      label: name,
      center,
      radius: hind ? 0.55 : 0.46,
      rest: [palm[0], tray.y, palm[2]],
    });
    authoredLimbs.push({
      id: lid,
      mesh,
      rest,
      weights,
      palm,
      current: new THREE.Vector3(),
      desired: new THREE.Vector3(),
    });
    return add({
      id: lid,
      name,
      layer: 0,
      system: "muscular",
      cuttable: false,
      detachable: false,
      note: hind
        ? "A muscular thigh, folded shank and elongated five-toed webbed foot. Secure the distal foot away from the ankle and knee."
        : "A short upper arm, flexed forearm and four separate fingers. Secure the hand away from the wrist and elbow.",
      mesh,
    });
  }
  limb("forelimb-left", "Left forelimb", -1, false);
  limb("forelimb-right", "Right forelimb", 1, false);
  limb("hindlimb-left", "Left hindlimb", -1, true);
  limb("hindlimb-right", "Right hindlimb", 1, true);

  const reducedMotionQuery =
    typeof matchMedia === "function"
      ? matchMedia("(prefers-reduced-motion: reduce)")
      : null;
  const pinning = {
    targets: pinTargets,
    tray,
    setAnchor(id, point) {
      const limb = authoredLimbs.find((l) => l.id === id);
      if (!limb) return false;
      if (point == null) {
        limb.desired.set(0, 0, 0);
        return true;
      }
      const x = Array.isArray(point) ? point[0] : point.x;
      const y = Array.isArray(point) ? point[1] : point.y;
      const z = Array.isArray(point) ? point[2] : point.z;
      if (![x, y, z].every(Number.isFinite)) return false;
      limb.desired.set(
        x - limb.palm[0],
        Math.max(-0.035, Math.min(0.035, y + 0.15 - limb.palm[1])),
        z - limb.palm[2],
      );
      if (limb.desired.length() > 0.85) limb.desired.setLength(0.85);
      return true;
    },
    update(dtMs) {
      const alpha =
        reducedMotionQuery && reducedMotionQuery.matches
          ? 1
          : 1 - Math.exp(-Math.max(0, Math.min(64, dtMs || 16)) / 100);
      for (const limb of authoredLimbs) {
        if (limb.current.distanceToSquared(limb.desired) < 0.00000001) continue;
        limb.current.lerp(limb.desired, alpha);
        if (limb.current.distanceToSquared(limb.desired) < 0.00000001)
          limb.current.copy(limb.desired);
        const p = limb.mesh.geometry.attributes.position,
          a = p.array,
          d = limb.current;
        for (let i = 0; i < limb.weights.length; i++) {
          const w = limb.weights[i];
          a[i * 3] = limb.rest[i * 3] + d.x * w;
          a[i * 3 + 1] = Math.max(
            tray.y + 0.016,
            limb.rest[i * 3 + 1] + d.y * w,
          );
          a[i * 3 + 2] = limb.rest[i * 3 + 2] + d.z * w;
        }
        p.needsUpdate = true;
        limb.mesh.geometry.computeVertexNormals();
        limb.mesh.geometry.computeBoundingSphere();
        limb.mesh.geometry.computeBoundingBox();
      }
    },
    dispose() {
      for (const limb of authoredLimbs) {
        limb.mesh.geometry.attributes.position.array.set(limb.rest);
        limb.mesh.geometry.attributes.position.needsUpdate = true;
        limb.mesh.geometry.computeVertexNormals();
        limb.mesh.geometry.computeBoundingSphere();
        limb.current.set(0, 0, 0);
        limb.desired.set(0, 0, 0);
      }
    },
  };

  /* --- layer 1: abdominal muscle wall ----------------------------------- */
  const wallGeo = frogBody(2.14, 1.28, 4.32, { amp: 0.04, seed: 4 });
  const wall = new THREE.Mesh(
    wallGeo,
    mat(THREE, 0xb9756a, {
      rough: 0.72,
      clear: 0.22,
      sheen: 0xd88f7f,
      sheenAmt: 0.6,
    }),
  );
  // linea alba: a pale tendinous seam down the ventral midline, as a child strip
  const linea = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 5.6, 1, 20),
    mat(THREE, 0xd8b7a4, { rough: 0.7, side: THREE.DoubleSide }),
  );
  {
    const lp = linea.geometry.attributes.position,
      lv = new THREE.Vector3();
    for (let i = 0; i < lp.count; i++) {
      lv.fromBufferAttribute(lp, i);
      const t = lv.y / 5.6 + 0.5;
      lp.setXYZ(i, lv.x, lv.y, Math.sin(t * Math.PI) * 0.86 + 0.02); // hug the belly dome
    }
    seal(linea.geometry);
  }
  childMesh(wall, linea, 0, 0.9, 0, 0, 0, Math.PI / 2);
  add({
    id: "muscle-wall",
    name: "Abdominal muscle wall",
    layer: 1,
    system: "muscular",
    cuttable: true,
    detachable: false,
    note: "Thin sheet of body-wall muscle. Cut in the midline along the linea alba — but the ventral abdominal vein runs right down it.",
    mesh: wall,
    incision: [
      [0, 0.86, 3.0],
      [0, 0.9, 1.4],
      [0, 0.9, -0.6],
      [0, 0.82, -2.4],
    ],
  });

  // The documented classic first-attempt failure: cutting this blind. It runs in
  // the midline of the ventral body wall, draining into the liver.
  const vav = tube(
    THREE,
    0x3f5fa8,
    [
      [0, 0.82, 3.0],
      [0, 0.9, 1.2],
      [0, 0.9, -0.8],
      [0, 0.8, -2.5],
    ],
    0.07,
    { rough: 0.4, clear: 0.6, sheen: 0x6f8fd0, rad: 8, seg: 44 },
  );
  add({
    id: "ventral-abdominal-vein",
    name: "Ventral abdominal vein",
    layer: 1,
    system: "circulatory",
    cuttable: true,
    detachable: false,
    note: "Runs in the midline of the muscle wall, on its inner face. Cutting it blind on the first stroke is the classic first-attempt failure.",
    mesh: vav,
  });

  /* --- layer 2: viscera -------------------------------------------------- */
  // The liver DOMINATES the anterior cavity and hides the stomach and duodenum —
  // that is the teaching point. Three lobes: a large right lobe, a left lobe, and
  // a central median lobe that overlaps the heart. Dark red-brown, glossy capsule.
  const liverMat = {
    rough: 0.4,
    clear: 0.74,
    clearRough: 0.26,
    sheen: 0x9a4b45,
    sheenAmt: 0.72,
  };
  const liverLobes = [
    // id, name, colour, x, y, z, len, wide, thick, yaw, seed
    [
      "liver-right",
      "Liver — right lobe",
      0x6c2822,
      1.02,
      0.3,
      0.95,
      1.85,
      1.12,
      0.42,
      0.34,
      0,
    ],
    [
      "liver-left",
      "Liver — left anterior lobe",
      0x72302a,
      -1.0,
      0.3,
      1.0,
      1.6,
      1.02,
      0.42,
      -0.3,
      1,
    ],
    [
      "liver-median",
      "Liver — left posterior lobe",
      0x7c362c,
      -0.62,
      0.28,
      0.65,
      1.2,
      0.86,
      0.38,
      -0.34,
      2,
    ],
  ];
  liverLobes.forEach(([lid, nm, col, x, y, z, len, wide, thick, yaw, seed]) => {
    const m = lobe(THREE, col, len, wide, thick, {
      ...liverMat,
      seed: seed * 3,
    });
    m.position.set(x, y, z);
    m.rotation.set(-0.16, yaw, 0); // free tip lifts toward the snout
    add({
      id: lid,
      name: nm,
      layer: 2,
      system: "digestive",
      cuttable: true,
      detachable: true,
      note: "Dark red-brown with a wet capsule. Three lobes fill the front of the cavity; lift them to reveal the stomach and gall bladder beneath.",
      mesh: m,
    });
  });

  // Gall bladder: a small green translucent sac on the UNDERSIDE of the liver,
  // between the right and median lobes. Only seen when the liver is lifted, so it
  // sits deeper (lower y) and further back than the lobes that cover it.
  const gall = organ(THREE, 0x2f7d3e, 0.19, 0.23, 0.29, {
    amp: 0.05,
    rough: 0.3,
    clear: 0.85,
    trans: 0.4,
    thickness: 0.5,
    atten: 0x3f9a52,
    sheen: 0x8fe0a0,
  });
  gall.position.set(0.42, 0.02, 1.05);
  // bile/cystic duct running up between the lobes toward the gut
  const gduct = tube(
    THREE,
    0x3f7a4a,
    [
      [0, 0.04, 0.12],
      [-0.06, 0.14, -0.32],
      [-0.14, 0.2, -0.7],
    ],
    0.038,
    { rough: 0.4, rad: 6, seg: 12 },
  );
  gall.add(gduct);
  add({
    id: "gall-bladder",
    name: "Gall bladder",
    layer: 2,
    system: "digestive",
    cuttable: true,
    detachable: true,
    note: "A small green translucent sac tucked under the liver, between the right and median lobes. Lift the liver to find it.",
    mesh: gall,
  });

  // Three-chambered frog heart: a single conical ventricle (apex pointing
  // POSTERIORLY) with two atria at the anterior base, a dark sinus venosus on the
  // dorsal surface, and a conus arteriosus that leaves ventrally and forks into
  // the paired truncus/aortic arches. Triangular and reddish. One pickable body;
  // every named sub-structure is a decorative child.
  const heartF = organ(THREE, 0x8c4038, 0.42, 0.4, 0.56, {
    amp: 0.055,
    rough: 0.4,
    clear: 0.7,
    clearRough: 0.3,
    sheen: 0xff9a86,
    seed: 5,
  });
  heartF.position.set(0, 0.56, 2.42);
  heartF.rotation.x = 0.16;
  // ventricular apex (points posteriorly, -z) — gives the triangular silhouette
  const apex = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 0.5, 18),
    mat(THREE, 0x7e3b34, { tissue: "muscle", sheen: 0xa85f4e }),
  );
  childMesh(heartF, apex, 0, -0.02, -0.56, -Math.PI / 2, 0, 0);
  // two atria, thin-walled, at the anterior base (+z). Animal's left = -x.
  [
    [-0.26, 0.2, 0.32],
    [0.26, 0.2, 0.32],
  ].forEach(([ax, ay, az]) => {
    const atrium = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      mat(THREE, 0x743036, { tissue: "muscle" }),
    );
    atrium.geometry.scale(0.27, 0.25, 0.26);
    seal(atrium.geometry);
    childMesh(heartF, atrium, ax, ay, az);
  });
  // sinus venosus: dark, thin-walled, on the DORSAL surface (-y), posterior
  const sinus = new THREE.Mesh(
    new THREE.SphereGeometry(1, 14, 10),
    mat(THREE, 0x5a2530, { rough: 0.55, clear: 0.3 }),
  );
  sinus.geometry.scale(0.24, 0.16, 0.3);
  seal(sinus.geometry);
  childMesh(heartF, sinus, 0, -0.3, 0.14);
  // conus arteriosus: muscular outflow, leaves ventrally (+y) and runs forward
  const conus = tube(
    THREE,
    0xc0684f,
    [
      [0, 0.16, 0.42],
      [0.05, 0.3, 0.64],
      [0.1, 0.36, 0.86],
    ],
    0.1,
    { rough: 0.45, rad: 8, seg: 14, sheen: 0xff9a86 },
  );
  heartF.add(conus);
  // truncus / paired aortic arches sweeping laterally-posteriorly off the conus
  [1, -1].forEach((sd) => {
    const arch = tube(
      THREE,
      0xb85246,
      [
        [0.1, 0.36, 0.86],
        [sd * 0.22, 0.34, 0.7],
        [sd * 0.4, 0.24, 0.42],
        [sd * 0.42, 0.12, 0.12],
      ],
      0.06,
      { rough: 0.45, rad: 6, seg: 16 },
    );
    heartF.add(arch);
  });
  add({
    id: "frog-heart",
    name: "Heart",
    layer: 2,
    system: "circulatory",
    cuttable: true,
    detachable: true,
    note: "Three chambers — two atria and a single conical ventricle whose apex points back. The conus arteriosus leaves ventrally and forks into the aortic arches.",
    mesh: heartF,
  });

  // Paired lungs: thin translucent sacs DORSOLATERAL to the heart, partly deflated
  // on a fixed specimen, so they sit deeper (lower y) and lateral to it.
  [
    ["lung-left", -0.92, 12],
    ["lung-right", 0.92, 13],
  ].forEach(([lid, x, seed]) => {
    const m = sac(THREE, 0xcf9a92, 1.0, 0.42, {
      amp: 0.17,
      freq: 4.2,
      seed,
      rough: 0.5,
      clear: 0.4,
      trans: 0.42,
      thickness: 0.6,
      atten: 0xd89890,
      attenDist: 1.4,
      sheen: 0xffb0a0,
      side: THREE.DoubleSide,
    });
    m.position.set(x, 0.28, 2.15);
    m.rotation.set(0, x > 0 ? -0.14 : 0.14, -0.05);
    add({
      id: lid,
      name: lid === "lung-left" ? "Left lung" : "Right lung",
      layer: 2,
      system: "respiratory",
      cuttable: true,
      detachable: true,
      note: "A thin translucent sac, dorsolateral to the heart. Frogs inflate them by positive pressure — swallowing air from the buccal floor.",
      mesh: m,
    });
  });

  // Stomach: a curved J-shaped bag on the animal's LEFT. Wide cardiac end anterior
  // (continuous with the oesophagus), narrowing to the pylorus posteriorly. Hidden
  // by the liver until it is reflected, so it sits below/behind the left lobe.
  const stomach = bag(THREE, 0xcbb094, 1.15, 0.42, {
    seed: 7,
    rough: 0.55,
    clear: 0.45,
    sheen: 0xe8c8a8,
    bend: 0.55,
  });
  stomach.position.set(-0.5, 0.0, 0.35);
  stomach.rotation.set(0.1, 2.25, 0.2); // narrow (pyloric) end points back
  add({
    id: "stomach",
    name: "Stomach",
    layer: 2,
    system: "digestive",
    cuttable: true,
    detachable: true,
    note: "A curved, whitish J-shaped bag on the animal's left. Wide cardiac end above, narrowing to the pylorus below. You only see it once the liver is lifted.",
    mesh: stomach,
  });

  // Oesophagus (added): a short pale tube from the pharynx down to the cardiac end
  // of the stomach, lying dorsal to the liver.
  const oeso = tube(
    THREE,
    0xd8c0a8,
    [
      [0, 0.22, 2.65],
      [-0.14, 0.12, 1.9],
      [-0.3, 0.06, 1.25],
      [-0.42, 0.02, 0.78],
    ],
    0.11,
    { rough: 0.55, clear: 0.35, sheen: 0xe8d0b8, rad: 8, seg: 22 },
  );
  add({
    id: "oesophagus",
    name: "Oesophagus",
    layer: 2,
    system: "digestive",
    cuttable: true,
    detachable: true,
    note: "A short muscular tube carrying food from the pharynx to the cardiac end of the stomach. Runs dorsal to the liver.",
    mesh: oeso,
  });

  // Small intestine: a straight DUODENUM leaving the pylorus and running forward
  // parallel to the stomach (the U-loop), then a long, highly-coiled ILEUM held in
  // a translucent mesentery, enlarging posteriorly to join the rectum.
  const siPts = [
    [-0.42, 0.02, -0.35], // pylorus
    [-0.18, 0.0, 0.05], // duodenum ascending
    [0.12, -0.01, 0.48], // duodenal apex (U-turn)
    [0.46, -0.02, 0.46],
    [0.5, -0.03, 0.12], // descending into the coil
  ];
  for (let i = 0; i <= 42; i++) {
    const t = i / 42;
    const ang = t * Math.PI * 2 * 2.8; // ~2.8 loops
    const rad = 0.72 * (1 - 0.3 * t);
    siPts.push([
      Math.cos(ang) * rad * 0.94,
      -0.05 + Math.cos(ang * 1.3) * 0.06,
      0.05 - t * 1.6 + Math.sin(ang) * rad * 0.52,
    ]);
  }
  const si = tube(THREE, 0xd2a37e, siPts, 0.17, {
    rough: 0.5,
    clear: 0.4,
    sheen: 0xe8b8a0,
    seg: 170,
    rad: 9,
  });
  // translucent mesentery fan holding the coil, with fine vessels painted on it
  const mesGeo = new THREE.PlaneGeometry(2.0, 1.5, 12, 9);
  {
    const mp = mesGeo.attributes.position,
      mv = new THREE.Vector3();
    for (let i = 0; i < mp.count; i++) {
      mv.fromBufferAttribute(mp, i);
      mp.setXYZ(i, mv.x, mv.y, vnoise(mv.x * 2 + 5, mv.y * 2, 0) * 0.14 - 0.07);
    }
    seal(mesGeo);
  }
  const mesentery = new THREE.Mesh(
    mesGeo,
    mat(THREE, 0xe7c7b6, {
      trans: true,
      opacity: 0.2,
      rough: 0.6,
      clear: 0.3,
      side: THREE.DoubleSide,
      transmission: 0.42,
      thickness: 0.2,
    }),
  );
  mesentery.material.depthWrite = false;
  childMesh(si, mesentery, 0, -0.2, -0.7, Math.PI / 2, 0, 0);
  // mesenteric vessels: a couple of fine red lines converging on the root
  [-0.5, 0.0, 0.5].forEach((sx, k) => {
    const vsl = tube(
      THREE,
      0xc24a3e,
      [
        [sx, -0.18, -1.4],
        [sx * 0.5, -0.16, -0.9],
        [0.05, -0.14, -0.55],
      ],
      0.02,
      { rough: 0.5, rad: 5, seg: 12 },
    );
    si.add(vsl);
  });
  add({
    id: "small-intestine",
    name: "Small intestine",
    layer: 2,
    system: "digestive",
    cuttable: true,
    detachable: true,
    note: "A straight duodenum forms a U-loop off the pylorus, then the ileum coils tightly in a transparent mesentery. Tease the mesentery, never cut it.",
    mesh: si,
  });

  // Large intestine (rectum): distinctly WIDER than the ileum, running straight
  // back to the cloaca at the posterior midline.
  const li = tube(
    THREE,
    0xc09472,
    [
      [0.1, -0.06, -1.55],
      [0.16, -0.06, -2.0],
      [0.05, -0.1, -2.5],
      [0, -0.14, -2.95],
    ],
    0.27,
    { rough: 0.52, clear: 0.4, sheen: 0xd8a888, seg: 44, rad: 10 },
  );
  add({
    id: "large-intestine",
    name: "Large intestine (rectum)",
    layer: 2,
    system: "digestive",
    cuttable: true,
    detachable: true,
    note: "Markedly wider than the small intestine, running straight back to the cloaca.",
    mesh: li,
  });

  const cloaca = organ(THREE, 0xa87a68, 0.27, 0.23, 0.29, {
    amp: 0.05,
    rough: 0.55,
    seed: 9,
  });
  cloaca.position.set(0, -0.16, -3.28);
  add({
    id: "cloaca",
    name: "Cloaca",
    layer: 2,
    system: "urogenital",
    cuttable: true,
    detachable: false,
    note: "The common chamber where the gut, the urinary tract and the gonads all discharge to the vent.",
    mesh: cloaca,
  });

  // Urinary bladder (added): a thin-walled bilobed sac at the posterior midline,
  // ventral, opening into the cloaca. Collapsed and translucent on a fixed frog.
  const bladder = organ(THREE, 0xd6a8ae, 0.34, 0.2, 0.26, {
    amp: 0.08,
    rough: 0.5,
    clear: 0.5,
    trans: 0.4,
    thickness: 0.4,
    atten: 0xe0b0b8,
    sheen: 0xf0c0c8,
  });
  bladder.position.set(0, 0.18, -2.95);
  // second lobe of the bilobed bladder
  const bl2 = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 12),
    mat(THREE, 0xd6a8ae, {
      rough: 0.5,
      clear: 0.5,
      trans: 0.4,
      thickness: 0.4,
      sheen: 0xf0c0c8,
    }),
  );
  bl2.geometry.scale(0.24, 0.16, 0.2);
  seal(bl2.geometry);
  childMesh(bladder, bl2, 0.16, -0.02, 0.12);
  add({
    id: "urinary-bladder",
    name: "Urinary bladder",
    layer: 2,
    system: "urogenital",
    cuttable: true,
    detachable: true,
    note: "A thin bilobed sac at the posterior midline, ventral to the rectum. Collapses when empty; opens into the cloaca.",
    mesh: bladder,
  });

  // Spleen: a small dark-red spherical bead in the mesentery near the stomach-gut
  // junction. Easy to lose to a careless cut.
  const spleen = organ(THREE, 0x7d2436, 0.18, 0.18, 0.19, {
    amp: 0.05,
    rough: 0.4,
    clear: 0.6,
    sheen: 0xb04a68,
    seed: 8,
  });
  spleen.position.set(0.5, -0.06, -0.55);
  add({
    id: "spleen",
    name: "Spleen",
    layer: 2,
    system: "circulatory",
    cuttable: true,
    detachable: true,
    note: "A small dark-red round bead in the mesentery near the stomach-intestine junction.",
    mesh: spleen,
  });

  // Fat bodies: bright orange, clearly FINGER-LIKE (spaghetti-shaped) processes at
  // the anterior pole of each kidney/gonad — a signature frog structure. Built as a
  // small root with several radiating finger children.
  [
    ["fat-body-left", -1.12, 14],
    ["fat-body-right", 1.12, 15],
  ].forEach(([fid, x, seed]) => {
    const m = organ(THREE, 0xf1c53a, 0.2, 0.16, 0.24, {
      tissue: "fat",
      amp: 0.14,
      freq: 6,
      sheen: 0xffe58a,
      seed,
    });
    m.position.set(x, 0.08, -0.5);
    // 5 finger-like lobes fanning anteriorly from the root
    for (let f = 0; f < 5; f++) {
      const a = (f - 2) / 2; // -1 .. 1
      const finger = new THREE.Mesh(
        new THREE.CapsuleGeometry(
          0.075,
          0.55 + Math.abs(a) * -0.12 + 0.6,
          4,
          8,
        ),
        mat(THREE, 0xeaba30, { tissue: "fat", sheen: 0xffe58a }),
      );
      childMesh(
        m,
        finger,
        a * 0.16,
        0.02 - Math.abs(a) * 0.03,
        0.5 + Math.abs(a) * -0.04,
        -0.2,
        0,
        a * 0.4,
      );
    }
    add({
      id: fid,
      name: fid.includes("left") ? "Left fat body" : "Right fat body",
      layer: 2,
      system: "urogenital",
      cuttable: true,
      detachable: true,
      note: "Bright orange finger-like fat stores at the front of the gonad, tethered near the kidney. Largest just before hibernation.",
      mesh: m,
    });
  });

  /* --- layer 3: dorsal / retroperitoneal --------------------------------- */
  // Kidneys: paired elongated dark-red ribbons on the dorsal wall, either side of
  // the midline, retroperitoneal — they stay put when the gut is removed. A yellow
  // adrenal streak runs on the ventral face of each.
  [
    ["kidney-left", -0.66, 21],
    ["kidney-right", 0.66, 22],
  ].forEach(([kid, x, seed]) => {
    const m = bean(THREE, 0x8a3d38, 1.55, 0.32, 0.2, {
      amp: 0.06,
      rough: 0.45,
      clear: 0.55,
      clearRough: 0.35,
      sheen: 0xc06a5a,
      seed,
      bend: x > 0 ? -0.14 : 0.14,
    });
    m.position.set(x, -0.6, -1.05);
    // adrenal gland: a yellow-orange streak on the ventral (+y) face
    const adren = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.05, 1.05, 3, 6),
      mat(THREE, 0xe0a83a, { rough: 0.5, sheen: 0xffd77a }),
    );
    childMesh(m, adren, 0, 0.16, 0, Math.PI / 2, 0, 0);
    add({
      id: kid,
      name: kid.includes("left") ? "Left kidney" : "Right kidney",
      layer: 3,
      system: "urogenital",
      cuttable: true,
      detachable: true,
      note: "A flat, dark-red elongated ribbon stuck to the dorsal wall — retroperitoneal, so it stays put. A yellow adrenal streak runs along its ventral face.",
      mesh: m,
    });
  });

  const aorta = vessel(
    THREE,
    0xb03a30,
    [
      [0, -0.72, 2.2],
      [0, -0.82, 0.6],
      [0, -0.88, -1.0],
      [0, -0.84, -2.4],
    ],
    0.11,
    0.07,
    { rough: 0.45, clear: 0.5, sheen: 0xd85a48, rad: 9, seg: 44 },
  );
  add({
    id: "dorsal-aorta",
    name: "Dorsal aorta",
    layer: 3,
    system: "circulatory",
    cuttable: true,
    detachable: false,
    note: "Runs the midline along the roof of the cavity, between the two kidneys.",
    mesh: aorta,
  });

  // Vertebral column: a short, stiff bony rod with segmented vertebra rings.
  const spine = tube(
    THREE,
    0xd8d2c4,
    [
      [0, -0.98, 3.2],
      [0, -1.03, 1.0],
      [0, -1.08, -1.2],
      [0, -1.03, -3.2],
    ],
    0.16,
    { rough: 0.72, clear: 0.15, sheen: 0xefe8d8, rad: 8, seg: 44 },
  );
  for (let i = 0; i < 9; i++) {
    // 9 presacral vertebrae
    const zt = 3.0 - i * 0.72;
    const yt = -1.03 - Math.cos(zt * 0.4) * 0.03;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.07, 6, 12),
      mat(THREE, 0xe4ddce, { rough: 0.7, clear: 0.15 }),
    );
    childMesh(spine, ring, 0, yt, zt, Math.PI / 2, 0, 0);
  }
  add({
    id: "vertebral-column",
    name: "Vertebral column",
    layer: 3,
    system: "skeletal",
    cuttable: false,
    detachable: false,
    note: "Short and stiff — a frog has only nine presacral vertebrae plus the rod-like urostyle.",
    mesh: spine,
  });

  group.name = "frog-specimen";
  group.userData.frogAuthored = true;
  group.userData.orientation = "Ventral +Y; anterior +Z; posterior -Z";
  return { group, parts, pinning };
}
