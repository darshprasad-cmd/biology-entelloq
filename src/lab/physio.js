/*
 * physio.js — the specimen is alive, and it answers back.
 *
 * The whole point of this module is a causal chain the student can *see*:
 *
 *     clamp an artery  ->  the tissue it feeds goes pale, then dusky, then cyanotic
 *     clamp a vein     ->  the tissue it drains engorges, swells and darkens
 *     cut a nerve      ->  the muscle it supplies stops twitching and goes flaccid
 *     occlude an LAD   ->  ST segments lift on the monitor and the heart rate climbs
 *
 * Everything here is driven by ONE cardiac clock. phase() is 0 at the onset of
 * ventricular systole and runs to 1 at the next onset; softbody.js's heartbeat,
 * blood.js's arterial pulsatility and the ECG on the monitor all read that number,
 * so the specimen, the blood and the trace beat together. A sine wave would be a
 * lie: systole is short and sharp, diastole is long and it SHORTENS DISPROPORTIONATELY
 * as the rate rises, which is exactly why tachycardia hurts filling.
 *
 * HONESTY. Default state is setRunning(false). A dissection specimen is dead; it
 * is not beating. The monitor is labelled SIMULATED at all times and standby is
 * the honest resting state. Turning it on is the student choosing a living-
 * physiology model, not a claim about the thing on the table.
 *
 * TRAPS THIS FILE IS CAREFUL ABOUT
 *  - dissect.js owns material.emissive (hover) and material.opacity + mesh.scale
 *    (peel/reflection). This file therefore tints ONLY material.color/sheenColor,
 *    and it writes mesh.scale defensively: if something else moved the scale out
 *    from under us we hand ownership back rather than fight for it every frame.
 *  - dissect.js's damage() also writes material.color. So while a part's
 *    physiological state is at rest we keep RE-READING its colour as the new base.
 *    A base captured once at construction would silently erase a later damage tint.
 *  - No allocation in update(). Every vector/colour scratch is hoisted into the
 *    closure, every list is a plain Array walked by index, and the graph is only
 *    re-solved when a clamp/sever actually changes (not per frame).
 *  - The monitor samples the waveforms at a fixed 250 Hz into a preallocated ring
 *    and repaints at ~30 Hz. Stepping the sweep one screen pixel at a time would
 *    undersample a 22 ms R wave into nothing — an ECG that looks like a rumour.
 */

/* ── small maths ─────────────────────────────────────────────────────────── */
function PHY_clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function PHY_clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function PHY_lerp(a, b, t) { return a + (b - a) * t; }
// First-order approach to a target with a time constant, frame-rate independent.
// Using 1-exp(-dt/tau) rather than a fixed lerp factor means a stutter does not
// change how fast the physiology moves — it just takes a bigger correct step.
function PHY_easeTo(cur, target, tau, dt) {
  if (tau <= 0) return target;
  return cur + (target - cur) * (1 - Math.exp(-dt / tau));
}

/* Oxyhaemoglobin dissociation, Hill form with n = 2.7 and P50 = 26.6 mmHg.
 * This curve is the single most important fact about pulse oximetry: it is FLAT
 * above about 60 mmHg, so SpO2 barely twitches while PaO2 halves, and then it
 * falls off a cliff. Students who have only seen a linear "oxygen meter" are
 * always surprised by how late, and how suddenly, the number moves. */
function PHY_hill(pao2) {
  const p = Math.pow(Math.max(1, pao2), 2.7);
  // 26.6^2.7 = 7033, NOT 4118.7. This constant IS the P50 and getting it wrong
  // left-shifts the whole curve: with 4118.7 a PaO2 of 40 read 84% instead of 75%
  // and a PaO2 of 60 read 94% instead of 90% — i.e. every landmark a student is
  // asked to recite was wrong, and the curve no longer crossed 50% at its own P50.
  // Verify: 40 -> 75.1%, 60 -> 90.0%, 100 -> 97.3%. Those are the three numbers.
  return 100 * p / (p + 7033);
}

/* ── visual endpoints of ischaemia ───────────────────────────────────────── */
/* These are the four things tissue actually does, in the order it does them. */
const PHY_CLR = {
  // Arterial cut-off, first seconds: blood drains out of the capillary bed and the
  // tissue goes waxy and pale — you see the stroma, not the blood.
  pallor:     0xc6b1a8,
  // Venous cut-off: inflow continues, outflow does not. The bed engorges with
  // deoxygenated blood — dark, plum, and it visibly SWELLS.
  congestion: 0x4b1026,
  // Sustained stagnant hypoxia in either case: desaturated haemoglobin is blue.
  cyanosis:   0x3d3c66,
  // Reactive hyperaemia: release the clamp and the bed, maximally vasodilated by
  // accumulated metabolites, floods brilliant red for a few seconds. Real, brief,
  // and the most satisfying thing in the module.
  flush:      0xc4302a,
};

/* ── per-specimen baseline physiology and alarm limits ───────────────────── */
/* A frog is not a small human and must not be given human numbers. It is a
 * poikilotherm at room temperature with a systemic pressure around 30/20 mmHg
 * and a heart rate in the 40s — a biology teacher will check this. */
const PHY_PROFILE = {
  frog: {
    label: 'Rana · in situ model', hr: 48, sbp: 30, dbp: 20, spo2: 95, temp: 20.0, resp: 34,
    hrLo: 26, hrHi: 78, hrCrit: 16, mapLo: 14, mapCrit: 9,
    spo2Lo: 90, spo2Crit: 80, tempLo: 12, tempHi: 28,
    ambient: 20.0, hypoxiaHR: -1, seriesLung: false,
    // Frogs exchange gas across skin as well as lung. Roughly half the resting
    // oxygen uptake is cutaneous, which is why clamping the pulmocutaneous arches
    // hurts SpO2 twice: it takes out the lung AND the skin on that side.
    gasMix: { pulm: 0.5, skin: 0.5 },
    ecgLead: 'II',
  },
  heart: {
    label: 'Mammalian · perfused model', hr: 72, sbp: 122, dbp: 78, spo2: 98, temp: 37.0, resp: 14,
    hrLo: 50, hrHi: 118, hrCrit: 38, mapLo: 62, mapCrit: 45,
    spo2Lo: 92, spo2Crit: 85, tempLo: 35.0, tempHi: 38.6,
    ambient: 22.0, hypoxiaHR: +1, seriesLung: true,
    gasMix: { pulm: 1.0, skin: 0 },
    ecgLead: 'II',
  },
};

/* ── myocardial mass, as a fraction of the whole heart ───────────────────── */
/*
 * Coronary jeopardy has to be weighted by how much MUSCLE THAT MATTERS a vessel
 * owns, not by how many part IDs it happens to touch. Counting raw feed shares
 * made the RCA (which feeds both atria, both auricles, the RV wall and the
 * moderator band — five entries) look like a bigger loss than the LAD (four),
 * so an inferior occlusion arrested the model faster than an anterior one. That
 * is backwards: the LAD is the widow-maker precisely because it owns ~40% of the
 * left ventricle, and the atria contribute essentially nothing to ejection.
 *
 * Fractions are of total cardiac mass, discounted for the atria because atrial
 * systole contributes only the last ~15-20% of ventricular FILLING, not output.
 * With these weights a full LAD occlusion jeopardises ~41% of the pump, RCA ~21%,
 * circumflex ~19%, PDA ~19% — and a left main occlusion clears 50% and arrests,
 * which is exactly the vessel that should.
 */
const PHY_MYO = {
  'lv-free-wall': 0.44, 'septum': 0.22, 'rv-free-wall': 0.18,
  'papillary-a': 0.025, 'papillary-b': 0.025, 'moderator-band': 0.01,
  'left-atrium': 0.04, 'right-atrium': 0.04, 'left-auricle': 0.01, 'right-auricle': 0.01,
};
function PHY_myoMass(id) { return PHY_MYO[id] != null ? PHY_MYO[id] : 0.05; }

/* ── the vascular graph ──────────────────────────────────────────────────── */
/*
 * A node is a named vessel. `parent` always points DOWNSTREAM OF THE BLOCKAGE
 * PROBLEM — that is, toward the source of the pressure that keeps the node open:
 * for an artery that is the aorta/conus, for a vein it is the heart. So one walk
 * solves both: a node is obstructed if it is clamped, or if anything between it
 * and its pressure source is clamped.
 *
 * `feeds`  — [partId, fraction] pairs that receive ARTERIAL inflow through it.
 *            Fractions are collateral shares and they matter: a part fed 0.55 by
 *            the LAD and 0.45 by the circumflex survives losing either one.
 * `drains` — [partId, fraction] pairs whose venous OUTFLOW passes through it.
 *            Blocking those produces congestion, not pallor. Same clamp, opposite
 *            appearance, which is the whole teaching point of the module.
 *
 * Some nodes are real part IDs (you can clamp them with the tool because you can
 * see them); the rest are anatomically real vessels that this specimen does not
 * render, and they exist so the tree is correct rather than convenient.
 */
const PHY_VASC = {
  frog: [
    /* --- arterial: conus -> truncus -> three paired arches ------------------ */
    { id: 'conus', name: 'Conus arteriosus', kind: 'arterial', parent: null, heart: true },
    { id: 'truncus-left', name: 'Left truncus arteriosus', kind: 'arterial', parent: 'conus' },
    { id: 'truncus-right', name: 'Right truncus arteriosus', kind: 'arterial', parent: 'conus' },

    { id: 'carotid-left', name: 'Left carotid arch', kind: 'arterial', parent: 'truncus-left' },
    { id: 'carotid-right', name: 'Right carotid arch', kind: 'arterial', parent: 'truncus-right' },

    // Pulmocutaneous arch — lung AND skin off the same trunk. Unique to amphibians
    // and the reason cutaneous respiration shows up in this model at all.
    { id: 'pulmocutaneous-left', name: 'Left pulmocutaneous arch', kind: 'arterial', parent: 'truncus-left',
      pulm: 0.5, cutaneous: 0.5, feeds: [['lung-left', 1], ['skin', 0.5]] },
    { id: 'pulmocutaneous-right', name: 'Right pulmocutaneous arch', kind: 'arterial', parent: 'truncus-right',
      pulm: 0.5, cutaneous: 0.5, feeds: [['lung-right', 1], ['skin', 0.5]] },

    { id: 'systemic-left', name: 'Left systemic arch', kind: 'arterial', parent: 'truncus-left' },
    { id: 'systemic-right', name: 'Right systemic arch', kind: 'arterial', parent: 'truncus-right' },
    { id: 'subclavian-left', name: 'Left subclavian artery', kind: 'arterial', parent: 'systemic-left',
      feeds: [['forelimb-left', 1]] },
    { id: 'subclavian-right', name: 'Right subclavian artery', kind: 'arterial', parent: 'systemic-right',
      feeds: [['forelimb-right', 1]] },

    // The two systemic arches fuse into the dorsal aorta. Modelled with the LEFT
    // arch as parent; clamping either arch alone therefore leaves the aorta fed,
    // which is anatomically honest — you must take both to stop the hind body.
    { id: 'dorsal-aorta', name: 'Dorsal aorta', kind: 'arterial', parent: 'systemic-left',
      alt: 'systemic-right' },

    { id: 'coeliacomesenteric', name: 'Coeliaco-mesenteric artery', kind: 'arterial', parent: 'dorsal-aorta',
      feeds: [['stomach', 1], ['oesophagus', 1], ['small-intestine', 1], ['large-intestine', 1],
              ['spleen', 1], ['gall-bladder', 1],
              // The liver is only ~35% arterial; the rest arrives by portal vein.
              ['liver-right', 0.35], ['liver-left', 0.35], ['liver-median', 0.35]] },
    { id: 'renal-artery-left', name: 'Left renal artery', kind: 'arterial', parent: 'dorsal-aorta',
      feeds: [['kidney-left', 0.5], ['fat-body-left', 1]] },
    { id: 'renal-artery-right', name: 'Right renal artery', kind: 'arterial', parent: 'dorsal-aorta',
      feeds: [['kidney-right', 0.5], ['fat-body-right', 1]] },
    { id: 'iliac-left', name: 'Left iliac artery', kind: 'arterial', parent: 'dorsal-aorta',
      feeds: [['hindlimb-left', 1]] },
    { id: 'iliac-right', name: 'Right iliac artery', kind: 'arterial', parent: 'dorsal-aorta',
      feeds: [['hindlimb-right', 1]] },

    /* --- venous: two portal systems, which is the frog's party trick -------- */
    { id: 'posterior-vena-cava', name: 'Posterior vena cava', kind: 'venous', parent: null,
      preload: 0.7,
      drains: [['liver-right', 1], ['liver-left', 1], ['liver-median', 1],
               ['kidney-left', 1], ['kidney-right', 1]] },

    // Hepatic portal vein: it DRAINS the gut and FEEDS the liver. One clamp, two
    // opposite consequences — gut congestion upstream, liver ischaemia downstream.
    { id: 'hepatic-portal', name: 'Hepatic portal vein', kind: 'venous', parent: 'posterior-vena-cava',
      drains: [['stomach', 0.7], ['small-intestine', 0.7], ['large-intestine', 0.7], ['spleen', 0.8]],
      feeds: [['liver-right', 0.65], ['liver-left', 0.65], ['liver-median', 0.65]] },

    // The classic first-attempt casualty. It runs in the midline on the inner face
    // of the muscle wall, and it empties into the hepatic portal vein.
    { id: 'ventral-abdominal-vein', name: 'Ventral abdominal vein', kind: 'venous', parent: 'hepatic-portal',
      drains: [['muscle-wall', 0.75], ['urinary-bladder', 1], ['skin', 0.3]] },

    // Renal portal system: blood from the hind limb passes through the KIDNEY
    // before it reaches the heart. Clamp it and you congest the leg and starve
    // half the kidney at the same time. No mammal does this.
    { id: 'renal-portal-left', name: 'Left renal portal vein', kind: 'venous', parent: 'posterior-vena-cava',
      drains: [['hindlimb-left', 0.6]], feeds: [['kidney-left', 0.5]] },
    { id: 'renal-portal-right', name: 'Right renal portal vein', kind: 'venous', parent: 'posterior-vena-cava',
      drains: [['hindlimb-right', 0.6]], feeds: [['kidney-right', 0.5]] },

    { id: 'pulmonary-vein-left', name: 'Left pulmonary vein', kind: 'venous', parent: null,
      pulmReturn: 0.5, preload: 0.15, drains: [['lung-left', 1]] },
    { id: 'pulmonary-vein-right', name: 'Right pulmonary vein', kind: 'venous', parent: null,
      pulmReturn: 0.5, preload: 0.15, drains: [['lung-right', 1]] },
  ],

  heart: [
    /* --- the coronary tree hangs off the aortic ROOT, not the arch ---------- */
    // This distinction is surgical and worth the extra node: an aortic cross-clamp
    // is applied distal to the coronary ostia, so clamping the visible 'aorta'
    // stops systemic flow and raises afterload but leaves the coronaries perfused.
    { id: 'aortic-root', name: 'Aortic root', kind: 'arterial', parent: null, heart: true },
    { id: 'aorta', name: 'Aorta', kind: 'arterial', parent: 'aortic-root', afterload: 1 },
    { id: 'left-main', name: 'Left main coronary artery', kind: 'arterial', parent: 'aortic-root' },

    { id: 'lad', name: 'Left anterior descending artery', kind: 'arterial', parent: 'left-main',
      territory: 'anterior', lead: 'V3', hrEffect: +1,
      feeds: [['lv-free-wall', 0.55], ['septum', 0.6], ['papillary-a', 0.55], ['moderator-band', 0.2]] },
    { id: 'circumflex', name: 'Circumflex artery', kind: 'arterial', parent: 'left-main',
      territory: 'lateral', lead: 'aVL', hrEffect: +1,
      feeds: [['lv-free-wall', 0.30], ['left-atrium', 0.8], ['left-auricle', 0.8], ['papillary-a', 0.45]] },
    // The RCA supplies the sinus node in ~60% of hearts and the AV node in ~90%.
    // That is why an inferior infarct makes people SLOW, not fast: hrEffect is -1.
    { id: 'rca', name: 'Right coronary artery', kind: 'arterial', parent: 'aortic-root',
      territory: 'inferior', lead: 'II', hrEffect: -1, nodal: true,
      feeds: [['right-atrium', 1], ['right-auricle', 1], ['rv-free-wall', 0.8], ['moderator-band', 0.6]] },
    { id: 'posterior-iv-branch', name: 'Posterior interventricular branch', kind: 'arterial', parent: 'rca',
      territory: 'inferior', lead: 'III', hrEffect: -1,
      // Posteromedial papillary muscle: SINGLE blood supply. It is the one that
      // ruptures after an inferior infarct. Anterolateral (papillary-a) is fed by
      // both LAD and circumflex and survives losing either.
      feeds: [['lv-free-wall', 0.15], ['septum', 0.4], ['papillary-b', 1]] },

    // NOT flagged `heart` — clamping it does not starve the myocardium of blood,
    // it stops blood CROSSING the lung. The collapse that follows is obstructive
    // shock arriving through preload (nothing returns to fill the left heart) and
    // through the shunt (nothing gets oxygenated). Route the cause correctly and
    // the consequences fall out on their own.
    { id: 'pulmonary-trunk', name: 'Pulmonary trunk', kind: 'arterial', parent: null, pulm: 1 },

    /* --- venous ------------------------------------------------------------- */
    { id: 'coronary-sinus', name: 'Coronary sinus', kind: 'venous', parent: null,
      drains: [['lv-free-wall', 0.7], ['septum', 0.5], ['rv-free-wall', 0.2], ['left-atrium', 0.4]] },
    { id: 'svc', name: 'Superior vena cava', kind: 'venous', parent: null, preload: 0.35 },
    { id: 'ivc', name: 'Inferior vena cava', kind: 'venous', parent: null, preload: 0.65 },
    { id: 'pulmonary-veins', name: 'Pulmonary veins', kind: 'venous', parent: null,
      pulmReturn: 1, preload: 0.2, drains: [['left-atrium', 0.6]] },
  ],
};

/* ── the neural graph ────────────────────────────────────────────────────── */
/*
 * The sciatic/gastrocnemius preparation is the oldest experiment in the syllabus —
 * Galvani's frog. Sever the sciatic and the calf stops. It is here because it is
 * the clearest possible demonstration that a muscle does not decide anything.
 *
 * `anchor` lets a nerve be cut by cutting a structure the student CAN see: the
 * sciatic runs down the thigh inside the hindlimb, the cord inside the column.
 */
const PHY_NEURAL = {
  frog: [
    { id: 'spinal-cord', name: 'Spinal cord', parent: null, anchor: 'vertebral-column' },
    { id: 'sciatic-left', name: 'Left sciatic nerve', parent: 'spinal-cord', anchor: 'hindlimb-left',
      motor: [['hindlimb-left', 1]],
      note: 'The classic preparation: sciatic nerve to gastrocnemius. Cut it and the calf is silent — the muscle is intact, it has simply lost its instruction.' },
    { id: 'sciatic-right', name: 'Right sciatic nerve', parent: 'spinal-cord', anchor: 'hindlimb-right',
      motor: [['hindlimb-right', 1]] },
    { id: 'brachial-left', name: 'Left brachial plexus', parent: 'spinal-cord', anchor: 'forelimb-left',
      motor: [['forelimb-left', 1]] },
    { id: 'brachial-right', name: 'Right brachial plexus', parent: 'spinal-cord', anchor: 'forelimb-right',
      motor: [['forelimb-right', 1]] },
    // Vagus: the parasympathetic brake on the heart. Cut it and the rate RISES,
    // because you have removed an inhibition, not added a stimulus. This is the
    // result students always predict backwards.
    { id: 'vagus', name: 'Vagus nerve', parent: null, anchor: 'frog-heart', chrono: -1,
      note: 'Tonic parasympathetic brake on the sinus venosus. Section it and the heart speeds up — you removed a restraint, you did not add a drive.' },
    { id: 'sympathetic', name: 'Sympathetic chain', parent: null, chrono: +1,
      note: 'Sympathetic outflow raises rate and force. Section it and the heart slows and weakens.' },
  ],
  heart: [
    { id: 'sa-node', name: 'Sinoatrial node', parent: null,
      note: 'The pacemaker, in the wall of the right atrium at the crista terminalis. Fed by the RCA in about 60% of hearts.' },
    { id: 'av-node', name: 'Atrioventricular node', parent: 'sa-node',
      note: 'The only electrical path between atria and ventricles. Its 0.1 s delay is the PR interval.' },
    // The moderator band physically carries the right bundle branch across the RV
    // cavity. Cut it and you get right bundle branch block — a wider QRS with a
    // second R wave. That is a real structure-to-trace consequence and it is the
    // reason the moderator band is worth pointing at.
    { id: 'right-bundle', name: 'Right bundle branch', parent: 'av-node', anchor: 'moderator-band',
      block: 'rbbb',
      note: 'Runs inside the moderator band across the right ventricular cavity. Divide the band and the right ventricle depolarises late — the QRS widens and grows a second R wave.' },
    { id: 'left-bundle', name: 'Left bundle branch', parent: 'av-node', anchor: 'septum', block: 'lbbb' },
  ],
};

/* ── waveform generators ─────────────────────────────────────────────────── */
/*
 * PQRST, in seconds, with the proportions that make it an ECG rather than a
 * decoration. Values are adult-normal and every one of them is examinable:
 *   P wave   ~90 ms, ~0.13 mV, rounded and monophasic in II
 *   PR       120-200 ms measured from P ONSET to QRS onset
 *   QRS      ~90 ms and NARROW — a small Q, a tall fast R, a modest S
 *   QT       ~400 ms at 60 bpm and rate-dependent (Bazett: QT ∝ √RR)
 *   T wave   asymmetric: slow up, fast down, peaking about 60% of the way through
 * The trace argument `u` is time since P-wave onset. The caller supplies it from
 * the master cardiac clock, so the ECG cannot drift out of step with the beat.
 */
function PHY_ecgSample(u, rr, st, qrsWide, tBoost) {
  const k = Math.sqrt(rr);                       // Bazett scaling of repolarisation
  const pri = 0.16 * PHY_clamp(k, 0.72, 1.08);   // PR shortens modestly with rate
  const pdur = Math.min(0.09, pri - 0.045);
  const qrs = 0.09 + qrsWide;                    // bundle branch block widens this
  const qt = 0.40 * k + qrsWide;
  const tdur = Math.min(0.22, 0.42 * qt);
  const stseg = Math.max(0.015, qt - qrs - tdur);

  let v = 0;

  // --- P wave: atrial depolarisation, a low rounded gaussian ---------------
  if (u >= 0 && u < pdur) {
    const c = (u - pdur * 0.5) / (pdur * 0.36);
    v += 0.13 * Math.exp(-c * c);
  }

  // --- QRS: piecewise linear, because a real QRS is a set of straight ramps.
  // Drawing it as a smooth hump is the single fastest way to make an ECG look
  // fake — the R wave is a corner, not a curve.
  const q0 = pri;
  const w = qrs / 0.09;                          // stretch the whole complex if wide
  const tq = q0 + 0.018 * w, tr = tq + 0.022 * w, ts = tr + 0.030 * w, tj = ts + 0.020 * w;
  if (u >= q0 && u < tj) {
    if (u < tq) v += PHY_lerp(0, -0.10, (u - q0) / (tq - q0));
    else if (u < tr) v += PHY_lerp(-0.10, 1.25, (u - tq) / (tr - tq));
    else if (u < ts) v += PHY_lerp(1.25, -0.28, (u - tr) / (ts - tr));
    else v += PHY_lerp(-0.28, 0, (u - ts) / (tj - ts));
    // RSR′: in right bundle branch block the right ventricle finishes late, so a
    // second, broader R rides on the terminal part of the complex.
    if (qrsWide > 0.02 && u > tr) {
      const c = (u - (ts + 0.012 * w)) / (0.026 * w);
      v += 0.42 * Math.exp(-c * c);
    }
  }

  // --- ST segment: the injury current -------------------------------------
  // In acute transmural ischaemia the injured myocardium cannot hold its resting
  // potential, so the TP baseline shifts; measured against it the ST segment
  // appears elevated, and severe elevation goes CONVEX ("tombstone") rather than
  // staying flat. That convexity is what distinguishes injury from benign early
  // repolarisation, so it is modelled rather than drawn as a straight offset.
  const t0 = tj, t1 = tj + stseg;
  if (u >= t0 && u < t1 && st !== 0) {
    const x = (u - t0) / stseg;
    v += st * (0.55 + 0.45 * Math.sin(Math.PI * (0.25 + 0.5 * x))) * (st > 0 ? 1 + 0.35 * x : 1);
  }

  // --- T wave: asymmetric, and hyperacute BEFORE the ST lifts --------------
  // The first ECG change of coronary occlusion is a tall, broad, symmetrical T
  // wave, minutes before the ST segment moves. Getting that order right is the
  // difference between a teaching tool and an animation.
  if (u >= t1 && u < t1 + tdur) {
    const x = (u - t1) / tdur;
    const shape = Math.sin(Math.PI * Math.pow(x, 1.35));   // peak at ~60% through
    v += (0.30 + tBoost) * shape + st * 0.55 * shape;
  }

  return v;
}

/* Aortic pressure. Every named feature here is something a student is asked to
 * point at in a viva: the pre-ejection period, the anacrotic upstroke, the
 * systolic peak, the incisura at aortic valve closure, the dicrotic wave, and the
 * Windkessel runoff through diastole. */
function PHY_artSample(a, rr, sbp, dbp, pep, lvet) {
  // Floor is deliberately below 1: PHY_plethSample reuses this function with
  // sbp=1/dbp=0 to get the SHAPE normalised to 0..1, and a floor of 2 there would
  // silently double the pleth and clip it against the top of its lane.
  const pp = Math.max(0.5, sbp - dbp);

  // Isovolumic contraction: the ventricle is squeezing but the aortic valve is
  // still shut, so aortic pressure is still FALLING. This tiny detail is why the
  // upstroke starts after the R wave rather than on it.
  if (a < pep) return dbp - pp * 0.02 * (a / pep);

  const te = a - pep;
  if (te < lvet) {
    const x = te / lvet;
    // Rapid ejection to a peak about a third of the way in, then a slower fall
    // as ejection decelerates. Lands at ~2/3 of pulse pressure at valve closure.
    const up = x < 0.30 ? Math.pow(x / 0.30, 0.72)
                        : 1 - 0.34 * Math.pow((x - 0.30) / 0.70, 1.6);
    return dbp + pp * up;
  }

  const tn = te - lvet;
  const pn = dbp + pp * 0.66;                    // pressure at the moment of closure
  const dia = Math.max(0.04, rr - pep - lvet);
  // Windkessel decay. The time constant is fitted so the trace lands exactly on
  // the displayed diastolic pressure at the next beat: the arterial tree is a
  // leaky capacitor, and tying tau to the beat keeps the drawn SBP/DBP honest
  // instead of letting the waveform disagree with the numbers beside it.
  const tau = dia / 3.5;
  // THE INCISURA MUST BE A DIP, AND A DIP NEEDS A MINIMUM AFTER THE CLOSURE POINT.
  // This was exp(-tn/0.011): maximal at tn = 0 and monotonically decaying, so it
  // only ever subtracted LESS as time went on. Added to a decaying exponential the
  // sum rose smoothly out of valve closure and the notch — the single most
  // recognisable feature of an arterial line, and one this function's own comment
  // lists as a viva landmark — did not exist. Verified absent: zero local minima
  // in the 140 ms after closure.
  // A gaussian centred just after closure produces the real thing: pressure falls
  // to a trough ~18 ms after the valve shuts, then the reflected wave lifts it into
  // the dicrotic peak at ~48 ms, then Windkessel runoff carries it down to DBP.
  const cn = (tn - 0.018) / 0.012;
  const notch = 0.17 * pp * Math.exp(-cn * cn);               // the incisura itself
  const c = (tn - 0.048) / 0.030;
  const dicrotic = 0.13 * pp * Math.exp(-c * c);              // reflected wave
  return dbp + (pn - dbp) * Math.exp(-tn / tau) - notch + dicrotic;
}

/* Photoplethysmograph. Optically it is the same pressure pulse seen through a
 * finger/web: delayed by pulse transit time, low-passed by the capillary bed
 * (which rounds the sharp incisura into a soft dicrotic shoulder), and — the
 * clinically important part — its AMPLITUDE collapses when the periphery
 * vasoconstricts. A flat pleth on a normal-looking SpO2 number is the monitor
 * telling you the number should not be believed. */
/* The wrapped shape lookup is a module-scope function, NOT a closure built inside
 * PHY_plethSample. The sampler runs at 250 Hz, so a fresh arrow per call was
 * fifteen thousand short-lived closures per second — precisely the garbage the
 * header promises this file does not make. Hoisted, it allocates nothing. */
function PHY_plethShape(t, rr, pep, lvet) {
  let x = t;
  while (x < 0) x += rr;
  while (x >= rr) x -= rr;
  return PHY_artSample(x, rr, 1, 0, pep, lvet);       // normalised 0..1 shape
}
function PHY_plethSample(a, rr, pep, lvet, ptt) {
  // Two-tap moving average = a one-pole smoother with no state and no allocation.
  return 0.58 * PHY_plethShape(a - ptt, rr, pep, lvet)
       + 0.42 * PHY_plethShape(a - ptt - 0.055, rr, pep, lvet);
}

/* Ventricular fibrillation: no organised depolarisation at all, just a chaotic
 * 4-7 Hz wander of varying amplitude. Deterministic (three incommensurate sines)
 * so it costs nothing and never allocates. */
function PHY_vfSample(t) {
  return 0.34 * Math.sin(t * 34.1)
       + 0.22 * Math.sin(t * 51.7 + 1.1)
       + 0.16 * Math.sin(t * 21.3 + 2.7)
       + 0.09 * Math.sin(t * 79.9 + 0.4);
}

function PHY_fmt(v, dp) { return v.toFixed(dp == null ? 0 : dp); }

/* Panel CSS, injected once. Scoped to phy- classes so it cannot collide with
 * SHELL_CSS, which owns everything else on screen. */
const PHY_CSS = `
#phy-mon{position:fixed;left:16px;top:16px;z-index:22;padding:0;border-radius:13px;overflow:hidden;
  background:var(--glass,rgba(8,13,18,.74));border:1px solid var(--line,rgba(255,255,255,.09));
  backdrop-filter:blur(11px);-webkit-backdrop-filter:blur(11px);
  box-shadow:0 18px 46px rgba(0,0,0,.55);opacity:0;transform:translateY(-8px) scale(.985);
  transition:opacity .34s ease,transform .34s cubic-bezier(.2,.9,.25,1);pointer-events:none}
#phy-mon.on{opacity:1;transform:none}
#phy-mon.alarm{border-color:rgba(232,115,94,.62);box-shadow:0 0 0 1px rgba(232,115,94,.22),0 18px 46px rgba(0,0,0,.6);
  animation:phy-alarm 1.05s ease-in-out infinite}
@keyframes phy-alarm{50%{border-color:rgba(232,115,94,.16);box-shadow:0 18px 46px rgba(0,0,0,.6)}}
#phy-cv{display:block}
`;
let PHY_styleEl = null;
function PHY_ensureStyle() {
  if (PHY_styleEl || typeof document === 'undefined') return;
  // document.head is null while a document is still being parsed by an XML/SVG
  // path, and in a few embedded webviews. Falling back to documentElement means a
  // missing <head> costs us nothing; throwing here would take the whole module out
  // over a stylesheet, which is never the right trade.
  const host = document.head || document.documentElement;
  if (!host) return;
  PHY_styleEl = document.createElement('style');
  PHY_styleEl.id = 'phy-style';
  PHY_styleEl.textContent = PHY_CSS;
  host.appendChild(PHY_styleEl);
}

/* Lane mapping and the visual-activity epsilon live at module scope. Both were
 * rebuilt inside the factory on every specimen load, which is a small leak of
 * garbage per load and, more to the point, hid two constants that describe the
 * MONITOR rather than any one specimen. */
const PHY_LANE_SCALE = [
  // ECG: ±1.6 mV across the lane, centred low so the R wave has headroom.
  { mid: 0.66, gain: -0.30 },
  { mid: 0.50, gain: 0 },      // ABP: autoscaled from the pressures each draw
  { mid: 0.50, gain: 0 },      // PLETH: 0..1 normalised
];
const PHY_EPS = 0.004;

/* Monitor geometry, in CSS pixels. Fixed so the draw code never measures. */
const PHY_M = {
  w: 352, h: 278,
  hx: 10, hy: 16,                 // header baseline
  tx: 10, tw: 224,                // trace column
  lanes: [                        // y, height, colour, label
    { y: 30, h: 62, col: '#34d399', lab: 'ECG' },
    { y: 96, h: 62, col: '#e8735e', lab: 'ABP' },
    { y: 162, h: 62, col: '#38e0d8', lab: 'PLETH' },
  ],
  nx: 242, nw: 100,
  fy: 240,                        // footer band
  hz: 250,                        // waveform sample rate, Hz
  span: 1000,                     // ring length = 4 s across the trace width
};

/* ══════════════════════════════════════════════════════════════════════════ */
export function createPhysiology(THREE, parts, specimenId) {
  const spec = PHY_PROFILE[specimenId] ? specimenId : 'frog';
  const prof = PHY_PROFILE[spec];
  const byId = new Map();
  // A null/undefined parts list is a caller bug, but it must not be a THROWN one:
  // the graphs, the monitor and the whole teaching model are still perfectly valid
  // with nothing to tint, and an empty list degrades to "monitor only" rather than
  // taking physiology out of the build entirely.
  const partList = Array.isArray(parts) ? parts : [];
  for (let i = 0; i < partList.length; i++) {
    if (partList[i] && partList[i].mesh) byId.set(partList[i].id, partList[i]);
  }

  let cb = null;
  const emit = (kind, partId, text, meta) => { if (cb) cb({ kind, partId, text, meta: meta || {} }); };

  /* ---- scratch. Constructed once, mutated forever. THREE objects cannot live
   * at module scope here because THREE arrives as a parameter, so the closure is
   * the correct home for them — and it is still zero allocation per frame. ---- */
  const _cBase = new THREE.Color();
  const _cWork = new THREE.Color();
  const _cTgt = new THREE.Color();

  /* ---- tissue records ---------------------------------------------------- */
  // One record per part that any vessel or nerve touches. Held as a plain Array
  // and walked by index in update(): iterating a Map allocates an iterator and a
  // two-element array per entry, every frame, forever.
  const tissues = [];
  const tissueBy = new Map();
  function tissueFor(partId) {
    let t = tissueBy.get(partId);
    if (t) return t;
    const part = byId.get(partId);
    if (!part) return null;
    // Collect every material in the subtree. An organ's decorative children (the
    // adrenal streak on a kidney, the finger lobes of a fat body, coronary branch
    // tubes) are in the same vascular territory and must discolour with it, or
    // the pallor stops at an arbitrary seam and the illusion dies.
    const mats = [], bases = [], sheens = [];
    part.mesh.traverse((o) => {
      if (o.isMesh && o.material && o.material.color && mats.length < 14) {
        mats.push(o.material);
        bases.push(new THREE.Color().copy(o.material.color));
        // Sheen has to be captured too. Lerping a material's own sheenColor
        // toward a target every frame is a one-way ratchet — it never comes back,
        // and the organ stays subtly wrong forever after one brief clamp.
        sheens.push(o.material.sheenColor ? new THREE.Color().copy(o.material.sheenColor) : null);
      }
    });
    t = {
      id: partId, part, mesh: part.mesh, mats, bases, sheens,
      arterial: 1, venousBlock: 0,      // solved from the graph
      residual: 0,                      // supply from vessels this graph does not model
      perf: 1,                          // eased arterial perfusion 0..1
      ischTime: 0, venTime: 0,          // seconds in each insult
      pallor: 0, congest: 0, cyan: 0, flush: 0,
      tone: 1, toneTarget: 1,           // neuromuscular tone (motor parts only)
      twitch: 0, twitchClock: Math.random() * 3, stim: -1,
      motor: false,
      scaleOwn: 1, scaleLive: false,    // defensive mesh.scale ownership
      dirty: false,
      warned: 0,
    };
    tissues.push(t);
    tissueBy.set(partId, t);
    return t;
  }

  /* ---- build the graphs -------------------------------------------------- */
  const vnodes = [];
  const vBy = new Map();
  (PHY_VASC[spec] || []).forEach((n) => {
    const rec = {
      id: n.id, name: n.name, kind: n.kind, parent: n.parent || null, alt: n.alt || null,
      feeds: n.feeds || null, drains: n.drains || null,
      pulm: n.pulm || 0, cutaneous: n.cutaneous || 0, pulmReturn: n.pulmReturn || 0,
      preload: n.preload || 0, afterload: n.afterload || 0,
      territory: n.territory || null, lead: n.lead || null,
      hrEffect: n.hrEffect || 0, nodal: !!n.nodal, heart: !!n.heart,
      clamped: false, severed: false, blocked: false,
      isPart: byId.has(n.id),
    };
    vnodes.push(rec);
    vBy.set(rec.id, rec);
    if (rec.feeds) for (let i = 0; i < rec.feeds.length; i++) tissueFor(rec.feeds[i][0]);
    if (rec.drains) for (let i = 0; i < rec.drains.length; i++) tissueFor(rec.drains[i][0]);
  });

  /* RESIDUAL SUPPLY.
   * A tissue's modelled feed shares do not always sum to 1 — the RV free wall is
   * 0.8 RCA, the left atrium 0.8 circumflex, the moderator band 0.2 LAD + 0.6 RCA.
   * The remainder is real supply through vessels this graph does not name, and
   * without it those parts sat at arterial 0.8 FOREVER: perf 0.8, isch 0.2, which
   * is above PHY_EPS, so four structures on the heart wore a permanent ~19% pallor
   * from the moment the model was switched on and never explained why. Crediting
   * the unmodelled remainder makes a patent specimen actually look patent, while
   * leaving the size of each occlusion exactly as the graph author wrote it. */
  const feedTotal = new Map();
  for (let i = 0; i < vnodes.length; i++) {
    const n = vnodes[i];
    if (!n.feeds) continue;
    for (let j = 0; j < n.feeds.length; j++) {
      feedTotal.set(n.feeds[j][0], (feedTotal.get(n.feeds[j][0]) || 0) + n.feeds[j][1]);
    }
  }
  feedTotal.forEach((tot, id) => {
    const t = tissueBy.get(id);
    if (t) t.residual = tot < 1 ? 1 - tot : 0;
  });

  // Total coronary jeopardy available in the graph, used to normalise "how much
  // myocardium is at risk" into 0..1. Weighted by PHY_MYO so the divisor and the
  // numerator speak the same units — muscle, not part count. Derived from the
  // graph so editing the tree cannot silently rescale the arrest threshold.
  let coronaryTotal = 0;
  for (let i = 0; i < vnodes.length; i++) {
    const n = vnodes[i];
    if (n.territory && n.feeds) {
      for (let j = 0; j < n.feeds.length; j++) {
        coronaryTotal += n.feeds[j][1] * PHY_myoMass(n.feeds[j][0]);
      }
    }
  }
  if (coronaryTotal <= 0) coronaryTotal = 1;

  const nnodes = [];
  const nBy = new Map();
  const nByAnchor = new Map();
  (PHY_NEURAL[spec] || []).forEach((n) => {
    const rec = {
      id: n.id, name: n.name, parent: n.parent || null, anchor: n.anchor || null,
      motor: n.motor || null, chrono: n.chrono || 0, block: n.block || null,
      note: n.note || null, severed: false, blocked: false,
    };
    nnodes.push(rec);
    nBy.set(rec.id, rec);
    if (rec.anchor) nByAnchor.set(rec.anchor, rec);
    if (rec.motor) {
      for (let i = 0; i < rec.motor.length; i++) {
        const t = tissueFor(rec.motor[i][0]);
        if (t) t.motor = true;
      }
    }
  });

  /* ---- graph solution ---------------------------------------------------- */
  // Only ever runs on a clamp/unclamp/sever. Nothing here is per-frame work.
  const eff = {
    pulm: 1, pulmReturn: 1, preload: 1, afterload: 1,
    coronaryLoss: 0, stMag: 0, ischemicLead: prof.ecgLead, hrDrive: 0, nodalIsch: 0,
    heartPerf: 1, qrsWide: 0, chrono: 0, blockedNames: '',
  };

  function nodeBlocked(n, depth) {
    if (n.clamped || n.severed) return true;
    if (depth > 24) return false;                       // cycle guard, cheap
    if (n.parent) {
      const p = vBy.get(n.parent);
      if (p && nodeBlocked(p, depth + 1)) {
        // A dual-supply trunk (the dorsal aorta, fed by both systemic arches)
        // survives losing one parent. Anatomy is not always a tree.
        if (n.alt) {
          const a = vBy.get(n.alt);
          if (a && !nodeBlocked(a, depth + 1)) return false;
        }
        return true;
      }
    }
    return false;
  }

  function solve() {
    for (let i = 0; i < vnodes.length; i++) vnodes[i].blocked = nodeBlocked(vnodes[i], 0);
    for (let i = 0; i < nnodes.length; i++) {
      const n = nnodes[i];
      let b = n.severed;
      let p = n.parent ? nBy.get(n.parent) : null, guard = 0;
      while (!b && p && guard++ < 16) { if (p.severed) b = true; p = p.parent ? nBy.get(p.parent) : null; }
      n.blocked = b;
    }

    // reset tissue supply
    for (let i = 0; i < tissues.length; i++) { tissues[i].arterial = 0; tissues[i].venousBlock = 0; }

    let pulmTot = 0, pulmOpen = 0, retTot = 0, retOpen = 0;
    let preTot = 0, preOpen = 0, afterBlocked = 0;
    let corLoss = 0, hrDrive = 0, nodalIsch = 0, worstLead = prof.ecgLead, worstMag = 0;
    let heartBlocked = false;
    let names = '';

    for (let i = 0; i < vnodes.length; i++) {
      const n = vnodes[i];
      const open = n.blocked ? 0 : 1;
      if (n.feeds) {
        for (let j = 0; j < n.feeds.length; j++) {
          const t = tissueBy.get(n.feeds[j][0]);
          if (t) t.arterial += n.feeds[j][1] * open;
        }
      }
      if (n.drains && !open) {
        for (let j = 0; j < n.drains.length; j++) {
          const t = tissueBy.get(n.drains[j][0]);
          if (t) t.venousBlock = Math.max(t.venousBlock, n.drains[j][1]);
        }
      }
      if (n.pulm) { pulmTot += n.pulm; pulmOpen += n.pulm * open; }
      if (n.pulmReturn) { retTot += n.pulmReturn; retOpen += n.pulmReturn * open; }
      if (n.preload) { preTot += n.preload; preOpen += n.preload * open; }
      if (n.afterload && !open) afterBlocked = Math.max(afterBlocked, n.afterload);
      if (n.heart && !open) heartBlocked = true;
      if (n.territory && !open) {
        // Weight the infarct by how much myocardium the vessel actually owns —
        // MASS, not entry count. See PHY_MYO for why this is not a refinement.
        let share = 0;
        if (n.feeds) {
          for (let j = 0; j < n.feeds.length; j++) share += n.feeds[j][1] * PHY_myoMass(n.feeds[j][0]);
        }
        corLoss += share;
        hrDrive += n.hrEffect * share;
        if (n.nodal) nodalIsch = Math.max(nodalIsch, 0.8);
        if (share > worstMag) { worstMag = share; worstLead = n.lead || prof.ecgLead; }
      }
      if (n.blocked && (n.clamped || n.severed)) names += (names ? ' · ' : '') + n.name;
    }

    for (let i = 0; i < tissues.length; i++) {
      const t = tissues[i];
      // A part nobody feeds in this graph is simply not modelled — leave it alone
      // rather than pretending it just infarcted.
      if (t.arterial === 0 && !hasFeeder(t.id)) t.arterial = 1;
      else t.arterial = PHY_clamp01(t.arterial + t.residual);
    }

    eff.pulm = pulmTot ? pulmOpen / pulmTot : 1;
    eff.pulmReturn = retTot ? retOpen / retTot : 1;
    eff.preload = preTot ? preOpen / preTot : 1;
    eff.afterload = 1 + afterBlocked * 1.6;             // a cross-clamp is a wall
    // Jeopardised myocardium as a fraction of the WHOLE heart: the divisor is the
    // total feed share of every coronary in the graph, computed once at build.
    // Hard-coding it is how you end up fibrillating a heart for losing one vessel.
    eff.coronaryLoss = PHY_clamp01(corLoss / coronaryTotal);
    // ST magnitude is a different quantity from global jeopardy. A lead facing an
    // occluded LAD sees the largest ST elevation in all of cardiology even though
    // the LAD is only ~20% of the muscle, because elevation measures the
    // transmural extent under THAT electrode, not the fraction of the heart.
    // Divisors are in the SAME mass units as worstMag/hrDrive now. 0.40 is the
    // LAD's own jeopardy, so a full proximal LAD occlusion saturates ST elevation
    // — which is correct: anterior STEMI is the largest ST shift in cardiology.
    // The RCA lands near 0.5 of that, a real but smaller inferior elevation.
    // These constants moved with PHY_MYO; leaving them at 1.9/1.6 would have
    // flattened every ST segment to a fifth of its proper height.
    eff.stMag = PHY_clamp01(worstMag / 0.40);
    eff.hrDrive = PHY_clamp(hrDrive / 0.40, -1, 1);
    eff.nodalIsch = nodalIsch;
    eff.ischemicLead = worstLead;
    eff.heartPerf = heartBlocked ? 0 : 1;

    // conduction: a blocked bundle branch widens the QRS
    let wide = 0, chrono = 0;
    for (let i = 0; i < nnodes.length; i++) {
      const n = nnodes[i];
      if (n.blocked && n.block) wide = Math.max(wide, 0.05);
      if (n.severed && n.chrono) chrono -= n.chrono;   // remove the influence
    }
    // RCA/AV-nodal ischaemia also degrades conduction, which is why inferior
    // infarcts produce heart block far more often than anterior ones.
    if (eff.nodalIsch > 0.5) wide = Math.max(wide, 0.02);
    eff.qrsWide = wide;
    eff.chrono = chrono;
    eff.blockedNames = names;
  }

  const feederIds = new Set();
  vnodes.forEach((n) => { if (n.feeds) n.feeds.forEach((f) => feederIds.add(f[0])); });
  function hasFeeder(id) { return feederIds.has(id); }

  solve();

  /* ---- haemodynamic state ------------------------------------------------ */
  let running = false;
  let clockT = 0;              // seconds since setRunning(true)
  let ct = 0;                  // seconds into the current cardiac cycle (0 = QRS)
  let rr = 60 / prof.hr;       // current cycle length
  let beats = 0;

  let hr = prof.hr, sbp = prof.sbp, dbp = prof.dbp, spo2 = prof.spo2, temp = prof.temp;
  let bloodVol = 1;            // 1 = euvolaemic; blood.js drives this down
  const mapRef = prof.dbp + (prof.sbp - prof.dbp) / 3;   // this specimen's normal MAP
  let rhythm = 'sinus';        // sinus | vf | asystole
  let stShift = 0, tBoost = 0, ischSec = 0, arrestSec = 0, preArrestSaid = false;
  let resp = prof.resp;
  let perfIndex = 1;           // pleth amplitude — the "is this number real" signal
  let mapVal = prof.dbp + (prof.sbp - prof.dbp) / 3;

  // The live vitals object. Returned by reference from vitals() and mutated in
  // place: handing out a fresh object 60 times a second is exactly the garbage
  // that shows up as jitter on a school laptop. Callers must not mutate it.
  const vit = {
    hr: prof.hr, sbp: prof.sbp, dbp: prof.dbp, map: mapVal, spo2: prof.spo2,
    temp: prof.temp, resp: prof.resp, rhythm: 'sinus', st: 0, perfIndex: 1,
    running: false, alarm: 0, lead: prof.ecgLead, label: prof.label,
  };

  /* ---- waveform ring ----------------------------------------------------- */
  // Three interleaved channels at 250 Hz. Preallocated; never grows; never
  // reallocated on resize because the monitor is a fixed size.
  const ring = new Float32Array(PHY_M.span * 3);
  let ringW = 0;               // total samples written (monotonic)
  let sampleAcc = 0;

  /* ---- monitor ----------------------------------------------------------- */
  let mon = null, ctx = null, drawnTo = 0, numAt = 0, lastAlarm = -1;

  function mountMonitor(root) {
    if (mon || typeof document === 'undefined') return mon;
    PHY_ensureStyle();
    mon = document.createElement('div');
    mon.id = 'phy-mon';
    const cv = document.createElement('canvas');
    cv.id = 'phy-cv';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = PHY_M.w * dpr; cv.height = PHY_M.h * dpr;
    cv.style.width = PHY_M.w + 'px'; cv.style.height = PHY_M.h + 'px';
    mon.appendChild(cv);
    (root || document.body).appendChild(mon);
    // getContext returns null when the browser has run out of canvas backings (a
    // real limit — this app already holds a WebGL context, the hand-tracking video
    // and several other 2D canvases) or when canvas is blocked by an
    // anti-fingerprinting extension. Without this guard that returns a module-
    // killing throw straight through main.js's try/catch, and the student loses
    // clamping, denervation and the whole causal model to save a drawing surface.
    // The physiology is the point; the monitor is how it is displayed.
    ctx = cv.getContext ? cv.getContext('2d') : null;
    if (!ctx) {
      console.warn('physio: 2D canvas unavailable; running without the monitor panel');
      unmountMonitor();
      return null;
    }
    ctx.scale(dpr, dpr);
    ctx.textBaseline = 'alphabetic';
    paintChrome(true);
    drawnTo = ringW;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => { if (mon) mon.classList.add('on'); });
    } else { mon.classList.add('on'); }
    return mon;
  }

  function unmountMonitor() {
    if (!mon) return;
    if (mon.parentNode) mon.parentNode.removeChild(mon);
    mon = null; ctx = null;
  }

  // Static furniture: screen, lane frames, labels. Repainted only on mount and
  // when the lane labels change, never per frame.
  function paintChrome(full) {
    if (!ctx) return;
    if (full) {
      ctx.fillStyle = '#05080b';
      ctx.fillRect(0, 0, PHY_M.w, PHY_M.h);
    }
    ctx.fillStyle = '#05080b';
    ctx.fillRect(0, 0, PHY_M.w, 24);
    ctx.font = '600 8.5px ui-monospace,Menlo,Consolas,monospace';
    ctx.fillStyle = '#38e0d8';
    ctx.fillText('PHYSIOLOGY', PHY_M.hx, PHY_M.hy);
    ctx.fillStyle = '#5c6d76';
    ctx.fillText('· SIMULATED MODEL, NOT MEASURED', PHY_M.hx + 62, PHY_M.hy);
    // divider between traces and numerics
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fillRect(PHY_M.nx - 6, 28, 1, PHY_M.fy - 34);
    ctx.fillRect(0, 24, PHY_M.w, 1);
    ctx.fillRect(0, PHY_M.fy - 4, PHY_M.w, 1);
    laneLabels();
  }

  // Lane labels sit INSIDE the trace lanes, so the sweep eraser destroys them
  // every four seconds. Real monitors overlay them; so do we, repainting after
  // every trace draw. Three fillText calls at 30 Hz costs nothing.
  function laneLabels() {
    ctx.font = '600 8px ui-monospace,Menlo,Consolas,monospace';
    ctx.fillStyle = '#5c6d76';
    for (let i = 0; i < PHY_M.lanes.length; i++) {
      const L = PHY_M.lanes[i];
      ctx.fillText(i === 0 ? L.lab + '  ' + vit.lead : L.lab, PHY_M.tx, L.y + 9);
    }
  }

  // Repaint the strip of screen we are about to sweep over, including the faint
  // one-second grid, so the grid regenerates behind the eraser instead of being
  // consumed by it.
  function eraseAhead(x0, x1) {
    ctx.fillStyle = '#05080b';
    for (let i = 0; i < PHY_M.lanes.length; i++) {
      const L = PHY_M.lanes[i];
      ctx.fillRect(x0, L.y, x1 - x0, L.h);
    }
    const secPx = PHY_M.tw / 4;                   // 4 s across the trace
    ctx.fillStyle = 'rgba(255,255,255,.055)';
    for (let s = 0; s <= 4; s++) {
      const gx = PHY_M.tx + s * secPx;
      if (gx >= x0 - 1 && gx <= x1) {
        for (let i = 0; i < PHY_M.lanes.length; i++) {
          const L = PHY_M.lanes[i];
          ctx.fillRect(Math.round(gx), L.y + 4, 1, L.h - 8);
        }
      }
    }
  }

  function drawTraces() {
    if (!ctx) return;
    const span = PHY_M.span;
    let n = ringW - drawnTo;
    if (n <= 0) return;
    if (n > span) { n = span; drawnTo = ringW - span; }

    const pxPer = PHY_M.tw / span;
    const startCol = drawnTo % span;
    const x0 = PHY_M.tx + startCol * pxPer;
    const x1 = PHY_M.tx + Math.min(span, startCol + n) * pxPer;
    eraseAhead(x0, Math.min(PHY_M.tx + PHY_M.tw, x1 + 10));
    // If this batch wrapped past the right edge, the samples that landed back at
    // the left need their strip cleared too — otherwise the new trace draws on
    // top of the four-second-old one for a frame and the screen looks smeared.
    if (startCol + n > span) {
      eraseAhead(PHY_M.tx, Math.min(PHY_M.tx + PHY_M.tw, PHY_M.tx + ((startCol + n) - span) * pxPer + 10));
    }

    // Pressure lane autoscale: 20 mmHg below diastolic to 20 above systolic, so a
    // frog at 30/20 and a mammal at 120/80 both fill the lane properly.
    const plo = Math.max(0, dbp - 18), phi = sbp + 18;

    for (let lane = 0; lane < 3; lane++) {
      const L = PHY_M.lanes[lane];
      ctx.strokeStyle = L.col;
      ctx.lineWidth = lane === 0 ? 1.35 : 1.15;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < n; i++) {
        const idx = drawnTo + i;
        const col = idx % span;
        if (col === 0 && started) { ctx.stroke(); ctx.beginPath(); started = false; }
        const v = ring[col * 3 + lane];
        let y;
        if (lane === 0) y = L.y + L.h * PHY_LANE_SCALE[0].mid + v * L.h * PHY_LANE_SCALE[0].gain;
        else if (lane === 1) y = L.y + L.h - 5 - ((v - plo) / Math.max(1, phi - plo)) * (L.h - 10);
        else y = L.y + L.h - 5 - PHY_clamp01(v) * (L.h - 10);
        y = PHY_clamp(y, L.y + 1, L.y + L.h - 1);
        const x = PHY_M.tx + col * pxPer;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      if (started) ctx.stroke();
    }
    laneLabels();
    drawnTo = ringW;
  }

  function alarmColour(level) {
    return level >= 2 ? '#e8735e' : level === 1 ? '#f0b866' : '#d6e2e8';
  }

  // Numerics. Redrawn at ~4 Hz — a bedside monitor averages its numbers over
  // several beats and updating them every frame reads as noise, not data.
  function drawNumbers() {
    if (!ctx) return;
    const x = PHY_M.nx, w = PHY_M.nw;
    ctx.fillStyle = '#05080b';
    ctx.fillRect(x - 4, 26, w + 8, PHY_M.fy - 32);

    const block = (y, lab, val, unit, col, sub) => {
      ctx.font = '600 8px ui-monospace,Menlo,Consolas,monospace';
      ctx.fillStyle = '#5c6d76';
      ctx.fillText(lab, x, y);
      ctx.font = '600 27px ui-monospace,Menlo,Consolas,monospace';
      ctx.fillStyle = col;
      ctx.fillText(val, x, y + 27);
      const vw = ctx.measureText(val).width;
      ctx.font = '600 8.5px ui-monospace,Menlo,Consolas,monospace';
      ctx.fillStyle = '#5c6d76';
      ctx.fillText(unit, x + vw + 4, y + 27);
      if (sub) { ctx.fillStyle = '#8fa3ad'; ctx.fillText(sub, x, y + 39); }
    };

    const hrLvl = running ? levelHR() : 0;
    const bpLvl = running ? levelMAP() : 0;
    const spLvl = running ? levelSpO2() : 0;
    const tLvl = running ? levelTemp() : 0;

    if (!running) {
      ctx.font = '600 8px ui-monospace,Menlo,Consolas,monospace';
      ctx.fillStyle = '#5c6d76';
      ctx.fillText('STANDBY', x, 40);
      ctx.fillText('SPECIMEN', x, 52);
      ctx.fillText('NOT LIVING', x, 64);
      return;
    }

    // Dashes, not a number, in a non-perfusing rhythm — the same honesty the SpO2
    // field already applies below. A monitor showing "169" beside "VF" is teaching
    // the student that fibrillation has a rate.
    const hrTxt = rhythm === 'sinus' ? PHY_fmt(hr) : '- -';
    block(36, 'HR', hrTxt, hrTxt === '- -' ? '' : 'bpm',
      alarmColour(hrLvl) === '#d6e2e8' ? '#34d399' : alarmColour(hrLvl),
      rhythm === 'vf' ? 'VF' : rhythm === 'asystole' ? 'ASYSTOLE' : 'sinus');
    block(102, 'ABP', PHY_fmt(sbp) + '/' + PHY_fmt(dbp), '', alarmColour(bpLvl) === '#d6e2e8' ? '#e8735e' : alarmColour(bpLvl),
      '(' + PHY_fmt(mapVal) + ') mmHg');
    // A real pulse oximeter stops reporting a number below roughly 50-70%: the
    // calibration curves were built on healthy volunteers who could not ethically
    // be desaturated further, so everything below that is extrapolation. Showing
    // "--" there is the honest behaviour, and it is worth the student seeing it.
    const spTxt = (rhythm !== 'sinus' || perfIndex < 0.12) ? '- -'
                : spo2 < 50 ? '< 50' : PHY_fmt(spo2);
    block(168, 'SpO₂', spTxt, spTxt === '- -' ? '' : '%',
      alarmColour(spLvl) === '#d6e2e8' ? '#38e0d8' : alarmColour(spLvl),
      perfIndex < 0.35 ? 'LOW PERFUSION' : 'PI ' + perfIndex.toFixed(1));
    ctx.font = '600 8px ui-monospace,Menlo,Consolas,monospace';
    ctx.fillStyle = '#5c6d76';
    ctx.fillText('TEMP', x, 222);
    ctx.font = '600 13px ui-monospace,Menlo,Consolas,monospace';
    ctx.fillStyle = alarmColour(tLvl) === '#d6e2e8' ? '#8fa3ad' : alarmColour(tLvl);
    ctx.fillText(temp.toFixed(1) + '°C', x, 235);
  }

  function drawFooter() {
    if (!ctx) return;
    ctx.fillStyle = '#05080b';
    ctx.fillRect(0, PHY_M.fy - 3, PHY_M.w, PHY_M.h - PHY_M.fy + 3);
    ctx.font = '600 8.5px ui-monospace,Menlo,Consolas,monospace';
    let msg;
    if (!running) msg = prof.label + ' · press P to model living physiology';
    else if (rhythm === 'asystole') msg = 'ASYSTOLE · no cardiac output';
    else if (rhythm === 'vf') msg = 'VENTRICULAR FIBRILLATION · no cardiac output';
    else if (eff.blockedNames) msg = 'OCCLUDED: ' + eff.blockedNames;
    else msg = prof.label + ' · all vessels patent';
    ctx.fillStyle = rhythm !== 'sinus' ? '#e8735e' : eff.blockedNames ? '#f0b866' : '#5c6d76';
    const max = PHY_M.w - 20;
    while (ctx.measureText(msg).width > max && msg.length > 8) msg = msg.slice(0, -2);
    ctx.fillText(msg, PHY_M.hx, PHY_M.h - 12);
    // beat blip in the header, so the panel has a pulse even at a glance
    ctx.fillStyle = '#05080b';
    ctx.fillRect(PHY_M.w - 26, 6, 20, 14);
    if (running && rhythm === 'sinus' && ct < 0.12) {
      ctx.fillStyle = '#34d399';
      ctx.beginPath(); ctx.arc(PHY_M.w - 16, 13, 3.4, 0, Math.PI * 2); ctx.fill();
    }
  }

  function levelHR() {
    if (rhythm !== 'sinus') return 2;
    if (hr < prof.hrCrit || hr > prof.hrHi * 1.35) return 2;
    if (hr < prof.hrLo || hr > prof.hrHi) return 1;
    return 0;
  }
  function levelMAP() {
    if (mapVal < prof.mapCrit) return 2;
    if (mapVal < prof.mapLo) return 1;
    return 0;
  }
  function levelSpO2() {
    if (spo2 < prof.spo2Crit) return 2;
    if (spo2 < prof.spo2Lo) return 1;
    return 0;
  }
  function levelTemp() {
    if (temp < prof.tempLo - 2 || temp > prof.tempHi + 1.5) return 2;
    if (temp < prof.tempLo || temp > prof.tempHi) return 1;
    return 0;
  }

  /* ---- physiological integration ---------------------------------------- */
  function stepVitals(dt) {
    /* HEART RATE.
     * Four inputs, all of them real and all of them separable:
     *  1. Baroreflex. Carotid/aortic baroreceptors fire in proportion to stretch.
     *     Lose pressure and they stop firing, the vagus is withdrawn, sympathetic
     *     outflow rises — tachycardia is the RESPONSE to hypotension, not a
     *     coincidence beside it.
     *  2. Coronary territory. Anterior/lateral ischaemia drives sympathetic tone
     *     up (pain, falling stroke volume). Inferior ischaemia does the opposite:
     *     the RCA feeds the sinus and AV nodes, and vagal afferents in the
     *     inferior wall (Bezold-Jarisch) actively slow the heart. This is why
     *     "occlude a coronary -> heart rate rises" is only two-thirds true, and
     *     the module says so.
     *  3. Autonomic section. Cutting the vagus removes a brake -> faster.
     *  4. Temperature. A frog is a poikilotherm: rate roughly doubles per 10 degC
     *     (Q10 ~ 2). Warm the room and the heart genuinely speeds up.
     */
    const mapRatio = mapVal / mapRef;
    const baro = PHY_clamp(1 - mapRatio, -0.35, 0.9);
    // Q10 is referenced to the specimen's OWN normal operating temperature, not
    // to the room. For a frog those are the same number (it is the room), which
    // is the whole point of a poikilotherm; for a mammalian heart the reference
    // is 37 degC and cooling it produces hypothermic bradycardia, which is also
    // exactly right. Referencing both to ambient would have started the mammal
    // at 2.8x its own resting rate.
    const q10 = Math.pow(2, (temp - prof.temp) / 10);
    // Chemoreflex. Sign is species-specific and this is not a detail to fudge: a
    // hypoxic mammal becomes tachycardic, a hypoxic frog becomes BRADYCARDIC —
    // the diving response conserves oxygen for the brain by slowing the heart.
    const hypox = PHY_clamp01((prof.spo2 - spo2) / 25) * prof.hypoxiaHR;
    let hrT = prof.hr * q10
            * (1 + baro * 1.05)
            * (1 + eff.hrDrive * 0.22)
            * (1 + eff.chrono * 0.30)
            * (1 + hypox * 0.30);
    if (eff.nodalIsch > 0.5) hrT *= 1 - 0.28 * eff.nodalIsch;   // AV nodal ischaemia
    hrT = PHY_clamp(hrT, prof.hr * 0.35, prof.hr * 2.6);
    // Rate changes are not instantaneous: the sinus node responds to vagal
    // withdrawal in a beat or two and to sympathetic drive over ~10 s.
    hr = PHY_easeTo(hr, hrT, hrT > hr ? 3.2 : 5.0, dt);

    /* PRESSURE.
     * Stroke volume comes from preload (Frank-Starling), contractility (which is
     * myocardial perfusion) and afterload. Cardiac output is SV x HR. MAP is
     * CO x systemic vascular resistance, and SVR is itself a reflex variable.
     */
    // Whether the lung is in SERIES with the systemic circuit decides whether
    // blocking it stops systemic filling. In a mammal every drop of left-heart
    // output has crossed the lung, so it does. A frog's undivided ventricle runs
    // the two circuits in PARALLEL with a large systemic shunt, so occluding a
    // pulmocutaneous arch drops its saturation without emptying the heart. Same
    // clamp, different animal, different answer.
    const transpulm = prof.seriesLung ? Math.min(eff.pulm, eff.pulmReturn) : 1;
    const preload = PHY_clamp01(bloodVol * eff.preload * transpulm);
    // Blood volume does not map linearly onto ventricular filling. Roughly two
    // thirds of the circulating volume sits in the compliant venous reservoir, and
    // venoconstriction recruits it, so the first ~15% of a haemorrhage costs the
    // ventricle almost nothing. Past that the reservoir is spent and mean systemic
    // filling pressure — the thing that actually drives venous return — collapses.
    // The offset here is that reservoir: below ~34% of volume there is nothing
    // left to recruit, which is where exsanguination becomes unsurvivable.
    const vEff = PHY_clamp01((preload - 0.34) / 0.66);
    // Starling: steep, then plateauing. The normal heart sits near the top of the
    // curve, which is why giving fluid to a euvolaemic patient does nothing and
    // why losing volume walks straight back down the steep part.
    const starling = (1 - Math.exp(-2.6 * vEff)) / (1 - Math.exp(-2.6));
    const contract = PHY_clamp01(1 - eff.coronaryLoss * 0.85) * eff.heartPerf;
    // Tachycardia is not free. Diastole shortens faster than systole, so past
    // about 130% of resting rate the ventricle no longer has time to fill and
    // each extra beat carries less. This is the ceiling on reflex compensation
    // and without it the model can always restore its own blood pressure — which
    // would quietly teach that haemorrhage is survivable indefinitely.
    const fillPenalty = 1 - 0.42 * PHY_clamp01((hr / prof.hr - 1.3) / 1.1);
    const sv = starling * contract * fillPenalty / eff.afterload;
    // Maximal systemic vasoconstriction is worth roughly +70%, not +150%. Capping
    // it is what makes shock progressive instead of self-correcting.
    const svr = PHY_clamp(1 + PHY_clamp(1 - mapRatio, 0, 1) * 0.95 + (eff.afterload - 1) * 0.8, 0.7, 1.9);

    const co = sv * (hr / prof.hr);
    let mapT = mapRef * co * svr;
    if (rhythm !== 'sinus') mapT = 6;             // fibrillation ejects nothing

    /* Pulse pressure narrows BEFORE mean pressure falls. That is the earliest
     * bedside sign of hypovolaemia and the reason a "normal blood pressure" is
     * not reassurance: stroke volume is down, so PP is down, but reflex
     * vasoconstriction is holding the diastolic up and hiding it. */
    const ppT = (prof.sbp - prof.dbp) * PHY_clamp(sv, 0.05, 1.4) * (1 / PHY_clamp(svr, 0.6, 2.6) * 0.55 + 0.45);
    mapVal = PHY_easeTo(mapVal, PHY_clamp(mapT, 3, prof.sbp * 1.5), 2.2, dt);
    const pp = PHY_easeTo(sbp - dbp, PHY_clamp(ppT, 2, (prof.sbp - prof.dbp) * 1.6), 2.2, dt);
    // MAP = DBP + k*PP. k is 1/3 at rest but rises toward 0.4 in tachycardia,
    // because diastole (the long part the mean spends in) shortens faster than
    // systole does.
    const kMap = 0.33 + 0.10 * PHY_clamp01((hr - prof.hr) / (prof.hr * 1.2));
    dbp = Math.max(2, mapVal - kMap * pp);
    sbp = dbp + pp;

    /* OXYGEN.
     * Gas exchange fraction = how much of the exchange surface still has blood
     * passing through it. Clamp a pulmonary vessel and that lung is ventilated
     * but not perfused: dead space, which cannot be compensated by breathing
     * harder, because the blood is not going there to be oxygenated. In the frog
     * half the resting exchange is cutaneous, so cutting the pulmocutaneous arch
     * takes out lung and skin together.
     * The number then passes through the dissociation curve, so it barely moves
     * until it collapses.
     */
    const gx = PHY_clamp01(prof.gasMix.pulm * Math.min(eff.pulm, eff.pulmReturn)
                         + prof.gasMix.skin * skinPerfusion());
    // Low cardiac output also widens the arteriovenous difference: stagnant blood
    // gives up more oxygen, so mixed venous saturation falls and any shunt hurts
    // more. A modest, honest coupling of shock to saturation.
    const pao2 = 104 * Math.pow(gx, 0.85) * (0.82 + 0.18 * PHY_clamp01(co));
    const spT = PHY_clamp(PHY_hill(pao2) - (1 - PHY_clamp01(co)) * 3, 20, prof.spo2);
    spo2 = PHY_easeTo(spo2, spT, 6, dt);          // circulation time + oximeter averaging

    // Perfusion index: the pleth amplitude. Vasoconstriction and low output
    // squash it long before the saturation number moves.
    perfIndex = PHY_easeTo(perfIndex, PHY_clamp(co / PHY_clamp(svr, 0.6, 2.6) * 1.15, 0.05, 2.2), 2.5, dt);

    /* RESPIRATION.
     * `resp` was fixed at the profile value for the whole run, which made it a
     * constant published through vitals() and used for the ECG's respiratory
     * baseline wander — so the trace kept breathing at a serene resting rate while
     * the animal arrested. Two real drives:
     *  1. Peripheral chemoreceptors (carotid/aortic bodies in the mammal, the
     *     carotid labyrinth in the frog) are nearly silent until PaO2 falls below
     *     about 60 mmHg, i.e. until saturation is already off the flat part of the
     *     dissociation curve. Hypoxic ventilatory drive is therefore LATE and steep,
     *     exactly like the curve that produces it.
     *  2. Low cardiac output means anaerobic metabolism and a lactic acidosis, and
     *     central chemoreceptors answer a falling pH with rising minute ventilation.
     *     Tachypnoea without hypoxaemia is the classic early sign of shock.
     */
    const hypoxDrive = PHY_clamp01((prof.spo2 - spo2) / 12);
    const acidDrive = PHY_clamp01(1 - PHY_clamp01(co));
    const respT = PHY_clamp(prof.resp * (1 + hypoxDrive * 0.9 + acidDrive * 0.7),
                            prof.resp * 0.5, prof.resp * 2.4);
    // Ventilation follows a chemoreceptor step over roughly half a minute.
    resp = PHY_easeTo(resp, rhythm === 'sinus' ? respT : prof.resp * 0.4, 12, dt);

    /* TEMPERATURE. A frog IS the room; a perfused mammalian heart cools when it
     * stops being perfused. Both drift toward ambient, the frog just starts there. */
    const tT = spec === 'frog' ? prof.ambient
             : prof.temp - (1 - PHY_clamp01(co)) * 2.4;
    temp = PHY_easeTo(temp, tT, 55, dt);

    /* ST SEGMENT.
     * Occluded epicardial artery -> transmural injury -> a diastolic current of
     * injury shifts the TP baseline, which the machine measures as ST elevation
     * in the leads facing the injured wall. The trace here names that lead rather
     * than pretending one lead sees everything.
     * Order matters: hyperacute T waves come FIRST, within a minute or two, and
     * the ST segment lifts after them.
     */
    if (eff.stMag > 0.02) ischSec += dt; else ischSec = Math.max(0, ischSec - dt * 2);
    const stT = eff.stMag * 0.62 * PHY_clamp01((ischSec - 6) / 24);
    stShift = PHY_easeTo(stShift, stT, 3.5, dt);
    tBoost = PHY_easeTo(tBoost, eff.stMag * 0.55 * PHY_clamp01(ischSec / 5)
                                * (1 - PHY_clamp01((ischSec - 18) / 30)), 2.5, dt);

    /* ARREST.
     * Two routes, both real. A large ischaemic territory destabilises the
     * myocardium electrically and fibrillates — the commonest cause of sudden
     * death after a coronary occlusion. Or the pressure simply fails, and an
     * unperfused heart goes to asystole.
     */
    if (rhythm === 'sinus') {
      // Half the myocardium is the honest threshold for electrical collapse. A
      // single-vessel occlusion must NOT be a guaranteed death sentence — it is a
      // large infarct with a real risk, and the student should be able to open the
      // artery again and watch it recover.
      if (eff.coronaryLoss > 0.5 || eff.heartPerf === 0 || mapVal < prof.mapCrit * 0.55) arrestSec += dt;
      else arrestSec = Math.max(0, arrestSec - dt * 0.5);
      // Latched, not windowed. `arrestSec > 4 && arrestSec < 4 + dt*1.5` fires
      // once only if dt is steady; a frame-time drop re-enters the window and the
      // student gets the same warning twice, which reads as a second event.
      if (arrestSec > 4 && !preArrestSaid) {
        preArrestSaid = true;
        emit('damage', null, 'Wide-territory ischaemia — the myocardium is electrically unstable.',
          { physio: 'preArrest' });
      }
      if (arrestSec <= 0.5) preArrestSaid = false;      // rearm once truly recovered
      if (arrestSec > 22) {
        rhythm = eff.heartPerf === 0 ? 'asystole' : 'vf';
        emit('damage', null, rhythm === 'vf'
          ? 'Ventricular fibrillation. The ventricles are quivering, not ejecting — there is no cardiac output.'
          : 'Asystole. No electrical activity, no output.', { physio: 'arrest', rhythm });
      }
    } else if (rhythm === 'vf') {
      arrestSec += dt;
      // Untreated VF is not stable: it coarsens, then fines, then stops.
      if (arrestSec > 95) { rhythm = 'asystole'; emit('damage', null, 'Fibrillation has coarsened, then fined, and stopped. Asystole.', { physio: 'arrest' }); }
      // Recoverable for as long as it is still fibrillating. VF is a SHOCKABLE,
      // reversible rhythm until it fines out — restricting recovery to a narrow
      // window would teach the opposite of the thing that matters.
      if (eff.coronaryLoss < 0.2 && eff.heartPerf === 1) {
        // Reperfusion restores an organised rhythm. This is the entire point of
        // opening an artery, so the model must allow it — a lab where one mistake
        // is unrecoverable teaches nothing except not to touch anything.
        rhythm = 'sinus'; arrestSec = 0;
        emit('discover', null, 'Reperfusion in time — an organised rhythm returns.', { physio: 'rosc' });
      }
    } else if (rhythm === 'asystole') {
      arrestSec += dt;
      // Asystole is the worse rhythm and the model says so: the cause must be
      // removed sooner, and past that point nothing you do here brings it back.
      if (arrestSec < 45 && eff.heartPerf === 1 && eff.coronaryLoss < 0.2 && bloodVol > 0.5) {
        rhythm = 'sinus'; arrestSec = 0;
        emit('discover', null, 'Circulation restored before the myocardium was lost — sinus rhythm returns.',
          { physio: 'rosc' });
      }
    }

    // No organised depolarisation means no rate to report. Fibrillation was
    // publishing the sinus node's drive (a baroreflex-driven 169 while the
    // ventricles quivered and ejected nothing), which is a number that cannot
    // exist. Both arrest rhythms report 0 — the rhythm field carries the meaning.
    vit.hr = rhythm === 'sinus' ? Math.round(hr) : 0;
    vit.sbp = rhythm === 'sinus' ? Math.round(sbp) : 0;
    vit.dbp = rhythm === 'sinus' ? Math.round(dbp) : 0;
    vit.map = Math.round(mapVal);
    vit.spo2 = Math.round(spo2 * 10) / 10;
    vit.temp = Math.round(temp * 10) / 10;
    vit.resp = Math.round(resp);
    vit.rhythm = rhythm;
    vit.st = Math.round(stShift * 100) / 100;
    vit.perfIndex = Math.round(perfIndex * 10) / 10;
    vit.running = running;
    vit.lead = eff.ischemicLead;
    vit.alarm = Math.max(levelHR(), levelMAP(), levelSpO2());
  }

  // Flow held constant above prof.mapLo, falling to nothing by half the critical
  // pressure. Slightly above 1 at high pressure — pressure-passive overperfusion.
  function autoreg() {
    if (mapVal >= prof.mapLo) return Math.min(1.05, 1 + (mapVal - mapRef) / (mapRef * 12));
    const floor = prof.mapCrit * 0.5;
    return PHY_clamp01((mapVal - floor) / Math.max(1, prof.mapLo - floor));
  }

  // Skin is fed by both pulmocutaneous arches; used for the frog's cutaneous
  // share of gas exchange.
  function skinPerfusion() {
    const t = tissueBy.get('skin');
    return t ? t.perf : 1;
  }

  /* ---- tissue appearance -------------------------------------------------- */
  function stepTissue(dt) {
    for (let i = 0; i < tissues.length; i++) {
      const t = tissues[i];

      // Arterial perfusion falls fast (the bed empties in a couple of seconds)
      // and returns fast on release. Global pressure modulates it: a territory
      // with a patent artery is still underperfused if the pressure is 30/15.
      // AUTOREGULATION. Tissue does not receive flow in proportion to pressure:
      // arterioles dilate as pressure falls and hold flow almost constant over a
      // wide range, then fail abruptly below the autoregulatory floor. That plateau
      // is precisely why "MAP 65" is a threshold in every protocol rather than a
      // slope, and modelling it as a straight ratio would have made an aortic
      // cross-clamp (which RAISES proximal pressure) starve the coronaries.
      const target = running ? t.arterial * autoreg() : 1;
      const wasIsch = t.perf < 0.5;
      t.perf = PHY_easeTo(t.perf, target, target < t.perf ? 2.4 : 1.6, dt);

      const isch = 1 - PHY_clamp01(t.perf);
      const ven = running ? t.venousBlock : 0;

      if (isch > 0.4) t.ischTime += dt; else t.ischTime = Math.max(0, t.ischTime - dt * 1.4);
      if (ven > 0.2) t.venTime += dt; else t.venTime = Math.max(0, t.venTime - dt * 1.6);

      /* THE SEQUENCE. This is the thing the module exists to show.
       * Arterial occlusion: the bed drains -> PALLOR within seconds. Then the
       * small amount of trapped blood gives up its oxygen and the tissue turns
       * dusky and finally CYANOTIC over the following half-minute, while the
       * pallor itself fades. Pale first, blue later — not both at once.
       * Venous occlusion: inflow continues, outflow stops, so the bed ENGORGES.
       * It is dark and plum from the start, it swells, and it never goes pale.
       */
      const pallorT = isch * Math.exp(-t.ischTime / 9) * 0.95;
      const cyanT = Math.max(isch, ven * 0.75) * (1 - Math.exp(-t.ischTime / 15 - t.venTime / 22));
      const congT = ven * (1 - Math.exp(-t.venTime / 4.5));

      t.pallor = PHY_easeTo(t.pallor, pallorT, 1.6, dt);
      t.congest = PHY_easeTo(t.congest, congT, 2.6, dt);
      t.cyan = PHY_easeTo(t.cyan, cyanT, 4.5, dt);

      // Reactive hyperaemia on release: a maximally dilated bed floods, then
      // settles. Brief, bright, and the clearest possible "it worked" signal.
      if (wasIsch && t.perf > 0.75 && t.ischTime > 1.5) t.flush = Math.min(1, t.flush + 0.9);
      t.flush = PHY_easeTo(t.flush, 0, 2.0, dt);

      /* NEUROMUSCULAR TONE.
       * A denervated muscle is not weak, it is silent: no tone, no twitch, and
       * it lengthens. Ischaemia also silences it, but more slowly (a muscle can
       * work anaerobically for a while), so the two causes look different in
       * time even though they end in the same flaccid muscle.
       */
      if (t.motor) {
        const nerve = t.toneTarget;
        const supply = Math.min(nerve, 0.25 + 0.75 * PHY_clamp01(t.perf));
        // Denervation is abrupt (0.35 s — the axon is cut, the signal is gone) and
        // recovery of tone is slow. Ischaemic silencing rides the same variable
        // but arrives via t.perf, which itself moves over seconds, so the two
        // causes look different in time even though both end in a flaccid muscle.
        t.tone = PHY_easeTo(t.tone, supply, supply < t.tone ? 0.35 : 2.5, dt);
        t.twitchClock += dt;
        if (t.stim >= 0) t.stim += dt;
      }

      applyVisual(t);
    }
  }

  function applyVisual(t) {
    const active = t.pallor > PHY_EPS || t.congest > PHY_EPS || t.cyan > PHY_EPS || t.flush > PHY_EPS;
    const mats = t.mats, bases = t.bases, sheens = t.sheens;

    if (!active) {
      if (t.dirty) {
        for (let i = 0; i < mats.length; i++) {
          mats[i].color.copy(bases[i]);
          if (sheens[i]) mats[i].sheenColor.copy(sheens[i]);
        }
        t.dirty = false;
      } else {
        // At rest, keep re-reading the base colour. dissect.js's damage() also
        // writes material.color, and a base captured once at construction would
        // silently undo that the next time this part became ischaemic. Re-read the
        // sheen on the same terms — it is restored from `sheens` in the branch
        // above, so a stale entry here is the same one-way ratchet, just slower.
        for (let i = 0; i < mats.length; i++) {
          bases[i].copy(mats[i].color);
          if (sheens[i] && mats[i].sheenColor) sheens[i].copy(mats[i].sheenColor);
        }
      }
    } else {
      for (let i = 0; i < mats.length; i++) {
        _cWork.copy(bases[i]);
        if (t.pallor > PHY_EPS) { _cTgt.setHex(PHY_CLR.pallor); _cWork.lerp(_cTgt, t.pallor * 0.58); }
        if (t.congest > PHY_EPS) { _cTgt.setHex(PHY_CLR.congestion); _cWork.lerp(_cTgt, t.congest * 0.68); }
        if (t.cyan > PHY_EPS) { _cTgt.setHex(PHY_CLR.cyanosis); _cWork.lerp(_cTgt, t.cyan * 0.55); }
        if (t.flush > PHY_EPS) { _cTgt.setHex(PHY_CLR.flush); _cWork.lerp(_cTgt, t.flush * 0.34); }
        mats[i].color.copy(_cWork);
        // The wet sheen goes waxy with pallor and dark with congestion. Cheap, and
        // it is most of why pale tissue reads as DEAD rather than as painted.
        // Always rebuilt FROM the stored base, never lerped in place.
        if (sheens[i]) {
          _cBase.setHex(t.congest > t.pallor ? 0x6a3050 : 0xd8c4b4);
          mats[i].sheenColor.copy(sheens[i]).lerp(_cBase, Math.min(0.3, (t.pallor + t.congest) * 0.3));
        }
      }
      t.dirty = true;
    }

    // ONE scale write per part per frame, combining every reason the shape
    // changes. Two independent writers on the same transform is how you get a
    // 30 Hz flicker that nobody can find.
    //   congestion swells (4% on a liver lobe is unmistakable; more is absurd)
    //   ischaemia collapses the bed slightly
    //   a contracting muscle SHORTENS — the twitch only ever scales down
    let s = 1 + t.congest * 0.045 - (1 - PHY_clamp01(t.perf)) * 0.018;
    if (t.motor && running) s *= 1 - twitchAmp(t) * 0.055;
    setScale(t, s);
  }

  /* mesh.scale is contested: dissect.js writes it while reflecting a flap. We
   * write it only while the value on the mesh is still the one WE last wrote. If
   * something else moved it we hand ownership over rather than fighting for it
   * sixty times a second. And we never TAKE a scale that is already away from 1. */
  function setScale(t, s) {
    const cur = t.mesh.scale.x;
    if (t.scaleLive) {
      if (Math.abs(cur - t.scaleOwn) > 0.004) { t.scaleLive = false; return; }   // taken from us
    } else {
      if (Math.abs(s - 1) < 0.0008) return;                 // nothing to say
      if (Math.abs(cur - 1) > 0.004) return;                // someone else owns it
    }
    t.mesh.scale.setScalar(s);
    t.scaleOwn = s;
    t.scaleLive = Math.abs(s - 1) > 0.0008;
    if (!t.scaleLive) t.mesh.scale.setScalar(1);
  }

  /* The twitch. Two kinds:
   *  - resting tone: small, slow, slightly irregular activity that says "this is
   *    innervated". Denervate it and this stops — that IS the observation.
   *  - a stimulated twitch: the textbook single-twitch curve of a frog
   *    gastrocnemius at room temperature — a latent period of ~10 ms, a
   *    contraction phase of ~45 ms, and a slower relaxation of ~105 ms. It is
   *    asymmetric, and it is far faster than anyone expects, which is the point
   *    of ever having drawn it on a kymograph.
   */
  function twitchAmp(t) {
    if (t.stim >= 0) {
      const u = t.stim;
      let a;
      if (u < 0.010) a = 0;                                       // latent period
      else if (u < 0.055) a = Math.pow((u - 0.010) / 0.045, 0.7); // contraction
      else if (u < 0.16) a = 1 - Math.pow((u - 0.055) / 0.105, 1.4); // relaxation
      else { t.stim = -1; a = 0; }
      return a * t.tone;
    }
    if (t.tone <= 0.05) return 0;
    // Jittered per part (off the id length) so the limbs are not in lockstep.
    const p = 0.85 + (t.id.length % 5) * 0.09;
    const u = (t.twitchClock % p) / p;
    return u < 0.22 ? Math.pow(Math.sin((u / 0.22) * Math.PI), 1.5) * 0.16 * t.tone : 0;
  }

  /* ---- the cardiac clock and waveform sampling --------------------------- */
  function stepClock(dt) {
    rr = 60 / Math.max(8, hr);
    ct += dt;
    while (ct >= rr) { ct -= rr; beats++; }

    /* Systolic time. Mechanical systole does NOT scale with the cycle: at 60 bpm
     * ejection takes ~300 ms of a 1000 ms cycle, and at 150 bpm it still takes
     * ~230 ms of a 400 ms cycle. Diastole absorbs almost the entire shortening,
     * which is why tachycardia wrecks filling and why coronary flow (which
     * happens in diastole) falls exactly when the heart needs more. */
    const lvet = PHY_clamp(0.16 + 0.20 * Math.sqrt(rr), 0.14, 0.40);
    const pep = 0.055;
    const ptt = 0.16 + 0.06 * PHY_clamp01(1 - mapVal / 90);   // slower wave at low pressure

    // Sample into the ring at a fixed rate. Doing this here rather than in the
    // draw call is what keeps a 22 ms R wave from being swallowed by a 33 ms
    // repaint interval.
    sampleAcc += dt;
    const step = 1 / PHY_M.hz;
    let guard = 0;
    while (sampleAcc >= step && guard++ < 64) {
      sampleAcc -= step;
      // Reconstruct where in the cycle this sample sits (it is slightly in the
      // past relative to `ct`).
      let c = ct - sampleAcc;
      while (c < 0) c += rr;

      let e;
      if (!running) e = 0;
      else if (rhythm === 'asystole') e = Math.sin(clockT * 3.1) * 0.012;
      else if (rhythm === 'vf') e = PHY_vfSample(clockT - sampleAcc) * PHY_clamp01(1 - arrestSec / 80);
      else {
        // u = time since P-wave onset. Atrial systole PRECEDES ventricular
        // systole, so the P wave sits at the END of the previous cycle: shifting
        // by the PR interval puts it there without a second clock.
        const k = Math.sqrt(rr);
        const pri = 0.16 * PHY_clamp(k, 0.72, 1.08);
        let u = c + pri;
        if (u >= rr) u -= rr;
        e = PHY_ecgSample(u, rr, stShift, eff.qrsWide, tBoost);
        // Respiratory baseline wander + a trace of noise. Absence of these is one
        // of the things that makes a synthetic ECG look synthetic.
        e += Math.sin(clockT * (vit.resp / 60) * Math.PI * 2) * 0.022
           + Math.sin(clockT * 611.7) * 0.004;
      }

      const a = running && rhythm === 'sinus'
        ? PHY_artSample(c, rr, sbp, dbp, pep, lvet)
        : (running ? mapVal * 0.45 + Math.sin(clockT * 9) * 0.6 : 0);

      const pl = running && rhythm === 'sinus'
        ? 0.12 + PHY_clamp01(PHY_plethSample(c, rr, pep, lvet, ptt)) * PHY_clamp01(perfIndex * 0.62) * 0.8
        : 0.12;

      const col = (ringW % PHY_M.span) * 3;
      ring[col] = e; ring[col + 1] = a; ring[col + 2] = pl;
      ringW++;
    }
  }

  /* ---- public actions ---------------------------------------------------- */
  // Resolve an id the student can plausibly hand us: a vessel node, a nerve node,
  // or the part ID of a structure one of those lives inside.
  function resolveVessel(id) {
    if (vBy.has(id)) return vBy.get(id);
    return null;
  }
  function resolveNerve(id) {
    if (nBy.has(id)) return nBy.get(id);
    if (nByAnchor.has(id)) return nByAnchor.get(id);
    return null;
  }

  function clamp(partId) {
    const v = resolveVessel(partId);
    if (!v || v.clamped) return false;
    v.clamped = true;
    solve();
    emit('discover', v.isPart ? v.id : null,
      'Clamp on the ' + v.name + '. ' + consequenceLine(v), { physio: 'clamp', vessel: v.id, kind: v.kind });
    return true;
  }

  function unclamp(partId) {
    const v = resolveVessel(partId);
    if (!v || !v.clamped) return false;
    v.clamped = false;
    solve();
    emit('discover', v.isPart ? v.id : null,
      'Clamp released from the ' + v.name + '. Watch for the flush of reactive hyperaemia.',
      { physio: 'unclamp', vessel: v.id });
    return true;
  }

  function clamped() {
    const out = [];
    for (let i = 0; i < vnodes.length; i++) if (vnodes[i].clamped) out.push(vnodes[i].id);
    return out;
  }

  // sever() is permanent and takes either a vessel or a nerve. main.js routes
  // dissect.js's `damage` events here, so cutting the ventral abdominal vein with
  // the scalpel — the classic first-attempt mistake — has physiological
  // consequences instead of just a red line in the log.
  function sever(partId) {
    let did = false;
    const v = resolveVessel(partId);
    if (v && !v.severed) {
      v.severed = true; did = true;
      emit('damage', v.isPart ? v.id : null,
        'The ' + v.name + ' is divided. ' + consequenceLine(v), { physio: 'sever', vessel: v.id, kind: v.kind });
    }
    const n = resolveNerve(partId);
    if (n && !n.severed) {
      n.severed = true; did = true;
      const line = n.note || ('The ' + n.name + ' is divided; everything it supplies falls silent.');
      emit('damage', null, n.name + ' divided. ' + line, { physio: 'denervate', nerve: n.id });
    }
    if (did) { solve(); refreshTone(); }
    return did;
  }

  function consequenceLine(v) {
    if (v.kind === 'venous') {
      return 'Outflow is obstructed: inflow continues, so the territory it drains will engorge, darken and swell.';
    }
    if (v.pulm || v.pulmReturn) {
      return 'That lung is now ventilated but not perfused — dead space. Saturation will fall as the shunt fraction rises.';
    }
    if (v.territory) {
      return 'Myocardium in the ' + v.territory + ' wall is now ischaemic. Watch the T waves before the ST segment moves.';
    }
    return 'Everything downstream loses arterial inflow: pallor within seconds, cyanosis over the next half-minute.';
  }

  function refreshTone() {
    for (let i = 0; i < tissues.length; i++) tissues[i].toneTarget = tissues[i].motor ? 0 : 1;
    for (let i = 0; i < nnodes.length; i++) {
      const n = nnodes[i];
      if (!n.motor || n.blocked) continue;
      for (let j = 0; j < n.motor.length; j++) {
        const t = tissueBy.get(n.motor[j][0]);
        if (t) t.toneTarget = Math.max(t.toneTarget, n.motor[j][1]);
      }
    }
  }
  refreshTone();

  // Extra, not in the minimum contract but the reason the neural graph is here:
  // stimulate the nerve and watch the muscle answer. If the nerve is cut, nothing
  // happens — which is the whole experiment.
  function stimulate(id) {
    const n = resolveNerve(id);
    if (n) {
      if (n.blocked) {
        emit('discover', null, n.name + ' stimulated — no response. The pathway is interrupted.',
          { physio: 'stimulate', nerve: n.id, responded: false });
        return false;
      }
      let any = false;
      if (n.motor) {
        for (let j = 0; j < n.motor.length; j++) {
          const t = tissueBy.get(n.motor[j][0]);
          if (t && t.tone > 0.05) { t.stim = 0; any = true; }
        }
      }
      emit('discover', null, any
        ? n.name + ' stimulated — the muscle it supplies twitches, once, and relaxes.'
        : n.name + ' stimulated — no muscle answered.', { physio: 'stimulate', nerve: n.id, responded: any });
      return any;
    }
    const t = tissueBy.get(id);
    if (t && t.motor && t.tone > 0.05) { t.stim = 0; return true; }
    return false;
  }

  function setRunning(on) {
    const want = !!on;
    if (want === running) return;
    running = want;
    if (running) {
      ct = 0; clockT = 0; sampleAcc = 0;
      hr = prof.hr; sbp = prof.sbp; dbp = prof.dbp;
      mapVal = mapRef;
      spo2 = prof.spo2; temp = prof.temp; perfIndex = 1; resp = prof.resp;
      rhythm = 'sinus'; stShift = 0; tBoost = 0; ischSec = 0; arrestSec = 0;
      preArrestSaid = false;
      emit('discover', null,
        'Living-physiology model ON. This is a SIMULATION layered over the specimen — the animal on the table is dead. '
        + 'Clamp a vessel and watch what it feeds; cut a nerve and watch what it moved.',
        { physio: 'start', simulated: true });
    } else {
      emit('discover', null, 'Living-physiology model off. The specimen is a specimen again.',
        { physio: 'stop' });
    }
    if (mon) { paintChrome(true); drawnTo = ringW; numAt = 0; }
  }

  /* ---- frame ------------------------------------------------------------- */
  let drawAcc = 0, numAcc = 0;
  let failed = false;

  /* main.js wraps CONSTRUCTION in try/catch, but nothing wraps the frame. A throw
   * from here propagates out of tick() and the next requestAnimationFrame is never
   * scheduled — the whole lab freezes, camera and all, because one organ's material
   * was disposed underneath us. That trade is never worth taking: physiology is an
   * optional layer over a dissection that must keep running. So the frame is
   * fenced, the failure is reported ONCE (a per-frame console flood is its own
   * denial of service), and the module then stands down quietly and permanently
   * while everything else carries on. */
  function update(dtMs) {
    if (failed) return;
    try { step(dtMs); } catch (e) {
      failed = true;
      console.warn('physio: disabled after a frame error; dissection continues', e);
      try { unmountMonitor(); } catch (e2) { /* nothing left to save */ }
    }
  }

  function step(dtMs) {
    const dt = Math.min(0.1, (dtMs || 16) / 1000);   // a stall must not integrate a jump
    if (running) {
      clockT += dt;
      stepVitals(dt);
      stepClock(dt);
    } else {
      // Even stopped we keep sampling flatline into the ring so the monitor sweeps
      // a real (empty) trace rather than freezing mid-screen.
      stepClock(dt);
    }
    stepTissue(dt);

    if (!mon || !ctx) return;
    drawAcc += dt; numAcc += dt;
    if (drawAcc >= 1 / 30) { drawAcc = 0; drawTraces(); }
    if (numAcc >= 0.25) {
      numAcc = 0;
      drawNumbers();
      drawFooter();
      const lvl = running ? vit.alarm : 0;
      if (lvl !== lastAlarm) {
        lastAlarm = lvl;
        mon.classList.toggle('alarm', lvl >= 2);
      }
      if (vit.lead !== paintChrome.lead) { paintChrome.lead = vit.lead; paintChrome(false); }
    }
  }

  /* ---- teardown ---------------------------------------------------------- */
  function dispose() {
    unmountMonitor();
    for (let i = 0; i < tissues.length; i++) {
      const t = tissues[i];
      for (let j = 0; j < t.mats.length; j++) {
        t.mats[j].color.copy(t.bases[j]);
        // applyVisual writes sheenColor as well as color, and dispose restored only
        // the colour. These materials are OWNED BY THE SPECIMEN, not by this module,
        // and loading a new specimen does not necessarily rebuild them — so a single
        // clamp-then-switch left the waxy pallor sheen baked into an organ with no
        // way to ever get it back. Restore everything we touched.
        if (t.sheens[j] && t.mats[j].sheenColor) t.mats[j].sheenColor.copy(t.sheens[j]);
      }
      t.dirty = false;
      if (t.scaleLive && Math.abs(t.mesh.scale.x - t.scaleOwn) < 0.06) t.mesh.scale.setScalar(1);
      t.scaleLive = false;
    }
    tissues.length = 0;
    tissueBy.clear();
    cb = null;
  }

  /* ---- API --------------------------------------------------------------- */
  return {
    setRunning,
    running: () => running,
    // 0 at the onset of ventricular systole, 1 at the next. THE shared clock:
    // softbody's squeeze, blood's pulsatility and the ECG all read this, so they
    // cannot drift apart. Frozen in mid-diastole when the model is off, so
    // nothing jumps when it is switched on.
    phase: () => (running ? ct / rr : 0.72),
    heartRate: () => (running ? hr : 0),
    // Live object, mutated in place. Read it; do not keep it and do not write it.
    vitals: () => vit,
    clamp, unclamp, clamped,
    perfusion: (id) => { const t = tissueBy.get(id); return t ? t.perf : 1; },
    innervation: (id) => { const t = tissueBy.get(id); return t ? (t.motor ? t.tone : 1) : 1; },
    sever,
    stimulate,
    mountMonitor, unmountMonitor,
    onEvent: (fn) => { cb = fn; },
    update,
    dispose,
    // Optional coupling: blood.js calls this with remaining fraction of blood
    // volume. Hypovolaemia then flows through Starling -> stroke volume -> pulse
    // pressure -> baroreflex, exactly as it does in an animal.
    setBloodVolume: (f) => { bloodVol = PHY_clamp01(f); },
    // Introspection for the shell / viva, and for anyone poking at __LAB.
    vessels: () => vnodes.map((n) => ({ id: n.id, name: n.name, kind: n.kind, clamped: n.clamped, severed: n.severed, blocked: n.blocked })),
    nerves: () => nnodes.map((n) => ({ id: n.id, name: n.name, severed: n.severed, blocked: n.blocked })),
  };
}
