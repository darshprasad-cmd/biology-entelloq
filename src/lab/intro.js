/*
 * intro.js — the cold open.
 *
 * No splash. No spinner. No "click to begin". The page opens on black and
 * silence; a faint heartbeat starts; dust drifts through the dark; the surgical
 * theatre rises out of nothing around a specimen that is ALREADY on the table;
 * a voice says "Welcome back"; and only then does the instrument chrome appear.
 * The software is meant to feel alive before the first interaction.
 *
 * How it is staged:
 *   - The 3D scene renders the whole time, but the renderer's exposure is driven
 *     from near-zero up to full, so the theatre literally fades up out of the dark
 *     with real light and real shadows — not a video, the actual scene.
 *   - A full-screen veil (this module's only DOM) sits on top: opaque black at
 *     first, carrying the drifting particles and the welcome line, then fading to
 *     clear to hand the frame over to the live scene.
 *   - The instrument chrome is held hidden (body.intro) until the very end, so the
 *     world materialises with nothing on top of it, exactly as specified.
 *
 * It is skippable (click or any key), and if anything it needs is missing it
 * degrades to an instant reveal rather than trapping the user behind black.
 *
 * Contract:
 *   createColdOpen(THREE, ctx, hooks) ->
 *     { start(), update(dtMs), skip(), running, done }
 *   ctx   = { renderer, scene, camera, controls }
 *   hooks = { reveal(), speak(text), onDone() }
 */

export function createColdOpen(THREE, ctx, hooks) {
  ctx = ctx || {};
  hooks = hooks || {};
  const renderer = ctx.renderer;
  const camera = ctx.camera;
  const controls = ctx.controls;
  // These hooks run INSIDE the render loop (reveal/speak from update, onDone from
  // finish). A hook that throws would propagate out of update() and take down the
  // whole setAnimationLoop, so every call is isolated — a bad hook degrades to a
  // no-op, it never kills the frame.
  const _speak = typeof hooks.speak === 'function' ? hooks.speak : null;
  const _reveal = typeof hooks.reveal === 'function' ? hooks.reveal : null;
  const _onDone = typeof hooks.onDone === 'function' ? hooks.onDone : null;
  const speak = function (text) { if (_speak) { try { _speak(text); } catch (e) {} } };
  const reveal = function () { if (_reveal) { try { _reveal(); } catch (e) {} } };
  const onDone = function () { if (_onDone) { try { _onDone(); } catch (e) {} } };

  // ---- beat sheet, milliseconds from start() -----------------------------
  // Kept as one table so the timing reads like a director's cut and can be
  // retuned without hunting through the update loop.
  const T = {
    heart: 450,        // the first heartbeat, out of silence
    riseStart: 650,    // the lights begin to come up
    riseEnd: 3500,     // full theatre light reached
    welcomeIn: 2400,   // "Welcome back" begins to fade in
    welcomeOut: 3950,  // and begins to fade out
    chrome: 3700,      // the instrument chrome is allowed to appear
    end: 4700,         // done — hand control to the app
  };

  const EXPO_FULL = (renderer && renderer.toneMappingExposure) || 1.15;
  const EXPO_DARK = 0.02;

  // Vestibular safety. The cold open is a camera dolly over drifting particles —
  // precisely the kind of motion WCAG 2.3.3 and prefers-reduced-motion exist to
  // spare. When it is set we keep the MOOD (a gentle rise out of black into the lit
  // theatre, and the welcome) but drop the two moving parts: no camera sweep, no
  // drifting dust, and a shorter, calmer curve. It is a fade, not a ride.
  const REDUCED =
    !!(typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (REDUCED) {
    T.heart = 300; T.riseStart = 350; T.riseEnd = 2100;
    T.welcomeIn = 1200; T.welcomeOut = 2500; T.chrome = 2200; T.end = 3000;
  } else if (introSeenBefore()) {
    // Repeat visit. The full cold open is worth ~5 seconds the FIRST time you meet
    // the lab; on the tenth reload it is a wait. Returning students get the same
    // beats compressed to ~2.8s — the theatre still rises and greets them, briskly.
    T.heart = 220; T.riseStart = 300; T.riseEnd = 1900;
    T.welcomeIn = 1050; T.welcomeOut = 2250; T.chrome = 1950; T.end = 2800;
  }

  // Remembers, across sessions, that the cold open has played once. Wrapped
  // because localStorage throws in private mode / when storage is blocked, and a
  // greeting must never be the thing that fails to load the app.
  function introSeenBefore() {
    try { return !!window.localStorage.getItem('bioq_intro_seen'); } catch (e) { return false; }
  }
  function markIntroSeen() {
    try { window.localStorage.setItem('bioq_intro_seen', '1'); } catch (e) { /* fine */ }
  }

  // ---- DOM: one veil, one particle canvas, one line ----------------------
  const veil = document.createElement('div');
  veil.id = 'coldopen';
  const cvs = document.createElement('canvas');
  cvs.className = 'co-cv';
  const line = document.createElement('div');
  line.className = 'co-line';
  // "Welcome back" is the vision's line and the right one for a returning student —
  // but telling a genuine first-timer they are "back" is a small lie the moment
  // undercuts. The seen-flag (set on the first play) tells the two apart.
  const GREETING = introSeenBefore() ? 'Welcome back' : 'Welcome';
  line.innerHTML = '<span>' + GREETING + '</span>';
  veil.appendChild(cvs);
  veil.appendChild(line);

  // Self-contained styles — the module owns its look and cleans it up on finish,
  // so it never leaves anything in the shell's CSS.
  const style = document.createElement('style');
  style.textContent = `
    #coldopen{position:fixed;inset:0;z-index:120;overflow:hidden;background:#04070a;
      pointer-events:auto;cursor:default}
    #coldopen .co-cv{position:absolute;inset:0;width:100%;height:100%;display:block}
    #coldopen .co-line{position:absolute;left:0;right:0;top:53%;text-align:center;
      opacity:0;transition:opacity 1.1s ease;pointer-events:none;
      font-family:"Inter",-apple-system,"Segoe UI",sans-serif}
    #coldopen .co-line span{display:inline-block;color:#e6f0f2;font-weight:300;
      font-size:clamp(22px,3.4vw,40px);letter-spacing:.12em;
      text-shadow:0 0 34px rgba(52,211,153,.28),0 0 90px rgba(4,7,10,.9)}
    #coldopen.co-line-on .co-line{opacity:1}
    /* Hold the instrument chrome out of the frame while the world materialises.
       Only body's direct children are chrome; #stage (the scene) and #coldopen
       are exempt so the theatre and the veil stay visible. */
    body.intro > *:not(#stage):not(#coldopen){opacity:0!important}
    /* A one-second grace after the veil lifts so the chrome eases in instead of
       snapping to whatever opacity it defaults to. */
    body.intro-out > *:not(#stage):not(#coldopen){transition:opacity .9s ease}
  `;

  const ctx2d = cvs.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cvs.clientWidth || window.innerWidth;
    H = cvs.clientHeight || window.innerHeight;
    cvs.width = Math.round(W * dpr);
    cvs.height = Math.round(H * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Drifting dust. Deterministic layout (no Math.random at module load — it is
  // banned in this codebase and, more to the point, a fixed field is calmer than
  // a re-scattered one). Each mote has a slow vertical drift and a gentle sway.
  const MOTES = 90;
  const motes = [];
  for (let i = 0; i < MOTES; i++) {
    // A cheap hash spreads them without RNG.
    const a = (i * 2654435761) >>> 0;
    motes.push({
      x: (a & 1023) / 1023,
      y: ((a >>> 10) & 1023) / 1023,
      r: 0.4 + ((a >>> 20) & 7) / 7 * 1.7,     // px radius
      sp: 0.004 + ((a >>> 23) & 15) / 15 * 0.012, // drift speed (screen-frac/s)
      sw: ((a >>> 27) & 15) / 15 * 2 * Math.PI,   // sway phase
      sa: 6 + ((a >>> 5) & 15),                   // sway amplitude px
    });
  }

  // ---- camera keyframes ---------------------------------------------------
  const camFrom = new THREE.Vector3();
  const camTo = new THREE.Vector3();
  const tgtTo = new THREE.Vector3();
  const _pos = new THREE.Vector3();
  const _tgt = new THREE.Vector3();
  // Hoisted so start() allocates nothing; the wide-framing offset is a constant.
  const CAM_OFFSET = new THREE.Vector3(-6.5, 8.5, 0.5);

  let t = 0;
  let running = false;
  let done = false;
  let welcomeShown = false;
  let welcomeHidden = false;
  let spoke = false;
  let chromeRevealed = false;
  let heartTicked = false;

  // ---- audio: a faint, isolated heartbeat --------------------------------
  // Its own tiny WebAudio graph, not physio's — physio is not running yet and the
  // intro wants a slow, lonely beat, not a vital sign. Browsers block audio until
  // a gesture, so this may stay silent on load; the first interaction (often the
  // skip click) resumes it. Either way the visual cold open plays.
  let actx = null;
  function heartbeat() {
    try {
      if (!actx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        actx = new AC();
      }
      if (actx.state === 'suspended') actx.resume().catch(function () {});
      const now = actx.currentTime;
      // Lub-dub: two low thumps, the second softer and a touch higher, then a long
      // rest — the shape of a resting heart, not a metronome.
      thump(now, 46, 0.11);
      thump(now + 0.16, 60, 0.07);
    } catch (e) { /* audio is a nicety here, never a dependency */ }
  }
  function thump(at, freq, gain) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.7, at);
    o.frequency.exponentialRampToValueAtTime(freq, at + 0.06);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
    o.connect(g); g.connect(actx.destination);
    o.start(at); o.stop(at + 0.4);
  }

  // ---- easing -------------------------------------------------------------
  function smoother(a, b, x) {
    if (x <= a) return 0;
    if (x >= b) return 1;
    const u = (x - a) / (b - a);
    return u * u * u * (u * (u * 6 - 15) + 10); // smootherstep
  }

  function onSkipEvt() { skip(); }

  function start() {
    if (running || done) return;
    // Where loadSpecimen just parked the camera IS our destination; we begin
    // higher, further and swung to one side, then settle to it. If there is no
    // camera we still play the light/veil/welcome — just no dolly — so a missing
    // camera degrades to a lit fade-up rather than trapping the user behind black.
    if (camera) {
      camTo.copy(camera.position);
      if (controls && controls.target) tgtTo.copy(controls.target); else tgtTo.set(0, 0, 0);
      // Under reduced motion the camera does not move — camFrom IS the destination,
      // so the lerp is a no-op and only the light rises.
      if (REDUCED) camFrom.copy(camTo);
      else camFrom.copy(camTo).multiplyScalar(1.42).add(CAM_OFFSET);
    } else {
      tgtTo.set(0, 0, 0);
    }

    markIntroSeen();   // next launch gets the brisk cadence
    document.body.classList.add('intro');
    document.head.appendChild(style);
    document.body.appendChild(veil);
    size();
    window.addEventListener('resize', size);
    veil.addEventListener('pointerdown', onSkipEvt);
    window.addEventListener('keydown', onSkipEvt, { once: false });

    if (controls) controls.enabled = false;
    if (renderer) renderer.toneMappingExposure = EXPO_DARK;
    // Freeze the camera at the wide framing for frame one.
    if (camera) {
      camera.position.copy(camFrom);
      camera.lookAt(tgtTo);
    }

    t = 0;
    running = true;
  }

  function update(dtMs) {
    if (!running || done) return;
    t += dtMs;

    // 1) light rises — the real scene exposure, so shadows and speculars build up.
    const rise = smoother(T.riseStart, T.riseEnd, t);
    if (renderer) renderer.toneMappingExposure = EXPO_DARK + (EXPO_FULL - EXPO_DARK) * rise;

    // 2) camera settles from the wide framing to the working framing. Skipped
    //    wholesale when there is no camera (degraded mode) — no per-frame throw.
    if (camera) {
      _pos.copy(camFrom).lerp(camTo, rise);
      _tgt.set(0, 0, 0).lerp(tgtTo, rise);
      camera.position.copy(_pos);
      camera.lookAt(_tgt);
    }

    // 3) the first heartbeat, once, out of the silence.
    if (!heartTicked && t >= T.heart) { heartTicked = true; heartbeat(); }
    // and a slow ~1s cadence thereafter, only while the veil still holds the dark.
    if (heartTicked && t < T.riseEnd && Math.floor(t / 1000) !== Math.floor((t - dtMs) / 1000)) {
      heartbeat();
    }

    // 4) the welcome line.
    if (!welcomeShown && t >= T.welcomeIn) {
      welcomeShown = true;
      veil.classList.add('co-line-on');
    }
    if (!spoke && t >= T.welcomeIn + 120) { spoke = true; speak(GREETING + '.'); }
    if (!welcomeHidden && t >= T.welcomeOut) {
      welcomeHidden = true;
      veil.classList.remove('co-line-on');
    }

    // 5) let the instrument chrome ease in, under the now-clearing veil.
    if (!chromeRevealed && t >= T.chrome) {
      chromeRevealed = true;
      document.body.classList.add('intro-out');
      document.body.classList.remove('intro');
      reveal();
    }

    // 6) paint the veil: a fading black wash, a soft central glow that grows like
    //    a lamp warming up, and the drifting dust.
    paint(rise);

    if (t >= T.end) finish();
  }

  function paint(rise) {
    if (!W || !H) size();
    ctx2d.clearRect(0, 0, W, H);

    // Black wash: fully opaque through the silence, then lifting as the light
    // comes up so the live scene shows through. Trails the exposure slightly so
    // the theatre reads as emerging FROM the dark rather than behind a curtain.
    const veilA = 1 - smoother(T.riseStart + 250, T.riseEnd - 150, t);
    ctx2d.globalCompositeOperation = 'source-over';
    ctx2d.fillStyle = 'rgba(4,7,10,' + veilA.toFixed(3) + ')';
    ctx2d.fillRect(0, 0, W, H);

    // A warm lamp glow blooming where the surgical light hangs — top-centre.
    const glow = smoother(T.heart, T.riseEnd, t) * (0.55 + 0.45 * rise);
    if (glow > 0.001) {
      const gx = W * 0.5, gy = H * 0.30, gr = Math.max(W, H) * 0.6;
      const rg = ctx2d.createRadialGradient(gx, gy, 0, gx, gy, gr);
      rg.addColorStop(0, 'rgba(255,242,226,' + (0.10 * glow).toFixed(3) + ')');
      rg.addColorStop(0.4, 'rgba(120,150,170,' + (0.05 * glow).toFixed(3) + ')');
      rg.addColorStop(1, 'rgba(4,7,10,0)');
      ctx2d.globalCompositeOperation = 'lighter';
      ctx2d.fillStyle = rg;
      ctx2d.fillRect(0, 0, W, H);
    }

    // Dust. Brightest in the middle of the sequence, gone by the end — motes
    // catching the light against the dark, not a persistent overlay. Suppressed
    // entirely under reduced motion (drifting particles are the point of it).
    const dustA = REDUCED ? 0
      : smoother(T.heart, T.welcomeIn, t) * (1 - smoother(T.welcomeOut, T.end, t));
    if (dustA > 0.001) {
      ctx2d.globalCompositeOperation = 'lighter';
      const ts = t / 1000;
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        let y = m.y - m.sp * ts;
        y = ((y % 1) + 1) % 1;                       // wrap upward
        const x = m.x * W + Math.sin(ts * 0.5 + m.sw) * m.sa;
        const py = y * H;
        const tw = 0.5 + 0.5 * Math.sin(ts * 1.3 + m.sw); // twinkle
        const a = dustA * (0.10 + 0.22 * tw);
        ctx2d.beginPath();
        ctx2d.fillStyle = 'rgba(200,222,232,' + a.toFixed(3) + ')';
        ctx2d.arc(x, py, m.r * dpr, 0, Math.PI * 2);
        ctx2d.fill();
      }
    }
    ctx2d.globalCompositeOperation = 'source-over';
  }

  function skip() {
    if (!running || done) return;
    // Jump the state forward: full light, camera home, chrome shown, then finish.
    if (renderer) renderer.toneMappingExposure = EXPO_FULL;
    if (camera) {
      camera.position.copy(camTo);
      camera.lookAt(tgtTo);
    }
    if (!chromeRevealed) {
      chromeRevealed = true;
      document.body.classList.remove('intro');
      reveal();
    }
    finish();
  }

  function finish() {
    if (done) return;
    done = true;
    running = false;
    if (renderer) renderer.toneMappingExposure = EXPO_FULL;
    if (controls) {
      controls.target.copy(tgtTo);
      controls.enabled = true;
      controls.update();
    }
    window.removeEventListener('resize', size);
    window.removeEventListener('keydown', onSkipEvt);
    veil.removeEventListener('pointerdown', onSkipEvt);
    // Fade the veil out over ~0.7s, then remove it and its styles entirely.
    veil.style.transition = 'opacity .7s ease';
    veil.style.opacity = '0';
    setTimeout(function () {
      if (veil.parentNode) veil.parentNode.removeChild(veil);
      if (style.parentNode) style.parentNode.removeChild(style);
      document.body.classList.remove('intro-out');
      if (actx) { try { actx.close(); } catch (e) {} actx = null; }
    }, 750);
    onDone();
  }

  return {
    start,
    update,
    skip,
    get running() { return running; },
    get done() { return done; },
  };
}
