/*
 * core.js — the engine. One Three.js scene, one camera, and the SCALE RELAY that
 * makes a continuous zoom across ~36 orders of magnitude possible without the
 * floating-point space folding in on itself.
 *
 * THE RELAY, precisely.
 *   Thirteen stages sit conceptually on an axis 0..12 (Universe..Atom). A single
 *   continuous `pos` is where the camera "is" on that axis. For stage i, let
 *   d = pos - i. The stage is authored ONCE at ~unit size, centred at the origin,
 *   and the relay only ever changes its SCALE and OPACITY:
 *       scale  = SCALE_STEP ^ d        (d<0 tiny & approaching, d>0 huge & passed)
 *       fade   = 1 - smoothstep(FADE0, BAND, |d|)
 *   At d=0 a stage is the hero: scale 1, opacity 1. Push past it and it blooms
 *   outward and dissolves while stage i+1 — which was a tiny point at the exact
 *   centre — grows into the hero. There are always TWO stages overlapping, so you
 *   never see a cut: you literally fly INTO the next scale. Because every stage
 *   lives at unit size and only its transform.scale moves within a bounded range,
 *   there is never a precision problem, however deep you dive.
 *
 * Everything else here serves that: momentum zoom input (wheel/drag/pinch/keys),
 * a fixed camera with a breath of parallax, hotspot projection for the DOM label
 * layer, and a render loop that only touches the one or two live stages.
 */

const UNI = {
  ORDER: [],            // stage keys in zoom order, filled by data.js
  _factories: {},       // key -> factory(ctx)
  stages: [],           // built stage instances, index-aligned with ORDER
  register(key, factory) { this._factories[key] = factory; },
};

// Relay constants. Tuned so a full wheel-notch feels like a satisfying step and
// the overlap reads as "flying through" rather than a dissolve.
const UNI_SCALE_STEP = 6.2;   // linear-size ratio between adjacent scales on screen
const UNI_BAND = 1.15;        // a stage is alive while |d| < BAND (slight overlap)
const UNI_FADE0 = 0.5;        // full opacity while |d| < FADE0, then fades to BAND
const UNI_CAM_Z = 3.5;        // camera distance; stages authored to fill at scale 1
const UNI_LAMBDA = 6.5;       // zoom easing rate (higher = snappier)

// A single Pointer Events path owns drag and pinch, so a two-finger gesture can
// never also move the scale as a one-finger drag. Kept separate for event tests.
function bindUniverseInput(el, keyboardTarget, Z, api) {
  const pointers = new Map(), listeners = [];
  let lastT = 0, dragVel = 0, pinchPrev = 0;
  const listen = (target, event, fn, options) => {
    target.addEventListener(event, fn, options);
    listeners.push(() => target.removeEventListener(event, fn, options));
  };
  const distance = () => {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  listen(el, 'wheel', e => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 1 : e.deltaMode === 2 ? 8 : 0.01;
    // Trackpad spread emits negative ctrl+wheel: spread must move IN, not out.
    const d = KIT.clamp(e.deltaY * unit * (e.ctrlKey ? -0.3 : 0.5), -0.9, 0.9);
    Z.flingVel = api.reduced() ? 0 : KIT.clamp(Z.flingVel + d * 0.2, -2, 2);
    api.nudge(d);
  }, { passive: false });
  listen(el, 'pointerdown', e => {
    if ((e.pointerType === 'mouse' && e.button !== 0) || pointers.size >= 2) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastT = api.now(); dragVel = 0; Z.flingVel = 0;
    pinchPrev = pointers.size === 2 ? distance() : 0;
    el.setPointerCapture(e.pointerId);
    api.wake();
  });
  listen(el, 'pointermove', e => {
    if (!api.reduced() && e.pointerType !== 'touch') {
      Z.pxT = (e.clientX / Math.max(1, innerWidth) - 0.5) * 0.16;
      Z.pyT = (e.clientY / Math.max(1, innerHeight) - 0.5) * 0.16;
    }
    api.wake();
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const next = distance();
      if (pinchPrev > 0 && next > 0) api.nudge(Math.log(next / pinchPrev) * 1.8);
      pinchPrev = next; dragVel = 0;
    } else {
      const d = -(e.clientY - prev.y) * 0.009;
      dragVel = d / (Math.max(8, api.now() - lastT) / 1000);
      api.nudge(d);
    }
    lastT = api.now();
  });
  function end(e, cancelled) {
    if (!pointers.has(e.pointerId)) return;
    const wasPinch = pointers.size > 1;
    pointers.delete(e.pointerId);
    if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);
    Z.flingVel = cancelled || wasPinch || api.reduced() ? 0 : KIT.clamp(dragVel * 0.08, -2, 2);
    dragVel = 0; pinchPrev = 0; lastT = api.now();
  }
  listen(el, 'pointerup', e => end(e, false));
  listen(el, 'pointercancel', e => end(e, true));
  listen(el, 'lostpointercapture', e => end(e, true));
  listen(keyboardTarget, 'blur', () => { pointers.clear(); pinchPrev = dragVel = Z.flingVel = 0; });
  listen(keyboardTarget, 'keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.target?.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName || '')) return;
    if (e.key === 'ArrowUp' || e.key === '=' || e.key === '+') api.jumpTo(Z.posTarget + 0.5, true);
    else if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') api.jumpTo(Z.posTarget - 0.5, true);
    else if (e.key === 'Home') api.jumpTo(0, true);
    else if (e.key === 'End') api.jumpTo(api.count - 1, true);
    else if (/^[0-9]$/.test(e.key)) api.jumpTo(e.key === '0' ? 9 : +e.key - 1, true);
    else return;
    e.preventDefault();
  });
  return () => listeners.forEach(remove => remove());
}

function bootUniverse(mount) {
  // Guard against a zero-size viewport at construction (hidden tab / snapshot):
  // aspect = 0/0 = NaN poisons the projection matrix and nothing would render.
  const vw = () => Math.max(1, innerWidth), vh = () => Math.max(1, innerHeight);
  // Preserve horizontal subject framing on narrow phones instead of cropping
  // most of a cell or planet. The camera stays inside the authored sky shells.
  const fieldOfView = () => 2 * Math.atan(Math.tan(25 * Math.PI / 180) / Math.min(1, vw() / vh())) * 180 / Math.PI;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fieldOfView(), vw() / vh(), 0.001, 100);
  camera.position.set(0, 0, UNI_CAM_Z);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(vw(), vh());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(KIT.HEX.bg, 1);
  mount.appendChild(renderer.domElement);

  // ── lighting. A cool key + warm rim + gentle ambient reads across every scene
  //    from a nebula to a mitochondrion. Individual stages add their own glow via
  //    emissive materials + bloom, so this is deliberately restrained.
  // An environment map is what makes a wet, clearcoated surface read as wet — it
  // gives every highlight something real to reflect. Without it PBR looks flat.
  try { scene.environment = KIT.studioEnv(renderer); } catch (e) { /* non-fatal */ }

  scene.add(new THREE.AmbientLight(0xc2c9c4, 0.18));
  // Broad neutral illumination preserves authored tissue colours. A faint cool
  // rim separates form without painting every organism cyan or violet.
  const key = new THREE.DirectionalLight(0xfff3e4, 2.2); key.position.set(3.5, 5, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xc4d4df, 0.45); fill.position.set(-4, 1.5, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xc6ded8, 0.65); rim.position.set(-4.5, -1.5, -5); scene.add(rim);

  // ── post: bloom is what makes ATP, electrons, stars and the DNA glow read as
  //    light. Optional — a CDN hiccup degrades to a crisp un-bloomed frame.
  let composer = null, bloom = null;
  try {
    if (POSTFX_DEPS && POSTFX_DEPS.EffectComposer) {
      const { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } = POSTFX_DEPS;
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.45, 1.0);
      composer.addPass(bloom);
      if (OutputPass) composer.addPass(new OutputPass());
    }
  } catch (e) { console.warn('bloom unavailable', e); composer = null; }

  // ── build every registered stage, index-aligned with ORDER. A stage that throws
  //    during construction is skipped, not fatal — the relay just steps over it.
  const meta = (typeof UNI_DATA === 'object') ? UNI_DATA : {};
  UNI.stages = [];
  UNI.ORDER.forEach((key) => {
    const factory = UNI._factories[key];
    if (!factory) { UNI.stages.push(null); return; }
    try {
      const inst = factory({ THREE, KIT, meta: meta[key] || {}, scene });
      if (inst && inst.root) { inst.root.visible = false; scene.add(inst.root); }
      inst.key = key;
      UNI.stages.push(inst);
    } catch (e) { console.warn('stage failed: ' + key, e); UNI.stages.push(null); }
  });

  const N = UNI.ORDER.length;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motion.matches;
  const initialized = new WeakSet();

  // ── zoom state. `pos` is eased toward `posTarget`; `flingVel` adds glide after
  //    a drag/wheel flick so momentum decays naturally instead of stopping dead.
  const Z = {
    pos: 0, posTarget: 0, flingVel: 0,
    // pointer parallax — a breath of camera drift toward the cursor, spring-damped.
    px: 0, py: 0, pxT: 0, pyT: 0,
    lastInput: 0,
  };

  function clampTarget() { Z.posTarget = KIT.clamp(Z.posTarget, 0, N - 1); }
  function nudge(delta) { Z.posTarget += delta; clampTarget(); if (reducedMotion) { Z.pos = Z.posTarget; Z.flingVel = 0; } Z.lastInput = now(); wake(); }
  function now() { return performance.now(); }

  // ── input ──────────────────────────────────────────────────────────────────
  const el = renderer.domElement;
  const unbindInput = bindUniverseInput(el, window, Z, {
    nudge, jumpTo, now, reduced: () => reducedMotion, count: N,
    wake: () => { Z.lastInput = now(); wake(); },
  });
  function jumpTo(i, instant = false) {
    Z.posTarget = KIT.clamp(i, 0, N - 1); Z.flingVel = 0;
    if (instant || reducedMotion) Z.pos = Z.posTarget;
    Z.lastInput = now(); wake(); if (onJump) onJump(Math.round(Z.posTarget));
  }
  function motionChanged(e) {
    reducedMotion = e.matches;
    if (reducedMotion) {
      Z.pos = Z.posTarget; Z.flingVel = 0;
      Z.px = Z.py = Z.pxT = Z.pyT = 0;
      wake();
    }
  }
  motion.addEventListener?.('change', motionChanged);

  function relayout() {
    camera.aspect = vw() / vh(); camera.fov = fieldOfView(); camera.updateProjectionMatrix();
    renderer.setSize(vw(), vh());
    if (composer) composer.setSize(vw(), vh());
  }
  addEventListener('resize', relayout);
  // Rotating a phone is the case `resize` alone does not cover: iOS dispatches
  // orientationchange before the new dimensions are readable, so measuring
  // immediately reads the PRE-rotation size and leaves the zoom stretched until
  // something else happens to resize it. Re-run after the next frame and again once
  // the rotation animation has settled. visualViewport catches the other way the
  // usable height changes on a phone — the address bar sliding away.
  addEventListener('orientationchange', () => {
    requestAnimationFrame(relayout);
    setTimeout(relayout, 250);
  });
  if (window.visualViewport) visualViewport.addEventListener('resize', relayout);

  // ── immersion: hide the chrome after a spell of no input, show it on any input.
  let immersed = false, onImmersion = null, onJump = null, onFrame = null;
  function wake() { if (immersed) { immersed = false; if (onImmersion) onImmersion(false); } }

  // ── the loop ─────────────────────────────────────────────────────────────────
  let last = now(), raf = 0;
  const _v = new THREE.Vector3();
  // One simulation+render step. Split out of the rAF loop so scripted tests can
  // advance the relay deterministically even where rAF is throttled to zero.
  function tick(dt) {
    const t = now();

    // fling glide + ease toward target
    if (!reducedMotion && Math.abs(Z.flingVel) > 0.0005) { Z.posTarget += Z.flingVel * dt; clampTarget(); Z.flingVel *= Math.exp(-5 * dt); }
    else Z.flingVel = 0;
    Z.pos = reducedMotion ? Z.posTarget : KIT.damp(Z.pos, Z.posTarget, UNI_LAMBDA, dt);

    // parallax camera drift (spring toward pointer target), always looking at origin
    Z.px = reducedMotion ? 0 : KIT.damp(Z.px, Z.pxT, 3, dt); Z.py = reducedMotion ? 0 : KIT.damp(Z.py, Z.pyT, 3, dt);
    camera.position.set(Z.px, -Z.py, UNI_CAM_Z);
    camera.lookAt(0, 0, 0);

    // relay: scale + fade + update only the live stages
    for (let i = 0; i < UNI.stages.length; i++) {
      const st = UNI.stages[i]; if (!st || !st.root) continue;
      const d = Z.pos - i;
      const ad = Math.abs(d);
      if (ad >= UNI_BAND) { if (st.root.visible) st.root.visible = false; continue; }
      // Fade reaches 0 by |d|=1.0 — NOT at the wider cull band — so when the zoom
      // settles on a stage its neighbours (at exactly |d|=1) vanish completely
      // instead of hanging at ~13% as a persistent ghost. The 1.15 band is only for
      // the visibility/update cull during transit.
      const fade = 1 - KIT.smoothstep(UNI_FADE0, 1.0, ad);
      if (fade <= 0.003) { if (st.root.visible) st.root.visible = false; continue; }
      const scale = Math.pow(UNI_SCALE_STEP, d);
      st.root.visible = true;
      st.root.scale.setScalar(scale);
      KIT.setGroupFade(st.root, fade);
      if (st.update && (!reducedMotion || !initialized.has(st))) {
        st.update(reducedMotion ? 0 : dt, d, camera, fade); initialized.add(st);
      }
    }

    // auto-immerse after 2.6s idle
    if (!reducedMotion && !immersed && t - Z.lastInput > 2600 && !document.activeElement?.closest?.('.hud,.u-panel,.u-help,.u-mark')) { immersed = true; if (onImmersion) onImmersion(true); }

    if (onFrame) onFrame(Z.pos);

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  function frame() {
    const t = now(); let dt = (t - last) / 1000; last = t; dt = Math.min(0.05, dt);
    tick(dt);
    raf = requestAnimationFrame(frame);
  }

  // ── hotspot projection for the DOM label/hover layer. Returns, for the current
  //    hero stage(s), each hotspot's screen position + on-screen radius + meta.
  const _p = new THREE.Vector3();
  function projectedHotspots() {
    const out = [];
    for (let i = 0; i < UNI.stages.length; i++) {
      const st = UNI.stages[i]; if (!st || !st.root || !st.root.visible || !st.hotspots) continue;
      const d = Z.pos - i; if (Math.abs(d) > 0.6) continue;   // only the (near-)hero stage owns hotspots
      const fade = 1 - KIT.smoothstep(UNI_FADE0, UNI_BAND, Math.abs(d));
      for (const h of st.hotspots) {
        const wp = h.get(_p);                    // hotspot fills _p with world pos
        _p.project(camera);
        if (_p.z > 1) continue;                  // behind camera
        out.push({
          id: h.id, meta: h.meta, stage: st.key, fade,
          x: (_p.x * 0.5 + 0.5) * innerWidth,
          y: (-_p.y * 0.5 + 0.5) * innerHeight,
        });
      }
    }
    return out;
  }

  raf = requestAnimationFrame(frame);

  return {
    scene, camera, renderer, Z,
    stageIndex: () => Math.round(Z.pos),
    stageKeyAt: (i) => UNI.ORDER[KIT.clamp(i, 0, N - 1)],
    jumpTo,
    nudge,
    projectedHotspots,
    onImmersion: (fn) => { onImmersion = fn; },
    onJump: (fn) => { onJump = fn; },
    onFrame: (fn) => { onFrame = fn; },
    get pos() { return Z.pos; },
    get reducedMotion() { return reducedMotion; },
    count: N,
    _tick: tick,   // advance one frame manually (scripted verification without rAF)
    dispose() { cancelAnimationFrame(raf); unbindInput(); motion.removeEventListener?.('change', motionChanged); UNI.stages.forEach((s) => s && s.dispose && s.dispose()); renderer.dispose(); },
  };
}
