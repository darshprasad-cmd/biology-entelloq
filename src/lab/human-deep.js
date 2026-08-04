/*
 * human-deep.js — HD_build: the RETROPERITONEAL + PELVIC region (layer ctx.L.deep).
 *
 * Concatenated into one module scope with anatomy.js (the shared toolkit) and
 * human.js (the coordinator, which owns the body form and calls this builder).
 * Every helper below is declared INSIDE HD_build so the only top-level name this
 * file adds is HD_build itself.
 *
 * These are the deepest structures — the ones revealed LAST, once the gut has been
 * lifted off its mesentery. Almost everything here is RETROPERITONEAL: it lies
 * behind the peritoneum, plastered to the posterior body wall (near -y, against the
 * spine), and it stays put when the intestines are drawn aside. The one exception
 * is the bladder, which is subperitoneal in the ANTERIOR pelvis (near +y, low z).
 *
 * Coordinate convention of the un-rotated group (human.js lays it supine after):
 *   +z superior (head)         -z inferior (pelvis)
 *   +y ANTERIOR (cavity opens toward the camera)   -y posterior (spine / retroperitoneum)
 *   -x body's LEFT             +x body's RIGHT
 * Organs are placed with ctx.form(z) so they sit INSIDE this shared body.
 *
 * The two relationships an examiner always checks, and which are built in exactly:
 *   1. The AORTA lies to the LEFT of the midline; the IVC lies to its RIGHT.
 *   2. The RIGHT kidney sits LOWER than the left — the liver, above it, pushes it
 *      down (the left has only the smaller spleen above).
 */

function HD_build(THREE, group, parts, add, ctx) {
  const P = ctx.palette;
  const DEEP = ctx.L.deep;            // this whole region sits at the deepest layer

  /* Retroperitoneal structures ride the posterior wall. The abdominal cavity's
   * posterior surface at mid-abdomen is near y = cy - hd ~ -1.6; the great vessels
   * lie right on the vertebral bodies (~y -1.0) and the kidneys just anterolateral
   * to them (~y -0.8). Keeping every organ near these depths reads as "against the
   * back", the whole point of the word retroperitoneal. */

  /* ================= KIDNEYS ================================================ *
   * Paired, bean-shaped, dark red-brown, high on the posterior wall and clearly
   * LATERAL to the midline (they flank the vertebral column and the great vessels).
   * The concave HILUM faces medially — it transmits, from front to back, the renal
   * Vein, the renal Artery and the renal Pelvis (the "VAP" rule). The RIGHT kidney
   * is set ~0.6 unit lower than the left because the bulk of the liver sits on it.
   *
   * bean() builds the dent on its +x face and (with bend<0) makes its -x border
   * convex. That is exactly a LEFT kidney (hilum medial=+x, lateral border=-x). The
   * RIGHT kidney is the same body rotated pi about its long axis, which mirrors x —
   * moving the hilum to its medial (-x) side — while preserving superior/inferior. */
  const KID = { rough: 0.44, clear: 0.6, clearRough: 0.28, sheen: 0xb0574d, sheenAmt: 0.55 };
  function hilumBundle(k) {
    // Decorative renal pelvis + vein/artery stubs, at the medial dent (+x local),
    // pointing toward the midline. Vein anterior (+y) to artery, per the VAP order.
    const pelvis = organ(THREE, 0xd6c3a8, 0.13, 0.1, 0.18, { amp: 0.05, rough: 0.5, clear: 0.4, seed: 3 });
    childMesh(k, pelvis, 0.3, -0.02, 0, 0, 0, 0.3);
    const rv = tube(THREE, P.vessel_v, [[0.26, 0.08, -0.03], [0.44, 0.06, -0.03], [0.6, 0.05, -0.02]], 0.06,
      { rough: 0.46, rad: 7, seg: 10 });
    const ra = tube(THREE, P.vessel_a, [[0.27, -0.04, 0.05], [0.46, -0.03, 0.05], [0.62, -0.02, 0.05]], 0.045,
      { rough: 0.44, rad: 7, seg: 10 });
    k.add(rv); k.add(ra);
  }
  function makeKidney(side, cx, cy, cz, seed) {
    const k = bean(THREE, P.kidney, 0.85, 0.32, 0.24, { ...KID, amp: 0.05, bend: -0.14, seed });
    hilumBundle(k);
    k.position.set(cx, cy, cz);
    if (side > 0) k.rotation.z = Math.PI;   // mirror the right kidney's hilum to -x (medial)
    k.rotation.x = -0.06;                    // a whisper of the true oblique lie
    return k;
  }
  const kidneyL = makeKidney(-1, -1.05, -0.8, 0.15, 31);
  const kidneyR = makeKidney(1, 1.05, -0.8, -0.45, 37);
  add({
    id: 'kidney-left', name: 'Left kidney', layer: DEEP, system: 'excretory',
    cuttable: true, detachable: true,
    note: 'Retroperitoneal, at roughly T12-L3. Its concave hilum faces medially and transmits, front to back, the renal vein, renal artery and pelvis. Sits a little HIGHER than the right.',
    mesh: kidneyL,
  });
  add({
    id: 'kidney-right', name: 'Right kidney', layer: DEEP, system: 'excretory',
    cuttable: true, detachable: true,
    note: 'Set lower than the left because the liver sits on it — the classic asymmetry. Retroperitoneal, with the hilum facing medially toward the IVC.',
    mesh: kidneyR,
  });

  /* ================= ADRENAL (SUPRARENAL) GLANDS =========================== *
   * Flattened, ochre-yellow endocrine caps on the SUPEROMEDIAL pole of each kidney,
   * separated from it by fascia. The right is pyramidal and more medial (draining
   * straight into the IVC); the left is semilunar/crescentic. Cortex makes steroids,
   * medulla makes catecholamines. Kept as their own parts — an examiner asks for
   * them by name and they are removed independently of the kidney. */
  const adrenalL = organ(THREE, 0xd9c07e, 0.32, 0.13, 0.24, { amp: 0.07, rough: 0.5, clear: 0.4, sheen: 0xf0dca0, seed: 5 });
  adrenalL.position.set(-0.74, -0.86, 1.02);
  adrenalL.rotation.set(0.1, 0, 0.35);
  add({
    id: 'adrenal-left', name: 'Left suprarenal (adrenal) gland', layer: DEEP, system: 'endocrine',
    cuttable: true, detachable: true,
    note: 'A semilunar yellow gland capping the upper pole of the left kidney. Its cortex secretes steroids, its medulla adrenaline — an endocrine organ, not a urinary one.',
    mesh: adrenalL,
  });
  const adrenalR = organ(THREE, 0xd9c07e, 0.26, 0.15, 0.26, { amp: 0.08, rough: 0.5, clear: 0.4, sheen: 0xf0dca0, seed: 6 });
  adrenalR.position.set(0.66, -0.9, 0.48);
  adrenalR.rotation.set(0.1, 0, -0.2);
  add({
    id: 'adrenal-right', name: 'Right suprarenal (adrenal) gland', layer: DEEP, system: 'endocrine',
    cuttable: true, detachable: true,
    note: 'Pyramidal and more medial than the left, wedged between the kidney and the IVC, into which its main vein drains directly.',
    mesh: adrenalR,
  });

  /* ================= URETERS =============================================== *
   * Thin muscular tubes carrying urine from each renal pelvis down the posterior
   * wall (running on psoas major, near -y), over the pelvic brim, then sweeping
   * ANTERIORLY to enter the bladder base. They narrow at three points where stones
   * lodge: the pelvi-ureteric junction, the pelvic brim, and the vesico-ureteric
   * junction. At the brim each ureter crosses ANTERIOR to the common iliac
   * bifurcation — "water under the bridge". Pale, not vascular red. */
  const uretMat = { rough: 0.5, clear: 0.4, sheen: 0xe6dcc4, rad: 8, seg: 40 };
  const ureterL = tube(THREE, 0xcdbca4, [
    [-0.72, -0.82, 0.12], [-0.72, -0.88, -0.6], [-0.66, -0.9, -1.6],
    [-0.6, -0.86, -2.6], [-0.5, -0.72, -3.4], [-0.38, -0.35, -4.2], [-0.28, 0.06, -4.75],
  ], 0.055, uretMat);
  add({
    id: 'ureter-left', name: 'Left ureter', layer: DEEP, system: 'excretory',
    cuttable: true, detachable: false,
    note: 'A muscular tube on the posterior wall. It crosses the pelvic brim in front of the common iliac vessels and enters the bladder obliquely — a valve that stops reflux.',
    mesh: ureterL,
    incision: [[-0.72, -0.88, -0.6], [-0.6, -0.86, -2.6], [-0.38, -0.35, -4.2]],
  });
  const ureterR = tube(THREE, 0xcdbca4, [
    [0.72, -0.84, -0.48], [0.7, -0.9, -1.2], [0.66, -0.9, -2.2],
    [0.58, -0.8, -3.1], [0.48, -0.58, -3.7], [0.36, -0.22, -4.35], [0.26, 0.06, -4.78],
  ], 0.055, uretMat);
  add({
    id: 'ureter-right', name: 'Right ureter', layer: DEEP, system: 'excretory',
    cuttable: true, detachable: false,
    note: 'Mirror of the left, descending from the lower-lying right kidney. Its three physiological constrictions are where a calculus impacts and pain refers loin-to-groin.',
    mesh: ureterR,
    incision: [[0.7, -0.9, -1.2], [0.58, -0.8, -3.1], [0.36, -0.22, -4.35]],
  });

  /* ================= URINARY BLADDER ======================================= *
   * The one ANTERIOR pelvic organ here: a distensible muscular (detrusor) sac in
   * the midline low pelvis, behind the pubic symphysis (near +y, z ~ -5). The two
   * ureters enter its base and the urethra leaves its neck; the smooth triangle
   * between those three openings is the trigone. Empty it hides in the pelvis; full
   * it climbs above the pubis. Pale and thin-walled — built translucent. */
  const bladder = bag(THREE, 0xccb69e, 0.7, 0.66,
    { bend: 0.06, amp: 0.05, rough: 0.5, clear: 0.5, trans: 0.32, thickness: 0.6, atten: 0xd8c0a8, sheen: 0xe6d2b8, seed: 41 });
  bladder.position.set(0, 0.5, -4.95);
  bladder.rotation.set(-0.4, 0, 0);       // apex tips antero-superiorly, base postero-inferior
  // urethral neck: a short stub leaving the base inferiorly toward the pelvic floor
  const neck = tube(THREE, 0xc4ad94, [[0, -0.02, -0.62], [0, -0.05, -0.86], [0, -0.06, -1.05]], 0.09,
    { rough: 0.5, clear: 0.4, rad: 8, seg: 10 });
  bladder.add(neck);
  add({
    id: 'urinary-bladder', name: 'Urinary bladder', layer: DEEP, system: 'excretory',
    cuttable: true, detachable: true,
    note: 'A distensible detrusor-muscle sac in the anterior pelvis, behind the pubic symphysis. The trigone — between the two ureteric orifices and the urethral opening — stays smooth while the rest folds into rugae.',
    mesh: bladder,
  });

  /* ================= ABDOMINAL AORTA ======================================= *
   * The great artery, descending in the posterior midline but a touch to the LEFT
   * (x slightly negative), on the front of the lumbar vertebrae. Bright arterial
   * red. It gives, in order: the unpaired COELIAC TRUNK (~T12) and SUPERIOR
   * MESENTERIC artery (~L1) forward to the gut, the paired RENAL arteries out to the
   * kidneys (~L1/2), then BIFURCATES at ~L4 into the two COMMON ILIAC arteries. The
   * trunk is the one pickable body; every branch hangs off it as a child. */
  const aorta = vessel(THREE, P.vessel_a, [
    [-0.2, -0.92, 1.6], [-0.24, -0.98, 0.7], [-0.26, -1.0, -0.3],
    [-0.28, -1.0, -1.4], [-0.3, -0.98, -2.6], [-0.32, -0.95, -3.5],
  ], 0.2, 0.15, { rough: 0.46, clear: 0.5, sheen: 0xd85a48, rad: 12, seg: 48 });
  const branch = (pts, r) => aorta.add(tube(THREE, P.vessel_a, pts, r, { rough: 0.46, sheen: 0xd85a48, rad: 8, seg: 16 }));
  branch([[-0.22, -0.9, 1.15], [-0.18, -0.55, 1.2], [-0.12, -0.28, 1.18]], 0.07);               // coeliac trunk (anterior)
  branch([[-0.24, -0.96, 0.78], [-0.14, -0.55, 0.6], [-0.06, -0.28, 0.2], [-0.02, -0.18, -0.4]], 0.075); // SMA (anterior, descending)
  branch([[-0.25, -1.0, 0.15], [-0.5, -0.9, 0.15], [-0.74, -0.82, 0.15]], 0.065);               // left renal artery
  branch([[-0.22, -1.0, -0.45], [0.1, -1.06, -0.45], [0.5, -0.92, -0.45], [0.72, -0.84, -0.45]], 0.065); // right renal artery (longer, behind the IVC)
  branch([[-0.32, -0.95, -3.5], [-0.5, -0.88, -4.0], [-0.68, -0.75, -4.6], [-0.8, -0.62, -5.1]], 0.12);  // left common iliac
  branch([[-0.32, -0.95, -3.5], [-0.1, -0.92, -3.95], [0.15, -0.82, -4.5], [0.35, -0.68, -5.0]], 0.12);  // right common iliac (crosses to the right)
  add({
    id: 'abdominal-aorta', name: 'Abdominal aorta', layer: DEEP, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'Descends just LEFT of the midline on the lumbar spine. Coeliac and superior mesenteric arteries leave anteriorly, the renal arteries laterally, then it bifurcates at L4 into the common iliacs. Its long right renal artery passes behind the IVC.',
    mesh: aorta,
    incision: [[-0.24, -0.98, 0.7], [-0.28, -1.0, -1.4], [-0.31, -0.96, -3.0]],
  });

  /* ================= INFERIOR VENA CAVA ==================================== *
   * The great vein, to the RIGHT of the aorta (x slightly positive), dark venous
   * blue. Wider and thinner-walled than the aorta. It is FORMED low down by the
   * union of the two COMMON ILIAC VEINS at ~L5 (just below and right of the aortic
   * bifurcation), then ascends the posterior wall to pierce the diaphragm and enter
   * the right atrium. The left common iliac vein crosses the midline BEHIND the
   * right common iliac artery to reach it. Aorta-left / IVC-right is the key check. */
  const ivc = vessel(THREE, P.vessel_v, [
    [0.18, -0.82, -3.65], [0.2, -0.92, -2.8], [0.2, -0.98, -1.6],
    [0.2, -1.0, -0.4], [0.22, -0.98, 0.8], [0.26, -0.9, 1.8], [0.32, -0.78, 2.4],
  ], 0.22, 0.28, { rough: 0.46, clear: 0.45, sheen: 0x6f7aa8, rad: 12, seg: 48 });
  const tributary = (pts, r) => ivc.add(tube(THREE, P.vessel_v, pts, r, { rough: 0.46, sheen: 0x6f7aa8, rad: 8, seg: 16 }));
  tributary([[0.18, -0.82, -3.65], [-0.15, -0.8, -4.05], [-0.5, -0.7, -4.6], [-0.68, -0.58, -5.05]], 0.13); // left common iliac vein (crosses midline)
  tributary([[0.18, -0.82, -3.65], [0.28, -0.82, -4.05], [0.45, -0.7, -4.55], [0.6, -0.6, -5.0]], 0.13);    // right common iliac vein
  add({
    id: 'inferior-vena-cava-abdominal', name: 'Inferior vena cava', layer: DEEP, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'The largest vein, lying to the RIGHT of the aorta. It begins where the two common iliac veins join at L5 and ascends to the right atrium. Remember: aorta left, cava right.',
    mesh: ivc,
    incision: [[0.2, -0.98, -1.6], [0.21, -0.99, 0.2], [0.28, -0.84, 2.0]],
  });

  /* ================= REPRODUCTIVE (FEMALE) ================================= *
   * A female internal set, giving a clear midline organ plus paired gonads. The
   * UTERUS is a thick muscular pear in the midline pelvis, ANTEVERTED so its fundus
   * leans forward over the bladder; it sits between bladder (in front) and rectum
   * (behind). The FALLOPIAN (uterine) TUBES arch out from its cornua and open by
   * fimbriae over the OVARIES — the paired gonads on the pelvic side walls. */
  const uterus = organ(THREE, 0xbf8378, 0.3, 0.24, 0.42, { amp: 0.06, rough: 0.5, clear: 0.4, sheen: 0xd8a090, seed: 44 });
  uterus.position.set(0, 0.05, -4.5);
  uterus.rotation.set(-0.3, 0, 0);        // anteverted, fundus tipping anteriorly over the bladder
  // cervix: the narrow neck projecting infero-posteriorly toward the vaginal vault
  const cervix = organ(THREE, 0xb47a70, 0.14, 0.13, 0.16, { amp: 0.04, rough: 0.5, seed: 45 });
  childMesh(uterus, cervix, 0, -0.04, -0.5);
  // uterine tubes: thin, arching laterally from each cornu, flaring at the fimbria
  const tube_ = (sx) => {
    const t = tube(THREE, 0xc99686, [
      [sx * 0.2, 0.06, 0.34], [sx * 0.45, 0.12, 0.3], [sx * 0.7, 0.1, 0.12], [sx * 0.85, 0.05, -0.1],
    ], 0.045, { rough: 0.5, clear: 0.35, sheen: 0xe0b0a0, rad: 7, seg: 20 });
    const fimbria = organ(THREE, 0xcf9a8a, 0.12, 0.09, 0.09, { amp: 0.14, freq: 6, rough: 0.5, seed: 46 });
    childMesh(t, fimbria, sx * 0.9, 0.04, -0.14);
    uterus.add(t);
  };
  tube_(-1); tube_(1);
  add({
    id: 'uterus', name: 'Uterus', layer: DEEP, system: 'urogenital',
    cuttable: true, detachable: true,
    note: 'A thick-walled muscular organ, normally anteverted and anteflexed so it rests forward on the bladder. It lies between the bladder in front and the rectum behind; the uterine tubes leave its upper angles.',
    mesh: uterus,
  });
  const makeOvary = (sx, seed) => organ(THREE, 0xceb6a6, 0.24, 0.16, 0.3, { amp: 0.05, rough: 0.5, clear: 0.4, seed });
  const ovaryL = makeOvary(-1, 47); ovaryL.position.set(-0.82, -0.05, -4.45); ovaryL.rotation.y = 0.3;
  const ovaryR = makeOvary(1, 48); ovaryR.position.set(0.82, -0.05, -4.45); ovaryR.rotation.y = -0.3;
  add({
    id: 'ovary-left', name: 'Left ovary', layer: DEEP, system: 'urogenital',
    cuttable: true, detachable: true,
    note: 'The female gonad — an almond-sized body on the pelvic side wall, slung from the broad ligament. The fimbriae of the tube drape over it to catch the released ovum.',
    mesh: ovaryL,
  });
  add({
    id: 'ovary-right', name: 'Right ovary', layer: DEEP, system: 'urogenital',
    cuttable: true, detachable: true,
    note: 'Paired with the left. It both sheds ova and secretes oestrogen and progesterone, so it is gonad and endocrine gland at once.',
    mesh: ovaryR,
  });
}
