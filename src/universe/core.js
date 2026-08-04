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

function bootUniverse(mount) {
  // Guard against a zero-size viewport at construction (hidden tab / snapshot):
  // aspect = 0/0 = NaN poisons the projection matrix and nothing would render.
  const vw = () => Math.max(1, innerWidth), vh = () => Math.max(1, innerHeight);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, vw() / vh(), 0.001, 100);
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

  scene.add(new THREE.AmbientLight(0x2a3a4c, 0.55));
  // A three-point rig: warm key above-right, cool fill, and a strong cyan rim that
  // separates organic silhouettes from the dark background.
  const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(3.5, 5, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9fc4ff, 0.85); fill.position.set(-4, 1.5, 4); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x7cffe0, 1.9); rim.position.set(-4.5, -1.5, -5); scene.add(rim);
  const under = new THREE.PointLight(0x4a6cf0, 18, 26); under.position.set(0, -4, 2); scene.add(under);

  // ── post: bloom is what makes ATP, electrons, stars and the DNA glow read as
  //    light. Optional — a CDN hiccup degrades to a crisp un-bloomed frame.
  let composer = null, bloom = null;
  try {
    if (POSTFX_DEPS && POSTFX_DEPS.EffectComposer) {
      const { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } = POSTFX_DEPS;
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.62, 0.7, 0.85);
      composer.addPass(bloom);
      if (OutputPass) composer.addPass(new OutputPass());
    }
  } catch (e) { console.warn('bloom unavailable', e); composer = null; }

  // ── build every registered stage, index-aligned with ORDER. A stage that throws
  //    during construction is skipped, not fatal — the relay just steps over it.
  const meta = (typeof UNI_DATA === 'object') ? UNI_DATA : {};
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

  // ── zoom state. `pos` is eased toward `posTarget`; `flingVel` adds glide after
  //    a drag/wheel flick so momentum decays naturally instead of stopping dead.
  const Z = {
    pos: 0, posTarget: 0, flingVel: 0,
    // pointer parallax — a breath of camera drift toward the cursor, spring-damped.
    px: 0, py: 0, pxT: 0, pyT: 0,
    lastInput: 0,
  };

  function clampTarget() { Z.posTarget = KIT.clamp(Z.posTarget, 0, N - 1); }
  function nudge(delta) { Z.posTarget += delta; clampTarget(); Z.lastInput = now(); wake(); }
  function now() { return performance.now(); }

  // ── input ──────────────────────────────────────────────────────────────────
  const el = renderer.domElement;
  // Wheel: normalise the three deltaModes to "lines", then to zoom units. Trackpad
  // pinch arrives as ctrlKey+wheel on most browsers — treat it as a finer zoom.
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 1 : e.deltaMode === 2 ? 8 : 1 / 100;
    let d = e.deltaY * unit * (e.ctrlKey ? 0.6 : 1) * 0.5;
    Z.flingVel = KIT.clamp(Z.flingVel + d * 0.4, -6, 6);
    nudge(d);
  }, { passive: false });

  // Drag to zoom (vertical) — a tactile way to fly, with flick momentum on release.
  let dragging = false, lastY = 0, lastT = 0, dragVel = 0;
  el.addEventListener('pointerdown', (e) => {
    dragging = true; lastY = e.clientY; lastT = now(); dragVel = 0; Z.flingVel = 0;
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    // parallax target follows the pointer in all cases (subtle life).
    Z.pxT = (e.clientX / innerWidth - 0.5) * 0.5;
    Z.pyT = (e.clientY / innerHeight - 0.5) * 0.5;
    if (dragging) {
      const dy = e.clientY - lastY, dt = Math.max(1, now() - lastT);
      const d = -dy * 0.012;            // drag up = zoom in
      dragVel = d / (dt / 1000);
      lastY = e.clientY; lastT = now();
      nudge(d);
    }
  });
  function endDrag() {
    if (!dragging) return; dragging = false;
    // Glide in the SAME direction as the drag. dragVel already carries the sign of
    // the intended zoom (drag up → +), so no negation — matching the wheel path.
    Z.flingVel = KIT.clamp(dragVel * 0.12, -6, 6);
  }
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);

  // Pinch to zoom on touch.
  let pinchPrev = 0;
  el.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    if (pinchPrev) nudge((pinchPrev - dist) * 0.01);
    pinchPrev = dist;
  }, { passive: false });
  el.addEventListener('touchend', () => { pinchPrev = 0; });

  // Keyboard: arrows / +- to fly, number keys to jump, Home/End to the extremes.
  addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowUp' || e.key === '=' || e.key === '+') { nudge(0.5); }
    else if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') { nudge(-0.5); }
    else if (e.key === 'Home') { Z.posTarget = 0; Z.flingVel = 0; wake(); }
    else if (e.key === 'End') { Z.posTarget = N - 1; Z.flingVel = 0; wake(); }
    else if (/^[0-9]$/.test(e.key)) { jumpTo(e.key === '0' ? 9 : +e.key - 1); }
    else return;
    Z.lastInput = now();
  });

  function jumpTo(i) { Z.posTarget = KIT.clamp(i, 0, N - 1); Z.flingVel = 0; Z.lastInput = now(); wake(); if (onJump) onJump(Math.round(Z.posTarget)); }

  addEventListener('resize', () => {
    camera.aspect = vw() / vh(); camera.updateProjectionMatrix();
    renderer.setSize(vw(), vh());
    if (composer) composer.setSize(vw(), vh());
  });

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
    if (Math.abs(Z.flingVel) > 0.0005) { Z.posTarget += Z.flingVel * dt; clampTarget(); Z.flingVel *= Math.exp(-3.5 * dt); }
    else Z.flingVel = 0;
    Z.pos = KIT.damp(Z.pos, Z.posTarget, UNI_LAMBDA, dt);

    // parallax camera drift (spring toward pointer target), always looking at origin
    Z.px = KIT.damp(Z.px, Z.pxT, 3, dt); Z.py = KIT.damp(Z.py, Z.pyT, 3, dt);
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
      if (st.update) st.update(dt, d, camera, fade);
    }

    // auto-immerse after 2.6s idle
    if (!immersed && t - Z.lastInput > 2600) { immersed = true; if (onImmersion) onImmersion(true); }

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
    count: N,
    _tick: tick,   // advance one frame manually (scripted verification without rAF)
    dispose() { cancelAnimationFrame(raf); UNI.stages.forEach((s) => s && s.dispose && s.dispose()); renderer.dispose(); },
  };
}
