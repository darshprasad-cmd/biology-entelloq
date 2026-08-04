/*
 * sfx.js — the theatre gets a sound.
 *
 * Every sound in here is synthesised from a single noise buffer and a handful of
 * oscillators. That is not a purity exercise: the app ships as ONE self-contained
 * HTML file, so there is nowhere for a .wav to live. Procedural is the only door,
 * and it turns out to be the better one anyway — a sampled scalpel plays the same
 * 900ms every time, whereas a synthesised one can be driven BY the stroke, which
 * is the whole point.
 *
 * The design brief, in one line: a quiet operating theatre, not a video game.
 * No stingers, no whooshes, no musical cues. Nothing here is allowed to be
 * "satisfying" — a surgeon does not get a chime for cutting correctly. Every gain
 * constant below was pushed down until the sound was noticed only in context, and
 * then left there. If a value looks absurdly small, it is deliberate.
 *
 * THE HERO SOUND is cut(). Filtered noise whose centre frequency, bandwidth and
 * GRAIN RATE all track blade speed. Slow and deliberate: you hear individual
 * fibres letting go, low and grainy. Fast drag: the grains fuse into a bright
 * hiss. Saw at it and a resonant ragged peak comes up under the noise with a dull
 * scrape on every reversal — it sounds WRONG, on purpose, because it is wrong.
 * Skin, fascia, muscle and serous membrane each get their own timbre row; the wet
 * snap of a membrane parting is a different physical event from the drag of a
 * blade through muscle and it is not shading of the same sound.
 *
 * Traps this file is built around, named where they bite:
 *   - AudioContext must not exist before a user gesture. Constructed lazily on the
 *     first setEnabled(true) and resume()d there, exactly like narrator.js.
 *   - A continuous voice whose gain is only lowered by update() screams forever the
 *     moment update() stops being called (backgrounded tab, thrown frame, a caller
 *     who forgets). cut() therefore arms a setTimeout watchdog that mutes the voice
 *     independently of rAF.
 *   - Voice counting via onended LEAKS: a node that is never stop()ed never fires
 *     it and the counter never returns, which silences the whole module
 *     permanently. There is no counter here — a fixed ring of pre-built pool slots
 *     with free-at timestamps makes the cap structural instead of bookkeeping.
 *   - setEnabled(false) suspends, it does NOT close. Browsers cap live
 *     AudioContexts (historically ~6 in Chrome); toggling sound off and on seven
 *     times would otherwise permanently kill audio. Only dispose() closes.
 *
 * Contract:
 *   createSFX() -> { setEnabled(on), enabled, setVolume(v), play(name, opts),
 *                    cut(o), contact(o), setPhaseSource(fn), setBreathing(on),
 *                    update(dtMs), dispose(), debug() }
 */

/* Hard cap on simultaneous one-shots. Twelve is more than a theatre ever needs —
 * blood.js can want a drip per droplet per frame, and a droplet-per-frame is
 * hundreds of oscillators a second and a locked audio thread. Over the cap the
 * sound is simply dropped; a missing drip is invisible, a stalled audio graph is
 * not. */
const SFX_POOL_SIZE = 12;

/* Minimum gap between two shots of the same name, in ms. The rate limiter matters
 * more than the voice cap in practice: it is what stops sixty identical drips in a
 * second turning into a buzz. */
const SFX_MIN_GAP = {
  // snap and snag were both far too permissive. A wet membrane parting is
  // PUNCTUATION, not texture: at a 90ms floor, cutting serous membrane fired one
  // roughly every 170ms — six a second, which is a cobweb of squelches and the
  // single most game-like thing this module did. 220ms floors it at ~4/s, and the
  // probability cut in cut() keeps the realistic rate near 1-2/s. snag likewise:
  // at 120ms a sawing stroke became a rattle rather than an occasional ugly drag.
  contact: 105, drip: 150, snap: 220, snag: 200, tear: 260,
  pin: 70, creak: 340, tray: 180, tick: 60,
};

/* Per-tissue blade timbre. Read this as a physical description, not as EQ:
 *   f0/fk   centre frequency of the drag band at rest, and how hard speed pushes it
 *   q       bandwidth — high Q is a narrow pitched scrape, low Q is broadband hiss
 *   edge    how much crisp blade-edge top end this tissue gives up
 *   body    how much low thick drag sits under it
 *   grain   base rate (Hz) of the fibre-by-fibre granulation at slow speed
 *   depth   how PRONOUNCED that granulation is (fascia crackles, fat does not)
 *   snap    probability weight of a wet membrane snap firing during the stroke
 *   gain    the whole row's level, because tissues are not equally loud
 * The four the brief names are deliberately far apart: skin resists then gives,
 * fascia crackles, muscle is a wet broadband drag, serous is thin and snaps.
 */
const SFX_CUT = {
  skin:       { f0: 760,  fk: 1500, q: 2.2, edge: 0.42, body: 0.30, grain: 34, depth: 0.52, snap: 0.05, gain: 1.00, lp: 5200 },
  fascia:     { f0: 1250, fk: 2600, q: 3.4, edge: 0.66, body: 0.12, grain: 62, depth: 0.78, snap: 0.34, gain: 0.86, lp: 7400 },
  muscle:     { f0: 430,  fk: 900,  q: 1.3, edge: 0.20, body: 0.72, grain: 26, depth: 0.34, snap: 0.03, gain: 1.05, lp: 3200 },
  serous:     { f0: 1650, fk: 3000, q: 4.0, edge: 0.74, body: 0.06, grain: 78, depth: 0.70, snap: 0.62, gain: 0.62, lp: 8600 },
  fat:        { f0: 340,  fk: 620,  q: 1.0, edge: 0.10, body: 0.60, grain: 18, depth: 0.18, snap: 0.02, gain: 0.72, lp: 2000 },
  parenchyma: { f0: 520,  fk: 1050, q: 1.5, edge: 0.24, body: 0.66, grain: 30, depth: 0.30, snap: 0.10, gain: 0.94, lp: 3600 },
  gut:        { f0: 640,  fk: 1200, q: 1.8, edge: 0.28, body: 0.52, grain: 36, depth: 0.44, snap: 0.30, gain: 0.80, lp: 4200 },
  vessel:     { f0: 980,  fk: 1900, q: 3.0, edge: 0.50, body: 0.30, grain: 44, depth: 0.56, snap: 0.24, gain: 0.78, lp: 5600 },
  nerve:      { f0: 1150, fk: 2100, q: 3.2, edge: 0.56, body: 0.14, grain: 58, depth: 0.62, snap: 0.18, gain: 0.60, lp: 6400 },
  // Bone should refuse the blade upstream; if it ever gets here it must sound like
  // a mistake — dry, hard, no wetness at all.
  bone:       { f0: 2100, fk: 2600, q: 6.0, edge: 0.88, body: 0.44, grain: 96, depth: 0.86, snap: 0.00, gain: 0.90, lp: 9000 },
};

/* Ventricular systole is roughly the first third of the cycle, so the second heart
 * sound lands near 0.34 of physio's phase. That single number is what makes the
 * rhythm read as lub-DUB ... pause rather than as two evenly spaced thumps. */
const SFX_S2_PHASE = 0.34;

/* Ceiling on the drag voice's granulation depth. The AM stage runs
 * gain = (1 - depth*0.9) + tri*depth, so the trough sits at 1 - 1.9*depth and the
 * gain crosses zero — inverting phase and sounding like clipping — for any depth
 * above 1/1.9 = 0.526. 0.52 is that limit with a hair of margin. This is a
 * correctness bound, not a taste knob: do not raise it without changing the 0.9. */
const SFX_GRAIN_MAX_DEPTH = 0.52;

/* Matches softbody.js's `lifePhase * 1.5` breathing swell (~0.24 Hz, a 4.2 s
 * cycle). If that constant ever moves, this one moves with it or the lungs will
 * visibly rise while the sound exhales. */
const SFX_BREATH_W = 1.5;

/* NaN-safe on purpose, and it is load-bearing rather than defensive padding.
 * `v < a ? a : v > b ? b : v` returns NaN for NaN — both comparisons are false —
 * so a single bad number from a caller (a grip read off an uninitialised hand
 * tracker, a point with a NaN coordinate) propagates through speedEMA into every
 * setTargetAtTime in applyCut. Real Web Audio THROWS on a non-finite AudioParam
 * value, and applyCut is not inside a try/catch, so one NaN kills the drag voice
 * for the rest of the session. Every clamp in this file goes through here, so
 * hardening this one function hardens the whole module. */
const SFX_clamp = (v, a, b) => (v >= a ? (v > b ? b : v) : a);
const SFX_lerp = (a, b, t) => a + (b - a) * t;

/* Same vocabulary as cutting.js's CUT_inferTissue, deliberately: a wound that
 * renders as fascia must not sound like muscle. Kept as its own copy rather than
 * reaching across module boundaries, because sfx must survive cutting.js being
 * absent from the build. */
function SFX_inferTissue(o) {
  if (o && o.tissue && SFX_CUT[o.tissue]) return o.tissue;
  const id = String((o && o.partId) || '');
  const sys = String((o && o.system) || '');
  const both = id + ' ' + sys;
  if (/skin|integument|derm/i.test(both)) return 'skin';
  if (/fat|adipose/i.test(id)) return 'fat';
  if (/vertebra|skeletal|bone|cartilage|girdle|sternum/i.test(both)) return 'bone';
  if (/nerve|sciatic|ganglion|neural|vagus|spinal/i.test(id)) return 'nerve';
  if (/valve|leaflet|cusp|chordae|tendon|ligament|fascia|linea|aponeur|peritone|mesent|fold|annulus/i.test(id)) return 'fascia';
  if (/aort|arter|vein|venous|vena|cava|svc|ivc|trunk|sinus|portal|carotid|circumflex|coronar|vessel|arch|\blad\b/i.test(id)) return 'vessel';
  if (/stomach|intestin|gut|oesophag|esophag|duoden|ileum|colon|rectum|cloaca|bladder|pylor|caec/i.test(id)) return 'gut';
  if (/lung|pericard|pleur|serosa|serous|omentum|epicard/i.test(both)) return 'serous';
  if (/liver|hepat|kidney|renal|spleen|splen|lobe|pancrea|testis|ovar|gonad|adrenal|fat-body/i.test(id)) return 'parenchyma';
  if (/muscle|wall|ventricle|atrium|auricle|myocard|heart|papillar|septum|conus|muscular/i.test(both)) return 'muscle';
  if (/digestive/i.test(sys)) return 'gut';
  if (/serous/i.test(sys)) return 'serous';
  return 'parenchyma';
}

export function createSFX() {
  let ctx = null;
  let dead = false;              // AudioContext unavailable — every call becomes a no-op
  let enabled = false;
  let volume = 0.7;

  // Buses. One master plus five categories, so a loud drag cannot bury the
  // heartbeat and a run of drips cannot bury the drag. These are the only place
  // relative loudness between families is decided.
  let master = null, busCut = null, busWet = null, busMech = null, busBody = null, busRoom = null;

  let noiseBuf = null;
  let pool = null;               // fixed ring of pre-built shot slots
  let poolAt = 0;
  const lastShot = Object.create(null);   // name -> ctx time of last fire

  // Continuous voices, built once and never rebuilt.
  let cutV = null, breathV = null, roomV = null;

  // ---- stroke state. Plain scalars, never Vector3s: cut() is called every frame
  // of a drag and this file may not allocate on that path.
  let sx = 0, sy = 0, sz = 0, hasLast = false;
  let dirX = 0, dirY = 0, dirZ = 0;
  let strokeLen = 0, strokeT = 0;      // ms clock of last cut() call
  let speedEMA = 0, sawEMA = 0;
  let cutDrive = 0, cutTissue = 'muscle', cutGrip = 0;
  let cutWatch = 0, cutWatchDue = 0, cutModAt = -1, cutLevel = 0;

  /* One-entry memo for tissue inference. SFX_inferTissue concatenates two strings
   * and runs up to eleven regexes; cut() calls it EVERY FRAME of a drag, and a
   * drag stays on one part for its whole length, so the answer is the same every
   * time. Comparing the three inputs by identity is free and allocates nothing,
   * which is the rule this file lives under on the cut path. */
  let tisId, tisSys, tisTis, tisVal = 'muscle';
  function inferTissue(o) {
    if (o.partId === tisId && o.system === tisSys && o.tissue === tisTis) return tisVal;
    tisId = o.partId; tisSys = o.system; tisTis = o.tissue;
    tisVal = SFX_inferTissue(o);
    return tisVal;
  }

  // ---- physiology
  let phaseFn = null, lastPhase = -1, breathing = false, breathPhase = 0;

  let modAt = 0;                 // throttle for parameter writes (see update)

  /* ---- construction ----------------------------------------------------- */

  function ensure() {
    if (ctx || dead) return ctx;
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) { dead = true; return null; }
    try {
      ctx = new AC();
    } catch (e) { dead = true; return null; }

    try {
      master = ctx.createGain(); master.gain.value = 0;   // faded in by setEnabled
      master.connect(ctx.destination);

      const bus = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; };
      busCut = bus(0.85);    // the hero, but still headroom under it
      busWet = bus(0.60);    // contacts, tears, drips
      busMech = bus(0.55);   // pins, creaks, steel
      busBody = bus(0.70);   // heart, breath — the specimen itself
      busRoom = bus(0.50);   // the theatre

      // ONE noise buffer for the whole module. Two seconds is long enough that a
      // looping drag never audibly repeats, and every shot starts at a random
      // offset — a fixed offset makes every pin tick literally the same waveform,
      // which is the exact giveaway that turns a sound into a "sound effect".
      const n = Math.floor(ctx.sampleRate * 2);
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;

      buildPool();
      buildCut();
      buildBreath();
      buildRoom();
    } catch (e) {
      // Half-built graph is worse than none. Fail all the way over to silence.
      dead = true;
      try { ctx.close(); } catch (e2) {}
      ctx = null;
    }
    return ctx;
  }

  /*
   * The pool IS the voice cap. Each slot owns a permanent filter pair and gain,
   * connected once; a shot only creates its source node (BufferSource and
   * Oscillator are single-use by spec — there is no way to restart one, so
   * "reuse nodes" can only ever mean reusing everything downstream of them).
   *
   * `until` is the context time the slot goes quiet. Claiming scans for a slot
   * whose `until` has passed. No counter, no onended callback, therefore no way
   * for the cap to leak and silence the module forever.
   *
   * The source is intentionally NOT disconnected when it ends. A connection keeps
   * the DOWNSTREAM node alive, not the upstream one, so a finished source is
   * collectable on its own; adding an onended closure per shot would allocate for
   * no benefit.
   */
  function buildPool() {
    pool = new Array(SFX_POOL_SIZE);
    for (let i = 0; i < SFX_POOL_SIZE; i++) {
      const f1 = ctx.createBiquadFilter();
      const f2 = ctx.createBiquadFilter();
      const g = ctx.createGain();
      f1.type = 'allpass'; f2.type = 'allpass';
      g.gain.value = 0;
      f1.connect(f2); f2.connect(g);
      pool[i] = { f1, f2, g, until: 0, bus: null };
    }
  }

  function claim(t) {
    for (let i = 0; i < SFX_POOL_SIZE; i++) {
      const s = pool[(poolAt + i) % SFX_POOL_SIZE];
      if (s.until <= t) {
        poolAt = (poolAt + i + 1) % SFX_POOL_SIZE;
        // Wipe whatever the previous shot left scheduled on these params.
        s.f1.frequency.cancelScheduledValues(t);
        s.f2.frequency.cancelScheduledValues(t);
        s.g.gain.cancelScheduledValues(t);
        s.g.gain.setValueAtTime(0, t);
        s.f1.type = 'allpass'; s.f2.type = 'allpass';
        s.f1.Q.value = 1; s.f2.Q.value = 1;
        return s;
      }
    }
    return null;   // at the cap: drop it. Silence beats a stalled audio thread.
  }

  function route(s, b) {
    if (s.bus === b) return;
    try { s.g.disconnect(); } catch (e) {}
    s.g.connect(b);
    s.bus = b;
  }

  /*
   * `dur` is NOT optional for a reason. These sources loop, so a one-shot that
   * only fades its GAIN to zero leaves a looping noise generator running for the
   * lifetime of the page — inaudible, and therefore invisible, while it and its
   * whole filter chain keep burning audio-thread time on every render quantum.
   * A few hundred pins and drips into a session that is a genuinely locked audio
   * thread. Every caller stops its source; the continuous voices pass Infinity
   * explicitly so that intent is written down rather than implied by omission.
   */
  function noise(t, rate, dur) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    if (rate) src.playbackRate.value = rate;
    src.start(t, Math.random() * 1.8);
    if (dur !== Infinity) src.stop(t + dur);
    return src;
  }

  // exponentialRamp to exactly 0 is illegal and silently does nothing, which is
  // how a "one-shot" ends up sustaining forever. Ramp to an epsilon, then pin.
  function down(param, from, t, dur) {
    param.setValueAtTime(from, t);
    param.exponentialRampToValueAtTime(Math.max(1e-4, from * 0.001), t + dur);
    param.linearRampToValueAtTime(0, t + dur + 0.008);
  }

  /* ---- the continuous drag voice ---------------------------------------- */
  /*
   * Four parallel bands off ONE looping noise source:
   *   band  the drag itself, a bandpass whose centre and Q track blade speed
   *   edge  a highpass sliver — the crisp top of the blade edge in tight tissue
   *   body  a lowpass thud — the thick wet drag through muscle and parenchyma
   *   snag  a narrow resonant peak that only comes up when the stroke is SAWING
   * plus an amplitude-modulating oscillator whose rate is the fibre grain rate.
   * At a slow deliberate speed the grain rate is low enough to hear as separate
   * events; drag faster and the same modulation fuses into hiss. That single
   * mechanism is what makes speed audible as texture rather than as volume.
   */
  function buildCut() {
    const src = noise(ctx.currentTime, 1, Infinity);
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 600; band.Q.value = 2;
    const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 4000; tone.Q.value = 0.7;
    const edgeF = ctx.createBiquadFilter(); edgeF.type = 'highpass'; edgeF.frequency.value = 3200; edgeF.Q.value = 0.8;
    const bodyF = ctx.createBiquadFilter(); bodyF.type = 'lowpass'; bodyF.frequency.value = 260; bodyF.Q.value = 1.1;
    // Q was 11. A bandpass that narrow on noise stops being a resonance and starts
    // being an oscillator — a clear pitched whistle that swept with the saw amount
    // and read as a synth effect sitting on top of the drag. Q 6.5 is still an
    // obvious ugly formant, which is the point, without ringing into a tone.
    const snagF = ctx.createBiquadFilter(); snagF.type = 'bandpass'; snagF.frequency.value = 420; snagF.Q.value = 6.5;

    const edgeG = ctx.createGain(); edgeG.gain.value = 0;
    const bodyG = ctx.createGain(); bodyG.gain.value = 0;
    const snagG = ctx.createGain(); snagG.gain.value = 0;

    // AM stage. gain = base + osc * depth, so `am.gain.value` is the floor between
    // grains and `depth` is how deep the notches between fibres go.
    //
    // TRIANGLE, not the sawtooth this was written with. A sawtooth AM source has
    // energy in every harmonic, and modulating broadband noise with it throws
    // sidebands everywhere — audible as a buzz riding the drag rather than as
    // fibres parting. A triangle granulates just as distinctly at the low rates
    // where you are meant to count the grains, without the buzz.
    //
    // The base/depth pair must also satisfy base >= depth or the gain goes
    // NEGATIVE on the trough, which is a phase inversion and sounds like clipping.
    // applyCut() enforces that; see SFX_GRAIN_MAX_DEPTH.
    const am = ctx.createGain(); am.gain.value = 0.6;
    const grain = ctx.createOscillator(); grain.type = 'triangle'; grain.frequency.value = 30;
    const depth = ctx.createGain(); depth.gain.value = 0.35;
    grain.connect(depth); depth.connect(am.gain);
    grain.start();

    const out = ctx.createGain(); out.gain.value = 0;

    src.connect(band); band.connect(tone); tone.connect(am);
    src.connect(edgeF); edgeF.connect(edgeG); edgeG.connect(am);
    src.connect(bodyF); bodyF.connect(bodyG); bodyG.connect(am);
    src.connect(snagF); snagF.connect(snagG); snagG.connect(am);
    am.connect(out); out.connect(busCut);

    cutV = { src, band, tone, edgeF, bodyF, snagF, edgeG, bodyG, snagG, am, grain, depth, out };
  }

  function buildBreath() {
    const src = noise(ctx.currentTime, 0.8, Infinity);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 380; bp.Q.value = 1.1;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(busBody);
    breathV = { src, bp, g };
  }

  /*
   * Room tone. Three layers, all of them beneath conscious notice: air handling
   * (lowpassed noise with a very slow drift so it is not a static wall), the top
   * of the air (a whisper of high band, which is what stops the room sounding
   * like it is under a blanket), and mains hum from the lamp transformer.
   *
   * The brief is exactly right that this should only be noticed when it stops, so
   * it fades in over seconds rather than switching on. A room tone that appears
   * instantly is heard as a sound; one that arrives slowly is heard as a place.
   */
  function buildRoom() {
    const src = noise(ctx.currentTime, 0.5, Infinity);
    const airLP = ctx.createBiquadFilter(); airLP.type = 'lowpass'; airLP.frequency.value = 210; airLP.Q.value = 0.6;
    // 0.11, not the 0.55 this was written at. Every other constant in this file
    // lives between 0.014 and 0.09; 0.55 was ten times its neighbours and made the
    // "unnoticed" air handling into an audible rumble under everything — the room
    // read as a sound, which is precisely the failure buildRoom() sets out to
    // avoid. At 0.11 it is a floor you only register when it stops.
    const airG = ctx.createGain(); airG.gain.value = 0.11;
    src.connect(airLP); airLP.connect(airG); airG.connect(busRoom);

    const topBP = ctx.createBiquadFilter(); topBP.type = 'bandpass'; topBP.frequency.value = 2600; topBP.Q.value = 0.5;
    const topG = ctx.createGain(); topG.gain.value = 0.030;
    src.connect(topBP); topBP.connect(topG); topG.connect(busRoom);

    const hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 50;
    const humG = ctx.createGain(); humG.gain.value = 0.014;
    hum.connect(humG); humG.connect(busRoom); hum.start();

    const hum3 = ctx.createOscillator(); hum3.type = 'sine'; hum3.frequency.value = 150;
    const hum3G = ctx.createGain(); hum3G.gain.value = 0.0045;
    hum3.connect(hum3G); hum3G.connect(busRoom); hum3.start();

    // 0.055 Hz — one slow breath of the building every eighteen seconds.
    // Depth follows airG down. At the old 0.10 against the new base the air would
    // swing 0.01..0.21 — a twentyfold breathing that is heard as a swell, not as a
    // building. 0.025 keeps it 0.085..0.135: drift, not modulation.
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.055;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.025;
    lfo.connect(lfoG); lfoG.connect(airG.gain); lfo.start();

    roomV = { src, hum, hum3, lfo, airG };
  }

  /* ---- one-shots --------------------------------------------------------- */
  /*
   * Everything below is deliberately short. The single most common way a lab like
   * this ends up sounding like a game is one-shots that outstay their event: a
   * 400ms squelch on a 30ms touch. If in doubt these got shorter, not longer.
   */
  const SHOTS = {
    // Probe or forceps meeting wet tissue. Soft, brief, no click on the front —
    // a click reads as plastic, and nothing in this room is plastic.
    contact(t, o) {
      const s = claim(t); if (!s) return;
      route(s, busWet);
      const v = 0.035 + SFX_clamp(o.grip || 0, 0, 1) * 0.055;
      s.f1.type = 'lowpass'; s.f1.Q.value = 1.2;
      s.f1.frequency.setValueAtTime(1500, t);
      s.f1.frequency.exponentialRampToValueAtTime(380, t + 0.07);
      s.f2.type = 'highpass'; s.f2.frequency.value = 120;
      s.g.gain.linearRampToValueAtTime(v, t + 0.005);
      down(s.g.gain, v, t + 0.005, 0.065);
      noise(t, 0.9, 0.10).connect(s.f1);
      s.until = t + 0.10;
    },

    // A membrane letting go. Fibres crackle in sequence, then the sheet parts with
    // a wet snap. Two events, not one — that ordering is the whole character.
    tear(t, o) {
      const s = claim(t); if (!s) return;
      route(s, busWet);
      const v = 0.045 + SFX_clamp(o.strength == null ? 0.5 : o.strength, 0, 1) * 0.055;
      s.f1.type = 'bandpass'; s.f1.Q.value = 2.6;
      s.f1.frequency.setValueAtTime(820, t);
      s.f1.frequency.exponentialRampToValueAtTime(2300, t + 0.16);
      s.f2.type = 'highpass'; s.f2.frequency.value = 300;
      s.g.gain.linearRampToValueAtTime(v * 0.7, t + 0.012);
      s.g.gain.linearRampToValueAtTime(v, t + 0.10);
      down(s.g.gain, v, t + 0.10, 0.10);
      const src = noise(t, 1.05, 0.22);
      src.connect(s.f1);
      // Crackle: chop the noise with a fast irregular AM while it is tearing.
      const chop = ctx.createOscillator(); chop.type = 'square'; chop.frequency.value = 46;
      const cg = ctx.createGain(); cg.gain.value = 0.30;
      chop.connect(cg); cg.connect(s.g.gain); chop.start(t); chop.stop(t + 0.20);
      s.until = t + 0.22;
      // The snap follows the crackle, and it must be a SEPARATE claim made later.
      // Claiming a slot for a future time looks equivalent and is not: a filter's
      // `.type` and `.Q.value` are plain assignments that take effect immediately,
      // so preparing a slot for t+0.17 would reach back and mangle the tail that
      // slot is still playing right now.
      setTimeout(() => {
        if (enabled && ctx && !dead) { try { SHOTS.snap(ctx.currentTime, { strength: 0.8 }); } catch (e) {} }
      }, 170);
    },

    // The wet snap on its own — also fired mid-stroke through serous membrane.
    snap(t, o) {
      const s = claim(t); if (!s) return;
      route(s, busWet);
      const v = 0.030 + SFX_clamp(o.strength == null ? 0.5 : o.strength, 0, 1) * 0.045;
      s.f1.type = 'bandpass'; s.f1.Q.value = 5.5;
      s.f1.frequency.setValueAtTime(2900, t);
      s.f1.frequency.exponentialRampToValueAtTime(1100, t + 0.045);
      s.f2.type = 'highpass'; s.f2.frequency.value = 500;
      s.g.gain.linearRampToValueAtTime(v, t + 0.003);
      down(s.g.gain, v, t + 0.003, 0.042);
      noise(t, 1.2, 0.06).connect(s.f1);
      s.until = t + 0.06;
    },

    // Pin into the board. A short DRY tick — no wetness, no ring. It is the only
    // sound in the room that has nothing to do with tissue, which is why it reads
    // so strongly as "that went into wood".
    pin(t) {
      const s = claim(t); if (!s) return;
      route(s, busMech);
      s.f1.type = 'bandpass'; s.f1.Q.value = 7;
      s.f1.frequency.setValueAtTime(1500, t);
      s.f1.frequency.exponentialRampToValueAtTime(700, t + 0.03);
      s.f2.type = 'highpass'; s.f2.frequency.value = 400;
      s.g.gain.linearRampToValueAtTime(0.085, t + 0.002);
      down(s.g.gain, 0.085, t + 0.002, 0.030);
      noise(t, 1.4, 0.05).connect(s.f1);
      s.until = t + 0.05;
    },

    // Retraction. Stick-slip: the tissue grips, releases, grips again. Slow AM on
    // a narrow resonant band is exactly that, and it is why this reads as tension
    // rather than as a door hinge.
    creak(t, o) {
      const s = claim(t); if (!s) return;
      route(s, busMech);
      const v = 0.028 + SFX_clamp(o.strength == null ? 0.5 : o.strength, 0, 1) * 0.022;
      const dur = 0.5;
      s.f1.type = 'bandpass'; s.f1.Q.value = 9;
      s.f1.frequency.setValueAtTime(300, t);
      s.f1.frequency.linearRampToValueAtTime(470, t + dur);
      s.f2.type = 'lowpass'; s.f2.frequency.value = 1800;
      s.g.gain.linearRampToValueAtTime(v, t + 0.09);
      down(s.g.gain, v, t + 0.09, dur - 0.09);
      const src = noise(t, 0.7, dur + 0.05); src.connect(s.f1);
      const slip = ctx.createOscillator(); slip.type = 'triangle'; slip.frequency.value = 7.5;
      const sg = ctx.createGain(); sg.gain.value = v * 0.55;
      slip.connect(sg); sg.connect(s.g.gain); slip.start(t); slip.stop(t + dur);
      s.until = t + dur + 0.05;
    },

    // A blood droplet reaching the tray. The rising pitch is real physics — the
    // cavity left by the drop closes and its resonance climbs. Kept at the very
    // bottom of the mix because blood.js can want one of these constantly.
    drip(t, o) {
      const s = claim(t); if (!s) return;
      route(s, busWet);
      const v = 0.018 + SFX_clamp(o.size == null ? 0.4 : o.size, 0, 1) * 0.020;
      s.f1.type = 'allpass'; s.f2.type = 'lowpass'; s.f2.frequency.value = 4200;
      const f = 620 + Math.random() * 260;
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 2.4, t + 0.045);
      osc.connect(s.f1); osc.start(t); osc.stop(t + 0.09);
      s.g.gain.linearRampToValueAtTime(v, t + 0.004);
      down(s.g.gain, v, t + 0.004, 0.055);
      s.until = t + 0.09;
    },

    // Instrument set down on the steel tray. Two inharmonic partials with a very
    // fast decay — steel on steel is a TINK, not a bell. Ring it out any longer
    // and the room turns into a kitchen.
    tray(t) {
      const s = claim(t); if (!s) return;
      route(s, busMech);
      s.f1.type = 'highpass'; s.f1.frequency.value = 1400; s.f1.Q.value = 0.7;
      s.f2.type = 'allpass';
      s.g.gain.linearRampToValueAtTime(0.055, t + 0.002);
      down(s.g.gain, 0.055, t + 0.002, 0.045);
      noise(t, 1.6, 0.06).connect(s.f1);
      // Slot is free once ITS envelope is done at t+0.055; the partials below run on
      // their own nodes and do not need the slot held. Holding it to 0.26 wasted a
      // twelfth of the pool for a fifth of a second every time a tool was set down.
      s.until = t + 0.08;
      // Partials get their own ringing bandpasses so they decay independently of
      // the strike transient.
      for (let i = 0; i < 2; i++) {
        // Q 22 decaying over 0.20s is a bell, which is exactly what the comment above
        // forbids — it turned setting an instrument down into a kitchen sound. Q 13
        // and a 0.12s tail keep the two partials as inharmonic colour on the strike
        // rather than as a note that rings after it.
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = i ? 3780 : 2340; bp.Q.value = 13;
        const g = ctx.createGain(); g.gain.value = 0;
        const src = noise(t, 1.2, 0.16);
        src.connect(bp); bp.connect(g); g.connect(busMech);
        const pk = i ? 0.020 : 0.032;
        g.gain.linearRampToValueAtTime(pk, t + 0.004);
        down(g.gain, pk, t + 0.004, i ? 0.08 : 0.12);
      }
    },

    // The dull scrape of a reversal mid-stroke. Not a stinger — deliberately
    // unpleasant and deliberately quiet, the audible equivalent of a ragged edge.
    snag(t, o) {
      const s = claim(t); if (!s) return;
      route(s, busCut);
      const v = 0.020 + SFX_clamp(o.strength == null ? 0.5 : o.strength, 0, 1) * 0.030;
      s.f1.type = 'bandpass'; s.f1.Q.value = 8;
      s.f1.frequency.setValueAtTime(300 + Math.random() * 180, t);
      s.f1.frequency.linearRampToValueAtTime(220, t + 0.07);
      s.f2.type = 'lowpass'; s.f2.frequency.value = 2400;
      s.g.gain.linearRampToValueAtTime(v, t + 0.006);
      down(s.g.gain, v, t + 0.006, 0.065);
      noise(t, 0.85, 0.09).connect(s.f1);
      s.until = t + 0.09;
    },

    // A generic soft tick, for anything the caller wants marked without a voice.
    tick(t) {
      const s = claim(t); if (!s) return;
      route(s, busMech);
      s.f1.type = 'bandpass'; s.f1.Q.value = 4;
      s.f1.frequency.value = 900;
      s.g.gain.linearRampToValueAtTime(0.030, t + 0.002);
      down(s.g.gain, 0.030, t + 0.002, 0.024);
      noise(t, 1.1, 0.04).connect(s.f1);
      s.until = t + 0.04;
    },
  };

  /*
   * Heart sounds. A single thump is the classic tell that nobody checked: a real
   * heart is lub-DUB, and the two halves are not the same event. S1 (mitral and
   * tricuspid shutting) is LOWER and LONGER; S2 (aortic and pulmonary) is higher,
   * sharper and shorter. The gap between them is systole (~a third of the cycle);
   * the gap from S2 back to the next S1 is diastole and is roughly twice as long.
   * Get those two intervals wrong and it sounds like a drum machine.
   *
   * Built from lowpassed noise plus a sine body, not a pure tone: a pure tone is a
   * musical cue, and this room has no music in it.
   */
  function heartSound(t, first, amp) {
    const s = claim(t); if (!s) return;
    route(s, busBody);
    const dur = first ? 0.135 : 0.080;
    const f0 = first ? 96 : 158;
    const v = amp * (first ? 0.115 : 0.075);
    s.f1.type = 'lowpass'; s.f1.Q.value = 1.6;
    s.f1.frequency.setValueAtTime(f0, t);
    s.f1.frequency.exponentialRampToValueAtTime(f0 * 0.62, t + dur);
    s.f2.type = 'highpass'; s.f2.frequency.value = 26;
    s.g.gain.linearRampToValueAtTime(v, t + (first ? 0.016 : 0.009));
    down(s.g.gain, v, t + (first ? 0.016 : 0.009), dur);
    noise(t, 0.6, dur + 0.05).connect(s.f1);

    // The body of the thump. Detuned slightly per beat so consecutive cycles are
    // not bit-identical — a perfectly repeating heartbeat reads as a loop.
    const osc = ctx.createOscillator(); osc.type = 'sine';
    const fb = (first ? 42 : 62) * (0.97 + Math.random() * 0.06);
    osc.frequency.setValueAtTime(fb, t);
    osc.frequency.exponentialRampToValueAtTime(fb * 0.78, t + dur);
    const og = ctx.createGain(); og.gain.value = 0;
    osc.connect(og); og.connect(busBody);
    const ov = amp * (first ? 0.075 : 0.040);
    og.gain.linearRampToValueAtTime(ov, t + 0.010);
    down(og.gain, ov, t + 0.010, dur * 0.9);
    osc.start(t); osc.stop(t + dur + 0.05);
    s.until = t + dur + 0.05;
  }

  /* ---- public ------------------------------------------------------------ */

  function play(name, opts) {
    if (!enabled || !ctx || dead) return;
    const fn = SHOTS[name];
    if (!fn) return;
    const t = ctx.currentTime;
    const gap = SFX_MIN_GAP[name];
    if (gap && lastShot[name] != null && (t - lastShot[name]) * 1000 < gap) return;
    lastShot[name] = t;
    try { fn(t, opts || {}); } catch (e) { /* one bad shot must not kill the module */ }
  }

  function contact(o) {
    play('contact', o || {});
  }

  /*
   * THE HERO. Called every frame of a scalpel drag; must be cheap and must not
   * allocate. Speed is derived here rather than demanded from the caller so main.js
   * stays three lines — but an explicit `speed` in opts always wins, per contract.
   *
   * Sawing is detected as DIRECTION REVERSAL, not as speed variance: a student who
   * speeds up and slows down through a single clean stroke is not sawing, and
   * punishing them for it would be a lie. Reversals decay over ~700ms, so one
   * correction is free and a rhythm of them is not.
   */
  function cut(o) {
    if (!enabled || !ctx || dead || !cutV) return;
    const opt = o || {};
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const gapMs = strokeT ? now - strokeT : 0;

    // A gap means a new stroke: forget the old direction and length rather than
    // measuring a phantom jump across the specimen as one enormous fast slice.
    if (!strokeT || gapMs > 220) { hasLast = false; strokeLen = 0; sawEMA = 0; speedEMA = 0; }
    strokeT = now;

    let sp = opt.speed;
    const p = opt.point;
    if (sp == null && p && hasLast) {
      const dx = p.x - sx, dy = p.y - sy, dz = p.z - sz;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const dt = Math.max(4, gapMs);
      // 0.006 world-units/ms is a brisk but controlled draw; normalise to that so
      // the mapping is readable rather than a magic curve.
      sp = SFX_clamp(d / dt / 0.006, 0, 1.6);
      // `d > 1e-4` is false for NaN, so a NaN coordinate skipped the direction work
      // but still reached this accumulator — and strokeLen, unlike sp, is not
      // re-derived each frame, so it stayed NaN for the rest of the stroke and
      // reported NaN out of debug() forever after.
      if (d > 1e-4) {
        strokeLen += d;
        const ix = dx / d, iy = dy / d, iz = dz / d;
        const dot = ix * dirX + iy * dirY + iz * dirZ;
        if (dot < -0.25 && sp > 0.18) {
          sawEMA = Math.min(1, sawEMA + 0.42);
          play('snag', { strength: sawEMA });
        }
        dirX = ix; dirY = iy; dirZ = iz;
      }
    } else if (sp == null) sp = 0;

    // The derived branch clamps; the caller-supplied branch did not, so an explicit
    // `speed` went straight into speedEMA unchecked. That reaches tone.frequency as
    // row.lp * (0.55 + sp*0.5) with no ceiling — speed 50 asks for 81kHz, past
    // Nyquist — and a NaN reaches every AudioParam in applyCut. Same ceiling as the
    // derived path so both mean the same thing.
    sp = SFX_clamp(sp, 0, 1.6);

    // Only remember a FINITE point. Storing a NaN coordinate makes every subsequent
    // delta NaN too (valid - NaN === NaN), so one bad frame out of the hand tracker
    // would mute the drag until the user lifted off and started a new stroke. The
    // three self-comparisons are the standard non-allocating NaN test.
    if (p && p.x === p.x && p.y === p.y && p.z === p.z) {
      sx = p.x; sy = p.y; sz = p.z; hasLast = true;
    }
    if (opt.length != null) strokeLen = SFX_clamp(opt.length, 0, 1e4);

    // Fast attack, slow release: the blade brightens the instant it moves and
    // settles back over a beat, which is how the real sound behaves.
    speedEMA = sp > speedEMA ? SFX_lerp(speedEMA, sp, 0.55) : SFX_lerp(speedEMA, sp, 0.16);
    sawEMA *= Math.exp(-Math.max(1, gapMs) / 700);

    cutTissue = inferTissue(opt);
    cutGrip = SFX_clamp(opt.grip == null ? 0.5 : opt.grip, 0, 1);
    cutDrive = 1;

    const row = SFX_CUT[cutTissue] || SFX_CUT.muscle;
    // Wet membrane snaps DURING the stroke — the sound of individual serosa
    // letting go ahead of the blade. Rate-limited by play(), so this cannot
    // machine-gun even at 120fps.
    //
    // The multiplier was 0.16, which is a per-FRAME probability: through serous
    // membrane (snap 0.62) at speed that is ~0.1 per frame, or roughly six wet
    // snaps a second once the 90ms floor let them through. Six a second is not a
    // membrane parting, it is bubble wrap. 0.055 against the 220ms floor puts the
    // realistic rate at one or two a second on serous and near-none on muscle,
    // which is what the event actually is: occasional, and startling because it
    // is occasional.
    if (Math.random() < row.snap * SFX_clamp(speedEMA, 0.1, 1) * 0.055) {
      play('snap', { strength: 0.35 + speedEMA * 0.4 });
    }

    applyCut(ctx.currentTime, row);

    /*
     * WATCHDOG, and it is the reason this module cannot ever get stuck screaming.
     * The drag gain is only brought down by update(), and update() is driven by
     * rAF — which delivers zero frames in a backgrounded tab. Without this, tabbing
     * away mid-incision leaves a noise voice running at full drive indefinitely.
     * setTimeout still fires (throttled) when hidden, so it is the correct clock
     * for a safety net that must not depend on rendering.
     *
     * Armed as a DEADLINE that a running timer re-checks, not as a timer torn down
     * and rebuilt every frame. The obvious clearTimeout/setTimeout pair costs a
     * fresh closure plus two timer-queue operations on every single frame of a
     * drag — measured at 180 set and 179 cleared across a three-second stroke, on
     * the one path in this file that is not allowed to allocate. One timer per
     * stroke does the identical job.
     */
    cutWatchDue = now + 170;
    if (!cutWatch) cutWatch = setTimeout(cutWatchdog, 170);
  }

  function cutWatchdog() {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const left = cutWatchDue - now;
    // Stroke is still going: re-arm for whatever is left rather than muting it.
    if (left > 8) { cutWatch = setTimeout(cutWatchdog, left); return; }
    cutWatch = 0; cutWatchDue = 0; cutDrive = 0;
    // cutLevel is what debug() reports and it is the ONLY way a test can assert
    // this module went quiet. Muting the param without clearing it leaves the
    // probe insisting the drag is still running at its last level forever.
    cutLevel = 0;
    if (cutV && ctx) { try { cutV.out.gain.setTargetAtTime(0, ctx.currentTime, 0.05); } catch (e) {} }
  }

  // Writes the drag voice's parameters. Split out because both cut() and update()
  // need it, and because it is the one place tissue and speed become sound.
  //
  // The TIMBRE writes are throttled to ~30Hz. cut() runs every frame of a drag, and
  // ten setTargetAtTime calls at 120fps is twelve hundred automation events a
  // second appended to the graph's timeline for changes no ear can follow. The
  // LEVEL write is deliberately outside the throttle: it is the one parameter that
  // must be exact, because the last call of a decay is what actually reaches zero
  // and a throttled-away final write leaves the drag quietly running forever.
  function applyCut(t, row) {
    const v = cutV;
    const sp = speedEMA, saw = sawEMA;
    const tc = 0.035;    // smoothing constant — anything faster zippers audibly

    if (t - cutModAt < 0.033) { applyCutLevel(t, row); return; }
    cutModAt = t;

    // Centre frequency climbs with speed: a fast drag is a bright hiss, a slow one
    // is a low grinding draw.
    v.band.frequency.setTargetAtTime(row.f0 + (row.fk - row.f0) * SFX_clamp(sp, 0, 1.2), t, tc);
    // Bandwidth OPENS with speed. Slow strokes are narrow and pitched (you hear the
    // tissue), fast strokes are broadband (you hear the blade).
    v.band.Q.setTargetAtTime(Math.max(0.6, row.q / (1 + sp * 1.6)), t, tc);
    v.tone.frequency.setTargetAtTime(row.lp * (0.55 + sp * 0.5), t, tc);

    v.edgeG.gain.setTargetAtTime(row.edge * SFX_clamp(sp * 0.9, 0, 1) * 0.9, t, tc);
    v.bodyG.gain.setTargetAtTime(row.body * (0.35 + cutGrip * 0.65), t, tc);
    // 0.55 put the sawing formant level with the drag itself. Sawing should make
    // the stroke sound WRONG, not make it sound loud; 0.24 is audible as a ragged
    // undertone and stays underneath the tissue.
    v.snagG.gain.setTargetAtTime(saw * 0.24, t, tc);
    v.snagF.frequency.setTargetAtTime(360 + saw * 140, t, tc);

    // Grain: the rate at which fibres part. Low and countable when slow, fused into
    // hiss when fast. Saw jitters it, so a sawing stroke also loses its regularity.
    //
    // Ceiling was 900Hz with a 5.2 speed coefficient, which is not granulation at
    // all — above roughly 250Hz the modulator is in the audio band and you are
    // hearing RING MODULATION, a pitched metallic tone sliding with blade speed.
    // That is the most synthetic sound this file could make. Grains fuse into hiss
    // by ~50Hz, so 260 is already well past the point where the mechanism has done
    // its whole job, and everything above it was artefact.
    const gr = row.grain * (0.7 + sp * 3.0) * (1 + saw * 0.5 * (Math.random() - 0.5));
    v.grain.frequency.setTargetAtTime(SFX_clamp(gr, 8, 260), t, 0.02);
    // Clamped to SFX_GRAIN_MAX_DEPTH so that base (1 - dep*0.9) stays >= dep and
    // the modulated gain never crosses zero. The old 0.85 ceiling put the trough at
    // -0.615: an inverted, clipping buzz on exactly the slow deliberate strokes the
    // granulation exists to serve.
    const dep = SFX_clamp(row.depth * (1 - SFX_clamp(sp, 0, 1) * 0.62) * (1 + saw * 0.4),
                          0, SFX_GRAIN_MAX_DEPTH);
    v.depth.gain.setTargetAtTime(dep, t, tc);
    v.am.gain.setTargetAtTime(1 - dep * 0.9, t, tc);

    applyCutLevel(t, row);
  }

  // Grip presses the blade in; speed adds a little; a long committed stroke adds a
  // touch of body. The 0.16 ceiling is the loudest thing this module ever produces
  // and it is still a quiet sound.
  function applyCutLevel(t, row) {
    const lvl = row.gain * (0.20 + cutGrip * 0.45 + SFX_clamp(speedEMA, 0, 1) * 0.40)
              * (1 + SFX_clamp(strokeLen / 4, 0, 1) * 0.12) * cutDrive * 0.16;
    cutLevel = lvl;
    cutV.out.gain.setTargetAtTime(lvl, t, 0.02);
  }

  function setPhaseSource(fn) { phaseFn = typeof fn === 'function' ? fn : null; }

  function setBreathing(on) {
    breathing = !!on;
    if (!ctx || !breathV) return;
    if (!on) { try { breathV.g.gain.setTargetAtTime(0, ctx.currentTime, 0.35); } catch (e) {} }
  }

  /*
   * Per-frame. Does no allocation and writes parameters at ~30Hz rather than every
   * frame — an AudioParam assignment per frame per node is both wasteful and a
   * source of zipper noise, and nothing here moves fast enough to need 120Hz.
   * dt is MILLISECONDS, matching main.js's tick().
   */
  function update(dtMs) {
    if (!enabled || !ctx || dead) return;
    const dt = Math.min(0.1, (dtMs || 16) / 1000);
    const t = ctx.currentTime;

    // ---- the drag decays on its own when nothing is cutting ----------------
    if (cutDrive > 0) {
      const stale = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - strokeT;
      if (stale > 90) {
        cutDrive = Math.max(0, cutDrive - dt * 7);
        speedEMA = SFX_lerp(speedEMA, 0, Math.min(1, dt * 6));
        applyCut(t, SFX_CUT[cutTissue] || SFX_CUT.muscle);
      }
    }

    // ---- heartbeat ---------------------------------------------------------
    // Driven from physio's phase, never from a timer of our own. That is the
    // whole reason the thump and the visible squeeze cannot drift apart: they are
    // reading the same clock, so there is nothing to synchronise.
    if (phaseFn) {
      let ph = -1;
      try { ph = phaseFn(); } catch (e) { ph = -1; }
      if (typeof ph === 'number' && ph >= 0 && ph <= 1) {
        if (lastPhase >= 0) {
          // A wrap (phase fell sharply) is the onset of ventricular systole = S1.
          if (ph < lastPhase - 0.35) heartSound(t, true, 1);
          else if (lastPhase < SFX_S2_PHASE && ph >= SFX_S2_PHASE) heartSound(t, false, 1);
        }
        lastPhase = ph;
      } else lastPhase = -1;
    }

    // ---- breathing ---------------------------------------------------------
    if (breathing && breathV) {
      breathPhase += dt * SFX_BREATH_W;
      if (breathPhase > Math.PI * 2) breathPhase -= Math.PI * 2;
      if (t - modAt > 0.033) {
        modAt = t;
        // Asymmetric on purpose: inhalation is the shorter, brighter, effortful
        // half; exhalation is longer, lower and almost silent. A symmetric sine
        // swell is the giveaway that a "breath" is really an LFO.
        const s = Math.sin(breathPhase);
        const inhale = s > 0;
        const a = Math.abs(s);
        const lvl = inhale ? a * 0.075 : a * 0.038;
        breathV.g.gain.setTargetAtTime(lvl, t, 0.09);
        breathV.bp.frequency.setTargetAtTime(inhale ? 320 + a * 300 : 240 + a * 150, t, 0.12);
      }
    }
  }

  function setEnabled(on) {
    const want = !!on;
    if (want === enabled) return;
    enabled = want;
    if (!want) {
      if (!ctx) return;
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.22);
      } catch (e) {}
      if (cutWatch) { clearTimeout(cutWatch); cutWatch = 0; }
      cutWatchDue = 0;
      cutDrive = 0; cutLevel = 0; lastPhase = -1;
      // Suspend, never close — see the header. Delayed so the fade is heard.
      setTimeout(() => { if (ctx && !enabled) { try { ctx.suspend(); } catch (e) {} } }, 420);
      return;
    }
    // FIRST GESTURE. Everything is built here, inside the click that asked for it,
    // because a context constructed any earlier is born suspended and a context
    // resumed outside a gesture stays suspended with no error to tell you why.
    if (!ensure()) { enabled = false; return; }
    try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      // 2.2s. The room arrives rather than switching on; see buildRoom().
      master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 2.2);
    } catch (e) {}
  }

  function setVolume(v) {
    volume = SFX_clamp(typeof v === 'number' ? v : 0.7, 0, 1);
    if (ctx && enabled) {
      try { master.gain.setTargetAtTime(volume, ctx.currentTime, 0.08); } catch (e) {}
    }
  }

  function dispose() {
    enabled = false;
    if (cutWatch) { clearTimeout(cutWatch); cutWatch = 0; }
    cutWatchDue = 0;
    if (ctx) {
      // Stop every long-lived source explicitly. close() alone is enough in a
      // compliant engine, but an un-stopped looping source has historically kept
      // an audio thread alive after close() on some builds, and a stuck loop is
      // the single worst failure this module could have.
      const stop = (n) => { if (n) { try { n.stop(); } catch (e) {} } };
      if (cutV) { stop(cutV.src); stop(cutV.grain); }
      if (breathV) stop(breathV.src);
      if (roomV) { stop(roomV.src); stop(roomV.hum); stop(roomV.hum3); stop(roomV.lfo); }
      try { master && master.disconnect(); } catch (e) {}
      try { ctx.close(); } catch (e) {}
    }
    // `dead` is what makes dispose() final. Without it ctx is merely null, so the
    // next setEnabled(true) calls ensure() and happily constructs a SECOND
    // AudioContext — verified: a dispose/enable cycle built one every time, and
    // browsers cap live contexts at around six. A disposed module must stay dead.
    dead = true;
    cutDrive = 0; cutLevel = 0; speedEMA = 0; sawEMA = 0; lastPhase = -1;
    ctx = null; master = null; pool = null;
    busCut = busWet = busMech = busBody = busRoom = null;
    noiseBuf = null;
    cutV = breathV = roomV = null;
    phaseFn = null;
  }

  return {
    setEnabled,
    get enabled() { return enabled; },
    setVolume,
    play,
    cut,
    contact,
    setPhaseSource,
    setBreathing,
    update,
    dispose,
    // Introspection for scripted verification — there is no other way to assert on
    // sound. Reports what the drag voice is actually doing right now.
    debug: () => ({
      ok: !dead, ctx: ctx ? ctx.state : null, enabled,
      tissue: cutTissue, speed: +speedEMA.toFixed(3), saw: +sawEMA.toFixed(3),
      drive: +cutDrive.toFixed(3), level: +cutLevel.toFixed(4), length: +strokeLen.toFixed(2),
      voices: pool ? pool.filter((s) => ctx && s.until > ctx.currentTime).length : 0,
      breathing, phase: lastPhase,
    }),
  };
}
