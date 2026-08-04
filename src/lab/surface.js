/*
 * surface.js — createSurfaceDetail
 *
 * The reviewer's sharpest visual note was not about shading. It was about the
 * OUTLINE: "organs too mathematically smooth ... no veins, no membranes, no blood
 * vessels wrapping organs". A perfect analytic curve at the silhouette reads as
 * computer-generated no matter how wet the material is, because the silhouette is
 * the one place where shading cannot help you. So this module does three things,
 * all of them small:
 *
 *   1. VESSELS ON THE SURFACE. A branching tree seeded at each organ's real hilum
 *      (liver at the porta, kidney at its notch, stomach at the lesser curvature,
 *      spleen at its hilum), walked across the mesh with every point projected
 *      back onto it, so the vessels HUG the organ instead of floating over it.
 *      Radii split by Murray's law. Arteries brighter, straighter, finer; veins
 *      darker, wider, more tortuous. On the gut the pattern is the real one —
 *      mesenteric arcades arching toward the bowel, terminal arcade, and vasa
 *      recta sweeping from the mesenteric border around the circumference and
 *      STOPPING SHORT of the antimesenteric border. That last detail is why a
 *      surgeon opens a bowel antimesenterically, and it is the single most
 *      recognisable vascular picture in the abdomen.
 *
 *   2. BROKEN SILHOUETTES. Low-amplitude, high-frequency displacement so no
 *      outline is analytic, plus per-organ character: hepatic lobulation biased
 *      to the free margin, a smooth renal capsule with ONE sharp hilar notch,
 *      segmental constriction rings on the gut, fat bodies genuinely lobulated.
 *      Amplitudes run 1-9% of the organ's bounding radius, measured below.
 *      This is texture, not distortion — the anatomy is still markable in an exam.
 *
 *   3. MEMBRANES. A handful of translucent strands where organs lie against each
 *      other, and a faint serosal sheen lifted on visceral surfaces. Sparse by
 *      design: a few strands read as connective tissue, a web reads as cobweb.
 *
 * WHAT THIS MODULE NEVER DOES
 *   It never touches `parts`, never registers a descriptor, never sets a partId.
 *   Every vessel, strand and membrane is a decorative CHILD of an organ mesh via
 *   childMesh(), so dissect.js — which raycasts `parts` non-recursively — cannot
 *   pick them, and hovering the liver still says "liver". Children also inherit
 *   the parent's visibility, so a layer-3 kidney's vessels stay hidden with it.
 *
 * TRAPS ALREADY PAID FOR
 *   · softbody.js snapshots rest vertex positions IN ITS CONSTRUCTOR. Displace
 *     after that and the first animated frame springs the organ back to the smooth
 *     shape — silently, with no error. apply() MUST run before createSoftBody().
 *   · Displacement is keyed on VERTEX POSITION, never on uv or vertex index. The
 *     duplicated vertices at a sphere's u-seam and a tube's radial seam share a
 *     position, so they get identical displacement and the seam cannot split open.
 *   · Every vertex edit is followed by seal() — needsUpdate, computeVertexNormals,
 *     computeBoundingSphere, computeBoundingBox. Raycaster rejects on the bounding
 *     SPHERE first; a stale sphere makes an organ unpickable with no error at all.
 *   · Vessel materials are CLONED PER PART, never shared. physio.js walks
 *     part.mesh.traverse() and lerps every material's colour for pallor/congestion
 *     — one shared vessel material would drain the colour out of every organ in
 *     the specimen the moment a single one went ischaemic.
 *   · The Frenet frame of a coiled tube twists, so the raw atan2 of the mesenteric
 *     direction jumps by 2π mid-run and would flip the vasa recta to the far side
 *     of the bowel. The angle is unwrapped along the gut.
 *
 * TRIANGLE BUDGET: SUR_BUDGET = 46,000 triangles, a hard ceiling enforced in the
 * builder. MEASURED: frog 31,420 tris / 36 decorative meshes at density 1.0 and
 * 45,110 at the 1.5 cap; heart 8,400 and 12,690. setDensity(d) scales branch and
 * strand counts and rebuilds only the child meshes; setDensity(0) strips every
 * vessel and strand and leaves the displacement, which is not density-scaled.
 *
 * MEASURED silhouette displacement, as a fraction of each organ's bounding radius:
 * liver 5%, fat bodies 7-9%, large intestine 5.5%, kidney 3-4% (almost all of it
 * the hilar notch), small intestine 2.6%, stomach/lung/spleen ~2.4%, skin and body
 * wall ~1%. Texture, not distortion — every organ is still its own shape.
 *
 * VERIFIED ANATOMY: on the large intestine (the gut curve that does not self-cross)
 * the arterial vasa recta reach a maximum of 131.9° around the circumference from
 * the mesenteric border, with ZERO geometry in the 150-180° band. The antimesenteric
 * border is bare, which is the whole point. Venous vasa recta mirror it at 116°.
 * Note that frog.js's ileal coil genuinely self-intersects (623 centreline ring
 * pairs closer than two tube radii), so vessels there inherit the bowel's own
 * interpenetration; that is the specimen's geometry, not this module's.
 *
 * Build-time only. There is no update() and nothing here runs per frame.
 */

/* ---- tunables -------------------------------------------------------------- */
const SUR_RADIAL = 5;          // radial segments per vessel ring -> 10 tris per step
const SUR_FLATTEN = 0.62;      // cross-section squashed against the organ, not a pipe
const SUR_LIFT = 0.45;         // ring centre lifted this × radius, so the belly buries
const SUR_BUDGET = 46000;      // hard triangle ceiling for everything this module adds
const SUR_ART = 0xb0392c;      // oxygenated: brighter, slightly orange red
const SUR_VEIN = 0x5b3050;     // deoxygenated: dark plum, the colour of a filled vein
const SUR_WEB = 0xe8d6c8;      // areolar connective tissue, near-colourless
const SUR_NGAIN = 3.2;         // normalises fbm's ±0.15 practical swing back to ±0.5

/* ---- geometry builder ------------------------------------------------------
 * One merged BufferGeometry per (organ, vessel class) instead of a Mesh per
 * branch. A frog liver lobe grows ~30 branches; 30 draw calls per lobe would cost
 * more than the organ it decorates. */
function SUR_builder() { return { pos: [], nor: [], idx: [], tris: 0 }; }

/* Sweep an elliptical cross-section along a polyline that already lies on the
 * organ. `nrm[i]` is the SURFACE normal at that point — the ring is flattened
 * along it and its centre lifted, so the vessel looks pressed into the capsule
 * rather than laid on top of it. */
function SUR_emit(THREE, b, pts, nrm, rad) {
  const n = pts.length;
  if (n < 2 || b.tris > SUR_BUDGET) return;
  const R = SUR_RADIAL, base = b.pos.length / 3;
  const T = new THREE.Vector3(), B = new THREE.Vector3(), N = new THREE.Vector3();
  const P = new THREE.Vector3(), tmp = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    if (i === 0) T.subVectors(pts[1], pts[0]);
    else if (i === n - 1) T.subVectors(pts[n - 1], pts[n - 2]);
    else T.subVectors(pts[i + 1], pts[i - 1]);
    if (T.lengthSq() < 1e-12) T.set(0, 0, 1);
    T.normalize();
    N.copy(nrm[i]);
    B.crossVectors(T, N);
    // Degenerate only if the surface normal is parallel to the heading, which
    // happens where a branch dives over a pole. Any perpendicular will do there.
    if (B.lengthSq() < 1e-10) B.copy(tmp.set(0.577, 0.577, 0.577)).cross(T);
    B.normalize();
    N.crossVectors(B, T).normalize();
    const r = Math.max(1e-4, rad[i]), rf = r * SUR_FLATTEN;
    P.copy(pts[i]).addScaledVector(N, r * SUR_LIFT);
    for (let j = 0; j < R; j++) {
      const a = (j / R) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      b.pos.push(P.x + B.x * ca * r + N.x * sa * rf,
                 P.y + B.y * ca * r + N.y * sa * rf,
                 P.z + B.z * ca * r + N.z * sa * rf);
      // Exact ellipse normal: (cos/a, sin/b) in the (B, N) basis.
      let nx = B.x * (ca / r) + N.x * (sa / rf);
      let ny = B.y * (ca / r) + N.y * (sa / rf);
      let nz = B.z * (ca / r) + N.z * (sa / rf);
      const inv = 1 / (Math.hypot(nx, ny, nz) || 1);
      b.nor.push(nx * inv, ny * inv, nz * inv);
    }
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < R; j++) {
      const a = base + i * R + j, c = base + i * R + ((j + 1) % R);
      b.idx.push(a, a + R, c, c, a + R, c + R);
      b.tris += 2;
    }
  }
}

function SUR_finish(THREE, b) {
  if (!b.idx.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
  g.setIndex(b.idx);
  g.computeBoundingSphere();
  g.computeBoundingBox();
  return g;
}

/* ---- point-set surface projector -------------------------------------------
 * Given any query point near an organ, return the nearest point ON that organ
 * plus its normal. Ray-casting the mesh would be exact but costs a full
 * bounding-sphere-then-triangle sweep per sample; a few thousand samples per
 * specimen turns a one-frame build into a visible hitch. This is a moving
 * least-squares projection over a grid hash instead: O(1) per query, C1-smooth,
 * and it works identically for a lumped sphere, a lathe and a tube.
 *
 * The one artefact of an MLS fit is that a plane fitted through a curved patch
 * sits slightly INSIDE the surface, so vessels would sink into the organ. Rather
 * than derive the curvature correction, we measure it: project a sample of real
 * vertices and average how far the operator pulled them in. That mean IS the
 * correction, and it is exact for this geometry by construction. */
function SUR_projector(THREE, geo) {
  const pa = geo.attributes && geo.attributes.position;
  const na = geo.attributes && geo.attributes.normal;
  if (!pa || !na || pa.count < 16) return null;
  const n = pa.count;
  const px = new Float32Array(n * 3), nx = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    px[i * 3] = pa.getX(i); px[i * 3 + 1] = pa.getY(i); px[i * 3 + 2] = pa.getZ(i);
    nx[i * 3] = na.getX(i); nx[i * 3 + 1] = na.getY(i); nx[i * 3 + 2] = na.getZ(i);
  }
  geo.computeBoundingBox();
  const size = new THREE.Vector3(), center = new THREE.Vector3();
  geo.boundingBox.getSize(size);
  geo.boundingBox.getCenter(center);
  const half = size.clone().multiplyScalar(0.5);
  // Mean vertex spacing, estimated from the bounding box's area per vertex. Crude,
  // but it only has to set a smoothing radius to within a factor of two.
  const area = 2 * (size.x * size.y + size.y * size.z + size.z * size.x) || 1;
  const spacing = Math.sqrt(area / n);
  const R = Math.max(spacing * 1.9, 1e-5), R2 = R * R, cell = R;
  const buckets = new Map();
  const key = (a, c, d) => ((a * 73856093) ^ (c * 19349663) ^ (d * 83492791)) >>> 0;
  for (let i = 0; i < n; i++) {
    const k = key(Math.floor(px[i * 3] / cell), Math.floor(px[i * 3 + 1] / cell), Math.floor(px[i * 3 + 2] / cell));
    let arr = buckets.get(k);
    if (!arr) { arr = []; buckets.set(k, arr); }
    arr.push(i);
  }
  let bias = 0;

  function fit(qx, qy, qz, outP, outN) {
    let w = 0, ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0;
    const ix = Math.floor(qx / cell), iy = Math.floor(qy / cell), iz = Math.floor(qz / cell);
    for (let a = -1; a <= 1; a++) for (let c = -1; c <= 1; c++) for (let d = -1; d <= 1; d++) {
      const arr = buckets.get(key(ix + a, iy + c, iz + d));
      if (!arr) continue;
      for (let t = 0; t < arr.length; t++) {
        const i3 = arr[t] * 3;
        const dx = px[i3] - qx, dy = px[i3 + 1] - qy, dz = px[i3 + 2] - qz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= R2) continue;
        const ww = 1 - Math.sqrt(d2) / R;
        const wg = ww * ww;
        w += wg;
        ax += px[i3] * wg; ay += px[i3 + 1] * wg; az += px[i3 + 2] * wg;
        bx += nx[i3] * wg; by += nx[i3 + 1] * wg; bz += nx[i3 + 2] * wg;
      }
    }
    // No neighbour inside the smoothing radius means the query has walked OFF the
    // mesh — which really happens, because the right ventricle and the mesentery
    // are open shells with free edges, not closed blobs. Extrapolating there threw
    // vessels two units into space; refusing instead just ends the branch at the
    // edge, which is what a vessel does at the edge of an organ anyway.
    if (w <= 0) return false;
    outP.set(ax / w, ay / w, az / w);
    outN.set(bx, by, bz);
    if (outN.lengthSq() < 1e-12) outN.copy(outP).sub(center);
    outN.normalize();
    return true;
  }

  const _p = new THREE.Vector3(), _n = new THREE.Vector3();
  {
    // Measure the inward pull at query points that look like the ones we will
    // actually feed it: just off the surface, along the vertex normal.
    let acc = 0, cnt = 0;
    const stride = Math.max(1, Math.floor(n / 56));
    for (let i = 0; i < n; i += stride) {
      const i3 = i * 3, h = spacing * 0.5;
      const qx = px[i3] + nx[i3] * h, qy = px[i3 + 1] + nx[i3 + 1] * h, qz = px[i3 + 2] + nx[i3 + 2] * h;
      if (!fit(qx, qy, qz, _p, _n)) continue;
      const dp = (qx - _p.x) * _n.x + (qy - _p.y) * _n.y + (qz - _p.z) * _n.z;
      // where the projection lands, measured back along the vertex normal
      const s = (qx - dp * _n.x - px[i3]) * nx[i3]
              + (qy - dp * _n.y - px[i3 + 1]) * nx[i3 + 1]
              + (qz - dp * _n.z - px[i3 + 2]) * nx[i3 + 2];
      acc += -s; cnt++;
    }
    bias = cnt ? Math.max(0, acc / cnt) : 0;
  }

  return {
    center, half, size, spacing,
    scale: (half.x + half.y + half.z) / 3,
    /* Project q onto the organ, `offset` above it. Keeps q's TANGENTIAL position
     * and only corrects along the fitted normal, so a walk does not creep. */
    project(q, outP, outN, offset) {
      if (!fit(q.x, q.y, q.z, _p, _n)) return false;
      const dp = (q.x - _p.x) * _n.x + (q.y - _p.y) * _n.y + (q.z - _p.z) * _n.z;
      const k = -dp + bias + (offset || 0);
      // A trustworthy MLS fit only ever makes a small correction. A large one
      // means the neighbourhood straddles two sheets of a folded organ and the
      // fitted plane is meaningless — better no vessel than a vessel through it.
      if (Math.abs(k) > R * 1.5) return false;
      outP.set(q.x + _n.x * k, q.y + _n.y * k, q.z + _n.z * k);
      outN.copy(_n);
      return true;
    },
    /* Nearest real vertex, used only to plant a seed. A hilum is given in
     * normalised bbox coordinates, which for a crescent shell like the right
     * ventricle can land in empty space inside the box — snapping guarantees the
     * tree starts ON the organ instead of being silently skipped. */
    snap(q, outP, outN) {
      let best = -1, bd = Infinity;
      for (let i = 0; i < n; i++) {
        const i3 = i * 3;
        const dx = px[i3] - q.x, dy = px[i3 + 1] - q.y, dz = px[i3 + 2] - q.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bd) { bd = d2; best = i; }
      }
      if (best < 0) return false;
      const i3 = best * 3;
      outP.set(px[i3], px[i3 + 1], px[i3 + 2]);
      outN.set(nx[i3], nx[i3 + 1], nx[i3 + 2]);
      if (outN.lengthSq() < 1e-8) outN.copy(outP).sub(center);
      outN.normalize();
      outP.addScaledVector(outN, bias * 0.5);
      return true;
    },
  };
}

/* ---- vertex displacement ---------------------------------------------------- */
/* computeVertexNormals() leaves a ZERO normal on any vertex that belongs to no
 * triangle, and a SphereGeometry has exactly two of those — the duplicate pole
 * vertices. A zero normal shades pure black, and on a liver lobe one of those
 * poles is the free tip, so every lobe in the specimen has carried a black speck
 * at its point. seal() cannot know what to put there; here we do — the radial
 * direction. Two vertices per organ, and it removes an artefact the whole app has
 * been shipping. Must run AFTER seal(), which is what writes the normals. */
function SUR_fixNormals(THREE, geo) {
  const na = geo.attributes && geo.attributes.normal;
  const pa = geo.attributes && geo.attributes.position;
  if (!na || !pa) return;
  if (!geo.boundingBox) geo.computeBoundingBox();
  const c = new THREE.Vector3();
  geo.boundingBox.getCenter(c);
  let fixed = 0;
  for (let i = 0; i < na.count; i++) {
    const l = Math.hypot(na.getX(i), na.getY(i), na.getZ(i));
    if (l > 0.5) continue;
    let dx = pa.getX(i) - c.x, dy = pa.getY(i) - c.y, dz = pa.getZ(i) - c.z;
    const d = Math.hypot(dx, dy, dz) || 1;
    na.setXYZ(i, dx / d, dy / d, dz / d);
    fixed++;
  }
  if (fixed) na.needsUpdate = true;
}

/* Displace a blob-ish organ along the direction from its bounding-box centre.
 * Position-derived, so the sphere seam's duplicate vertices move identically and
 * cannot crack open. `rim` biases the lobulation toward the thin free margin,
 * which is where a liver actually looks lobulated and where the silhouette lives. */
function SUR_displaceBlob(THREE, geo, cfg, seed) {
  const pa = geo.attributes && geo.attributes.position;
  if (!pa) return;
  geo.computeBoundingBox();
  const c = new THREE.Vector3(), s = new THREE.Vector3();
  geo.boundingBox.getCenter(c);
  geo.boundingBox.getSize(s);
  const hx = Math.max(1e-4, s.x / 2), hy = Math.max(1e-4, s.y / 2), hz = Math.max(1e-4, s.z / 2);
  const halves = [hx, hy, hz];
  // Half-way between the mean and the largest half-extent. The mean alone is
  // dragged down by the thin axis of a flattened organ, and a liver lobe's
  // silhouette lives on its LONG axis — scaling by the mean made the amplitude
  // invisible on exactly the organs the reviewer was complaining about.
  const scale = ((hx + hy + hz) / 3 + Math.max(hx, hy, hz)) / 2;
  // The flat axis is the organ's thickness; its rim is the outline you see.
  let fA = 0;
  if (hy < halves[fA]) fA = 1;
  if (hz < halves[fA]) fA = 2;
  const aA = (fA + 1) % 3, bA = (fA + 2) % 3;
  const v = new THREE.Vector3(), u = [0, 0, 0];
  const fine = cfg.fine || 0, fFreq = cfg.fineFreq || 10;
  const lob = cfg.lob || 0, lFreq = cfg.lobFreq || 2.5, rim = cfg.rim || 0;
  const notch = cfg.notch;
  for (let i = 0; i < pa.count; i++) {
    v.fromBufferAttribute(pa, i);
    const dx = v.x - c.x, dy = v.y - c.y, dz = v.z - c.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    u[0] = dx / hx; u[1] = dy / hy; u[2] = dz / hz;
    const uf = Math.min(1, Math.abs(u[fA]));
    const ur = Math.min(1, Math.hypot(u[aA], u[bA]));
    const rimAmt = (1 - uf) * (1 - uf) * ur * ur;
    // fbm() sums three value-noise octaves each centred on 0.5, so its practical
    // range is about 0.35..0.65 — a raw (fbm - 0.5) is only ±0.15, and every
    // amplitude in the recipe table would silently mean a fifth of what it says.
    // SUR_NGAIN restores a ±0.5 swing so the numbers below are honest.
    const n1 = (fbm(v.x * fFreq + seed, v.y * fFreq + seed * 1.7, v.z * fFreq + seed * 0.4) - 0.5) * SUR_NGAIN;
    const n2 = (fbm(v.x * lFreq + seed * 2.3, v.y * lFreq + 5.1, v.z * lFreq + seed * 0.9) - 0.5) * SUR_NGAIN;
    const amp = scale * (fine * n1 + lob * n2 * (1 + rim * rimAmt));
    let X = v.x + (dx / len) * amp, Y = v.y + (dy / len) * amp, Z = v.z + (dz / len) * amp;
    if (notch) {
      // One sharp slit across a face — the renal hilum. Narrow along the organ,
      // full-thickness across it, and only on the side the bean already dents, so
      // the notch deepens the existing anatomy instead of inventing a second one.
      const along = notch.along === 'x' ? 0 : notch.along === 'y' ? 1 : 2;
      const face = notch.face === 'y' ? 1 : notch.face === 'z' ? 2 : 0;
      const g = Math.exp(-Math.pow((u[along] - (notch.at || 0)) / (notch.w || 0.1), 2));
      const reach = Math.max(0, Math.min(1, u[face] * (notch.side || 1)));
      const d = -(notch.side || 1) * g * reach * (notch.depth || 0.3) * halves[face];
      if (face === 0) X += d; else if (face === 1) Y += d; else Z += d;
    }
    pa.setXYZ(i, X, Y, Z);
  }
  seal(geo);
  SUR_fixNormals(THREE, geo);
}

/* Segmental radius profile for a gut tube. A frog has no true haustra (that is a
 * human colon feature) — what a fixed specimen actually shows is peristaltic
 * constriction rings with the bowel bulging between them, so the pinch is narrow
 * and the bulge broad. Shared by the displacement and by the vessel projection,
 * which is why the vasa recta stay glued to the bulges. */
function SUR_gutScale(i, T, cfg) {
  const t = T ? i / T : 0;
  const w = 0.5 - 0.5 * Math.cos(t * Math.PI * 2 * (cfg.rings || 10));
  return (1 + (cfg.bulge || 0.09) * (Math.pow(w, 0.55) - 0.45)) * (1 + (cfg.taper || 0) * t);
}

/* Recover a TubeGeometry's analytic surface. r160 keeps `parameters.path` plus the
 * Frenet frames on the geometry, which means the gut's centreline and its ring
 * basis are exactly known — no projection error at all on the one organ where the
 * vessel pattern has to be exactly right. */
function SUR_tubeInfo(THREE, geo) {
  const p = geo.parameters;
  if (!p || !p.path || !geo.normals || !geo.binormals) return null;
  const T = p.tubularSegments | 0, R = p.radialSegments | 0;
  if (!T || !R) return null;
  if (!geo.attributes.position || geo.attributes.position.count !== (T + 1) * (R + 1)) return null;
  if (geo.normals.length < T + 1) return null;
  const C = [];
  for (let i = 0; i <= T; i++) C.push(p.path.getPointAt(i / T, new THREE.Vector3()));
  return { T, R, r0: p.radius, C, N: geo.normals, B: geo.binormals };
}

function SUR_displaceTube(THREE, geo, info, cfg, seed) {
  const pa = geo.attributes.position;
  const v = new THREE.Vector3();
  const ff = cfg.fineFreq || 9, fine = cfg.fine || 0;
  for (let i = 0; i <= info.T; i++) {
    const c = info.C[i];
    const f = SUR_gutScale(i, info.T, cfg);
    for (let j = 0; j <= info.R; j++) {
      const k = i * (info.R + 1) + j;
      v.fromBufferAttribute(pa, k);
      // Noise keyed on the final position: j=0 and j=R are duplicate vertices at
      // the same point, so the radial seam gets identical displacement.
      const g = 1 + (fbm(v.x * ff + seed, v.y * ff + seed * 1.3, v.z * ff) - 0.5) * SUR_NGAIN * fine;
      v.sub(c).multiplyScalar(f * g).add(c);
      pa.setXYZ(k, v.x, v.y, v.z);
    }
  }
  seal(geo);
  SUR_fixNormals(THREE, geo);
}

/* ---- surface walk ----------------------------------------------------------- */
/* Grow one vascular tree across an organ. Every step is projected back onto the
 * mesh, so the vessel follows the capsule over lumps and around the free margin.
 * Bifurcation radii follow Murray's law (r_parent³ = r₁³ + r₂³) with an
 * asymmetric flow split — equal halves everywhere is the tell of a diagram. */
function SUR_grow(THREE, proj, b, cfg) {
  const prev = new THREE.Vector3(), p = new THREE.Vector3(), nrm = new THREE.Vector3();
  const q = new THREE.Vector3(), d = new THREE.Vector3(), side = new THREE.Vector3();
  const stack = [{ p: cfg.start.clone(), n: cfg.normal.clone(), d: cfg.dir.clone(), r: cfg.r, g: 0 }];
  let guard = 0;
  const rot = (vec, axis, a) => {
    side.crossVectors(axis, vec);
    vec.multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a));
    if (vec.lengthSq() < 1e-12) return false;
    vec.normalize();
    return true;
  };
  while (stack.length && guard++ < 2500) {
    const br = stack.pop();
    if (br.r < cfg.rMin || b.tris > SUR_BUDGET) continue;
    const pts = [br.p.clone()], nrms = [br.n.clone()], rads = [br.r];
    p.copy(br.p); nrm.copy(br.n); d.copy(br.d);
    let r = br.r, alive = true;
    for (let s = 0; s < cfg.steps; s++) {
      const a = (fbm(p.x * 5.5 + cfg.seed, p.y * 5.5 + s * 0.83, p.z * 5.5) - 0.5) * cfg.tort;
      if (!rot(d, nrm, a)) { alive = false; break; }
      prev.copy(p);
      q.copy(p).addScaledVector(d, cfg.step);
      if (!proj.project(q, p, nrm, 0)) { alive = false; break; }
      d.subVectors(p, prev);
      d.addScaledVector(nrm, -d.dot(nrm));         // keep the heading tangent
      if (d.lengthSq() < 1e-10) { alive = false; break; }
      d.normalize();
      r *= cfg.taper;
      pts.push(p.clone()); nrms.push(nrm.clone()); rads.push(r);
    }
    SUR_emit(THREE, b, pts, nrms, rads);
    if (!alive || br.g + 1 > cfg.gens || r < cfg.rMin) continue;
    const share = 0.40 + 0.20 * fbm(p.x * 3.1 + 7.3, p.y * 3.1, p.z * 3.1);
    const kids = [
      { r: r * Math.cbrt(share), a: cfg.split },
      { r: r * Math.cbrt(1 - share), a: -cfg.split * (1.15 + 0.5 * share) },
    ];
    for (const kid of kids) {
      const kd = d.clone();
      if (!rot(kd, nrm, kid.a)) continue;
      stack.push({ p: p.clone(), n: nrm.clone(), d: kd, r: kid.r, g: br.g + 1 });
    }
  }
}

/* Seed one tree at a hilum given in normalised bbox coordinates (-1..1). The fan
 * of initial headings runs along the organ's LONG axis, oriented away from the
 * end the hilum sits on — a liver's vessels run toward the free tip, a kidney's
 * run up and down the organ from the notch. */
function SUR_seedTree(THREE, proj, b, spec, density, seed, radius) {
  const start = new THREE.Vector3(
    proj.center.x + spec.hilum[0] * proj.half.x,
    proj.center.y + spec.hilum[1] * proj.half.y,
    proj.center.z + spec.hilum[2] * proj.half.z);
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  if (!proj.snap(start, p, n)) return;
  const h = [proj.half.x, proj.half.y, proj.half.z];
  let longA = 0;
  if (h[1] > h[longA]) longA = 1;
  if (h[2] > h[longA]) longA = 2;
  const base = new THREE.Vector3();
  base.setComponent(longA, spec.hilum[longA] > 0 ? -1 : 1);
  base.addScaledVector(n, -base.dot(n));
  if (base.lengthSq() < 1e-8) { base.set(1, 0, 0).addScaledVector(n, -n.x); }
  base.normalize();
  const seeds = Math.max(1, Math.round((spec.seeds || 2) * Math.min(1.6, Math.max(0.35, density))));
  const side = new THREE.Vector3();
  for (let k = 0; k < seeds; k++) {
    const f = seeds === 1 ? 0 : (k / (seeds - 1)) * 2 - 1;      // -1..1
    const a = f * (spec.spread || 1.0);
    const d = base.clone();
    side.crossVectors(n, d);
    d.multiplyScalar(Math.cos(a)).addScaledVector(side, Math.sin(a)).normalize();
    SUR_grow(THREE, proj, b, {
      start: p, normal: n, dir: d, r: radius,
      gens: spec.gens || 3, steps: spec.steps || 5,
      step: proj.scale * (spec.stepK || 0.12),
      tort: spec.tort, taper: spec.taper || 0.94,
      split: spec.split || 0.5, rMin: radius * 0.16, seed: seed + k * 13.7,
    });
  }
}

/* ---- the mesenteric picture -------------------------------------------------
 * Root -> a few jejunal/ileal branches -> primary arcade -> terminal arcade ->
 * vasa recta -> bowel wall. The arcade arches are CONVEX TOWARD THE BOWEL and the
 * vasa recta leave from their convexity; they sweep around the circumference from
 * the mesenteric border and stop ~40° short of the antimesenteric border, which is
 * exactly why that border is where you open a bowel. */
function SUR_gutTree(THREE, info, cfg, density, bA, bV) {
  const T = info.T;
  const M = new THREE.Vector3(cfg.mesDir ? cfg.mesDir[0] : 0,
                              cfg.mesDir ? cfg.mesDir[1] : -1,
                              cfg.mesDir ? cfg.mesDir[2] : 0).normalize();

  // Mesenteric angle per ring, UNWRAPPED. The coil twists its Frenet frame, and a
  // raw atan2 would jump 2π mid-run and throw the vessels onto the far side.
  const phi = new Array(T + 1);
  let prev = 0;
  for (let i = 0; i <= T; i++) {
    const dn = M.dot(info.N[i]), db = M.dot(info.B[i]);
    let a = Math.hypot(dn, db) > 0.2 ? Math.atan2(db, dn) : prev;
    while (a - prev > Math.PI) a -= Math.PI * 2;
    while (prev - a > Math.PI) a += Math.PI * 2;
    phi[i] = a; prev = a;
  }

  const _rd = new THREE.Vector3();
  const dir = (i, ang, out) => {
    const c = Math.cos(ang), s = Math.sin(ang), N = info.N[i], B = info.B[i];
    return out.set(N.x * c + B.x * s, N.y * c + B.y * s, N.z * c + B.z * s).normalize();
  };
  const onGut = (i, ang, outP, outN) => {
    dir(i, ang, outN);
    outP.copy(info.C[i]).addScaledVector(outN, info.r0 * SUR_gutScale(i, T, cfg));
  };
  const inMes = (i, off, outP, outN) => {
    dir(i, phi[i], _rd);
    outP.copy(info.C[i]).addScaledVector(_rd, info.r0 * SUR_gutScale(i, T, cfg) + off);
    dir(i, phi[i] + Math.PI / 2, outN);          // sheet normal: vessels lie IN the mesentery
  };

  const r0 = info.r0;
  const d1 = r0 * (cfg.arcade1 || 1.6);          // primary arcade, deep in the mesentery
  const d2 = r0 * (cfg.arcade2 || 0.7);          // terminal arcade, close to the bowel
  const i0 = Math.round(T * (cfg.skip || 0.10)); // the duodenum has no arcades
  const span = T - i0;
  if (span < 8) return;
  const nTerm = Math.max(3, Math.min(44, Math.round((span / 170) * 24 * density)));
  const nPrim = Math.max(2, Math.round(nTerm / 3));
  const rArc = r0 * (cfg.rArc || 0.20);

  const P = new THREE.Vector3(), N = new THREE.Vector3();
  const arc = (nodes, off, bulge, rad, into, tort) => {
    for (let k = 0; k < nodes; k++) {
      const iA = i0 + Math.round((k / nodes) * span);
      const iB = i0 + Math.round(((k + 1) / nodes) * span);
      if (iB - iA < 2) continue;
      const pts = [], nrms = [], rads = [];
      const steps = 7;
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const i = Math.min(T, Math.round(iA + (iB - iA) * f));
        const wob = tort ? (fbm(i * 0.31, f * 3.7, 2.1) - 0.5) * off * 0.5 : 0;
        inMes(i, off - bulge * Math.sin(Math.PI * f) + wob, P, N);
        pts.push(P.clone()); nrms.push(N.clone());
        rads.push(rad * (1 - 0.18 * Math.sin(Math.PI * f)));
      }
      SUR_emit(THREE, into, pts, nrms, rads);
    }
  };

  // primary arcade + terminal arcade (arteries), then the marginal vein
  arc(nPrim, d1, d1 * 0.42, rArc, bA, false);
  arc(nTerm, d2, d2 * 0.45, rArc * 0.70, bA, false);
  arc(Math.max(2, Math.round(nTerm * 0.5)), d1 * 1.22, d1 * 0.30, rArc * 1.30, bV, true);

  // feeders from the root of the mesentery out to the primary arcade
  const root = new THREE.Vector3();
  if (cfg.root) root.set(cfg.root[0], cfg.root[1], cfg.root[2]);
  else {
    for (let i = 0; i <= T; i++) root.add(info.C[i]);
    root.multiplyScalar(1 / (T + 1)).addScaledVector(M, d1 * 2.4);
  }
  const nFeed = Math.max(2, Math.round(nPrim * 0.7));
  // A feeder must reach its arcade node WITHOUT cutting through the coils of gut
  // in between. A straight root-to-node chord does exactly that on a 2.8-turn
  // spiral — measured, it put arterial vertices on the antimesenteric wall of
  // loops the vessel had no business touching. So the feeder sags away from the
  // bowel into the depth of the mesentery sheet and only rises at its target,
  // which is where a real mesenteric branch runs anyway.
  const sagDepth = r0 * 2.2;
  for (let k = 0; k < nFeed; k++) {
    const i = Math.min(T, i0 + Math.round(((k + 0.5) / nFeed) * span));
    inMes(i, d1, P, N);
    const target = P.clone(), tnrm = N.clone();
    const pts = [], nrms = [], rads = [];
    const steps = 5;
    for (let s = 0; s <= steps; s++) {
      const f = s / steps;
      const q = root.clone().lerp(target, f);
      q.addScaledVector(M, Math.sin(Math.PI * f) * sagDepth);
      pts.push(q); nrms.push(tnrm.clone()); rads.push(rArc * (1.9 - 0.9 * f));
    }
    SUR_emit(THREE, bA, pts, nrms, rads);
    // the vein runs beside its artery, wider and darker — that is the real pair
    const vp = pts.map((q) => q.clone().addScaledVector(M, r0 * 0.30));
    SUR_emit(THREE, bV, vp, nrms, rads.map((r) => r * 1.35));
  }

  // vasa recta off the convexity of each terminal arch, alternating sides
  const sweep = cfg.sweep || 2.42;               // ~139°, short of the antimesenteric border
  let flip = 1;
  for (let k = 0; k < nTerm; k++) {
    const iA = i0 + Math.round((k / nTerm) * span);
    const iB = i0 + Math.round(((k + 1) / nTerm) * span);
    const im = Math.min(T, Math.round((iA + iB) / 2));
    for (let v = 0; v < 2; v++) {
      const s0 = flip; flip = -flip;
      const long = v === 0 ? 1 : 0.82;           // vasa recta alternate long and short
      const iS = Math.max(0, Math.min(T, im + (v === 0 ? -1 : 1)));
      const pts = [], nrms = [], rads = [];
      inMes(iS, d2 - d2 * 0.45, P, N);
      pts.push(P.clone()); nrms.push(N.clone()); rads.push(rArc * 0.55);
      const steps = 6;
      for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const ang = phi[iS] + s0 * sweep * long * (f * (2 - f));   // fast off the border, easing round
        const i = Math.max(0, Math.min(T, Math.round(iS + (cfg.drift || 1.5) * f * s0)));
        onGut(i, ang, P, N);
        pts.push(P.clone()); nrms.push(N.clone());
        rads.push(rArc * (0.50 - 0.34 * f));
      }
      SUR_emit(THREE, bA, pts, nrms, rads);
      // roughly half as many venous vasa recta, mirrored — sparse on purpose
      if ((k + v) % 2 === 0) {
        const vpts = [], vnrm = [], vrad = [];
        inMes(iS, d1 * 1.22 - d1 * 0.30, P, N);
        vpts.push(P.clone()); vnrm.push(N.clone()); vrad.push(rArc * 0.72);
        for (let s = 0; s <= steps; s++) {
          const f = s / steps;
          const ang = phi[iS] - s0 * sweep * 0.88 * (f * (2 - f));
          const i = Math.max(0, Math.min(T, Math.round(iS - (cfg.drift || 1.5) * f * s0)));
          onGut(i, ang, P, N);
          vpts.push(P.clone()); vnrm.push(N.clone());
          vrad.push(rArc * (0.66 - 0.44 * f));
        }
        SUR_emit(THREE, bV, vpts, vnrm, vrad);
      }
    }
  }
}

/* ---- recipes ----------------------------------------------------------------
 * Anatomy first. Every hilum below is the real one for that organ, expressed in
 * normalised bounding-box coordinates of the mesh frog.js/heart.js actually built.
 * `disp` amplitudes are fractions of the organ's mean half-extent. */
const SUR_REC = [
  /* --- frog ------------------------------------------------------------------ */
  { m: /^liver-/, sheen: [0.84, 0.19],
    disp: { fine: 0.009, fineFreq: 12, lob: 0.026, lobFreq: 2.4, rim: 1.8 },
    // Porta hepatis: on the visceral (dorsal, -y) face near the attached base.
    // Three orders of branching, not five — a fifth order stops reading as a
    // portal tree and starts reading as a corrosion cast.
    tree: { hilum: [0.05, -0.80, -0.55], seeds: 2, spread: 0.9, gens: 3, steps: 5,
            stepK: 0.115, art: 0.030, vein: 0.040 } },

  { m: /^kidney-/, sheen: [0.68, 0.25],
    // A renal capsule is SMOOTH — the character here is the single sharp hilar
    // notch, not bumps. The notch is put on the face bean() already dents so the
    // vessels emerge from the slit a student can actually see.
    disp: { fine: 0.006, fineFreq: 15, lob: 0.009, lobFreq: 3.2, rim: 0.3,
            notch: { along: 'z', at: 0, w: 0.09, face: 'x', side: 1, depth: 0.34 } },
    tree: { hilum: [0.95, 0.0, 0.0], seeds: 2, spread: 1.45, gens: 3, steps: 5,
            stepK: 0.13, art: 0.026, vein: 0.034 } },

  { m: /^small-intestine$/, sheen: [0.72, 0.22],
    gut: { rings: 26, bulge: 0.10, taper: 0.10, fine: 0.055, fineFreq: 26,
           mesDir: [0, -1, 0], root: [0.05, -0.34, -0.62], skip: 0.11,
           arcade1: 1.7, arcade2: 0.75, rArc: 0.22, sweep: 2.42, drift: 2 } },

  { m: /^large-intestine$/, sheen: [0.70, 0.24],
    gut: { rings: 7, bulge: 0.13, taper: -0.06, fine: 0.05, fineFreq: 20,
           mesDir: [0, -1, 0], skip: 0.06, arcade1: 1.2, arcade2: 0.55,
           rArc: 0.16, sweep: 2.3, drift: 1 } },

  { m: /^stomach$/, sheen: [0.74, 0.22],
    disp: { fine: 0.010, fineFreq: 13, lob: 0.020, lobFreq: 3.0, rim: 0.6 },
    // bendZX makes +x the concave side, i.e. the lesser curvature — where the
    // gastric vessels actually run before wrapping onto the body.
    tree: { hilum: [0.88, 0.0, -0.12], seeds: 3, spread: 1.35, gens: 3, steps: 5,
            stepK: 0.14, art: 0.024, vein: 0.032 } },

  { m: /^spleen$/, sheen: [0.76, 0.20],
    disp: { fine: 0.010, fineFreq: 14, lob: 0.018, lobFreq: 3.4, rim: 0.5 },
    tree: { hilum: [0.72, -0.35, 0.0], seeds: 2, spread: 1.1, gens: 3, steps: 4,
            stepK: 0.17, art: 0.016, vein: 0.021 } },

  { m: /^lung-/, sheen: [0.52, 0.28],
    disp: { fine: 0.014, fineFreq: 16, lob: 0.020, lobFreq: 4.5, rim: 0.4 },
    // A frog lung is a trabeculated sac; what you see through the wall is a fine
    // capillary net, not named vessels. Hence many generations, tiny radii.
    tree: { hilum: [0.0, 0.0, 0.86], seeds: 2, spread: 1.5, gens: 3, steps: 4,
            stepK: 0.16, art: 0.013, vein: 0.017 } },

  { m: /^gall-bladder$/, sheen: [0.86, 0.16],
    disp: { fine: 0.011, fineFreq: 16, lob: 0.014, lobFreq: 4.0, rim: 0.3 },
    tree: { hilum: [0.0, 0.6, -0.7], seeds: 2, spread: 1.0, gens: 2, steps: 4,
            stepK: 0.2, art: 0.010, vein: 0.013 } },

  // Fat is the organ that most obviously looked injection-moulded. Real fat
  // bodies are a bunch of grapes: strong lobulation, no vessels worth drawing.
  { m: /^fat-body-/, kids: true,
    disp: { fine: 0.020, fineFreq: 9, lob: 0.075, lobFreq: 5.5, rim: 0.2 } },

  { m: /^(oesophagus|cloaca|urinary-bladder)$/,
    disp: { fine: 0.012, fineFreq: 14, lob: 0.014, lobFreq: 3.6, rim: 0.3 } },
  { m: /^frog-heart$/, sheen: [0.76, 0.22],
    disp: { fine: 0.008, fineFreq: 15, lob: 0.010, lobFreq: 4.0, rim: 0.2 } },
  { m: /^muscle-wall$/, disp: { fine: 0.009, fineFreq: 13, lob: 0.008, lobFreq: 2.2, rim: 0.2 } },
  { m: /^skin$/, disp: { fine: 0.010, fineFreq: 11, lob: 0.007, lobFreq: 2.0, rim: 0.2 } },

  /* --- mammalian heart -------------------------------------------------------- */
  // The filigree of small cardiac VEINS over the myocardium is the detail every
  // photograph of a real heart has and every model lacks. Arteries stay thin here
  // because heart.js already builds the named coronaries.
  { m: /^lv-free-wall$/, sheen: [0.62, 0.28],
    disp: { fine: 0.007, fineFreq: 13, lob: 0.008, lobFreq: 2.6, rim: 0.2 },
    tree: { hilum: [-0.15, 0.92, 0.55], seeds: 3, spread: 1.3, gens: 3, steps: 5,
            stepK: 0.11, art: 0.014, vein: 0.030 } },
  { m: /^rv-free-wall$/, sheen: [0.62, 0.28],
    disp: { fine: 0.007, fineFreq: 13, lob: 0.008, lobFreq: 2.6, rim: 0.2 },
    tree: { hilum: [0.25, 0.92, 0.6], seeds: 2, spread: 1.2, gens: 3, steps: 5,
            stepK: 0.12, art: 0.012, vein: 0.026 } },
  { m: /^(right|left)-atrium$/, sheen: [0.58, 0.30],
    disp: { fine: 0.010, fineFreq: 14, lob: 0.014, lobFreq: 3.4, rim: 0.3 },
    tree: { hilum: [0.0, -0.7, 0.5], seeds: 2, spread: 1.1, gens: 3, steps: 4,
            stepK: 0.16, art: 0.010, vein: 0.020 } },
  { m: /^(right|left)-auricle$/,
    disp: { fine: 0.012, fineFreq: 15, lob: 0.022, lobFreq: 4.2, rim: 0.8 } },
  { m: /^epicardial-fat$/, disp: { fine: 0.014, fineFreq: 7, lob: 0.055, lobFreq: 3.6, rim: 0.4 } },
  { m: /^pericardium$/, disp: { fine: 0.006, fineFreq: 9, lob: 0.014, lobFreq: 2.2, rim: 0.3 } },
];

/* Where connective tissue actually bridges. Explicit, not proximity-derived: a
 * strand in the wrong place is a lie a professor will spot instantly. */
const SUR_WEBS = {
  frog: [
    ['liver-right', 'stomach'], ['liver-left', 'stomach'], ['liver-median', 'gall-bladder'],
    ['stomach', 'spleen'], ['small-intestine', 'spleen'], ['small-intestine', 'large-intestine'],
    ['kidney-left', 'fat-body-left'], ['kidney-right', 'fat-body-right'],
    ['lung-left', 'frog-heart'], ['lung-right', 'frog-heart'],
    ['large-intestine', 'urinary-bladder'], ['cloaca', 'urinary-bladder'],
  ],
  heart: [
    ['pericardium', 'epicardial-fat'], ['epicardial-fat', 'lv-free-wall'],
    ['epicardial-fat', 'rv-free-wall'], ['right-atrium', 'svc'],
    ['left-atrium', 'left-auricle'],
  ],
};

function SUR_match(id) {
  for (const r of SUR_REC) if (r.m.test(id)) return r;
  return null;
}

/* ========================================================================== */
export function createSurfaceDetail(THREE, parts, specimenId, group) {
  const added = [];                 // decorative meshes ONLY — never part descriptors
  const owned = [];                 // {mesh} we must remove and dispose
  const sheenSaved = [];            // {mat, clearcoat, clearcoatRoughness}
  const projectors = new Map();     // partId -> projector (built once, after displacement)
  const tubes = new Map();          // partId -> {info, cfg}
  const byId = new Map();
  (parts || []).forEach((p) => { if (p && p.id && p.mesh) byId.set(p.id, p); });

  let density = 1;
  let displaced = false;
  let sheened = false;
  let tris = 0;

  /* --- step 1: silhouette ---------------------------------------------------- */
  function displaceAll() {
    if (displaced) return;
    displaced = true;
    let seed = 3.1;
    byId.forEach((p, id) => {
      const rec = SUR_match(id);
      if (!rec) return;
      const geo = p.mesh.geometry;
      if (!geo || !geo.attributes || !geo.attributes.position) return;
      seed += 7.13;
      if (rec.gut) {
        const info = SUR_tubeInfo(THREE, geo);
        if (info) {
          SUR_displaceTube(THREE, geo, info, rec.gut, seed);
          tubes.set(id, { info, cfg: rec.gut });
          return;
        }
        // Not a pristine TubeGeometry (pathology may have rebuilt it) — fall back
        // to the blob path rather than skipping the organ entirely.
        SUR_displaceBlob(THREE, geo, { fine: rec.gut.fine * 0.4, fineFreq: rec.gut.fineFreq, lob: 0.01, lobFreq: 3 }, seed);
        return;
      }
      if (rec.disp) SUR_displaceBlob(THREE, geo, rec.disp, seed);
      if (rec.kids) {
        // Fat bodies carry their finger lobes as children; lobulating only the
        // root would leave five smooth sausages sticking out of a bumpy bead.
        let k = 0;
        p.mesh.children.forEach((c) => {
          if (c.isMesh && c.geometry && c.geometry.attributes && c.geometry.attributes.position) {
            SUR_displaceBlob(THREE, c.geometry, rec.disp, seed + (++k) * 4.7);
          }
        });
      }
    });
  }

  /* --- step 2: serosal sheen ------------------------------------------------- */
  function sheenAll() {
    // Guarded against re-entry: sheenAll mutates the organ's own material and
    // saves the ORIGINAL clearcoat for dispose() to restore. A second run would
    // save the already-modified value as the "original" and dispose() would then
    // restore to the sheened value, never the true original. apply()'s owned.length
    // guard only covers the case where vessels were built; this covers the rest.
    if (sheened) return;
    sheened = true;
    byId.forEach((p, id) => {
      const rec = SUR_match(id);
      if (!rec || !rec.sheen) return;
      const m = p.mesh.material;
      if (!m || m.clearcoat == null) return;
      sheenSaved.push({ mat: m, cc: m.clearcoat, cr: m.clearcoatRoughness });
      // A peritoneal surface is wetter than the parenchyma under it. This is the
      // whole "glistening serosa" effect: no geometry, one clearcoat nudge.
      m.clearcoat = rec.sheen[0];
      m.clearcoatRoughness = rec.sheen[1];
      m.needsUpdate = true;
    });
  }

  /* --- step 3: vessels ------------------------------------------------------- */
  function attach(part, geo, color, tissueOpts) {
    if (!geo) return null;
    // Cloned per part, never shared: physio.js traverses part.mesh and lerps every
    // material colour it finds for pallor. One shared material would bleach the
    // vessels of every organ in the specimen the instant one went ischaemic.
    const m = new THREE.Mesh(geo, mat(THREE, color, tissueOpts));
    m.castShadow = false;
    m.receiveShadow = true;
    m.userData.SUR_decor = true;
    childMesh(part.mesh, m, 0, 0, 0);
    added.push(m);
    owned.push(m);
    return m;
  }

  function buildVessels() {
    byId.forEach((p, id) => {
      const rec = SUR_match(id);
      if (!rec) return;
      const bA = SUR_builder(), bV = SUR_builder();

      if (rec.gut) {
        const t = tubes.get(id);
        if (!t) return;
        SUR_gutTree(THREE, t.info, t.cfg, density, bA, bV);
      } else if (rec.tree) {
        let proj = projectors.get(id);
        if (!proj) {
          proj = SUR_projector(THREE, p.mesh.geometry);
          if (!proj) return;
          projectors.set(id, proj);
        }
        const s = rec.tree;
        const seed = id.length * 11.3 + (id.charCodeAt(0) % 17) * 3.7;
        // Arteries: straighter, finer, branch at an acute angle.
        SUR_seedTree(THREE, proj, bA, {
          ...s, tort: 0.30, split: 0.48, taper: 0.945,
        }, density, seed, s.art * proj.scale * 1.0);
        // Veins: wider, more tortuous, splayed wider, seeded a touch off the
        // arterial hilum so the pair runs together without co-linear z-fighting.
        SUR_seedTree(THREE, proj, bV, {
          ...s, hilum: [s.hilum[0] * 0.86, s.hilum[1] * 0.9 - 0.06, s.hilum[2] * 0.92],
          spread: (s.spread || 1) * 1.15, gens: Math.max(2, (s.gens || 3) - 1),
          tort: 0.62, split: 0.66, taper: 0.955,
        }, density * 0.8, seed + 101.7, s.vein * proj.scale * 1.0);
      } else return;

      tris += bA.tris + bV.tris;
      attach(p, SUR_finish(THREE, bA), SUR_ART,
        { tissue: 'vessel', rough: 0.40, clear: 0.62, clearRough: 0.22,
          sheen: 0xe07a64, transmission: 0.10, thickness: 0.22 });
      attach(p, SUR_finish(THREE, bV), SUR_VEIN,
        { tissue: 'vessel', rough: 0.50, clear: 0.44, clearRough: 0.34,
          sheen: 0x9a6a90, transmission: 0.06, thickness: 0.3 });
    });
  }

  /* --- step 4: membranes ------------------------------------------------------ */
  /* Two organs that lie against each other are joined by a few fine, slack,
   * translucent strands. Parented to the DEEPER part so a strand only appears once
   * that layer is exposed — and so lifting an organ drags its own adhesions with
   * it, which is what actually happens under a probe. */
  function nearestVertex(mesh, targetWorld, out) {
    const geo = mesh.geometry;
    const pa = geo && geo.attributes && geo.attributes.position;
    if (!pa) return false;
    mesh.updateMatrixWorld();
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const tl = targetWorld.clone().applyMatrix4(inv);
    const v = new THREE.Vector3();
    let bi = -1, bd = Infinity;
    const step = pa.count > 2200 ? 3 : 1;
    for (let i = 0; i < pa.count; i += step) {
      v.fromBufferAttribute(pa, i);
      const d = v.distanceToSquared(tl);
      if (d < bd) { bd = d; bi = i; }
    }
    if (bi < 0) return false;
    out.fromBufferAttribute(pa, bi);
    mesh.localToWorld(out);
    return true;
  }

  function buildWebs() {
    const list = SUR_WEBS[specimenId] || [];
    const n = Math.max(0, Math.round(2 * density));
    if (!n) return;
    if (group) group.updateMatrixWorld(true);
    const wa = new THREE.Vector3(), wb = new THREE.Vector3();
    const ca = new THREE.Vector3(), cb = new THREE.Vector3();
    list.forEach(([ida, idb], pi) => {
      const A = byId.get(ida), B = byId.get(idb);
      if (!A || !B || !A.mesh.geometry || !B.mesh.geometry) return;
      A.mesh.updateMatrixWorld(); B.mesh.updateMatrixWorld();
      if (!A.mesh.geometry.boundingSphere) A.mesh.geometry.computeBoundingSphere();
      if (!B.mesh.geometry.boundingSphere) B.mesh.geometry.computeBoundingSphere();
      ca.copy(A.mesh.geometry.boundingSphere.center); A.mesh.localToWorld(ca);
      cb.copy(B.mesh.geometry.boundingSphere.center); B.mesh.localToWorld(cb);
      if (!nearestVertex(A.mesh, cb, wa)) return;
      if (!nearestVertex(B.mesh, ca, wb)) return;
      const gap = wa.distanceTo(wb);
      if (gap > 1.6 || gap < 1e-4) return;          // not actually in contact

      const host = ((B.layer || 0) >= (A.layer || 0) ? B : A).mesh;
      host.updateMatrixWorld();
      const inv = new THREE.Matrix4().copy(host.matrixWorld).invert();
      // Directions take the linear part only — applying the full inverse to a
      // normal would drag the host's translation into it and tilt every ring.
      const invDir = new THREE.Matrix3().setFromMatrix4(inv);
      const b = SUR_builder();
      const up = new THREE.Vector3(0, 1, 0);
      const chord = new THREE.Vector3().subVectors(wb, wa);
      const sag = new THREE.Vector3().crossVectors(chord, up);
      if (sag.lengthSq() < 1e-8) sag.set(1, 0, 0);
      sag.normalize();
      const nrmDir = new THREE.Vector3().crossVectors(chord, sag).normalize();
      for (let s = 0; s < n; s++) {
        const off = (s - (n - 1) / 2) * gap * 0.16;
        const pts = [], nrms = [], rads = [];
        const steps = 5;
        for (let k = 0; k <= steps; k++) {
          const f = k / steps;
          const q = wa.clone().lerp(wb, f);
          q.addScaledVector(sag, off + Math.sin(Math.PI * f) * gap * 0.10 * (fbm(pi * 3.3 + s, f * 4, 1.7) - 0.3));
          q.addScaledVector(nrmDir, Math.sin(Math.PI * f) * gap * 0.06);
          pts.push(q.applyMatrix4(inv));
          nrms.push(nrmDir.clone().applyMatrix3(invDir).normalize());
          // Flared feet: connective tissue splays where it inserts, and that flare
          // is most of what makes a strand read as tissue instead of wire.
          rads.push(gap * 0.006 * (1 + 2.1 * Math.pow(Math.abs(f * 2 - 1), 3)));
        }
        SUR_emit(THREE, b, pts, nrms, rads);
      }
      tris += b.tris;
      const geo = SUR_finish(THREE, b);
      if (!geo) return;
      const m = new THREE.Mesh(geo, mat(THREE, SUR_WEB, {
        tissue: 'serous', trans: true, opacity: 0.38, rough: 0.34,
        transmission: 0.6, thickness: 0.1, side: THREE.DoubleSide, sheen: 0xfff0e4 }));
      m.material.depthWrite = false;
      m.castShadow = false;
      m.userData.SUR_decor = true;
      childMesh(host, m, 0, 0, 0);
      added.push(m); owned.push(m);
    });
  }

  /* --- public ---------------------------------------------------------------- */
  function clearDecor() {
    owned.forEach((m) => {
      if (m.parent) m.parent.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material && m.material.dispose) m.material.dispose();
    });
    owned.length = 0;
    added.length = 0;
    tris = 0;
  }

  function apply() {
    if (owned.length) return { tris, meshes: added.length };
    displaceAll();          // MUST precede createSoftBody — see the header
    sheenAll();
    buildVessels();
    buildWebs();
    return { tris, meshes: added.length };
  }

  return {
    added,                  // decorative meshes; empty until apply(). NOT part descriptors.
    apply,
    setVisible(on) { owned.forEach((m) => { m.visible = !!on; }); },
    /* Rebuilds only the decorative CHILD meshes. It never touches an organ's own
     * vertices, so it is safe to call at any time — including after softbody has
     * taken its rest snapshot. Displacement is not density-scaled and stays. */
    setDensity(d) {
      // Clamped at 1.5, not 2. The knob exists to scale DOWN for weak GPUs; above
      // 1.5 the frog crosses the triangle ceiling and the builder starts truncating
      // whichever organ happened to build last, which is worse than a cap.
      const nd = Math.max(0, Math.min(1.5, d == null ? 1 : d));
      if (nd === density && owned.length) return { tris, meshes: added.length };
      density = nd;
      if (!displaced) return { tris: 0, meshes: 0 };
      clearDecor();
      if (density > 0) { buildVessels(); buildWebs(); }
      return { tris, meshes: added.length };
    },
    get triangles() { return tris; },
    /* Removes the decoration and restores the clearcoat nudge. Vertex displacement
     * is deliberately NOT undone: softbody has already snapshotted the displaced
     * shape as rest, so restoring here would only fight it. loadSpecimen() rebuilds
     * the specimen from scratch, which is the real undo. */
    dispose() {
      clearDecor();
      sheenSaved.forEach((s) => { s.mat.clearcoat = s.cc; s.mat.clearcoatRoughness = s.cr; s.mat.needsUpdate = true; });
      sheenSaved.length = 0;
      sheened = false;   // sheen restored above; keep the guard consistent with state
      projectors.clear();
      tubes.clear();
      byId.clear();
    },
  };
}
