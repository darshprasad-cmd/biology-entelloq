/*
 * human-thorax.js — HT_build: the THORACIC VISCERA region of the human prosection.
 *
 * Concatenated into one module scope with anatomy.js and human.js. human.js is the
 * COORDINATOR: it owns the shared body envelope, the skin, the layer plan and the
 * assembly, and it calls this file's ONE top-level function to contribute the chest
 * contents. Every helper below lives INSIDE HT_build so it cannot collide with any
 * other module's top-level names; the shared toolkit (mat, organ, lobe, tube,
 * vessel, childMesh, displace, seal) is USED, never redeclared.
 *
 * Everything here sits at ctx.L.viscera — the body-cavity layer revealed once the
 * ribcage / parietal pleura are opened (human-wall's frame layer). Coordinate
 * convention of the un-rotated group (the coordinator lays it supine afterward):
 *   +z superior (head)      -z inferior (pelvis)     diaphragm ~ +1.2
 *   +y ANTERIOR (front, toward camera; the cavity opens here)   -y posterior (spine)
 *   -x the body's LEFT      +x the body's RIGHT
 *
 * What an examiner checks, and what is therefore built to be RIGHT:
 *   - the HEART sits in the mediastinum, slightly LEFT of the midline (centre
 *     x ~ -0.35), a blunt cone whose APEX points infero-laterally to the LEFT
 *     (down, forward and to the -x side); it is wrapped in a translucent fibrous
 *     PERICARDIUM you open first;
 *   - the great-vessel roots leave the base (superior): the AORTIC ARCH curving up
 *     and to the left with its three branches, the PULMONARY TRUNK anterior to it,
 *     the SVC on the right into the right atrium, the IVC entering from below;
 *   - the RIGHT LUNG has THREE lobes (superior/middle/inferior, oblique + horizontal
 *     fissures) and is larger but SHORTER — the liver pushes its base up; the LEFT
 *     LUNG has TWO lobes (superior/inferior) with a CARDIAC NOTCH and lingula on its
 *     antero-medial border, and is taller and narrower to make room for the heart;
 *   - the TRACHEA descends in the midline and forks at the CARINA (~z +4.5) into two
 *     main bronchi, the right wider, shorter and more vertical.
 */

function HT_build(THREE, group, parts, add, ctx) {
  const P = ctx.palette;
  const VISC = ctx.L.viscera;          // every part in this region lives here

  /* ======================================================================== *
   *  Local helpers (unique names; the shared toolkit is reused, not redefined)
   * ======================================================================== */

  // A blunt myocardial cone. Built along +Z so its base is superior (the great
  // vessels emerge from +z) and its apex is at -z. The apex is then LEANED toward
  // -x (the body's left) and +y (anterior) INSIDE the geometry, so the finished
  // mesh needs NO rotation — local space equals world space (bar a translation),
  // which keeps the atria/auricle children and vessel roots easy to place right.
  function heartCone(color, rx, ry, rz, o) {
    o = o || {};
    const g = new THREE.SphereGeometry(1, 40, 30);
    displace(THREE, g, 0.03, 2.2, o.seed || 0);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const t = Math.max(0, Math.min(1, (v.z + 1) / 2));   // 0 apex(-z) .. 1 base(+z)
      // desired horizontal radius: broad, gently bellied base tapering to a blunt
      // apex point. Re-radialise each vertex to this without touching axis poles
      // (division by the vanishing pole radius would blow up).
      const target = 0.12 + Math.pow(Math.sin(t * Math.PI * 0.5), 0.85) * 0.95;
      const hor = Math.hypot(v.x, v.y);
      let x = v.x, y = v.y;
      if (hor > 1e-4) { x = (v.x / hor) * target; y = (v.y / hor) * target; }
      // lean the apex antero-laterally: the lower it is, the further it swings to
      // the body's left and forward — the real hanging axis of the heart.
      const lean = 1 - t;
      x -= lean * 0.62;
      y += lean * 0.34;
      p.setXYZ(i, x, y, v.z);
    }
    seal(g);
    g.scale(rx, ry, rz);                 // rx > ry: wider left-right than deep (AP flat)
    seal(g);
    return new THREE.Mesh(g, mat(THREE, color, {
      tissue: 'muscle', rough: 0.56, clear: 0.5, clearRough: 0.34, sheen: 0xd05a50, ...o,
    }));
  }

  // One pulmonary lobe: a spongy displaced ellipsoid whose MEDIAL hemisphere is
  // flattened into the concave costo-mediastinal surface (flatDir = -1 for the
  // right lung, whose medial face looks toward -x; +1 for the left lung). An
  // optional `notch` [cx,cy,cz,radius,depth] scoops a rounded concavity into the
  // antero-medial-inferior border — the CARDIAC NOTCH of the left superior lobe.
  function lungLobe(color, rx, ry, rz, flatDir, notch, o) {
    o = o || {};
    const g = new THREE.SphereGeometry(1, o.seg || 30, o.seg2 || 22);
    displace(THREE, g, o.amp != null ? o.amp : 0.10, o.freq || 3.1, o.seed || 0);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      let x = v.x, y = v.y, z = v.z;
      if (flatDir && Math.sign(x) === flatDir) x *= 0.52;   // flat medial surface
      if (notch) {
        const d = Math.hypot(x - notch[0], y - notch[1], z - notch[2]);
        if (d < notch[3]) { const k = 1 - d / notch[3]; x -= flatDir * k * notch[4]; y -= k * notch[4] * 0.3; }
      }
      p.setXYZ(i, x, y, z);
    }
    seal(g);
    g.scale(rx, ry, rz);
    seal(g);
    return new THREE.Mesh(g, mat(THREE, color, {
      trans: 0.4, thickness: 1.3, atten: 0xbf938c, attenDist: 1.5,
      rough: 0.6, clear: 0.32, clearRough: 0.4, sheen: 0xe8bcb4, sheenAmt: 0.5,
      side: THREE.DoubleSide, ...o,
    }));
  }

  // Decorative C-shaped tracheal/bronchial cartilage rings strung along a path.
  // The torus arc leaves a posterior gap the way real hyaline rings are deficient
  // behind (the trachealis muscle closes the C). Children of the airway carrier.
  function cartRings(parent, pts, ringRad, count) {
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])));
    const zAxis = new THREE.Vector3(0, 0, 1);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const c = curve.getPoint(t), tan = curve.getTangent(t).normalize();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(ringRad, ringRad * 0.16, 6, 16, Math.PI * 1.5),
        mat(THREE, P.cartilage, { tissue: 'valve', rough: 0.55, clear: 0.3 }));
      ring.quaternion.setFromUnitVectors(zAxis, tan);       // ring plane ⟂ the airway
      ring.position.copy(c);
      parent.add(ring);
    }
  }

  /* ======================================================================== *
   *  PERICARDIUM — the tough fibrous sac; opened first to reach the heart
   * ======================================================================== *
   * A translucent, double-sided shell enclosing the ventricular mass and atria,
   * but stopping short of the great-vessel roots (which pierce its superior pole).
   * depthWrite off + a high renderOrder so the heart reads clearly THROUGH it; the
   * raycaster still picks it, so it is the first thing the blade meets. */
  {
    const g = new THREE.SphereGeometry(1, 32, 24);
    displace(THREE, g, 0.05, 2.2, 41);
    g.scale(1.55, 1.5, 1.48);
    seal(g);
    const peri = new THREE.Mesh(g, mat(THREE, P.serosa, {
      trans: 0.6, opacity: 0.14, rough: 0.16, clear: 0.9, clearRough: 0.12,
      transmission: 0.5, thickness: 0.3, atten: 0xe4ece8, side: THREE.DoubleSide,
    }));
    peri.position.set(-0.3, 0.3, 2.95);
    peri.material.depthWrite = false;
    peri.renderOrder = 3;
    add({
      id: 'pericardium', name: 'Fibrous pericardium', layer: VISC, system: 'circulatory',
      cuttable: true, detachable: false,
      note: 'A tough fibrous sac enclosing the heart and the roots of the great vessels. Open it as a flap first — the smooth serous lining lets the heart beat without friction.',
      mesh: peri,
      // local-space guide down the anterior face of the sac (unused by the sim today)
      incision: [[-0.2, 1.25, 0.7], [-0.2, 1.35, 0.0], [-0.2, 1.2, -0.7]],
    });
  }

  /* ======================================================================== *
   *  HEART — mediastinum, slightly LEFT; apex points infero-laterally left
   * ======================================================================== */
  const heartCentre = new THREE.Vector3(-0.35, 0.4, 3.05);
  const heart = heartCone(P.heart, 1.15, 0.95, 1.15, { seed: 3 });
  heart.position.copy(heartCentre);

  // Atria at the base (superior, posterior), auricles as the two ear-like flaps.
  // Placed in the heart's LOCAL space = worldTarget - heartCentre (no rotation on
  // the carrier). Duskier, thinner-walled than the ventricles; decorative children.
  const atriaMat = { tissue: 'muscle', rough: 0.6, clear: 0.4, sheen: 0xc25a4e };
  const raChild = (wx, wy, wz) => new THREE.Vector3(wx, wy, wz).sub(heartCentre);
  {
    const ra = organ(THREE, 0x74332e, 0.62, 0.58, 0.5, { amp: 0.09, seed: 5, ...atriaMat });
    childMesh(heart, ra, ...raChild(0.55, -0.1, 3.9).toArray());
    const la = organ(THREE, 0x6f302c, 0.55, 0.55, 0.46, { amp: 0.09, seed: 6, ...atriaMat });
    childMesh(heart, la, ...raChild(-0.9, -0.2, 3.95).toArray());
    const rAur = lobe(THREE, 0x7d352f, 0.62, 0.4, 0.24, { amp: 0.13, seed: 7, ...atriaMat });
    childMesh(heart, rAur, ...raChild(0.5, 0.85, 3.7).toArray(), 1.2, -0.4, 0.3);
    const lAur = lobe(THREE, 0x7c342e, 0.58, 0.38, 0.22, { amp: 0.13, seed: 8, ...atriaMat });
    childMesh(heart, lAur, ...raChild(-1.05, 0.75, 3.7).toArray(), 1.2, 0.4, -0.3);
  }
  add({
    id: 'heart', name: 'Heart', layer: VISC, system: 'circulatory',
    cuttable: true, detachable: true,
    note: 'A blunt muscular cone in the middle mediastinum, two-thirds to the left of the midline, its apex pointing down and to the left. The thick left ventricle forms that apex and the whole left border.',
    mesh: heart,
    // a cut into the left-ventricular free wall (heart-local coordinates)
    incision: [[-0.65, 0.5, 0.15], [-0.75, 0.3, -0.45], [-0.65, 0.1, -0.85]],
  });

  /* ======================================================================== *
   *  GREAT VESSELS at the base — arteries P.vessel_a, veins P.vessel_v
   * ======================================================================== */

  // Aortic arch: ascends behind the pulmonary trunk, arches up-and-to-the-LEFT and
  // posteriorly, then descends left of the midline. Three branches spring from its
  // convex superior surface: brachiocephalic trunk, left common carotid, left
  // subclavian — the recognisable "candelabra".
  const aorta = vessel(THREE, P.vessel_a,
    [[0.05, 0.35, 4.0], [0.2, 0.6, 4.75], [0.05, 0.45, 5.2],
     [-0.6, -0.05, 5.15], [-0.75, -0.7, 4.7], [-0.7, -1.0, 3.9]], 0.34, 0.3,
    { rough: 0.5, clear: 0.5, clearRough: 0.4, sheen: 0xd8613e, rad: 12, seg: 40 });
  [[[0.05, 0.45, 5.15], [0.22, 0.62, 5.9]],          // brachiocephalic trunk
   [[-0.15, 0.4, 5.2], [-0.15, 0.62, 5.95]],         // left common carotid
   [[-0.42, 0.28, 5.15], [-0.6, 0.5, 5.85]]]         // left subclavian
    .forEach((bp) => aorta.add(vessel(THREE, P.vessel_a, bp, 0.11, 0.09,
      { rough: 0.5, clear: 0.5, sheen: 0xd8613e, rad: 8, seg: 12 })));
  add({
    id: 'arch-of-aorta', name: 'Arch of the aorta', layer: VISC, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'The systemic artery: it leaves the left ventricle, arches over the left main bronchus and gives three branches to the head, neck and arms before descending against the spine.',
    mesh: aorta,
  });

  // Pulmonary trunk: ANTERIOR to the aorta, arising from the right-ventricular
  // outflow (anterior and to the left), sweeping up and to the left before forking
  // to both lungs. It carries DEOXYGENATED blood, so it is built duskier than the
  // systemic arteries — a distinction a professor will look for.
  const pulmDusky = 0x9a5560;
  const pulm = vessel(THREE, pulmDusky,
    [[-0.45, 0.75, 3.95], [-0.6, 0.7, 4.55], [-0.75, 0.45, 4.95]], 0.32, 0.28,
    { rough: 0.55, clear: 0.4, sheen: 0xb07082, rad: 12, seg: 26 });
  [[[-0.75, 0.45, 4.95], [-1.5, 0.15, 5.05], [-2.0, 0.0, 4.85]],   // left pulmonary a.
   [[-0.75, 0.45, 4.95], [-0.1, 0.25, 4.6], [0.5, 0.1, 4.3], [0.95, -0.05, 4.0]]]  // right pulmonary a. — longer, crosses behind the aorta/SVC to the right hilum
    .forEach((bp) => pulm.add(vessel(THREE, pulmDusky, bp, 0.18, 0.14,
      { rough: 0.55, clear: 0.4, sheen: 0xb07082, rad: 8, seg: 16 })));
  add({
    id: 'pulmonary-trunk', name: 'Pulmonary trunk', layer: VISC, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'The front-most great vessel. It leaves the right ventricle and forks into the left and right pulmonary arteries — the only arteries carrying deoxygenated blood, so it looks duskier.',
    mesh: pulm,
  });

  // Superior vena cava: on the RIGHT, descending vertically into the upper right
  // atrium. Thin-walled and dark blue.
  const svc = vessel(THREE, P.vessel_v,
    [[0.82, 0.2, 5.4], [0.78, 0.05, 4.8], [0.7, -0.05, 4.25]], 0.3, 0.28,
    { rough: 0.55, clear: 0.3, sheen: 0x6a7aa8, rad: 12, seg: 22 });
  add({
    id: 'superior-vena-cava', name: 'Superior vena cava', layer: VISC, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'The large thin-walled vein on the right, returning blood from the head, neck and arms straight down into the right atrium.',
    mesh: svc,
  });

  // Inferior vena cava: enters from BELOW, piercing the diaphragm and opening into
  // the floor of the right atrium. Only a short thoracic root is shown.
  const ivc = vessel(THREE, P.vessel_v,
    [[0.55, -0.15, 3.85], [0.6, -0.35, 3.15], [0.62, -0.5, 2.5]], 0.34, 0.3,
    { rough: 0.55, clear: 0.3, sheen: 0x6a7aa8, rad: 12, seg: 18 });
  add({
    id: 'inferior-vena-cava', name: 'Inferior vena cava', layer: VISC, system: 'circulatory',
    cuttable: true, detachable: false,
    note: 'The widest vein of the body, returning blood from everything below the diaphragm. It pierces the diaphragm and empties into the base of the right atrium.',
    mesh: ivc,
  });

  /* ======================================================================== *
   *  RIGHT LUNG — THREE lobes; larger but SHORTER (the liver lifts its base)
   * ======================================================================== *
   * Fills the right pleural cavity (+x). Medial surface (flatDir -1) is flattened
   * against the mediastinum and moulded by the heart. Oblique fissure separates the
   * inferior lobe from the upper two; the horizontal fissure (unique to the right)
   * separates the small, wedge-shaped, anterior MIDDLE lobe from the superior. */
  {
    const rls = lungLobe(0xb89089, 1.0, 1.15, 1.05, -1, null, { seed: 30 });
    rls.position.set(1.4, 0.2, 4.5); rls.rotation.set(0, -0.1, 0.05);
    add({
      id: 'right-lung-superior-lobe', name: 'Right lung — superior lobe', layer: VISC,
      system: 'respiratory', cuttable: true, detachable: true,
      note: 'The uppermost of the right lung\'s three lobes, reaching the apex above the first rib. Separated from the middle lobe by the horizontal fissure.',
      mesh: rls,
    });

    const rlm = lungLobe(0xb28a84, 0.82, 0.72, 0.7, -1, null, { seed: 31, amp: 0.11 });
    rlm.position.set(1.55, 0.75, 3.45); rlm.rotation.set(0, -0.15, 0);
    add({
      id: 'right-lung-middle-lobe', name: 'Right lung — middle lobe', layer: VISC,
      system: 'respiratory', cuttable: true, detachable: true,
      note: 'A small anterior wedge unique to the right lung, between the horizontal and oblique fissures. Its presence is how you tell the right lung from the left.',
      mesh: rlm,
    });

    const rli = lungLobe(0xa8827c, 1.12, 1.18, 1.15, -1, null, { seed: 32 });
    rli.position.set(1.3, -0.15, 3.1); rli.rotation.set(0.05, -0.05, 0);
    add({
      id: 'right-lung-inferior-lobe', name: 'Right lung — inferior lobe', layer: VISC,
      system: 'respiratory', cuttable: true, detachable: true,
      note: 'The largest, postero-inferior lobe, its concave base resting on the dome of the diaphragm — which the liver pushes up, making the right lung shorter than the left.',
      mesh: rli,
    });
  }

  /* ======================================================================== *
   *  LEFT LUNG — TWO lobes; taller and narrower, with a cardiac notch
   * ======================================================================== *
   * Fills the left pleural cavity (-x). Medial surface (flatDir +1) is flattened
   * and, on the superior lobe, deeply scooped where the heart sits — the CARDIAC
   * NOTCH — with the tongue-like LINGULA projecting below it. A single oblique
   * fissure divides superior from inferior. */
  {
    const lls = lungLobe(0xb89089, 0.92, 1.16, 1.16, 1, [0.62, 0.5, -0.5, 0.9, 0.85], { seed: 33 });
    lls.position.set(-1.3, 0.25, 4.55); lls.rotation.set(0, 0.1, -0.05);
    // lingula: the tongue of the left superior lobe, below the cardiac notch,
    // reaching antero-medially over the heart. A decorative child of the lobe.
    const lingula = lobe(THREE, 0xb6908a, 0.7, 0.34, 0.42, {
      trans: 0.4, thickness: 1.0, rough: 0.6, clear: 0.32, sheen: 0xe8bcb4,
      side: THREE.DoubleSide, seed: 35,
    });
    childMesh(lls, lingula, 0.5, 0.28, -0.85, 0.4, 0.2, -0.3);
    add({
      id: 'left-lung-superior-lobe', name: 'Left lung — superior lobe', layer: VISC,
      system: 'respiratory', cuttable: true, detachable: true,
      note: 'The upper of the left lung\'s two lobes. Its antero-medial border is scooped out as the cardiac notch, below which the lingula curls over the heart — the left\'s answer to the right middle lobe.',
      mesh: lls,
    });

    const lli = lungLobe(0xa8827c, 1.0, 1.2, 1.24, 1, null, { seed: 34 });
    lli.position.set(-1.25, -0.2, 3.4); lli.rotation.set(0.05, 0.05, 0);
    add({
      id: 'left-lung-inferior-lobe', name: 'Left lung — inferior lobe', layer: VISC,
      system: 'respiratory', cuttable: true, detachable: true,
      note: 'The postero-inferior lobe, sitting on the diaphragm behind the oblique fissure. The left lung is taller and narrower than the right to leave room for the heart.',
      mesh: lli,
    });
  }

  /* ======================================================================== *
   *  TRACHEA + main BRONCHI — midline, forking at the carina (~z +4.5)
   * ======================================================================== *
   * Pale, cartilage-ringed, running behind the great vessels and in front of the
   * oesophagus. At the carina it divides: the RIGHT main bronchus is wider, shorter
   * and more vertical (so inhaled objects lodge there), the LEFT longer and more
   * horizontal as it passes under the aortic arch to a lower hilum. */
  {
    const tracheaPts = [[0, -0.35, 5.95], [0, -0.4, 5.4], [0, -0.43, 4.9], [0, -0.45, 4.5]];
    const trachea = tube(THREE, P.cartilage, tracheaPts, 0.24,
      { tissue: 'valve', rough: 0.5, clear: 0.3, rad: 12, seg: 30 });

    const rBronchPts = [[0.03, -0.44, 4.48], [0.45, -0.38, 4.05], [0.92, -0.3, 3.6]];
    const lBronchPts = [[-0.03, -0.44, 4.48], [-0.55, -0.4, 4.28], [-1.1, -0.35, 4.15]];
    trachea.add(tube(THREE, P.cartilage, rBronchPts, 0.155,
      { tissue: 'valve', rough: 0.5, clear: 0.3, rad: 10, seg: 20 }));
    trachea.add(tube(THREE, P.cartilage, lBronchPts, 0.13,
      { tissue: 'valve', rough: 0.5, clear: 0.3, rad: 10, seg: 20 }));

    cartRings(trachea, tracheaPts, 0.26, 6);
    cartRings(trachea, rBronchPts, 0.17, 4);
    cartRings(trachea, lBronchPts, 0.145, 5);

    add({
      id: 'trachea', name: 'Trachea and main bronchi', layer: VISC, system: 'respiratory',
      cuttable: true, detachable: false,
      note: 'The airway descends in the midline, held open by C-shaped cartilage rings, and forks at the carina. The right main bronchus is wider, shorter and more vertical — which is why inhaled objects usually end up in the right lung.',
      mesh: trachea,
    });
  }
}
