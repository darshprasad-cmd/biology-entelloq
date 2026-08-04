/*
 * human.js — buildHuman: the flagship specimen (an anterior torso prosection).
 *
 * This is the COORDINATOR. The human is far larger than the other specimens, so it
 * is split across files: this one owns the shared body form, the layer plan, the
 * skin, and the assembly; the anatomy of each region is contributed by a separate
 * builder file (human-wall.js, human-thorax.js, human-gi.js, human-deep.js), each
 * exposing one prefixed function. Every region call is GUARDED — a region whose
 * file is absent (or throws) is simply skipped, and the layer re-index below then
 * closes the gap it would have left, so the human always loads as a valid, fully
 * dissectable specimen with whatever regions are present.
 *
 * Concatenated into one module scope with anatomy.js. The only top-level names this
 * file adds are `buildHuman`, the shared helpers `HM_torsoProfile` / `HM_form`, and
 * the single self-registration block at the bottom.
 *
 * Coordinate convention for the un-rotated group (then laid supine on the table):
 *   +z = superior (head end)      -z = inferior (pelvis)
 *   +y = ANTERIOR (front; the cavity opens here, toward the camera)
 *   -y = posterior (back; spine, retroperitoneum)
 *   -x = the body's LEFT          +x = the body's RIGHT
 * The whole group is finally laid supine (anterior up) for a top-down camera, the
 * way a body lies on a dissecting table opened from the front.
 *
 * THE LAYER PLAN (0..6, dense — every region uses these named indices via ctx.L):
 *   0 skin (this file)
 *   1 subcutaneous fat + superficial fascia            (human-wall)
 *   2 muscle layer — pectoralis, rectus abdominis, obliques, intercostals (human-wall)
 *   3 skeletal frame — ribs, sternum, costal cartilage — + diaphragm + the parietal
 *     pleura/peritoneum serous membranes                (human-wall)
 *   4 body-cavity viscera — heart (in pericardium), lungs, great vessels, trachea
 *     [human-thorax]; and the superficial abdominal organs — liver, stomach,
 *     greater omentum, spleen [human-gi]
 *   5 deeper GI — small intestine, large intestine, pancreas, gallbladder [human-gi]
 *   6 retroperitoneal + pelvic — kidneys, adrenals, ureters, bladder, abdominal
 *     aorta + IVC, reproductive organs                  [human-deep]
 */

/* Shared torso envelope. Given t in 0 (pelvis) .. 1 (shoulders) returns the body's
 * half-width (x), half-depth (y, antero-posterior) and the y-offset of its centre
 * line. Region builders read this through ctx.form so every organ is scaled and
 * placed inside the SAME body rather than floating in an invented space. */
function HM_torsoProfile(t) {
  // (t, halfWidth, halfDepth, centreY) control points, cosine-blended.
  const CP = [
    [0.00, 1.25, 1.05, 0.00],  // pelvic floor, rounded
    [0.10, 2.35, 1.55, 0.02],  // hips / iliac crests
    [0.30, 2.00, 1.55, 0.05],  // lower abdomen
    [0.42, 1.88, 1.52, 0.06],  // waist
    [0.60, 2.35, 1.86, 0.02],  // lower ribcage / costal margin
    [0.75, 2.60, 1.98, 0.00],  // chest, ribcage widest
    [0.85, 2.78, 1.72, 0.00],  // upper chest toward shoulders
    [0.93, 2.55, 1.42, 0.02],  // shoulder round
    [1.00, 1.45, 1.12, 0.05],  // neck base
  ];
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  let a = CP[0], b = CP[CP.length - 1];
  for (let i = 0; i < CP.length - 1; i++) {
    if (tt >= CP[i][0] && tt <= CP[i + 1][0]) { a = CP[i]; b = CP[i + 1]; break; }
  }
  const span = b[0] - a[0] || 1;
  const u = (tt - a[0]) / span;
  const s = 0.5 - 0.5 * Math.cos(u * Math.PI);   // smooth cosine blend
  return {
    hw: a[1] + (b[1] - a[1]) * s,
    hd: a[2] + (b[2] - a[2]) * s,
    cy: a[3] + (b[3] - a[3]) * s,
  };
}

// Map a superior-inferior world z (the group's z, roughly -6.5..+6.5) to profile t.
const HM_Z0 = -6.5, HM_Z1 = 6.5;
function HM_form(z) {
  const t = (z - HM_Z0) / (HM_Z1 - HM_Z0);
  return HM_torsoProfile(t);
}

function buildHuman(THREE) {
  const group = new THREE.Group();
  const parts = [];

  const add = (p) => {
    if (!p || !p.mesh) return p;
    p.mesh.userData.partId = p.id;
    if (p.mesh.material && p.mesh.material.color) {
      p.mesh.userData.baseColor = p.mesh.material.color.clone();
    }
    p.mesh.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (p.mesh.geometry) { p.mesh.geometry.computeBoundingSphere(); p.mesh.geometry.computeBoundingBox(); }
    group.add(p.mesh);
    parts.push(p);
    return p;
  };

  // Shared context handed to every region builder: the layer indices by NAME (so a
  // region never hardcodes a number the plan might change), the body envelope, the
  // z-extent, and a consistent palette so all regions read as one cadaver.
  const ctx = {
    L: { skin: 0, fat: 1, muscle: 2, frame: 3, viscera: 4, gi: 5, deep: 6 },
    form: HM_form, profile: HM_torsoProfile, z0: HM_Z0, z1: HM_Z1,
    palette: {
      skin: 0xc9a288, fat: 0xe8d48a, fascia: 0xe6ded0, muscle: 0x9c3f38,
      bone: 0xece4d2, cartilage: 0xd8dcc8, serosa: 0xdfe6e6,
      heart: 0x8a3b34, lung: 0xb08a86, liver: 0x6e352b, stomach: 0xc08c78,
      intestine: 0xc39a7e, spleen: 0x5c2f3a, pancreas: 0xd0b283,
      kidney: 0x6e3b34, vessel_a: 0xb03a2e, vessel_v: 0x3f4f7a, nerve: 0xf0ead6,
    },
  };

  /* ---- layer 0: skin — a lofted anterior torso shell -------------------------
   * Built from the shared profile so everything a region adds sits inside exactly
   * this body. Anterior (+y) is domed and faces the camera; the posterior is
   * flatter. The incision is the classic midline, suprasternal notch to pubis. */
  const RINGS = 72, SEG = 44;
  const g = new THREE.BufferGeometry();
  const pos = [], col = [], idx = [];
  const cBelly = new THREE.Color(0xcaa389), cFlank = new THREE.Color(0xba9078), cSpot = new THREE.Color(0xa87c66);
  for (let i = 0; i <= RINGS; i++) {
    const t = i / RINGS;
    const z = HM_Z0 + t * (HM_Z1 - HM_Z0);
    const f = HM_torsoProfile(t);
    // round the very ends (shoulders/pelvis caps) so it is a closed body, not a tube
    const capS = t > 0.9 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.9) / 0.1, 2))) : 1;
    const capI = t < 0.08 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.08 - t) / 0.08, 2))) : 1;
    const cap = Math.min(capS, capI);
    for (let j = 0; j <= SEG; j++) {
      const a = (j / SEG) * Math.PI * 2;
      const ex = Math.cos(a), ey = Math.sin(a);
      const noise = (Math.sin(a * 5 + z * 1.3) + Math.sin(z * 2.2 + a * 2)) * 0.02;
      const hw = f.hw * cap * (1 + noise);
      const hd = f.hd * cap;
      const x = ex * hw;
      // anterior (ey>0) fuller/domed; posterior (ey<0) flatter (against the table)
      const y = ey * hd * (ey > 0 ? 1.0 : 0.72) + f.cy + noise;
      pos.push(x, y, z);
      // tint: cream-belly to tan-flank with faint mottle
      const anin = Math.max(0, ey);
      const c = cFlank.clone().lerp(cBelly, anin * 0.7).lerp(cSpot, Math.max(0, Math.sin(z * 3 + a * 4)) * 0.08);
      col.push(c.r, c.g, c.b);
    }
  }
  const stride = SEG + 1;
  for (let i = 0; i < RINGS; i++) {
    for (let j = 0; j < SEG; j++) {
      const p0 = i * stride + j, p1 = p0 + 1, p2 = p0 + stride, p3 = p2 + 1;
      idx.push(p0, p2, p1, p1, p2, p3);
    }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const skin = new THREE.Mesh(g, mat(THREE, ctx.palette.skin, {
    vcol: true, rough: 0.62, clear: 0.22, clearRough: 0.5, sheen: 0xd8b09a, sheenAmt: 0.3,
  }));
  add({
    id: 'skin', name: 'Skin', layer: 0, system: 'integument', cuttable: true, detachable: false,
    note: 'The largest organ of the body. Your first cut is the midline — suprasternal notch to pubic symphysis — through epidermis and dermis into the fat beneath.',
    mesh: skin,
    incision: [[0, 2.0, 6.0], [0, 2.0, 3.5], [0, 1.95, 1.0], [0, 1.8, -1.5], [0, 1.6, -4.0], [0, 1.3, -5.8]],
  });

  /* ---- regions: each guarded, each optional ---------------------------------- */
  const region = (name, fn) => {
    if (typeof fn !== 'function') return;
    try { fn(THREE, group, parts, add, ctx); }
    catch (e) { console.warn('human region "' + name + '" failed', e); }
  };
  region('wall', typeof HW_build === 'function' ? HW_build : null);
  region('thorax', typeof HT_build === 'function' ? HT_build : null);
  region('gi', typeof HG_build === 'function' ? HG_build : null);
  region('deep', typeof HD_build === 'function' ? HD_build : null);

  /* ---- robustness: collapse the layer plan to consecutive indices ------------
   * A missing region would otherwise leave a hole in the layer sequence (e.g. skin
   * at 0, viscera at 4, nothing at 1-3), and dissect.js reveals layer N only when
   * N-1 opens — a hole dead-ends the dissection with no error. Re-indexing the
   * layers actually present to 0..k closes any such hole, so whatever regions
   * loaded still make a coherent, fully openable dissection. */
  const used = [...new Set(parts.map((p) => p.layer))].sort((a, b) => a - b);
  const remap = new Map(used.map((l, i) => [l, i]));
  parts.forEach((p) => {
    p.layer = remap.get(p.layer);
    // Re-apply visibility against the FINAL layer: only the outermost layer shows
    // at load; dissect.js turns deeper layers on as each is opened.
    p.mesh.visible = p.layer === 0;
  });

  group.rotation.x = -Math.PI / 2.15;   // lay supine, anterior up, tilted to the camera
  return { group, parts };
}

/* ---- self-registration (the one allowed registration block) ----------------- */
SPECIMEN_BUILDERS.human = buildHuman;
SPECIMENS.human = {
  id: 'human', name: 'Human torso',
  blurb: 'An anterior prosection: open the body wall through skin, fat, muscle and ribs to the heart, lungs and the whole abdominal cavity.',
  camera: { pos: [0, 20.5, 12.5], target: [0, 0, -0.2] },
  requiresPinning: false,
};
// Objectives reference core structures; any whose region did not load simply never
// completes (seen.has is false) rather than erroring — the rest still work.
SPECIMEN_OBJECTIVES.human = [
  { id: 'skin', text: 'Make the <b>midline incision</b> through the skin, from the sternal notch to the pubis.',
    hint: 'Scalpel (3). One long, smooth, controlled stroke.',
    done: (s) => s.incisions.has('skin') && s.incisions.get('skin').length > 1.5 },
  { id: 'reflect', text: 'Reflect the skin and <b>subcutaneous fat</b> to expose the muscle.',
    hint: 'Forceps (2). Draw the flap aside; the yellow fat comes with it.',
    done: (s) => s.opened.has('skin') },
  { id: 'muscle', text: 'Divide the <b>muscle layer</b> — rectus abdominis and the chest wall — to reach the ribs.',
    hint: 'Scalpel, then reflect. Beneath lie the ribs and the abdominal cavity.',
    done: (s) => [...s.incisions.keys()].some((id) => /rectus|pectoralis|oblique|muscle/.test(id))
      || [...s.opened].some((id) => /rectus|pectoralis|oblique|muscle/.test(id)) },
  { id: 'cavity', text: 'Open the <b>body cavity</b> — through ribs and peritoneum — and look inside.',
    hint: 'Cut the costal cartilage / peritoneum and reflect it.',
    done: (s) => [...s.opened].some((id) => /rib|sternum|peritoneum|pleura|cartilage/.test(id)) },
  { id: 'thorax', text: 'Identify the <b>heart</b> and the two <b>lungs</b> in the chest.',
    hint: 'Probe (1) on the heart within its pericardium, then each lung.',
    done: (s, seen) => seen.has('heart') && [...seen].some((id) => /lung/.test(id)) },
  { id: 'abdomen', text: 'Identify the <b>liver</b>, <b>stomach</b> and <b>intestines</b>.',
    hint: 'Probe each abdominal organ. The liver fills the upper right.',
    done: (s, seen) => seen.has('liver') && seen.has('stomach')
      && [...seen].some((id) => /intestine|colon|jejunum|ileum/.test(id)) },
  { id: 'lift', text: 'Lift the <b>intestines</b> and stomach aside to reach the back of the cavity.',
    hint: 'Forceps. The gut is mobile on its mesentery; draw it clear.',
    done: (s) => [...s.removed].some((id) => /intestine|colon|stomach|liver/.test(id)) },
  { id: 'retro', text: 'Find the <b>kidneys</b> and the great vessels — the <b>aorta</b> — on the posterior wall.',
    hint: 'They are retroperitoneal, against the spine behind everything else.',
    done: (s, seen) => [...seen].some((id) => /kidney/.test(id)) && [...seen].some((id) => /aorta/.test(id)) },
];
