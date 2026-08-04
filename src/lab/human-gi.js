/*
 * human-gi.js — HG_build: the ABDOMINAL GI VISCERA region of the human torso.
 *
 * Concatenated into one module scope with anatomy.js (the shared toolkit: mat,
 * organ, lobe, bag, sac, tube, vessel, childMesh, displace, seal, fbm, vnoise) and
 * human.js (the coordinator, which owns the body form and calls this builder). This
 * file adds exactly ONE top-level name — HG_build — and keeps every helper inside it.
 *
 * It contributes the abdominal cavity: the superficial organs seen the instant the
 * peritoneum opens (ctx.L.viscera — liver, falciform ligament, stomach, greater
 * omentum, spleen) and the deeper gut hidden beneath the omental apron and the
 * liver's visceral surface (ctx.L.gi — the gallbladder under the liver, duodenum,
 * jejunum/ileum, the colonic frame with its caecum and appendix, and the pancreas).
 * The gallbladder sits in ctx.L.gi to match the coordinator's layer plan (human.js):
 * it lies on the visceral (under) surface of the liver, so it is properly exposed a
 * layer deeper, once the liver-level viscera are reflected.
 *
 * Coordinate convention of the un-rotated group (the coordinator lays it supine after):
 *   +z superior (head)   -z inferior (pelvis)     +y ANTERIOR (cavity opens here,
 *   toward the camera)   -y posterior (spine, retroperitoneum)   -x body's LEFT
 *   +x body's RIGHT.  The abdomen runs z ~ +1.2 (just under the diaphragm) down to
 *   z ~ -4.5 (pelvic brim). ctx.form(z) gives the body envelope so every organ sits
 *   INSIDE this shared body rather than floating in an invented space.
 *
 * QUADRANTS (the teaching backbone — Moore's Clinically Oriented Anatomy, TeachMe-
 * Anatomy, Gray's): liver + gallbladder fill the RIGHT hypochondrium (upper right);
 * stomach + spleen the LEFT hypochondrium (upper left); the small-bowel coils heap
 * in the centre, framed by the colon; caecum + appendix sit in the RIGHT iliac fossa
 * (lower right); the sigmoid loops out of the LEFT iliac fossa (lower left) into the
 * pelvis. Anterior/posterior order is kept honest too: the omentum drapes anteriorly
 * over everything; the pancreas and duodenum are retroperitoneal, plastered to the
 * back wall behind the stomach.
 */

function HG_build(THREE, group, parts, add, ctx) {
  const P = ctx.palette;
  const V = ctx.L.viscera;      // layer 4 — first organs seen on opening the belly
  const G = ctx.L.gi;           // layer 5 — deeper gut, under the omentum

  /* A gut tube that is visibly SACCULATED — the pouches (haustra) between the
   * teniae are how you tell large bowel from small bowel at a glance. Build a
   * TubeGeometry along the path, then scale each ring radially about its own centre
   * on the curve by a periodic bulge so constrictions pinch it into haustra.
   * (TubeGeometry is ring-major: tub+1 rings, each of rad+1 verts — same indexing
   * vessel() relies on.) */
  function haustralTube(pts, r, pouches, color, o) {
    o = o || {};
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
    const tub = o.seg || Math.max(48, pts.length * 12), rad = o.rad || 12;
    const g = new THREE.TubeGeometry(curve, tub, r, rad, false);
    const pos = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const ring = Math.floor(i / (rad + 1));
      const t = tub ? ring / tub : 0;
      curve.getPoint(t, c);
      v.fromBufferAttribute(pos, i);
      // 1 at a pouch, pinched between; a touch of noise so pouches are not identical.
      const bulge = 1 + 0.17 * (0.5 + 0.5 * Math.cos(t * Math.PI * 2 * pouches))
                      + (fbm(v.x * 3, v.y * 3, v.z * 3) - 0.5) * 0.05;
      v.sub(c).multiplyScalar(bulge).add(c);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    seal(g);
    return new THREE.Mesh(g, mat(THREE, color, { tissue: 'hollow', rough: 0.46, clear: 0.55,
      clearRough: 0.32, sheen: 0xdcc2a2, sheenAmt: 0.5, ...(o.mat || {}) }));
  }

  // A small glandular lobule bump, for decorating the pancreas surface.
  function lobule(color, s, seed) {
    return organ(THREE, color, s, s * 0.8, s * 0.9, { amp: 0.18, freq: 6, seed, rough: 0.5, sheen: 0xe8cfa0 });
  }

  /* =====================================================================
   * LAYER ctx.L.viscera — what the belly shows the instant it is opened
   * ===================================================================== */

  /* ---- LIVER --------------------------------------------------------------
   * The largest gland (~1.5 kg), wedged under the right dome of the diaphragm.
   * A big RIGHT lobe fills the right hypochondrium; a smaller, flatter LEFT lobe
   * tapers across the midline over the stomach. On the diaphragmatic surface the
   * two are demarcated by the FALCIFORM LIGAMENT. Dark red-brown with a glossy,
   * wet Glisson's capsule. It sits high and anterior (z ~ +0.3..+1.3, y ~ +0.5). */
  const liverMat = { rough: 0.4, clear: 0.74, clearRough: 0.26, sheen: 0x9a4b45, sheenAmt: 0.6 };

  const liverR = organ(THREE, P.liver, 1.12, 0.74, 1.02, { amp: 0.09, freq: 2.4, seed: 1, ...liverMat });
  liverR.position.set(0.86, 0.5, 0.55);
  liverR.rotation.set(-0.12, 0.08, -0.14);            // domed surface faces antero-superiorly
  add({
    id: 'liver-right-lobe', name: 'Right lobe of liver', layer: V, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'The largest lobe, filling the right hypochondrium under the diaphragm. Its sharp inferior border follows the right costal margin; lift it to find the gallbladder and the porta on its visceral surface.',
    mesh: liverR,
  });

  const liverL = lobe(THREE, 0x743a2e, 1.75, 0.98, 0.44, { amp: 0.07, freq: 2.3, seed: 2, ...liverMat });
  liverL.position.set(-0.5, 0.72, 0.55);
  liverL.rotation.set(-0.1, -1.46, 0.06);             // leaf points LEFT, tapering over the stomach
  add({
    id: 'liver-left-lobe', name: 'Left lobe of liver', layer: V, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'Smaller and flatter, reaching left across the midline to overlie the stomach. The falciform ligament marks its boundary with the right lobe on the diaphragmatic surface.',
    mesh: liverL,
  });

  // Falciform ligament — a thin peritoneal fold in the median plane tethering the
  // liver to the anterior abdominal wall, carrying the ligamentum teres (the
  // obliterated umbilical vein) in its free lower edge.
  const falcGeo = new THREE.PlaneGeometry(1.15, 0.5, 12, 6);
  {
    const fp = falcGeo.attributes.position, fv = new THREE.Vector3();
    for (let i = 0; i < fp.count; i++) {
      fv.fromBufferAttribute(fp, i);
      fp.setXYZ(i, fv.x, fv.y, (vnoise(fv.x * 3 + 2, fv.y * 3, 0) - 0.5) * 0.06);  // faint ripple
    }
    seal(falcGeo);
  }
  const falciform = new THREE.Mesh(falcGeo, mat(THREE, P.fascia,
    { rough: 0.66, clear: 0.3, side: THREE.DoubleSide, sheen: 0xf0e8da }));
  falciform.position.set(0.05, 0.86, 0.5);
  falciform.rotation.set(0, Math.PI / 2, 0);          // stand it up in the median (y-z) plane
  // ligamentum teres in the free (antero-inferior) edge
  const teres = tube(THREE, 0xd9c2ae, [[0, -0.26, 0.55], [0, -0.24, 0.0], [0, -0.22, -0.5]], 0.03,
    { rough: 0.55, rad: 6, seg: 10 });
  falciform.add(teres);
  add({
    id: 'falciform-ligament', name: 'Falciform ligament', layer: V, system: 'digestive',
    cuttable: true, detachable: false,
    note: 'A sickle-shaped peritoneal fold anchoring the liver to the anterior wall and dividing right from left lobe anteriorly. Its free border carries the ligamentum teres — the remnant of the fetal umbilical vein.',
    mesh: falciform,
  });

  // Gallbladder — a small green, bile-stained, translucent pear tucked on the
  // visceral (under-)surface of the right lobe, its fundus projecting just past the
  // inferior liver border at the tip of the 9th costal cartilage.
  const gall = sac(THREE, 0x4f9a44, 0.62, 0.24,
    { amp: 0.08, freq: 3.4, seed: 3, rough: 0.32, clear: 0.85, trans: 0.5, thickness: 0.5,
      atten: 0x4f9a44, attenDist: 0.9, sheen: 0x9fe08a, side: THREE.DoubleSide });
  gall.position.set(0.52, 0.4, 0.0);
  gall.rotation.set(-0.55, 0.1, 0.2);                 // fundus points antero-inferiorly, neck up to the porta
  // cystic duct running up toward the common bile duct at the porta
  const cystic = tube(THREE, 0x6a8f52, [[0, 0.05, 0.28], [0.02, 0.16, 0.5], [0.06, 0.22, 0.72]], 0.035,
    { rough: 0.45, rad: 6, seg: 10 });
  gall.add(cystic);
  add({
    id: 'gallbladder', name: 'Gallbladder', layer: G, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'A thin-walled green sac on the underside of the liver that stores and concentrates bile. Its fundus peeks below the liver\'s inferior margin; the cystic duct joins the common hepatic duct at the porta.',
    mesh: gall,
  });

  /* ---- STOMACH ------------------------------------------------------------
   * A J-shaped muscular bag in the left hypochondrium/epigastrium. The fundus
   * balloons up-and-left under the left dome of the diaphragm; the body descends;
   * the greater curvature is the long convex lower-left border (the omentum hangs
   * from it), the lesser curvature the short concave upper-right border. It is
   * continuous with the oesophagus above (cardia) and the duodenum on the right
   * (pylorus). bag() gives the fat fundus / narrow pylorus taper and the J bend. */
  const stomach = bag(THREE, P.stomach, 1.95, 0.66,
    { amp: 0.07, freq: 2.3, seed: 11, rough: 0.5, clear: 0.5, clearRough: 0.34, sheen: 0xe6c0a4, bend: 0.5 });
  stomach.position.set(-0.5, 0.5, 0.42);
  stomach.rotation.set(0.12, 2.12, 0.52);             // fundus up-left, pylorus curving to the right
  // abdominal oesophagus entering at the cardia (a short stub through the hiatus)
  const oeso = tube(THREE, 0xcaa98e, [[0, 0.0, 0.98], [0.03, 0.06, 1.2], [0.05, 0.1, 1.45]], 0.13,
    { rough: 0.55, clear: 0.35, sheen: 0xe0c6ac, rad: 8, seg: 12 });
  stomach.add(oeso);
  add({
    id: 'stomach', name: 'Stomach', layer: V, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'A distensible muscular bag in the upper left. Fundus and greater curvature bulge down-left; the lesser curvature and pylorus sweep up-right to the duodenum. Its three muscle coats (including the unique oblique layer) churn food into chyme.',
    mesh: stomach,
  });

  /* ---- GREATER OMENTUM ----------------------------------------------------
   * A fatty, fenestrated "policeman of the abdomen" apron of four peritoneal
   * layers, hanging from the greater curvature of the stomach DOWN over the coils
   * of small bowel. Translucent, lace-veined with fat. It is the very first thing
   * lifted to reach the gut — so it is the anterior-most, detachable sheet. */
  const NX = 30, NZ = 34;
  const gx0 = -1.75, gx1 = 1.75, gz0 = -3.35, gz1 = 0.42;
  const oPos = [], oCol = [], oIdx = [];
  const fatA = new THREE.Color(0xe9d68c), fatB = new THREE.Color(0xd6bb6a), lace = new THREE.Color(0xcf9a72);
  for (let iz = 0; iz <= NZ; iz++) {
    const tz = iz / NZ, z = gz0 + (gz1 - gz0) * tz;
    for (let ix = 0; ix <= NX; ix++) {
      const tx = ix / NX, x = gx0 + (gx1 - gx0) * tx;
      let y = 0.9;
      y += Math.sin(tx * Math.PI) * Math.sin(tz * Math.PI) * 0.16;        // gentle anterior belly toward the camera
      y += (fbm(x * 1.5 + 4, z * 1.5, 2) - 0.5) * 0.44;                   // rumpled peritoneal folds
      y -= (1 - tz) * 0.12;                                              // the free inferior edge drapes lower
      oPos.push(x, y, z);
      const m = fbm(x * 2.2 + 7, z * 2.2, 3);
      const c = fatA.clone().lerp(fatB, m);
      const vein = Math.abs(Math.sin(x * 3.1 + z * 2.0) + 0.4 * Math.sin(x * 1.3 - z * 3.7));
      if (vein > 1.02) c.lerp(lace, Math.min(1, (vein - 1.02) * 2.6));    // fat-embedded vascular arcades
      oCol.push(c.r, c.g, c.b);
    }
  }
  const strideO = NX + 1;
  for (let iz = 0; iz < NZ; iz++) {
    for (let ix = 0; ix < NX; ix++) {
      const a = iz * strideO + ix, b = a + 1, cc = a + strideO, d = cc + 1;
      oIdx.push(a, cc, b, b, cc, d);
    }
  }
  const oGeo = new THREE.BufferGeometry();
  oGeo.setAttribute('position', new THREE.Float32BufferAttribute(oPos, 3));
  oGeo.setAttribute('color', new THREE.Float32BufferAttribute(oCol, 3));
  oGeo.setIndex(oIdx);
  seal(oGeo);
  const omentum = new THREE.Mesh(oGeo, mat(THREE, 0xffffff,
    { vcol: true, tissue: 'fat', trans: true, opacity: 0.6, rough: 0.72, clear: 0.28,
      transmission: 0.24, thickness: 0.4, side: THREE.DoubleSide }));
  omentum.material.depthWrite = false;
  omentum.renderOrder = 2;
  add({
    id: 'greater-omentum', name: 'Greater omentum', layer: V, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'A fatty apron of peritoneum hanging from the greater curvature of the stomach over the intestines. Lift it first — it drapes and adheres to inflamed viscera, walling off infection, and hides the whole small bowel beneath.',
    mesh: omentum,
  });

  /* ---- SPLEEN -------------------------------------------------------------
   * A fist-sized, dark purple-red lymphoid organ high in the LEFT hypochondrium,
   * lying against the diaphragm along ribs 9-11 — posterolateral, tucked BEHIND
   * the stomach (so posterior, -y, far -x, upper +z). Its long axis follows the
   * 10th rib. Friable and highly vascular. */
  const spleen = organ(THREE, P.spleen, 0.5, 0.64, 0.84,
    { amp: 0.08, freq: 2.6, seed: 4, rough: 0.42, clear: 0.6, clearRough: 0.32, sheen: 0x9a4a62 });
  spleen.position.set(-1.66, -0.72, 0.66);
  spleen.rotation.set(0.15, 0.28, 0.34);              // long axis along the left 10th rib
  add({
    id: 'spleen', name: 'Spleen', layer: V, system: 'circulatory',
    cuttable: true, detachable: true,
    note: 'The largest lymphoid organ, filtering blood and recycling red cells, sitting behind the stomach against ribs 9-11. Soft and very vascular — a classic source of catastrophic bleeding in blunt trauma. Its notched anterior border and hilum face the stomach.',
    mesh: spleen,
  });

  /* =====================================================================
   * LAYER ctx.L.gi — the deeper gut, revealed once the omentum is lifted
   * ===================================================================== */

  /* ---- DUODENUM -----------------------------------------------------------
   * The first, C-shaped part of the small bowel, ~25 cm and retroperitoneal
   * (fixed to the back wall, so it sits deep, -y). Its C-loop clasps the head of
   * the pancreas on the RIGHT: superior (D1) off the pylorus, descending (D2) down
   * the right, horizontal (D3) crossing the midline, ascending (D4) up to the
   * duodenojejunal flexure where the mobile jejunum begins. */
  const duod = haustralTube(
    [[0.2, 0.32, 0.16], [0.9, 0.18, 0.02], [1.2, -0.32, -0.4], [1.14, -0.46, -1.02],
     [0.6, -0.5, -1.28], [-0.08, -0.5, -1.22], [-0.46, -0.42, -0.82]],
    0.17, 5, 0xc7a482, { rad: 12, mat: { rough: 0.46, sheen: 0xdcc2a2 } });
  add({
    id: 'duodenum', name: 'Duodenum', layer: G, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'The C-shaped first part of the small intestine, curled around the head of the pancreas. Retroperitoneal and fixed; the bile and pancreatic ducts open into its second part at the major duodenal papilla.',
    mesh: duod,
  });

  /* ---- JEJUNUM + ILEUM ----------------------------------------------------
   * ~6 m of mobile small bowel slung on a fan-shaped mesentery, heaped in coils
   * that fill the central and lower abdomen, framed by the colon. Jejunum coils
   * lie upper-left, ileum coils lower-right, ending at the ileocaecal junction. */
  const si = [[-0.46, -0.3, -0.82]];                  // continue from the duodenojejunal flexure
  const rows = 5;
  for (let r = 0; r < rows; r++) {
    const zc = -1.05 - r * 0.42;
    const dir = r % 2 === 0 ? -1 : 1;                 // serpentine sweep, alternating each row
    const xA = 1.2 * dir, xB = -1.2 * dir;
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const x = xA + (xB - xA) * t;
      const zz = zc + Math.sin(t * Math.PI * 3 + r) * 0.15;
      const y = 0.14 + Math.sin(t * Math.PI * 4 + r * 1.3) * 0.13;   // coils weave in depth too
      si.push([x, y, zz]);
    }
  }
  si.push([0.85, 0.02, -3.05], [1.2, -0.06, -3.2]);   // dip toward the ileocaecal junction (lower right)
  const smallInt = tube(THREE, P.intestine, si, 0.19,
    { tissue: 'hollow', rough: 0.46, clear: 0.55, clearRough: 0.32, sheen: 0xdcc2a2, seg: 260, rad: 11 });
  // a couple of mesenteric arterial arcades looping through the root to the coils
  [[-0.2, -0.55, -1.4], [0.1, -0.5, -2.0], [-0.1, -0.5, -2.6]].forEach((root, k) => {
    const arc = tube(THREE, 0xbf5142,
      [root, [root[0] + (k - 1) * 0.5, root[1] + 0.35, root[2] + 0.25], si[8 + k * 8] || si[10]], 0.028,
      { rough: 0.5, rad: 6, seg: 18 });
    smallInt.add(arc);
  });
  add({
    id: 'small-intestine', name: 'Small intestine (jejunum & ileum)', layer: G, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'Six metres of coiled, mobile bowel on a fan-shaped mesentery where nearly all nutrients are absorbed. Jejunum coils lie upper-left with a thicker wall and taller folds; the narrower ileum coils lower-right and ends at the ileocaecal valve.',
    mesh: smallInt,
  });

  /* ---- LARGE INTESTINE ----------------------------------------------------
   * The colonic FRAME around the small bowel: wider, sacculated (haustra), and a
   * touch paler/greyer, with fatty appendices on its surface. Caecum + appendix in
   * the right iliac fossa; ascending colon up the right to the hepatic flexure;
   * transverse colon slung across (sagging in the middle) to the higher splenic
   * flexure; descending colon down the left; sigmoid S-loop into the pelvis. */
  const colonCol = 0xc9b79d;                          // pale grey-tan — distinct from the pinker small bowel

  // Caecum — the blind pouch at the start of the colon, right iliac fossa.
  const caecum = organ(THREE, colonCol, 0.46, 0.5, 0.6,
    { amp: 0.12, freq: 3, seed: 20, tissue: 'hollow', rough: 0.46, clear: 0.5, sheen: 0xdcc2a2 });
  caecum.position.set(1.42, 0.04, -3.42);
  add({
    id: 'caecum', name: 'Caecum', layer: G, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'The blind pouch where the large intestine begins, in the right iliac fossa. The ileum enters through the ileocaecal valve; the three teniae coli converge on the root of the appendix at its base.',
    mesh: caecum,
  });

  // Vermiform appendix — a narrow blind diverticulum off the caecum.
  const appendix = tube(THREE, 0xc6b096,
    [[1.34, -0.02, -3.62], [1.18, -0.08, -3.92], [0.98, -0.06, -4.18], [0.86, 0.0, -4.36]], 0.075,
    { tissue: 'hollow', rough: 0.48, clear: 0.5, sheen: 0xd8bfa0, rad: 8, seg: 22 });
  add({
    id: 'appendix', name: 'Vermiform appendix', layer: G, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'A narrow, worm-like blind tube of gut-associated lymphoid tissue hanging off the caecum. Follow a tenia coli to find its base; its inflammation is appendicitis, the commonest abdominal surgical emergency.',
    mesh: appendix,
  });

  // Ascending colon — up the right flank to the hepatic (right colic) flexure.
  const ascending = haustralTube(
    [[1.44, 0.1, -3.02], [1.56, 0.18, -2.2], [1.58, 0.22, -1.2], [1.5, 0.24, -0.35], [1.34, 0.36, -0.18]],
    0.28, 5, colonCol, { rad: 12 });
  add({
    id: 'ascending-colon', name: 'Ascending colon', layer: G, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'Runs up the right side, retroperitoneal, from the caecum to the hepatic flexure tucked under the right lobe of the liver. Wider than small bowel and pouched into haustra by the shortened teniae coli.',
    mesh: ascending,
  });

  // Transverse colon — slung across the abdomen on the transverse mesocolon,
  // sagging inferiorly in the middle, from the hepatic flexure up to the higher
  // splenic flexure. The greater omentum hangs from it.
  const transverse = haustralTube(
    [[1.34, 0.4, -0.2], [0.7, 0.5, -0.5], [0.0, 0.54, -0.72], [-0.72, 0.5, -0.42], [-1.42, 0.42, -0.02]],
    0.27, 7, colonCol, { rad: 12 });
  add({
    id: 'transverse-colon', name: 'Transverse colon', layer: G, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'The most anterior and mobile part of the colon, slung on the transverse mesocolon and sagging in the midline. It crosses from the hepatic flexure below the liver to the higher splenic flexure by the spleen.',
    mesh: transverse,
  });

  // Descending colon — down the left flank from the splenic flexure.
  const descending = haustralTube(
    [[-1.5, 0.36, 0.0], [-1.66, 0.26, -0.9], [-1.68, 0.22, -1.8], [-1.56, 0.18, -2.6]],
    0.26, 5, colonCol, { rad: 12 });
  add({
    id: 'descending-colon', name: 'Descending colon', layer: G, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'Runs down the left side, retroperitoneal, from the splenic flexure to the left iliac fossa. Narrower than the transverse colon, it delivers increasingly solid faeces to the sigmoid.',
    mesh: descending,
  });

  // Sigmoid colon — an S-shaped, mobile loop on its own mesocolon, out of the left
  // iliac fossa and dipping into the pelvis toward the rectum.
  const sigmoid = haustralTube(
    [[-1.5, 0.12, -2.7], [-1.16, 0.06, -3.2], [-1.36, 0.0, -3.68], [-0.62, -0.04, -3.86],
     [0.0, 0.04, -4.16], [0.2, 0.14, -4.4]],
    0.25, 5, colonCol, { rad: 12 });
  add({
    id: 'sigmoid-colon', name: 'Sigmoid colon', layer: G, system: 'digestive',
    cuttable: true, detachable: true,
    note: 'An S-shaped loop on a long mesentery in the left iliac fossa, leading into the pelvis to the rectum. Its mobility lets it twist on itself — a sigmoid volvulus — and it is the commonest site of diverticular disease.',
    mesh: sigmoid,
  });

  /* ---- PANCREAS -----------------------------------------------------------
   * A soft, lobulated, retroperitoneal gland lying TRANSVERSELY across the back
   * wall (deep, -y, behind the stomach). Its HEAD nestles in the C of the duodenum
   * on the right; the neck, body and TAIL run up-and-left to reach the hilum of the
   * spleen. Both an exocrine (digestive enzymes) and endocrine (islet) organ. */
  const pancPts = [[0.5, -0.86, -0.55], [0.15, -0.9, -0.42], [-0.42, -0.94, -0.26],
                   [-1.0, -0.88, -0.04], [-1.44, -0.8, 0.22]];
  const pancreas = vessel(THREE, P.pancreas, pancPts, 0.3, 0.14,
    { tissue: 'parenchyma', rough: 0.5, clear: 0.4, clearRough: 0.4, sheen: 0xe8cfa0, rad: 12, seg: 40 });
  // lobulated surface: small glandular bumps studded along the body
  pancPts.forEach((pt, i) => {
    if (i === 0 || i === pancPts.length - 1) return;
    childMesh(pancreas, lobule(P.pancreas, 0.16 - i * 0.015, 30 + i),
      pt[0], pt[1] + 0.1, pt[2]);
    childMesh(pancreas, lobule(P.pancreas, 0.13, 40 + i),
      (pt[0] + pancPts[i + 1][0]) / 2, pt[1] + 0.06, (pt[2] + pancPts[i + 1][2]) / 2);
  });
  add({
    id: 'pancreas', name: 'Pancreas', layer: G, system: 'digestive',
    cuttable: true, detachable: false,
    note: 'A soft, lobulated retroperitoneal gland lying transversely behind the stomach — head in the duodenal C, tail at the splenic hilum. Its exocrine enzymes and endocrine islets (insulin, glucagon) make it both a digestive and a hormonal organ.',
    mesh: pancreas,
  });
}
