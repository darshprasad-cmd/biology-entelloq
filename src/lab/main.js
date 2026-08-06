/*
 * main.js — the glue.
 *
 * Ties every subsystem together. The single most important thing it does is the
 * INPUT ROUTER: it produces one `input` object per frame from whichever source is
 * live — VR controller, tracked hand, or mouse — so `dissect.update()` cannot tell
 * them apart. That is what makes the mouse path genuinely equal rather than a
 * degraded fallback, and it is also why hand tracking can fail mid-dissection
 * without losing the attempt.
 *
 * The second most important thing is FRAME ORDER. Fifteen subsystems now share a
 * frame and several of them read what another wrote in the same frame. The order
 * in tick() is load-bearing and every hop is justified where it happens; do not
 * reorder it casually.
 *
 * Every subsystem is feature-detected. A module that fails to build, or throws on
 * construction, costs exactly its own capability and nothing else — the app is
 * expected to run with any subset of them present.
 */

let renderer, scene, camera, controls, group, parts, dissection, shell, hands;
let env = null, handViz = null, soft = null, instr = null, narrator = null;
// Craft pass — cinematic rendering, procedural theatre audio, organ surface detail.
let postfx = null, sfx = null, surface = null, intro = null, dust = null;
// Phase 2 — the tissue gets real.
let strata = null, cutting = null, blood = null, constraints = null;
// Phase 3 — the clinical layer.
let histology = null, imaging = null, pathology = null;
// Phase 4 — alive.
let physio = null, tutor = null, xr = null, zoomverse = null;
let specimenId = null;
let lastT = 0;

// The abstract input the dissection engine consumes. Long-lived and mutated in
// place — reallocating this every frame at 60fps is exactly the kind of garbage
// that shows up as jitter on a school laptop.
const input = { x: 0.5, y: 0.5, grip: 0, gripping: false, span: 0, source: 'mouse' };

// Mouse state, kept separate so a hand can take over mid-stroke and back again.
const mouse = { x: 0.5, y: 0.5, down: false };
let handMode = false;
let currentTool = 'probe';

// Phone or not, decided by the shell (SH_PHONE — a coarse pointer plus a short
// screen edge; see the note there for why it is not a media query). shell.js is
// concatenated ahead of this file so the binding is already live, but main.js
// feature-detects every one of its neighbours and this is no different.
const MN_PHONE = (typeof SH_PHONE !== 'undefined') && !!SH_PHONE;

// The instrument tray, in cycle order. One list shared by the number keys, the
// flick, the wrist dial and the on-screen dial HUD, so they can never disagree.
const TOOL_ORDER = ['probe', 'scalpel', 'forceps', 'pins', 'retractor', 'swab'];
const TOOL_LABELS = ['Probe', 'Scalpel', 'Forceps', 'Pins', 'Retractor', 'Swab'];

/*
 * How many device pixels the specimen is worth.
 *
 * A phone reports devicePixelRatio 3 with a GPU that has a fraction of a
 * laptop's fill rate, so honouring it means shading NINE pixels for every CSS
 * pixel of a scene that is already paying for a bloom chain and a fullscreen
 * grade. 1.5 is where the edges of the organs still read as sharp on a 400ppi
 * screen and the frame budget survives; below that the fine structures (chordae,
 * mesentery) start to alias and this is a lab, not a screensaver. The desktop
 * cap of 2 is untouched.
 */
function bootPixelRatio() {
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(dpr, MN_PHONE ? 1.5 : 2);
}

function bootScene(root) {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 400);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(bootPixelRatio());
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  root.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;

  // Premium lighting + a lit tray + bloom, if env.js is present. Falls back to a
  // basic rig and plain rendering otherwise, so the app runs at any build stage.
  if (typeof setupEnvironment === 'function') {
    try {
      env = setupEnvironment(THREE, (typeof POSTFX_DEPS !== 'undefined' ? POSTFX_DEPS : {}),
        { scene, camera, renderer });
    } catch (e) { console.warn('environment setup failed; basic rig', e); env = null; }
  }
  if (!env) {
    scene.add(new THREE.AmbientLight(0x2b4250, 0.9));
    const k = new THREE.DirectionalLight(0xfff2e6, 2.9); k.position.set(4, 9, 6); scene.add(k);
    const f = new THREE.DirectionalLight(0xffd9c8, 0.9); f.position.set(-5, 2, 7); scene.add(f);
    const r = new THREE.DirectionalLight(0x38e0d8, 1.4); r.position.set(-6, 3, -6); scene.add(r);
  }

  // Ambient dust in the lit air — atmosphere the specimen sits inside. Additive,
  // so it can only ever add a faint glint; safe to ship unseen.
  if (typeof createDust === 'function') {
    try { dust = createDust(THREE, scene); } catch (e) { console.warn('dust failed', e); dust = null; }
  }

  // The cinematic stack — SSAO, depth of field, grain, chromatic aberration,
  // vignette — layered ON TOP of env's bloom chain. It probes GPU capability and
  // picks its own default quality; a plain frame at 60fps beats a lush one at 12.
  if (typeof createPostFX === 'function') {
    try {
      postfx = createPostFX(THREE, (typeof POSTFX_DEPS !== 'undefined' ? POSTFX_DEPS : {}),
        { scene, camera, renderer, composer: env && env.composer });
    } catch (e) { console.warn('postfx failed', e); postfx = null; }
    // A phone GPU is not a laptop GPU. postfx probes the renderer and picks its
    // own tier, but that probe reads a GPU NAME, and a current Adreno or Mali
    // with eight cores and dpr 2 looks like a workstation to it — it would be
    // handed tier 2, which costs a SECOND full scene render for depth of field.
    // Step it to the grade-only tier using postfx's own tiers rather than
    // inventing a second quality system; nothing ever promotes a tier back up,
    // so this sticks for the session.
    if (postfx && MN_PHONE && postfx.setQuality) postfx.setQuality(0);
  }

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    if (env) env.resize(innerWidth, innerHeight);
    if (postfx) postfx.resize(innerWidth, innerHeight);
    if (handViz) handViz.resize();
    if (imaging) imaging.resize(innerWidth, innerHeight);
    if (zoomverse) zoomverse.resize(innerWidth, innerHeight);
  });
}

/* ---- the hand cursor: the ONLY visualisation of the hand the student gets ---- */
let cursorEl;
function ensureCursor() {
  if (cursorEl) return;
  cursorEl = document.createElement('div');
  cursorEl.id = 'handcursor';
  document.body.appendChild(cursorEl);
}
function drawCursor(show, nx, ny, grip, health) {
  ensureCursor();
  cursorEl.style.display = show ? 'block' : 'none';
  if (!show) return;
  const px = nx * innerWidth, py = ny * innerHeight;
  const r = 13 + grip * 15;
  cursorEl.style.transform = `translate(${px - r}px, ${py - r}px)`;
  cursorEl.style.width = cursorEl.style.height = (r * 2) + 'px';
  cursorEl.dataset.grip = grip > 0.55 ? '1' : '0';
  cursorEl.dataset.health = String(health || 0);
}

/* ---- flick to change tools --------------------------------------------- *
 * With a hand driving, the instrument dock is unreachable: the hand owns the
 * cursor, and reaching for the mouse to change tools defeats the entire point of
 * tracking. So a sharp vertical flick of the open hand cycles the instrument —
 * up for the next, down for the previous.
 *
 * The whole difficulty is false positives: a student sweeping their hand up the
 * body to reach the head must NOT change the scalpel out from under themselves.
 * Five independent guards, all of which must pass:
 *   - never while pinching (that is a live incision, the most costly moment)
 *   - genuinely fast
 *   - genuinely SNAPPY — see the tuning note below, this is the load-bearing one
 *   - genuinely vertical: |vy| must dominate |vx|, so a diagonal sweep is ignored
 *   - a cooldown, so one flick cannot ripple through three tools
 *
 * TUNING, measured rather than guessed. The pipeline was simulated end to end —
 * the real HndOneEuro2D and HndResampler2D driven with minimum-jerk hand paths
 * through the camera geometry (1280x720, 55-78 degree lenses, hand 0.40-0.70 m
 * out) and the 1.3x reach gain — and the previous constants did not survive it:
 *
 *   deliberate 15 cm flick, 200 ms, hand at 0.55 m, 65 deg lens ... |vy| = 1.53
 *   the same flick at 0.40 m ................................... |vy| = 2.14
 *   the same flick at 0.70 m ................................... |vy| = 1.19
 *   reaching 25 cm across the specimen in 600 ms ............... |vy| = 1.78
 *   ordinary aiming .............................................. |vy| = 0.21
 *
 * Two things fall out. FLICK_SPEED = 2.3 was unreachable: across 59 simulated
 * intentional flicks it fired on 16 of them (27%) — only the ones made with the
 * hand almost against the lens — which is exactly why nobody found this gesture.
 * And peak speed CANNOT separate the two cases at all: a slow 25 cm reach reads
 * FASTER than a sharp 15 cm flick, because the 30 fps sampling and the One-Euro
 * filter cost a 200 ms burst about two thirds of its peak and a 600 ms sweep only
 * half of it. Simply lowering the threshold to 1.5 fired on 71 of 130 ordinary
 * repositioning moves — it would have swapped the instrument mid-approach every
 * other time the hand crossed the specimen.
 *
 * What DOES separate them is how hard the velocity itself changes. Minimum-jerk
 * peak acceleration goes as amplitude/duration^2, so a flick out-accelerates a
 * reach roughly 5:1 where it only out-runs it 1.2:1, and enough of that survives
 * the filter to gate on:
 *
 *   peak |dvy/dt| — flicks 10.9 to 27.7,  reaches 4.4 to 11.5
 *
 * Hence FLICK_SNAP. With speed 1.2 / snap 12 the same simulation fires on 45 of
 * 59 intentional flicks (76%, up from 27%) and on 3 of 130 ordinary moves (2.3%),
 * all three of them a hand held 40 cm from a narrow 55 degree lens making a hard
 * 10-12 cm move, which is nearly a flick anyway. FLICK_RATIO and FLICK_COOL were
 * swept too and neither wanted moving: at these speeds the ratio test changes
 * nothing between 2.4 and 3.0 (a real flick shows |vy|/|vx| near 7), and 700 ms
 * comfortably covers the return stroke of an out-and-back flick, which lands
 * about 400 ms after the outward one and must not step the tray back again.
 */
const FLICK_SPEED = 1.2;      // screen heights / second
const FLICK_SNAP = 12;        // screen heights / second^2 — how sharply it accelerates
const FLICK_RATIO = 2.4;      // how much |vy| must dominate |vx|
const FLICK_COOL = 700;       // ms between accepted flicks
const flick = { last: -1e9, prevVy: null, prevT: 0 };

function flickReset() {
  flick.prevVy = null;
  flick.prevT = 0;
}

function detectToolFlick(h, now, gripping) {
  // Hands off during a cut. Dropping the velocity history too, so the first
  // sample after the grip releases is a reference and not a phantom acceleration
  // measured across the whole pinch.
  if (gripping) { flickReset(); return 0; }
  // Velocity comes from the tracker, which measures it BETWEEN CAMERA FRAMES.
  // This used to difference the cursor here instead, and that was quietly wrong:
  // the cursor only stepped on detect frames, so on the one render frame that
  // moved it, a whole camera frame of travel was divided by a single display
  // frame's dt — over-reading |vy| by refreshRate/cameraRate, nearly 5x on a
  // 144Hz panel. FLICK_SPEED therefore meant a fifth of what the comment claims,
  // and a fast reach across the specimen could swap the scalpel. The tracker's
  // estimate is in real screen-heights per second on every monitor.
  const vy = h.velY, vx = h.velX;
  if (typeof vy !== 'number' || typeof vx !== 'number') return 0;

  // The snap test needs a genuinely NEW velocity sample, for the same reason the
  // wrist dial does: velY is rewritten at camera rate (~30fps) while this runs at
  // display rate, so a repeated value is not new information. Differencing it
  // against itself would read zero acceleration on four frames out of five and
  // the gesture would fire or not depending on the monitor.
  const fresh = flick.prevVy !== null && vy !== flick.prevVy;
  const dt = now - flick.prevT;
  const snap = fresh && dt > 0 ? Math.abs(vy - flick.prevVy) / (dt / 1000) : 0;
  // Keep the history current even on the frames that go on to bail out — the
  // cooldown check below especially. Letting the reference go stale there would
  // make the first sample after a cooldown difference itself against a value from
  // 700 ms ago, and the gesture immediately after a tool change would be deaf.
  if (vy !== flick.prevVy) { flick.prevVy = vy; flick.prevT = now; }
  if (!fresh) return 0;
  if (now - flick.last < FLICK_COOL) return 0;

  if (Math.abs(vy) < FLICK_SPEED) return 0;
  if (snap < FLICK_SNAP) return 0;
  if (Math.abs(vy) < Math.abs(vx) * FLICK_RATIO) return 0;
  flick.last = now;
  return vy < 0 ? 1 : -1;                       // screen y grows downward: up = next
}

function cycleTool(dir) {
  const i = TOOL_ORDER.indexOf(currentTool);
  const next = TOOL_ORDER[((i < 0 ? 0 : i) + dir + TOOL_ORDER.length) % TOOL_ORDER.length];
  setTool(next);
  // Say it, because with no dock in reach the only feedback is the instrument in
  // the scene, and that is easy to miss mid-movement.
  shell.say('Instrument: ' + next + '.');
  if (xr && xr.isPresenting()) xr.haptic(-1, 0.35, 18);
}

/* ---- twist the wrist to change tools ----------------------------------- *
 * The flick above is one way to swap instrument with no dock in reach; a WRIST
 * TWIST is the other, and the one most people reach for first — roll your open
 * hand like turning a dial and the tray steps with a detent at each notch. It
 * rides hand.roll (the palm's index-MCP → pinky-MCP angle, which pronating and
 * supinating the wrist rotates), integrates the wrapped angular change, and fires
 * one step per DIAL_DETENT of accumulated twist. Twisting back cancels; keep
 * twisting the same way and it ratchets through the tray notch by notch.
 *
 * The false positive it must resist is ordinary pointing — moving the cursor
 * rolls the palm a few degrees. Three guards: a per-frame noise floor below which
 * nothing accrues; a leak that bleeds the accumulator toward zero whenever the
 * wrist is not actively turning, so slow drift never crosses a notch; and a
 * cooldown so one hard twist cannot rip through the whole tray. It is disarmed
 * outright while pinching, because a pinch is a live incision.
 */
const DIAL_DETENT = 0.42;    // radians of twist per instrument step (~24°)
const DIAL_COOL = 280;       // ms between accepted steps
const DIAL_NOISE_VEL = 0.22; // rad/s — below this angular speed the wrist counts as still
const DIAL_LEAK = 0.6;       // fraction of the accumulator surviving each second of stillness
const dial = { prevRoll: null, prevT: 0, accum: 0, last: -1e9, progress: 0, active: false };

function dialReset() {
  dial.prevRoll = null; dial.accum = 0; dial.progress = 0; dial.active = false;
}

function detectToolDial(roll, now, armed) {
  if (!armed || roll == null) { dialReset(); return 0; }
  // First armed frame just captures a reference; there is no twist yet.
  if (dial.prevRoll === null) {
    dial.prevRoll = roll; dial.prevT = now; dial.accum = 0; dial.progress = 0;
    return 0;
  }
  // Act only on a genuinely NEW roll sample. hand.roll refreshes at camera rate
  // (~30fps) while this runs at display rate (~60-144fps), so a repeated value is
  // not new information — integrating or leaking on it would bleed the accumulator
  // mid-twist and make the dial behave differently on different monitors.
  if (roll === dial.prevRoll) return 0;
  let d = roll - dial.prevRoll;              // wrapped angular change since last sample
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  const dt = now - dial.prevT;
  dial.prevRoll = roll; dial.prevT = now;
  // "Turning" is an angular SPEED, not a raw delta, so the noise gate is identical
  // whether the camera runs at 30fps or drops to 15 under low light.
  const turning = dt > 0 && Math.abs(d) / (dt / 1000) > DIAL_NOISE_VEL;
  if (turning) {
    dial.accum += d;
  } else {
    // Not really turning: bleed the accumulator so a slow steady drift can never
    // creep up to a notch on its own.
    dial.accum *= Math.pow(DIAL_LEAK, Math.max(0, dt) / 1000);
  }
  dial.progress = Math.max(-1, Math.min(1, dial.accum / DIAL_DETENT));
  dial.active = Math.abs(dial.progress) > 0.04;
  if (now - dial.last < DIAL_COOL) return 0;
  // Fire ONLY on a frame where the wrist is actively turning. Banked overshoot from
  // an over-twist then bleeds away via the leak instead of firing a phantom second
  // step ~300ms after the hand has already gone still.
  if (turning && dial.accum >= DIAL_DETENT) {
    dial.accum -= DIAL_DETENT; dial.last = now;
    dial.progress = dial.accum / DIAL_DETENT;
    return 1;
  }
  if (turning && dial.accum <= -DIAL_DETENT) {
    dial.accum += DIAL_DETENT; dial.last = now;
    dial.progress = dial.accum / DIAL_DETENT;
    return -1;
  }
  return 0;
}

/* ---- idle camera life --------------------------------------------------- *
 * A dissection scene that freezes the instant you stop moving reads as a
 * screenshot, and "it doesn't feel alive" was a real note. A lab bench is watched
 * by a person, and a person is never perfectly still — so when nothing is being
 * touched, the camera drifts on a slow, non-repeating handheld breath.
 *
 * Two hard rules keep it from ever being a nuisance: it eases to ZERO the instant
 * you engage anything (a drag, a grip, a tracked hand present), so it never nudges
 * a scalpel mid-cut; and it honours prefers-reduced-motion outright. The offset is
 * applied AFTER controls.update() and recomputed fresh each frame — OrbitControls
 * rewrites camera.position from its own spherical every update, so nothing
 * accumulates.
 */
const camLife = {
  idle: 0,
  phase: 0,
  reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),
};
const _camOff = new THREE.Vector3();
const _camRightV = new THREE.Vector3();
const _camUpV = new THREE.Vector3();

function applyCameraLife(dt, interacting) {
  if (camLife.reduced) return;
  const target = interacting ? 0 : 1;
  // Falls fast when you engage (12ms to mostly-still), rises slowly when you let
  // go (~1.5s) so the drift eases back in rather than lurching.
  const rate = interacting ? 0.012 : 0.0016;
  camLife.idle += (target - camLife.idle) * Math.min(1, rate * dt);
  if (camLife.idle < 0.001) return;
  camLife.phase += dt * 0.001;
  const p = camLife.phase;
  // Incommensurate sines per axis → a wander that never obviously loops.
  const sway = Math.sin(p * 0.9) * 0.6 + Math.sin(p * 1.7 + 1.1) * 0.4;
  const bob = Math.sin(p * 0.75 + 0.5) * 0.6 + Math.sin(p * 1.3) * 0.4;
  const amp = 0.05 * camLife.idle;   // world units — tiny at the working distance
  const e = camera.matrixWorld.elements;
  _camRightV.set(e[0], e[1], e[2]);
  _camUpV.set(e[4], e[5], e[6]);
  _camOff.copy(_camRightV).multiplyScalar(sway * amp).addScaledVector(_camUpV, bob * amp);
  camera.position.add(_camOff);
  camera.updateMatrixWorld();
}

/* ---- touch: who owns this finger ---------------------------------------- *
 * A mouse has a hover state and a separate button, so the desktop rule can be
 * trivial: the pointer is always aiming the instrument, and holding the button
 * uses it. A finger has neither. It arrives already pressed, directly on top of
 * the thing it is pointing at, and the SAME gesture has to be able to mean both
 * "cut here" and "turn the specimen round so I can see the other side".
 *
 * The rule, decided at touchdown:
 *
 *   two or more fingers  -> the camera, always. Nothing in the instrument tray
 *       takes two contact points, and pinch-to-zoom is the one gesture people
 *       try without being told, so it must never be ambiguous.
 *   one finger ON the specimen -> the instrument. Direct manipulation: putting
 *       the scalpel down on the liver and having the VIEW swing instead would
 *       be a lie about what the instrument does.
 *   one finger on empty space -> orbit. There is nothing out there to cut, so
 *       the only useful meaning is "look at it from over here" — and it makes
 *       the entire background one enormous orbit target with no modifier key to
 *       learn and no mode to be in.
 *
 * Decided ONCE, at touchdown, and never revisited for the life of the gesture.
 * A stroke that starts on the liver stays a cut even when the finger runs off
 * the edge of it, because re-deciding mid-drag would abort the incision at
 * exactly the moment it crossed a tissue boundary — which is the moment a real
 * incision is most committed. The same reasoning is why the hit test is the
 * SAME test dissect.js will make on the next frame (dissection.pick) rather
 * than a generous one: a fat-finger radius would claim touches that dissect
 * then finds nothing under, and a gesture that neither cuts nor orbits is worse
 * than one that orbits.
 *
 * Claiming is done by stopping the pointerdown in the CAPTURE phase, before it
 * reaches the canvas. OrbitControls listens on the canvas and only tracks
 * pointers whose pointerdown it actually saw, so a claimed finger is invisible
 * to it and there is nothing to arbitrate — no toggling controls.enabled
 * underneath a drag it has already started, which is the failure mode that
 * makes touch camera controls stick.
 */
const TCH = {
  claimed: -1,          // pointerId currently driving the instrument, -1 for none
  ids: new Set(),       // fingers down ON THE SCENE; taps on chrome are not fingers
};

// Surfaces a finger can land on that are emphatically not the specimen. The
// picker and the two full-screen sheets are included as well as .chrome: a
// finger dragging on the specimen chooser must not also be orbiting the
// specimen hidden behind it.
const TCH_CHROME = '.chrome, #pick:not(.gone), #viva.on, #keys.on, #coldopen';

function tchScene(e) {
  return !(e.target && e.target.closest && e.target.closest(TCH_CHROME));
}

function tchHitsSpecimen(clientX, clientY) {
  if (!dissection || !dissection.pick) return false;
  // A radiology study forces every mesh visible and gates dissection off for
  // the frame (see tick), so while one is up nothing is touchable and every
  // finger belongs to the camera.
  if (imaging && imaging.mode && imaging.mode() !== 'off') return false;
  return !!dissection.pick(clientX / innerWidth, clientY / innerHeight);
}

function tchDown(e) {
  if (e.pointerType !== 'touch') return;   // a pen hovers and a mouse has a button
  if (!tchScene(e)) return;
  TCH.ids.add(e.pointerId);
  if (TCH.ids.size > 1) {
    // A second finger means the camera, whatever the first one was doing. If
    // that first finger was cutting, the stroke ENDS here rather than being
    // dragged sideways by the zoom — which is exactly what letting go of the
    // mouse button does, and dissect.js already knows how to finish that.
    if (TCH.claimed >= 0) { TCH.claimed = -1; mouse.down = false; }
    return;                                // through to OrbitControls
  }
  if (!tchHitsSpecimen(e.clientX, e.clientY)) return;   // empty space: orbit
  TCH.claimed = e.pointerId;
  mouse.x = e.clientX / innerWidth;
  mouse.y = e.clientY / innerHeight;
  mouse.down = true;
  e.stopPropagation();                     // keep it away from OrbitControls
}

// pointerup AND pointercancel. A cancel is not an edge case on a phone — the
// system takes the gesture away for an edge swipe or an incoming call — and
// without this the instrument would stay gripped forever afterwards.
function tchUp(e) {
  if (e.pointerType !== 'touch') return;
  TCH.ids.delete(e.pointerId);
  if (TCH.claimed === e.pointerId) { TCH.claimed = -1; mouse.down = false; }
}

/* ---- input router ------------------------------------------------------ */
function routeInput() {
  // VR outranks everything: if a headset is presenting, its controller or tracked
  // hand IS the instrument and the desktop pointer is not even on screen.
  const xin = xr && xr.isPresenting() ? xr.input() : null;
  if (xin) {
    input.x = xin.x; input.y = xin.y;
    input.grip = xin.grip; input.gripping = xin.gripping;
    input.span = xin.span || 0; input.source = 'xr';
    drawCursor(false);
    controls.enabled = false;
    dialReset();
    flickReset();
    if (handViz && handViz.setDial) handViz.setDial({ active: false });
    return;
  }

  const snap = hands && hands.snapshot;
  const live = handMode && snap && snap.active && snap.hands[0] && snap.hands[0].present;

  if (live) {
    const h = snap.hands[0];
    // Aim from the RENDER-RATE cursor. `h.cursor` is only rewritten when a camera
    // frame lands, so at 30fps detection on a 60-144Hz screen it is the same value
    // for two to five consecutive frames — the instrument stair-steps across the
    // tissue and every step is already showing where the hand was ~100ms ago.
    // `h.cursorS` is that same point resampled every frame and projected a bounded
    // step forward. (The tracker keeps using `h.cursor` internally, where reasoning
    // about actual detections — grip reacquisition especially — must not be done
    // against a prediction.) Falls back if an older hands.js is assembled in.
    const hp = h.cursorS || h.cursor;
    input.x = hp.x;
    input.y = hp.y;
    input.grip = h.pinchStrength;
    input.gripping = h.isPinching;
    input.span = snap.hands[1] && snap.hands[1].present ? (snap.span || 0) : 0;
    input.source = 'hand';
    const nowP = performance.now();
    // A flick changes the instrument. Measured on the SMOOTHED cursor, not raw
    // landmarks — the One Euro filter has already removed the tremor that would
    // otherwise read as a dozen tiny flicks per second.
    //
    // The two gesture detectors cannot double-fire. On a frame where the flick
    // wins, the dial is not consulted at all and dialReset() drops the reference
    // roll, so the palm rotation that rode along with the flick is discarded
    // rather than banked toward a notch. The reverse cannot happen either: a
    // wrist twist rotates the palm about the forearm axis, which barely moves the
    // index fingertip the cursor is taken from — nowhere near FLICK_SPEED, let
    // alone FLICK_SNAP. And ordinary aiming reaches neither (measured |vy| ~0.21
    // and snap ~2 against gates of 1.2 and 12).
    const dir = detectToolFlick(h, nowP, input.gripping);
    if (dir) { cycleTool(dir); dialReset(); }  // the flick already moved the tray; don't also dial
    else {
      // Otherwise, twisting the OPEN hand like a dial changes the instrument. Armed
      // only for a deliberate open, spread hand — not while gripping, pointing or
      // resting — so ordinary aiming (which also rolls the palm a few degrees as
      // the wrist pronates) can never spin the tray out from under a cut or an
      // approach. This matches exactly what the onboarding teaches: twist your OPEN
      // hand.
      const armed = !input.gripping && h.gesture === 'open';
      const dd = detectToolDial(h.roll, nowP, armed);
      if (dd) cycleTool(dd);
    }
    // Feed the wrist-dial HUD: which instrument, and how far the twist has turned
    // toward the next notch. Drawn on the overlay right at the hand.
    if (handViz && handViz.setDial) {
      handViz.setDial({
        active: dial.active, progress: dial.progress,
        index: Math.max(0, TOOL_ORDER.indexOf(currentTool)),
        // handviz retains this object by reference and reads it during draw, so it
        // must be the one that is mutated in place every frame — which is exactly
        // what the resampler writes into.
        cursor: hp, labels: TOOL_LABELS,
      });
    }
    // handViz draws a richer ring on its own canvas; only fall back to the DOM
    // dot when the overlay module is absent, so there is never a double cursor.
    drawCursor(!handViz, input.x, input.y, input.grip, snap.health);
    // While a hand is driving, orbit-drag would fight the dissection.
    controls.enabled = false;
  } else {
    input.x = mouse.x;
    input.y = mouse.y;
    input.grip = mouse.down ? 1 : 0;
    input.gripping = mouse.down;
    input.span = 0;
    input.source = 'mouse';
    drawCursor(false);
    // Touch settled ownership at touchdown (see tchDown) and a claimed finger
    // never reached OrbitControls at all, so there is nothing here for the
    // mouse rule to arbitrate — it would only re-enable orbiting underneath a
    // probe stroke that is deliberately not orbiting.
    controls.enabled = TCH.claimed >= 0 ? false : (!mouse.down || currentTool === 'probe');
    dialReset();  // no hand driving → no dial state to carry forward
    // Same for the flick's velocity history: the gap while the mouse was driving
    // is not an acceleration, and differencing across it would be a fabrication.
    flickReset();
    if (handViz && handViz.setDial) handViz.setDial({ active: false });
  }
}

/* ---- events from the dissection engine -> everyone --------------------- */
function onEvent(evt) {
  shell.pushEvent(evt);
  if (narrator) narrator.observe(evt);

  // Mass reads as mass: anything that physically disturbs an organ wobbles it.
  if (soft && evt.partId && /incise|peel|lift|damage|replace/.test(evt.kind)) {
    soft.jiggle(evt.partId, evt.kind === 'damage' ? 0.75 : 0.45);
  }

  // A finished incision becomes a wound that actually opens. dissect.js has
  // already stored the stroke polyline; cutting.js turns it into geometry.
  if (cutting && evt.kind === 'incise' && !evt.meta.refused && evt.partId) {
    const inc = dissection.state.incisions.get(evt.partId);
    const part = parts.find((p) => p.id === evt.partId);
    if (inc && part) {
      cutting.open({
        partId: part.id, mesh: part.mesh, points: inc.points,
        system: part.system, depth: 0.55, amount: 0.62,
      });
    }
  }
  if (cutting && evt.kind === 'retract') cutting.gape(dissection.hovered, evt.meta.open || 1);
  if (cutting && evt.kind === 'peel') cutting.gape(evt.partId, 1);

  // Injury bleeds harder than a clean cut, and a torn artery is not a graze.
  if (blood && dissection && dissection.contact && /damage|incise/.test(evt.kind)) {
    const c = dissection.contact;
    const hard = evt.kind === 'damage';
    blood.bleed({
      point: c.point, normal: c.normal, partId: evt.partId || c.partId,
      severity: hard ? 0.9 : 0.5,
      kind: hard ? (/heart|aort|arter/.test(evt.partId || '') ? 'arterial' : 'venous') : 'capillary',
    });
  }

  // A bad cut has physiological consequences, not just a red message.
  if (physio && evt.kind === 'damage' && evt.partId) physio.sever(evt.partId);

  // Haptics: the headset should agree with what the eyes just saw.
  if (xr && xr.isPresenting()) {
    if (evt.kind === 'damage') {
      xr.haptic(-1, 1, 55);
      setTimeout(() => xr.haptic(-1, 1, 55), 90);   // a sharp double tap reads as "wrong"
    } else if (evt.kind === 'incise') xr.haptic(-1, 0.7, 40);
    else if (evt.kind === 'pin' || evt.kind === 'peel') xr.haptic(-1, 0.4, 25);
  }

  // A sound per event, chosen to match the physical act. Kept quiet and short by
  // sfx.js itself — the mapping only decides which voice, not how loud.
  if (sfx) {
    const s = SOUND_EVT[evt.kind];
    if (s) sfx.play(s[0], s[1]);
    else if (evt.kind === 'retract') sfx.play('creak', { strength: evt.meta.open || 1 });
    else if (evt.kind === 'discover' && evt.partId) sfx.contact({ grip: input.grip });
  }

  if (evt.kind === 'hover') {
    shell.setStructure(evt.partId
      ? { name: evt.text, note: evt.meta && evt.meta.note,
          system: evt.meta && evt.meta.system, actions: actionsFor(evt.partId) }
      : null);
  } else if (evt.kind === 'damage') shell.say(evt.text, { consequence: true });
  else if (evt.text) shell.say(evt.text);

  shell.checkObjectives && shell.checkObjectives(dissection.state, evt);
  if (strata && shell.setStrata) shell.setStrata(strata.stack, dissection.state.maxLayerRevealed);

  // The tutor watches everything, and decides for itself when to speak.
  if (tutor) tutor.observe(evt, dissection.state);
}

/* ---- contextual depth --------------------------------------------------- *
 * The reason this exists: the app grew a histology microscope, four radiology
 * modalities, a vascular clamp and a nerve stimulator, and every one of them was
 * reachable ONLY by pressing an unmarked key. A reviewer who read the entire
 * codebase still concluded those features were missing — which is the correct
 * verdict on a feature with no front door.
 *
 * So each structure now advertises what IT can do, at the moment the cursor is on
 * it. Nothing generic: a vessel offers a clamp, a nerve offers a stimulus, an
 * organ with attachments offers to divide them. An offer that is always present
 * is furniture; an offer that appears exactly when it applies is an instrument.
 */
function actionsFor(partId) {
  if (!partId) return [];
  const out = [];
  if (histology) out.push({ id: 'histology', label: 'Histology', key: 'Z' });
  if (zoomverse) out.push({ id: 'zoomverse', label: 'Zoom to atom', key: 'I' });
  if (physio) {
    const isVessel = physio.vessels().some((v) => v.id === partId);
    const isNerve = physio.nerves().some((n) => n.id === partId);
    if (isVessel) {
      const on = physio.clamped().indexOf(partId) >= 0;
      out.push({ id: 'clamp', label: on ? 'Release clamp' : 'Clamp vessel', key: 'C' });
    }
    if (isNerve) out.push({ id: 'stimulate', label: 'Stimulate', key: 'K' });
  }
  if (constraints && constraints.info) {
    const held = constraints.info(partId);
    if (held && held.length) out.push({ id: 'divide', label: 'Divide attachments', key: 'D' });
  }
  if (imaging) out.push({ id: 'imaging', label: 'Imaging', key: 'X' });
  return out;
}

/* The monitor is the physiology model's own presence: it arrives with the model
 * and leaves with it, rather than squatting on the workspace permanently. */
function setPhysiology(on) {
  if (!physio) return;
  physio.setRunning(on);
  if (on) physio.mountMonitor(document.body); else physio.unmountMonitor();
  // The dock's top boundary depends on whether the monitor is occupying the
  // corner; shell.js reads this class to pick its floor.
  document.body.classList.toggle('physio-on', !!on);
  if (shell.setPhysio) shell.setPhysio({ running: on });
}

function doAction(id) {
  const h = dissection && dissection.hovered;
  if (id === 'histology') {
    // Route through the same path the Z key uses so there is exactly one
    // implementation of "open the microscope on this structure".
    dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
  } else if (id === 'imaging') {
    dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
  } else if (id === 'zoomverse') {
    dispatchEvent(new KeyboardEvent('keydown', { key: 'i' }));
  } else if (id === 'clamp' && physio && h) {
    // Clamping a vessel is meaningless with the circulation stopped, and making
    // the student find a separate switch first is a puzzle, not a lesson. The
    // action implies the mode: turn the model on and say so.
    if (!physio.running()) {
      setPhysiology(true);
      shell.say('Circulation running — now watch what the clamp does downstream.');
    }
    if (physio.clamped().indexOf(h) >= 0) physio.unclamp(h); else physio.clamp(h);
    shell.setActions(actionsFor(h));
  } else if (id === 'stimulate' && physio && h) physio.stimulate(h);
  else if (id === 'divide' && constraints && h) {
    if (!constraints.sever(h)) shell.say('Nothing is holding that structure.');
  }
}

/* ---- pathology: swapping the specimen for a diseased one ---------------- */
/*
 * Ordering trap, and it is a nasty one. softbody.js caches rest vertex positions
 * at construction, so a case that deforms geometry AFTER softbody was built gets
 * silently sprung back to the healthy shape on the next animated frame. And
 * soft.dispose() writes its cached rest positions back, so it must run BEFORE the
 * case changes, never after. Hence: dispose, mutate, rebuild — in that order.
 */
function setCase(caseId) {
  if (!pathology) return null;
  if (soft) { soft.dispose(); soft = null; }
  const r = caseId ? pathology.apply(caseId) : (pathology.clear(), null);
  if (typeof createSoftBody === 'function') {
    try { soft = createSoftBody(THREE, parts); soft.setLife(true); }
    catch (e) { console.warn('softbody rebuild failed', e); soft = null; }
  }
  if (shell.setVignette) shell.setVignette(pathology.vignette());
  if (r) shell.say('New specimen on the table. Read the history, then dissect.');
  return r;
}

/* ---- specimen lifecycle ------------------------------------------------ */
function loadSpecimen(id) {
  if (group) { scene.remove(group); group = null; }
  if (dissection) { dissection.dispose(); dissection = null; }
  if (imaging) { imaging.dispose(); imaging = null; }          // it caches part meshes
  if (constraints) { constraints.dispose(); constraints = null; }
  if (pathology) { pathology.dispose(); pathology = null; }
  if (physio) { physio.dispose(); physio = null; }
  if (surface) { surface.dispose(); surface = null; }
  if (strata) { strata.dispose(); strata = null; }
  if (cutting) cutting.clear();
  if (blood) blood.clear();

  specimenId = id;
  const built = buildSpecimen(THREE, id);
  group = built.group;
  parts = built.parts;
  scene.add(group);

  const spec = SPECIMENS[id];
  camera.position.set(...spec.camera.pos);
  controls.target.set(...spec.camera.target);
  controls.update();
  if (xr) xr.setFocus(...spec.camera.target);

  // Shadows are most of the grounding — the specimen must cast onto the table.
  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // STRATA FIRST. It mutates existing parts' `layer` values and pushes new
  // descriptors into `parts`, and dissect.js snapshots `parts` into its byId/mesh
  // tables at construction — anything added afterwards is invisible to picking.
  if (typeof buildStrata === 'function') {
    try {
      strata = buildStrata(THREE, id, parts, group);
      // buildStrata self-registers its descriptors into `parts`. Push them again
      // and every new part gets a DUPLICATE id, which quietly corrupts dissect.js:
      // it builds byId as `new Map(parts.map(p => [p.id, p]))`, so the second copy
      // wins the map while the first copy's mesh stays in the pick list — clicking
      // that mesh then resolves to the wrong descriptor. Idempotent by membership.
      strata.added.forEach((d) => { if (parts.indexOf(d) < 0) parts.push(d); });
      group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    } catch (e) { console.warn('strata failed', e); strata = null; }
  }

  // SURFACE DETAIL before softbody, and this ordering is load-bearing. apply()
  // displaces organ vertices to break the too-smooth silhouette and hangs vessels
  // as child meshes; softbody.js snapshots REST vertex positions in its
  // constructor. Build softbody first and the very next animated frame springs
  // every organ back to the analytic shape — silently, no error. It must also
  // precede dissection/physio/imaging, which cache part meshes and materials.
  if (surface) { surface.dispose(); surface = null; }
  if (typeof createSurfaceDetail === 'function') {
    try { surface = createSurfaceDetail(THREE, parts, id, group); surface.apply(); }
    catch (e) { console.warn('surface failed', e); surface = null; }
  }

  if (soft) { soft.dispose(); soft = null; }
  if (typeof createSoftBody === 'function') {
    try { soft = createSoftBody(THREE, parts); soft.setLife(true); }
    catch (e) { console.warn('softbody failed', e); soft = null; }
  }

  dissection = createDissection(THREE, {
    scene, camera, group, parts, onEvent,
    requiresPinning: SPECIMENS[id].requiresPinning !== false,
  });
  dissection.setTool(currentTool === 'swab' ? 'probe' : currentTool);

  if (blood) blood.setSpecimen(parts);

  // Everything below needs a live `parts` array and a built group.
  if (typeof createConstraints === 'function') {
    try {
      constraints = createConstraints(THREE, scene, parts, id);
      constraints.onEvent(onEvent);     // same bus — shell, narrator, softbody jiggle
    } catch (e) { console.warn('constraints failed', e); constraints = null; }
  }
  if (typeof createImaging === 'function') {
    try { imaging = createImaging(THREE, scene, camera, renderer, parts, { label: spec.name }); }
    catch (e) { console.warn('imaging failed', e); imaging = null; }
  }
  if (typeof createPathology === 'function') {
    try { pathology = createPathology(THREE, parts, id); }
    catch (e) { console.warn('pathology failed', e); pathology = null; }
  }
  if (typeof createPhysiology === 'function') {
    try {
      physio = createPhysiology(THREE, parts, id);
      physio.onEvent(onEvent);
      // NOT mounted here. Physiology defaults to OFF, and a 352x278 bedside
      // monitor parked over the top-left corner for a simulation that is not
      // running costs the instrument dock its space and reads as clutter. It
      // appears when the model does — see setPhysiology().
      if (blood && blood.setPhaseSource) blood.setPhaseSource(physio.phase);
      // One clock: the heartbeat sound, the visible squeeze and the ECG all read
      // physio.phase, so the lub-dub cannot drift from the beat you can see.
      if (sfx) { sfx.setPhaseSource(physio.phase); sfx.setBreathing(true); }
    } catch (e) { console.warn('physiology failed', e); physio = null; }
  }

  shell.setSpecimen(spec, parts);
  if (tutor) tutor.setSpecimen(id);
  if (strata && shell.setStrata) shell.setStrata(strata.stack, 0);
  if (shell.setVignette) shell.setVignette(null);
  if (pathology && shell.setCases) shell.setCases(pathology.list(), (cid) => setCase(cid));
}

/* ---- frame ------------------------------------------------------------- */
/*
 * Frame order, and why each hop sits where it does:
 *   xr        — writes the camera the rest of the frame raycasts against
 *   hands     — produces the snapshot routeInput reads
 *   dissect   — produces THE raycast contact; everything downstream reuses it
 *               rather than casting a second ray
 *   constraints — must read the absolute position dissect's updateLift just wrote
 *   physio    — publishes the cardiac phase that softbody and blood beat to
 *   soft      — rewrites whole position arrays from its own rest snapshot
 *   cutting   — re-adds its persistent vertex offsets ON TOP of that rewrite
 *   blood     — needs final surface positions to stick droplets to
 *   tutor     — last, so it judges a settled frame
 */
function tick(t) {
  const dt = lastT ? Math.min(64, t - lastT) : 16; lastT = t;

  // The scale journey OWNS the whole frame while it is open: its own scene, its own
  // camera, driven by the scroll. Everything else — dissection, idle life, the
  // specimen render — pauses behind it, and resumes untouched when it closes.
  if (zoomverse && zoomverse.isOpen()) {
    zoomverse.update(dt);
    zoomverse.render(dt);
    return;
  }

  if (xr) xr.update(dt);

  if (handMode && hands) {
    hands.update(t);
    if (handViz) handViz.update(hands.snapshot);
    // Refresh the status HUD at ~7Hz; every frame would thrash the DOM. Grip and
    // gesture come from hand 0 so the panel meter tracks the driving hand.
    if (!tick._hs || t - tick._hs > 140) {
      tick._hs = t;
      const h0 = hands.snapshot.hands[0];
      shell.setHandState({
        on: true, status: 'tracking', health: hands.snapshot.health, video: hands.videoEl,
        gesture: h0 && h0.present ? h0.gesture : 'none',
        grip: h0 && h0.present ? h0.pinchStrength : 0,
        hands: hands.snapshot.hands.filter((h) => h.present).length,
      });
    }
  }
  routeInput();

  // Imaging gates dissection. A radiology study forces every part mesh visible so
  // you can see what is under the blade — and dissect.js picks on mesh.visible, so
  // leaving it live would let the probe hover organs three layers deep. It would
  // also let damage() write material.color onto a shader material that has none.
  const scanning = imaging && imaging.mode() !== 'off';
  if (dissection && !scanning) dissection.update(input, dt);
  if (imaging) imaging.update(dt);

  // Constraints run AFTER dissect, deliberately. dissect.updateLift() writes an
  // absolute position straight from the cursor ray — there is no delta here for
  // main.js to scale by (1 - resistance), so constraints reads that written
  // position as a demand and corrects the transform itself. Run it first and it
  // is a no-op against a position that has not been written yet.
  if (constraints && !scanning) constraints.update(dt);

  if (physio) physio.update(dt);

  // ---- presence: the instrument meets the tissue, and the tissue gives -----
  // dissect.js has already raycast this frame; reuse its hit rather than casting
  // a second ray. The tool tip and the dent must agree on the same contact point
  // or the instrument appears to float over an undisturbed surface.
  if ((instr || soft) && !scanning) {
    const hit = dissection && dissection.contact ? dissection.contact : null;
    if (instr) {
      instr.update({
        point: hit ? hit.point : null,
        normal: hit ? hit.normal : null,
        grip: input.grip, gripping: input.gripping,
        active: !!hit, camera, source: input.source,
      });
    }
    if (soft) {
      const id = dissection ? dissection.hovered : null;
      if (hit && id && input.gripping) {
        // Press harder with grip; the scalpel bites in a smaller radius than a
        // blunt probe, so the dent reads as the right instrument.
        const r = currentTool === 'scalpel' ? 0.55 : currentTool === 'probe' ? 0.8 : 1.0;
        soft.press(id, hit.point, 0.35 + input.grip * 0.65, r);
        if (soft._last && soft._last !== id) soft.release(soft._last);
        soft._last = id;
      } else if (soft._last) {
        soft.release(soft._last);
        soft._last = null;
      }
      soft.update(dt);
    }
  } else if (instr) {
    instr.update({ point: null, active: false, camera });
  }

  // Strictly after soft.update(): softbody rewrites the entire position array
  // from its own rest snapshot every frame for breathing parts, so cutting must
  // re-apply its persistent gape offsets on top of that write or the wound
  // silently closes itself.
  if (cutting) cutting.update(dt);

  if (blood) {
    const c = !scanning && dissection ? dissection.contact : null;
    if (c && input.gripping && currentTool === 'scalpel') {
      blood.bleed({
        point: c.point, normal: c.normal, partId: c.partId,
        severity: 0.35 + input.grip * 0.45, kind: 'capillary',
      });
    }
    if (c && input.gripping && currentTool === 'swab') blood.swab(c.point, 0.9);
    blood.update(dt);
  }

  // Procedural theatre audio. The blade sound is modulated by the live stroke —
  // speed and tissue — so a slow deliberate cut and a fast drag sound different.
  if (sfx) {
    const c = !scanning && dissection ? dissection.contact : null;
    if (c && input.gripping && currentTool === 'scalpel') {
      const p = parts.find((q) => q.id === c.partId);
      sfx.cut({ point: c.point, grip: input.grip, partId: c.partId, system: p && p.system });
    }
    sfx.update(dt);
  }

  if (tutor) tutor.update(dt, { tool: currentTool, gripping: input.gripping });
  if (dust) dust.update(dt);

  // OrbitControls must not run while presenting — it fights three.js's own writes
  // to camera.position, and a composer blanks an XR frame outright, so post-fx and
  // env's composer are both bypassed in the headset.
  if (xr && xr.isPresenting()) {
    renderer.render(scene, camera);
  } else {
    // During the cold open the intro OWNS the camera — it sweeps from the wide
    // framing down to the working one and drives the exposure ramp. OrbitControls
    // must stay out of the way until it hands back, or the two fight over
    // camera.position and the settle judders.
    if (intro && intro.running) {
      intro.update(dt);
    } else {
      controls.update();
      // Still whenever anything is being touched — a drag, a grip, or a tracked
      // hand present — so idle drift never compounds with hand-tracking jitter or
      // nudges a live incision.
      // TCH.ids covers the touch case the other two miss: an orbit drag sets
      // neither mouse.down nor gripping, and letting the idle drift ride along
      // on top of it makes the camera feel like it is sliding out of your hand.
      const busy = mouse.down || input.gripping || TCH.ids.size > 0
        || (handMode && hands && hands.snapshot && hands.snapshot.active);
      applyCameraLife(dt, busy);
    }
    if (postfx) {
      // Focus follows the blade: whatever the instrument is touching is what the
      // depth-of-field plane sharpens. Null (nothing under the cursor) lets it
      // ease back to the specimen's own depth rather than snapping.
      const c = !scanning && dissection ? dissection.contact : null;
      postfx.focusOn(c ? c.point : null);
      postfx.render(dt);
    } else if (env) env.render();
    else renderer.render(scene, camera);
  }
}

/* ---- keyboard ----------------------------------------------------------- */
/*
 * ~24 bindings now, so they live in one table instead of a drift-prone if-chain.
 * Conflicts were real: cutting and imaging both wanted X, pathology and
 * physiology both wanted P, tutor and physiology both wanted K. Resolved here
 * once, and this table is also what feeds the `?` help overlay so the two can
 * never disagree.
 */
// Which theatre sound each dissection event triggers. At module scope beside
// KEYMAP so the mapping is one obvious table, not scattered through onEvent.
const SOUND_EVT = {
  pin: ['pin'], peel: ['tear', { strength: 0.8 }], lift: ['tray'],
  replace: ['tray'], damage: ['snap', { strength: 1 }],
};

const KEYMAP = [
  { key: '1', label: 'Probe', group: 'Instruments' },
  { key: '2', label: 'Scalpel', group: 'Instruments' },
  { key: '3', label: 'Forceps', group: 'Instruments' },
  { key: '4', label: 'Pins', group: 'Instruments' },
  { key: '5', label: 'Retractor', group: 'Instruments' },
  { key: '6', label: 'Swab', group: 'Instruments' },
  { key: 'twist', label: 'Hand tracking — twist your open hand like a dial to step the tray', group: 'Instruments' },
  { key: 'flick', label: 'Hand tracking — flick your hand sharply up for the next instrument, down for the previous', group: 'Instruments' },
  { key: 'Z', label: 'Microscope — histology of hovered structure', group: 'Examine' },
  { key: 'I', label: 'Scale journey — zoom from tissue to a single atom', group: 'Examine' },
  { key: 'X', label: 'Cycle imaging: X-ray / CT / MRI / ultrasound', group: 'Examine' },
  { key: '[ ]', label: 'Scrub slice (imaging) · bleed intensity (otherwise)', group: 'Examine' },
  { key: 'W', label: 'Window preset — soft / liver / lung / bone', group: 'Examine' },
  { key: 'R', label: 'MRI weighting T1 / T2', group: 'Examine' },
  { key: 'L', label: 'Depth readout — which layer you are in', group: 'Examine' },
  { key: 'D', label: 'Divide the attachments holding the hovered structure', group: 'Dissect' },
  { key: 'B', label: 'Bleeding on / off', group: 'Dissect' },
  { key: 'Q', label: 'Wound detail — high / low', group: 'Dissect' },
  { key: 'P', label: 'Living physiology on / off', group: 'Physiology' },
  { key: 'C', label: 'Clamp / release the hovered vessel', group: 'Physiology' },
  { key: 'K', label: 'Stimulate the hovered nerve', group: 'Physiology' },
  { key: 'Y', label: 'Next pathology case  ·  shift+Y healthy specimen', group: 'Physiology' },
  { key: 'T', label: 'Tutor on / off', group: 'Tutor' },
  { key: 'G', label: 'Ask me a question now', group: 'Tutor' },
  { key: 'A', label: 'Answer the question', group: 'Tutor' },
  { key: 'H', label: 'Hint', group: 'Tutor' },
  { key: 'J', label: 'Skip this question', group: 'Tutor' },
  { key: 'N', label: 'Narration on / off', group: 'Session' },
  { key: 'M', label: 'Theatre ambience on / off', group: 'Session' },
  { key: 'S', label: 'Theatre sound — blade, heartbeat, room tone', group: 'Session' },
  { key: 'F', label: 'Graphics fidelity — low / medium / high', group: 'Session' },
  { key: 'E', label: 'Hand-tracking smoothing — steady / balanced / responsive', group: 'Session' },
  { key: 'U', label: 'Re-centre hand tracking on where you hold your hand', group: 'Session' },
  { key: 'V', label: 'Enter / exit VR', group: 'Session' },
  { key: 'O', label: 'Choose specimen (or click the Specimen button, top-left)', group: 'Session' },
  { key: '?', label: 'This list', group: 'Session' },
];

function setTool(t) {
  currentTool = t;
  // The swab is main.js's own tool — dissect.js's TOOLS list has no such entry, so
  // park the engine on the probe and do the swabbing here in tick().
  if (dissection) dissection.setTool(t === 'swab' ? 'probe' : t);
  if (instr) instr.setTool(t);
  shell.setTool(t);
}

function onKey(e) {
  // The tutor's answer line takes prose. Typing "probe" must not fire p, r, o, b
  // and e as shortcuts.
  if (shell.inputOpen && shell.inputOpen()) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

  const tools = { '1': 'probe', '2': 'scalpel', '3': 'forceps', '4': 'pins', '5': 'retractor', '6': 'swab' };
  if (tools[e.key]) { setTool(tools[e.key]); return; }

  const k = e.key.toLowerCase();
  const hovered = dissection && dissection.hovered;
  const scanning = imaging && imaging.mode() !== 'off';

  /* ---- examine ---- */
  if (k === 'z' && histology && hovered) {
    const part = parts.find((p) => p.id === hovered);
    if (part) {
      // A diseased structure must show its DISEASED section, not a textbook one.
      const diseased = pathology && pathology.histologyFor ? pathology.histologyFor(part.id) : null;
      histology.open(part.id, {
        name: part.name, system: part.system, tissue: diseased || part.tissue, species: specimenId,
      });
    }
    return;
  }
  if (k === 'i' && zoomverse) {
    // The scale journey — dive from the hovered structure down to the atom. Works
    // even with nothing hovered (a generic cell); a hovered organ picks the tissue.
    const part = hovered ? parts.find((p) => p.id === hovered) : null;
    zoomverse.open(part ? { name: part.name, system: part.system, tissue: part.tissue, partId: part.id } : {});
    shell.say('Scale journey — scroll or drag to dive from tissue to a single atom. Esc to surface.');
    return;
  }
  if (k === 'x' && imaging) {
    const m = imaging.cycleMode(e.shiftKey ? -1 : 1);
    shell.say(m === 'off' ? 'Imaging off — back to the specimen.' : 'Imaging: ' + m.toUpperCase() + '.');
    if (shell.setImaging) shell.setImaging({ mode: m, slice: imaging.slice, window: imaging.window });
    return;
  }
  if (e.key === '[' || e.key === ']') {
    const d = e.key === '[' ? -1 : 1;
    if (scanning) imaging.setSlice(imaging.slice + d * 0.02);
    else if (blood) blood.setIntensity(Math.max(0, Math.min(1, blood.intensity + d * 0.25)));
    return;
  }
  if (k === 'w' && scanning) { imaging.cycleWindow(); return; }
  if (k === 'r' && scanning) { imaging.setWeighting(imaging.weighting === 't1' ? 't2' : 't1'); return; }
  if (k === 'l' && strata && dissection) {
    const d = dissection.state.maxLayerRevealed;
    const s = strata.stack[Math.min(d, strata.stack.length - 1)];
    if (s) shell.say('Layer ' + s.layer + ' of ' + (strata.stack.length - 1) + ' — ' + s.name + '.');
    return;
  }

  /* ---- dissect ---- */
  if (k === 'd' && constraints && hovered) {
    const n = constraints.sever(hovered);
    if (!n) shell.say('Nothing is holding that structure.');
    return;
  }
  if (k === 'b' && blood) {
    blood.setEnabled(!blood.enabled);
    shell.say(blood.enabled ? 'Bleeding on.' : 'Bleeding off — a bloodless field.');
    return;
  }
  if (k === 'q' && cutting) {
    cutting._lo = !cutting._lo;
    cutting.setQuality(cutting._lo ? 0 : 1);
    shell.say('Wound detail ' + (cutting._lo ? 'low.' : 'high.'));
    return;
  }

  /* ---- physiology ---- */
  if (k === 'p' && physio) {
    const on = !physio.running();
    setPhysiology(on);
    shell.say(on ? 'Living physiology on — this is a simulation running on the specimen, not the specimen itself.'
                 : 'Physiology stopped.');
    return;
  }
  if (k === 'c' && physio && hovered) {
    if (physio.clamped().indexOf(hovered) >= 0) physio.unclamp(hovered); else physio.clamp(hovered);
    return;
  }
  if (k === 'k' && physio && hovered) { physio.stimulate(hovered); return; }
  if (k === 'y' && pathology) {
    const cs = pathology.list().filter((c) => c.applicable);
    if (!cs.length) return;
    if (e.shiftKey) { setCase(null); return; }
    const cur = pathology.current();
    const i = cur ? cs.findIndex((c) => c.id === cur.id) : -1;
    setCase(cs[(i + 1) % cs.length].id);
    return;
  }

  /* ---- tutor ---- */
  if (k === 't' && tutor) {
    const on = !tutor.isActive;
    tutor.setActive(on);
    shell.say(on ? 'Tutor on — I will question you as you work. Press T to stop.' : 'Tutor off.');
    return;
  }
  if (k === 'g' && tutor) { tutor.ask(); return; }
  if (k === 'h' && tutor) { tutor.hint(); return; }
  if (k === 'j' && tutor) { tutor.skip(); return; }
  if (k === 'a' && tutor && tutor.pending) {
    if (shell.askInput) shell.askInput(tutor.pending, (v) => { if (v != null) tutor.answer(v); });
    else { const v = prompt(tutor.pending); if (v != null) tutor.answer(v); }
    return;
  }

  /* ---- session ---- */
  // Voice and ambience are opt-in: a demonstrator talking without being asked,
  // and audio starting itself, are both hostile defaults.
  if (k === 'n' && narrator) {
    const on = !narrator.voiceEnabled;
    narrator.setVoice(on);
    shell.say(on ? 'Narration on — I will talk you through what you are looking at. Press N to stop.'
                 : 'Narration off.');
    return;
  }
  if (k === 'm' && narrator) {
    const on = !narrator.ambientEnabled;
    narrator.setAmbient(on);
    shell.say(on ? 'Theatre ambience on. Press M to stop.' : 'Ambience off.');
    return;
  }
  if (k === 'e' && hands && handMode && hands.setSmoothing) {
    // Cycle tracking smoothing. Only the person at the camera can judge jitter vs
    // lag — it depends on their webcam, lighting and how steady their hand is — so
    // this is theirs to tune live.
    const order = hands.smoothingPresets || ['steady', 'balanced', 'responsive'];
    const i = order.indexOf(hands.smoothing);
    const next = order[((i < 0 ? 1 : i) + 1) % order.length];
    hands.setSmoothing(next);
    shell.say('Hand tracking: ' + next
      + (next === 'steady' ? ' — steadiest, best for fine work.'
        : next === 'responsive' ? ' — fastest, accepts a little shimmer.'
        : ' — balanced.'));
    return;
  }
  if (k === 'u' && hands && handMode && hands.recenter) {
    // Re-centre the reachable area on wherever the hand is being held right now —
    // the fix for a camera aimed high or a student sitting off to one side.
    const ok = hands.recenter();
    shell.say(ok ? 'Re-centred. This spot is now the middle of the screen — relax your hand here and small moves reach every corner.'
                 : 'Show your hand to the camera first, then press U to re-centre it.');
    return;
  }
  if (k === 'f' && postfx) {
    // Graphics fidelity. postfx auto-picks a SAFE default — on Intel integrated
    // (the target school laptop) that is tier 0, which correctly protects the
    // framerate but also hides SSAO and depth of field. This lets anyone on a
    // capable machine turn the craft up, and anyone on a struggling one turn it
    // down, without a settings panel. Cycles low -> medium -> high.
    const q = ((postfx.quality | 0) + 1) % 3;
    postfx.setQuality(q);
    shell.say('Graphics: ' + ['low — smooth on any machine', 'medium — ambient occlusion',
      'high — depth of field, full cinematic'][q] + '.');
    return;
  }
  if (k === 's' && sfx) {
    const on = !sfx.enabled;
    sfx.setEnabled(on);   // MUST toggle inside this gesture — AudioContext needs one
    // sfx ships its own room tone, so running narrator's ambience too would be two
    // beds fighting. Turn the older one off when the richer one comes on.
    if (on && narrator && narrator.ambientEnabled) narrator.setAmbient(false);
    shell.say(on ? 'Theatre sound on — blade, heartbeat, room tone. Press S to stop.' : 'Sound off.');
    return;
  }
  if (k === 'v' && xr) {
    if (xr.isPresenting()) xr.exit(); else xr.enter();
    return;
  }
  if (k === 'o' && shell.showPicker) { shell.showPicker(); return; }
  if (e.key === '?' && shell.setKeymap) { shell.setKeymap(KEYMAP); return; }
  if (e.key === 'Escape') {
    if (zoomverse && zoomverse.isOpen()) zoomverse.close();
    else if (histology && histology.isOpen()) histology.close();
    else if (imaging && imaging.mode() !== 'off') imaging.setMode('off');
  }
}

/* ---- wiring ------------------------------------------------------------ */
export function startApp() {
  const root = document.getElementById('stage');
  bootScene(root);
  shell = buildShell(document.body);

  const boot = (name, fn) => {
    try { return fn(); } catch (e) { console.warn(name + ' failed', e); return null; }
  };

  if (typeof createInstruments === 'function') instr = boot('instruments', () => createInstruments(THREE, scene));
  if (typeof createNarrator === 'function') narrator = boot('narrator', () => createNarrator());
  if (typeof createHandViz === 'function') handViz = boot('handviz', () => createHandViz(document.body));
  if (typeof createCutting === 'function') cutting = boot('cutting', () => createCutting(THREE, scene));
  if (typeof createBlood === 'function') blood = boot('blood', () => createBlood(THREE, scene));
  if (typeof createHistology === 'function') histology = boot('histology', () => createHistology(document.body));
  if (typeof createZoomverse === 'function') zoomverse = boot('zoomverse', () => createZoomverse(THREE, renderer));
  if (typeof createSFX === 'function') sfx = boot('sfx', () => createSFX());

  if (typeof createTutor === 'function') {
    tutor = boot('tutor', () => {
      const t = createTutor();
      t.setLevel('alevel');
      t.onSay((s) => {
        shell.say(s.text, { consequence: s.kind === 'question' });
        if (narrator) narrator.speak(s.text);
      });
      return t;
    });
  }

  if (typeof createXR === 'function') {
    xr = boot('xr', () => {
      const x = createXR(THREE, renderer, scene, camera);
      x.onSession((e) => {
        if (shell.setXR) shell.setXR({ available: x.supported(), presenting: x.isPresenting() });
        if (e.kind === 'end') {
          camera.aspect = innerWidth / innerHeight;
          camera.updateProjectionMatrix();
        }
      });
      return x;
    });
    if (xr && shell.setXR) {
      // supported() is async under the hood on some runtimes; ask, then publish.
      Promise.resolve(xr.supported()).then((ok) => shell.setXR({ available: !!ok, presenting: false }))
        .catch(() => {});
    }
  }

  shell.mountCards(SPECIMENS, (id) => loadSpecimen(id));
  shell.on('specimen', (id) => loadSpecimen(id));
  shell.on('viva', () => {
    if (!dissection) return;
    // The viva now marks against the tutor transcript and, if a case is loaded,
    // against the findings the student was supposed to discover.
    shell.showViva(dissection.state, {
      transcript: tutor ? tutor.transcript() : null,
      grade: tutor ? tutor.grade() : null,
      findings: pathology ? pathology.findings() : null,
    });
  });
  shell.on('tool', (t) => setTool(t));
  if (shell.setActions) shell.setActions([], doAction);
  shell.on('level', (l) => { if (tutor) tutor.setLevel(l); });
  shell.on('bleeding', (k) => { if (blood) { blood.setIntensity(k); blood.setEnabled(k > 0); } });
  shell.on('imaging', (m) => { if (imaging) imaging.setMode(m); });
  shell.on('slice', (t) => { if (imaging) imaging.setSlice(t); });
  shell.on('case', (id) => setCase(id));
  // WebXR requires an unconsumed user gesture, so this must call straight through
  // from inside the click — an await before requestSession kills the request.
  shell.on('xr', () => {
    if (!xr) return;
    if (xr.isPresenting()) { xr.exit(); return; }
    Promise.resolve(xr.enter()).then((r) => {
      if (r && !r.ok) shell.say('VR unavailable: ' + r.reason);
    }).catch((err) => shell.say('VR failed to start: ' + (err && err.message)));
  });

  // The webcam picture is a display choice, not a tracking one: handviz keeps
  // drawing the landmarks, the hand, the cursor and the dial either way, and the
  // tracker never even notices. The shell owns the preference (and persists it);
  // this is the one line that carries it to the overlay.
  shell.on('camera', (show) => { if (handViz && handViz.setBackdrop) handViz.setBackdrop(show); });
  function applyCameraPref() {
    if (!handViz || !handViz.setBackdrop) return;
    handViz.setBackdrop(shell.cameraVisible ? shell.cameraVisible() : true);
  }

  shell.on('hands', async (want) => {
    if (!want) {
      handMode = false;
      document.body.classList.remove('handmode');
      if (hands) hands.stop();
      if (handViz) handViz.setEnabled(false);
      shell.setHandState({ on: false });
      drawCursor(false);
      return;
    }
    shell.setHandState({ on: true, status: 'starting' });
    if (!hands) hands = createHands();
    const res = await hands.start();
    if (res.ok) {
      handMode = true;
      document.body.classList.add('handmode');
      if (handViz) {
        handViz.mount(hands.videoEl);
        handViz.setEnabled(true);
        // Honour the stored show-camera choice before the first frame is painted,
        // so someone who turned the picture off last session never sees it flash
        // back for a frame on the next start.
        applyCameraPref();
      }
      shell.setHandState({ on: true, status: 'tracking', video: hands.videoEl });
      // The gestures have to be TAUGHT. With the dock out of reach they are the
      // only way to change instrument, and no one discovers a motion gesture by
      // accident — the flick shipped undiscovered for exactly that reason. Both
      // are named here, both with the direction that makes them work.
      shell.say('Camera on. Pinch to grip. Two ways to change instrument without the dock: '
        + 'twist your open hand like a dial, or flick it sharply up for the next instrument '
        + 'and down for the previous. Press U to re-centre tracking on your hand, or E to '
        + 'retune the smoothing. Nothing is recorded.');
    } else {
      handMode = false;
      shell.setHandState({ on: false, status: 'failed', reason: res.reason });
      shell.say('Could not start the camera: ' + res.reason + '. Mouse and keyboard do everything the hand does.');
    }
  });

  // pointer
  //
  // TWO paths, and they must not overlap. Touch goes through tchDown/tchUp,
  // which decide at touchdown whether a finger is the instrument or the camera;
  // the three below are the MOUSE path. Without the pointerType guards every
  // orbit drag would also be a grip, because a finger reports a pointerdown the
  // instant it lands and there is no button to have not pressed.
  //
  // tchDown is on the CAPTURE phase deliberately: it has to run before the
  // canvas's own listener so it can keep a claimed finger away from
  // OrbitControls entirely. See the note above tchDown.
  addEventListener('pointerdown', tchDown, { capture: true });
  addEventListener('pointerup', tchUp);
  addEventListener('pointercancel', tchUp);

  addEventListener('pointermove', (e) => {
    // A finger that is orbiting must not also drag the instrument across the
    // tissue behind it, so only the claimed one moves the aim.
    if (e.pointerType === 'touch' && TCH.claimed !== e.pointerId) return;
    mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight;
  });
  addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    if (e.target.closest('.chrome')) return;
    mouse.down = true;
  });
  addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') mouse.down = false; });
  addEventListener('pointercancel', (e) => { if (e.pointerType !== 'touch') mouse.down = false; });
  addEventListener('keydown', onKey);

  if (shell.setKeymap) shell.setKeymap(KEYMAP, { silent: true });

  // Exposed for scripted verification and for anyone who wants to poke at it.
  // NOTE: defineProperties, not Object.assign — assign *invokes* a getter and
  // copies its value, which would freeze these at their startup value (undefined).
  window.__LAB = window.__LAB || {};
  Object.defineProperties(window.__LAB, {
    dissection: { get: () => dissection, configurable: true },
    parts:      { get: () => parts,      configurable: true },
    input:      { get: () => input,      configurable: true },
    handsApi:   { get: () => hands,      configurable: true },
    shell:      { get: () => shell,      configurable: true },
    tool:       { get: () => currentTool, configurable: true },
  });
  window.__LAB.loadSpecimen = loadSpecimen;
  window.__LAB.setCase = setCase;
  window.__LAB.setTool = setTool;
  // Drive the engine exactly as a hand or mouse would, for testing.
  window.__LAB.feed = (x, y, grip, gripping, span) => {
    input.x = x; input.y = y; input.grip = grip;
    input.gripping = gripping; input.span = span || 0; input.source = 'test';
    if (dissection) dissection.update(input, 16);
  };
  window.__LAB.THREE = THREE;
  window.__LAB.camera = camera;
  // The flick detector is otherwise only reachable behind a live webcam, which no
  // automated check has. Exposed so its thresholds can be regression-tested.
  // NOTE for anyone driving this from a test: the snap gate needs TWO calls with
  // different h.velY values (and a real gap in `now`) before it can fire, because
  // the first one only establishes the velocity reference. flickState is exposed
  // so a test can inspect or clear that reference between cases.
  window.__LAB.flick = detectToolFlick;
  window.__LAB.flickState = flick;
  window.__LAB.flickReset = flickReset;
  window.__LAB.cycleTool = cycleTool;
  // The wrist dial and recenter are otherwise only reachable behind a live webcam.
  window.__LAB.dialTool = detectToolDial;
  window.__LAB.dial = dial;
  // The touch router's decision, for the same reason the flick and dial state
  // are exposed: which finger owns the gesture is otherwise only observable on
  // a real touchscreen, and it is the one rule that decides whether a drag cuts
  // or orbits.
  window.__LAB.touch = TCH;
  window.__LAB.touchHit = tchHitsSpecimen;
  window.__LAB.recenter = () => (hands && hands.recenter ? hands.recenter() : false);
  // Constructing a tracker touches no camera or network (all inert until start()),
  // so tests can make one to exercise the reach map / spike guard without a webcam.
  window.__LAB.makeHands = () => (typeof createHands === 'function' ? createHands() : null);
  window.__LAB.keymap = KEYMAP;
  window.__LAB.handViz = () => handViz;
  window.__LAB.instr = () => instr;
  window.__LAB.soft = () => soft;
  window.__LAB.narrator = () => narrator;
  window.__LAB.postfx = () => postfx;
  window.__LAB.sfx = () => sfx;
  window.__LAB.surface = () => surface;
  window.__LAB.strata = () => strata;
  window.__LAB.cutting = () => cutting;
  window.__LAB.blood = () => blood;
  window.__LAB.constraints = () => constraints;
  window.__LAB.histology = () => histology;
  window.__LAB.zoomverse = () => zoomverse;
  window.__LAB.imaging = () => imaging;
  window.__LAB.pathology = () => pathology;
  window.__LAB.physio = () => physio;
  window.__LAB.tutor = () => tutor;
  window.__LAB.xr = () => xr;
  window.__LAB.intro = () => intro;
  window.__LAB.dust = () => dust;
  window.__LAB.camLife = (dt, busy) => applyCameraLife(dt, busy);   // for verification

  // setAnimationLoop, not requestAnimationFrame: rAF does not drive a WebXR
  // session. three.js routes this to rAF off-headset and to the XR frame loop
  // while presenting, so one call covers both.
  renderer.setAnimationLoop(tick);

  // The cold open. Rather than showing the specimen picker, the app opens on a
  // dark theatre that rises around a specimen already on the table. loadSpecimen
  // parks the camera at the working framing and hides the picker (setSpecimen);
  // the intro then takes the camera from a wide dark framing down to that, ramping
  // the exposure up out of black. If the module is absent, the app just loads the
  // frog and shows normally — no cold open, no breakage.
  // INSTANT MODE. Launched from inside the Biology Entelloq app, the lab is one
  // click away from a page you were already using — a five-second cinematic there
  // is a wait, not a welcome. `?instant=1` skips the cold open entirely and puts
  // you straight on the table. Opened on its own, the full cold open still plays.
  const INSTANT = /[?&]instant=1/.test(location.search);
  if (!INSTANT && typeof createColdOpen === 'function') {
    try {
      intro = createColdOpen(THREE, { renderer, scene, camera, controls }, {
        speak: (text) => { if (narrator) narrator.speak(text); shell.say(text); },
        reveal: () => {},   // chrome un-hides itself via the body.intro class flip
        onDone: () => {},
      });
    } catch (e) { console.warn('cold open failed', e); intro = null; }
  }
  if (intro) {
    loadSpecimen('frog');   // the specimen is already there when the lights come up
    intro.start();
  } else {
    // No cold open: reveal the chrome immediately and load straight in.
    document.body.classList.remove('intro');
    if (renderer) renderer.toneMappingExposure = 1.15;
    loadSpecimen('frog');
  }
}
