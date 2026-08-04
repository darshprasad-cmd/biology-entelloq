/*
 * constraints.js — the tissue that holds on.
 *
 * An organ is not a prop sitting in a bowl. It is slung on mesentery, tied down by
 * ligaments, and anchored by its own vessels. The single most common failure of a
 * virtual dissection is that you can drag the small intestine to the moon; the
 * single most memorable moment of a real one is discovering that you cannot —
 * that when you lift the gut, a translucent fan of mesentery comes up with it,
 * blanches white, and its arcade vessels stand out like wires. THAT is the lesson.
 * This module is that lesson, made mechanical.
 *
 * Three things happen here and nowhere else:
 *
 *  1. TETHER TABLES per specimen, naming real structures (mesentery, falciform-
 *     equivalent ventral ligament, gastro-splenic attachment, mesorchium /
 *     mesovarium, renal vessels, pulmonary vessels; and for the heart: the great
 *     vessels themselves, the chordae tendineae, and the fibrous pericardial
 *     reflections). A professor is a target reader — the names and the consequence
 *     sentences are written to survive that.
 *
 *  2. GEOMETRY THAT RESPONDS. A mesentery is a real translucent fan generated
 *     between an attachment arc on the organ and a short root arc on the dorsal
 *     wall, rebuilt in place as the organ moves. Under tension it BLANCHES —
 *     the sheet whitens while its vessels stay filled and dark, which is exactly
 *     what happens when you stretch living peritoneum, and it is the most
 *     beautiful signal in the whole app.
 *
 *  3. RESISTANCE. resistance(partId) rises 0..1 as a tether takes up its slack,
 *     and update() applies that restraint to the organ's transform, so lifting a
 *     tethered organ goes from "drag the mesh anywhere" to "feel the anatomy
 *     holding it". Past the limit the tether tears — permanently, like everything
 *     else in this app — or you divide it deliberately with sever().
 *
 * WHY update() applies the restraint itself rather than handing main.js a scale
 * factor: dissect.js's updateLift() writes an ABSOLUTE position derived from the
 * cursor ray (`part.mesh.position.copy(group.worldToLocal(p))`), not an
 * incremental delta. There is no delta for a caller to multiply by
 * (1 - resistance). So we let dissect.js write its desire, read that desire as the
 * demand, then correct the transform. Because dissect.js recomputes from the ray
 * every frame instead of integrating, this correction cannot accumulate or
 * oscillate. resistance() stays published for the HUD and for any future
 * delta-based lift path.
 *
 * PERFORMANCE CONTRACT (a school laptop at 60fps):
 *  - Every tether owns ONE mesh, built once. Per frame we rewrite the cached
 *    BufferAttribute arrays in place and recompute bounds. We never dispose and
 *    recreate geometry in the loop.
 *  - A tether whose organ has not moved and whose tension has not changed is
 *    skipped entirely.
 *  - Nothing allocates in update(): every Vector3/Color is factory-scoped scratch.
 *  - Bounds ARE recomputed after each rewrite. These meshes are never raycast
 *    (they are not in `parts`, and dissect.js picks from an explicit list), but a
 *    stale bounding sphere gets a fan wrongly frustum-culled, which reads as
 *    "the mesentery flickers out when I orbit".
 */

/* ---- tether tables ---------------------------------------------------------
 * Geometry note on `arc`: attachment points are given in NORMALISED bounding-box
 * coordinates of the organ's own geometry, each component in -1..1. That is the
 * only description that survives both conventions in this codebase — organ/lobe/
 * bean/bag/sac meshes are origin-centred and carry a position+rotation, while
 * tube/vessel meshes sit at the origin with absolute coordinates baked into their
 * vertices. Normalised box coordinates are correct for both, and they follow a
 * mesh whose author later moves it.
 *
 * `anchor` points are absolute, in the SPECIMEN GROUP's space (this module parents
 * its geometry to that same group, so the frog's supine rotation and the heart's
 * 0.9 scale come along for free). `anchorPart` + `anchorArc` instead pin the far
 * end to another organ, in that organ's normalised box coordinates.
 *
 * Strain model: rest length L0 is measured once with the specimen at home.
 * `slack` is the strain that costs nothing (real mesentery is loose); `limit` is
 * the strain at which it gives way; `grip` is the peak resistance 0..1.
 */
const CON_TETHERS = {
  frog: [
    {
      id: 'mesentery',
      name: 'Mesentery of the small intestine',
      part: 'small-intestine',
      kind: 'fan', cols: 24, rows: 7,
      // The mesenteric border follows the coil, so the attachment weaves gently
      // along the gut while the root stays a short line in the midline. Broad
      // organ edge + short root = the fan shape. That ratio IS the anatomy.
      arc: (i, n) => {
        const t = i / n;
        return [Math.sin(t * Math.PI * 2.6) * 0.46, -0.55, 0.74 - t * 1.66];
      },
      // The root is SHORT and the gut border is LONG — roughly 1:2.5 here, and in
      // a human 15cm of root carrying six metres of bowel. That ratio is the
      // entire reason the thing is fan-shaped, and getting it wrong (a root as
      // long as the gut) renders a rectangular pane of glass instead.
      anchor: [[0.06, -0.50, -0.08], [0.05, -0.57, -0.40], [0.03, -0.60, -0.72]],
      slack: 0.45, limit: 2.0, grip: 0.86,
      sag: 0.30, vessels: 6, arcades: true,
      blush: 0xdca79f, opacity: 0.44, thickness: 0.22,
      note: 'A translucent double fold of peritoneum slinging the coiled ileum from a short root in the dorsal midline. Its arcade vessels — branches of the coeliaco-mesenteric artery, with paired veins draining to the hepatic portal — run inside it. Tease it, never cut it blind.',
      strainText: 'The mesentery is blanching and its vascular arcades are standing out — it is holding the gut. Divide it at the root if you mean to lift the intestine out.',
      damageText: 'The mesentery has torn near its root. The arcade vessels to that loop of gut are stripped — in a live animal the segment would infarct.',
      tearText: 'The mesentery has given way. The small intestine is free, but you avulsed its blood supply rather than dividing it — those vessels are torn, not cut.',
      cutText: 'Mesentery divided at its root. The intestine lifts away cleanly; note the arcade vessels you have just cut across, and that the gut you are holding now has no blood supply.',
    },
    {
      id: 'ventral-ligament-liver',
      name: 'Ventral (falciform) ligament of the liver',
      part: 'liver-median',
      kind: 'band', cols: 5, rows: 6, width: 0.62,
      arc: [[0.50, 0.55, 0.55], [0.34, 0.62, 0.05], [0.46, 0.52, -0.42]],
      anchor: [[0, 0.90, 1.20], [0, 0.92, 0.72], [0, 0.90, 0.28]],
      slack: 0.20, limit: 0.80, grip: 0.78,
      sag: 0.16, vessels: 2, arcades: false,
      blush: 0xe6cfc2, opacity: 0.52, thickness: 0.26, fibrous: true,
      note: 'The frog\'s falciform equivalent: a sickle-shaped fold of ventral mesentery running from the liver to the midline of the ventral body wall. The ventral abdominal vein travels in its free edge on its way into the hepatic portal system — which is why cutting the body wall off-midline costs you the vein.',
      strainText: 'The ventral ligament is taut and pale — the liver is anchored to the body wall in the midline.',
      damageText: 'The ventral ligament has torn part-way off the body wall, and the ventral abdominal vein running in its edge is stretched over the rent.',
      tearText: 'The ventral (falciform) ligament has avulsed from the body wall, taking the ventral abdominal vein with it. That vein drained the belly wall into the hepatic portal system; the portal inflow is now open.',
      cutText: 'Ventral ligament divided. The liver is free of the body wall — reflect it and the stomach and gall bladder come into view.',
    },
    {
      id: 'gastrosplenic',
      name: 'Gastro-splenic attachment (dorsal mesogastrium)',
      part: 'spleen',
      kind: 'band', cols: 4, rows: 5, width: 0.34,
      arc: [[-0.62, 0.30, 0.48], [-0.58, -0.18, 0.24]],
      anchorPart: 'stomach',
      anchorArc: [[0.55, 0.25, -0.42], [0.45, -0.05, 0.06]],
      slack: 0.22, limit: 0.70, grip: 0.80,
      sag: 0.20, vessels: 2, arcades: false,
      blush: 0xdfb3ad, opacity: 0.46, thickness: 0.22,
      note: 'The spleen is not free in the cavity — it is carried in the dorsal mesogastrium, tied to the greater curvature of the stomach by the gastro-splenic fold. The splenic vessels reach it through this fold, so a spleen you find loose is a spleen you have already damaged.',
      strainText: 'The gastro-splenic fold is taut — the spleen and the stomach move together.',
      damageText: 'The gastro-splenic fold is torn and the splenic vessels are stretched across the tear.',
      tearText: 'The gastro-splenic attachment has torn. The spleen is loose in the cavity and its vessels are stripped from the greater curvature.',
      cutText: 'Gastro-splenic fold divided. The spleen is free — you have cut the splenic vessels to take it.',
    },
    {
      id: 'gonadal-fold-left',
      name: 'Mesorchium / mesovarium (gonadal mesentery), left',
      part: 'fat-body-left',
      kind: 'fan', cols: 10, rows: 5,
      arc: [[0.62, -0.42, 0.55], [0.55, -0.55, 0.02], [0.60, -0.45, -0.46]],
      anchor: [[-0.62, -0.52, 0.18], [-0.66, -0.55, -0.05], [-0.64, -0.57, -0.28]],
      slack: 0.26, limit: 0.95, grip: 0.80,
      sag: 0.22, vessels: 3, arcades: false,
      blush: 0xe3bfae, opacity: 0.38, thickness: 0.2,
      note: 'The finger-like fat body arises from the anterior pole of the gonad, and the gonad itself hangs from the dorsal body wall on a thin peritoneal fold — the mesorchium in a male, the mesovarium in a female. The gonadal vessels run in that fold.',
      strainText: 'The gonadal fold is blanching — the fat body is anchored through the gonad to the dorsal wall.',
      damageText: 'The gonadal fold has torn and its vessels are stripped along the tear.',
      tearText: 'The mesorchium/mesovarium has torn away from the dorsal wall; the gonadal vessels running in it are avulsed.',
      cutText: 'Gonadal fold divided. The fat body and the gonad lift away from the dorsal wall together.',
    },
    {
      id: 'gonadal-fold-right',
      name: 'Mesorchium / mesovarium (gonadal mesentery), right',
      part: 'fat-body-right',
      kind: 'fan', cols: 10, rows: 5,
      arc: [[-0.62, -0.42, 0.55], [-0.55, -0.55, 0.02], [-0.60, -0.45, -0.46]],
      anchor: [[0.62, -0.52, 0.18], [0.66, -0.55, -0.05], [0.64, -0.57, -0.28]],
      slack: 0.26, limit: 0.95, grip: 0.80,
      sag: 0.22, vessels: 3, arcades: false,
      blush: 0xe3bfae, opacity: 0.38, thickness: 0.2,
      note: 'The finger-like fat body arises from the anterior pole of the gonad, and the gonad itself hangs from the dorsal body wall on a thin peritoneal fold — the mesorchium in a male, the mesovarium in a female. The gonadal vessels run in that fold.',
      strainText: 'The gonadal fold is blanching — the fat body is anchored through the gonad to the dorsal wall.',
      damageText: 'The gonadal fold has torn and its vessels are stripped along the tear.',
      tearText: 'The mesorchium/mesovarium has torn away from the dorsal wall; the gonadal vessels running in it are avulsed.',
      cutText: 'Gonadal fold divided. The fat body and the gonad lift away from the dorsal wall together.',
    },
    {
      id: 'renal-vessels-left',
      name: 'Renal vessels, left — renal arteries, efferent renal veins and the renal portal (afferent renal) veins',
      part: 'kidney-left',
      kind: 'cord', cords: 4, radius: 0.045,
      arc: [[0.85, 0.10, 0.42], [0.85, 0.05, 0.10], [0.85, 0.05, -0.22], [0.85, 0.10, -0.54]],
      anchor: [[-0.04, -0.80, 0.62], [-0.04, -0.83, 0.12], [-0.04, -0.85, -0.40], [-0.04, -0.86, -0.92]],
      // Retroperitoneal: these kidneys are plastered to the dorsal wall and fed by
      // a whole series of short segmental vessels straight off the aorta. Almost
      // no slack, and the highest grip in the frog table — you are not meant to
      // lift a frog kidney out, you are meant to discover that it will not come.
      slack: 0.08, limit: 0.42, grip: 0.94,
      sag: 0.06, blanch: 0xe8b4a4,
      color: 0xa8362e, tissue: 'vessel',
      note: 'Three sets of vessels stitch each kidney to the roof of the cavity along its whole medial border. Segmental RENAL ARTERIES spring straight off the dorsal aorta; EFFERENT RENAL VEINS leave the medial border for the postcaval; and — the feature that makes an amphibian kidney worth dissecting — AFFERENT RENAL (renal portal) VEINS enter the lateral border, carrying venous blood from the hind limbs and dorsal body wall through the kidney BEFORE it ever reaches the heart. Mammals have no such system. The kidney is retroperitoneal: it stays put when the gut is removed.',
      strainText: 'The renal vessels are taut and pale. The kidney is retroperitoneal — it is not going to lift.',
      damageText: 'A renal vessel has torn at the aorta. In a live specimen this is where the field fills with blood.',
      tearText: 'The renal vessels have avulsed from the dorsal aorta. The kidney is off its blood supply and the aortic wall is open — this is the bleed that ends a live dissection.',
      cutText: 'Renal vessels divided at the hilum. The kidney lifts off the dorsal wall; the aortic stumps are what you would have to tie in life.',
    },
    {
      id: 'renal-vessels-right',
      name: 'Renal vessels, right — renal arteries, efferent renal veins and the renal portal (afferent renal) veins',
      part: 'kidney-right',
      kind: 'cord', cords: 4, radius: 0.045,
      arc: [[-0.85, 0.10, 0.42], [-0.85, 0.05, 0.10], [-0.85, 0.05, -0.22], [-0.85, 0.10, -0.54]],
      anchor: [[0.04, -0.80, 0.62], [0.04, -0.83, 0.12], [0.04, -0.85, -0.40], [0.04, -0.86, -0.92]],
      slack: 0.08, limit: 0.42, grip: 0.94,
      sag: 0.06, blanch: 0xe8b4a4,
      color: 0xa8362e, tissue: 'vessel',
      note: 'Three sets of vessels stitch each kidney to the roof of the cavity along its whole medial border. Segmental RENAL ARTERIES spring straight off the dorsal aorta; EFFERENT RENAL VEINS leave the medial border for the postcaval; and — the feature that makes an amphibian kidney worth dissecting — AFFERENT RENAL (renal portal) VEINS enter the lateral border, carrying venous blood from the hind limbs and dorsal body wall through the kidney BEFORE it ever reaches the heart. Mammals have no such system. The kidney is retroperitoneal: it stays put when the gut is removed.',
      strainText: 'The renal vessels are taut and pale. The kidney is retroperitoneal — it is not going to lift.',
      damageText: 'A renal vessel has torn at the aorta. In a live specimen this is where the field fills with blood.',
      tearText: 'The renal vessels have avulsed from the dorsal aorta. The kidney is off its blood supply and the aortic wall is open — this is the bleed that ends a live dissection.',
      cutText: 'Renal vessels divided at the hilum. The kidney lifts off the dorsal wall; the aortic stumps are what you would have to tie in life.',
    },
    {
      id: 'pulmonary-vessels-left',
      name: 'Pulmonary artery and pulmonary vein, left',
      part: 'lung-left',
      kind: 'cord', cords: 2, radius: 0.05,
      arc: [[0.78, -0.15, 0.18], [0.78, -0.05, -0.28]],
      anchor: [[-0.30, 0.44, 2.56], [-0.24, 0.52, 2.34]],
      slack: 0.16, limit: 0.75, grip: 0.86,
      sag: 0.10, blanch: 0xe6b6ae,
      color: 0xb04c58, tissue: 'vessel',
      note: 'Each lung is held to the heart by its own vessels. The truncus arteriosus divides into paired truncal arches, each giving three: carotid (3rd), systemic (4th) and PULMOCUTANEOUS (6th). The pulmocutaneous arch then forks into the pulmonary artery to the lung and the CUTANEOUS artery to the skin — a frog gases a large share of its oxygen across wet skin, so that branch is not a footnote. The pulmonary vein returns to the left atrium. Lift the lung and the pair comes taut across the cavity.',
      strainText: 'The pulmonary vessels are taut between the lung and the heart.',
      damageText: 'A pulmonary vessel is torn at the hilum of the lung.',
      tearText: 'The pulmonary vessels have torn off the pulmocutaneous arch. That lung is detached from the circulation — and if the tear runs back past the fork, so is the cutaneous supply to that flank.',
      cutText: 'Pulmonary vessels divided at the hilum. The lung lifts free — trace the cut ends back to the pulmocutaneous arch and to the left atrium.',
    },
    {
      id: 'pulmonary-vessels-right',
      name: 'Pulmonary artery and pulmonary vein, right',
      part: 'lung-right',
      kind: 'cord', cords: 2, radius: 0.05,
      arc: [[-0.78, -0.15, 0.18], [-0.78, -0.05, -0.28]],
      anchor: [[0.30, 0.44, 2.56], [0.24, 0.52, 2.34]],
      slack: 0.16, limit: 0.75, grip: 0.86,
      sag: 0.10, blanch: 0xe6b6ae,
      color: 0xb04c58, tissue: 'vessel',
      note: 'Each lung is held to the heart by its own vessels. The truncus arteriosus divides into paired truncal arches, each giving three: carotid (3rd), systemic (4th) and PULMOCUTANEOUS (6th). The pulmocutaneous arch then forks into the pulmonary artery to the lung and the CUTANEOUS artery to the skin — a frog gases a large share of its oxygen across wet skin, so that branch is not a footnote. The pulmonary vein returns to the left atrium. Lift the lung and the pair comes taut across the cavity.',
      strainText: 'The pulmonary vessels are taut between the lung and the heart.',
      damageText: 'A pulmonary vessel is torn at the hilum of the lung.',
      tearText: 'The pulmonary vessels have torn off the pulmocutaneous arch. That lung is detached from the circulation — and if the tear runs back past the fork, so is the cutaneous supply to that flank.',
      cutText: 'Pulmonary vessels divided at the hilum. The lung lifts free — trace the cut ends back to the pulmocutaneous arch and to the left atrium.',
    },
  ],

  heart: [
    /* The chordae. heart.js already models five discrete static cords, which is
     * five more than most teaching models and still an order of magnitude fewer
     * than a real mitral apparatus — a human anterior leaflet carries dozens.
     * These live cords are therefore ADDITIONAL and interleaved, not a duplicate:
     * they run from the papillary tips to intermediate points on the free edge and
     * they actually tighten, blanch and rupture when you pull the leaflet. */
    {
      id: 'chordae-anterolateral',
      name: 'Chordae tendineae — anterolateral papillary group',
      part: 'mitral-leaflet',
      anchorPart: 'papillary-a',
      kind: 'cord', cords: 5, radius: 0.022,
      arc: [[0.62, -0.80, 0.55], [0.20, -0.86, 0.72], [-0.28, -0.88, 0.62], [-0.62, -0.84, 0.28], [-0.72, -0.80, -0.18]],
      anchorArc: [[0.16, 0.90, 0.10], [0.05, 0.95, 0.05], [-0.04, 0.96, -0.02], [-0.12, 0.92, -0.10], [-0.18, 0.88, 0.12]],
      // Chordae are near-inextensible collagen. They sit almost taut in diastole
      // and go bar-tight in systole, so the slack is tiny and the limit is short:
      // pull a leaflet and it stops dead, then it ruptures. That abruptness is the
      // whole point of the structure.
      slack: 0.03, limit: 0.30, grip: 0.97,
      sag: 0.05, blanch: 0xfffaf2,
      color: 0xe6dac4, tissue: 'valve',
      note: 'Collagen "heart-strings" from the anterolateral papillary muscle to the free edge of both mitral leaflets. They do not open or close the valve — they stop it everting into the atrium when the ventricle squeezes.',
      strainText: 'The chordae are bar-tight and blanched white. The leaflet cannot go any further into the atrium — that is exactly their job.',
      damageText: 'A chorda has stretched and partly ruptured. The leaflet edge it held now sits higher than its neighbours.',
      tearText: 'A chorda tendinea has ruptured. That segment of the mitral leaflet is flail — in systole it prolapses into the left atrium and the valve leaks.',
      cutText: 'Chordae divided at the papillary tip. Pour water into the ventricle now and it runs straight back through the mitral orifice — this is the classic demonstration of what the chordae are for.',
    },
    {
      id: 'chordae-posteromedial',
      name: 'Chordae tendineae — posteromedial papillary group',
      part: 'mitral-leaflet',
      anchorPart: 'papillary-b',
      kind: 'cord', cords: 4, radius: 0.022,
      arc: [[-0.55, -0.82, -0.58], [-0.12, -0.88, -0.74], [0.35, -0.86, -0.62], [0.66, -0.80, -0.30]],
      anchorArc: [[0.14, 0.90, -0.08], [0.02, 0.95, 0.02], [-0.10, 0.93, 0.08], [-0.16, 0.88, -0.10]],
      slack: 0.03, limit: 0.30, grip: 0.97,
      sag: 0.05, blanch: 0xfffaf2,
      color: 0xe6dac4, tissue: 'valve',
      note: 'The second mitral group. Each papillary muscle sends chordae to BOTH leaflets, so no leaflet is ever held by one muscle alone — lose one muscle and the valve is damaged, not destroyed.',
      strainText: 'The posteromedial chordae are taut and white. Both papillary muscles are sharing the load.',
      damageText: 'A posteromedial chorda has partly ruptured; the load is shifting onto its neighbours.',
      tearText: 'A posteromedial chorda has ruptured. The posterior mitral leaflet is flail along that segment and the valve now regurgitates.',
      cutText: 'Posteromedial chordae divided. The leaflet is released; test the valve with water and watch it fail.',
    },
    {
      id: 'chordae-tricuspid',
      name: 'Chordae tendineae — tricuspid, anterior papillary group',
      part: 'tricuspid-leaflet',
      // The right ventricle's anterior papillary muscle is not modelled as its own
      // part; heart.js does model the MODERATOR BAND, which by definition runs from
      // the septum to the base of that muscle. Anchoring here is therefore the
      // anatomically honest stand-in, and it makes the band's purpose visible.
      anchorPart: 'moderator-band',
      kind: 'cord', cords: 3, radius: 0.02,
      arc: [[-0.60, -0.82, 0.45], [-0.05, -0.88, 0.10], [0.55, -0.82, -0.35]],
      anchorArc: [[0.35, 0.86, 0.20], [0, 0.92, 0], [-0.35, 0.86, -0.20]],
      slack: 0.04, limit: 0.32, grip: 0.95,
      sag: 0.06, blanch: 0xfffaf2,
      color: 0xe6dac4, tissue: 'valve',
      note: 'Chordae from the anterior papillary muscle of the right ventricle to the tricuspid leaflets. The moderator band runs to the base of that muscle carrying the right bundle branch — the conduction system and the valve apparatus arriving at the same place is not a coincidence.',
      strainText: 'The tricuspid chordae are taut. Three leaflets, not two — this is how you tell right from left from the inside.',
      damageText: 'A tricuspid chorda has partly ruptured.',
      tearText: 'A tricuspid chorda has ruptured. The anterior tricuspid leaflet is flail and the right AV orifice no longer closes.',
      cutText: 'Tricuspid chordae divided at the papillary muscle. The leaflet swings free into the right atrium.',
    },

    /* The pericardial reflections. The serous pericardium is one continuous sac
     * folded back on itself; where it turns from the heart's surface onto the
     * great vessels it forms two reflections — an arterial one sleeving aorta and
     * pulmonary trunk together, and a J-shaped venous one around the cavae and the
     * pulmonary veins whose cul-de-sac is the oblique sinus. */
    {
      id: 'pericardial-reflection-arterial',
      name: 'Arterial pericardial reflection (arterial mesocardium)',
      part: 'pericardium',
      kind: 'fan', cols: 12, rows: 5,
      arc: [[-0.30, 0.84, 0.28], [-0.04, 0.88, 0.12], [0.22, 0.84, -0.06]],
      anchor: [[-0.66, 4.55, 0.22], [-0.20, 4.30, -0.10], [0.42, 4.60, -0.38]],
      slack: 0.12, limit: 0.55, grip: 0.88,
      sag: 0.14, vessels: 2, arcades: false,
      blush: 0xd8dfd8, opacity: 0.34, thickness: 0.18, fibrous: true,
      note: 'The pericardium turns off the heart onto the aorta and pulmonary trunk as one common sleeve — the two arterial trunks share a single reflection, which is why a probe passed behind them (the transverse sinus) slips between the arteries in front and the veins behind.',
      strainText: 'The arterial reflection is drawn tight where the pericardium sleeves the great arteries.',
      damageText: 'The arterial reflection is torn where it sleeves the aorta and pulmonary trunk.',
      tearText: 'The arterial pericardial reflection has torn. The sac no longer closes around the arterial roots, and the transverse sinus is laid open.',
      cutText: 'Arterial reflection divided. The pericardium is now open around the aorta and pulmonary trunk — you can pass a probe through the transverse sinus.',
    },
    {
      id: 'pericardial-reflection-venous',
      name: 'Venous pericardial reflection (oblique sinus)',
      part: 'pericardium',
      kind: 'fan', cols: 14, rows: 5,
      arc: [[0.34, 0.68, -0.28], [0.10, 0.64, -0.50], [-0.24, 0.66, -0.46]],
      anchor: [[1.88, 3.55, -0.10], [1.62, 2.30, -0.62], [-0.60, 3.35, -2.10], [-1.72, 3.25, -1.96]],
      slack: 0.14, limit: 0.60, grip: 0.86,
      sag: 0.16, vessels: 2, arcades: false,
      blush: 0xd8dfd8, opacity: 0.34, thickness: 0.18, fibrous: true,
      note: 'A J-shaped reflection running around the two venae cavae and the four pulmonary veins. The blind cul-de-sac it encloses behind the left atrium is the oblique sinus — slide a finger up behind the heart and that is where it stops.',
      strainText: 'The venous reflection is stretched across the back of the atria.',
      damageText: 'The venous reflection is torn behind the left atrium; the oblique sinus is breached.',
      tearText: 'The venous pericardial reflection has torn. The oblique sinus is destroyed and the sac no longer closes behind the atria.',
      cutText: 'Venous reflection divided. The oblique sinus is opened out — the heart can now be lifted forward off its posterior attachments.',
    },

    /* The great vessels ARE the suspension. Inside an opened pericardium the heart
     * hangs on nothing else. These entries render the short fibrous cuff at each
     * vessel-chamber junction rather than redrawing the vessel — heart.js already
     * models the vessels themselves as first-class parts, and drawing a second
     * copy would be a lie about the anatomy. */
    {
      id: 'caval-attachment',
      name: 'Venae cavae — caval attachment of the right atrium',
      part: 'right-atrium',
      kind: 'cord', cords: 3, radius: 0.075,
      arc: [[0.35, 0.82, 0.22], [0.55, 0.30, -0.30], [0.18, -0.66, -0.40]],
      anchor: [[1.86, 3.92, -0.04], [1.90, 3.20, -0.28], [1.66, 1.42, -0.62]],
      slack: 0.10, limit: 0.50, grip: 0.92,
      sag: 0.05, blanch: 0xc8bcc8,
      color: 0x6f5566, tissue: 'vessel',
      note: 'The superior and inferior venae cavae open into the right atrium above and below. Along with the pulmonary veins they are the only things holding the heart inside an opened pericardium — cut them and the heart is loose in your hand.',
      strainText: 'The caval attachments are drawn tight — the heart is hanging on its own great veins.',
      damageText: 'The caval junction is torn. The atrial wall is thin here and it tears before the vein does.',
      tearText: 'The caval attachments have torn away from the right atrium. The heart is off its venous return — and the only things that ever held it in the pericardium were its own great vessels.',
      cutText: 'Venae cavae divided at the atrium. Look into the open right atrium: the superior caval orifice above, the inferior below with its rudimentary Eustachian valve, and the mouth of the coronary sinus between the inferior caval orifice and the tricuspid ring — not between the two cavae.',
    },
    {
      id: 'pulmonary-venous-attachment',
      name: 'Pulmonary veins — attachment of the left atrium',
      part: 'left-atrium',
      kind: 'cord', cords: 3, radius: 0.055,
      arc: [[-0.35, 0.22, -0.85], [0.25, 0.00, -0.88], [-0.70, -0.28, -0.62]],
      anchor: [[-0.66, 3.22, -2.32], [0.12, 3.06, -2.14], [-1.80, 3.20, -1.96]],
      slack: 0.10, limit: 0.52, grip: 0.90,
      sag: 0.05, blanch: 0xc9b4bc,
      color: 0x7a5560, tissue: 'vessel',
      note: 'Four short pulmonary veins — two from each lung — enter the back of the left atrium. They are the only veins in the ADULT that carry oxygenated blood (the fetal umbilical vein does the same job before birth, which is why the qualifier matters), and they are the reason the left atrium is the most posterior chamber of the heart: an enlarged left atrium presses on the oesophagus directly behind it.',
      strainText: 'The pulmonary veins are taut behind the left atrium.',
      damageText: 'A pulmonary venous junction is torn at the atrial wall.',
      tearText: 'The pulmonary veins have avulsed from the left atrium. The oxygenated return is off, and the back of the atrium is open.',
      cutText: 'Pulmonary veins divided. Open the left atrium and count the four orifices in its posterior wall.',
    },
    {
      id: 'aortic-root-attachment',
      name: 'Aorta — aortic root and fibrous annulus',
      part: 'lv-free-wall',
      kind: 'cord', cords: 3, radius: 0.07,
      arc: [[0.14, 0.90, 0.14], [0.02, 0.92, 0.02], [-0.10, 0.90, -0.08]],
      anchor: [[0.10, 3.95, -0.12], [-0.06, 4.05, -0.18], [-0.20, 3.90, -0.06]],
      // Nothing about this junction is stretchy. The aortic annulus is part of the
      // fibrous skeleton of the heart; it does not yield, it transects.
      slack: 0.04, limit: 0.30, grip: 0.97,
      sag: 0.02, blanch: 0xf0e6d4,
      color: 0xcbb49b, tissue: 'vessel',
      note: 'The aorta is continuous with the left ventricle through the fibrous aortic annulus — part of the fibrous skeleton of the heart, which also carries the mitral annulus. The coronary arteries arise from the sinuses immediately above it.',
      strainText: 'The aortic root will not stretch. This junction is fibrous skeleton, not muscle.',
      damageText: 'The aortic annulus is torn. In a living patient that is annular disruption with acute severe aortic regurgitation — not a dissection, which is an INTIMAL tear letting blood track within the media. Both start here; they are different injuries.',
      tearText: 'The aortic root has torn away from the left ventricle — transection at the aortic annulus, immediately fatal in life.',
      cutText: 'Aorta divided above the annulus. Look down into the stump: three semilunar cusps, and the coronary ostia in two of the three sinuses.',
    },
    {
      id: 'pulmonary-trunk-attachment',
      name: 'Pulmonary trunk — right ventricular outflow attachment',
      part: 'rv-free-wall',
      kind: 'cord', cords: 3, radius: 0.07,
      arc: [[-0.16, 0.90, 0.52], [-0.02, 0.92, 0.40], [0.12, 0.88, 0.30]],
      anchor: [[-0.52, 3.86, 0.94], [-0.44, 3.62, 0.98], [-0.34, 3.40, 1.02]],
      slack: 0.06, limit: 0.36, grip: 0.94,
      sag: 0.03, blanch: 0xd6c2d0,
      color: 0x8f7286, tissue: 'vessel',
      note: 'The pulmonary trunk leaves the right ventricle in front of and to the left of the aorta, then spirals behind it — the two outflow tracts cross, which is the fingerprint of how the embryonic truncus arteriosus divides.',
      strainText: 'The right ventricular outflow is taut where the trunk leaves the infundibulum.',
      damageText: 'The pulmonary infundibulum is torn where the trunk leaves it.',
      tearText: 'The pulmonary trunk has torn off the right ventricular outflow. The infundibulum is open.',
      cutText: 'Pulmonary trunk divided above its valve. Its three semilunar cusps are thinner and paler than the aortic ones, and its wall is visibly thinner: the right ventricle ejects against about 25 mmHg systolic where the left ejects against 120 — a fifth of the pressure, and roughly a tenth of the vascular resistance. Same stroke volume, a fraction of the work.',
    },
  ],
};

/* Static decoration that a live tether replaces. A painted mesentery sitting next
 * to a responsive one does not read as "two mesenteries" — it reads as a modelling
 * error, and it is the only thing in this app that would. Matched by geometry
 * type rather than by index so a later edit to frog.js cannot silently hide the
 * wrong child. */
const CON_HIDE_STATIC = {
  frog: [
    { part: 'small-intestine', geometry: 'PlaneGeometry' },
    // frog.js also parents THREE static mesenteric vessel tubes to the gut, sitting
    // in the plane of the painted fan. Hiding the plane alone leaves three red
    // lines floating in mid-air where the sheet used to be — worse than the
    // duplicate we were trying to avoid. They go with it.
    { part: 'small-intestine', geometry: 'TubeGeometry' },
  ],
  heart: [],
};

const CON_TEX = {};

function CON_clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/* The vessel map for a membrane. Drawn ONCE per (count, arcades) pair and shared
 * by every fan that asks for it — a mesentery, a gonadal fold and a pericardial
 * reflection between them cost at most three 256px canvases.
 *
 * Layout: the fan's UV v runs 0 at the organ edge to 1 at the root, and a
 * CanvasTexture is flipped by default, so v=1 samples the TOP of the canvas.
 * Vessels therefore converge at the top centre — the mesenteric root — and fan
 * down toward the gut, which is precisely how you see them held up to the light.
 *
 * The background is WHITE on purpose. The sheet's own colour lives in the vertex
 * colours, so blanching can whiten the membrane while this map keeps the vessels
 * dark: map and vertex colour multiply, and a dark line stays dark no matter how
 * pale the sheet behind it goes.
 */
function CON_vesselTexture(THREE, count, arcades) {
  const key = count + (arcades ? 'a' : 'p');
  if (Object.prototype.hasOwnProperty.call(CON_TEX, key)) return CON_TEX[key];
  if (typeof document === 'undefined') { CON_TEX[key] = null; return null; }

  const S = 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  // A 2D context is not guaranteed: canvas-count limits, a blocked-canvas privacy
  // extension and some headless runners all hand back null. Losing the vessel map
  // costs the picture; throwing here costs the entire module, because main.js
  // wraps construction in try/catch and would drop every tether on the specimen.
  const g = cv.getContext && cv.getContext('2d');
  if (!g) { CON_TEX[key] = null; return null; }
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, S, S);

  // Capillary blush: a faint stipple so the sheet is never dead flat, and so the
  // fine bed visibly survives when the big vessels are the only thing left.
  g.globalAlpha = 0.1;
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    g.fillStyle = Math.random() < 0.5 ? '#c98a80' : '#b9808f';
    g.fillRect(x, y, 1.2, 1.2);
  }
  g.globalAlpha = 1;

  const rootX = S * 0.5, rootY = S * 0.03;
  const arcadeY = S * 0.74;
  const tips = [];

  const drawPair = (x0, y0, x1, y1, cx, cy, w) => {
    // Artery and its companion vein run together in the fold, the vein slightly
    // wider and duskier. Drawing them as a pair is what makes a student say
    // "those are vessels" instead of "those are lines".
    g.lineCap = 'round';
    g.strokeStyle = '#5f2b46'; g.lineWidth = w * 1.3;
    g.beginPath(); g.moveTo(x0 + w, y0); g.quadraticCurveTo(cx + w, cy, x1 + w * 1.4, y1); g.stroke();
    g.strokeStyle = '#9c2a24'; g.lineWidth = w;
    g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.stroke();
  };

  for (let i = 0; i < count; i++) {
    const f = count === 1 ? 0.5 : i / (count - 1);
    const tipX = S * (0.08 + 0.84 * f);
    const midX = rootX + (tipX - rootX) * 0.55;
    drawPair(rootX, rootY, tipX, arcades ? arcadeY : S * 0.98, midX, S * 0.4, 4.4 - Math.abs(f - 0.5) * 1.8);
    tips.push(tipX);
    // one secondary division part-way down, as real mesenteric branches do
    const bx = tipX + (f < 0.5 ? 1 : -1) * S * 0.07;
    drawPair(midX, S * 0.42, bx, arcades ? arcadeY : S * 0.94, (midX + bx) / 2, S * 0.6, 2.3);
    tips.push(bx);
  }

  if (arcades) {
    // Mesenteric ARCADES: neighbouring branches loop into one another near the gut
    // border, and short straight vasa recta run off the arcades into the wall.
    // Anyone who has held a mesentery up to a window recognises this immediately.
    tips.sort((a, b) => a - b);
    g.strokeStyle = '#a02722'; g.lineWidth = 2.4; g.lineCap = 'round';
    for (let i = 0; i < tips.length - 1; i++) {
      const a = tips[i], b = tips[i + 1];
      if (b - a > S * 0.3) continue;
      g.beginPath();
      g.moveTo(a, arcadeY);
      g.quadraticCurveTo((a + b) / 2, arcadeY + S * 0.09, b, arcadeY);
      g.stroke();
      const m = (a + b) / 2;
      for (let k = -1; k <= 1; k++) {
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(m + k * S * 0.035, arcadeY + S * 0.075);
        g.lineTo(m + k * S * 0.05, S * 0.99);
        g.stroke();
      }
      g.lineWidth = 2.4;
    }
  }

  let t = null;
  try {
    t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.colorSpace = THREE.SRGBColorSpace;    // this one IS colour, unlike the tissue maps
    t.anisotropy = 4;
    t.needsUpdate = true;
  } catch (err) {
    t = null;                               // a tainted or zero-sized canvas: go mapless
  }
  CON_TEX[key] = t;
  return t;
}

/* ========================================================================== */
export function createConstraints(THREE, scene, parts, specimenId) {
  const byId = new Map((parts || []).map((p) => [p.id, p]));
  const listeners = [];
  const emit = (e) => { for (let i = 0; i < listeners.length; i++) { try { listeners[i](e); } catch (err) { /* a bad listener must not stop the anatomy */ } } };

  // Parent to the SPECIMEN GROUP, not the scene: organ meshes are its children, so
  // working in that space means an attachment point is just mesh.matrix applied to
  // a local point — no world round-trip, no inverse matrices, and the frog's
  // supine rotation and the heart's 0.9 scale are inherited for free.
  const root = (parts && parts[0] && parts[0].mesh && parts[0].mesh.parent) || scene;
  const holder = new THREE.Group();
  holder.name = 'constraints';
  holder.renderOrder = 2;
  root.add(holder);

  // Scratch. update() must not allocate — this runs every frame on a school laptop.
  const _a = new THREE.Vector3();
  const _b = new THREE.Vector3();
  const _p = new THREE.Vector3();
  const _q = new THREE.Vector3();
  const _side = new THREE.Vector3();
  const _tan = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _nrm = new THREE.Vector3();
  const _c = new THREE.Color();
  const _blush = new THREE.Color();
  const _blanch = new THREE.Color();

  const tethers = [];
  const byPart = new Map();      // partId -> [tether]
  const cut = [];                // permanent record: torn or divided
  const hidden = [];             // static decoration we switched off; restored on dispose
  let visible = true;
  let faulted = false;           // a tether threw mid-frame; report once, keep rendering

  // dissect.js endLift() teleports a removed organ onto the tray when it has been
  // dragged further than 2.6 from home. An INTACT tether can only see that as an
  // impossible strain, and if it responds by restraining it will drag the removed
  // organ back out of the tray every frame. Past this distance the organ is not
  // being pulled, it has been relocated, and the tether retires quietly.
  const CON_TELEPORT_SQ = 2.9 * 2.9;

  /* ---- helpers ---------------------------------------------------------- */

  // Normalised box coordinate (-1..1 per axis) -> the mesh's own local space.
  // Uses geometry.boundingBox, which every part in this app is guaranteed to have
  // (both builders call computeBoundingBox in their add()).
  function boxToLocal(mesh, u, v, w, out) {
    const geo = mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    if (!bb) return out.set(0, 0, 0);
    out.set(
      (bb.min.x + bb.max.x) * 0.5 + u * (bb.max.x - bb.min.x) * 0.5,
      (bb.min.y + bb.max.y) * 0.5 + v * (bb.max.y - bb.min.y) * 0.5,
      (bb.min.z + bb.max.z) * 0.5 + w * (bb.max.z - bb.min.z) * 0.5,
    );
    return out;
  }

  // Resample a polyline (array of triples, or a function (i,n)->triple) to n+1
  // evenly indexed samples. Index-parametric rather than arc-length: the control
  // points are hand-placed and evenly spaced already, and arc-length resampling
  // would cost a pass without changing the picture.
  function resample(src, n, out) {
    if (typeof src === 'function') {
      for (let i = 0; i <= n; i++) {
        const t = src(i, n);
        out[i * 3] = t[0]; out[i * 3 + 1] = t[1]; out[i * 3 + 2] = t[2];
      }
      return out;
    }
    const k = src.length;
    for (let i = 0; i <= n; i++) {
      const t = n === 0 ? 0 : (i / n) * (k - 1);
      const a = Math.min(k - 1, Math.floor(t));
      const b = Math.min(k - 1, a + 1);
      const f = t - a;
      out[i * 3] = src[a][0] + (src[b][0] - src[a][0]) * f;
      out[i * 3 + 1] = src[a][1] + (src[b][1] - src[a][1]) * f;
      out[i * 3 + 2] = src[a][2] + (src[b][2] - src[a][2]) * f;
    }
    return out;
  }

  function makeMaterial(spec) {
    const useMat = typeof mat === 'function';
    if (spec.kind === 'cord') {
      const m = useMat
        ? mat(THREE, spec.color, { tissue: spec.tissue || 'vessel', rough: 0.44, clear: 0.5, clearRough: 0.3 })
        : new THREE.MeshPhysicalMaterial({ color: new THREE.Color(spec.color), roughness: 0.44, clearcoat: 0.5 });
      return m;
    }
    // A membrane. White base colour: the sheet's tone comes from vertex colours so
    // it can blanch, and the vessel map multiplies over the top.
    const m = useMat
      ? mat(THREE, 0xffffff, {
        tissue: 'serous', vcol: true, trans: true, opacity: spec.opacity != null ? spec.opacity : 0.3,
        side: THREE.DoubleSide, transmission: spec.fibrous ? 0.28 : 0.4,
        thickness: spec.thickness != null ? spec.thickness : 0.2,
        rough: spec.fibrous ? 0.55 : 0.34, clear: 0.45, clearRough: 0.3,
      })
      : new THREE.MeshPhysicalMaterial({
        color: 0xffffff, vertexColors: true, transparent: true,
        opacity: spec.opacity != null ? spec.opacity : 0.3, side: THREE.DoubleSide, roughness: 0.4,
      });
    const tex = CON_vesselTexture(THREE, spec.vessels || 0, !!spec.arcades);
    if (tex && spec.vessels) m.map = tex;
    // A translucent sheet that writes depth punches a hole in whatever is behind
    // it — including the organ it is attached to. Same trick frog.js uses for its
    // static mesentery, for the same reason.
    m.depthWrite = false;
    return m;
  }

  /* ---- construction ------------------------------------------------------ */

  function buildFan(t) {
    const C = t.spec.cols || 12, R = t.spec.rows || 5;
    const nv = (C + 1) * (R + 1);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(nv * 3);
    const col = new Float32Array(nv * 3);
    const uv = new Float32Array(nv * 2);
    const idx = [];
    for (let j = 0; j <= R; j++) {
      for (let i = 0; i <= C; i++) {
        const o = j * (C + 1) + i;
        uv[o * 2] = i / C;
        uv[o * 2 + 1] = j / R;
        col[o * 3] = col[o * 3 + 1] = col[o * 3 + 2] = 1;
      }
    }
    for (let j = 0; j < R; j++) {
      for (let i = 0; i < C; i++) {
        const a = j * (C + 1) + i, b = a + 1, c = a + (C + 1), d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    // Own the normal buffer rather than letting computeVertexNormals() create it.
    // r160's computeVertexNormals() allocates eight Vector3 per call, and calling
    // it once per fan per frame is the only thing in this module that would
    // allocate in the loop — which the header promises it does not. rewriteFan()
    // writes these analytically instead, the same way rewriteCords() already does.
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
    geo.setIndex(idx);
    t.cols = C; t.rows = R;
    t.geo = geo;
    t.posAttr = geo.attributes.position;
    t.colAttr = geo.attributes.color;
    t.norAttr = geo.attributes.normal;
    t.mesh = new THREE.Mesh(geo, makeMaterial(t.spec));
    t.mesh.renderOrder = 2;
    t.mesh.frustumCulled = true;
  }

  function buildCords(t) {
    const N = t.spec.cords || 3;
    const RS = 6, LS = 7;                       // radial, length segments per cord
    const nv = N * (LS + 1) * RS;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(nv * 3);
    const nor = new Float32Array(nv * 3);
    // UVs are not decoration here: mat() hands every cord the shared tissue
    // normal/roughness maps, and without a uv attribute WebGL feeds the shader a
    // constant (0,0) so the whole cord samples one texel and looks like plastic.
    const uv = new Float32Array(nv * 2);
    const idx = [];
    for (let c = 0; c < N; c++) {
      const base = c * (LS + 1) * RS;
      for (let j = 0; j <= LS; j++) {
        for (let k = 0; k < RS; k++) {
          const o = (base + j * RS + k) * 2;
          uv[o] = k / RS;          // around the cord
          uv[o + 1] = j / LS;      // along it — gives the elastic map its grain
        }
      }
      for (let j = 0; j < LS; j++) {
        for (let k = 0; k < RS; k++) {
          const k2 = (k + 1) % RS;
          const a = base + j * RS + k, b = base + j * RS + k2;
          const d = base + (j + 1) * RS + k, e = base + (j + 1) * RS + k2;
          idx.push(a, d, b, b, d, e);
        }
      }
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    t.cols = N - 1;                             // one attachment point per cord
    t.rs = RS; t.ls = LS; t.cords = N;
    t.geo = geo;
    t.posAttr = geo.attributes.position;
    t.norAttr = geo.attributes.normal;
    t.mesh = new THREE.Mesh(geo, makeMaterial(t.spec));
    t.mesh.frustumCulled = true;
  }

  (CON_TETHERS[specimenId] || []).forEach((spec) => {
    const part = byId.get(spec.part);
    if (!part || !part.mesh) return;            // a specimen edit removed the organ
    const anchorPart = spec.anchorPart ? byId.get(spec.anchorPart) : null;
    if (spec.anchorPart && !anchorPart) return;

    // A 'band' is a narrow fan. Modelling it any other way would mean a second
    // rebuild path for no visual gain, so bands synthesise a short attachment
    // arc across their own width and reuse the membrane machinery.
    const kind = spec.kind === 'cord' ? 'cord' : 'fan';
    const t = {
      spec, part, anchorPart, kind,
      L0: 0, tension: 0, resist: 0, intact: true,
      damaged: false, warned: false, overT: 0, recoil: 0, mode: null, retired: false,
      lastX: NaN, lastY: NaN, lastZ: NaN, lastA: NaN, lastT: -1,
    };

    if (kind === 'cord') buildCords(t); else buildFan(t);

    const n = t.cols;
    t.organLocal = new Float32Array((n + 1) * 3);
    t.anchorLocal = new Float32Array((n + 1) * 3);
    t.organRoot = new Float32Array((n + 1) * 3);
    t.anchorRoot = new Float32Array((n + 1) * 3);

    // Widen a band's attachment into a real strip rather than a knife edge.
    const arcSrc = (spec.kind === 'band' && spec.width)
      ? widen(spec.arc, spec.width) : spec.arc;
    const ancSrc = (spec.kind === 'band' && spec.width)
      ? widen(spec.anchorArc || spec.anchor, spec.width, !spec.anchorArc) : (spec.anchorArc || spec.anchor);

    // organ arc: normalised box -> mesh-local, cached once.
    const tmp = resample(arcSrc, n, new Float32Array((n + 1) * 3));
    for (let i = 0; i <= n; i++) {
      boxToLocal(part.mesh, tmp[i * 3], tmp[i * 3 + 1], tmp[i * 3 + 2], _p);
      t.organLocal[i * 3] = _p.x; t.organLocal[i * 3 + 1] = _p.y; t.organLocal[i * 3 + 2] = _p.z;
    }
    // anchor arc: either group-space absolute, or another organ's box coordinates.
    const atmp = resample(ancSrc, n, new Float32Array((n + 1) * 3));
    for (let i = 0; i <= n; i++) {
      if (anchorPart) {
        boxToLocal(anchorPart.mesh, atmp[i * 3], atmp[i * 3 + 1], atmp[i * 3 + 2], _p);
        t.anchorLocal[i * 3] = _p.x; t.anchorLocal[i * 3 + 1] = _p.y; t.anchorLocal[i * 3 + 2] = _p.z;
      } else {
        t.anchorLocal[i * 3] = atmp[i * 3];
        t.anchorLocal[i * 3 + 1] = atmp[i * 3 + 1];
        t.anchorLocal[i * 3 + 2] = atmp[i * 3 + 2];
      }
    }

    // Home position, so the restraint has something to pull back toward, and the
    // rest length, measured with the specimen undisturbed.
    t.home = part.mesh.position.clone();
    t.homeScale = part.mesh.scale.x;
    project(t);
    t.L0 = Math.max(0.06, centroidDistance(t));

    holder.add(t.mesh);
    tethers.push(t);
    if (!byPart.has(spec.part)) byPart.set(spec.part, []);
    byPart.get(spec.part).push(t);
  });

  // Turn a 1-D attachment line into a 2-D strip by offsetting alternate samples
  // sideways. Cheap, and a band read edge-on is a band you cannot see — which
  // matters enormously on the frog, whose camera is nearly top-down.
  function widen(src, w, isAbsolute) {
    if (typeof src === 'function') return src;
    const out = [];
    for (let i = 0; i < src.length; i++) {
      const s = (i % 2 === 0 ? 1 : -1) * w * 0.5;
      const p = src[i];
      // Offset in the axis with the least existing variation, so the strip opens
      // out instead of folding along the line it already follows.
      out.push(isAbsolute ? [p[0] + s * 0.6, p[1], p[2]] : [p[0] + s, p[1], p[2]]);
    }
    return out;
  }

  // Hide any static decoration this module now animates for real.
  // Only worth doing if we actually built a tether for that part — otherwise we
  // would delete the painted mesentery and put nothing in its place.
  (CON_HIDE_STATIC[specimenId] || []).forEach((h) => {
    const p = byId.get(h.part);
    if (!p || !p.mesh || !byPart.has(h.part)) return;
    p.mesh.children.forEach((ch) => {
      if (ch.geometry && ch.geometry.type === h.geometry && ch.visible) {
        ch.visible = false;
        hidden.push(ch);           // dispose() puts the specimen back as it found it
      }
    });
  });

  /* ---- per-frame maths --------------------------------------------------- */

  // Push both cached arcs into specimen-group space using the meshes' own local
  // matrices. mesh.matrix is local->parent, and parent IS the group we live in.
  function project(t) {
    const n = t.cols;
    t.part.mesh.updateMatrix();
    for (let i = 0; i <= n; i++) {
      _p.set(t.organLocal[i * 3], t.organLocal[i * 3 + 1], t.organLocal[i * 3 + 2])
        .applyMatrix4(t.part.mesh.matrix);
      t.organRoot[i * 3] = _p.x; t.organRoot[i * 3 + 1] = _p.y; t.organRoot[i * 3 + 2] = _p.z;
    }
    if (t.anchorPart) {
      t.anchorPart.mesh.updateMatrix();
      for (let i = 0; i <= n; i++) {
        _p.set(t.anchorLocal[i * 3], t.anchorLocal[i * 3 + 1], t.anchorLocal[i * 3 + 2])
          .applyMatrix4(t.anchorPart.mesh.matrix);
        t.anchorRoot[i * 3] = _p.x; t.anchorRoot[i * 3 + 1] = _p.y; t.anchorRoot[i * 3 + 2] = _p.z;
      }
    } else {
      t.anchorRoot.set(t.anchorLocal);
    }
  }

  function centroid(arr, n, out) {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i <= n; i++) { x += arr[i * 3]; y += arr[i * 3 + 1]; z += arr[i * 3 + 2]; }
    const k = 1 / (n + 1);
    return out.set(x * k, y * k, z * k);
  }

  function centroidDistance(t) {
    centroid(t.organRoot, t.cols, _a);
    centroid(t.anchorRoot, t.cols, _b);
    return _a.distanceTo(_b);
  }

  /* ---- geometry rewrite (in place; never dispose/recreate) ---------------- */

  function rewriteFan(t) {
    const C = t.cols, R = t.rows, pos = t.posAttr.array, col = t.colAttr.array;
    const nor = t.norAttr.array;
    const spec = t.spec;
    const tension = t.tension;
    const recoil = t.recoil;
    const sagAmt = spec.sag != null ? spec.sag : 0.2;
    _blush.setHex(spec.blush != null ? spec.blush : 0xdca79f);
    _blanch.setHex(0xf8f3ef);

    for (let i = 0; i <= C; i++) {
      const o3 = i * 3;
      _a.set(t.organRoot[o3], t.organRoot[o3 + 1], t.organRoot[o3 + 2]);
      _b.set(t.anchorRoot[o3], t.anchorRoot[o3 + 1], t.anchorRoot[o3 + 2]);
      // A torn or divided sheet RECOILS toward its root — cut peritoneum snaps
      // back and curls, and a fan that just fades out looks like a bug.
      if (recoil > 0) _a.lerp(_b, recoil * 0.9);

      // Sheet normal for this column: across the span, across the attachment edge.
      const ip = Math.max(0, i - 1) * 3, inx = Math.min(C, i + 1) * 3;
      _tan.set(t.organRoot[inx] - t.organRoot[ip],
        t.organRoot[inx + 1] - t.organRoot[ip + 1],
        t.organRoot[inx + 2] - t.organRoot[ip + 2]);
      _q.subVectors(_b, _a);
      _side.crossVectors(_q, _tan);
      if (_side.lengthSq() < 1e-8) _side.set(0, 1, 0); else _side.normalize();

      const span = _q.length();
      // Slack drapes; tension pulls the belly out of the sheet. Watching the sag
      // disappear as you lift is half the reason this is legible at all.
      const sag = sagAmt * span * (1 - tension * 0.88) * (1 - recoil);

      const invSpan = span > 1e-6 ? 1 / span : 0;

      for (let j = 0; j <= R; j++) {
        const v = j / R;
        const o = (j * (C + 1) + i) * 3;
        const bow = Math.sin(v * Math.PI);
        // Fine crinkle so the sheet is never a ruled surface. vnoise() is the
        // shared smooth value noise from anatomy.js — same grammar as the organs.
        const cr = (typeof vnoise === 'function'
          ? vnoise(i * 0.6 + 11.0, v * 3.1, t.L0 * 7.0) - 0.5 : 0) * span * 0.05 * (1 - tension * 0.7);
        pos[o] = _a.x + _q.x * v + _side.x * (sag * bow + cr);
        pos[o + 1] = _a.y + _q.y * v + _side.y * (sag * bow + cr);
        pos[o + 2] = _a.z + _q.z * v + _side.z * (sag * bow + cr);

        // Analytic normal. The surface is swept along _q (the v direction) and
        // along the attachment edge (_tan); _side is their cross product, so _side
        // IS the sheet normal for a flat span. The sag bows the sheet along _side
        // by sag*sin(pi*v), whose slope with respect to arc length is
        // sag*pi*cos(pi*v)/span — so the normal tilts back along _q by that much.
        // Double-sided material, so the sign takes care of itself.
        const slope = sag * Math.PI * Math.cos(v * Math.PI) * invSpan;
        _nrm.set(_side.x - _q.x * slope * invSpan,
          _side.y - _q.y * slope * invSpan,
          _side.z - _q.z * slope * invSpan);
        if (_nrm.lengthSq() < 1e-12) _nrm.copy(_side); else _nrm.normalize();
        nor[o] = _nrm.x; nor[o + 1] = _nrm.y; nor[o + 2] = _nrm.z;

        // BLANCHING. Stretch empties the capillary bed, and it empties hardest
        // near the narrow root where the same load is carried by less sheet — so
        // weight the whitening toward v=1. The vessel map is unaffected, which is
        // why the arcades appear to leap forward as the sheet goes pale.
        const amt = CON_clamp01(tension * (0.42 + 0.58 * v));
        _c.copy(_blush).lerp(_blanch, amt);
        col[o] = _c.r; col[o + 1] = _c.g; col[o + 2] = _c.b;
      }
    }
    t.posAttr.needsUpdate = true;
    t.colAttr.needsUpdate = true;
    t.norAttr.needsUpdate = true;
    // Bounds after every rewrite. Nothing here is raycast, but a stale sphere gets
    // the fan frustum-culled at the wrong moment, which looks like flicker.
    t.geo.computeBoundingSphere();
    t.geo.computeBoundingBox();
    if (recoil > 0) {
      t.mesh.material.opacity = (t.spec.opacity != null ? t.spec.opacity : 0.3) * (1 - recoil);
    }
  }

  function rewriteCords(t) {
    const N = t.cords, RS = t.rs, LS = t.ls;
    const pos = t.posAttr.array, nor = t.norAttr.array;
    const r0 = t.spec.radius || 0.03;
    const tension = t.tension, recoil = t.recoil;
    // Collagen under load necks down and whitens. Both are real and both are
    // legible at a glance, which is more than can be said for a number on a HUD.
    const rad = r0 * (1 - tension * 0.22) * (1 - recoil * 0.6);

    for (let c = 0; c < N; c++) {
      const o3 = c * 3;
      _a.set(t.organRoot[o3], t.organRoot[o3 + 1], t.organRoot[o3 + 2]);
      _b.set(t.anchorRoot[o3], t.anchorRoot[o3 + 1], t.anchorRoot[o3 + 2]);
      if (recoil > 0) _a.lerp(_b, recoil * 0.85);
      _q.subVectors(_b, _a);
      const span = _q.length() || 1e-4;

      // Droop direction: whatever is most perpendicular to the cord. A cord that
      // sags in a stable direction reads as slack; one that snaps between
      // directions reads as broken.
      _side.set(0, -1, 0);
      if (Math.abs(_q.y / span) > 0.92) _side.set(0, 0, -1);
      _up.copy(_side).addScaledVector(_q, -_side.dot(_q) / (span * span)).normalize();
      const droop = (t.spec.sag != null ? t.spec.sag : 0.08) * span * (1 - tension) * (1 - recoil);

      const base = c * (LS + 1) * RS;
      for (let j = 0; j <= LS; j++) {
        const s = j / LS;
        const w = 4 * s * (1 - s);                     // quadratic bow, 0 at both ends
        _p.copy(_a).addScaledVector(_q, s).addScaledVector(_up, droop * w);
        // Tangent of that curve, for a stable ring frame.
        _tan.copy(_q).addScaledVector(_up, droop * 4 * (1 - 2 * s));
        if (_tan.lengthSq() < 1e-10) _tan.copy(_q);
        _tan.normalize();
        _right.crossVectors(_tan, _up);
        if (_right.lengthSq() < 1e-8) _right.set(1, 0, 0); else _right.normalize();
        _side.crossVectors(_right, _tan).normalize();
        // Taper into the tissue at both ends so a cord emerges from the organ
        // rather than being stuck onto it.
        const rr = rad * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, s))) ** 0.35);
        for (let k = 0; k < RS; k++) {
          const th = (k / RS) * Math.PI * 2;
          const cx = Math.cos(th), sy = Math.sin(th);
          const nx = _right.x * cx + _side.x * sy;
          const ny = _right.y * cx + _side.y * sy;
          const nz = _right.z * cx + _side.z * sy;
          const o = (base + j * RS + k) * 3;
          pos[o] = _p.x + nx * rr; pos[o + 1] = _p.y + ny * rr; pos[o + 2] = _p.z + nz * rr;
          nor[o] = nx; nor[o + 1] = ny; nor[o + 2] = nz;
        }
      }
    }
    t.posAttr.needsUpdate = true;
    t.norAttr.needsUpdate = true;
    t.geo.computeBoundingSphere();
    t.geo.computeBoundingBox();
    if (t.spec.blanch != null) {
      _c.setHex(t.spec.color); _blanch.setHex(t.spec.blanch);
      t.mesh.material.color.copy(_c).lerp(_blanch, CON_clamp01(tension * 0.9));
    }
  }

  /* ---- tearing ----------------------------------------------------------- */

  function fail(t, mode) {
    if (!t.intact) return;
    t.intact = false;
    t.mode = mode;                                // 'torn' | 'cut'
    t.recoil = 0.0001;                            // starts the retraction animation
    cut.push({ tetherId: t.spec.id, partId: t.spec.part, name: t.spec.name, mode });
    emit({
      kind: 'sever',
      partId: t.spec.part,
      tetherId: t.spec.id,
      text: mode === 'cut' ? t.spec.cutText : t.spec.tearText,
      meta: { tether: t.spec.name, mode, irreversible: true },
    });
  }

  function partialTear(t) {
    if (t.damaged) return;
    t.damaged = true;
    // Permanent consequence, not a warning light: a part-torn fold carries less,
    // so from here on it gives way sooner and holds the organ less well.
    t.spec = Object.create(t.spec);
    t.spec.limit = t.spec.limit * 0.72;
    t.spec.grip = t.spec.grip * 0.85;
    emit({
      kind: 'damage',
      partId: t.spec.part,
      tetherId: t.spec.id,
      text: t.spec.damageText,
      meta: { tether: t.spec.name, irreversible: true },
    });
  }

  /* ---- frame ------------------------------------------------------------- */

  function update(dtMs) {
    const dt = Math.min(0.05, (dtMs == null ? 16 : dtMs) / 1000);

    for (let n = 0; n < tethers.length; n++) {
      const t = tethers[n];
      if (t.retired) continue;
      // main.js only guards CONSTRUCTION in try/catch. A throw from here is inside
      // requestAnimationFrame, so it kills the render loop and the whole app goes
      // black over one bad tether. Contain it to the tether that caused it: retire
      // that one, say so once, and let the other twelve carry on holding.
      try {
        stepTether(t, dt);
      } catch (err) {
        t.retired = true;
        if (t.mesh) t.mesh.visible = false;
        if (!faulted) {
          faulted = true;
          console.warn('constraints: tether "' + (t.spec && t.spec.id) + '" retired after an error', err);
        }
      }
    }
  }

  function stepTether(t, dt) {
    const mesh = t.part && t.part.mesh;
    if (!mesh) { t.retired = true; t.mesh.visible = false; return; }
    const spec = t.spec;

    // THE TRAP THIS AVOIDS: dissect.js's stepPeels() drives a reflected flap by
    // writing position.y AND scale every frame. If we also clamped that part's
    // position we would visibly cancel the peel — we run after dissect.update(),
    // so our value is the one that renders. The scale is the tell (stepPeels is
    // the only thing in the app that touches it), so a part being reflected is
    // followed but never restrained, and never reports strain it did not earn.
    const reflecting = Math.abs(mesh.scale.x - t.homeScale) > 1e-4;

    if (t.intact && !reflecting) {
      // 1. DEMAND. dissect.js has already written the position the cursor asks
      //    for this frame, computed fresh from the ray rather than integrated,
      //    so reading it as the demand cannot accumulate error.
      project(t);
      const L = centroidDistance(t);
      const strain = (L - t.L0) / t.L0;

      // A jump this large is not a pull, it is a teleport — dissect.js placing a
      // removed organ on the tray, or a caller resetting the specimen. Retire
      // quietly rather than reporting a rupture that nobody caused.
      //
      // The strain ratio ALONE is not enough. A tether whose rest length is
      // already long (the pericardial reflections, the caval cuff) never reaches
      // six times it, so on the tray it stayed "intact", kept resisting, and
      // lerped the removed organ back out of the tray a little every frame —
      // organs visibly crawling home from the tray. So test the organ's own
      // displacement too, against the same 2.6 that dissect.js calls removal.
      if (L > t.L0 * 6 || mesh.position.distanceToSquared(t.home) > CON_TELEPORT_SQ) {
        t.intact = false; t.retired = true; t.mesh.visible = false;
        return;
      }

      const span = Math.max(1e-3, spec.limit - spec.slack);
      t.tension = CON_clamp01((strain - spec.slack) / span);
      // Squared-ish ramp: nothing for a while, then it bites. A linear ramp
      // feels like friction; this feels like a structure taking up.
      t.resist = spec.grip * (t.tension * t.tension * (3 - 2 * t.tension));

      // 2. RESTRAINT. Drag the organ back toward home in proportion to the
      //    resistance, then hard-stop it at the tether's limit. dissect.js
      //    recomputes absolutely next frame, so this is a clamp, not a spring —
      //    it cannot ring.
      if (t.resist > 0.001 && !mesh.position.equals(t.home)) {
        mesh.position.lerp(t.home, t.resist * 0.55);
        mesh.updateMatrix();
        project(t);
        const L2 = centroidDistance(t);
        const maxL = t.L0 * (1 + spec.limit);
        if (L2 > maxL) {
          centroid(t.organRoot, t.cols, _a);
          centroid(t.anchorRoot, t.cols, _b);
          _q.subVectors(_a, _b).setLength(maxL).add(_b).sub(_a);   // required shift
          mesh.position.add(_q);
          mesh.updateMatrix();
          project(t);
        }
      }

      // 3. FAILURE. Held at the limit, it gives way — after a beat, so that
      //    reaching the stop is a warning and staying there is a decision.
      if (t.tension > 0.74) {
        if (!t.warned) {
          t.warned = true;
          emit({ kind: 'damage', partId: spec.part, tetherId: spec.id, text: spec.strainText,
            meta: { tether: spec.name, warning: true, tension: +t.tension.toFixed(2) } });
        }
        if (t.tension > 0.88) partialTear(t);
      } else if (t.tension < 0.35) {
        t.warned = false;                       // re-arm once genuinely released
      }
      if (t.tension > 0.985) {
        t.overT += dt;
        if (t.overT > 0.45) fail(t, 'torn');
      } else t.overT = Math.max(0, t.overT - dt * 0.6);
    } else {
      t.tension = 0; t.resist = 0; t.overT = 0;
      if (!t.intact && t.recoil < 1) t.recoil = Math.min(1, t.recoil + dt * 2.6);
      project(t);
    }

    // 4. DRAW. Skip a tether whose organ has not moved and whose tension has not
    //    changed — idle anatomy must cost nothing.
    const px = mesh.position.x, py = mesh.position.y, pz = mesh.position.z;
    // The FAR end can move too (chordae hang off a papillary muscle, the spleen
    // off the stomach), so the movement key has to include it or a tether goes
    // stiff whenever only its anchor organ was disturbed.
    const ax = t.anchorPart
      ? t.anchorPart.mesh.position.x + t.anchorPart.mesh.position.y * 7 + t.anchorPart.mesh.position.z * 31 : 0;
    const moved = px !== t.lastX || py !== t.lastY || pz !== t.lastZ || ax !== t.lastA;
    const changed = Math.abs(t.tension - t.lastT) > 0.004 || (t.recoil > 0 && t.recoil < 1);
    if (moved || changed || t.lastT < 0) {
      t.lastX = px; t.lastY = py; t.lastZ = pz; t.lastA = ax; t.lastT = t.tension;
      if (t.kind === 'cord') rewriteCords(t); else rewriteFan(t);
    }

    // A tether is only ever as visible as the structures it joins.
    const anchorOk = !t.anchorPart || t.anchorPart.mesh.visible;
    t.mesh.visible = visible && mesh.visible && anchorOk && !(t.recoil >= 1);
    if (t.recoil >= 1 && !t.retired) { t.retired = true; t.mesh.visible = false; }
  }

  /* ---- public surface ---------------------------------------------------- */

  function resistance(partId) {
    const list = byPart.get(partId);
    if (!list) return 0;
    let r = 0;
    for (let i = 0; i < list.length; i++) if (list[i].intact && list[i].resist > r) r = list[i].resist;
    return r;
  }

  function tension(partId) {
    const list = byPart.get(partId);
    if (!list) return 0;
    let r = 0;
    for (let i = 0; i < list.length; i++) if (list[i].intact && list[i].tension > r) r = list[i].tension;
    return r;
  }

  // The legitimate way: divide the attachments deliberately, under vision, with a
  // blade. Same permanence as tearing, opposite meaning — and the sentence you get
  // back says what you just cut and what it cost you.
  function sever(partId) {
    const list = byPart.get(partId);
    if (!list) return 0;
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      if (list[i].intact) { fail(list[i], 'cut'); n++; }
    }
    return n;
  }

  function severed() { return cut.slice(); }

  function setVisible(on) {
    visible = !!on;
    holder.visible = visible;
  }

  function onEvent(cb) {
    if (typeof cb !== 'function') return () => {};
    listeners.push(cb);
    return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); };
  }

  // What is holding this part, for a HUD or a viva question.
  function info(partId) {
    const list = byPart.get(partId) || [];
    return list.map((t) => ({
      id: t.spec.id, name: t.spec.name, note: t.spec.note,
      intact: t.intact, mode: t.mode,
      tension: +t.tension.toFixed(3), resistance: +t.resist.toFixed(3),
    }));
  }

  function dispose() {
    tethers.forEach((t) => {
      holder.remove(t.mesh);
      t.geo.dispose();
      if (t.mesh.material.map) t.mesh.material.map = null;   // shared cache; do not dispose
      t.mesh.material.dispose();
    });
    // Put the specimen back exactly as we found it. main.js rebuilds the whole
    // group on a specimen change so this rarely shows, but a caller that disposes
    // and rebuilds constraints over the SAME parts would otherwise be left with a
    // gut that has no mesentery at all, live or painted — the one visible state
    // this module must never leave behind.
    hidden.forEach((ch) => { ch.visible = true; });
    hidden.length = 0;
    tethers.length = 0;
    cut.length = 0;
    byPart.clear();
    listeners.length = 0;
    if (holder.parent) holder.parent.remove(holder);
  }

  return {
    update, resistance, tension, sever, severed, setVisible, onEvent, dispose, info,
    get count() { return tethers.length; },
  };
}
