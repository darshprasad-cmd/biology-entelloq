/*
 * narrator.js — a demonstrator standing next to you, talking.
 *
 * Reading UI text aloud is worse than silence. A real demonstrator says specific
 * things about the thing you are touching, at the moment you touch it, and then
 * shuts up. So this keeps a curated line library keyed by (event kind, structure)
 * and speaks at most one considered sentence every couple of seconds.
 *
 * Three rules that stop it becoming unbearable:
 *   1. Only meaningful events talk. Hover sweeps are ignored; probing, revealing,
 *      lifting and damaging are worth a sentence.
 *   2. Never the same line twice in a row, and phrasing rotates per structure.
 *   3. A more important event cancels a less important one mid-sentence.
 *
 * Everything is local: speechSynthesis + WebAudio. No network, nothing recorded.
 */

const NAR_PRIORITY = { damage: 3, discover: 2, peel: 2, lift: 2, incise: 1, pin: 1, replace: 1, retract: 1 };

// Structure lines. Several per entry so a repeat visit sounds different.
const NAR_LINES = {
  // ---- frog ----
  'skin': ['Frog skin — moist and permeable. They breathe through it as much as through the lungs.'],
  'muscle-wall': ['The body wall. Cut along the linea alba, and stay shallow — the ventral abdominal vein runs right down the midline.'],
  'ventral-abdominal-vein': ['That is the ventral abdominal vein, running in the midline of the wall. This is the one everybody cuts on their first attempt.'],
  'liver-left': ['Liver. The largest organ in the cavity — note the deep maroon, and how it fills the whole front.',
                 'The left anterior lobe of the liver. Dark, dense, and covering everything behind it.'],
  'liver-right': ['The right lobe of the liver — the largest of the three.',
                  'Liver again. Lift it and you will find the stomach hiding underneath.'],
  'liver-median': ['The left posterior lobe. The gall bladder sits in the cleft between the lobes.'],
  'gall-bladder': ['There — the gall bladder. Small, green, tucked between the liver lobes. Easy to burst if you are careless.'],
  'frog-heart': ['The heart. Three chambers, not four — two atria and a single ventricle, with the conus arteriosus leaving the front.',
                 'Note the shape of the frog heart: one undivided ventricle. That is the amphibian pattern.'],
  'lung-left': ['A lung — a thin, simple sac. Frogs force air in from the mouth rather than expanding a ribcage.'],
  'lung-right': ['The other lung. On a fixed specimen they are collapsed and easy to miss.'],
  'stomach': ['The stomach — a curved bag on the animal\'s left. You only see it once the liver is moved.'],
  'small-intestine': ['Small intestine. The duodenum runs forward in a U off the pylorus, then the ileum coils.',
                      'Tease that mesentery apart rather than cutting it — it carries the blood supply.'],
  'large-intestine': ['The rectum, wider than the ileum, running back to the cloaca.'],
  'cloaca': ['The cloaca — gut, kidneys and gonads all exit here. One opening for everything.'],
  'spleen': ['That small dark bead in the mesentery is the spleen. Easy to lose if you cut carelessly.'],
  'fat-body-left': ['Fat bodies — those yellow finger-like lobes. Energy stores, largest just before hibernation.'],
  'fat-body-right': ['The other fat body. Bright yellow and unmistakable once you have seen one.'],
  'kidney-left': ['Kidney — flat, dark, and stuck to the dorsal wall. Retroperitoneal, so it stays put when you lift the gut.'],
  'kidney-right': ['The right kidney, with the dorsal aorta running between the pair.'],
  'dorsal-aorta': ['The dorsal aorta, running along the roof of the cavity between the kidneys.'],
  'vertebral-column': ['The vertebral column. Frogs have very few vertebrae — nine, plus the urostyle.'],
  'oesophagus': ['The oesophagus, running down into the stomach.'],
  'urinary-bladder': ['The bladder — bilobed, and often collapsed in a preserved specimen.'],

  // ---- heart ----
  'pericardium': ['The fibrous pericardium. Open it as a flap before you touch anything inside.'],
  'epicardial-fat': ['Epicardial fat, filling the grooves. The coronaries run inside it, so trim carefully.'],
  'lv-free-wall': ['The left ventricle. Feel how much thicker that wall is — it drives the whole systemic circuit.',
                   'Left ventricle. Wall thickness is how you tell left from right, not shape.'],
  'rv-free-wall': ['The right ventricle — thin-walled by comparison. It only has to reach the lungs.'],
  'aorta': ['The aorta. Do not name it from the stump — push the seeker in and watch where it comes out.'],
  'pulmonary-trunk': ['The pulmonary trunk, anterior to the aorta and spiralling around it.'],
  'svc': ['Superior vena cava, entering the right atrium from above.'],
  'lad': ['The left anterior descending, in the anterior interventricular groove.'],
  'rca': ['The right coronary artery. Follow it round to the crux — that is how you call dominance.'],
  'circumflex': ['The circumflex, running round in the left atrioventricular groove.'],
  'septum': ['The interventricular septum — complete, and muscular. The probe will not cross it.'],
  'mitral-leaflet': ['The mitral leaflet. It is held shut by the chordae, not by its own stiffness.'],
  'papillary-a': ['A papillary muscle. Pull on it and the leaflet should tense, not evert.'],
};

const NAR_KIND = {
  pin: ['Pinned. Get all four out and the wall comes under tension.'],
  incise: ['Good — one drawn stroke. Do not saw at it.', 'That is your incision. Keep it shallow to start.'],
  peel: ['Reflect it back and look underneath.', 'Good. Now you can see what was beneath it.'],
  retract: ['Opening the wall wider.'],
  lift: ['Lifted clear. Notice what that was covering.'],
  replace: ['Back in the cavity.'],
  damage: ['Careful — that will not recover.', 'That is damage. It stays damaged for the rest of this attempt.'],
};

export function createNarrator() {
  const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
  let voiceOn = false, ambientOn = false;
  let lastSpokenAt = 0, lastLine = '', lastPriority = 0;
  const seen = new Map();          // partId -> how many times narrated (rotates phrasing)
  let voice = null;

  function pickVoice() {
    if (!synth || voice) return voice;
    const vs = synth.getVoices() || [];
    if (!vs.length) return null;
    // Prefer a natural-sounding English voice; avoid the obviously robotic ones.
    const score = (v) => {
      let s = 0;
      if (/^en[-_]/i.test(v.lang)) s += 4;
      if (/GB|UK/i.test(v.lang)) s += 2;
      if (/natural|neural|premium|enhanced|google|siri/i.test(v.name)) s += 5;
      if (/zira|david|espeak|compact/i.test(v.name)) s -= 3;
      if (v.localService) s += 1;
      return s;
    };
    voice = vs.slice().sort((a, b) => score(b) - score(a))[0] || null;
    return voice;
  }
  if (synth && typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', () => { voice = null; pickVoice(); });
  }

  function speak(text, priority) {
    if (!voiceOn || !synth || !text) return;
    const now = performance.now();
    const p = priority || 1;
    // A more important line interrupts; otherwise respect the cooldown.
    if (synth.speaking && p <= lastPriority) return;
    if (!synth.speaking && now - lastSpokenAt < 2400 && p < 3) return;
    if (text === lastLine && p < 3) return;
    try {
      if (synth.speaking && p > lastPriority) synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      if (v) { u.voice = v; u.lang = v.lang; }
      u.rate = 0.96; u.pitch = 1.0; u.volume = 0.9;
      synth.speak(u);
      lastSpokenAt = now; lastLine = text; lastPriority = p;
    } catch (e) { /* speech unavailable; stay silent */ }
  }

  function lineFor(evt) {
    const id = evt.partId;
    if (id && NAR_LINES[id]) {
      const opts = NAR_LINES[id];
      const n = (seen.get(id) || 0);
      seen.set(id, n + 1);
      return opts[n % opts.length];
    }
    const k = NAR_KIND[evt.kind];
    if (k) return k[Math.floor(Math.random() * k.length)];
    return null;
  }

  function observe(evt) {
    if (!voiceOn || !evt) return;
    // Hover is far too chatty to narrate; everything else is a real act.
    if (evt.kind === 'hover') return;
    const p = NAR_PRIORITY[evt.kind] || 0;
    if (!p) return;
    // A layer reveal deserves the engine's own sentence; a structure act deserves
    // the structure's line.
    const line = (evt.kind === 'discover' && !NAR_LINES[evt.partId])
      ? (evt.text || null)
      : lineFor(evt);
    if (line) speak(line, p);
  }

  /* ---- ambience ---------------------------------------------------------- */
  let ac = null, ambNodes = null, beepTimer = 0;

  function startAmbient() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const master = ac.createGain();
    master.gain.value = 0.05;             // barely there, by design
    master.connect(ac.destination);

    // Room tone: filtered noise. A theatre is never silent, and the absence of
    // silence is a surprisingly strong presence cue.
    const len = ac.sampleRate * 2;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ac.createBufferSource();
    noise.buffer = buf; noise.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 380;
    const ng = ac.createGain(); ng.gain.value = 0.35;
    noise.connect(lp); lp.connect(ng); ng.connect(master);
    noise.start();

    // Slow monitor blip.
    beepTimer = setInterval(() => {
      if (!ac || ac.state !== 'running') return;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = 1180;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.09, ac.currentTime + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.13);
      o.connect(g); g.connect(master);
      o.start(); o.stop(ac.currentTime + 0.15);
    }, 1150);

    ambNodes = { noise, master };
  }

  function stopAmbient() {
    if (beepTimer) { clearInterval(beepTimer); beepTimer = 0; }
    if (ambNodes) { try { ambNodes.noise.stop(); } catch (e) {} ambNodes = null; }
    if (ac) { try { ac.close(); } catch (e) {} ac = null; }
  }

  return {
    observe,
    speak: (t) => speak(t, 3),
    setVoice(on) {
      voiceOn = !!on;
      if (!on && synth) { try { synth.cancel(); } catch (e) {} }
      else pickVoice();
    },
    setAmbient(on) {
      ambientOn = !!on;
      if (on) startAmbient(); else stopAmbient();
    },
    get voiceEnabled() { return voiceOn; },
    get ambientEnabled() { return ambientOn; },
    dispose() { stopAmbient(); if (synth) { try { synth.cancel(); } catch (e) {} } },
  };
}
