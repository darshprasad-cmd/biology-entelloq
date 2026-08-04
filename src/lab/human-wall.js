/*
 * human-wall.js — HW_build: the BODY WALL of the human torso prosection.
 *
 * This is the region the student actually cuts through — everything between the
 * skin (owned by the coordinator, human.js) and the body cavity. It contributes
 * three layers, from superficial to deep:
 *
 *   ctx.L.fat    — subcutaneous fat + superficial fascia (the pad that reflects
 *                  WITH the skin flap).
 *   ctx.L.muscle — the flat abdominal + chest muscles: rectus abdominis, external
 *                  oblique, pectoralis major, and suggested intercostals.
 *   ctx.L.frame  — the last barrier: the bony ribcage (12 rib pairs + sternum +
 *                  costal cartilages), the diaphragm, and the parietal serous
 *                  membranes (pleura in the chest, peritoneum in the abdomen).
 *
 * Concatenated into ONE module scope with anatomy.js / human.js, so the only
 * top-level name added is `HW_build`; every helper lives INSIDE it and the shared
 * toolkit (mat, tube, organ, fbm, displace, seal, childMesh, …) is used directly.
 *
 * Coordinate convention (un-rotated group; the coordinator lays it supine after):
 *   +z superior (head)   -z inferior (pelvis)
 *   +y ANTERIOR (front, toward camera, where the cavity opens)   -y posterior/spine
 *   -x body's LEFT   +x body's RIGHT
 * Everything is placed against the SHARED envelope via ctx.form(z) so the wall
 * wraps exactly the same body the viscera sit inside. Radial nesting is deliberate
 * and monotonic so a reflected layer always reveals the (smaller) layer beneath:
 *   skin(~1.0·hd) > fat(0.965) > muscle(0.88) > sternum/cartilage(0.84) >
 *   ribs(0.80) > pleura(0.77) > peritoneum(0.72) > viscera(inside 0.72).
 */

function HW_build(THREE, group, parts, add, ctx) {
  const F = ctx.form;                       // {hw, hd, cy} of the shared body at z
  const P = ctx.palette;
  const DS = THREE.DoubleSide;

  /* -- wall geometry helpers ------------------------------------------------ */

  // Anterior-surface height: given a superior-inferior z and a left-right x, the
  // y (antero-posterior) where a point at radial factor rf meets the FRONT of the
  // body envelope. This is how every flat wall structure is pressed onto the shared
  // torso instead of floating: pick x, get the y that keeps it on the curved wall.
  function surfaceY(z, x, rf) {
    const f = F(z);
    const xr = Math.max(-0.985, Math.min(0.985, x / (f.hw * rf)));
    return Math.sqrt(Math.max(0, 1 - xr * xr)) * f.hd * rf + f.cy;
  }

  // A point on the full elliptical cross-section at angle a (ex=cos a, ey=sin a;
  // anterior is ey>0, posterior ey<0). Ribs use this to sweep from spine to front.
  function wallXY(z, a, rf) {
    const f = F(z), ex = Math.cos(a), ey = Math.sin(a);
    return [ex * f.hw * rf, ey * f.hd * rf * (ey > 0 ? 1 : 0.9) + f.cy, z];
  }

  // A lofted curved SHELL pressed onto the anterior wall. fn(u,v)->{x,z} lays out
  // the sheet in the transverse/longitudinal plane; the y is solved from the
  // envelope so the sheet hugs the curve. rf may be a number or fn(u,v); bulge
  // domes it outward (muscle bellies); amp adds fbm lobulation. Returns a sealed,
  // uv'd geometry (uv = u,v so the tissue micro-relief maps have somewhere to sit).
  function shellGrid(nu, nv, fn, opt) {
    opt = opt || {};
    const g = new THREE.BufferGeometry();
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= nu; i++) {
      for (let j = 0; j <= nv; j++) {
        const u = i / nu, v = j / nv;
        const q = fn(u, v);
        const f = F(q.z);
        const rf = (typeof opt.rf === 'function') ? opt.rf(u, v) : (opt.rf != null ? opt.rf : 0.9);
        const xr = Math.max(-0.985, Math.min(0.985, q.x / (f.hw * rf)));
        const ey = Math.sqrt(Math.max(0, 1 - xr * xr));
        const bl = opt.bulge ? ((typeof opt.bulge === 'function') ? opt.bulge(u, v) : opt.bulge) : 0;
        const lob = opt.amp
          ? (fbm(q.x * (opt.freq || 2) + (opt.seed || 0), q.z * (opt.freq || 2) + (opt.seed || 0) * 0.7, v * 2.5 + (opt.seed || 0)) - 0.5) * opt.amp
          : 0;
        const yy = ey * (1 + bl) * f.hd * rf + f.cy + lob + (opt.yOff || 0);
        pos.push(q.x, yy, q.z);
        uv.push(u, v);
      }
    }
    const st = nv + 1;
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const p0 = i * st + j, p1 = p0 + 1, p2 = p0 + st, p3 = p2 + 1;
        idx.push(p0, p2, p1, p1, p2, p3);
      }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    seal(g);
    return g;
  }

  // Raw tube geometry along a point path (for ribs/cartilage which get MERGED into
  // one pickable body, so we need geometry, not a Mesh).
  function tubeGeo(pts, rad, rSeg) {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    return new THREE.TubeGeometry(curve, Math.max(14, pts.length * 2), rad, rSeg || 8, false);
  }

  // Merge many geometries into ONE BufferGeometry so a multi-piece structure (the
  // whole ribcage) is a SINGLE, fully hoverable pick target — dissect.js raycasts a
  // part's own geometry non-recursively, so every rib must live in the carrier mesh,
  // not in children. Copies position + normal + index only (these merged parts are
  // opaque bone/cartilage carrying no uv-mapped detail; their materials use noTex).
  function mergeGeoms(list) {
    let vc = 0, ic = 0;
    list.forEach((g) => {
      if (!g.attributes.normal) g.computeVertexNormals();
      vc += g.attributes.position.count;
      ic += g.index ? g.index.count : g.attributes.position.count;
    });
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3);
    const idx = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic);
    let vo = 0, io = 0;
    list.forEach((g) => {
      const p = g.attributes.position, n = g.attributes.normal;
      pos.set(p.array, vo * 3); nor.set(n.array, vo * 3);
      if (g.index) { const gi = g.index.array; for (let k = 0; k < gi.length; k++) idx[io + k] = gi[k] + vo; io += gi.length; }
      else { for (let k = 0; k < p.count; k++) idx[io + k] = vo + k; io += p.count; }
      vo += p.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }

  // Attach a set of decorative fibre / tendon polylines as (non-picked) children.
  function fibres(parent, lines, color, rad, o) {
    lines.forEach((pts) => {
      const t = tube(THREE, color, pts, rad, Object.assign({ rad: 6, seg: Math.max(10, pts.length * 3), noTex: true }, o || {}));
      parent.add(t);
    });
  }

  // A midline incision guide (x=0) running down the anterior wall between two z.
  function midline(zTop, zBot, rf, n) {
    const arr = [];
    for (let i = 0; i <= n; i++) { const z = zTop + (zBot - zTop) * i / n; arr.push([0, surfaceY(z, 0, rf), z]); }
    return arr;
  }

  /* ======================================================================== */
  /* LAYER 1 — SUBCUTANEOUS FAT + SUPERFICIAL FASCIA                          */
  /* The hypodermis: a lobulated pale-yellow blanket under the skin over the   */
  /* whole anterior trunk. It is what "comes with" the skin flap when the      */
  /* student reflects it. Genuinely lobulated (fat globules bounded by fascial */
  /* septa) via fbm displacement — not a flat sheet. Fat-class material: soft  */
  /* waxy subsurface, some transmission, high roughness, warm sheen.           */
  /* ======================================================================== */
  const FAT_RF = 0.965;
  const fatGeo = shellGrid(46, 22, (u, v) => {
    const z = 5.0 + u * (-10.6);               // just below the clavicles down to the pubis
    const f = F(z);
    return { x: (v * 2 - 1) * f.hw * 0.82, z }; // wide anterior arc, wrapping toward the flanks
  }, { rf: FAT_RF, amp: 0.13, freq: 1.9, seed: 3.1 });
  const fat = new THREE.Mesh(fatGeo, mat(THREE, P.fat, {
    tissue: 'fat', rough: 0.74, trans: 0.36, thickness: 0.5, clear: 0.3,
    sheen: 0xffe08a, sheenAmt: 0.5, side: DS,
  }));
  // Umbilicus: a puckered dimple in the fat/skin at the midline, ~level L3–L4.
  const navel = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12),
    mat(THREE, 0x8a6a4a, { rough: 0.8, clear: 0.1, noTex: true }));
  navel.scale.set(1, 0.5, 1);
  childMesh(fat, navel, 0, surfaceY(-1.35, 0, FAT_RF) - 0.06, -1.35);
  add({
    id: 'subcutaneous-fat', name: 'Subcutaneous fat & superficial fascia',
    layer: ctx.L.fat, system: 'integument', cuttable: true, detachable: false,
    note: 'The lobulated fatty hypodermis and its fascial sheet. It reflects together with the skin flap — draw the flap aside and the yellow fat comes with it, exposing the muscle beneath.',
    mesh: fat,
    incision: midline(2.6, -5.4, FAT_RF, 6),
  });

  /* ======================================================================== */
  /* LAYER 2 — THE FLAT MUSCLES OF THE BODY WALL                              */
  /* Fibre DIRECTION is the teaching content and is kept right: rectus runs    */
  /* vertically, external oblique infero-medially ("hands in pockets"),        */
  /* pectoralis fans from the sternum/clavicle to converge on the humerus.     */
  /* ======================================================================== */
  const MUS_RF = 0.88;
  const musOpts = (col, seed) => ({ color: col, seed });

  // --- Rectus abdominis (paired straight muscles) -------------------------
  // Each is a vertical strap from the pubic crest (z≈-4.1) up to the 5th–7th
  // costal cartilages and xiphoid (z≈+1.4), a little wider above than below.
  // Three TENDINOUS INTERSECTIONS cross it — at the umbilicus, at the level of the
  // xiphoid, and midway between — dividing the belly into the visible "six-pack".
  const RECTUS_INTER = [-1.35, 0.0, 1.15];      // z of the three transverse intersections
  function rectusBulge(u, v) {
    const z = -4.1 + u * 5.5;
    let g = 1;
    RECTUS_INTER.forEach((zi) => { g -= 0.72 * Math.exp(-Math.pow((z - zi) / 0.15, 2)); });
    return 0.075 * Math.max(0.12, g) * Math.sin(v * Math.PI);   // belly domes; grooves at intersections
  }
  function buildRectus(side) {              // side: -1 left, +1 right
    const geo = shellGrid(30, 8, (u, v) => {
      const z = -4.1 + u * 5.5;
      const xMed = 0.16, xLat = 0.5 + 0.5 * u;   // wider superiorly (toward costal margin)
      const x = side * (xMed + (xLat - xMed) * v);
      return { x, z };
    }, { rf: MUS_RF, bulge: rectusBulge, amp: 0.02, freq: 3, seed: side > 0 ? 5 : 6 });
    const m = new THREE.Mesh(geo, mat(THREE, 0x9c3f38, { tissue: 'muscle', rough: 0.56, sheen: 0xcf6a5a, side: DS }));
    // three tendinous intersections as pale transverse bands across this belly
    RECTUS_INTER.forEach((zi) => {
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const x = side * (0.18 + (0.5 + 0.5 * ((zi + 4.1) / 5.5)) * (k / 6));
        pts.push([x, surfaceY(zi, x, MUS_RF) + 0.02, zi]);
      }
      fibres(m, [pts], 0xcbb7a0, 0.03, { rough: 0.68, clear: 0.2 });
    });
    // vertical muscle fibres, a few subtle strands so the run of the muscle reads
    const fl = [];
    for (let s = 0; s < 3; s++) {
      const pts = [];
      for (let k = 0; k <= 10; k++) {
        const z = -3.8 + (5.0) * k / 10;
        const x = side * (0.3 + s * 0.24);
        pts.push([x, surfaceY(z, x, MUS_RF) + 0.03, z]);
      }
      fl.push(pts);
    }
    fibres(m, fl, 0x8a352f, 0.016, { rough: 0.6 });
    add({
      id: side > 0 ? 'rectus-abdominis-right' : 'rectus-abdominis-left',
      name: side > 0 ? 'Rectus abdominis — right' : 'Rectus abdominis — left',
      layer: ctx.L.muscle, system: 'muscular', cuttable: true, detachable: false,
      note: 'The paired "six-pack" straps, enclosed in the rectus sheath and separated at the midline by the linea alba. The three tendinous intersections are what create the segmented relief; fibres run vertically, pubis to costal margin.',
      mesh: m,
      // one incision guide (a paramedian vertical) so the muscle can be divided and reflected
      incision: side > 0
        ? (function () { const a = []; for (let i = 0; i <= 5; i++) { const z = 1.2 - i * (5.0 / 5); const x = 0.33; a.push([x, surfaceY(z, x, MUS_RF), z]); } return a; })()
        : undefined,
    });
    return m;
  }
  const rectusR = buildRectus(1);
  buildRectus(-1);
  // Linea alba: the pale tendinous midline raphé where the two sheaths interlace,
  // running xiphoid to pubis — a decorative child riding the shared midline edge.
  {
    const pts = [];
    for (let k = 0; k <= 12; k++) { const z = 1.4 - k * (5.5 / 12); pts.push([0, surfaceY(z, 0, MUS_RF) + 0.02, z]); }
    fibres(rectusR, [pts], 0xd8cbb4, 0.035, { rough: 0.66, clear: 0.25 });
  }

  // --- External oblique (paired flank sheets) -----------------------------
  // Lateral to rectus; its fibres run INFERO-MEDIALLY (down and forward, the
  // "hands into your pockets" direction), decussating into the aponeurosis that
  // covers the rectus. Wraps from the mid-axillary flank round toward the front.
  function buildOblique(side) {
    const geo = shellGrid(26, 12, (u, v) => {
      const z = 2.6 + u * (-6.1);                 // ribs 5–7 down to the iliac crest
      const f = F(z);
      const xIn = 0.78, xOut = Math.min(f.hw * 0.86, 1.95);
      const x = side * (xIn + (xOut - xIn) * v);
      return { x, z };
    }, { rf: MUS_RF, amp: 0.03, freq: 2.4, seed: side > 0 ? 7 : 8 });
    const m = new THREE.Mesh(geo, mat(THREE, 0x94413a, { tissue: 'muscle', rough: 0.58, sheen: 0xc2665a, side: DS }));
    // infero-medial fibre strands: high-and-lateral to low-and-medial
    const fl = [];
    for (let s = 0; s < 5; s++) {
      const zTop = 2.2 - s * 0.7, zBot = zTop - 2.6;
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8, z = zTop + (zBot - zTop) * t;
        const x = side * (1.85 - t * 1.0);        // moves medially as it descends
        pts.push([x, surfaceY(z, x, MUS_RF) + 0.03, z]);
      }
      fl.push(pts);
    }
    fibres(m, fl, 0x7f352f, 0.018, { rough: 0.6 });
    add({
      id: side > 0 ? 'external-oblique-right' : 'external-oblique-left',
      name: side > 0 ? 'External oblique — right' : 'External oblique — left',
      layer: ctx.L.muscle, system: 'muscular', cuttable: true, detachable: false,
      note: 'The outermost flank muscle. Its fibres run infero-medially — the direction your hands go into your front pockets — and end in a broad aponeurosis that sweeps over the rectus to the linea alba.',
      mesh: m,
    });
  }
  buildOblique(1); buildOblique(-1);

  // --- Pectoralis major (paired fan-shaped chest muscles) -----------------
  // Broad origin from the clavicle, sternum and upper costal cartilages;
  // the fibres CONVERGE laterally and twist to a narrow tendon on the humerus,
  // so the muscle fans out toward the arm. Sits over the upper thorax.
  function buildPec(side) {
    const zIns = 4.15, xIns = side * 2.35;          // humeral insertion (superolateral)
    const geo = shellGrid(20, 14, (u, v) => {
      const zMed = 2.05 + v * 3.05;                 // medial origin spread: sternum(low) to clavicle(high)
      const xMed = side * (0.22 + 0.05 * v);
      const z = zMed + (zIns - zMed) * u;           // converge toward the insertion
      const x = xMed + (xIns - xMed) * u;
      return { x, z };
    }, { rf: 0.87, bulge: (u, v) => 0.05 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI), amp: 0.025, freq: 2.2, seed: side > 0 ? 9 : 10 });
    const m = new THREE.Mesh(geo, mat(THREE, 0xa5443b, { tissue: 'muscle', rough: 0.55, sheen: 0xd06a5a, side: DS }));
    // converging fibre fan from the spread medial origin to the single insertion
    const fl = [];
    for (let s = 0; s <= 4; s++) {
      const zMed = 2.2 + s * 0.68, xMed = side * 0.3;
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const t = k / 6;
        const z = zMed + (zIns - zMed) * t, x = xMed + (xIns * 0.92 - xMed) * t;
        pts.push([x, surfaceY(z, x, 0.87) + 0.03, z]);
      }
      fl.push(pts);
    }
    fibres(m, fl, 0x8c372f, 0.02, { rough: 0.6 });
    add({
      id: side > 0 ? 'pectoralis-major-right' : 'pectoralis-major-left',
      name: side > 0 ? 'Pectoralis major — right' : 'Pectoralis major — left',
      layer: ctx.L.muscle, system: 'muscular', cuttable: true, detachable: false,
      note: 'The fan of the anterior chest. A broad origin from clavicle, sternum and costal cartilages converges — twisting on itself — to a narrow tendon on the humerus, so it both flexes and adducts the arm.',
      mesh: m,
    });
  }
  buildPec(1); buildPec(-1);

  // --- Intercostal muscles (suggested) ------------------------------------
  // Thin muscular strips filling the spaces BETWEEN adjacent ribs on the
  // antero-lateral chest. Merged per side into one hoverable strap.
  function buildIntercostals(side) {
    const strips = [];
    for (let r = 1; r < 7; r++) {                   // spaces 1–6, over the pectoral region
      const zHi = 5.05 - (r - 1) * 0.365 - 0.45;
      const zLo = 5.05 - r * 0.365 - 0.45;
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        const z = zHi + (zLo - zHi) * t;
        const x = side * (0.6 + t * 0.9);           // slant across the space, antero-laterally
        pts.push([x, surfaceY(z, x, 0.82) + 0.02, z]);
      }
      strips.push(tubeGeo(pts, 0.05, 6));
    }
    const m = new THREE.Mesh(mergeGeoms(strips),
      mat(THREE, 0xa85a4c, { tissue: 'muscle', rough: 0.6, sheen: 0xc27060, side: DS, noTex: true }));
    add({
      id: side > 0 ? 'intercostals-right' : 'intercostals-left',
      name: side > 0 ? 'Intercostal muscles — right' : 'Intercostal muscles — left',
      layer: ctx.L.muscle, system: 'muscular', cuttable: true, detachable: false,
      note: 'The short muscle slips slung between neighbouring ribs. External and internal layers run at right angles to each other and move the ribs in quiet breathing.',
      mesh: m,
    });
  }
  buildIntercostals(1); buildIntercostals(-1);

  /* ======================================================================== */
  /* LAYER 3 — THE FRAME: RIBCAGE, DIAPHRAGM, PARIETAL SEROUS MEMBRANES       */
  /* The last barrier before the viscera. Counts and curves are kept exact —  */
  /* a professor will count ribs: 12 pairs, ribs 1–7 "true" (own cartilage to */
  /* the sternum), 8–10 "false" (cartilage joins the arch above → the costal  */
  /* margin), 11–12 "floating" (no anterior attachment).                       */
  /* ======================================================================== */
  const RIB_RF = 0.80, CART_RF = 0.84;

  // Half-width of the sternum at height z (manubrium wide, body tapering, xiphoid
  // narrow) — used both for the plate and as the cartilage attachment line.
  function sternHalf(z) {
    if (z > 4.55) return 0.52 - (z - 4.55) * 0.15;         // manubrium, narrowing to the jugular notch
    if (z > 1.95) return 0.30 + (z - 1.95) * 0.085;        // body
    return Math.max(0.14, 0.14 + (z - 1.4) * 0.29);        // xiphoid process
  }

  // Build one rib (posterior→anterior sweep) and, for ribs 1–10, its costal
  // cartilage. Returns { rib, cart|null }. side: +1 right, -1 left.
  function buildRib(r, side) {
    const zPost = 5.25 - r * 0.365;                         // vertebral end: rib 1 highest
    const drop = 0.42 + r * 0.03;                           // ribs slope down as they run forward
    let aEnd;                                               // how far round the front the bony rib reaches
    if (r < 7) aEnd = 0.86 - r * 0.02;                      // true ribs: near the sternal border
    else if (r < 10) aEnd = 0.70 - (r - 7) * 0.05;          // false ribs: a little shorter
    else aEnd = 0.18 - (r - 10) * 0.12;                     // floating ribs: end in the flank
    const aStart = -Math.PI / 2 + 0.12;                     // just off the spine
    const N = 28, pts = [];
    for (let k = 0; k <= N; k++) {
      const u = k / N;
      const aR = aStart + (aEnd - aStart) * u;               // right-side sweep: spine round to the front
      // cos() is EVEN, so multiplying the ANGLE by side does NOT flip x — the left
      // ribs would stack on the +x (right) half, leaving the body's left bare.
      // Reflect across the antero-posterior axis instead (a -> pi - a): that negates
      // x (to the body's LEFT) while preserving the anterior/posterior sweep of sin().
      const a = side > 0 ? aR : Math.PI - aR;
      const z = zPost - drop * smooth(u);
      pts.push(wallXY(z, a, RIB_RF));
    }
    const rib = tubeGeo(pts, r < 10 ? 0.075 : 0.06, 8);
    let cart = null;
    if (r < 10) {
      const last = pts[pts.length - 1];
      let tgt, mid;
      if (r < 7) {                                           // true rib → its own cartilage to the sternum
        const zc = 4.85 - r * 0.5;
        const xe = side * (sternHalf(zc) + 0.06);
        tgt = [xe, surfaceY(zc, Math.abs(xe), CART_RF), zc];
        mid = [(last[0] + xe) / 2, surfaceY((last[2] + zc) / 2, Math.abs((last[0] + xe) / 2), CART_RF + 0.015), (last[2] + zc) / 2];
      } else {                                               // false rib → sweeps up-and-medial into the costal margin
        const xe = side * (0.32 + (9 - r) * 0.2);
        const zc = 1.62 + (9 - r) * 0.13;
        tgt = [xe, surfaceY(zc, Math.abs(xe), CART_RF), zc];
        mid = [side * (Math.abs(last[0]) * 0.72), surfaceY((last[2] + zc) / 2 + 0.1, Math.abs(last[0]) * 0.72, CART_RF + 0.01), (last[2] + zc) / 2 + 0.1];
      }
      cart = tubeGeo([last, mid, tgt], 0.06, 7);
    }
    return { rib, cart };
  }

  const ribsL = [], ribsR = [], carts = [];
  for (let r = 0; r < 12; r++) {
    const R = buildRib(r, 1), L = buildRib(r, -1);
    ribsR.push(R.rib); ribsL.push(L.rib);
    if (R.cart) carts.push(R.cart);
    if (L.cart) carts.push(L.cart);
  }
  const boneMat = () => mat(THREE, P.bone, { rough: 0.66, clear: 0.18, sheen: 0xf2ead6, noTex: true });
  add({
    id: 'ribcage-right', name: 'Ribs — right (1–12)', layer: ctx.L.frame, system: 'skeletal',
    cuttable: false, detachable: false,
    note: 'Twelve ribs curving from the thoracic vertebrae round to the front, sloping downward as they go. Ribs 1–7 are "true", 8–10 "false", 11–12 "floating". You do not cut bone — the chest is opened through the cartilage and sternum.',
    mesh: new THREE.Mesh(mergeGeoms(ribsR), boneMat()),
  });
  add({
    id: 'ribcage-left', name: 'Ribs — left (1–12)', layer: ctx.L.frame, system: 'skeletal',
    cuttable: false, detachable: false,
    note: 'The left twelve ribs, mirror of the right, articulating behind with the vertebral column and enclosing the thoracic cavity with the heart and lungs.',
    mesh: new THREE.Mesh(mergeGeoms(ribsL), boneMat()),
  });

  // Costal cartilages (both sides + the costal-margin arch): the paler, faintly
  // bluish bars bridging ribs to the sternum. Cutting them (with the sternum) is
  // how the anterior chest wall is lifted off.
  add({
    id: 'costal-cartilage', name: 'Costal cartilages & costal margin', layer: ctx.L.frame, system: 'skeletal',
    cuttable: true, detachable: false,
    note: 'The springy hyaline bars joining ribs 1–7 to the sternum; the cartilages of ribs 7–10 fuse into the costal margin, the arch you can feel under the lower chest. Divide them to swing the chest wall open.',
    mesh: new THREE.Mesh(mergeGeoms(carts),
      mat(THREE, 0xcdd6cf, { rough: 0.5, clear: 0.4, trans: 0.18, thickness: 0.4, sheen: 0xeef2e6, noTex: true })),
    incision: [
      [0.3, surfaceY(1.62, 0.3, CART_RF), 1.62],
      [0.62, surfaceY(1.88, 0.62, CART_RF), 1.88],
      [0.95, surfaceY(2.2, 0.95, CART_RF), 2.2],
    ],
  });

  // Sternum: manubrium + body + xiphoid, a flat plate in the anterior midline.
  // Cuttable — a median sternotomy (splitting it vertically) is the classic way
  // into the mediastinum; give it that incision guide.
  const sternGeo = shellGrid(26, 8, (u, v) => {
    const z = 1.4 + u * 3.7;                                // xiphoid tip up to the jugular notch
    return { x: (v * 2 - 1) * sternHalf(z), z };
  }, { rf: 0.84, bulge: 0.03, amp: 0.015, freq: 2, seed: 2 });
  const sternum = new THREE.Mesh(sternGeo, mat(THREE, P.bone, { rough: 0.6, clear: 0.24, sheen: 0xf4ecda, side: DS, noTex: true }));
  // sternal angle (manubriosternal joint) as a faint transverse ridge at ~z 4.5
  {
    const pts = [];
    for (let k = 0; k <= 5; k++) { const x = (k / 5 * 2 - 1) * sternHalf(4.5); pts.push([x, surfaceY(4.5, x, 0.84) + 0.02, 4.5]); }
    fibres(sternum, [pts], 0xdcd3bf, 0.02, { rough: 0.66 });
  }
  add({
    id: 'sternum', name: 'Sternum (manubrium, body, xiphoid)', layer: ctx.L.frame, system: 'skeletal',
    cuttable: true, detachable: true,
    note: 'The breastbone: manubrium above (with the jugular notch), the long body, and the small xiphoid tip. Splitting it in the midline — a median sternotomy — opens the mediastinum onto the heart and great vessels.',
    mesh: sternum,
    incision: midline(5.0, 1.5, 0.84, 5),
  });

  // --- Diaphragm ----------------------------------------------------------
  // The domed muscular sheet dividing thorax from abdomen. Convex UPWARD (+z)
  // into the chest, peaking under the heart, attaching peripherally to the lower
  // ribs, xiphoid and lumbar spine. Right dome sits higher (the liver beneath it).
  const dB = F(1.2);
  const domeGeo = (function () {
    const g = new THREE.BufferGeometry();
    const R = 30, K = 15, pos = [], uv = [], idx = [];
    for (let i = 0; i <= R; i++) {
      for (let j = 0; j <= K; j++) {
        const theta = i / R * Math.PI * 2, rho = j / K;
        const ex = Math.cos(theta), ey = Math.sin(theta);
        const x = ex * dB.hw * 0.85 * rho;
        const y = ey * dB.hd * 0.85 * rho + dB.cy;
        let z = 1.12 + 1.16 * (1 - rho * rho);             // dome rising to ~2.3 at the centre
        z += 0.16 * (1 - rho * rho) * Math.max(0, ex);     // right hemidiaphragm higher
        z -= 0.12 * Math.exp(-Math.pow(rho / 0.28, 2));    // slight central-tendon flattening
        z += (fbm(x + 20, y, rho * 3) - 0.5) * 0.05;
        pos.push(x, y, z); uv.push(rho, i / R);
      }
    }
    const st = K + 1;
    for (let i = 0; i < R; i++) for (let j = 0; j < K; j++) {
      const p0 = i * st + j, p1 = p0 + 1, p2 = p0 + st, p3 = p2 + 1;
      idx.push(p0, p2, p1, p1, p2, p3);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); seal(g); return g;
  })();
  const diaphragm = new THREE.Mesh(domeGeo, mat(THREE, 0x9c4a40, { tissue: 'muscle', rough: 0.58, sheen: 0xc26a5a, side: DS }));
  // central tendon: the pale trefoil aponeurosis at the top of the dome
  const tendon = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14),
    mat(THREE, 0xe6dcc4, { rough: 0.62, clear: 0.3, sheen: 0xf4ecd8, noTex: true }));
  tendon.geometry.scale(0.8, 0.62, 0.14); seal(tendon.geometry);
  childMesh(diaphragm, tendon, 0.15, dB.cy, 2.18, Math.PI / 2, 0, 0);
  add({
    id: 'diaphragm', name: 'Diaphragm', layer: ctx.L.frame, system: 'muscular',
    cuttable: true, detachable: false,
    note: 'The dome of respiration, convex up into the chest. Its muscular rim springs from the lower ribs, xiphoid and lumbar spine to the central tendon; contracting, it flattens and draws air in. The right dome rides higher, over the liver.',
    mesh: diaphragm,
    incision: [[-1.6, surfaceY(1.3, -1.6, 0.85), 1.3], [0, dB.cy + 0.9, 1.7], [1.6, surfaceY(1.3, 1.6, 0.85), 1.3]],
  });

  // --- Parietal serous membranes ------------------------------------------
  // Thin, glistening, highly translucent linings on the INNER surface of the wall.
  // They are the final barrier: once opened, the organs beneath suddenly read
  // sharply. serous-class material — transmission ~0.85, high clearcoat, DoubleSide.
  const serosaMat = () => mat(THREE, P.serosa, {
    tissue: 'serous', trans: 0.85, transmission: 0.85, thickness: 0.2,
    clear: 0.85, clearRough: 0.16, rough: 0.28, sheen: 0xeafaff, side: DS,
  });
  // Parietal pleura — lines each half of the thoracic cavity (a separate pleural
  // sac each side; the mediastinum lies between). Just inside the ribs.
  function buildPleura(side) {
    const geo = shellGrid(22, 10, (u, v) => {
      const z = 5.3 + u * (-3.7);                          // apex above the 1st rib down to the diaphragm
      const f = F(z);
      const xIn = side * 0.35, xOut = side * Math.min(f.hw * 0.72, 1.85);
      return { x: xIn + (xOut - xIn) * v, z };
    }, { rf: 0.77, amp: 0.01, freq: 2.5, seed: side > 0 ? 11 : 12 });
    const m = new THREE.Mesh(geo, serosaMat());
    m.material.depthWrite = false;                          // it is a glaze; let the wall behind read through
    add({
      id: side > 0 ? 'parietal-pleura-right' : 'parietal-pleura-left',
      name: side > 0 ? 'Parietal pleura — right' : 'Parietal pleura — left',
      layer: ctx.L.frame, system: 'respiratory', cuttable: true, detachable: false,
      note: 'The glistening serous film lining the chest wall and reflecting over the lung. Nick it and the pleural cavity is open — the collapsed lung and its potential space lie directly beneath.',
      mesh: m,
      incision: side > 0 ? [[0.9, surfaceY(4.6, 0.9, 0.77), 4.6], [0.9, surfaceY(3.4, 0.9, 0.77), 3.4], [0.9, surfaceY(2.3, 0.9, 0.77), 2.3]] : undefined,
    });
  }
  buildPleura(1); buildPleura(-1);

  // Parietal peritoneum — the continuous serous lining of the abdominal wall,
  // the innermost sheet over the whole belly. Cutting it is the moment the
  // abdominal viscera below suddenly come into focus.
  const peritGeo = shellGrid(42, 16, (u, v) => {
    const z = 1.1 + u * (-6.6);                             // costal margin down to the pubis
    const f = F(z);
    return { x: (v * 2 - 1) * f.hw * 0.74, z };
  }, { rf: 0.72, amp: 0.012, freq: 2.2, seed: 13 });
  const peritoneum = new THREE.Mesh(peritGeo, serosaMat());
  peritoneum.material.depthWrite = false;
  add({
    id: 'parietal-peritoneum', name: 'Parietal peritoneum', layer: ctx.L.frame, system: 'digestive',
    cuttable: true, detachable: false,
    note: 'The thin, wet serous membrane lining the whole abdominal wall. It is the last layer over the cavity — open it in the midline and the liver, stomach and coils of gut beneath read sharply for the first time.',
    mesh: peritoneum,
    incision: midline(0.9, -5.2, 0.72, 7),
  });
}
